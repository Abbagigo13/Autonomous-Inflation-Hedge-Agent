import "dotenv/config";
import { ethers } from "ethers";
import { ERC8004_ABI } from "./abis.js";
import { hasAttributionTag, withAttributionTag } from "./attribution.js";
import { ATTRIBUTION_TAG, CHAIN_ID, ERC8004_REGISTRY, RPC_URL } from "./config.js";

const privateKey = process.env.AGENT_PRIVATE_KEY;
if (!privateKey) throw new Error("AGENT_PRIVATE_KEY is required to register the agent identity");

const force = process.argv.includes("--force");
const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });
const wallet = new ethers.Wallet(privateKey, provider);

// 1. Do not register twice by accident
try {
  const checker = new ethers.Contract(ERC8004_REGISTRY, ["function balanceOf(address owner) view returns (uint256)"], provider);
  const count = (await checker.balanceOf(wallet.address)) as bigint;
  if (count > 0n && !force) {
    console.log(`${wallet.address} is already registered on the ERC-8004 registry. Nothing was sent.`);
    console.log("Run with --force only if you really want to register a second identity.");
    process.exit(0);
  }
} catch {
  console.log("Could not check the registry first; continuing.");
}

const metadata = {
  name: "Autonomous Inflation Hedge Agent",
  description: "Autonomous Argentina inflation monitor and wARS to USDT hedge executor on Celo Mainnet.",
  version: "1.0.0",
  capabilities: ["inflation-monitoring", "textile-fx-rfq", "wars-usdt-hedging", "sse-observability"],
  network: "celo-mainnet",
  chainId: CHAIN_ID,
  wallet: wallet.address,
  attributionTag: ATTRIBUTION_TAG
};
const agentURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata), "utf8").toString("base64")}`;

// 2. Build the transaction by hand so we can add the attribution tag
const registry = new ethers.Contract(ERC8004_REGISTRY, ERC8004_ABI, wallet);
const data = withAttributionTag(registry.interface.encodeFunctionData("register", [agentURI]));
if (!hasAttributionTag(data)) throw new Error("Attribution tag missing; refusing to send");

const txRequest = { to: ERC8004_REGISTRY, data, value: 0n };

console.log(`Registering ${wallet.address} on ERC-8004 registry ${ERC8004_REGISTRY}`);
console.log(`Attribution tag attached: ${ATTRIBUTION_TAG}`);

// 3. Dry check: this fails here (without spending gas) if the registry would reject the call
const gasEstimate = await wallet.estimateGas(txRequest);
const tx = await wallet.sendTransaction({ ...txRequest, gasLimit: (gasEstimate * 12n) / 10n });
console.log(`Submitted ${tx.hash}`);
const receipt = await tx.wait();
console.log(`Confirmed in block ${receipt?.blockNumber ?? "unknown"}`);

// 4. Prove the tag really went on-chain
const onChain = await provider.getTransaction(tx.hash);
console.log(onChain && hasAttributionTag(onChain.data) ? "Verified: the attribution tag is on-chain." : "Warning: could not confirm the tag on-chain.");
console.log(`https://celoscan.io/tx/${tx.hash}`);