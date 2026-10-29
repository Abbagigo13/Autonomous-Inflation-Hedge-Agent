# Agent Identity and Capabilities

## Identity

The agent is registered on Celo Mainnet through the ERC-8004 Identity Registry at `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`. The registration script uses the agent wallet derived from `AGENT_PRIVATE_KEY`, creates JSON metadata, encodes it as a `data:application/json;base64` URI, and calls `register(string agentURI)`. It checks the registry first and does nothing if the wallet is already registered (use `--force` to override).

The metadata includes the name, version, chain name, chain ID `42220`, wallet address, capability list, and attribution tag `celo_09b7d0a51f16`. Keeping the metadata self-contained makes the identity inspectable without hosting a separate metadata server.

## Capabilities

**Inflation monitoring:** `fetchInflation()` in `src/inflation.ts` reads INDEC's national consumer price index from Argentina's open-data API, calculates year-over-year inflation from the raw index values, and throws if the data is missing, has gaps, is older than 120 days, or looks implausible.

**Policy evaluation:** `runAgentCycle()` compares the signal to `INFLATION_HEDGE_THRESHOLD` (default 30, in percent, year over year) and produces a clear below-threshold or threshold-breached outcome.

**Open-corridor routing:** `executeSwap()` requests a Textile FX RFQ for wARS to USDT on Celo Mainnet using the agent wallet as taker, and returns a precise reason for every outcome (for example `quote-rejected`, `dry-run-prepared`, `executed`).

**Attribution:** `src/attribution.ts` appends the tag to the swap, the token approval and the registration. The agent refuses to send a transaction without it, and after a live swap it reads the transaction back to confirm the tag on-chain.

**Approvals:** if the Textile quote names an approval target, the agent approves exactly the sell amount (never unlimited). In live mode it refuses to send a swap when the quote does not name an approval target.

**Observability:** Express emits timestamped structured log frames through `/api/logs`; the dashboard renders them as a live execution trail. Every run is also saved to `data/history.json`.

## Operating modes

`DRY_RUN=true` is the default and is appropriate for development, judging, and corridor inspection. It runs the policy and the quote request, prepares tagged transactions, and does not broadcast. `DRY_RUN=false` sends the approval (if needed) and the swap after the balance and tag guards pass. Use live mode only with a dedicated, low-balance wallet.

## Delegation roadmap

A future version can expose an authenticated agent-to-agent endpoint where an ERC-8004 identity requests a policy quote and receives a signed hedge intent. That interface should preserve the current boundaries: no arbitrary contract targets, no unrestricted token amounts, and explicit attribution on every settlement. Paid data access over x402 is possible only if a suitable paid data provider is adopted.
