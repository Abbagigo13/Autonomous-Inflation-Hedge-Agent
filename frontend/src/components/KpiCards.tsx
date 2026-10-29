import { CircleDollarSign, Gauge, Shield, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgent } from "@/context/AgentContext";
import { formatNumber } from "@/lib/api";

export function KpiCards() {
  const { isLoading, isExecuting, balanceUsdt, balanceWars, inflationRate, config, lastRun } = useAgent();
  const threshold = config?.threshold;
  const aboveTrigger = inflationRate !== null && threshold !== undefined && inflationRate >= threshold;

  let inflationNote = "Run the agent to read the latest INDEC figure";
  if (inflationRate !== null && threshold !== undefined) {
    inflationNote = `${aboveTrigger ? "At or above" : "Below"} the ${threshold}% trigger · source INDEC`;
  }

  const cards = [
    {
      label: "Total protected",
      value: isLoading ? null : `$${formatNumber(balanceUsdt, 2)}`,
      suffix: "USDT",
      icon: Shield,
      tone: "text-mint",
      note: "USDT held by the agent wallet"
    },
    {
      label: "Agent status",
      value: isLoading ? null : isExecuting ? "Executing" : "Standby",
      suffix: "",
      icon: Gauge,
      tone: isExecuting ? "text-amber" : "text-mint",
      note: isExecuting ? "Cycle in progress" : lastRun ? `Last run ${new Date(lastRun.timestamp).toLocaleString()}` : "No runs yet"
    },
    {
      label: "wARS unhedged",
      value: isLoading ? null : formatNumber(balanceWars, 2),
      suffix: "wARS",
      icon: CircleDollarSign,
      tone: "text-electric",
      note: "Balance not yet hedged"
    },
    {
      label: "Inflation · year over year",
      value: inflationRate === null ? "—" : `${inflationRate.toFixed(1)}%`,
      suffix: "Argentina",
      icon: TrendingUp,
      tone: aboveTrigger ? "text-amber" : "text-mint",
      note: inflationNote
    }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, suffix, icon: Icon, tone, note }) => (
        <Card key={label} className="relative overflow-hidden p-5">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/[.025] blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">{label}</div>
              {value === null ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className={"text-2xl font-semibold tracking-tight " + tone}>{value}</span>
                  {suffix && <span className="font-mono text-[10px] uppercase tracking-[.12em] text-slate-600">{suffix}</span>}
                </div>
              )}
              {value !== null && <div className="mt-3 text-xs text-slate-500">{note}</div>}
            </div>
            <div className={"grid h-9 w-9 place-items-center rounded-lg bg-white/[.04] " + tone}>
              <Icon size={17} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}