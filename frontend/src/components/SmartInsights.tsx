import { useEffect, useState } from "react";
import { CircleAlert, Gauge, GitBranch, Lightbulb, ShieldCheck, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAgent } from "@/context/AgentContext";
import { getIdentity, type IdentityInfo } from "@/lib/api";
import { describeReason } from "@/lib/reasons";

type Tone = "neutral" | "success" | "warning" | "info";
type Insight = {
  icon: LucideIcon;
  iconTone: string;
  title: string;
  detail: string;
  badge: string;
  badgeTone: Tone;
};

export function SmartInsights() {
  const { config, lastRun, inflationRate, isExecuting, runCount } = useAgent();
  const [identity, setIdentity] = useState<IdentityInfo | null>(null);
  const [identityFailed, setIdentityFailed] = useState(false);

  // Checks the registry now, after every run, and once a minute, so a short backend outage does not leave "Unknown" on screen.
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      getIdentity()
        .then((value) => {
          if (cancelled) return;
          setIdentity(value);
          setIdentityFailed(false);
        })
        .catch(() => {
          if (!cancelled) setIdentityFailed(true);
        });
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [runCount]);

  const threshold = config?.threshold;

  let signal: Insight;
  if (inflationRate === null || threshold === undefined) {
    signal = { icon: CircleAlert, iconTone: "text-slate-400", title: "No inflation signal yet", detail: "Run the agent to read the latest INDEC figure.", badge: "Idle", badgeTone: "neutral" };
  } else if (inflationRate >= threshold) {
    signal = { icon: CircleAlert, iconTone: "text-amber", title: "Inflation is at or above the trigger", detail: `Year-over-year inflation was ${inflationRate.toFixed(1)}% against a ${threshold}% trigger (source: INDEC).`, badge: "Actionable", badgeTone: "warning" };
  } else {
    signal = { icon: CircleAlert, iconTone: "text-mint", title: "Inflation is below the trigger", detail: `Year-over-year inflation was ${inflationRate.toFixed(1)}% against a ${threshold}% trigger (source: INDEC).`, badge: "Calm", badgeTone: "success" };
  }

  let route: Insight;
  if (lastRun) {
    const info = describeReason(lastRun.reason);
    route = { icon: GitBranch, iconTone: "text-electric", title: "Last Textile FX run", detail: info.detail, badge: info.label, badgeTone: info.tone };
  } else {
    route = { icon: GitBranch, iconTone: "text-slate-400", title: "Textile FX route", detail: "No quote has been requested yet.", badge: "Idle", badgeTone: "neutral" };
  }

  let identityInsight: Insight;
  if (identityFailed || (identity && identity.registered === null)) {
    identityInsight = { icon: ShieldCheck, iconTone: "text-slate-400", title: "Identity could not be checked", detail: "The ERC-8004 registry did not answer. This does not mean the wallet is unregistered. It will be checked again shortly.", badge: "Unknown", badgeTone: "neutral" };
  } else if (identity === null) {
    identityInsight = { icon: ShieldCheck, iconTone: "text-slate-400", title: "Checking identity…", detail: "Looking up the agent wallet in the ERC-8004 registry.", badge: "Checking", badgeTone: "neutral" };
  } else if (identity.registered) {
    identityInsight = { icon: ShieldCheck, iconTone: "text-mint", title: "ERC-8004 identity found", detail: "The agent wallet holds an identity in the registry on Celo Mainnet.", badge: "Registered", badgeTone: "success" };
  } else {
    identityInsight = { icon: ShieldCheck, iconTone: "text-amber", title: "No ERC-8004 identity found", detail: "This wallet is not registered in the registry yet.", badge: "Not registered", badgeTone: "warning" };
  }

  const insights = [signal, route, identityInsight];
  const modeText = config ? (config.isDryRun ? "Dry run · transactions are prepared, not sent" : "Live mode · transactions are sent") : "Loading mode…";

  return (
    <Card className="w-full xl:w-[330px] xl:shrink-0">
      <CardHeader>
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">
            <Lightbulb size={13} className="text-amber" />Signal intelligence
          </div>
          <CardTitle className="text-base">Smart insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map(({ icon: Icon, iconTone, title, detail, badge, badgeTone }) => (
          <div key={title} className="rounded-xl border border-white/[.07] bg-black/10 p-3.5">
            <div className="mb-2 flex items-start justify-between gap-3">
              <Icon size={16} className={iconTone} />
              <Badge tone={badgeTone}>{badge}</Badge>
            </div>
            <div className="text-xs font-semibold text-slate-200">{title}</div>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-500">{detail}</p>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-2 border-t border-white/[.07] pt-3 text-[11px] text-slate-600">
          <Gauge size={13} className={config && !config.isDryRun ? "text-amber" : "text-mint"} />
          {isExecuting ? "Agent running…" : modeText}
        </div>
      </CardContent>
    </Card>
  );
}