import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import axios from "axios";
import { ethers } from "ethers";
import { ERC20_ABI } from "./abis.js";
import { hasAttributionTag, withAttributionTag } from "./attribution.js";
import {
  ATTRIBUTION_TAG,
  CHAIN_ID,
  DRY_RUN,
  HEDGE_SELL_AMOUNT,
  HEDGE_THRESHOLD,
  RPC_URL,
  TEXTILE_API_BASE_URL,
  USDT_ADDRESS,
  WARS_ADDRESS
} from "./config.js";
import { fetchInflation } from "./inflation.js";
import type { AgentLogger, CycleResult } from "./types.js";

const privateKey = process.env.AGENT_PRIVATE_KEY;
const textileApiKey = process.env.TEXTILE_API_KEY;
const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });

// Contract addresses you have personally verified. Live mode refuses to send to anything else.
const allowedTargets = (process.env.TEXTILE_ALLOWED_ADDRESSES ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const ERC20_APPROVAL_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
] as const;
const erc20Interface = new ethers.Interface(ERC20_APPROVAL_ABI);

type SwapOutcome = { txHash?: string; reason: string };
type QuoteTx = { to: string; data: string; value: bigint };
type ParsedQuote = {
  rfqId: string;
  status: string;
  sellAmount: bigint;
  buyAmount: bigint;
  takerPays: bigint;
  feeAmount: string;
  expiresAt: string;
  taker: string;
  reactor: string;
  spender: string;
  approval: QuoteTx;
  swap: QuoteTx;
};

export function getWallet(): ethers.Wallet | null {
  if (!privateKey) return null;
  try {
    return new ethers.Wallet(privateKey, provider);
  } catch {
    return null;
  }
}

/** Describes the shape of a value without revealing any values: field names and types only. */
function describeShape(value: unknown, depth = 0): string {
  if (Array.isArray(value)) {
    return `array(${value.length})${value.length > 0 && depth < 3 ? `<${describeShape(value[0], depth + 1)}>` : ""}`;
  }
  if (value && typeof value === "object") {
    if (depth >= 4) return "object";
    const entries = Object.entries(value as Record<string, unknown>).map(([key, inner]) => `${key}: ${describeShape(inner, depth + 1)}`);
    return `{ ${entries.join(", ")} }`;
  }
  return value === null ? "null" : typeof value;
}

function readString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Quote is missing "${name}"`);
  return value;
}

function readBigInt(value: unknown, name: string): bigint {
  const text = readString(value, name);
  if (!/^(0x[0-9a-fA-F]+|\d+)$/.test(text)) throw new Error(`Quote field "${name}" is not a whole number`);
  return BigInt(text);
}

function readAddress(value: unknown, name: string): string {
  const text = readString(value, name);
  if (!ethers.isAddress(text)) throw new Error(`Quote field "${name}" is not an address`);
  return text;
}

function readTx(raw: unknown, name: string): QuoteTx {
  const tx = raw as { to?: unknown; data?: unknown; value?: unknown; chainId?: unknown } | undefined;
  if (!tx || typeof tx !== "object") throw new Error(`Quote is missing "${name}"`);
  const data = readString(tx.data, `${name}.data`);
  if (!/^0x([0-9a-fA-F]{2})+$/.test(data)) throw new Error(`Quote field "${name}.data" is not valid hex`);
  if (tx.chainId !== CHAIN_ID) throw new Error(`Quote field "${name}" is for a different chain`);
  return { to: readAddress(tx.to, `${name}.to`), data, value: tx.value === undefined ? 0n : readBigInt(tx.value, `${name}.value`) };
}

/** Reads Textile's response into a strict structure. Throws if anything needed is missing or malformed. */
function parseQuote(body: unknown): ParsedQuote {
  const root = (body as { data?: any } | undefined)?.data;
  const quote = root?.quote;
  const transactions = root?.transactions;
  if (!root || typeof root !== "object" || !quote || !transactions) throw new Error("the response has an unexpected structure");
  return {
    rfqId: typeof root.rfqId === "string" ? root.rfqId : "unknown",
    status: typeof root.status === "string" ? root.status : "unknown",
    sellAmount: readBigInt(quote.sellAmount, "quote.sellAmount"),
    buyAmount: readBigInt(quote.buyAmount, "quote.buyAmount"),
    takerPays: readBigInt(quote.takerPays, "quote.takerPays"),
    feeAmount: typeof quote.feeAmount === "string" ? quote.feeAmount : "unknown",
    expiresAt: readString(quote.expiresAt, "quote.expiresAt"),
    taker: readAddress(quote.taker, "quote.taker"),
    reactor: readAddress(quote.reactor, "quote.reactor"),
    spender: readAddress(quote.spender, "quote.spender"),
    approval: readTx(transactions.approval, "transactions.approval"),
    swap: readTx(transactions.swap, "transactions.swap")
  };
}

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function parseExpiryMs(value: string): number {
  if (/^\d+$/.test(value)) {
    const number = Number(value);
    return number < 1e12 ? number * 1000 : number;
  }
  return Date.parse(value); // NaN when it cannot be read
}

function secondsLeft(quote: ParsedQuote): number | null {
  const expiresMs = parseExpiryMs(quote.expiresAt);
  return Number.isFinite(expiresMs) ? Math.floor((expiresMs - Date.now()) / 1000) : null;
}

/** Compares Textile's own approval calldata with the approval we build ourselves (information only). */
function describeTextileApproval(quote: ParsedQuote): string {
  try {
    const parsed = erc20Interface.parseTransaction({ data: quote.approval.data });
    if (!parsed || parsed.name !== "approve") return "Textile's approval is not a standard approve call";
    const spender = parsed.args[0] as string;
    const amount = parsed.args[1] as bigint;
    return `Textile's own approval: spender ${sameAddress(spender, quote.spender) ? "matches" : "DIFFERS from"} the quote spender, amount ${amount === quote.takerPays ? "equals" : "DIFFERS from"} takerPays`;
  } catch {
    return "Textile's approval calldata could not be decoded";
  }
}

/** Safety checks on the quote. Every problem found is returned. */
function checkQuote(quote: ParsedQuote, wallet: string, amountIn: bigint): string[] {
  const problems: string[] = [];
  if (!sameAddress(quote.taker, wallet)) problems.push("the quote is for a different wallet");
  if (quote.sellAmount !== amountIn) problems.push("the quoted sell amount differs from the requested amount");
  if (quote.approval.value !== 0n || quote.swap.value !== 0n) problems.push("a transaction would send CELO, but none is expected");
  if (!sameAddress(quote.approval.to, WARS_ADDRESS)) problems.push("Textile's approval is not for the wARS token");
  if (!sameAddress(quote.swap.to, quote.reactor)) problems.push("the swap does not go to the quoted reactor");
  if (sameAddress(quote.spender, wallet)) problems.push("the approval spender is the agent wallet itself");
  return problems;
}

/** Reads a mined transaction back from the chain and logs whether it carries our ERC-8021 tag. */
async function confirmTagOnChain(hash: string, label: string, log: AgentLogger): Promise<boolean> {
  const mined = await provider.getTransaction(hash);
  const tagged = Boolean(mined && hasAttributionTag(mined.data));
  log(
    tagged ? `${label}: attribution tag verified on-chain` : `${label}: WARNING · could not confirm the attribution tag on-chain`,
    tagged ? "success" : "warning"
  );
  return tagged;
}

/** Makes sure the spender may move exactly `amount` wARS. The approval is tagged like every other transaction. */
async function ensureAllowance(wallet: ethers.Wallet, spender: string, amount: bigint, log: AgentLogger): Promise<boolean> {
  const token = new ethers.Contract(WARS_ADDRESS, ERC20_APPROVAL_ABI, wallet);
  const current = (await token.allowance(wallet.address, spender)) as bigint;
  if (current >= amount) {
    log("Allowance already sufficient · no approval needed", "info");
    return false;
  }

  const data = withAttributionTag(token.interface.encodeFunctionData("approve", [spender, amount]));
  if (!hasAttributionTag(data)) throw new Error("Attribution tag missing on approval; refusing to send");
  const request = { to: WARS_ADDRESS, data, value: 0n };

  if (DRY_RUN) {
    log(`DRY_RUN=true · would approve exactly ${ethers.formatUnits(amount, 18)} wARS to ${spender} (tagged)`, "warning");
    return false;
  }

  const gasLimit = ((await wallet.estimateGas(request)) * 12n) / 10n;
  const sent = await wallet.sendTransaction({ ...request, gasLimit });
  log(`Approval submitted · ${sent.hash}`, "success");
  await sent.wait();
  log(`Approval confirmed · ${sent.hash}`, "success");
  await confirmTagOnChain(sent.hash, "Approval", log);
  return true;
}

export async function executeSwap(log: AgentLogger): Promise<SwapOutcome> {
  const wallet = getWallet();
  if (!wallet) {
    log("AGENT_PRIVATE_KEY is not configured; swap execution is blocked", "error");
    return { reason: "wallet-missing" };
  }
  if (!textileApiKey) {
    log("TEXTILE_API_KEY is not configured; cannot request an RFQ corridor", "error");
    return { reason: "api-key-missing" };
  }

  const amountIn = ethers.parseUnits(HEDGE_SELL_AMOUNT, 18);
  // includeAttribution is deliberately not set: Textile then returns swap data without a tag, and our own
  // ERC-8021 tag is the only (and therefore last) tag on it.
  const payload = {
    chainId: CHAIN_ID,
    taker: wallet.address,
    sellToken: WARS_ADDRESS,
    buyToken: USDT_ADDRESS,
    sellAmount: amountIn.toString()
  };
  log(`Requesting Textile FX RFQ · ${HEDGE_SELL_AMOUNT} wARS → USDT`, "info");

  try {
    // Textile recommends a 75 second timeout: a quote can take longer than usual on a cold corridor.
    const response = await axios.post<unknown>(`${TEXTILE_API_BASE_URL}/rfq/request`, payload, {
      headers: { Authorization: `Bearer ${textileApiKey}`, "Content-Type": "application/json" },
      timeout: 75_000
    });

    let quote: ParsedQuote;
    try {
      quote = parseQuote(response.data);
    } catch (error) {
      log(`Quote could not be used · ${error instanceof Error ? error.message : "unknown error"}`, "warning");
      log(`Quote shape · ${describeShape(response.data)}`, "info");
      return { reason: "no-transaction" };
    }

    // Quote summary (public values only; the signature, claim token and encoded order are never logged)
    const sellNumber = Number(ethers.formatUnits(quote.sellAmount, 18));
    const buyNumber = Number(ethers.formatUnits(quote.buyAmount, 6));
    const impliedRate = buyNumber > 0 ? `${(sellNumber / buyNumber).toFixed(0)} wARS per USDT` : "unknown";
    log(`RFQ id · ${quote.rfqId}`, "info");
    log(
      `Quote (${quote.status}) · sell ${ethers.formatUnits(quote.sellAmount, 18)} wARS · receive ${ethers.formatUnits(quote.buyAmount, 6)} USDT · you pay ${ethers.formatUnits(quote.takerPays, 18)} · fee (raw) ${quote.feeAmount} · implied ${impliedRate}`,
      "info"
    );
    log(`Contracts · swap target ${quote.swap.to} · reactor ${quote.reactor} · spender ${quote.spender}`, "info");
    log(describeTextileApproval(quote), "info");

    // Safety checks
    const problems = checkQuote(quote, wallet.address, amountIn);
    const warsBalance = (await new ethers.Contract(WARS_ADDRESS, ERC20_ABI, provider).balanceOf(wallet.address)) as bigint;
    if (warsBalance < quote.takerPays) {
      log(`The wallet holds ${ethers.formatUnits(warsBalance, 18)} wARS but the quote needs ${ethers.formatUnits(quote.takerPays, 18)}`, "error");
      return { reason: "insufficient-wars" };
    }
    if (problems.length > 0) {
      problems.forEach((problem) => log(`Quote check failed · ${problem}`, "error"));
      return { reason: "quote-unsafe" };
    }

    // Allowlist of verified contracts
    const targets = [...new Set([quote.swap.to, quote.spender].map((address) => ethers.getAddress(address)))];
    if (!targets.every((address) => allowedTargets.includes(address.toLowerCase()))) {
      log(`Contracts not allowlisted yet · after checking them on Celoscan, add this line to .env: TEXTILE_ALLOWED_ADDRESSES=${targets.join(",")}`, "warning");
      if (!DRY_RUN) {
        log("Live mode requires every contract to be in TEXTILE_ALLOWED_ADDRESSES; refusing to send", "error");
        return { reason: "quote-unsafe" };
      }
    } else {
      log("Contracts match the TEXTILE_ALLOWED_ADDRESSES allowlist", "success");
    }

    // Gas check (rough upper bound for an approval plus a swap)
    const balance = await provider.getBalance(wallet.address);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
    const gasBudget = 700_000n * gasPrice;
    if (balance < gasBudget) {
      log(`Insufficient CELO for gas (${ethers.formatEther(balance)} CELO available, about ${ethers.formatEther(gasBudget)} budgeted)`, "error");
      return { reason: "insufficient-gas" };
    }

    // ERC-8021 attribution tag on the swap
    const swapData = withAttributionTag(quote.swap.data);
    if (!hasAttributionTag(swapData)) throw new Error("Attribution tag missing on swap; refusing to send");
    log(`ERC-8021 attribution suffix attached · code ${ATTRIBUTION_TAG}`, "info");

    // Quote validity
    const left = secondsLeft(quote);
    if (left === null) {
      log(`Quote expiry "${quote.expiresAt}" could not be read`, "warning");
      if (!DRY_RUN) return { reason: "quote-unsafe" };
    } else {
      log(`Quote is valid for another ${left} seconds`, left > 0 ? "info" : "warning");
      if (!DRY_RUN && left < 15) {
        log("Quote expires too soon to use safely; run the agent again", "warning");
        return { reason: "quote-expired" };
      }
    }

    // Token approval for exactly what the quote needs (also tagged)
    await ensureAllowance(wallet, quote.spender, quote.takerPays, log);

    if (DRY_RUN) {
      log(`DRY_RUN=true · swap prepared (${(swapData.length - 2) / 2} bytes of calldata, tag attached) but not broadcast`, "warning");
      return { reason: "dry-run-prepared" };
    }

    // The approval may have taken a few seconds; make sure the quote is still valid
    const leftAfterApproval = secondsLeft(quote);
    if (leftAfterApproval === null || leftAfterApproval < 8) {
      log("The quote expired while waiting; the approval is in place, so run the agent again to send the swap", "warning");
      return { reason: "quote-expired" };
    }

    const request = { to: quote.swap.to, data: swapData, value: quote.swap.value };
    const gasLimit = ((await wallet.estimateGas(request)) * 12n) / 10n; // fails here, without spending gas, if the swap would revert
    const sent = await wallet.sendTransaction({ ...request, gasLimit });
    log(`Hedge transaction submitted · ${sent.hash}`, "success");
    await sent.wait();
    log(`Hedge transaction confirmed · ${sent.hash}`, "success");
    await confirmTagOnChain(sent.hash, "Swap", log);
    return { txHash: sent.hash, reason: "executed" };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorDetails = JSON.stringify(error.response?.data || error.message, null, 2);
      log(`Textile FX request failed${status ? ` (${status})` : ""}`, "error");
      log(`Full API Error: ${errorDetails}`, "warning");
      return { reason: "quote-rejected" };
    }
    const message = error instanceof Error ? error.message : "Unknown swap error";
    if (/insufficient funds|insufficient balance/i.test(message)) log("Insufficient funds to submit the hedge transaction", "error");
    else log(`Swap execution failed: ${message}`, "error");
    return { reason: "swap-failed" };
  }
}

export async function runAgentCycle(log: AgentLogger = (message, level) => console.log(`[${level ?? "info"}] ${message}`)): Promise<CycleResult> {
  log("Reading Argentina inflation from INDEC (datos.gob.ar)", "info");
  // If this fails it throws, so the run stops instead of using a made-up number.
  const reading = await fetchInflation();
  const inflationRate = reading.yearOverYearPct;
  log(`Series check · ${reading.seriesTitle}`, "info");
  log(
    `Inflation signal: ${inflationRate.toFixed(1)}% year over year (${reading.period}) · hedge threshold: ${HEDGE_THRESHOLD.toFixed(1)}%`,
    inflationRate >= HEDGE_THRESHOLD ? "warning" : "info"
  );
  if (inflationRate < HEDGE_THRESHOLD) {
    log("Signal below threshold · no hedge required", "success");
    return { inflationRate, hedgeTriggered: false, executed: false, reason: "below-threshold" };
  }
  log("Threshold breached · preparing protective hedge", "warning");
  const outcome = await executeSwap(log);
  return {
    inflationRate,
    hedgeTriggered: true,
    executed: Boolean(outcome.txHash),
    txHash: outcome.txHash,
    reason: outcome.reason
  };
}

export async function readPublicBalances(address: string) {
  const wars = new ethers.Contract(WARS_ADDRESS, ERC20_ABI, provider);
  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
  const [warsBalance, usdtBalance] = await Promise.all([
    wars.balanceOf(address) as Promise<bigint>,
    usdt.balanceOf(address) as Promise<bigint>
  ]);
  return {
    wars: ethers.formatUnits(warsBalance, 18),
    usdt: ethers.formatUnits(usdtBalance, 6)
  };
}