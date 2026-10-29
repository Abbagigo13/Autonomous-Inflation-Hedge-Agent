# Testing

## Static checks

```bash
npm install
npm --prefix frontend install
npm run typecheck
npm --prefix frontend run build
```

The root typecheck covers the backend. The frontend build runs the TypeScript check and the Vite build.

## Local smoke test

Copy `.env.example` to `.env` and leave `DRY_RUN=true`. Run two terminals:

```bash
# Terminal 1: backend
npx tsx server.ts

# Terminal 2: dashboard
npm --prefix frontend run dev
```

Then check the endpoints (PowerShell shown; use `curl` on macOS or Linux):

```powershell
Invoke-RestMethod http://localhost:3000/api/config
Invoke-RestMethod http://localhost:3000/api/treasury
Invoke-RestMethod http://localhost:3000/api/identity
Invoke-RestMethod http://localhost:3000/api/routes
Invoke-RestMethod http://localhost:3000/api/history
Invoke-RestMethod -Method Post http://localhost:3000/api/run-agent
```

The run request returns after the cycle finishes. With the wallet below Textile's minimum, expect HTTP 200 and a result with `reason: "quote-rejected"`. With no wallet key, expect `wallet-missing`. A second request sent while a cycle is running must return HTTP 409.

## Inflation data test

Run the agent and read the terminal. A healthy run prints a `Series check` line naming the national consumer price index, followed by `Inflation signal: <percent> year over year (<date>)`. The date should be recent (within about 4 months). To test the failure path, disconnect from the internet and run again: the request must return HTTP 500 with a message that the inflation data could not be read, and no entry must be added to history.

## Quote test

With a valid Textile API key and `DRY_RUN=true`, run the agent. Below Textile's minimum trade size the quote is rejected and the terminal prints the exact reason. With enough wARS in the wallet, the terminal prints `Quote received · fields: …` and `Transaction fields: …`. Confirm that the quote names an approval target, and that the run ends with `dry-run-prepared` and does not broadcast anything.

## Identity test

Run `npm run register:identity`. For a wallet that is already registered it prints "already registered" and sends nothing. For a new wallet, review the printed metadata, confirm the transaction targets the configured registry, and check that the script prints "Verified: the attribution tag is on-chain".

## Attribution test

After a live swap, open the transaction on Celoscan, expand the input data, and confirm it ends with `63656c6f5f303962376430613531663136` (the tag as hex). Do the same for the approval transaction. The agent also logs "Attribution tag verified on-chain" after a live swap.

## Frontend checks

Open the dashboard. Overview shows the dry-run or live badge, real balances, the inflation figure with its source, and an honest empty chart until there are two saved runs. Hedge history lists each saved run with its outcome. Execution routes shows the configured Textile route. Treasury shows wARS, USDT and CELO balances and whether the balance covers the configured hedge amount. Identity shows Registered, Not registered or Could not verify. Stop the backend and confirm the pages show a clear "backend not running" message and the terminal badge says the stream is offline.

## Pre-live checklist

Hold more wARS than both `HEDGE_SELL_AMOUNT` and Textile's current minimum, plus enough CELO for gas. Run a dry run and read the quote field names. Confirm the quote names an approval target. Use a dedicated wallet with a small balance. Only then set `DRY_RUN=false`, run once, and verify the swap and the attribution tag on Celoscan before running again.
