import axios from "axios";
import { ethers } from "ethers";
import { CHAIN_ID, TEXTILE_API_BASE_URL, USDT_ADDRESS, WARS_ADDRESS } from "./config.js";

const apiKey = process.env.TEXTILE_API_KEY;
if (!apiKey) throw new Error("TEXTILE_API_KEY is not set in .env");

type Side = { token: string; decimals: number; symbol: string };
const WARS: Side = { token: WARS_ADDRESS, decimals: 18, symbol: "wARS" };
const USDT: Side = { token: USDT_ADDRESS, decimals: 6, symbol: "USDT" };

/** Asks Textile for a free, indicative price. Nothing is signed or sent. */
async function preview(sell: Side, buy: Side, sellAmount: bigint): Promise<bigint | null> {
  const label = `${sell.symbol} -> ${buy.symbol}`;
  try {
    const response = await axios.post(
      `${TEXTILE_API_BASE_URL}/rfq/preview`,
      { chainId: CHAIN_ID, sellToken: sell.token, buyToken: buy.token, sellAmount: sellAmount.toString() },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 30_000 }
    );
    const data = response.data?.data;
    if (data?.status === "preview" && typeof data.buyAmount === "string" && /^\d+$/.test(data.buyAmount)) {
      const buyAmount = BigInt(data.buyAmount);
      console.log(`${label}: sell ${ethers.formatUnits(sellAmount, sell.decimals)} ${sell.symbol} -> about ${ethers.formatUnits(buyAmount, buy.decimals)} ${buy.symbol}`);
      return buyAmount;
    }
    console.log(`${label}: Textile answered "${data?.status ?? "unknown"}"${typeof data?.reason === "string" ? ` (${data.reason})` : ""}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.error?.message ?? error.message;
      console.log(`${label}: request failed (${error.response?.status ?? "no response"}) · ${detail}`);
    } else {
      console.log(`${label}: request failed`);
    }
  }
  return null;
}

const sellWars = ethers.parseUnits("1750", 18);
const gotUsdt = await preview(WARS, USDT, sellWars);
if (gotUsdt !== null) {
  const backWars = await preview(USDT, WARS, gotUsdt);
  if (backWars !== null) {
    const lost = Number(ethers.formatUnits(sellWars - backWars, 18));
    console.log(`Round trip: 1750 wARS -> USDT -> wARS leaves ${ethers.formatUnits(backWars, 18)} wARS (cost about ${((lost / 1750) * 100).toFixed(2)}%)`);
  }
}