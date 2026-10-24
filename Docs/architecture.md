# Architecture

## System overview

The app is a two-package monorepo. The root Node.js process owns private execution and serves the built frontend. The frontend owns read-only presentation and communicates with the backend through relative HTTP endpoints and SSE. Celo Mainnet is the source of truth for public token balances and eventual settlement.

```text
Operator browser
  ├─ React/Vite dashboard
  │   ├─ AgentContext → GET /api/config → JsonRpcProvider(Forno)
  │   ├─ AgentContext → ERC-20 balanceOf(wARS, USDT)
  │   ├─ AgentContext ← EventSource /api/logs ← Express SSE registry
  │   └─ Run Hedge Agent → POST /api/run-agent
  │
  └─ Node/Express server
      ├─ runAgentCycle(logger)
      │   ├─ getInflationRate() [mock boundary]
      │   ├─ threshold policy
      │   ├─ Textile FX POST /v2/rfq/request
      │   ├─ attribution-tagged transaction preparation
      │   └─ ethers Wallet.sendTransaction() when DRY_RUN=false
      └─ ERC-8004 registration script (one-shot CLI)
```

## Backend modules

`src/config.ts` defines chain ID, RPC URL, token addresses, registry address, threshold, and dry-run controls. `src/abis.ts` keeps only the ERC-20 and ERC-8004 fragments needed by the MVP. `src/agent.ts` is the orchestration boundary: it sets DNS servers before imports that perform network work, creates the provider and wallet lazily, reads the mock signal, requests a quote, normalizes transaction nesting, checks value balance, appends the attribution bytes, and submits only when allowed. `server.ts` converts cycle events into timestamped SSE frames and serves the static output.

## Frontend modules

`AgentContext` is the single state owner for loading, execution, balances, inflation rate, agent address, logs, and commands. It obtains public configuration from `/api/config`, creates an `ethers.JsonRpcProvider` for `https://forno.celo.org` or the server-provided equivalent, and calls each token’s `balanceOf`. UI components are presentational: the topbar triggers the context command, the chart reads context values, Smart Insights explains policy state, and the terminal renders SSE events.

## Data and failure flow

A run request returns HTTP 202 immediately, preventing a slow RFQ from blocking the browser. The server sets an execution lock so two manual cycles cannot overlap. Every meaningful branch writes an event: scan started, signal value, threshold result, RFQ request, missing corridor, insufficient CELO, attribution bytes, dry-run block, submitted hash, or confirmation. Clients can reconnect to `/api/logs` and receive the recent in-memory event buffer before live frames.

## Deployment shape

For local development, build the frontend once and run `npm run dev` for the Express service, or run Vite separately for hot reload. In preview/production, the root service listens on port 3000 and serves `frontend/dist`. The project does not require a database for the MVP; future persistence can use a managed database or an append-only event store.

## Trust boundaries

Private key and Textile API key live only in the backend environment. The frontend receives only public wallet and token addresses. The public RPC is read-only from the browser. The server’s transaction builder is the high-risk boundary and must keep dry-run enabled until provider calldata semantics are validated.
