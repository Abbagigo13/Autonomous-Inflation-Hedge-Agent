import { useState } from "react";
import { ArrowRight, Calculator, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EstimateError, getEstimate, type Estimate } from "@/lib/estimate";
import { COPY, initialLanguage, saveLanguage, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const QUICK_AMOUNTS = [2000, 5000, 10000, 50000];

function ResultCard({ title, big, text, note, tone = "text-white" }: { title: string; big: string; text: string; note?: string; tone?: string }) {
  return (
    <Card className="p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">{title}</div>
      <div className={cn("mt-3 text-3xl font-semibold tracking-tight", tone)}>{big}</div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>
      {note && <p className="mt-2 text-xs leading-5 text-slate-600">{note}</p>}
    </Card>
  );
}

export function ProtectPage() {
  const [lang, setLang] = useState<Lang>(initialLanguage);
  const [amount, setAmount] = useState("2000");
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState("");

  const t = COPY[lang];
  const locale = lang === "es" ? "es-AR" : "en-US";
  const fmt = (value: number, digits = 0) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  const periodLabel = (period: string) =>
    new Date(`${period}T00:00:00Z`).toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });

  const chooseLanguage = (code: Lang) => {
    setLang(code);
    saveLanguage(code);
  };

  const calculate = async (override?: string) => {
    const text = override ?? amount;
    const pesos = Number(text.replace(/[^\d]/g, ""));
    if (!Number.isInteger(pesos) || pesos < 1 || pesos > 10_000_000) {
      setError(t.errAmount);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setEstimate(await getEstimate(pesos));
    } catch (err) {
      setEstimate(null);
      setError(err instanceof EstimateError && err.code === "too-fast" ? t.errTooFast : t.errUnavailable);
    } finally {
      setLoading(false);
    }
  };

  const quote = estimate?.quote;
  const priceShown = Boolean(quote?.available && quote.usdt !== null && quote.pesosPerUsdt !== null);
  const tooSmall = Boolean(quote?.available && quote.belowMinimum);
  const minText = quote?.minimumPesos != null ? fmt(quote.minimumPesos) : "1.640";
  const acts = estimate?.inflation.atOrAboveTrigger === true;

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-mint">
            <Calculator size={13} />
            {t.eyebrow}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">{t.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{t.intro}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 p-1 text-xs font-semibold" role="group" aria-label={t.language}>
          {(["es", "en"] as const).map((code) => (
            <button
              key={code}
              onClick={() => chooseLanguage(code)}
              className={cn("rounded-md px-3 py-1.5", lang === code ? "bg-white/[.08] text-white" : "text-slate-500 hover:text-slate-200")}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">{t.howTitle}</div>
          <ol className="mt-3 space-y-2">
            {t.howSteps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6 text-slate-300">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-mint/30 bg-mint/10 font-mono text-[11px] font-semibold text-mint">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardContent className="pt-5">
          <label htmlFor="pesos" className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">
            {t.amountLabel}
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              id="pesos"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void calculate();
              }}
              className="h-12 w-full max-w-xs rounded-lg border border-white/10 bg-black/20 px-4 text-lg text-slate-100 outline-none focus:border-mint/40"
            />
            <Button onClick={() => void calculate()} disabled={loading} className="h-12 px-6">
              {loading ? t.calculating : t.calculate}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                onClick={() => {
                  setAmount(String(value));
                  void calculate(String(value));
                }}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:border-mint/40 hover:text-mint"
              >
                {fmt(value)} {t.unit}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-600">{t.amountHint}</p>
          {error && <p className="mt-3 text-sm text-amber">{error}</p>}
        </CardContent>
      </Card>

      {estimate && quote && (
        <>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <ResultCard
              title={t.step1Title}
              big={`${fmt(estimate.inflation.yearOverYearPct, 1)}%`}
              text={t.step1Text(fmt(estimate.inflation.yearOverYearPct, 1), periodLabel(estimate.inflation.period), fmt(estimate.inflation.monthlyPct, 1))}
              tone="text-amber"
            />
            <ResultCard
              title={t.step2Title}
              big={`≈ ${fmt(estimate.purchasingPower.pesosAfterOneYear)} ${t.unit}`}
              text={t.step2Text(fmt(estimate.pesos), fmt(estimate.purchasingPower.pesosAfterOneYear), fmt(estimate.purchasingPower.lostPct))}
              note={t.step2Note}
              tone="text-amber"
            />
            {priceShown ? (
              <ResultCard
                title={t.step3Title}
                big={`≈ US$ ${fmt(quote.usdt as number, 2)}`}
                text={t.step3Text(fmt(quote.usdt as number, 2), fmt(quote.pesosPerUsdt as number))}
                note={t.step3Note}
                tone={tooSmall ? "text-slate-300" : "text-mint"}
              />
            ) : (
              <ResultCard
                title={t.step3Title}
                big="—"
                text={quote.belowMinimum ? t.belowMin(quote.minimumPesos !== null ? fmt(quote.minimumPesos) : null) : t.noQuote}
              />
            )}
            <ResultCard
              title={t.step4Title}
              big={acts ? (tooSmall ? t.yesButSmall : t.yes) : t.notYet}
              text={
                acts && tooSmall
                  ? t.step4TooSmall(fmt(estimate.inflation.trigger), fmt(estimate.inflation.yearOverYearPct, 1))
                  : t.step4Text(fmt(estimate.inflation.trigger), fmt(estimate.inflation.yearOverYearPct, 1), acts)
              }
              tone={acts && !tooSmall ? "text-mint" : "text-slate-300"}
            />
          </div>
          {tooSmall && (
            <div className="mt-5 rounded-2xl border border-amber/30 bg-amber/[.05] p-4">
              <div className="text-sm font-semibold text-amber">{t.tooSmallTitle}</div>
              <p className="mt-1.5 text-sm leading-6 text-slate-300">{t.tooSmallText(minText)}</p>
            </div>
          )}
        </>
      )}

      <Card className="mt-5">
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <ShieldAlert size={15} className="text-amber" />
            {t.limitsTitle}
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-400">
            {t.limits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardContent className="pt-5">
          <div className="text-sm font-semibold text-slate-200">{t.realTitle}</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">{t.realText}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="#history" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.02] px-3.5 py-2 text-sm font-semibold text-slate-200 hover:border-mint/40 hover:text-mint">
              {t.seeReal}
              <ArrowRight size={14} />
            </a>
            <a href="#overview" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.02] px-3.5 py-2 text-sm font-semibold text-slate-200 hover:border-mint/40 hover:text-mint">
              {t.seeDemo}
              <ArrowRight size={14} />
            </a>
          </div>
        </CardContent>
      </Card>

      <p className="mt-5 text-xs text-slate-600">{t.sources}</p>
    </>
  );
}