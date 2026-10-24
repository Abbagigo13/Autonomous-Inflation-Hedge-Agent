# Hackathon Narrative

## The agent in one sentence

HEDGE//AGENT is a policy-driven Celo treasury operator that converts an observable Argentina inflation signal into an auditable wARS-to-USDT protection attempt.

## Stable Agents: LatAm

The LatAm problem is not abstract volatility. A treasury that holds local-currency exposure can lose purchasing power between manual reviews. The agent’s first policy is intentionally legible: when the inflation signal is at or above the configured threshold, request a wARS → USDT route for a configured amount. The dashboard shows the signal, policy state, public balances, and execution trail in one screen.

The current `getInflationRate()` is a mock boundary returning `8.4%` so judges can exercise the full orchestration without depending on a third-party macro endpoint. It is isolated behind one function and can be replaced with a signed CPI source, oracle, or authenticated data provider without changing the execution contract.

## Open Corridors: Textile FX

Textile FX is the active liquidity and quote integration. The agent sends `POST https://api.textilecredit.com/v2/rfq/request` with the exact required fields: `chainId: 42220`, the wallet as `taker`, the wARS address as `sellToken`, the USDT address as `buyToken`, and a base-unit `sellAmount`. The response is normalized defensively because provider transaction nesting may vary. A valid returned transaction is checked for a destination and hex calldata, then prepared for signing.

The code logs and exits gracefully when a corridor is unavailable, the API returns a route/liquidity error, the wallet has insufficient CELO, or credentials are missing. Dry-run mode is the default to make route inspection safe during judging.

## Attribution

Every attempted settlement carries the literal tag `celo_09b7d0a51f16`. The backend converts it to UTF-8 hex (`0x63656c6f5f303962376430613531663136`) and appends the bytes to the provider transaction data before submission. The implementation surfaces both representations in the terminal, so a reviewer can trace the policy attribution from application logs to transaction calldata. Before production use, the corridor contract’s calldata convention must be verified because not every router accepts arbitrary suffix bytes.

## ERC-8004 identity

The registration script constructs a metadata object containing the agent name, version, Celo chain ID, wallet address, capabilities, and attribution tag. It encodes the JSON as a `data:application/json;base64` URI and calls `register(string agentURI)` on the provided Celo Mainnet registry. This gives the execution wallet a machine-readable agent identity rather than leaving it as an anonymous key.

## Ripio

Ripio is addressed in the product narrative as the stable-asset and LatAm distribution context: the hedge ends in USDT, a stable settlement asset familiar to regional users, and the design makes macro protection understandable to an operator rather than presenting an opaque trading bot. A production integration can replace the mock signal and add a Ripio-supported data or distribution rail while keeping Textile as the route execution adapter.

## x402

x402 is documented as a natural extension, not falsely claimed as a live dependency. The agent could pay for premium CPI attestations, quote-quality data, or another agent’s protection request through x402. The current app keeps the execution path deterministic and credential-light: a server-side Textile API key plus a Celo wallet. This distinction prevents a judging demo from implying an integration that the repository does not actually execute.

## Judging criteria mapping

**Technical execution:** working TypeScript backend, exact API payload, ethers v6 wallet/provider usage, attribution injection, error boundaries, and responsive React dashboard.

**Use of ecosystem:** Celo Mainnet RPC and token addresses, Textile FX corridor request, ERC-8004 identity registration, and a roadmap for x402-paid data/agent services.

**Autonomy:** the cycle makes a threshold decision and prepares settlement without a human selecting a route each time; the operator only configures policy and can trigger a cycle for the demo.

**User experience:** the dashboard exposes the reason for every state, shows public onchain balances, and streams live terminal logs over SSE instead of hiding execution behind a loading spinner.

**Trust and safety:** private credentials stay server-side, dry-run is the default, missing corridors and insufficient funds are explicit, and the README calls out the need for calldata validation before live broadcasts.
