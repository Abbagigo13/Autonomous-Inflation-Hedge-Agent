import { useEffect, useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, getRoutes, type RouteInfo } from "@/lib/api";

const STEPS = [
  { title: "Read the inflation signal", detail: "The agent fetches the latest Argentina inflation figure." },
  { title: "Compare with the trigger", detail: "If inflation is at or above the threshold, a hedge is needed." },
  { title: "Request a Textile FX quote", detail: "The agent asks Textile for an RFQ to sell wARS for USDT." },
  { title: "Tag and sign the transaction", detail: "The attribution tag is added, then the transaction is sent (skipped in dry-run)." },
  { title: "Save the result", detail: "The outcome is stored and appears on the Hedge history page." }
];

function TokenLink({ symbol, address }: { symbol: string; address: string }) {
  return (
    <a
      href={`https://celoscan.io/token/${address}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3.5 py-2 text-sm font-semibold text-white hover:border-mint/40"
    >
      {symbol}
      <ExternalLink size={12} className="text-slate-500" />
    </a>
  );
}

export function RoutesPage() {
  const [routes, setRoutes] = useState<RouteInfo[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getRoutes()
      .then(setRoutes)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load routes"));
  }, []);

  return (
    <>
      <div className="mb-7">
        <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-mint">Execution</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">Execution routes</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          The route the agent uses when it decides to hedge. It is read from the agent's own configuration.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
          {error}. Make sure the backend is running (npx tsx server.ts).
        </div>
      )}

      {routes === null && !error && <Skeleton className="h-48 w-full" />}

      <div className="space-y-5">
        {routes?.map((route) => (
          <Card key={route.id}>
            <CardHeader>
              <div>
                <CardTitle className="text-base">{route.provider} · {route.method}</CardTitle>
                <div className="mt-1 text-xs text-slate-500">Celo Mainnet · chain id {route.chainId}</div>
              </div>
              <Badge tone={route.mode === "live" ? "warning" : "info"}>{route.mode === "live" ? "Live mode" : "Dry run"}</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <TokenLink symbol={route.sellToken} address={route.sellTokenAddress} />
                <ArrowRight size={16} className="text-mint" />
                <TokenLink symbol={route.buyToken} address={route.buyTokenAddress} />
              </div>
              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl border border-white/[.07] bg-black/10 p-3.5">
                  <div className="text-[10px] uppercase tracking-[.16em] text-slate-500">Amount per hedge</div>
                  <div className="mt-1.5 text-slate-200">{formatNumber(route.sellAmount, 2)} {route.sellToken}</div>
                </div>
                <div className="rounded-xl border border-white/[.07] bg-black/10 p-3.5">
                  <div className="text-[10px] uppercase tracking-[.16em] text-slate-500">Trigger</div>
                  <div className="mt-1.5 text-slate-200">Inflation at or above {route.threshold}%</div>
                </div>
                <div className="rounded-xl border border-white/[.07] bg-black/10 p-3.5">
                  <div className="text-[10px] uppercase tracking-[.16em] text-slate-500">Quote method</div>
                  <div className="mt-1.5 text-slate-200">{route.method} (request for quote)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What happens in one cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-mint/30 bg-mint/10 font-mono text-[11px] font-semibold text-mint">
                    {index + 1}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{step.title}</div>
                    <div className="text-xs leading-5 text-slate-500">{step.detail}</div>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}