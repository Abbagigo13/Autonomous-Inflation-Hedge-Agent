import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express, { type Response } from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ethers } from "ethers";
import { readPublicBalances, runAgentCycle } from "./src/agent.js";
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

const app = express();
app.use(cors({ origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/] }));
app.use(express.json());

const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });

// --- Hedge history, saved to data/history.json so it survives restarts ---
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
};

const HISTORY_FILE = path.resolve("data", "history.json");

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")) as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2));
}

let history = loadHistory();

// --- SSE live logs ---
let clients: Response[] = [];

app.get("/api/logs", (req, res) => {
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

// --- API endpoints ---

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

let running = false;

app.post("/api/run-agent", async (_req, res) => {
  if (running) {
    res.status(409).json({ error: "The agent is already running a cycle" });
    return;
  }
  running = true;
  try {
    sendLog("Manual override triggered. Waking agent...", "info");
    const result = await runAgentCycle((message, level) => {
      sendLog(message, level ?? "info");
    });
    const entry: HistoryEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...result,
      dryRun: DRY_RUN,
      sellAmount: HEDGE_SELL_AMOUNT
    };
    history = [...history, entry].slice(-200);
    saveHistory(history);
    res.json({ ok: true, status: result.reason ?? "done", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    sendLog(`Agent execution failed: ${message}`, "error");
    res.status(500).json({ error: message });
  } finally {
    running = false;
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});