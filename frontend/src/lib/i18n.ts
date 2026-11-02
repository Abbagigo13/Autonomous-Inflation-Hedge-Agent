export type Lang = "es" | "en";

const STORAGE_KEY = "language";

/** Spanish if the browser is set to Spanish, otherwise English. A saved choice wins. */
export function initialLanguage(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch {
    // Storage can be blocked by the browser; fall back to the browser language.
  }
  const browser = typeof navigator !== "undefined" ? (navigator.language ?? "").toLowerCase() : "";
  return browser.startsWith("es") ? "es" : "en";
}

export function saveLanguage(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not being able to remember the choice is fine.
  }
}

export type Copy = {
  eyebrow: string;
  title: string;
  intro: string;
  howTitle: string;
  howSteps: string[];
  amountLabel: string;
  amountHint: string;
  unit: string;
  calculate: string;
  calculating: string;
  errAmount: string;
  errTooFast: string;
  errUnavailable: string;
  step1Title: string;
  step1Text: (yearly: string, period: string, monthly: string) => string;
  step2Title: string;
  step2Text: (pesos: string, after: string, lost: string) => string;
  step2Note: string;
  step3Title: string;
  step3Text: (usdt: string, rate: string) => string;
  step3Note: string;
  belowMin: (min: string | null) => string;
  tooSmallTitle: string;
  tooSmallText: (min: string) => string;
  noQuote: string;
  step4Title: string;
  step4Text: (trigger: string, yearly: string, acts: boolean) => string;
  step4TooSmall: (trigger: string, yearly: string) => string;
  yes: string;
  yesButSmall: string;
  notYet: string;
  limitsTitle: string;
  limits: string[];
  realTitle: string;
  realText: string;
  seeReal: string;
  seeDemo: string;
  sources: string;
  language: string;
};

export const COPY: Record<Lang, Copy> = {
  es: {
    eyebrow: "Calculadora sencilla",
    title: "Proteger mis pesos",
    intro:
      "Mira en un minuto qué le pasa a tu dinero cuando los precios suben, y cuántos dólares digitales serían hoy. Esta página solo calcula: no pide tu billetera ni mueve dinero.",
    howTitle: "Cómo funciona",
    howSteps: [
      "Escribe cuántos pesos argentinos quieres proteger.",
      "Leemos la inflación oficial de Argentina (INDEC) de los últimos 12 meses.",
      "Le pedimos a Textile FX el precio de hoy para cambiar esos pesos digitales (wARS) por dólares digitales (USDT)."
    ],
    amountLabel: "Pesos argentinos",
    amountHint: "Número entero, entre 1 y 10.000.000",
    unit: "pesos",
    calculate: "Calcular",
    calculating: "Calculando…",
    errAmount: "Escribe un número entero de pesos, entre 1 y 10.000.000.",
    errTooFast: "Espera un momento antes de volver a calcular.",
    errUnavailable: "No pudimos leer los datos ahora mismo. Intenta de nuevo en unos minutos.",
    step1Title: "1. Cuánto suben los precios",
    step1Text: (yearly, period, monthly) =>
      `En los últimos 12 meses los precios en Argentina subieron ${yearly}%, según el INDEC (último dato: ${period}). En ese último mes subieron ${monthly}%.`,
    step2Title: "2. Qué le pasa a tus pesos si no haces nada",
    step2Text: (pesos, after, lost) =>
      `Si los precios siguen subiendo al ritmo del último año, dentro de 12 meses tus ${pesos} pesos comprarían lo mismo que hoy compran unos ${after} pesos (un ${lost}% menos).`,
    step2Note: "Es un ejemplo con números reales, no una predicción.",
    step3Title: "3. Si los cambias hoy a dólares digitales",
    step3Text: (usdt, rate) => `Hoy recibirías unos US$ ${usdt} (USDT), a unos ${rate} pesos por dólar.`,
    step3Note: "Es un precio de referencia: el precio real de la operación puede variar cerca de un 0,5 % y no incluye costos de red.",
    belowMin: (min) =>
      min
        ? `Por ahora el cambio mínimo es de unos ${min} pesos (alrededor de US$ 1). Prueba con un monto mayor.`
        : "Ese monto es menor al mínimo que acepta Textile FX (alrededor de US$ 1). Prueba con uno mayor.",
    tooSmallTitle: "Monto menor al mínimo",
    tooSmallText: (min) =>
      `Este monto está por debajo del cambio mínimo de Textile FX (unos US$ 1, alrededor de ${min} pesos). El precio de arriba es solo de referencia: el agente no podría cambiar una cantidad tan pequeña. Prueba con ${min} pesos o más.`,
    noQuote: "No pudimos obtener el precio de hoy. Intenta de nuevo en unos minutos.",
    step4Title: "4. ¿Actuaría el agente?",
    step4Text: (trigger, yearly, acts) =>
      `El agente protege cuando la inflación anual llega a ${trigger}% o más. Hoy está en ${yearly}%, así que ${acts ? "sí actuaría." : "todavía no actuaría."}`,
    step4TooSmall: (trigger, yearly) =>
      `El agente protege cuando la inflación anual llega a ${trigger}% o más. Hoy está en ${yearly}%, así que se activaría, pero este monto es menor al cambio mínimo y no se podría ejecutar.`,
    yes: "Sí",
    yesButSmall: "Sí, pero muy poco",
    notYet: "Todavía no",
    limitsTitle: "Lo que esto no es",
    limits: [
      "No es una garantía. Si el peso se mantiene estable frente al dólar, cambiar a dólares no te hace ganar, y el dólar digital también puede variar un poco.",
      "El USDT es un dólar digital emitido por una empresa privada (Tether) y tiene sus propios riesgos.",
      "Es una demostración de un hackathon, no asesoría financiera.",
      "Esta página solo calcula. No mueve dinero ni te pide la billetera."
    ],
    realTitle: "¿Y cómo se haría de verdad?",
    realText:
      "Hoy, el agente de esta demo protege una billetera de prueba, y puedes ver su operación real en el historial. Que cada persona proteja sus propios pesos desde su billetera todavía no existe: está en el plan.",
    seeReal: "Ver la operación real",
    seeDemo: "Ver la demo completa",
    sources: "Datos: INDEC (datos.gob.ar) · Precios: Textile FX · Red: Celo",
    language: "Idioma"
  },
  en: {
    eyebrow: "Plain-language calculator",
    title: "Protect my pesos",
    intro:
      "See in one minute what happens to your money when prices rise, and how many digital dollars it would be today. This page only calculates: it doesn't ask for your wallet or move any money.",
    howTitle: "How it works",
    howSteps: [
      "Type how many Argentine pesos you want to protect.",
      "We read Argentina's official inflation (INDEC) for the last 12 months.",
      "We ask Textile FX for today's price to swap those digital pesos (wARS) for digital dollars (USDT)."
    ],
    amountLabel: "Argentine pesos",
    amountHint: "Whole number, between 1 and 10,000,000",
    unit: "pesos",
    calculate: "Calculate",
    calculating: "Calculating…",
    errAmount: "Type a whole number of pesos, between 1 and 10,000,000.",
    errTooFast: "Please wait a moment before calculating again.",
    errUnavailable: "We couldn't read the data right now. Please try again in a few minutes.",
    step1Title: "1. How fast prices are rising",
    step1Text: (yearly, period, monthly) =>
      `Over the last 12 months, prices in Argentina rose ${yearly}%, according to INDEC (latest data: ${period}). In that last month they rose ${monthly}%.`,
    step2Title: "2. What happens to your pesos if you do nothing",
    step2Text: (pesos, after, lost) =>
      `If prices keep rising at last year's pace, in 12 months your ${pesos} pesos would buy what about ${after} pesos buy today (${lost}% less).`,
    step2Note: "This is an example using real numbers, not a prediction.",
    step3Title: "3. If you swap them to digital dollars today",
    step3Text: (usdt, rate) => `Today you would receive about US$ ${usdt} (USDT), at about ${rate} pesos per dollar.`,
    step3Note: "This is a reference price: the real trade price can differ by around 0.5% and it doesn't include network costs.",
    belowMin: (min) =>
      min
        ? `For now the minimum swap is about ${min} pesos (around US$ 1). Try a larger amount.`
        : "That amount is below the minimum Textile FX accepts (around US$ 1). Try a larger one.",
    tooSmallTitle: "Amount below the minimum",
    tooSmallText: (min) =>
      `This amount is below Textile FX's minimum swap (about US$ 1, around ${min} pesos). The price above is only a reference: the agent could not swap an amount this small. Try ${min} pesos or more.`,
    noQuote: "We couldn't get today's price. Please try again in a few minutes.",
    step4Title: "4. Would the agent act?",
    step4Text: (trigger, yearly, acts) =>
      `The agent protects when yearly inflation reaches ${trigger}% or more. Today it is ${yearly}%, so it ${acts ? "would act." : "would not act yet."}`,
    step4TooSmall: (trigger, yearly) =>
      `The agent protects when yearly inflation reaches ${trigger}% or more. Today it is ${yearly}%, so it would trigger, but this amount is below the minimum swap and could not be executed.`,
    yes: "Yes",
    yesButSmall: "Yes, but too small",
    notYet: "Not yet",
    limitsTitle: "What this is not",
    limits: [
      "It is not a guarantee. If the peso stays steady against the dollar, swapping to dollars doesn't make you any gain, and the digital dollar can also move a little.",
      "USDT is a digital dollar issued by a private company (Tether) and has its own risks.",
      "This is a hackathon demo, not financial advice.",
      "This page only calculates. It doesn't move money or ask for your wallet."
    ],
    realTitle: "And how would it work for real?",
    realText:
      "Today, the agent in this demo protects a test wallet, and you can see its real trade in the history. Letting each person protect their own pesos from their own wallet doesn't exist yet: it is planned.",
    seeReal: "See the real trade",
    seeDemo: "See the full demo",
    sources: "Data: INDEC (datos.gob.ar) · Prices: Textile FX · Network: Celo",
    language: "Language"
  }
};