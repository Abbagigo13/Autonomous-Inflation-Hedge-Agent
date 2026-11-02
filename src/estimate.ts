import axios from "axios";
import { ethers } from "ethers";
import { CHAIN_ID, HEDGE_THRESHOLD, TEXTILE_API_BASE_URL, USDT_ADDRESS, WARS_ADDRESS } from "./config.js";
import { fetchInflation, type InflationReading } from "./inflation.js";

export type QuoteInfo = {
  available: boolean;
  usdt: number | null;
  pesosPerUsdt: number | null;
  belowMinimum: boolean;
  minimumPesos: number | null;
  note: string | null;
};

export type Estimate = {
  generatedAt: string;
  pesos: number;
  inflation: {
    yearOverYearPct: number;
    monthlyPct: number;
    period: string;
    source: string;
    trigger: number;
    atOrAboveTrigger: boolean;
  };
  purchasingPower: { pesosAfterOneYear: number; lostPct: number };
  quote: QuoteInfo;
};

const INFLATION_TTL_MS = 30 * 60_000;
const INFLATION_STALE_OK_MS = 6 * 3_600_000;
const PREVIEW_TTL_MS = 30_000;
// Textile's firm quotes need about US$1 of value. Its free price preview does not enforce this, so it is checked here.
const MIN_USDT = 0.99;

let inflationCache: { at: number; value: InflationReading } | null = null;
const previewCache = new Map<string, { at: number; value: QuoteInfo }>();

/** The latest INDEC reading, cached so many visitors do not each hit the data source. */
async function getInflation(): Promise<InflationReading> {
  const now = Date.now();
  if (inflationCache && now - inflationCache.at < INFLATION_TTL_MS) return inflationCache.value;
  try {
    const value = await fetchInflation();
    inflationCache = { at: now, value };
    return value;
  } catch (error) {
    // A recent reading is better than none; it is still real INDEC data.
    if (inflationCache && now - inflationCache.at < INFLATION_STALE_OK_MS) return inflationCache.value;
    throw error;
  }
}

function unavailable(note: string | null, minimumPesos: number | null = null): QuoteInfo {
  return { available: false, usdt: null, pesosPerUsdt: null, belowMinimum: minimumPesos !== null || /minimum/i.test(note ?? ""), minimumPesos, note };
}

/** Textile's free, indicative price for selling `pesos` wARS. Nothing is signed or sent. */
async function previewQuote(pesos: number): Promise<QuoteInfo> {
  const key = String(pesos);
  const cached = previewCache.get(key);
  if (cached && Date.now() - cached.at < PREVIEW_TTL_MS) return cached.value;

  const apiKey = process.env.TEXTILE_API_KEY;
  let value: QuoteInfo;
  if (!apiKey) {
    value = unavailable("The price service is not configured");
  } else {
    try {
      const sellAmount = ethers.parseUnits(String(pesos), 18);
      const response = await axios.post(
        `${TEXTILE_API_BASE_URL}/rfq/preview`,
        { chainId: CHAIN_ID, sellToken: WARS_ADDRESS, buyToken: USDT_ADDRESS, sellAmount: sellAmount.toString() },
        { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 30_000 }
      );
      const data = response.data?.data;
      if (data?.status === "preview" && typeof data.buyAmount === "string" && /^\d+$/.test(data.buyAmount) && BigInt(data.buyAmount) > 0n) {
        const usdt = Number(ethers.formatUnits(BigInt(data.buyAmount), 6));
        const pesosPerUsdt = pesos / usdt;
        const belowMinimum = usdt < MIN_USDT;
        value = {
          available: true,
          usdt,
          pesosPerUsdt,
          belowMinimum,
          // About US$1 expressed in pesos at today's rate; the exact minimum is checked on the real quote.
          minimumPesos: belowMinimum ? Math.ceil(pesosPerUsdt) : null,
          note: null
        };
      } else {
        value = unavailable(typeof data?.reason === "string" ? data.reason : `Textile answered "${data?.status ?? "unknown"}"`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.error?.message;
        const match = typeof detail === "string" ? /\((\d+)\s+atomic units\)/.exec(detail) : null;
        const minimumPesos = match ? Number(ethers.formatUnits(BigInt(match[1]), 18)) : null;
        value = unavailable(typeof detail === "string" ? detail : `The price request failed${error.response?.status ? ` (${error.response.status})` : ""}`, minimumPesos);
      } else {
        value = unavailable("The price request failed");
      }
    }
  }

  previewCache.set(key, { at: Date.now(), value });
  if (previewCache.size > 500) {
    const oldest = [...previewCache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 100);
    oldest.forEach(([oldKey]) => previewCache.delete(oldKey));
  }
  return value;
}

/** Everything the plain-language calculator shows for an amount of pesos. */
export async function buildEstimate(pesos: number): Promise<Estimate> {
  const [inflation, quote] = await Promise.all([getInflation(), previewQuote(pesos)]);
  const yearly = inflation.yearOverYearPct;
  // If prices keep rising at today's yearly rate, what today's pesos will buy after a year (an illustration, not a forecast).
  const pesosAfterOneYear = yearly > -100 ? pesos / (1 + yearly / 100) : pesos;
  return {
    generatedAt: new Date().toISOString(),
    pesos,
    inflation: {
      yearOverYearPct: yearly,
      monthlyPct: inflation.monthlyPct,
      period: inflation.period,
      source: "INDEC (datos.gob.ar)",
      trigger: HEDGE_THRESHOLD,
      atOrAboveTrigger: yearly >= HEDGE_THRESHOLD
    },
    purchasingPower: { pesosAfterOneYear, lostPct: pesos > 0 ? (1 - pesosAfterOneYear / pesos) * 100 : 0 },
    quote
  };
}