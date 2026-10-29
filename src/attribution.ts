import { toDataSuffix } from "@celo/attribution-tags";
import { ATTRIBUTION_TAG } from "./config.js";

// ERC-8021 marker: the last 16 bytes of any attributed transaction.
const ERC_8021_MARKER = "80218021802180218021802180218021";

/** Our hackathon code as an ERC-8021 suffix, produced by Celo's official SDK. */
export const ATTRIBUTION_SUFFIX: string = toDataSuffix(ATTRIBUTION_TAG);
const SUFFIX_BODY = ATTRIBUTION_SUFFIX.slice(2).toLowerCase();

/** True if the transaction data already ends with our ERC-8021 suffix. */
export function hasAttributionTag(data: string): boolean {
  return data.toLowerCase().endsWith(SUFFIX_BODY);
}

/** Adds our ERC-8021 suffix to the end of transaction data (only once). */
export function withAttributionTag(data: string): string {
  if (!/^0x([0-9a-fA-F]{2})*$/.test(data)) throw new Error("Transaction data is not valid hex");
  if (hasAttributionTag(data)) return data;
  // Indexers read only the last tag, so never stack a second one on data that already carries a tag.
  if (data.toLowerCase().endsWith(ERC_8021_MARKER)) {
    throw new Error("Transaction data already carries a different attribution tag; refusing to add a second one");
  }
  return `${data}${SUFFIX_BODY}`;
}