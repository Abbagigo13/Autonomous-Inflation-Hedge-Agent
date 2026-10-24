import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import axios from "axios";
import { ethers } from "ethers";
import { ERC20_ABI } from "./abis.js";
import {
  ATTRIBUTION_HEX,
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
import type { AgentLogger, CycleResult, RfqQuote } from "./types.js";

const privateKey = process.env.AGENT_PRIVATE_KEY;
const textileApiKey = process.env.TEXTILE_API_KEY;
const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });

export function getWallet(): ethers.Wallet | null {
  if (!privateKey) return null;
  try {
    return new ethers.Wallet(privateKey, provider);
  } catch {
    return null;
  }
}

/** Demo signal until a CPI provider is wired in; replace this function without changing the cycle contract. */
export async function getInflationRate(): Promise<number> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return 8.4;
}

function appendAttributionTag(data: string | undefined): string | undefined {
  if (!data) return data;
  if (!/^0x[0-9a-fA-F]*$/.test(data)) throw new Error("RFQ transaction data is not valid hex");
  return `${data}${ATTRIBUTION_HEX.slice(2)}`;
}

function findTransaction(quote: RfqQuote): NonNullable<RfqQuote["transaction"]> | undefined {
  return quote.transaction ?? quote.tx ?? quote.data?.transaction ?? quote.data?.tx;
}

export async function executeSwap(log: AgentLogger): Promise<string | undefined> {
  const wallet = getWallet();
  if (!wallet) {
    log("AGENT_PRIVATE_KEY is not configured; swap execution is blocked", "error");
    return undefined;
  }
  if (!textileApiKey) {
    log("TEXTILE_API_KEY is not configured; cannot request an RFQ corridor", "error");
    return undefined;
  }

  const amountIn = ethers.parseUnits(HEDGE_SELL_AMOUNT, 18).toString();
  const payload = {
    chainId: CHAIN_ID,
    taker: wallet.address,
    sellToken: WARS_ADDRESS,
    buyToken: USDT_ADDRESS,
    sellAmount: amountIn
  };
  log(`Requesting Textile FX RFQ · ${HEDGE_SELL_AMOUNT} wARS → USDT`, "info");

  try {
    const response = await axios.post<RfqQuote>(`${TEXTILE_API_BASE_URL}/rfq/request`, payload, {
      headers: { Authorization: `Bearer ${textileApiKey}`, "Content-Type": "application/json" },
      timeout: 20_000
    });
    const quote = response.data;
    const transaction = findTransaction(quote);
    if (!transaction?.to || !ethers.isAddress(transaction.to) || !transaction.data) {
      log("RFQ response did not include a valid destination and calldata; no corridor will be broadcast", "warning");
      return undefined;
    }

    const balance = await provider.getBalance(wallet.address);
    const value = transaction.value === undefined ? 0n : BigInt(transaction.value);
    const gasLimit = BigInt(transaction.gasLimit ?? transaction.gas ?? 300000);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
    const requiredBalance = value + gasLimit * gasPrice;
    if (balance < requiredBalance) {
      log(`Insufficient CELO for value plus gas (${ethers.formatEther(balance)} CELO available, ${ethers.formatEther(requiredBalance)} required)`, "error");
      return undefined;
    }

    const txRequest: ethers.TransactionRequest = {
      to: transaction.to,
      data: appendAttributionTag(transaction.data),
      value,
      gasLimit
    };
    log(`Attribution tag injected · ${ATTRIBUTION_TAG} · ${ATTRIBUTION_HEX}`, "info");
    if (DRY_RUN) {
      log("DRY_RUN=true · transaction prepared but not broadcast", "warning");
      return undefined;
    }

    const sent = await wallet.sendTransaction(txRequest);
    log(`Hedge transaction submitted · ${sent.hash}`, "success");
    await sent.wait();
    log(`Hedge transaction confirmed · ${sent.hash}`, "success");
    return sent.hash;
  } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // Let's log the FULL error response from Textile
      const errorDetails = JSON.stringify(error.response?.data || error.message, null, 2);
      
      log(`Textile FX request failed${status ? ` (${status})` : ""}`, "error");
      log(`Full API Error: ${errorDetails}`, "warning"); // This will print the exact reason!
      return undefined;
    }
    const message = error instanceof Error ? error.message : "Unknown swap error";
    if (/insufficient funds|insufficient balance/i.test(message)) log("Insufficient funds to submit the hedge transaction", "error");
    else log(`Swap execution failed: ${message}`, "error");
    return undefined;
  }
}

export async function runAgentCycle(log: AgentLogger = (message, level) => console.log(`[${level ?? "info"}] ${message}`)): Promise<CycleResult> {
  log("Scanning Argentina inflation signal", "info");
  const inflationRate = await getInflationRate();
  log(`Inflation signal: ${inflationRate.toFixed(1)}% · hedge threshold: ${HEDGE_THRESHOLD.toFixed(1)}%`, inflationRate >= HEDGE_THRESHOLD ? "warning" : "info");
  if (inflationRate < HEDGE_THRESHOLD) {
    log("Signal below threshold · no hedge required", "success");
    return { inflationRate, hedgeTriggered: false, executed: false, reason: "below-threshold" };
  }
  log("Threshold breached · preparing protective hedge", "warning");
  const txHash = await executeSwap(log);
  return { inflationRate, hedgeTriggered: true, executed: Boolean(txHash), txHash, reason: txHash ? "executed" : "execution-blocked" };
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
