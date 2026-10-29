import "dotenv/config";
import { ethers } from "ethers";

export const CHAIN_ID = 42220;
export const RPC_URL = "https://forno.celo.org";
export const TEXTILE_API_BASE_URL = process.env.TEXTILE_API_BASE_URL ?? "https://api.textilecredit.com/v2";
export const WARS_ADDRESS = "0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d";
export const USDT_ADDRESS = "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e";
export const ERC8004_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
export const ATTRIBUTION_TAG = "celo_09b7d0a51f16";
export const ATTRIBUTION_HEX = `0x${Buffer.from(ATTRIBUTION_TAG, "utf8").toString("hex")}`;
export const PORT = Number(process.env.PORT ?? 3000);
// Year-over-year inflation (in percent) at which the agent hedges.
export const HEDGE_THRESHOLD = Number(process.env.INFLATION_HEDGE_THRESHOLD ?? 30);
export const HEDGE_SELL_AMOUNT = process.env.HEDGE_SELL_AMOUNT ?? "1";
export const DRY_RUN = (process.env.DRY_RUN ?? "true").toLowerCase() === "true";

export function getAgentAddress(): string {
  const configured = process.env.AGENT_WALLET_ADDRESS?.trim();
  if (configured) return configured;
  const key = process.env.AGENT_PRIVATE_KEY?.trim();
  if (key) {
    try {
      return new ethers.Wallet(key).address;
    } catch {
      return "";
    }
  }
  return "";
}