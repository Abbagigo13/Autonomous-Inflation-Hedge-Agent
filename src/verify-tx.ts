import { verifyTx } from "@celo/attribution-tags";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { ATTRIBUTION_TAG } from "./config.js";

const hashes = process.argv.slice(2);
if (hashes.length === 0) {
  console.log("Usage: npx tsx src/verify-tx.ts <txHash> [<txHash> ...]");
  process.exit(1);
}

const client = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });

for (const hash of hashes) {
  try {
    const result = await verifyTx({ client, hash: hash as `0x${string}` });
    const found = Boolean(result && result.codes.includes(ATTRIBUTION_TAG));
    console.log(hash);
    console.log(`  codes: ${result ? JSON.stringify(result.codes) : "none"} · schema ${result ? result.schemaId : "-"}`);
    console.log(`  ${found ? "OUR CODE IS PRESENT" : "OUR CODE IS NOT FOUND"}`);
  } catch (error) {
    console.log(hash);
    console.log(`  could not verify: ${error instanceof Error ? error.message : error}`);
  }
}