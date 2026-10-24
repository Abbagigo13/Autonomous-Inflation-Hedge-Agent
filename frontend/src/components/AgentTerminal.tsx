import { useEffect, useRef } from "react";
import { TerminalSquare, Wifi } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAgent } from "@/context/AgentContext";
import { cn } from "@/lib/utils";

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function AgentTerminal() {
  const { logs } = useAgent();
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs.length]);
  return <Card className="overflow-hidden border-white/[.1] bg-[#070908]"><div className="flex items-center justify-between border-b border-white/[.08] px-5 py-3.5"><div className="flex items-center gap-2.5"><TerminalSquare size={16} className="text-mint" /><span className="font-mono text-xs font-semibold text-slate-300">live execution trail</span><Badge tone="success"><span className="h-1.5 w-1.5 rounded-full bg-mint pulse-soft" />SSE connected</Badge></div><div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-600"><Wifi size={12} />/api/logs</div></div><div className="h-[215px] overflow-y-auto px-5 py-4 font-mono text-[11px] leading-6"><div className="mb-2 text-slate-700">// Agent observability stream · Celo 42220</div>{logs.length === 0 ? <div className="text-slate-600">Waiting for telemetry…</div> : logs.map((log) => <div key={log.id} className="flex gap-3"><span className="shrink-0 text-slate-700">{timeLabel(log.timestamp)}</span><span className={cn("shrink-0", log.level === "error" ? "text-red-400" : log.level === "warning" ? "text-amber" : log.level === "success" ? "text-mint" : "text-electric")}>[{log.level.toUpperCase()}]</span><span className="text-slate-400">{log.message}</span></div>)}<div ref={bottomRef} /></div></Card>;
}
