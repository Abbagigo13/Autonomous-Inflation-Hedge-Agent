import { ArrowUpRight, CircleAlert, Gauge, GitBranch, Lightbulb, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAgent } from "@/context/AgentContext";

export function SmartInsights() {
  const { inflationRate, isExecuting } = useAgent();
  const insights = [
    { icon: CircleAlert, tone: "text-amber", title: "Inflation trigger is active", detail: `Argentina signal at ${inflationRate.toFixed(1)}% — above the 5.0% policy threshold.`, badge: "Actionable" },
    { icon: GitBranch, tone: "text-electric", title: "Textile FX corridor ready", detail: "wARS → USDT route is configured for Celo Mainnet RFQs.", badge: "Connected" },
    { icon: ShieldCheck, tone: "text-mint", title: "Identity posture verified", detail: "ERC-8004 registration metadata carries the agent capability set.", badge: "Verified" }
  ];
  return <Card className="w-full xl:w-[330px] xl:shrink-0"><CardHeader><div><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500"><Lightbulb size={13} className="text-amber" />Signal intelligence</div><CardTitle className="text-base">Smart insights</CardTitle></div><button className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-500 hover:text-white"><ArrowUpRight size={15} /></button></CardHeader><CardContent className="space-y-3">{insights.map(({ icon: Icon, tone, title, detail, badge }) => <div key={title} className="rounded-xl border border-white/[.07] bg-black/10 p-3.5"><div className="mb-2 flex items-start justify-between gap-3"><Icon size={16} className={tone} /><Badge tone={tone === "text-mint" ? "success" : tone === "text-amber" ? "warning" : "info"}>{badge}</Badge></div><div className="text-xs font-semibold text-slate-200">{title}</div><p className="mt-1.5 text-[11px] leading-5 text-slate-500">{detail}</p></div>)}<div className="mt-1 flex items-center gap-2 border-t border-white/[.07] pt-3 text-[11px] text-slate-600"><Gauge size={13} className={isExecuting ? "text-amber" : "text-mint"} />Policy engine {isExecuting ? "executing" : "monitoring"}</div></CardContent></Card>;
}
