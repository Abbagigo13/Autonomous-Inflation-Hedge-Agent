import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgent } from "@/context/AgentContext";
import { formatNumber, getHistory, type HistoryEntry } from "@/lib/api";
import { describeReason } from "@/lib/reasons";

function outcome(entry: HistoryEntry) {
  if (entry.executed) return { label: "Executed", tone: "success" as const, detail: "The hedge transaction was sent and confirmed." };
  return describeReason(entry.reason);
}

export function HistoryPage() {
  const { runCount } = useAgent();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getHistory()
      .then((data) => {
        if (cancelled) return;
        setEntries(data);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load history");
      });
    return () => {
      cancelled = true;
    };
  }, [runCount]);

  const total = entries?.length ?? 0;
  const executed = entries?.filter((e) => e.executed).length ?? 0;
  const last = entries?.[0];

  return (
    <>
      <div className="mb-7">
        <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-mint">Audit trail</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">Hedge history</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Every time the agent runs, the result is saved here. Executed hedges link to their transaction on Celoscan. Runs started by the autopilot are marked "Auto".
        </p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total runs", value: String(total) },
          { label: "Hedges executed", value: String(executed) },
          { label: "Last run", value: last ? new Date(last.timestamp).toLocaleString() : "—" }
        ].map((item) => (
          <Card key={item.label} className="p-5">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">{item.label}</div>
            <div className="text-lg font-semibold text-white">{entries === null && !error ? <Skeleton className="h-6 w-24" /> : item.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent runs</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
              {error}. Make sure the backend is running (npx tsx server.ts).
            </div>
          ) : entries === null ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-xl border border-white/[.07] bg-black/10 p-6 text-sm text-slate-500">
              No runs yet. Click <span className="text-slate-300">Run hedge agent</span> and the result will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[.07] text-[10px] uppercase tracking-[.16em] text-slate-500">
                    <th className="py-3 pr-4 font-semibold">Time</th>
                    <th className="py-3 pr-4 font-semibold">Inflation</th>
                    <th className="py-3 pr-4 font-semibold">Amount</th>
                    <th className="py-3 pr-4 font-semibold">Outcome</th>
                    <th className="py-3 font-semibold">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const result = outcome(entry);
                    return (
                      <tr key={entry.id} className="border-b border-white/[.05] text-slate-300">
                        <td className="py-3 pr-4 text-xs text-slate-400">{new Date(entry.timestamp).toLocaleString()}</td>
                        <td className="py-3 pr-4">{entry.inflationRate.toFixed(1)}%</td>
                        <td className="py-3 pr-4">{formatNumber(entry.sellAmount, 2)} wARS</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap items-center gap-2" title={result.detail}>
                            <Badge tone={result.tone}>{result.label}</Badge>
                            {entry.dryRun && <Badge tone="info">Dry run</Badge>}
                            {entry.source === "scheduled" && <Badge tone="neutral">Auto</Badge>}
                          </div>
                        </td>
                        <td className="py-3">
                          {entry.txHash ? (
                            <a
                              href={`https://celoscan.io/tx/${entry.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 font-mono text-xs text-electric hover:underline"
                            >
                              {entry.txHash.slice(0, 8)}…{entry.txHash.slice(-6)}
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}