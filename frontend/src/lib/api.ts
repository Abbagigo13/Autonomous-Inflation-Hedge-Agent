export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type LogLevel = "info" | "success" | "warning" | "error";
export type LogEvent = { id: string; timestamp: string; message: string; level: LogLevel };

export type HistoryEntry = {
  id: string;
  timestamp: string;
  inflationRate: number;
  hedgeTriggered: boolean;
  executed: boolean;
  txHash?: string;
  reason?: string;
  dryRun: boolean;
  sellAmount: string;
  source?: "manual" | "scheduled";
};

export type AgentConfig = {
  agentAddress: string;
  chainId: number;
  rpcUrl: string;
  warsAddress: string;
  usdtAddress: string;
  isDryRun: boolean;
  threshold: number;
  sellAmount: string;
  attributionTag: string;
};

export type Treasury = { address: string; wars: string; usdt: string; celo: string };

export type IdentityInfo = {
  address: string;
  registry: string;
  registered: boolean | null;
  attributionTag: string;
  capabilities: string[];
};

export type RouteInfo = {
  id: string;
  provider: string;
  method: string;
  sellToken: string;
  buyToken: string;
  sellTokenAddress: string;
  buyTokenAddress: string;
  chainId: number;
  sellAmount: string;
  threshold: number;
  mode: string;
};

export type TradePnl = {
  id: string;
  timestamp: string;
  txHash: string;
  soldWars: string | null;
  receivedUsdt: string | null;
  executedRate: number | null;
  currentUsdt: string | null;
  currentRate: number | null;
  resultUsdt: string | null;
  resultPct: number | null;
  note: string | null;
};

export type PnlSummary = {
  asOf: string;
  trades: TradePnl[];
  totals: { soldWars: string; receivedUsdt: string; resultUsdt: string | null };
};

export type SchedulerStatus = {
  active: boolean;
  mode: "dry-run" | "live";
  intervalMinutes: number;
  cooldownHours: number;
  maxDailySellWars: number;
  maxFailures: number;
  consecutiveFailures: number;
  nextRunAt: string | null;
  lastTickAt: string | null;
  lastDecision: string | null;
  pausedReason: string | null;
  accepted?: boolean;
};

async function getJson<T>(path: string, label: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`${label} request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

async function postJson<T>(path: string, label: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as { error?: string }).error ?? `${label} request failed: ${response.status}`);
  return payload as T;
}

export const getAgentConfig = () => getJson<AgentConfig>("/api/config", "Config");
export const getHistory = () => getJson<HistoryEntry[]>("/api/history", "History");
export const getTreasury = () => getJson<Treasury>("/api/treasury", "Treasury");
export const getIdentity = () => getJson<IdentityInfo>("/api/identity", "Identity");
export const getRoutes = () => getJson<RouteInfo[]>("/api/routes", "Routes");
export const getPnl = () => getJson<PnlSummary>("/api/pnl", "P&L");
export const getScheduler = () => getJson<SchedulerStatus>("/api/scheduler", "Scheduler");
export const pauseScheduler = () => postJson<SchedulerStatus>("/api/scheduler/pause", "Pause");
export const resumeScheduler = () => postJson<SchedulerStatus>("/api/scheduler/resume", "Resume");

export async function requestAgentRun() {
  return postJson<{ ok: boolean; status: string }>("/api/run-agent", "Agent");
}

export function compactAddress(address: string) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not configured";
}

export function formatNumber(value: string | number, maximumFractionDigits = 2) {
  const number = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(number);
}