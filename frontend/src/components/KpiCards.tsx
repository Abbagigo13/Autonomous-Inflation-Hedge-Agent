import { ArrowUpRight, CircleDollarSign, Gauge, Shield, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgent } from "@/context/AgentContext";
import { formatNumber } from "@/lib/api";

export function KpiCards() {
  const { isLoading, isExecuting, balanceUsdt, balanceWars, inflationRate } = useAgent();
  const protectedValue = Number(balanceUsdt) || 0;
  const allocation = protectedValue + (Number(balanceWars) || 0);
  const cards = [
    { label: "Total protected", value: isLoading ? null : `$${formatNumber(protectedValue, 2)}`, suffix: "USDT", icon: Shield, tone: "text-mint", note: "+12.8% this month" },
    { label: "Agent status", value: isLoading ? null : (isExecuting ? "Executing" : "Standby"), suffix: "", icon: Gauge, tone: isExecuting ? "text-amber" : "text-mint", note: isExecuting ? "Cycle in progress" : "Watching signal" },
    { label: "Asset allocation", value: isLoading ? null : `${formatNumber(allocation ? protectedValue / allocation * 100 : 0, 1)}%`, suffix: "hedged", icon: CircleDollarSign, tone: "text-electric", note: `${formatNumber(Number(balanceWars), 2)} wARS unhedged` },
    { label: "Inflation rate", value: `${inflationRate.toFixed(1)}%`, suffix: "Argentina", icon: TrendingUp, tone: "text-amber", note: "Above 5.0% trigger" }
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, suffix, icon: Icon, tone, note }) => <Card key={label} className="relative overflow-hidden p-5"><div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/[.025] blur-2xl" /><div className="relative flex items-start justify-between"><div><div className="mb-3 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">{label}</div>{value === null ? <Skeleton className="h-8 w-28" /> : <div className="flex items-baseline gap-1.5"><span className={"text-2xl font-semibold tracking-tight " + tone}>{value}</span>{suffix && <span className="font-mono text-[10px] uppercase tracking-[.12em] text-slate-600">{suffix}</span>}</div>}{value !== null && <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><ArrowUpRight size={13} className={tone} />{note}</div>}</div><div className={"grid h-9 w-9 place-items-center rounded-lg bg-white/[.04] " + tone}><Icon size={17} /></div></div></Card>)}</div>;
}
