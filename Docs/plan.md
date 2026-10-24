# Autonomous Inflation Hedge Agent — Implementation Plan

## Scope

Build a runnable Celo Mainnet hedge-agent project with a Node.js/TypeScript backend and a React/Vite/TypeScript frontend. The agent monitors an Argentina inflation signal, requests a wARS→USDT quote through Textile FX, prepares a provider transaction with the `celo_09b7d0a51f16` attribution tag, and exposes live execution logs to a dashboard over Server-Sent Events.

The project deliberately keeps private-key operations server-side. The dashboard reads public token balances from Forno and can trigger the backend cycle, but it never receives the private key or Textile API key.

## Implementation approach

- Root TypeScript service: Express API, SSE client registry, Celo RPC helpers, Textile RFQ integration, ERC-8004 registration script, and environment validation.
- Frontend package: Vite build output served by the root Express process in production/preview. The frontend uses a provider/context boundary for on-chain balances and agent execution state, plus shadcn-style primitives built on Tailwind utility classes.
- Safe execution boundary: RFQ responses are normalized defensively; a transaction is sent only when a valid transaction object is returned and the agent wallet has enough native CELO for gas. Missing credentials, missing corridors, and insufficient funds become readable terminal events instead of uncaught process failures.
- Configuration: `.env.example` documents all secrets and public values. No secret is bundled into Vite output.
- Verification: install dependencies, run TypeScript checks, build the frontend, start the service, and smoke-test `/api/health`, `/api/config`, and `/manus-routes.json`.

## Project structure

- `server.ts` — Express entrypoint, static frontend serving, SSE registry, and agent trigger endpoint.
- `src/agent.ts` — inflation signal, balances, Textile RFQ request, attribution-tagged transaction execution, and cycle orchestration.
- `src/register-identity.ts` — one-shot ERC-8004 `register(string)` script.
- `src/config.ts` — validated environment constants and network addresses.
- `src/types.ts` — backend domain types.
- `frontend/src/context/AgentContext.tsx` — Forno provider, ERC-20 balance reads, SSE connection, and trigger state.
- `frontend/src/components` — dashboard shell, KPI cards, chart, insights, and live terminal.
- `frontend/src/components/ui` — small shadcn-compatible primitives used by the dashboard.
- `frontend/src/lib` — formatting, class merging, and API helpers.
- `README.md`, `hackathon.md`, `PRD.md`, `architecture.md`, `security.md`, `design_system.md`, `code_style.md`, `testing.md`, `agents.md` — handoff and judging documentation.

## Design direction

Three possible directions were considered: **Terminal Observatory** (0.07), a data-dense control room with neon signal lines; **Carbon Treasury** (0.06), an institutional dark finance console with luminous reserve accents; **Atlas Afterdark** (0.04), a map-like macro dashboard with electric route lines. The chosen direction is **Terminal Observatory**.

### Design movement

A restrained cyber-finance control room: high-contrast black surfaces, hairline borders, mono readouts, and sparse signal-green accents that make every action feel intentional.

### Core principles

1. Signal over decoration: every glow, dot, and label indicates state or risk.
2. Institutional clarity: dense data is grouped into calm panels with clear hierarchy.
3. Visible autonomy: the terminal and status chips make the agent’s reasoning observable.
4. Fast scanning: KPIs, chart, insights, and logs are readable in a single vertical sweep.

### Color philosophy

Near-black graphite and slate create a trustworthy treasury canvas. Acid mint represents protection and successful settlement; electric blue represents network activity and quote flow; amber is reserved for inflation risk and attention.

### Layout paradigm

A fixed navigation rail anchors the left edge. The main workspace is an asymmetric stack: the primary hedge chart occupies the largest area, while concise insights and system status orbit it. The terminal is deliberately full-width at the bottom to reinforce observability.

### Signature elements

- A compact wordmark built from a bracketed “A” glyph and the `HEDGE//AGENT` label.
- Thin green “signal” rules under active labels and a pulsing status dot.
- Terminal log rows with timestamps, event tags, and monospace output.

### Interaction and animation

Buttons use short 160ms color/translate transitions. Loading uses a diagonal shimmer rather than a spinner. Live log rows enter with a subtle upward fade; the status dot pulses only while executing. Avoid continuous decorative motion.

### Typography

Use Inter for display and body copy, and JetBrains Mono for token values, timestamps, addresses, and terminal output. Headlines are compact and sentence case; labels are uppercase with tracking for scanning.

### Brand

**Inflation protection that moves at machine speed.** Personality: vigilant, precise, calm. CTAs say “Run hedge agent” and “Inspect execution trail,” never generic “Get started.” The mark is a bracketed A / rising shield monogram. Signature color: `#B8FF6A` acid mint.
