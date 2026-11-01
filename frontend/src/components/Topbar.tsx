import { ExternalLink, Play, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgent } from "@/context/AgentContext";
import { compactAddress } from "@/lib/api";

export function Topbar({ title }: { title: string }) {
  const { isExecuting, agentAddress } = useAgent();

  // One place to run the agent: the "Try the agent" panel on the Overview page.
  const goToPanel = () => {
    if (window.location.hash !== "#overview") window.location.hash = "overview";
    setTimeout(() => document.getElementById("try-agent")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.07] px-5 py-4 sm:px-8 lg:px-10">
      <div className="flex items-center gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-slate-500">Treasury control</div>
        <span className="text-slate-700">/</span>
        <div className="text-sm text-slate-300">{title}</div>
      </div>
      <div className="flex items-center gap-2.5">
        <Button onClick={goToPanel}>
          <Play size={14} fill="currentColor" />
          {isExecuting ? "Running…" : "Try the agent"}
        </Button>
        {agentAddress ? (
          <a
            href={`https://celoscan.io/address/${agentAddress}`}
            target="_blank"
            rel="noreferrer"
            title="View the agent wallet on Celoscan"
            className="hidden h-9 items-center gap-2 rounded-lg border border-white/[.07] bg-white/[.025] px-2.5 hover:border-mint/40 sm:flex"
          >
            <div className="grid h-6 w-6 place-items-center rounded-md bg-electric/10 text-electric">
              <ShieldCheck size={14} />
            </div>
            <span className="font-mono text-[11px] text-slate-400">{compactAddress(agentAddress)}</span>
            <ExternalLink size={12} className="text-slate-600" />
          </a>
        ) : (
          <div className="hidden h-9 items-center rounded-lg border border-white/[.07] bg-white/[.025] px-2.5 font-mono text-[11px] text-slate-500 sm:flex">
            Wallet not configured
          </div>
        )}
      </div>
    </header>
  );
}