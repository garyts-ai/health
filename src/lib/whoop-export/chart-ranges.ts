import type { WhoopAnalysisReport, WhoopMetric } from "@/lib/whoop-export/analysis";
import { calendarDaysIntervalEnding, isInCalendarInterval } from "@/lib/calendar";

export type WhoopChartRange = "week" | "30d" | "3m" | "1y" | "all";

export const WHOOP_CHART_RANGE_STORAGE_KEY = "healthmax:whoop-chart-range:v1";
export const DEFAULT_WHOOP_CHART_RANGE: WhoopChartRange = "30d";

export const WHOOP_CHART_RANGES: Array<{
  key: WhoopChartRange;
  label: string;
  days: number | null;
}> = [
  { key: "week", label: "Week", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "3m", label: "3 months", days: 90 },
  { key: "1y", label: "1 year", days: 365 },
  { key: "all", label: "All time", days: null },
];

function comparisonDirection(
  baseline: number | null,
  recent: number | null,
  tolerance = 0.05,
): WhoopMetric["direction"] {
  if (baseline === null || recent === null) return "missing";
  const delta = recent - baseline;
  if (Math.abs(delta) <= tolerance) return "flat";
  return delta > 0 ? "up" : "down";
}

export function parseWhoopChartRange(value: string | null | undefined): WhoopChartRange {
  return WHOOP_CHART_RANGES.some((range) => range.key === value)
    ? (value as WhoopChartRange)
    : DEFAULT_WHOOP_CHART_RANGE;
}

export function filterWhoopChartValues(
  values: WhoopAnalysisReport["series"][number]["values"],
  range: WhoopChartRange,
) {
  if (range === "all" || values.length === 0) return values;
  const days = WHOOP_CHART_RANGES.find((item) => item.key === range)?.days;
  if (!days) return values;

  const newestTime = Math.max(...values.map((point) => new Date(point.date).getTime()));
  const interval = calendarDaysIntervalEnding(new Date(newestTime), days);
  return values.filter((point) => isInCalendarInterval(point.date, interval));
}

export function summarizeWhoopChartRange(
  series: WhoopAnalysisReport["series"][number],
  range: WhoopChartRange,
) {
  const values = filterWhoopChartValues(series.values, range);
  const numeric = values
    .map((point) => point.value)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const average =
    numeric.length === 0
      ? null
      : numeric.reduce((sum, value) => sum + value, 0) / numeric.length;

  return {
    values,
    observationCount: numeric.length,
    average,
    latest: numeric.at(-1) ?? null,
    direction: comparisonDirection(series.baseline, average),
  };
}
