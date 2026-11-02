import { API_BASE } from "@/lib/api";

export type QuoteInfo = {
  available: boolean;
  usdt: number | null;
  pesosPerUsdt: number | null;
  belowMinimum: boolean;
  minimumPesos: number | null;
  note: string | null;
};

export type Estimate = {
  generatedAt: string;
  pesos: number;
  inflation: {
    yearOverYearPct: number;
    monthlyPct: number;
    period: string;
    source: string;
    trigger: number;
    atOrAboveTrigger: boolean;
  };
  purchasingPower: { pesosAfterOneYear: number; lostPct: number };
  quote: QuoteInfo;
};

export class EstimateError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function getEstimate(pesos: number): Promise<Estimate> {
  const response = await fetch(`${API_BASE}/api/estimate?pesos=${encodeURIComponent(String(pesos))}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new EstimateError((payload as { code?: string }).code ?? "error", (payload as { error?: string }).error ?? `Request failed: ${response.status}`);
  }
  return payload as Estimate;
}