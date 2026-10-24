import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ethers } from "ethers";
import { API_BASE, getAgentConfig, requestAgentRun, type LogEvent } from "@/lib/api";

export type AgentContextValue = {
  isLoading: boolean;
  isExecuting: boolean;
  balanceUsdt: string;
  balanceWars: string;
  logs: LogEvent[];
  inflationRate: number;
  agentAddress: string;
  runAgent: () => Promise<void>;
  refreshBalances: () => Promise<void>;
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
  const [agentAddress, setAgentAddress] = useState(import.meta.env.VITE_AGENT_WALLET_ADDRESS ?? "");
  const [inflationRate, setInflationRate] = useState(8.4);

  const pushUiLog = useCallback((message: string, level: LogEvent["level"]) => {
    setLogs((current) => [...current, { id: `ui-${Date.now()}`, timestamp: new Date().toISOString(), message, level }].slice(-150));
  }, []);

  const refreshBalances = useCallback(async () => {
    setIsLoading(true);
    try {
      const config = await getAgentConfig();
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

  useEffect(() => { void refreshBalances(); }, [refreshBalances]);

  useEffect(() => {
    const events = new EventSource(`${API_BASE}/api/logs`);
    events.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data) as LogEvent;
        setLogs((current) => [...current, log].slice(-150));
        const match = log.message.match(/Inflation signal: ([\d.]+)%/);
        if (match) setInflationRate(Number(match[1]));
        if (/cycle requested|preparing protective/i.test(log.message)) setIsExecuting(true);
        if (/confirmed|blocked|failed|below threshold|not configured/i.test(log.message)) setIsExecuting(false);
      } catch {
        // Ignore malformed SSE frames; the connection remains useful for subsequent events.
      }
    };
    events.onerror = () => {
      // EventSource retries automatically; keep the stream open for transient outages.
    };
    return () => events.close();
  }, []);

  const runAgent = useCallback(async () => {
    setIsExecuting(true);
    try {
      await requestAgentRun();
    } catch (error) {
      setIsExecuting(false);
      pushUiLog(error instanceof Error ? error.message : "Unable to start agent", "error");
    }
  }, [pushUiLog]);

  const value = useMemo(() => ({ isLoading, isExecuting, balanceUsdt, balanceWars, logs, inflationRate, agentAddress, runAgent, refreshBalances }), [isLoading, isExecuting, balanceUsdt, balanceWars, logs, inflationRate, agentAddress, runAgent, refreshBalances]);
  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (!context) throw new Error("useAgent must be used inside AgentProvider");
  return context;
}
