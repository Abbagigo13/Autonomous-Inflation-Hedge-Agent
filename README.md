# Autonomous Inflation Hedge Agent

**Autonomous protection for wARS treasury value on Celo Mainnet.**

This full-stack hackathon implementation monitors a configurable Argentina inflation signal, decides when a policy threshold is breached, requests a wARS → USDT route quote through Textile FX, and prepares or broadcasts the returned transaction from a server-side agent wallet. The dashboard makes policy state, public token balances, and the execution trail visible without exposing private credentials.

## Why this matters

Inflationary local-currency exposure can lose value faster than a treasury operator can react. The agent turns a macro signal into a deterministic protection policy: observe, compare with threshold, request a route, verify execution prerequisites, add attribution, and settle into USDT. Celo makes the workflow inexpensive enough for frequent monitoring while ERC-8004 makes the operator identity legible onchain.

## Tracks and integrations

The implementation targets the **Stable Agents: LatAm** track through the Argentina/wARS inflation-hedge use case and **Open Corridors** through Textile FX RFQ routing on Celo. ERC-8004 provides the identity registration path. The attribution value `celo_09b7d0a51f16` is encoded as hex and appended to the provider transaction data before submission. x402 is documented as a future payment/authorization rail rather than fabricated as an active dependency; the current live execution rail is Textile FX.

## Repository layout

`src/agent.ts` contains the cycle, inflation signal, Textile request, transaction preparation, attribution injection, and error handling. `src/register-identity.ts` is a one-shot ERC-8004 identity registration script. `server.ts` exposes health/config APIs, live SSE logs, and the run endpoint while serving the compiled frontend. `frontend/src/context/AgentContext.tsx` reads public token balances from Forno and owns UI execution state. `frontend/src/components` contains the premium dark dashboard and live terminal. The root markdown files provide the product, design, security, architecture, judging, and testing handoff.

## Requirements

Use Node.js 20+ and npm or pnpm. A Textile API key and a funded Celo agent wallet are required for live settlement. Registration requires native CELO for gas. The public dashboard can still be previewed without those secrets; it shows a blocked execution state rather than pretending a trade settled.

## Setup

```bash
cp .env.example .env
npm install
npm --prefix frontend install
npm run build
npm run dev
```

The service listens on `http://localhost:3000`. It serves the compiled frontend from `frontend/dist`, plus `/api/health`, `/api/config`, `/api/logs`, and `/api/run-agent`. For frontend-only hot reload, run `npm --prefix frontend run dev` separately; Vite proxies `/api` to port 3000.

Set `AGENT_PRIVATE_KEY`, `AGENT_WALLET_ADDRESS`, and `TEXTILE_API_KEY` in `.env` for live use. Keep `DRY_RUN=true` while validating RFQ responses. Set `DRY_RUN=false` only after independently inspecting the returned `to`, `data`, `value`, and gas fields against the corridor contract and confirming the wallet has enough CELO for gas. The dashboard uses `VITE_AGENT_WALLET_ADDRESS` when supplied; otherwise it reads the public wallet address from `/api/config`.

## Register the ERC-8004 identity

After funding the wallet and checking the registry ABI/network, run:

```bash
npm run register:identity
```

The script creates a JSON metadata document with the agent name, chain, wallet, capabilities, and attribution tag. It base64-encodes that JSON into a `data:application/json;base64,...` URI and calls `register(string agentURI)` on the Celo Mainnet registry at `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`.

## Agent cycle

The default demo signal returns `8.4%`. The policy threshold defaults to `5%` and is configured by `INFLATION_HEDGE_THRESHOLD`. When the signal is below threshold, the cycle exits without requesting a quote. When the signal is above threshold, the agent submits this exact Textile payload shape:

```json
{
  "chainId": 42220,
  "taker": "<agent wallet>",
  "sellToken": "0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d",
  "buyToken": "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e",
  "sellAmount": "<base-unit amount>"
}
```

The implementation handles absent credentials, no RFQ corridor, insufficient native balance, invalid transaction data, provider errors, and dry-run mode. The API responds immediately to a run request while the cycle streams progress to all connected SSE clients.

## Roadmap

### Achieved

A working Celo Mainnet configuration, ERC-8004 registration script, Textile RFQ adapter, attribution-tagged transaction preparation, Express SSE observability, real Forno ERC-20 balance reads, responsive dashboard, Recharts allocation history, skeleton loading state, and documentation are included.

### In progress

Replace the mock inflation function with a signed Argentina CPI source or trusted oracle; persist completed hedge events and quote outcomes; add role-based operator controls; and add a scheduled runner with alerting for blocked corridors and low gas.

### Future vision

The agent can become a multi-country protection network with policy templates for ARS, BRL, MXN, and COP exposure, route-quality scoring across open corridors, x402-based paid data/agent services, formal transaction simulation, and a composable ERC-8004 capability registry that lets other agents request protection for their treasury.

## Safety note

This code is an execution template, not financial advice. Textile response schemas and corridor requirements can change. Keep dry-run mode enabled until the returned transaction is validated in a fork or controlled wallet, and never commit `.env`, private keys, or API keys.
