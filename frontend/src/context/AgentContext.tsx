import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ethers } from "ethers";
import {
  API_BASE,
  getAgentConfig,
  getCapabilities,
  getHistory,
  requestAgentRun,
  type AgentConfig,
  type Capabilities,
  type HistoryEntry,
  type LogEvent,
  type RunOptions,
  type RunResult
} from "@/lib/api";

export type RunOutcome = {
  at: string;
  trigger: number | null; // the what-if trigger used, if any
  result?: RunResult;
  error?: string;
};

export type AgentContextValue = {
  isLoading: boolean;
  isExecuting: boolean;
  balanceUsdt: string;
  balanceWars: string;
  logs: LogEvent[];
  config: AgentConfig | null;
  capabilities: Capabilities | null;
  lastRun: HistoryEntry | null;
  lastOutcome: RunOutcome | null;
  inflationRate: number | null;
  streamConnected: boolean;
  agentAddress: string;
  runCount: number;
  runAgent: (options?: RunOptions) => Promise<RunResult | null>;
  refreshBalances: () => Promise<void>;
  refreshCapabilities: () => Promise<Capabilities | null>;
};

const AgentContext = createContext<AgentContextValue | null>(null);
const FALLBACK_WARS = "0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d";
const FALLBACK_USDT = "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e";
const RPC_URL = "https://forno.celo.org";
const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];

export function AgentProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [balanceUsdt, setBalanceUsdt] = useState("0");
  const [balanceWars, setBalanceWars] = useState("0");
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [lastRun, setLastRun] = useState<HistoryEntry | null>(null);
  const [lastOutcome, setLastOutcome] = useState<RunOutcome | null>(null);
  const [streamConnected, setStreamConnected] = useState(false);
  const [agentAddress, setAgentAddress] = useState(import.meta.env.VITE_AGENT_WALLET_ADDRESS ?? "");
  const [runCount, setRunCount] = useState(0);

  const pushUiLog = useCallback((message: string, level: LogEvent["level"]) => {
    const id = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setLogs((current) => [...current, { id, timestamp: new Date().toISOString(), message, level }].slice(-150));
  }, []);

  const refreshLastRun = useCallback(async () => {
    try {
      const entries = await getHistory();
      setLastRun(entries[0] ?? null);
    } catch {
      // The backend may be offline; keep whatever we already know.
    }
  }, []);

  const refreshCapabilities = useCallback(async () => {
    try {
      const value = await getCapabilities();
      setCapabilities(value);
      return value;
    } catch {
      return null;
    }
  }, []);

  const refreshBalances = useCallback(async () => {
    try {
      const config = await getAgentConfig();
      setAgentConfig(config);
      const address = import.meta.env.VITE_AGENT_WALLET_ADDRESS || config.agentAddress;
      setAgentAddress((current) => current || config.agentAddress);
      if (!address || !ethers.isAddress(address)) return;
      const provider = new ethers.JsonRpcProvider(config.rpcUrl || RPC_URL, config.chainId || 42220, { staticNetwork: true });
      const wars = new ethers.Contract(config.warsAddress || FALLBACK_WARS, ERC20_ABI, provider);
      const usdt = new ethers.Contract(config.usdtAddress || FALLBACK_USDT, ERC20_ABI, provider);
      const [warsRaw, usdtRaw] = await Promise.all([wars.balanceOf(address), usdt.balanceOf(address)]);
      setBalanceWars(ethers.formatUnits(warsRaw, 18));
      setBalanceUsdt(ethers.formatUnits(usdtRaw, 6));
    } catch (error) {
      pushUiLog(error instanceof Error ? `Balance refresh unavailable: ${error.message}` : "Balance refresh unavailable", "warning");
    } finally {
      setIsLoading(false);
    }
  }, [pushUiLog]);

  useEffect(() => {
    void refreshBalances();
    void refreshLastRun();
    void refreshCapabilities();
  }, [refreshBalances, refreshLastRun, refreshCapabilities]);

  useEffect(() => {
    const events = new EventSource(`${API_BASE}/api/logs`);
    events.onopen = () => setStreamConnected(true);
    events.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data) as LogEvent;
        setLogs((current) => [...current, log].slice(-150));
      } catch {
        // Ignore malformed SSE frames; the connection remains useful for subsequent events.
      }
    };
    events.onerror = () => {
      // EventSource retries automatically; show the connection as down until it recovers.
      setStreamConnected(false);
    };
    return () => events.close();
  }, []);

  const runAgent = useCallback(
    async (options?: RunOptions) => {
      setIsExecuting(true);
      const trigger = options?.mode !== "live" && options?.thresholdOverride !== undefined ? options.thresholdOverride : null;
      try {
        const result = await requestAgentRun(options);
        setLastOutcome({ at: new Date().toISOString(), trigger, result });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to start agent";
        setLastOutcome({ at: new Date().toISOString(), trigger, error: message });
        pushUiLog(message, "error");
        return null;
      } finally {
        setIsExecuting(false);
        setRunCount((count) => count + 1);
        void refreshBalances();
        void refreshLastRun();
        void refreshCapabilities();
      }
    },
    [pushUiLog, refreshBalances, refreshLastRun, refreshCapabilities]
  );

  const inflationRate = lastRun ? lastRun.inflationRate : null;

  const value = useMemo(
    () => ({
      isLoading,
      isExecuting,
      balanceUsdt,
      balanceWars,
      logs,
      config: agentConfig,
      capabilities,
      lastRun,
      lastOutcome,
      inflationRate,
      streamConnected,
      agentAddress,
      runCount,
      runAgent,
      refreshBalances,
      refreshCapabilities
    }),
    [isLoading, isExecuting, balanceUsdt, balanceWars, logs, agentConfig, capabilities, lastRun, lastOutcome, inflationRate, streamConnected, agentAddress, runCount, runAgent, refreshBalances, refreshCapabilities]
  );
  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (!context) throw new Error("useAgent must be used inside AgentProvider");
  return context;
}