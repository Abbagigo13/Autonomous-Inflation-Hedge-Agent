import { FlaskConical, Zap } from "lucide-react";
import { KpiCards } from "@/components/KpiCards";
import { HedgeChart } from "@/components/HedgeChart";
import { SmartInsights } from "@/components/SmartInsights";
import { RunPanel } from "@/components/RunPanel";
import { SchedulerCard } from "@/components/SchedulerCard";
import { AgentTerminal } from "@/components/AgentTerminal";
import { Badge } from "@/components/ui/badge";
import { useAgent } from "@/context/AgentContext";

export function Dashboard() {
  const { isLoading, config } = useAgent();
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-mint">
            <span className="h-1.5 w-1.5 rounded-full bg-mint pulse-soft" />Inflation hedge agent
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">Treasury overview</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Your hedge agent reads the Argentina inflation signal and, when it crosses your trigger, swaps wARS for USDT on Celo Mainnet. It can run on a schedule or on demand.
          </p>
        </div>
        {config && (
          <Badge tone={config.isDryRun ? "info" : "warning"}>
            {config.isDryRun ? <FlaskConical size={12} /> : <Zap size={12} />}
            {config.isDryRun ? "Dry run · nothing is sent" : "Live mode · swaps are sent"}
          </Badge>
        )}
      </div>
      <RunPanel />
      <div className="mt-5">
        <KpiCards />
      </div>
      <div className="mt-5 flex flex-col gap-5 xl:flex-row">
        <HedgeChart />
        <SmartInsights />
      </div>
      <div className="mt-5">
        <SchedulerCard />
      </div>
      <div className="mb-3 mt-7 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">Observability</div>
          <div className="mt-1 text-lg font-semibold text-white">Agent terminal</div>
        </div>
        <div className="font-mono text-[10px] text-slate-600">{isLoading ? "SYNCING BALANCES" : "BALANCES SYNCED"}</div>
      </div>
      <AgentTerminal />
    </>
  );
}