# Architecture

## System overview

The app is a two-package project. The root Node.js process owns all private execution (keys, signing, the Textile API key). The frontend is a read-mostly dashboard that talks to the backend over HTTP and server-sent events. Celo Mainnet is the source of truth for balances and settlement, and INDEC's open-data API is the source of the inflation signal.

```text
Operator browser (http://localhost:5173)
  ├─ React/Vite dashboard (hash-based pages)
  │   ├─ AgentContext → GET /api/config, GET /api/history
  │   ├─ AgentContext → JsonRpcProvider(Forno) → ERC-20 balanceOf(wARS, USDT)
  │   ├─ AgentContext ← EventSource /api/logs
  │   ├─ Pages → GET /api/history | /api/treasury | /api/identity | /api/routes
  │   └─ Run hedge agent → POST /api/run-agent
  │
  └─ Node/Express server (http://localhost:3000)
      ├─ runAgentCycle(logger)
      │   ├─ fetchInflation()      → apis.datos.gob.ar (INDEC index, validated)
      │   ├─ threshold policy      → year-over-year % vs INFLATION_HEDGE_THRESHOLD
      │   ├─ Textile FX            → POST /v2/rfq/request
      │   ├─ withAttributionTag()  → every transaction the agent builds
      │   ├─ ensureAllowance()     → exact-amount, tagged approval (when the quote names a target)
      │   └─ Wallet.sendTransaction() only when DRY_RUN=false
      ├─ data/history.json         → one saved entry per completed run
      └─ register-identity.ts      → one-shot ERC-8004 registration (CLI)
```

During development, Vite forwards `/api` requests to port 3000.

## Backend modules

`src/config.ts` holds chain ID, RPC URL, token addresses, registry address, attribution tag, threshold (default 30, year over year), sell amount and dry-run flag. `src/abis.ts` keeps only the ABI fragments needed. `src/attribution.ts` is the single place that appends the attribution tag and checks for it. `src/inflation.ts` downloads the last 13 monthly values of INDEC's national consumer price index, calculates year-over-year inflation itself, and throws on missing months, stale data (older than 120 days) or implausible values. `src/agent.ts` runs the cycle: read inflation, apply the threshold, request a quote, check gas, tag the transaction, prepare or send the approval and swap, and return a precise reason. `server.ts` exposes the HTTP endpoints, the log stream and the run lock, and saves each completed run.

## Frontend modules

`App.tsx` switches between five pages using the URL hash (Overview, Hedge history, Execution routes, Treasury, Identity). `AgentContext` owns loading and execution state, balances, the log stream state, the latest run and the run command. Page components fetch their own data from the backend; they show a loading state, an error that says the backend is unreachable, or an honest "unknown" instead of placeholder values. `lib/reasons.ts` turns a run's reason code into a readable label.

## Data and failure flow

`POST /api/run-agent` runs one cycle and responds when it finishes (it can take several seconds because of the inflation and quote requests). The server holds a lock, so a second request while a cycle is running gets HTTP 409. Progress is streamed to connected clients over `/api/logs`. New clients receive only live events, and the server sends a keep-alive ping every 25 seconds.

Every outcome has a reason code that is saved to history: `below-threshold`, `dry-run-prepared`, `executed`, `quote-rejected`, `no-transaction`, `insufficient-gas`, `approval-target-unknown`, `swap-failed`, `wallet-missing`, `api-key-missing`. If the inflation data cannot be read or fails validation, the request ends with HTTP 500 and an explanatory message, and nothing is saved (there is no signal to record).

## Deployment shape

Development uses two processes: `npx tsx server.ts` for the backend and `npm --prefix frontend run dev` for the dashboard. The backend does not serve the built frontend, so there is no single-process production mode yet. History lives in a local JSON file; there is no database.

## Trust boundaries

The private key and Textile API key exist only in the backend environment. The browser reads public data (wallet address, token addresses, balances through a public RPC) and never signs anything. The backend only accepts browser requests from localhost origins. The inflation feed is a public API treated as untrusted input and validated before use. The transaction builder is the highest-risk boundary and keeps dry-run enabled until quote semantics are verified.
