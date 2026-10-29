import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgent } from "@/context/AgentContext";
import { formatNumber, getAgentConfig, getTreasury, type AgentConfig, type Treasury } from "@/lib/api";

export function TreasuryPage() {
  const { runCount } = useAgent();
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [t, c] = await Promise.all([getTreasury(), getAgentConfig()]);
      setTreasury(t);
      setConfig(c);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load treasury");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, runCount]);

  const copyAddress = async () => {
    if (!treasury) return;
    try {
      await navigator.clipboard.writeText(treasury.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked by the browser; the address is still shown on screen.
    }
  };

  const need = config ? Number(config.sellAmount) : 0;
  const have = treasury ? Number(treasury.wars) : 0;
  const covered = have >= need;
  const loading = treasury === null && !error;

  const balances = [
    { label: "wARS", value: treasury ? formatNumber(treasury.wars, 2) : "", note: "Asset the agent sells to hedge" },
    { label: "USDT", value: treasury ? formatNumber(treasury.usdt, 2) : "", note: "Protected value after a hedge" },
    { label: "CELO", value: treasury ? formatNumber(treasury.celo, 4) : "", note: "Used to pay transaction gas" }
  ];

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-mint">Agent wallet</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">Treasury</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Live balances read from Celo Mainnet for the wallet the agent signs with.
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

      <div className="grid gap-4 sm:grid-cols-3">
        {balances.map((item) => (
          <Card key={item.label} className="p-5">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">{item.label}</div>
            {loading ? <Skeleton className="h-8 w-28" /> : <div className="text-2xl font-semibold tracking-tight text-white">{item.value}</div>}
            <div className="mt-3 text-xs text-slate-500">{item.note}</div>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hedge readiness</CardTitle>
            {config && !error && (covered ? <Badge tone="success">Balance covers hedge</Badge> : <Badge tone="warning">Not enough wARS</Badge>)}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Hedge amount (HEDGE_SELL_AMOUNT)</span><span className="text-slate-200">{config ? `${formatNumber(config.sellAmount, 2)} wARS` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">wARS in wallet</span><span className="text-slate-200">{treasury ? `${formatNumber(treasury.wars, 2)} wARS` : "—"}</span></div>
            {config && !error && !covered && (
              <div className="flex justify-between"><span className="text-slate-500">Short by</span><span className="text-amber">{formatNumber(need - have, 2)} wARS</span></div>
            )}
            <p className="pt-2 text-xs leading-5 text-slate-600">
              Textile FX also enforces its own minimum trade size, so the hedge amount must be above that minimum as well.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fund this wallet</CardTitle>
            {config && <Badge tone={config.isDryRun ? "info" : "warning"}>{config.isDryRun ? "Dry run" : "Live mode"}</Badge>}
          </CardHeader>
          <CardContent>
            <div className="break-all rounded-xl border border-white/[.07] bg-black/10 p-3.5 font-mono text-xs text-slate-300">
              {treasury ? treasury.address : "Loading…"}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void copyAddress()} disabled={!treasury}>
                <Copy size={14} />
                {copied ? "Copied" : "Copy address"}
              </Button>
              {treasury && (
                <a
                  href={`https://celoscan.io/address/${treasury.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.02] px-3.5 py-2 text-sm font-semibold text-slate-200 hover:border-mint/40 hover:text-mint"
                >
                  <ExternalLink size={14} />
                  View on Celoscan
                </a>
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">Only send assets on Celo Mainnet to this address.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}