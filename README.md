# Autonomous Inflation Hedge Agent

**An agent that reads Argentina's official inflation data and, when it crosses a threshold, swaps wARS for USDT on Celo Mainnet through Textile FX. Every transaction it sends carries an ERC-8021 attribution tag.**

Built for the Agents on Open Rails hackathon (Celo). Targets **Stable Agents: LatAm** and **Stable Agents: Open Corridors (Textile FX)**.

- **Live demo:** <https://hedge-agent-dashboard-production.up.railway.app>
- **For everyday users (Spanish or English, no wallet):** <https://hedge-agent-dashboard-production.up.railway.app/#protect>
- **Agent wallet (Celo Mainnet):** [`0x558e3A2B9355B7341FB4d93fF30eAC52f5679Af5`](https://celoscan.io/address/0x558e3A2B9355B7341FB4d93fF30eAC52f5679Af5)
- **Proof of a real hedge:** [swap transaction on Celoscan](https://celoscan.io/tx/0xcec8d8e0fb3418076737409838b167bd8cdcbe64c7c9b850c9dae2405bce0d9b) (1,750 wARS sold for 1.058232 USDT, with the attribution tag)

## How to test the platform, step by step

You need nothing installed: no wallet, no login. Steps 1 to 9 only simulate or calculate (they never send a transaction), so run them as often as you like. Step 10 is the real swap, and step 11 shows how to verify the tag.

1. **Open the live demo.** On the Overview page you should see a "Dry run" badge at the top right and a card called **Try the agent**. The cards below it show the agent wallet's real balances and the latest inflation figure.
2. **Try the plain-language calculator.** This is the page for people with no technical background. Click **Protect my pesos** in the menu (or open the link above). It shows in Spanish if your browser is set to Spanish, otherwise English, and the **ES / EN** switch changes it. Click **2,000 pesos**. You get four cards in plain words: how fast prices rose over the last 12 months (about 33.5%, from INDEC), what 2,000 pesos would buy after a year of the same inflation (an illustration, not a prediction), how many digital dollars the pesos are worth today (Textile FX's reference price, about US$ 1.2), and whether the agent would act. Now type **500** and click Calculate: the price turns grey and an amber box explains that the amount is below Textile's minimum swap (about US$ 1), so the agent could not execute it. This page only calculates. It asks for no wallet and sends nothing.
3. **Check the data source.** Back on the Overview, the "Inflation · year over year" card shows Argentina's year-over-year inflation (about 33.5% when this was written), taken from INDEC's official consumer price index. The trigger is 30%, so the agent should hedge.
4. **Run a simulation at the real trigger.** Leave **Configured (30%)** selected and click **Run simulation**. The terminal at the bottom of the page streams the whole cycle, in this order:
   - the inflation reading and the series name ("IPC. Nivel General Nacional"),
   - "Threshold breached · preparing protective hedge",
   - a real Textile FX quote request, then the quote itself (1,750 wARS for about 1.06 USDT),
   - the contract addresses, which must match the allowlist ("Contracts match the TEXTILE_ALLOWED_ADDRESSES allowlist"),
   - "ERC-8021 attribution suffix attached · code celo_09b7d0a51f16",
   - "Simulation · swap prepared … but not broadcast".

   The result card then says **Dry run complete**. If the demo wallet holds less than 1,750 wARS, Textile refuses to quote and the card says **Quote rejected** instead. That is expected, and the terminal shows Textile's "insufficient funds" reason. You can check the wallet's balance on the Treasury page.
5. **Test the other branch with a what-if trigger.** Choose **40%** and run again. Because 33.5% is below 40%, the result is **No hedge needed**, and no quote is requested. Choose **20%** to see the quote path again. This only changes the simulation. Wait about 20 seconds between runs; the server spaces out runs from the same visitor.
6. **Open Hedge history.** Every run is saved here with its outcome. Runs started by the autopilot carry an **Auto** label. The real executed hedge links to its transaction on Celoscan.
7. **Open Strategy P&L.** For each executed hedge it shows what really settled on-chain (wARS sold, USDT received), the rate at the swap, the indicative rate now (Textile's free price preview), and the difference. A single recent trade says little; the page explains how to read the result.
8. **Open Execution routes, Treasury and Identity.** Routes shows the Textile FX corridor and its settings. Treasury shows live wARS, USDT and CELO balances and whether the wARS balance covers a hedge. Identity checks the agent wallet in the ERC-8004 registry on Celo and should say **Registered**.
9. **Look at the Autopilot card on the Overview page.** The agent also runs by itself every 6 hours (in simulation on this site). The card shows the next check, the last decision, and its limits. Pausing or resuming it is operator-only.
10. **(Optional) Run a real swap.** The live option appears in **Try the agent** only while live demo swaps are switched on. If you don't see it, skip this step; the proof link at the top shows a real swap. Choose **Live swap**, tick the confirmation box, enter the demo code from the submission notes, and click **Run live swap**. The agent then sends a tagged approval and a tagged swap from the demo wallet, which usually takes under a minute. You should see "Approval confirmed", "Swap: attribution tag verified on-chain", an **Executed** result with a Celoscan link, the Treasury page showing about 1,750 fewer wARS and about 1.06 more USDT, and a new row on Strategy P&L. Live swaps are capped in total, with a cooldown of 30 minutes between them, because they spend the builder's own funds. If the cap is used up, or the wallet runs short of wARS, the run is refused or rejected and nothing is sent.
11. **Verify the tag on-chain.** Open any executed swap on Celoscan (for example the proof link above), expand "Click to see more", and look at **Input Data**. It ends with the ERC-8021 marker `80218021802180218021802180218021`, and the code `celo_09b7d0a51f16` appears in it as text bytes (`63656c6f5f303962376430613531663136`). If you have cloned this repository, you can also run `npx tsx src/verify-tx.ts <transaction hash>`, which uses Celo's official `verifyTx` and prints `OUR CODE IS PRESENT`.

## Current status

| Area | Status |
| --- | --- |
| Real inflation data (INDEC, via datos.gob.ar) | Working, validated, fails closed |
| Textile FX quote, approval and swap on Celo Mainnet | **Proven with a live swap** (see the proof link) |
| ERC-8021 attribution tag on the approval and the swap | **Verified on-chain** with Celo's `verifyTx` |
| ERC-8004 identity | Agent wallet is registered; the dashboard checks the registry live |
| Autonomy: scheduled runs with safety limits | Built; runs every 6 hours in simulation on the public site |
| Strategy P&L | Built (settled amounts from the chain, indicative current price) |
| Plain-language calculator in Spanish and English | Built; no wallet, calculation only |
| Public deployment with a read-only visitor view and capped live demo | Deployed on Railway |

Volume so far is small and entirely self-funded. The agent wallet was funded by its builder, Textile's minimum trade is about $1, and the only executed hedge is the one linked above. There are no independent users yet. The calculator lets anyone see what the agent would do for them, but a person cannot yet hedge their own pesos from their own wallet.

## How it works

1. **Read inflation.** The agent downloads the last 13 monthly values of INDEC's national consumer price index (series `148.3_INIVELNAL_DICI_M_26`) and calculates year-over-year inflation itself.
2. **Validate.** The data must be 13 consecutive months, not older than 120 days, and in a sane range. If anything looks wrong, the run stops with an error. It never falls back to a made-up number.
3. **Compare.** If year-over-year inflation is at or above the trigger (default **30%**, set with `INFLATION_HEDGE_THRESHOLD`), a hedge is needed.
4. **Request a quote.** The agent asks Textile FX for a firm RFQ to sell `HEDGE_SELL_AMOUNT` wARS for USDT (75 second timeout, as Textile recommends).
5. **Check the quote.** It must be for the agent wallet, carry no CELO value, approve the wARS token, swap through the quoted reactor, and match the contract allowlist in `TEXTILE_ALLOWED_ADDRESSES`. Anything else stops the run.
6. **Approve exactly what is needed.** The approval is for exactly the amount the quote says the wallet pays (never unlimited), after comparing it with Textile's own approval.
7. **Swap.** The agent confirms the quote has not expired, runs a gas estimate (which fails without spending anything if the swap would revert), and sends the swap.
8. **Verify the tag.** After each live transaction the agent reads it back from Celo and logs whether the tag is present.
9. **Record.** Every run is saved and shown on the dashboard.

In simulation the agent does steps 1 to 6 and prepares the swap, but sends nothing. Textile enforces a minimum trade size (about $1, roughly 1,640 to 1,660 wARS when tested, moving with the exchange rate), so `HEDGE_SELL_AMOUNT` must be above it.

## The calculator (for non-technical users)

The **Protect my pesos** page reads the same INDEC figure the agent uses and Textile FX's free price preview, which signs nothing and sends nothing. It is available in Spanish and English and needs no wallet. It does not promise a result: it says plainly that swapping to dollars only helps if the peso loses value against the dollar, that USDT is issued by a private company, and that this is a hackathon demo and not financial advice. The reference price is indicative: a real quote can differ by around 0.5%, and amounts below Textile's minimum (about US$ 1) are flagged as too small to execute.

## Safety design

- **Dry run is the default.** Real transactions need an explicit live request, and the server refuses live requests unless `LIVE_ENABLED=true`.
- **Visitors cannot spend freely.** A live swap from the web needs a secret demo code, is capped in total, and has a cooldown. The operator (holder of `OPERATOR_TOKEN`) is the only one who can pause or resume the autopilot.
- **What-if triggers only work in simulation**, so they can never cause a real swap.
- **Autopilot limits (when live):** one hedge per 24 hours, a daily wARS cap, a skip when the wallet holds less wARS than the hedge amount, and an automatic pause after 3 failed runs in a row. Live autopilot also needs a second switch (`SCHEDULER_ALLOW_LIVE=true`).
- **Contract allowlist.** Live mode refuses to send to any contract that is not listed in `TEXTILE_ALLOWED_ADDRESSES`.
- **Secrets stay on the server.** The private key and API keys are never sent to the browser, logged, or committed.

## Attribution tag (ERC-8021)

The code `celo_09b7d0a51f16` is encoded as an ERC-8021 suffix by Celo's official SDK (`@celo/attribution-tags`) and appended to the data of every transaction the agent builds (approval and swap). One helper (`src/attribution.ts`) does this, refuses to send without it, and refuses to stack a second tag on data that already has one. The Textile request deliberately does not set `includeAttribution`, so our tag is the only one.

```bash
npx tsx src/check-tag.ts                     # shows the suffix and decodes a sample
npx tsx src/verify-tx.ts <txHash> [<txHash>] # asks Celo's verifyTx about real transactions
```

## Dashboard pages

React + Vite. Every page reads real data or says clearly that a value is unknown.

- **Overview:** Try the agent panel (simulation and what-if), wallet balances, latest inflation, signal history, autopilot status, live agent terminal.
- **Protect my pesos:** the plain-language calculator in Spanish and English.
- **Hedge history:** every saved run, with Celoscan links for executed transactions.
- **Strategy P&L:** settled amounts and the result of each executed hedge against the current indicative price.
- **Execution routes:** the Textile FX route the agent uses.
- **Treasury:** live wARS, USDT and CELO balances, and whether the wARS balance covers a hedge.
- **Identity:** live ERC-8004 registry check.

## Run it yourself (development)

Requires Node.js 20+.

```bash
cp .env.example .env
npm install
npm --prefix frontend install
```

Fill in `.env` (never commit it or share a screenshot of it), then run two terminals:

```bash
# Terminal 1: backend on http://localhost:3000
npx tsx server.ts

# Terminal 2: dashboard on http://localhost:5173
npm --prefix frontend run dev
```

If you build the dashboard (`npm --prefix frontend run build`), the backend serves it on port 3000 by itself.

### Settings

| Name | Purpose | Default |
| --- | --- | --- |
| `AGENT_PRIVATE_KEY` | Key of the agent wallet (use a dedicated, low-balance wallet) | required |
| `TEXTILE_API_KEY` | Textile FX API key | required |
| `TEXTILE_ALLOWED_ADDRESSES` | Comma-separated contract addresses you verified on Celoscan; live mode only sends to these | required for live |
| `INFLATION_HEDGE_THRESHOLD` | Year-over-year inflation (percent) that triggers a hedge | `30` |
| `HEDGE_SELL_AMOUNT` | wARS sold per hedge (must be above Textile's minimum) | `1` |
| `DRY_RUN` | `true` prepares only, `false` sends | `true` |
| `SCHEDULER_ENABLED` | Start the autopilot when the server starts | off |
| `SCHEDULER_INTERVAL_MINUTES` | Minutes between autopilot checks | `360` |
| `HEDGE_COOLDOWN_HOURS` | Minimum hours between live scheduled hedges | `24` |
| `MAX_DAILY_SELL_WARS` | Most wARS the live autopilot sells per day | the hedge amount |
| `SCHEDULER_MAX_FAILURES` | Failed runs in a row before the autopilot pauses itself | `3` |
| `SCHEDULER_ALLOW_LIVE` | Second switch required for live autopilot runs | off |
| `LIVE_ENABLED` | Allow live swaps requested from the web | off |
| `OPERATOR_TOKEN` | Secret for operator-only actions (pause/resume, live swaps without a code) | none |
| `DEMO_CODE` | Secret code that lets a visitor trigger a capped live swap | none |
| `MAX_PUBLIC_LIVE_SWAPS` | Total live swaps visitors may trigger | `5` |
| `PUBLIC_LIVE_COOLDOWN_MINUTES` | Minutes between live swaps triggered by visitors | `30` |
| `PUBLIC_SIMULATION_COOLDOWN_SECONDS` | Seconds between runs from the same visitor | `20` |
| `HISTORY_FILE` | Where saved runs are kept | `data/history.json` |
| `AGENT_WALLET_ADDRESS`, `TEXTILE_API_BASE_URL`, `PORT`, `ALLOWED_ORIGINS` | Optional | |

### Going live safely

1. Hold more wARS than both `HEDGE_SELL_AMOUNT` and Textile's current minimum, plus some CELO for gas.
2. Do a simulation and read the quote lines, including the contract addresses.
3. Verify the contract on Celoscan and add it to `TEXTILE_ALLOWED_ADDRESSES`.
4. Run one live swap as operator, then check both transactions with `npx tsx src/verify-tx.ts`.

## Deployment

The repository includes a `Dockerfile` that installs the backend, builds the dashboard, and starts `npx tsx server.ts` as a single service. The public demo runs on Railway with a volume mounted at `/app/data`, so saved runs survive restarts. The real executed hedges are also kept in `seed/history.seed.json`, which is merged in on every start, so they can never go missing. `GET /api/health` is the health check.

## Backend API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Health check |
| `GET /api/config` | Network, wallet address, mode, threshold, sell amount |
| `GET /api/capabilities` | What the current visitor may do (operator, live enabled, caps) |
| `GET /api/estimate?pesos=N` | Calculator data: real inflation plus Textile's indicative price for N pesos (nothing is sent) |
| `GET /api/logs` | Live log stream (server-sent events) |
| `POST /api/run-agent` | Runs one cycle. Body: `mode` (`simulate` or `live`), `demoCode`, `thresholdOverride` (simulation only) |
| `GET /api/history` | Saved runs, newest first |
| `GET /api/pnl` | Settled amounts and result of each executed hedge |
| `GET /api/treasury` | wARS, USDT and CELO balances of the agent wallet |
| `GET /api/identity` | ERC-8004 registration status |
| `GET /api/routes` | The configured execution route |
| `GET /api/scheduler` | Autopilot status |
| `POST /api/scheduler/pause`, `/resume` | Operator only |

## ERC-8004 identity

```bash
npm run register:identity
```

The script checks the registry first and does nothing if the wallet is already registered (use `--force` to override). New registrations are sent with the attribution tag, and the script confirms the tag on-chain afterwards.

## Project layout

- `server.ts`: HTTP API, live log stream, run protections, history.
- `src/agent.ts`: the hedge cycle (quote, checks, approval, swap).
- `src/inflation.ts`: INDEC data and validation. `src/attribution.ts`: the ERC-8021 helper.
- `src/estimate.ts`: the calculator's data. `src/pnl.ts`: strategy P&L. `src/scheduler.ts`: the autopilot and its limits.
- `src/register-identity.ts`, `src/check-tag.ts`, `src/verify-tx.ts`, `src/check-reverse.ts`: command-line tools.
- `frontend/`: the dashboard (`ProtectPage.tsx` and `lib/i18n.ts` hold the calculator and its Spanish and English text). `seed/`: the real executed hedges. `Dockerfile`: the deployment build.

## Known limitations

- Demo swaps spend the builder's own funds. They show the product working end to end, but they are not independent users and they inflate volume if swapped back and forth.
- Each swap is about $1 (Textile's minimum), so volume is tiny.
- The public autopilot runs in simulation. Live autopilot exists but needs an explicit second switch, and is limited by the daily cap and cooldown.
- The P&L result compares the real settled amounts with Textile's indicative preview price and excludes gas. Quotes differ by about 0.5% from request to request, so one trade says little.
- The calculator's price is an indicative preview, and the minimum swap it shows is approximate. The real minimum is checked on the firm quote.
- The agent signs with a server-side wallet key. Use a dedicated wallet with a small balance.
- INDEC's open-data feed lags the press release, so the newest month it provides may be one month behind.
- Not financial advice. Textile response formats can change.

## Roadmap (planned, not built)

- A wallet-connect flow where users sign their own hedges. It would target wallets that hold wARS: Celo's MiniPay guide lists only USDm, USDC and USDT as the assets it holds, so a MiniPay version is not possible today.
- An unwind rule: convert back to wARS when inflation falls below a lower level (Textile quotes USDT to wARS; the indicative round trip costs about 0.04%).
- Additional corridors (wBRL, wMXN, wCOP), each with its own official inflation source.
- Non-custodial user vaults (these need a security review before holding user funds).
- Paid data access over x402, if a suitable data provider is found (the official INDEC feed is free).
