import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runAgentCycle, getWallet, readPublicBalances } from "./src/agent.js";
import { AGENT_WALLET_ADDRESS } from "./src/config.js"; // Assuming config has this

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- SSE Live Logs ---
let clients: any[] = [];

app.get("/api/logs", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  clients.push(res);
  req.on("close", () => {
    clients = clients.filter((c) => c !== res);
  });
});

function sendLog(message: string, level: string = "info") {
  console.log(`[${level.toUpperCase()}] ${message}`);
  clients.forEach((client) => client.write(`data: ${JSON.stringify({ message, level, timestamp: new Date().toISOString() })}\n\n`));
}

// --- API ENDPOINTS ---

// 1. Config Endpoint (Fixes the /api/config 500 error)
app.get("/api/config", (req, res) => {
  const wallet = getWallet();
  res.json({
    network: "Celo Mainnet",
    chainId: 42220,
    agentAddress: wallet ? wallet.address : "Not Configured",
    isDryRun: process.env.DRY_RUN === "true",
    status: "Active"
  });
});

// 2. Balances Endpoint
app.get("/api/balances", async (req, res) => {
  try {
    const wallet = getWallet();
    if (!wallet) {
      return res.status(400).json({ error: "Wallet not configured" });
    }
    const balances = await readPublicBalances(wallet.address);
    res.json({
      address: wallet.address,
      wars: balances.wars,
      usdt: balances.usdt
    });
  } catch (error: any) {
    sendLog(`Failed to fetch balances: ${error.message}`, "error");
    res.status(500).json({ error: error.message });
  }
});

// 3. Run Agent Endpoint
app.post("/api/run-agent", async (req, res) => {
  try {
    sendLog("Manual override triggered. Waking agent...", "info");
    
    // Pass the SSE logger to the agent
    const result = await runAgentCycle((message, level) => {
      sendLog(message, level || "info");
    });
    
    res.json(result);
  } catch (error: any) {
    sendLog(`Agent execution failed: ${error.message}`, "error");
    res.status(500).json({ error: error.message });
  }
});

// 4. History Endpoint (Fixes the Hedge History page)
app.get("/api/history", (req, res) => {
  // For now, return an empty array so the page doesn't crash.
  // Later, you can read this from a database or CeloScan API.
  res.json([]);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});