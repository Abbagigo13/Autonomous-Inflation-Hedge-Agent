import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgent } from "@/context/AgentContext";
import { getHistory, type HistoryEntry } from "@/lib/api";

export function HedgeChart() {
  const { config, runCount } = useAgent();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    getHistory()
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [runCount]);

  const threshold = config?.threshold;
  // History arrives newest first; the chart needs oldest first.
  const data = entries
    .slice(0, 30)
    .reverse()
    .map((entry) => ({
      time: new Date(entry.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      inflation: entry.inflationRate
    }));
  const highest = Math.max(threshold ?? 0, ...data.map((point) => point.inflation), 1);
  const top = Math.ceil(highest * 1.25);

  return (
    <Card className="min-h-[390px] flex-1">
      <CardHeader>
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />Signal history
          </div>
          <CardTitle className="text-base">Inflation signal vs trigger</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-5 text-xs">
          <span className="flex items-center gap-2 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-mint" />Year-over-year inflation at each run (INDEC)
          </span>
          {threshold !== undefined && (
            <span className="flex items-center gap-2 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-amber" />Trigger {threshold}%
            </span>
          )}
        </div>
        {data.length < 2 ? (
          <div className="grid h-[275px] place-items-center rounded-xl border border-white/[.07] bg-black/10 px-6 text-center text-sm leading-6 text-slate-500">
            The chart draws one point for every agent run. Run the agent at least twice to see the trend.
          </div>
        ) : (
          <div className="h-[275px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#ffffff" strokeOpacity={0.06} vertical={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#56616d", fontSize: 10 }} dy={10} minTickGap={24} />
                <YAxis domain={[0, top]} axisLine={false} tickLine={false} tick={{ fill: "#56616d", fontSize: 10 }} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  contentStyle={{ background: "#11171d", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: "#9aa7ae" }}
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                />
                {threshold !== undefined && <ReferenceLine y={threshold} stroke="#FFC857" strokeDasharray="5 5" />}
                <Line type="monotone" dataKey="inflation" name="Inflation (year over year)" stroke="#B8FF6A" strokeWidth={2} dot={{ r: 3, fill: "#B8FF6A" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}