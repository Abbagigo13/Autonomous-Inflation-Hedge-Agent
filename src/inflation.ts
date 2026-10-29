import axios from "axios";

// INDEC national consumer price index, published through Argentina's open-data API.
export const INFLATION_SERIES_ID = "148.3_INIVELNAL_DICI_M_26";
const SERIES_API = "https://apis.datos.gob.ar/series/api/series/";
const MAX_AGE_DAYS = 120; // INDEC publishes about 6 weeks after each month ends

export type InflationReading = {
  yearOverYearPct: number;
  monthlyPct: number;
  period: string;
  seriesTitle: string;
};

/** The first day of the month, `months` before a "YYYY-MM-01" date. */
function monthsBefore(period: string, months: number): string {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 - months, 1)).toISOString().slice(0, 10);
}

/**
 * Reads the latest inflation. It downloads raw index values and does the maths itself,
 * so a surprise from the API cannot turn into a wrong number. It throws if anything looks off.
 */
export async function fetchInflation(): Promise<InflationReading> {
  let body: any;
  try {
    const response = await axios.get(SERIES_API, {
      params: { ids: INFLATION_SERIES_ID, limit: 13, sort: "desc", metadata: "full", format: "json" },
      timeout: 15_000
    });
    body = response.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`Could not read inflation data from datos.gob.ar: ${message}`);
  }

  const rows: any[] = Array.isArray(body?.data) ? body.data : [];
  const valid = rows.every((row) => Array.isArray(row) && typeof row[0] === "string" && typeof row[1] === "number" && Number.isFinite(row[1]) && row[1] > 0);
  if (rows.length < 13 || !valid) {
    throw new Error("Inflation data came back in an unexpected format; refusing to use it");
  }

  const [latestPeriod, latestIndex] = rows[0] as [string, number];
  const [previousPeriod, previousIndex] = rows[1] as [string, number];
  const [yearAgoPeriod, yearAgoIndex] = rows[12] as [string, number];

  // The rows must be real consecutive months, otherwise the maths would be wrong.
  if (previousPeriod !== monthsBefore(latestPeriod, 1) || yearAgoPeriod !== monthsBefore(latestPeriod, 12)) {
    throw new Error("Inflation data has missing months; refusing to use it");
  }

  const ageDays = (Date.now() - new Date(`${latestPeriod}T00:00:00Z`).getTime()) / 86_400_000;
  if (ageDays > MAX_AGE_DAYS) {
    throw new Error(`The latest inflation data is from ${latestPeriod}, which is too old to trust`);
  }

  const yearOverYearPct = (latestIndex / yearAgoIndex - 1) * 100;
  const monthlyPct = (latestIndex / previousIndex - 1) * 100;
  if (Math.abs(yearOverYearPct) > 1000) {
    throw new Error(`Inflation value ${yearOverYearPct.toFixed(1)}% looks wrong; refusing to use it`);
  }

  const meta: any[] = Array.isArray(body?.meta) ? body.meta : [];
  const fields = meta.map((entry) => entry?.field).filter(Boolean);
  const field = fields.find((f) => f?.id === INFLATION_SERIES_ID) ?? fields[0];
  const seriesTitle = String(field?.description ?? field?.title ?? "series name not provided");

  return { yearOverYearPct, monthlyPct, period: latestPeriod, seriesTitle };
}