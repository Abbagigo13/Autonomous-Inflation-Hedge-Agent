# Autonomous Inflation Hedge Agent

**An agent that reads Argentina's official inflation data and, when it crosses a threshold, requests a wARS → USDT swap on Celo Mainnet through Textile FX.**

Built for the Agents on Open Rails hackathon (Celo). Targets **Stable Agents: LatAm** and **Stable Agents: Open Corridors**.

## Current status

| Area | Status |
| --- | --- |
| Real inflation data (INDEC, via datos.gob.ar) | Working |
| Textile FX quote request | Working; the quote is rejected below Textile's minimum trade size |
| ERC-8004 identity | Agent wallet is registered; the dashboard checks the registry live |
| Attribution tag on every transaction the agent builds | Implemented (swap, approval, registration) |
| First live end-to-end swap on Celo Mainnet | **Pending** (needs about 1,700+ wARS in the agent wallet) |
| Scheduled / unattended runs | Not built yet; a run starts when the operator clicks the button |

## How it works

1. **Read inflation.** The agent downloads the last 13 monthly values of INDEC's national consumer price index (series `148.3_INIVELNAL_DICI_M_26`) and calculates year-over-year inflation itself.
2. **Validate.** The data must be 13 consecutive months, not older than 120 days, and in a sane range. If anything looks wrong, the run stops with an error. It never falls back to a made-up number.
3. **Compare.** If year-over-year inflation is at or above the trigger (default **30%**, set with `INFLATION_HEDGE_THRESHOLD`), a hedge is needed. At the time of writing the latest available reading is **33.5% (August 2026)**.
4. **Request a quote.** The agent asks Textile FX for an RFQ to sell `HEDGE_SELL_AMOUNT` wARS for USDT.
5. **Prepare the transaction.** It checks the wallet has enough CELO for gas, adds the attribution tag `celo_09b7d0a51f16` to the transaction data, and, if the quote names who may spend the wARS, prepares an approval for exactly the sell amount (also tagged).
6. **Dry run or live.** With `DRY_RUN=true` (the default) nothing is sent. With `DRY_RUN=false` the approval and swap are broadcast, and the agent reads the swap back from the chain to log whether the tag is present. In live mode it refuses to send if the quote does not name an approval target.
7. **Record.** Every run is saved to `data/history.json` and shown on the dashboard.

Textile enforces a minimum trade size. It was about 1,640 wARS when tested and moves with the exchange rate, so `HEDGE_SELL_AMOUNT` must be above it.

## Dashboard

React + Vite, all pages read real data:

- **Overview:** wallet balances, latest inflation figure, signal history chart, last run result, live agent terminal (server-sent events).
- **Hedge history:** every saved run, with Celoscan links for executed transactions.
- **Execution routes:** the route the agent uses, read from its configuration.
- **Treasury:** live wARS, USDT and CELO balances, and whether the wARS balance covers the configured hedge.
- **Identity:** live check of the wallet in the ERC-8004 registry.

## Setup (development mode)

Requires Node.js 20+.

```bash
cp .env.example .env
npm install
npm --prefix frontend install
```

Fill in `.env` (never commit it): `AGENT_PRIVATE_KEY` and `TEXTILE_API_KEY` are required. Optional: `AGENT_WALLET_ADDRESS`, `INFLATION_HEDGE_THRESHOLD`, `HEDGE_SELL_AMOUNT`, `DRY_RUN`, `PORT`, `TEXTILE_API_BASE_URL`.

Run two terminals:

```bash
# Terminal 1: backend on http://localhost:3000
npx tsx server.ts

# Terminal 2: dashboard on http://localhost:5173
npm --prefix frontend run dev
```

Open `http://localhost:5173`. Vite forwards `/api` requests to the backend. A production build that serves the dashboard from the backend is not implemented yet.

## Backend API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/config` | Network, wallet address, mode, threshold, sell amount |
| `GET /api/logs` | Live log stream (server-sent events) |
| `POST /api/run-agent` | Runs one cycle and returns when it finishes (one at a time) |
| `GET /api/history` | Saved runs, newest first |
| `GET /api/treasury` | wARS, USDT and CELO balances of the agent wallet |
| `GET /api/identity` | ERC-8004 registration status |
| `GET /api/routes` | The configured execution route |

## ERC-8004 identity

```bash
npm run register:identity
```

The script checks the registry first and does nothing if the wallet is already registered (use `--force` to override). New registrations are sent with the attribution tag, and the script confirms the tag on-chain afterwards. The identity metadata lists the agent's capabilities and tag.

## Attribution tag

Every transaction the agent builds goes through one helper (`src/attribution.ts`), which appends the tag and refuses to send if it is missing.

## Known limitations

- A run starts only when the operator clicks the button; there is no scheduler yet.
- `POST /api/run-agent` has no authentication. The server only accepts browser requests from localhost, so run it locally.
- The agent signs with a server-side wallet key. Use a dedicated wallet with a small balance.
- INDEC's open-data feed lags the press release, so the newest month it provides may be one month behind.
- The approval target is read from the Textile quote; if the quote does not name one, live swaps are blocked. This is verified against a real quote only after the wallet is funded.
- Not financial advice. Textile response formats can change.

## Roadmap (planned, not built)

- Scheduled runner with alerts for low gas and failed quotes
- Operator authentication for the run endpoint
- Paid data access over x402, if a suitable data provider is found (the official INDEC feed is free)
- Additional corridors (wBRL, wMXN, wCOP), each with its own official inflation source
- Non-custodial user vaults and a MiniPay mini app (these need security review before holding user funds)
- Routing hedged USDT into yield protocols