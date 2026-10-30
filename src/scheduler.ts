import { DRY_RUN, HEDGE_SELL_AMOUNT } from "./config.js";

type LogLevel = "info" | "success" | "warning" | "error";

export type SchedulerStatus = {
  active: boolean;
  mode: "dry-run" | "live";
  intervalMinutes: number;
  cooldownHours: number;
  maxDailySellWars: number;
  maxFailures: number;
  consecutiveFailures: number;
  nextRunAt: string | null;
  lastTickAt: string | null;
  lastDecision: string | null;
  pausedReason: string | null;
};

export type SchedulerDeps = {
  log: (message: string, level?: LogLevel) => void;
  /** Runs one cycle. Returns null if a run is already in progress. Throws if the cycle cannot run at all. */
  runCycle: () => Promise<{ reason?: string } | null>;
  /** Live hedges that really executed, oldest first. */
  executedHedges: () => { timestamp: string; sellAmount: string }[];
  warsBalance: () => Promise<number>;
};

function numberFromEnv(name: string, fallback: number, min: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

const INTERVAL_MINUTES = numberFromEnv("SCHEDULER_INTERVAL_MINUTES", 360, 1);
const COOLDOWN_HOURS = numberFromEnv("HEDGE_COOLDOWN_HOURS", 24, 0);
const TRANCHE = Number(HEDGE_SELL_AMOUNT);
const MAX_DAILY_SELL_WARS = numberFromEnv("MAX_DAILY_SELL_WARS", TRANCHE, 0);
const MAX_FAILURES = numberFromEnv("SCHEDULER_MAX_FAILURES", 3, 1);
const FIRST_RUN_DELAY_MS = 10_000;
const HEALTHY_REASONS = new Set(["executed", "dry-run-prepared", "below-threshold"]);

export function createScheduler(deps: SchedulerDeps) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = false;
  let nextRunAt: number | null = null;
  let lastTickAt: number | null = null;
  let lastDecision: string | null = null;
  let pausedReason: string | null = "not started yet";
  let failures = 0;

  function schedule(delayMs: number) {
    if (timer) clearTimeout(timer);
    nextRunAt = Date.now() + delayMs;
    timer = setTimeout(() => void tick(), delayMs);
  }

  /** The safety limits. Returns a reason to skip this check, or null if a run is allowed. */
  async function reasonToSkip(): Promise<string | null> {
    // Spending limits only matter when real transactions can be sent.
    if (!DRY_RUN) {
      const now = Date.now();
      const hedges = deps.executedHedges();

      if (hedges.length > 0) {
        const latest = Math.max(...hedges.map((hedge) => Date.parse(hedge.timestamp)));
        const cooldownMs = COOLDOWN_HOURS * 3_600_000;
        if (now - latest < cooldownMs) {
          return `cooldown after the last hedge (the next one is possible after ${new Date(latest + cooldownMs).toLocaleString()})`;
        }
      }

      const soldToday = hedges
        .filter((hedge) => now - Date.parse(hedge.timestamp) < 86_400_000)
        .reduce((sum, hedge) => sum + Number(hedge.sellAmount), 0);
      if (soldToday + TRANCHE > MAX_DAILY_SELL_WARS) {
        return `daily limit reached (${soldToday} wARS sold in the last 24 hours, limit ${MAX_DAILY_SELL_WARS})`;
      }
    }

    // In both modes: there is no point asking for a quote the wallet cannot cover.
    const balance = await deps.warsBalance();
    if (balance < TRANCHE) return `wARS balance ${balance.toFixed(2)} is below the hedge amount ${TRANCHE}`;
    return null;
  }

  async function tick() {
    timer = null;
    nextRunAt = null;
    if (!active) return;
    lastTickAt = Date.now();

    try {
      const skip = await reasonToSkip();
      if (skip) {
        lastDecision = `Skipped · ${skip}`;
        deps.log(`Scheduler · ${lastDecision}`, "info");
      } else {
        deps.log("Scheduler · starting a scheduled run", "info");
        const summary = await deps.runCycle();
        if (summary === null) {
          lastDecision = "Skipped · another run is in progress";
          deps.log(`Scheduler · ${lastDecision}`, "info");
        } else {
          const healthy = HEALTHY_REASONS.has(summary.reason ?? "");
          failures = healthy ? 0 : failures + 1;
          lastDecision = `Run finished · ${summary.reason ?? "done"}`;
          deps.log(`Scheduler · ${lastDecision}`, healthy ? "success" : "warning");
        }
      }
    } catch (error) {
      failures += 1;
      const message = error instanceof Error ? error.message : "unknown error";
      lastDecision = `Run failed · ${message}`;
      deps.log(`Scheduler · ${lastDecision}`, "error");
    }

    if (failures >= MAX_FAILURES) {
      pause(`${failures} failed runs in a row`);
      return;
    }
    if (active) {
      const delay = INTERVAL_MINUTES * 60_000;
      schedule(delay);
      deps.log(`Scheduler · next check at ${new Date(Date.now() + delay).toLocaleTimeString()}`, "info");
    }
  }

  function pause(reason: string) {
    active = false;
    if (timer) clearTimeout(timer);
    timer = null;
    nextRunAt = null;
    pausedReason = reason;
    deps.log(`Scheduler paused · ${reason}`, "warning");
  }

  /** Returns false if it could not start (for example live mode without the second switch). */
  function resume(): boolean {
    if (active) return true;
    if (!DRY_RUN && process.env.SCHEDULER_ALLOW_LIVE?.trim().toLowerCase() !== "true") {
      pausedReason = "live scheduling is switched off; add SCHEDULER_ALLOW_LIVE=true to .env to allow it";
      deps.log(`Scheduler not started · ${pausedReason}`, "error");
      return false;
    }
    active = true;
    pausedReason = null;
    failures = 0;
    deps.log(
      `Scheduler started · checks every ${INTERVAL_MINUTES} minutes (${DRY_RUN ? "dry run, nothing is sent" : "LIVE, real transactions"})`,
      DRY_RUN ? "info" : "warning"
    );
    schedule(FIRST_RUN_DELAY_MS);
    return true;
  }

  function status(): SchedulerStatus {
    return {
      active,
      mode: DRY_RUN ? "dry-run" : "live",
      intervalMinutes: INTERVAL_MINUTES,
      cooldownHours: COOLDOWN_HOURS,
      maxDailySellWars: MAX_DAILY_SELL_WARS,
      maxFailures: MAX_FAILURES,
      consecutiveFailures: failures,
      nextRunAt: nextRunAt === null ? null : new Date(nextRunAt).toISOString(),
      lastTickAt: lastTickAt === null ? null : new Date(lastTickAt).toISOString(),
      lastDecision,
      pausedReason
    };
  }

  return { resume, pause: () => pause("paused by the operator"), status };
}