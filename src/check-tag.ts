import { fromDataSuffix } from "@celo/attribution-tags";
import { ATTRIBUTION_SUFFIX, hasAttributionTag, withAttributionTag } from "./attribution.js";
import { ATTRIBUTION_TAG } from "./config.js";

// A pretend call, only used to see what the tag looks like on the end of calldata.
const sample = "0x095ea7b3";
const tagged = withAttributionTag(sample);

console.log("Tag code:        ", ATTRIBUTION_TAG);
console.log("ERC-8021 suffix: ", ATTRIBUTION_SUFFIX);
console.log("Tagged sample:   ", tagged);
console.log("Our check passes:", hasAttributionTag(tagged));
console.log("Tagging twice changes nothing:", withAttributionTag(tagged) === tagged);

try {
  console.log("SDK decodes it:  ", JSON.stringify(fromDataSuffix(tagged as `0x${string}`)));
} catch (error) {
  console.log("SDK decode call failed:", error instanceof Error ? error.message : error);
}