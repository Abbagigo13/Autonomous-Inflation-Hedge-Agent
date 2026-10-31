import { useState } from "react";
import { ExternalLink, FlaskConical, Play, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgent } from "@/context/AgentContext";
import { formatNumber } from "@/lib/api";
import { describeReason } from "@/lib/reasons";
import { cn } from "@/lib/utils";

type Mode = "simulate" | "live";

const inputClass =
  "h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-mint/40";

export function RunPanel() {
  const { runAgent, isExecuting, capabilities, config, inflationRate, lastOutcome } = useAgent();
  const [mode, setMode] = useState<Mode>("simulate");
  const [trigger, setTrigger] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const liveAvailable = capabilities?.liveEnabled === true;
  const live = mode === "live" && liveAvailable;
  const isOperator = capabilities?.operator === true;
  const needsCode = live && !isOperator && capabilities?.demoCodeRequired === true;
  const triggerNumber = trigger.trim() === "" ? undefined : Number(trigger);
  const triggerInvalid = !live && triggerNumber !== undefined && (!Number.isFinite(triggerNumber) || triggerNumber < 0 || triggerNumber > 1000);
  const canRun = !isExecuting && !triggerInvalid && (!live || (confirmed && (!needsCode || demoCode.trim().length > 0)));
  const swapsLeft = capabilities ? Math.max(0, capabilities.maxPublicLiveSwaps - capabilities.publicLiveSwapsUsed) : 0;
  const configured = config?.threshold ?? 30;

  const presets = [
    { label: `Configured (${configured}%)`, value: "" },
    { label: "20%", value: "20" },
    { label: "40%", value: "40" }
  ];

  const onRun = async () => {
    await runAgent({
      mode: live ? "live" : "simulate",
      demoCode: needsCode ? demoCode.trim() : undefined,
      thresholdOverride: live ? undefined : triggerNumber
    });
    if (live) setConfirmed(false);
  };

  const outcome = lastOutcome;
  const result = outcome?.result;
  const info = result ? (result.executed ? { label: "Executed", tone: "success" as const, detail: "The approval and the swap were sent and confirmed on Celo Mainnet." } : describeReason(result.reason)) : null;
  const usedTrigger = outcome?.trigger ?? configured;

  return (
    <Card>
      <CardHeader>
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">
            <Play size={13} className="text-mint" />Try the agent
          </div>
          <CardTitle className="text-base">Run it yourself, end to end</CardTitle>
        </div>
        <Badge tone={live ? "warning" : "info"}>{live ? "Live swap" : "Simulation"}</Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-400">
          The agent reads Argentina's latest official inflation figure from INDEC. If it is at or above the trigger, it asks Textile FX for a real quote to sell wARS for USDT, checks it, and prepares the transaction with the attribution tag.
          {inflationRate !== null && <> The latest reading is <span className="text-slate-200">{inflationRate.toFixed(1)}%</span> year over year.</>}
        </p>

        {liveAvailable ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([
              { id: "simulate", title: "Simulation", icon: FlaskConical, text: "Real data and a real quote. Every safety check runs, but nothing is sent." },
              { id: "live", title: "Live swap", icon: Zap, text: `Sends a real approval and swap from the demo wallet (about ${formatNumber(config?.sellAmount ?? "1750", 0)} wARS for USDT).` }
            ] as const).map((option) => (
              <button
                key={option.id}
                onClick={() => setMode(option.id)}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-colors",
                  mode === option.id ? "border-mint/40 bg-mint/[.05]" : "border-white/[.07] bg-black/10 hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <option.icon size={14} className={mode === option.id ? "text-mint" : "text-slate-500"} />
                  {option.title}
                </div>
                <div className="mt-1.5 text-xs leading-5 text-slate-500">{option.text}</div>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-600">Live swaps are switched off on this server, so runs here are simulations.</p>
        )}

        {!live && (
          <div className="mt-4">
            <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">What-if trigger (percent, optional)</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setTrigger(preset.value)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                    trigger === preset.value ? "border-mint/40 text-mint" : "border-white/10 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {preset.label}
                </button>
              ))}
              <input
                type="number"
                min={0}
                max={1000}
                value={trigger}
                onChange={(event) => setTrigger(event.target.value)}
                placeholder="Custom %"
                className={cn(inputClass, "w-32")}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              A trigger above the latest reading shows the "no hedge needed" outcome. At or below it, the agent goes on to request a quote. This only changes the simulation.
            </p>
            {triggerInvalid && <p className="mt-1 text-xs text-amber">Enter a number between 0 and 1000.</p>}
          </div>
        )}

        {live && (
          <div className="mt-4 space-y-3">
            {needsCode && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">Demo code</div>
                <input type="password" value={demoCode} onChange={(event) => setDemoCode(event.target.value)} placeholder="Enter the demo code" className={cn(inputClass, "mt-2 max-w-xs")} />
              </div>
            )}
            <label className="flex items-start gap-2 text-sm leading-6 text-slate-300">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1.5" />
              <span>I understand this sends a real approval and swap on Celo Mainnet from the demo wallet.</span>
            </label>
            {!isOperator && capabilities && (
              <p className="text-xs text-slate-600">
                Demo swaps used: {capabilities.publicLiveSwapsUsed} of {capabilities.maxPublicLiveSwaps} ({swapsLeft} left). Visitors can run one every {capabilities.liveCooldownMinutes} minutes.
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => void onRun()} disabled={!canRun}>
            <Play size={14} fill="currentColor" />
            {isExecuting ? "Running…" : live ? "Run live swap" : "Run simulation"}
          </Button>
          <span className="text-xs text-slate-600">Progress streams in the terminal below.</span>
        </div>

        {outcome && (
          <div className="mt-5 rounded-xl border border-white/[.07] bg-black/10 p-4">
            {outcome.error ? (
              <p className="text-sm leading-6 text-amber">{outcome.error}</p>
            ) : result && info ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={info.tone}>{info.label}</Badge>
                  <Badge tone={result.dryRun ? "info" : "warning"}>{result.dryRun ? "Simulation" : "Live"}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{info.detail}</p>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[.16em] text-slate-500">Inflation (year over year)</div>
                    <div className="mt-1 text-slate-200">{result.inflationRate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[.16em] text-slate-500">Trigger used</div>
                    <div className="mt-1 text-slate-200">{usedTrigger}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[.16em] text-slate-500">Hedge needed</div>
                    <div className="mt-1 text-slate-200">{result.hedgeTriggered ? "Yes" : "No"}</div>
                  </div>
                </div>
                {result.txHash && (
                  <a
                    href={`https://celoscan.io/tx/${result.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-electric hover:underline"
                  >
                    Swap transaction {result.txHash.slice(0, 8)}…{result.txHash.slice(-6)}
                    <ExternalLink size={12} />
                  </a>
                )}
              </>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}