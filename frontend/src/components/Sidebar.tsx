import { Activity, Blocks, LayoutDashboard, Radio, ShieldCheck, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PageId = "overview" | "history" | "routes" | "treasury" | "identity";

export const PAGES: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "history", label: "Hedge history", icon: Activity },
  { id: "routes", label: "Execution routes", icon: Radio },
  { id: "treasury", label: "Treasury", icon: WalletCards },
  { id: "identity", label: "Identity", icon: ShieldCheck }
];

export function Sidebar({ page, onNavigate }: { page: PageId; onNavigate: (id: PageId) => void }) {
  return (
    <aside className="hidden min-h-screen w-[248px] shrink-0 border-r border-white/[.07] bg-[#0B0E12] px-5 py-6 lg:flex lg:flex-col">
      <div className="mb-12 flex items-center gap-3 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-mint/30 bg-mint/10 font-mono text-lg font-bold text-mint shadow-glow">A</div>
        <div>
          <div className="font-mono text-[13px] font-semibold tracking-[.12em] text-slate-100">HEDGE<span className="text-mint">//</span>AGENT</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[.22em] text-slate-600">Autonomous treasury</div>
        </div>
      </div>
      <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-600">Workspace</div>
      <nav className="space-y-1">
        {PAGES.map(({ id, label, icon: Icon }) => {
          const active = id === page;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                active ? "bg-white/[.06] text-white" : "text-slate-500 hover:bg-white/[.035] hover:text-slate-200"
              )}
            >
              <Icon size={16} className={active ? "text-mint" : "text-slate-600 group-hover:text-slate-300"} />
              <span>{label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-mint" />}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto">
        <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3.5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">
            <Blocks size={13} className="text-electric" /> Network
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-200">Celo Mainnet</span>
            <Badge tone="success"><span className="h-1.5 w-1.5 rounded-full bg-mint" />Live</Badge>
          </div>
          <div className="mt-2 font-mono text-[10px] text-slate-600">CHAIN ID 42220</div>
        </div>
      </div>
    </aside>
  );
}