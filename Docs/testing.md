# Testing

## Static checks

Install dependencies and run:

```bash
npm install
npm --prefix frontend install
npm run typecheck
npm --prefix frontend run build
```

The root typecheck covers `server.ts` and `src/**/*.ts`. The frontend build covers React, Vite, Tailwind, Recharts, and alias resolution.

## Local smoke test

Copy `.env.example` to `.env`, leave `DRY_RUN=true`, build, and start the server:

```bash
npm run build
npm run dev
```

In another terminal:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/config
curl http://localhost:3000/manus-routes.json
curl -N http://localhost:3000/api/logs
curl -X POST http://localhost:3000/api/run-agent
```

The run request should return HTTP 202. The SSE client should receive a manual request event followed by the 8.4% signal, the threshold decision, and a clear blocked message because credentials are absent. The dashboard should still render, with public balances populated when `AGENT_WALLET_ADDRESS` or `VITE_AGENT_WALLET_ADDRESS` points to a real wallet.

## RFQ contract test

With valid Textile credentials, keep dry-run enabled. Stub or record the RFQ response and verify that the request includes chain ID 42220, the exact wARS and USDT addresses, the wallet as taker, and a base-unit sell amount. Verify that a no-corridor response does not call `sendTransaction` and emits a warning. Verify that a response with insufficient native CELO does not broadcast.

## Identity test

On a funded test wallet or controlled Celo account, run `npm run register:identity`. Review the printed metadata URI locally before signing. Confirm the transaction targets the configured ERC-8004 registry and that the receipt is confirmed on chain.

## Frontend checks

Open the dashboard and confirm the skeleton appears during the initial public config/balance request, the four KPI cards render, the chart has two series, the insight cards explain the current signal, and the terminal auto-scrolls as SSE events arrive. Click “Run hedge agent” twice quickly; the server should reject the second request with HTTP 409 while the first cycle is active.

## Pre-live checklist

Inspect Textile calldata, verify the router and tokens, run a simulation, set an explicit maximum sell amount, fund only a dedicated wallet, confirm the attribution convention, and change `DRY_RUN` only after all checks pass.
