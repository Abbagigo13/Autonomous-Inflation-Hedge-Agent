import "dotenv/config";
import { ethers } from "ethers";
import { ERC8004_ABI } from "./abis.js";
import { ERC8004_REGISTRY, RPC_URL } from "./config.js";

const privateKey = process.env.AGENT_PRIVATE_KEY;
if (!privateKey) throw new Error("AGENT_PRIVATE_KEY is required to register the agent identity");

const provider = new ethers.JsonRpcProvider(RPC_URL, 42220, { staticNetwork: true });
const wallet = new ethers.Wallet(privateKey, provider);
const metadata = {
  name: "Autonomous Inflation Hedge Agent",
  description: "Autonomous Argentina inflation monitor and wARS to USDT hedge executor on Celo Mainnet.",
  version: "1.0.0",
  capabilities: ["inflation-monitoring", "textile-fx-rfq", "wars-usdt-hedging", "sse-observability"],
  network: "celo-mainnet",
  chainId: 42220,
  wallet: wallet.address,
  attributionTag: "celo_09b7d0a51f16"
};
const agentURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata), "utf8").toString("base64")}`;
const registry = new ethers.Contract(ERC8004_REGISTRY, ERC8004_ABI, wallet);

console.log(`Registering ${wallet.address} on ERC-8004 registry ${ERC8004_REGISTRY}`);
console.log(`Metadata URI length: ${agentURI.length}`);
const tx = await registry.register(agentURI);
console.log(`Submitted ${tx.hash}`);
const receipt = await tx.wait();
console.log(`Confirmed in block ${receipt?.blockNumber ?? "unknown"}`);
