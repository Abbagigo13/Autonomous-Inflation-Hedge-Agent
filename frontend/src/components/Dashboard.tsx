import { ExternalLink, FlaskConical, Play, Zap } from "lucide-react";
import { KpiCards } from "@/components/KpiCards";
import { HedgeChart } from "@/components/HedgeChart";
import { SmartInsights } from "@/components/SmartInsights";
import { AgentTerminal } from "@/components/AgentTerminal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAgent } from "@/context/AgentContext";

export function Dashboard() {
  const { isLoading, agentAddress, config } = useAgent();
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-mint">
            <span className="h-1.5 w-1.5 rounded-full bg-mint pulse-soft" />Inflation hedge agent
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">Treasury overview</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Your hedge agent reads the Argentina inflation signal and, when it crosses your trigger, swaps wARS for USDT on Celo Mainnet.
          </p>
        </div>
        {config && (
          <Badge tone={config.isDryRun ? "info" : "warning"}>
            {config.isDryRun ? <FlaskConical size={12} /> : <Zap size={12} />}
            {config.isDryRun ? "Dry run · nothing is sent" : "Live mode · swaps are sent"}
          </Badge>
        )}
      </div>
      <KpiCards />
      <div className="mt-5 flex flex-col gap-5 xl:flex-row">
        <HedgeChart />
        <SmartInsights />
      </div>
      <Card className="mt-5 flex flex-wrap items-center justify-between gap-4 border-mint/15 bg-mint/[.035] p-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-mint/10 text-mint"><Play size={16} /></div>
          <div>
            <div className="text-sm font-semibold text-slate-200">Runs when you start it</div>
            <div className="mt-0.5 text-xs text-slate-500">
              Click Run hedge agent. If inflation is at or above {config ? `${config.threshold}%` : "the trigger"}, the agent requests a Textile FX quote to sell wARS for USDT.
            </div>
          </div>
        </div>
        {agentAddress && (
          <a
            href={`https://celoscan.io/address/${agentAddress}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 font-mono text-[10px] text-slate-500 hover:text-mint"
          >
            {`${agentAddress.slice(0, 10)}…${agentAddress.slice(-6)}`}
            <ExternalLink size={13} />
          </a>
        )}
      </Card>
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