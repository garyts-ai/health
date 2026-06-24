import { dbAll, dbGet } from "@/lib/db";
import type { DailyHistoricalContext, DailyReadiness } from "@/lib/insights/types";

type HistoricalRow = {
  date: string;
  recovery: number | null;
  sleep: number | null;
  hrv: number | null;
  rhr: number | null;
};

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values: number[], value: number | null) {
  if (value === null || values.length < 14) return null;
  return Math.round((values.filter((item) => item <= value).length / values.length) * 100);
}

export function applyHistoricalModifier<T extends { trainingIntent: "Push" | "Maintain" | "Back off" }>(
  decision: T,
  context: DailyHistoricalContext,
) {
  if (!context.available || context.confidence === "low") return decision;
  if (context.qualifier?.includes("bottom quartile") && decision.trainingIntent === "Push") {
    return { ...decision, trainingIntent: "Maintain" as const };
  }
  return decision;
}

export async function buildHistoricalContext(
  readiness: DailyReadiness,
  now = new Date(),
): Promise<DailyHistoricalContext> {
  const importRow = await dbGet<{ imported_at: string; date_end: string | null }>(
    "SELECT imported_at, date_end FROM whoop_export_imports ORDER BY imported_at DESC LIMIT 1",
  );
  if (!importRow) {
    return { available: false, importAgeTier: "missing", coverageEnd: null, confidence: "low", qualifier: null, strongestDeviation: null, behaviorCue: null };
  }

  const start = new Date(now.getTime() - 90 * 86_400_000).toISOString();
  const [exportRows, apiRows] = await Promise.all([
    dbAll<HistoricalRow>(`
      SELECT cycle_start AS date, recovery_score AS recovery,
             asleep_minutes / 60.0 AS sleep, hrv_rmssd_milli AS hrv,
             resting_heart_rate AS rhr
      FROM whoop_export_cycles WHERE cycle_start >= ? ORDER BY cycle_start
    `, start),
    dbAll<HistoricalRow>(`
      SELECT r.created_at AS date, r.recovery_score AS recovery,
             (s.total_light_sleep_time_milli + s.total_slow_wave_sleep_time_milli + s.total_rem_sleep_time_milli) / 3600000.0 AS sleep,
             r.hrv_rmssd_milli AS hrv, r.resting_heart_rate AS rhr
      FROM whoop_recovery_summaries r
      LEFT JOIN whoop_sleep_summaries s ON s.cycle_id = r.cycle_id
      WHERE r.created_at >= ? ORDER BY r.created_at
    `, start),
  ]);
  const merged = new Map(exportRows.map((row) => [row.date.slice(0, 10), row]));
  apiRows.forEach((row) => merged.set(row.date.slice(0, 10), row));
  const rows = [...merged.values()];
  const metric = (key: keyof Pick<HistoricalRow, "recovery" | "sleep" | "hrv" | "rhr">) =>
    rows.map((row) => row[key]).filter((value): value is number => typeof value === "number");
  const candidates = [
    { label: "Recovery", value: readiness.recoveryScore, values: metric("recovery"), lowerBad: true },
    { label: "Sleep", value: readiness.sleepHours, values: metric("sleep"), lowerBad: true },
    { label: "HRV", value: readiness.hrvRmssd, values: metric("hrv"), lowerBad: true },
    { label: "Resting HR", value: readiness.restingHeartRate, values: metric("rhr"), lowerBad: false },
  ].map((item) => ({ ...item, percentile: percentile(item.values, item.value), baseline: median(item.values) }));
  const strongest = candidates
    .filter((item) => item.percentile !== null)
    .sort((a, b) => Math.abs((a.percentile ?? 50) - 50) - Math.abs((b.percentile ?? 50) - 50))
    .at(-1);
  const ageDays = Math.floor((now.getTime() - new Date(importRow.imported_at).getTime()) / 86_400_000);
  const importAgeTier = ageDays <= 45 ? "current" : ageDays <= 90 ? "aging" : "legacy";
  const qualifier = strongest?.percentile === null || strongest?.percentile === undefined
    ? null
    : `${strongest.label} is in your ${strongest.percentile <= 25 ? "bottom quartile" : strongest.percentile >= 75 ? "top quartile" : `${strongest.percentile}th percentile`}.`;

  return {
    available: rows.length >= 14,
    importAgeTier,
    coverageEnd: importRow.date_end,
    confidence: rows.length >= 60 && importAgeTier !== "legacy" ? "high" : rows.length >= 14 ? "medium" : "low",
    qualifier,
    strongestDeviation:
      !strongest || strongest.baseline === null || strongest.value === null
        ? null
        : `${strongest.label}: ${strongest.value.toFixed(1)} vs ${strongest.baseline.toFixed(1)} personal median`,
    behaviorCue: null,
  };
}
