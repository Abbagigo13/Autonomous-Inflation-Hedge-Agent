export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type LogLevel = "info" | "success" | "warning" | "error";
export type LogEvent = { id: string; timestamp: string; message: string; level: LogLevel };

export async function getAgentConfig() {
  const response = await fetch(`${API_BASE}/api/config`);
  if (!response.ok) throw new Error(`Config request failed: ${response.status}`);
  return response.json() as Promise<{ agentAddress: string; chainId: number; rpcUrl: string; warsAddress: string; usdtAddress: string }>;
}

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
