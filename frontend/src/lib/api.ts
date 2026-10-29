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

async function getJson<T>(path: string, label: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`${label} request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export const getAgentConfig = () => getJson<AgentConfig>("/api/config", "Config");
export const getHistory = () => getJson<HistoryEntry[]>("/api/history", "History");
export const getTreasury = () => getJson<Treasury>("/api/treasury", "Treasury");
export const getIdentity = () => getJson<IdentityInfo>("/api/identity", "Identity");
export const getRoutes = () => getJson<RouteInfo[]>("/api/routes", "Routes");

export async function requestAgentRun() {
  const response = await fetch(`${API_BASE}/api/run-agent`, { method: "POST", headers: { "Content-Type": "application/json" } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `Agent request failed: ${response.status}`);
  return payload as { ok: boolean; status: string };
}

export function compactAddress(address: string) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not configured";
}

export function formatNumber(value: string | number, maximumFractionDigits = 2) {
  const number = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(number);
}