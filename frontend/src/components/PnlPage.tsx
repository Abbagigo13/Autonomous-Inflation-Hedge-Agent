import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgent } from "@/context/AgentContext";
import { formatNumber, getPnl, type PnlSummary } from "@/lib/api";

function signed(value: string | null, digits: number) {
  if (value === null) return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${number > 0 ? "+" : ""}${formatNumber(number, digits)}`;
}

function resultTone(value: string | null) {
  if (value === null) return "text-slate-300";
  const number = Number(value);
  if (number > 0) return "text-mint";
  if (number < 0) return "text-amber";
  return "text-slate-300";
}

export function PnlPage() {
  const { runCount } = useAgent();
  const [summary, setSummary] = useState<PnlSummary | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setSummary(await getPnl());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the P&L");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, runCount]);

  const loading = summary === null && !error;
  const trades = summary?.trades ?? [];
  const totals = summary?.totals;

  const cards = [
    { label: "Hedges executed", value: summary ? String(trades.length) : "", note: "Live swaps saved in the history" },
    { label: "wARS sold", value: totals ? formatNumber(totals.soldWars, 2) : "", note: "Settled amounts read from Celo" },
    { label: "USDT received", value: totals ? formatNumber(totals.receivedUsdt, 4) : "", note: "Settled amounts read from Celo" },
    {
      label: "Result vs selling now",
      value: totals ? (totals.resultUsdt === null ? "—" : `${signed(totals.resultUsdt, 4)} USDT`) : "",
      note: "Received minus what the same wARS fetch now",
      tone: totals ? resultTone(totals.resultUsdt) : "text-slate-300"
    }
  ];

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-mint">Performance</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">Strategy P&L</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            For every executed hedge, what the wallet really received compared with what the same wARS would fetch at Textile's indicative price right now.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
          {error}. Make sure the backend is running (npx tsx server.ts).
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-5">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">{card.label}</div>
            {loading ? <Skeleton className="h-8 w-28" /> : <div className={"text-2xl font-semibold tracking-tight " + (card.tone ?? "text-white")}>{card.value}</div>}
            <div className="mt-3 text-xs text-slate-500">{card.note}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">Executed hedges</CardTitle>
          {summary && <Badge tone="neutral">As of {new Date(summary.asOf).toLocaleTimeString()}</Badge>}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : trades.length === 0 && !error ? (
            <div className="rounded-xl border border-white/[.07] bg-black/10 p-6 text-sm text-slate-500">
              No executed hedges yet. After a live swap, its settled amounts and result appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[.07] text-[10px] uppercase tracking-[.16em] text-slate-500">
                    <th className="py-3 pr-4 font-semibold">Time</th>
                    <th className="py-3 pr-4 font-semibold">Sold (wARS)</th>
                    <th className="py-3 pr-4 font-semibold">Received (USDT)</th>
                    <th className="py-3 pr-4 font-semibold">Rate at swap</th>
                    <th className="py-3 pr-4 font-semibold">Rate now</th>
                    <th className="py-3 pr-4 font-semibold">Result</th>
                    <th className="py-3 font-semibold">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.id} className="border-b border-white/[.05] align-top text-slate-300">
                      <td className="py-3 pr-4 text-xs text-slate-400">{new Date(trade.timestamp).toLocaleString()}</td>
                      <td className="py-3 pr-4">{trade.soldWars === null ? "—" : formatNumber(trade.soldWars, 2)}</td>
                      <td className="py-3 pr-4">{trade.receivedUsdt === null ? "—" : formatNumber(trade.receivedUsdt, 6)}</td>
                      <td className="py-3 pr-4">{trade.executedRate === null ? "—" : formatNumber(trade.executedRate, 1)}</td>
                      <td className="py-3 pr-4">{trade.currentRate === null ? "—" : formatNumber(trade.currentRate, 1)}</td>
                      <td className="py-3 pr-4">
                        {trade.resultUsdt === null ? (
                          <span className="text-xs text-slate-500">{trade.note ?? "Not available"}</span>
                        ) : (
                          <span className={resultTone(trade.resultUsdt)}>
                            {signed(trade.resultUsdt, 4)} USDT
                            <span className="ml-1.5 text-xs">({signed(trade.resultPct === null ? null : String(trade.resultPct), 2)}%)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <a
                          href={`https://celoscan.io/tx/${trade.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-electric hover:underline"
                        >
                          {trade.txHash.slice(0, 8)}…{trade.txHash.slice(-6)}
                          <ExternalLink size={12} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">How to read this</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-6 text-slate-400">
          <p>
            <span className="text-slate-200">Positive result:</span> the same wARS would now fetch less USDT than the wallet received, so the peso has weakened since the hedge and the hedge protected value.
          </p>
          <p>
            <span className="text-slate-200">Negative result:</span> the peso has strengthened since the swap, or the swap quote was slightly worse than today's indicative price. Small negative numbers are normal.
          </p>
          <p>
            Quotes in this project have differed by about 0.5% from one request to the next, so a single recent trade says little. A hedge shows its value over days and weeks as inflation erodes the peso.
          </p>
          <p className="text-xs text-slate-600">
            Settled amounts are read from the swap transaction on Celo. The current price is Textile's free indicative preview, not a firm quote. Gas costs are not included.
          </p>
        </CardContent>
      </Card>
    </>
  );
}