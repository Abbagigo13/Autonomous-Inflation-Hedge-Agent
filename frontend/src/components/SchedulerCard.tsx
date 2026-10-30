import { useCallback, useEffect, useState } from "react";
import { Pause, Play, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgent } from "@/context/AgentContext";
import { formatNumber, getScheduler, pauseScheduler, resumeScheduler, type SchedulerStatus } from "@/lib/api";

function when(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function everyText(minutes: number) {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} minutes`;
}

export function SchedulerCard() {
  const { runCount } = useAgent();
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setStatus(await getScheduler());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the scheduler");
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 15_000);
    return () => clearInterval(interval);
  }, [load, runCount]);

  const toggle = async () => {
    if (!status) return;
    setBusy(true);
    setNotice("");
    try {
      if (status.active) {
        setStatus(await pauseScheduler());
      } else {
        const next = await resumeScheduler();
        setStatus(next);
        if (next.accepted === false) setNotice(next.pausedReason ?? "The scheduler could not be started");
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "The request failed");
    } finally {
      setBusy(false);
    }
  };

  const rows = status
    ? [
        { label: "Checks every", value: everyText(status.intervalMinutes) },
        { label: "Next check", value: status.active ? when(status.nextRunAt) : "—" },
        { label: "Last check", value: when(status.lastTickAt) },
        { label: "Last decision", value: status.lastDecision ?? "—" }
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">
            <Timer size={13} className="text-mint" />Autopilot
          </div>
          <CardTitle className="text-base">Scheduled runs</CardTitle>
        </div>
        {status && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.mode === "live" ? "warning" : "info"}>{status.mode === "live" ? "Live mode" : "Dry run"}</Badge>
            <Badge tone={status.active ? "success" : "warning"}>{status.active ? "Running" : "Paused"}</Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
            {error}. Make sure the backend is running (npx tsx server.ts).
          </div>
        )}
        {!status && !error && <Skeleton className="h-24 w-full" />}
        {status && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {rows.map((row) => (
                <div key={row.label} className="rounded-xl border border-white/[.07] bg-black/10 p-3.5">
                  <div className="text-[10px] uppercase tracking-[.16em] text-slate-500">{row.label}</div>
                  <div className="mt-1.5 text-sm text-slate-200">{row.value}</div>
                </div>
              ))}
            </div>
            {!status.active && status.pausedReason && (
              <p className="mt-3 text-sm text-amber">Paused: {status.pausedReason}</p>
            )}
            {status.consecutiveFailures > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Failed runs in a row: {status.consecutiveFailures} of {status.maxFailures} (it pauses itself at {status.maxFailures}).
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant={status.active ? "outline" : "primary"} onClick={() => void toggle()} disabled={busy}>
                {status.active ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
                {status.active ? "Pause autopilot" : "Resume autopilot"}
              </Button>
              {notice && <span className="text-sm text-amber">{notice}</span>}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-600">
              {status.mode === "dry-run"
                ? "Dry run: scheduled runs read the data and request quotes, but nothing is sent. "
                : "Live mode: scheduled runs send real transactions. "}
              Limits when live: one hedge per {status.cooldownHours} hours, up to {formatNumber(status.maxDailySellWars, 0)} wARS per day, and it skips a check when the wallet
              holds less wARS than the hedge amount. You can still run the agent by hand with the button at the top.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}