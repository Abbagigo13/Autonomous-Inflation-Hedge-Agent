import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express, { type Request, type Response } from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { ethers } from "ethers";
import { readPublicBalances, runAgentCycle } from "./src/agent.js";
import { computePnl, type PnlSummary } from "./src/pnl.js";
import { createScheduler } from "./src/scheduler.js";
import {
  ATTRIBUTION_TAG,
  CHAIN_ID,
  DRY_RUN,
  ERC8004_REGISTRY,
  HEDGE_SELL_AMOUNT,
  HEDGE_THRESHOLD,
  PORT,
  RPC_URL,
  USDT_ADDRESS,
  WARS_ADDRESS,
  getAgentAddress
} from "./src/config.js";

// --- Settings for running the server in public (all optional) ---
function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

// Master switch for real transactions started from the web. Off unless you turn it on.
const LIVE_ENABLED = process.env.LIVE_ENABLED?.trim().toLowerCase() === "true";
// Secret for operator-only actions (pause/resume the scheduler, live swaps without a demo code).
const OPERATOR_TOKEN = process.env.OPERATOR_TOKEN?.trim() || "";
// Secret you give to judges so they can trigger a live swap.
const DEMO_CODE = process.env.DEMO_CODE?.trim() || "";
const SIMULATION_COOLDOWN_SECONDS = envNumber("PUBLIC_SIMULATION_COOLDOWN_SECONDS", 20);
const PUBLIC_LIVE_COOLDOWN_MINUTES = envNumber("PUBLIC_LIVE_COOLDOWN_MINUTES", 30);
const MAX_PUBLIC_LIVE_SWAPS = envNumber("MAX_PUBLIC_LIVE_SWAPS", 5);
const MAX_LOG_CLIENTS = 200;
const EXTRA_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const app = express();
app.set("trust proxy", 1);
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = !origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) || EXTRA_ORIGINS.includes(origin);
      callback(null, allowed);
    }
  })
);
app.use(express.json());

const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Operator = you. With a token set, only requests carrying it count. Without one, only requests made on this same computer. */
function isOperator(req: Request): boolean {
  if (OPERATOR_TOKEN) {
    const provided = req.header("x-operator-token");
    return typeof provided === "string" && safeEqual(provided, OPERATOR_TOKEN);
  }
  const address = req.socket.remoteAddress ?? "";
  const loopback = address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
  return loopback && !req.header("x-forwarded-for");
}

// --- Hedge history, saved to a file so it survives restarts ---
type RunSource = "manual" | "scheduled" | "public";

type HistoryEntry = {
  id: string;
  timestamp: string;
  inflationRate: number;
  hedgeTriggered: boolean;
  executed: boolean;
  txHash?: string;
  reason?: string;
  dryRun: boolean;
  sellAmount: string;
  source?: RunSource; // older saved runs do not have this
  whatIfThreshold?: number;
};

// Where the history lives. On a host with a volume, point HISTORY_FILE (or mount the volume at /app/data).
const HISTORY_FILE = path.resolve(process.env.HISTORY_FILE?.trim() || path.join("data", "history.json"));
// A committed copy of the real executed hedges. It is merged in on every start, so real swaps can never go missing.
const SEED_FILE = path.resolve("seed", "history.seed.json");

function readJsonArray(file: string): HistoryEntry[] | null {
  try {
    const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""); // tolerate a byte-order mark
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : null;
  } catch {
    return null;
  }
}

function loadHistory(): HistoryEntry[] {
  const saved = readJsonArray(HISTORY_FILE) ?? [];
  const seed = readJsonArray(SEED_FILE) ?? [];
  const known = new Set(saved.map((entry) => entry.id));
  return [...saved, ...seed.filter((entry) => !known.has(entry.id))];
}

/** Keeps every executed hedge forever and only the newest 200 other runs, so spam cannot push real hedges out. */
function trimHistory(entries: HistoryEntry[]): HistoryEntry[] {
  const executed = entries.filter((entry) => entry.executed);
  const others = entries.filter((entry) => !entry.executed).slice(-200);
  return [...executed, ...others].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function saveHistory(entries: HistoryEntry[]) {
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2));
}

let history = trimHistory(loadHistory());

// The P&L needs network calls, so the last answer is kept for a minute.
let pnlCache: { at: number; value: PnlSummary } | null = null;

// --- SSE live logs (shared: every visitor sees every run) ---
let clients: Response[] = [];

app.get("/api/logs", (req, res) => {
  if (clients.length >= MAX_LOG_CLIENTS) {
    res.status(503).json({ error: "Too many open log streams" });
    return;
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(": connected\n\n");
  clients.push(res);
  req.on("close", () => {
    clients = clients.filter((c) => c !== res);
  });
});

// Keeps the connection alive so the browser does not drop it
setInterval(() => {
  clients.forEach((client) => client.write(": ping\n\n"));
}, 25_000);

function sendLog(message: string, level: string = "info") {
  console.log(`[${level.toUpperCase()}] ${message}`);
  const payload = JSON.stringify({ id: randomUUID(), message, level, timestamp: new Date().toISOString() });
  clients.forEach((client) => client.write(`data: ${payload}\n\n`));
}

// --- Running the agent (shared by the button, visitors and the scheduler) ---
let running = false;

type RunRequest = { mode?: "simulate" | "live"; demoCode?: string; thresholdOverride?: number };
type RunSettings = { dryRun: boolean; thresholdOverride?: number };

async function executeRun(source: RunSource, settings: RunSettings) {
  const result = await runAgentCycle((message, level) => sendLog(message, level ?? "info"), {
    dryRun: settings.dryRun,
    thresholdOverride: settings.thresholdOverride
  });
  const whatIf = settings.dryRun && settings.thresholdOverride !== undefined;
  const entry: HistoryEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...result,
    dryRun: settings.dryRun,
    sellAmount: HEDGE_SELL_AMOUNT,
    source,
    ...(whatIf ? { whatIfThreshold: settings.thresholdOverride } : {})
  };
  history = trimHistory([...history, entry]);
  saveHistory(history);
  pnlCache = null;
  return result;
}

/** Why a live swap is not allowed right now, or null if it is. The caps apply to visitors, not to you. */
function liveDenied(req: Request, body: RunRequest): string | null {
  if (!LIVE_ENABLED) return "live swaps are switched off on this server (LIVE_ENABLED is not true)";
  if (isOperator(req)) return null;

  const code = typeof body.demoCode === "string" ? body.demoCode : "";
  if (!DEMO_CODE || !code || !safeEqual(code, DEMO_CODE)) return "a valid demo code is required for a live swap";

  const liveHedges = history.filter((entry) => entry.executed && !entry.dryRun);
  const used = liveHedges.filter((entry) => entry.source === "public").length;
  if (used >= MAX_PUBLIC_LIVE_SWAPS) return `the limit of ${MAX_PUBLIC_LIVE_SWAPS} live demo swaps has been reached`;

  if (liveHedges.length > 0) {
    const latest = Math.max(...liveHedges.map((entry) => Date.parse(entry.timestamp)));
    const waitMs = latest + PUBLIC_LIVE_COOLDOWN_MINUTES * 60_000 - Date.now();
    if (waitMs > 0) return `a live swap happened recently; please wait ${Math.ceil(waitMs / 60_000)} more minutes`;
  }
  return null;
}

// Simple per-visitor spacing between runs
const lastRunByIp = new Map<string, number>();
function secondsUntilAllowed(ip: string): number {
  const last = lastRunByIp.get(ip);
  if (last === undefined) return 0;
  return Math.max(0, Math.ceil((last + SIMULATION_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000));
}

const scheduler = createScheduler({
  log: sendLog,
  runCycle: async () => {
    if (running) return null;
    if (!DRY_RUN && !LIVE_ENABLED) throw new Error("LIVE_ENABLED is not true, so live scheduled runs are switched off");
    running = true;
    try {
      sendLog("Scheduled run · waking agent...", "info");
      const result = await executeRun("scheduled", { dryRun: DRY_RUN });
      return { reason: result.reason };
    } finally {
      running = false;
    }
  },
  executedHedges: () =>
    history.filter((entry) => entry.executed && !entry.dryRun).map((entry) => ({ timestamp: entry.timestamp, sellAmount: entry.sellAmount })),
  warsBalance: async () => {
    const address = getAgentAddress();
    if (!address) throw new Error("Wallet not configured");
    return Number((await readPublicBalances(address)).wars);
  }
});

// --- API endpoints ---

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/api/config", (_req, res) => {
  res.json({
    network: "Celo Mainnet",
    chainId: CHAIN_ID,
    rpcUrl: RPC_URL,
    warsAddress: WARS_ADDRESS,
    usdtAddress: USDT_ADDRESS,
    agentAddress: getAgentAddress(),
    isDryRun: DRY_RUN,
    threshold: HEDGE_THRESHOLD,
    sellAmount: HEDGE_SELL_AMOUNT,
    attributionTag: ATTRIBUTION_TAG
  });
});

/** What the current visitor is allowed to do; the dashboard uses this to show or hide controls. */
app.get("/api/capabilities", (req, res) => {
  const liveHedges = history.filter((entry) => entry.executed && !entry.dryRun);
  res.json({
    operator: isOperator(req),
    liveEnabled: LIVE_ENABLED,
    demoCodeRequired: Boolean(DEMO_CODE),
    defaultMode: DRY_RUN ? "simulate" : "live",
    simulationCooldownSeconds: SIMULATION_COOLDOWN_SECONDS,
    liveCooldownMinutes: PUBLIC_LIVE_COOLDOWN_MINUTES,
    maxPublicLiveSwaps: MAX_PUBLIC_LIVE_SWAPS,
    publicLiveSwapsUsed: liveHedges.filter((entry) => entry.source === "public").length
  });
});

async function readTreasury() {
  const address = getAgentAddress();
  if (!address) return null;
  const [balances, celoRaw] = await Promise.all([readPublicBalances(address), provider.getBalance(address)]);
  return { address, wars: balances.wars, usdt: balances.usdt, celo: ethers.formatEther(celoRaw) };
}

app.get("/api/treasury", async (_req, res) => {
  try {
    const treasury = await readTreasury();
    if (!treasury) {
      res.status(400).json({ error: "Wallet not configured" });
      return;
    }
    res.json(treasury);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    sendLog(`Failed to read treasury: ${message}`, "error");
    res.status(500).json({ error: message });
  }
});

// Kept for compatibility with the README
app.get("/api/balances", async (_req, res) => {
  try {
    const treasury = await readTreasury();
    if (!treasury) {
      res.status(400).json({ error: "Wallet not configured" });
      return;
    }
    res.json({ address: treasury.address, wars: treasury.wars, usdt: treasury.usdt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/identity", async (_req, res) => {
  const address = getAgentAddress();
  let registered: boolean | null = null; // null means "could not check"
  if (address) {
    try {
      const registry = new ethers.Contract(
        ERC8004_REGISTRY,
        ["function balanceOf(address owner) view returns (uint256)"],
        provider
      );
      const count = (await registry.balanceOf(address)) as bigint;
      registered = count > 0n;
    } catch {
      registered = null;
    }
  }
  res.json({
    address,
    registry: ERC8004_REGISTRY,
    registered,
    attributionTag: ATTRIBUTION_TAG,
    capabilities: ["inflation-monitoring", "textile-fx-rfq", "wars-usdt-hedging", "sse-observability"]
  });
});

app.get("/api/routes", (_req, res) => {
  res.json([
    {
      id: "textile-wars-usdt",
      provider: "Textile FX",
      method: "RFQ",
      sellToken: "wARS",
      buyToken: "USDT",
      sellTokenAddress: WARS_ADDRESS,
      buyTokenAddress: USDT_ADDRESS,
      chainId: CHAIN_ID,
      sellAmount: HEDGE_SELL_AMOUNT,
      threshold: HEDGE_THRESHOLD,
      mode: DRY_RUN ? "dry-run" : "live"
    }
  ]);
});

app.get("/api/history", (_req, res) => {
  res.json([...history].reverse()); // newest first
});

app.get("/api/pnl", async (_req, res) => {
  try {
    if (pnlCache && Date.now() - pnlCache.at < 60_000) {
      res.json(pnlCache.value);
      return;
    }
    const value = await computePnl([...history].reverse()); // newest first
    pnlCache = { at: Date.now(), value };
    res.json(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/scheduler", (_req, res) => {
  res.json(scheduler.status());
});

app.post("/api/scheduler/pause", (req, res) => {
  if (!isOperator(req)) {
    res.status(403).json({ error: "Operator access is required to pause the scheduler" });
    return;
  }
  scheduler.pause();
  res.json(scheduler.status());
});

app.post("/api/scheduler/resume", (req, res) => {
  if (!isOperator(req)) {
    res.status(403).json({ error: "Operator access is required to resume the scheduler" });
    return;
  }
  const accepted = scheduler.resume();
  res.json({ ...scheduler.status(), accepted });
});

app.post("/api/run-agent", async (req, res) => {
  const body = (req.body ?? {}) as RunRequest;
  const operator = isOperator(req);
  // No mode given: the DRY_RUN setting in .env decides (the old behaviour).
  const dryRun = body.mode === "live" ? false : body.mode === "simulate" ? true : DRY_RUN;

  if (!dryRun) {
    const denied = liveDenied(req, body);
    if (denied) {
      res.status(403).json({ error: `Live swap not allowed: ${denied}` });
      return;
    }
  }

  let thresholdOverride: number | undefined;
  if (dryRun && body.thresholdOverride !== undefined) {
    const value = Number(body.thresholdOverride);
    if (!Number.isFinite(value) || value < 0 || value > 1000) {
      res.status(400).json({ error: "thresholdOverride must be a number between 0 and 1000" });
      return;
    }
    thresholdOverride = value;
  }

  const visitor = req.ip ?? "unknown";
  if (!operator) {
    const wait = secondsUntilAllowed(visitor);
    if (wait > 0) {
      res.status(429).json({ error: `Please wait ${wait} seconds before running again` });
      return;
    }
  }

  if (running) {
    res.status(409).json({ error: "The agent is already running a cycle" });
    return;
  }
  running = true;
  if (!operator) lastRunByIp.set(visitor, Date.now());

  try {
    sendLog(operator ? "Manual run requested. Waking agent..." : "Visitor run requested. Waking agent...", "info");
    const result = await executeRun(operator ? "manual" : "public", { dryRun, thresholdOverride });
    res.json({ ok: true, status: result.reason ?? "done", dryRun, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    sendLog(`Agent execution failed: ${message}`, "error");
    res.status(500).json({ error: message });
  } finally {
    running = false;
  }
});

// Serves the built dashboard when it exists (used when everything runs as one public service)
const frontendDist = path.resolve("frontend", "dist");
if (fs.existsSync(frontendDist)) app.use(express.static(frontendDist));

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  if (process.env.SCHEDULER_ENABLED?.trim().toLowerCase() === "true") scheduler.resume();
});