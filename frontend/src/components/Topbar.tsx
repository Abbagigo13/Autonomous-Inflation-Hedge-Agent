import { Bell, ChevronDown, Command, Play, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgent } from "@/context/AgentContext";
import { compactAddress } from "@/lib/api";

export function Topbar() {
  const { runAgent, isExecuting, agentAddress } = useAgent();
  return <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.07] px-5 py-4 sm:px-8 lg:px-10">
    <div className="flex items-center gap-3"><div className="text-[11px] font-semibold uppercase tracking-[.18em] text-slate-500">Treasury control</div><span className="text-slate-700">/</span><div className="text-sm text-slate-300">Overview</div></div>
    <div className="flex items-center gap-2.5"><div className="hidden items-center gap-2 rounded-lg border border-white/[.07] bg-white/[.025] px-3 py-2 text-xs text-slate-400 sm:flex"><Command size={13} className="text-slate-600" /><span>⌘ K</span></div><button className="grid h-9 w-9 place-items-center rounded-lg border border-white/[.07] text-slate-500 hover:bg-white/[.04] hover:text-white"><Bell size={15} /></button><Button onClick={() => void runAgent()} disabled={isExecuting}><Play size={14} fill="currentColor" />{isExecuting ? "Running…" : "Run hedge agent"}</Button><div className="hidden h-9 items-center gap-2 rounded-lg border border-white/[.07] bg-white/[.025] px-2.5 sm:flex"><div className="grid h-6 w-6 place-items-center rounded-md bg-electric/10 text-electric"><ShieldCheck size={14} /></div><span className="font-mono text-[11px] text-slate-400">{compactAddress(agentAddress)}</span><ChevronDown size={13} className="text-slate-600" /></div></div>
  </header>;
}
