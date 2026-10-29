# Hackathon Narrative

## The agent in one sentence

HEDGE//AGENT is a policy-driven Celo treasury operator that reads Argentina's official inflation data and, when it crosses a threshold, requests a wARS-to-USDT protection swap through Textile FX, with every transaction it builds carrying the project attribution tag.

## Status at a glance

Working today: real INDEC inflation data with validation, the Textile FX quote request, attribution-tagged transaction preparation, an on-chain ERC-8004 identity check, saved run history, and a five-page dashboard that shows only real data.

Pending: the first live end-to-end swap on Celo Mainnet. Textile enforces a minimum trade size (about 1,640 wARS when tested), and the agent wallet must hold at least that much. Until that swap is done, `DRY_RUN=true` is the default and nothing is broadcast.

Not built: scheduled (unattended) runs. A cycle starts when the operator clicks "Run hedge agent".

## Stable Agents: LatAm

The LatAm problem is not abstract volatility. A treasury holding local-currency exposure can lose purchasing power between manual reviews. The agent's policy is intentionally legible: when year-over-year inflation is at or above the configured trigger (default 30%), request a wARS to USDT route for a configured amount.

The signal is real. The agent reads INDEC's national consumer price index (series `148.3_INIVELNAL_DICI_M_26`) from Argentina's open-data API, downloads the last 13 monthly index values, and calculates the year-over-year change itself. It refuses to run if the data is missing, has gaps, is older than 120 days, or looks implausible. It never falls back to a made-up number. At the time of writing the newest reading is 33.5% for August 2026, so the policy is triggered.

The dashboard shows the signal, the policy state, public balances, and the execution trail in one place.

## Open Corridors: Textile FX

Textile FX is the active quote integration. The agent sends `POST https://api.textilecredit.com/v2/rfq/request` with `chainId: 42220`, the wallet as `taker`, the wARS address as `sellToken`, the USDT address as `buyToken`, and a base-unit `sellAmount`. The response is read defensively because the transaction may be nested differently. A valid returned transaction must have a destination and hex calldata.

If the quote names an approval target, the agent prepares an approval for exactly the sell amount (never unlimited). In live mode it refuses to send if the quote does not name one. Because no full quote has been received yet (the wallet is below Textile's minimum), which field names the approval target is verified only once the wallet is funded.

The agent stops with a readable reason when credentials are missing, the quote is rejected, the quote has no usable transaction, or the wallet lacks CELO for gas. Dry-run mode is the default so routes can be inspected safely.

## Attribution

Every transaction the agent builds carries the literal tag `celo_09b7d0a51f16`, hex-encoded as `0x63656c6f5f303962376430613531663136`. A single helper (`src/attribution.ts`) appends it, and the agent refuses to send any transaction without it. This covers the swap, the token approval and the ERC-8004 registration. After a live swap, the agent reads the transaction back from the chain and logs whether the tag is present. Not every router accepts extra trailing bytes, so this is confirmed on the first live swap.

## ERC-8004 identity

The registration script builds a metadata object (name, version, chain, wallet, capabilities, tag), encodes it as a `data:application/json;base64` URI, and calls `register(string agentURI)` on the Celo Mainnet registry. It checks the registry first and does nothing if the wallet is already registered. The dashboard's Identity page checks the registry live and reports "Registered", "Not registered" or "Could not verify", never an unchecked "verified".

## Ripio

wARS is one of Ripio's wFIAT stablecoins, backed 1:1 by local currency. The hedge ends in USDT, a stable settlement asset familiar to regional users, and the dashboard makes the policy understandable to an operator rather than presenting an opaque trading bot.

## x402

x402 is not used by the current code. The inflation data comes from a free official source, so there is nothing to pay for. x402 would make sense only if the agent later buys data from a paid provider, and it remains a planned extension, not a claimed integration.

## Judging criteria mapping

**Technical execution:** TypeScript backend, real validated inflation data, exact Textile payload, ethers v6 wallet and provider usage, one attribution helper for every transaction, readable error outcomes, and a responsive React dashboard.

**Use of ecosystem:** Celo Mainnet RPC and token addresses, Textile FX quote request, ERC-8004 identity with a live registry check, the attribution tag, and INDEC open data.

**Autonomy:** the cycle makes the threshold decision and prepares settlement without a human choosing a route. The operator currently starts each run; a scheduler is the next planned feature.

**User experience:** every state on the dashboard is backed by real data or says clearly that it is unknown. The terminal streams live logs over server-sent events.

**Trust and safety:** private credentials stay server-side, dry-run is the default, approvals are for the exact amount, live sends are blocked when the approval target is unknown, stale or invalid inflation data stops the run, and the browser origin is limited to localhost.
