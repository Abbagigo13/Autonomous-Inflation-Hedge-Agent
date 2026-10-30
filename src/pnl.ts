import axios from "axios";
import { ethers } from "ethers";
import { CHAIN_ID, RPC_URL, TEXTILE_API_BASE_URL, USDT_ADDRESS, WARS_ADDRESS, getAgentAddress } from "./config.js";

const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });
const transferInterface = new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"]);

/** The part of a saved run that the P&L needs. */
export type PnlInput = { id: string; timestamp: string; executed: boolean; txHash?: string };

export type TradePnl = {
  id: string;
  timestamp: string;
  txHash: string;
  soldWars: string | null;
  receivedUsdt: string | null;
  executedRate: number | null; // wARS paid per USDT received
  currentUsdt: string | null; // USDT the same wARS would fetch now (indicative)
  currentRate: number | null;
  resultUsdt: string | null; // received minus current
  resultPct: number | null; // how much more USDT than selling now
  note: string | null;
};

export type PnlSummary = {
  asOf: string;
  trades: TradePnl[];
  totals: { soldWars: string; receivedUsdt: string; resultUsdt: string | null };
};

type Settlement = { sold: bigint; received: bigint };

/** Reads what really moved in a swap: wARS that left the wallet and USDT that arrived. */
async function readSettlement(txHash: string, wallet: string): Promise<Settlement | null> {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) return null;
  const wars = WARS_ADDRESS.toLowerCase();
  const usdt = USDT_ADDRESS.toLowerCase();
  const me = wallet.toLowerCase();
  let sold = 0n;
  let received = 0n;
  for (const entry of receipt.logs) {
    const token = entry.address.toLowerCase();
    if (token !== wars && token !== usdt) continue;
    let parsed;
    try {
      parsed = transferInterface.parseLog({ topics: [...entry.topics], data: entry.data });
    } catch {
      continue;
    }
    if (!parsed) continue;
    const from = String(parsed.args[0]).toLowerCase();
    const to = String(parsed.args[1]).toLowerCase();
    const value = parsed.args[2] as bigint;
    if (token === wars && from === me) sold += value;
    if (token === usdt && to === me) received += value;
  }
  if (sold === 0n || received === 0n) return null;
  return { sold, received };
}

/** Asks Textile for a free, indicative price: how much USDT would `sellAmount` wARS fetch right now? */
async function previewBuyAmount(sellAmount: bigint): Promise<{ buyAmount: bigint | null; note: string | null }> {
  const apiKey = process.env.TEXTILE_API_KEY;
  if (!apiKey) return { buyAmount: null, note: "TEXTILE_API_KEY is not configured, so no current price is available" };
  try {
    const response = await axios.post(
      `${TEXTILE_API_BASE_URL}/rfq/preview`,
      { chainId: CHAIN_ID, sellToken: WARS_ADDRESS, buyToken: USDT_ADDRESS, sellAmount: sellAmount.toString() },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 30_000 }
    );
    const data = response.data?.data;
    if (data?.status === "preview" && typeof data.buyAmount === "string" && /^\d+$/.test(data.buyAmount)) {
      return { buyAmount: BigInt(data.buyAmount), note: null };
    }
    const reason = typeof data?.reason === "string" ? ` (${data.reason})` : "";
    return { buyAmount: null, note: `Textile answered "${data?.status ?? "unknown"}" for the price preview${reason}` };
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    return { buyAmount: null, note: `The price preview failed${status ? ` (${status})` : ""}` };
  }
}

function emptyTrade(entry: PnlInput, note: string): TradePnl {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    txHash: entry.txHash ?? "",
    soldWars: null,
    receivedUsdt: null,
    executedRate: null,
    currentUsdt: null,
    currentRate: null,
    resultUsdt: null,
    resultPct: null,
    note
  };
}

/** Builds the P&L for every executed hedge in the saved history (newest first). */
export async function computePnl(entries: PnlInput[]): Promise<PnlSummary> {
  const wallet = getAgentAddress();
  if (!wallet) throw new Error("Wallet not configured");

  const executed = entries.filter((entry) => entry.executed && entry.txHash);
  const previews = new Map<string, { buyAmount: bigint | null; note: string | null }>();
  const trades: TradePnl[] = [];
  let totalSold = 0n;
  let totalReceived = 0n;
  let totalResult = 0n;
  let allHaveResult = executed.length > 0;

  for (const entry of executed) {
    let settlement: Settlement | null = null;
    try {
      settlement = await readSettlement(entry.txHash as string, wallet);
    } catch {
      settlement = null;
    }
    if (!settlement) {
      trades.push(emptyTrade(entry, "Could not read the settled amounts from this transaction on Celo"));
      allHaveResult = false;
      continue;
    }

    totalSold += settlement.sold;
    totalReceived += settlement.received;

    const key = settlement.sold.toString();
    if (!previews.has(key)) previews.set(key, await previewBuyAmount(settlement.sold));
    const preview = previews.get(key)!;

    const soldNumber = Number(ethers.formatUnits(settlement.sold, 18));
    const receivedNumber = Number(ethers.formatUnits(settlement.received, 6));
    const trade: TradePnl = {
      ...emptyTrade(entry, preview.note ?? ""),
      soldWars: ethers.formatUnits(settlement.sold, 18),
      receivedUsdt: ethers.formatUnits(settlement.received, 6),
      executedRate: receivedNumber > 0 ? soldNumber / receivedNumber : null,
      note: preview.note
    };

    if (preview.buyAmount !== null && preview.buyAmount > 0n) {
      const currentNumber = Number(ethers.formatUnits(preview.buyAmount, 6));
      const result = settlement.received - preview.buyAmount;
      totalResult += result;
      trade.currentUsdt = ethers.formatUnits(preview.buyAmount, 6);
      trade.currentRate = currentNumber > 0 ? soldNumber / currentNumber : null;
      trade.resultUsdt = ethers.formatUnits(result, 6);
      trade.resultPct = (receivedNumber / currentNumber - 1) * 100;
    } else {
      allHaveResult = false;
    }
    trades.push(trade);
  }

  return {
    asOf: new Date().toISOString(),
    trades,
    totals: {
      soldWars: ethers.formatUnits(totalSold, 18),
      receivedUsdt: ethers.formatUnits(totalReceived, 6),
      resultUsdt: allHaveResult ? ethers.formatUnits(totalResult, 6) : null
    }
  };
}