# Delivery TODO

## Backend execution layer

- [ ] Implement `src/agent.ts` with `dns.setServers(['8.8.8.8', '1.1.1.1'])` at the top, a mock `getInflationRate()`, Textile FX `POST /rfq/request` integration, exact chain/token/taker/sellAmount payload fields, attribution tag injection into returned transaction data, and readable handling for insufficient funds and no RFQ corridor.
- [ ] Export `runAgentCycle(logFunction)` so the server can provide a live logger; keep the private key and Textile credential server-side.
- [ ] Implement `src/register-identity.ts` to base64-encode agent metadata as a `data:application/json;base64` URI and call ERC-8004 `register(string agentURI)` on Celo Mainnet.
- [ ] Implement `server.ts` on port 3000 with `GET /api/logs` SSE, `POST /api/run-agent`, `GET /api/health`, `GET /api/config`, and static frontend serving.

## Dashboard experience

- [ ] Implement `AgentContext.tsx` using `ethers.JsonRpcProvider('https://forno.celo.org')`, ERC-20 `balanceOf` reads for wARS and USDT, `isLoading`, `isExecuting`, `balanceUsdt`, `balanceWars`, `logs`, and `runAgent`.
- [ ] Consume backend `/api/logs` through `EventSource` and retain a readable capped log history.
- [ ] Build the dark premium dashboard with sidebar, topbar action, four KPI cards, area chart comparing hedged USDT and unhedged wARS, Smart Insights, and auto-scrolling green Live Terminal.
- [ ] Show a shimmering skeleton loader while public balance data is loading; ensure responsive layouts for narrow screens.

## Documentation and handoff

- [ ] Include root and frontend `package.json`, `.env.example`, Vite/Tailwind configuration, route manifest, and runnable scripts.
- [ ] Write detailed `README.md`, `hackathon.md`, `PRD.md`, `architecture.md`, `security.md`, `design_system.md`, `code_style.md`, `testing.md`, and `agents.md`.
- [ ] Run install, typecheck, frontend build, and HTTP smoke tests; package the complete source tree as a ZIP.
