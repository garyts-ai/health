import { shiftCalendarDateKey } from "@/lib/calendar";
import { mad, median, round } from "@/lib/longitudinal/statistics";
import type {
  AnalysisFinding,
  AnalysisRange,
  LongitudinalAnalysis,
  MetricTrend,
} from "@/lib/longitudinal/types";

export const ANALYSIS_METHOD_VERSION = "whoop-observatory-v1";
export const ANALYSIS_METRIC_IDS = [
  "hrv", "resting_heart_rate", "respiratory_rate", "skin_temperature", "spo2", "recovery",
  "sleep_duration", "sleep_need", "sleep_efficiency", "sleep_consistency", "day_strain", "aerobic_minutes",
  "walking_minutes", "strength_frequency", "strength_sets", "body_weight",
] as const;

export const ANALYSIS_RANGES: ReadonlyArray<{ id: AnalysisRange; label: string; days: number | null }> = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "365d", label: "1 year", days: 365 },
  { id: "all", label: "All", days: null },
];

const MIN_PERIOD_COVERAGE = 0.7;
const MIN_PERIOD_POINTS = 5;
const MIN_PERSONAL_BASELINE_DAYS = 14;
const PERSONAL_BASELINE_DAYS = 28;

export function isAnalysisRange(value: string | null): value is AnalysisRange {
  return ANALYSIS_RANGES.some((range) => range.id === value);
}

export function analysisRangeDays(range: AnalysisRange) {
  return ANALYSIS_RANGES.find((item) => item.id === range)?.days ?? null;
}

export function validAnalysisEndDate(value: string | null, today: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return today;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return today;
  return value > today ? today : value;
}

function dailyValues(metric: MetricTrend, start: string, end: string) {
  const buckets = new Map<string, { values: number[]; sources: Set<MetricTrend["provenance"]["sources"][number]> }>();
  for (const point of metric.points) {
    if (point.date < start || point.date > end || typeof point.value !== "number" || !Number.isFinite(point.value)) continue;
    const bucket = buckets.get(point.date) ?? { values: [], sources: new Set<MetricTrend["provenance"]["sources"][number]>() };
    bucket.values.push(point.value);
    for (const source of point.sources ?? []) bucket.sources.add(source);
    buckets.set(point.date, bucket);
  }
  return [...buckets.entries()]
    .map(([date, bucket]) => ({ date, value: median(bucket.values)!, sources: [...bucket.sources] }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function sourcesFor(metric: MetricTrend, ...periods: Array<Array<{ sources: MetricTrend["provenance"]["sources"] }>>) {
  const sources = [...new Set(periods.flatMap((period) => period.flatMap((point) => point.sources)))].sort();
  return sources.length ? sources : metric.provenance.sources;
}

function share(values: Array<{ date: string; value: number }>, expected: number) {
  return expected > 0 ? Math.min(1, new Set(values.map((item) => item.date)).size / expected) : 0;
}

function findingFor(metric: MetricTrend, start: string, end: string, comparisonStart: string | null, comparisonEnd: string | null): AnalysisFinding | null {
  const days = comparisonEnd && comparisonStart
    ? Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86_400_000) + 1
    : null;
  const current = dailyValues(metric, start, end);
  const reference = comparisonStart && comparisonEnd ? dailyValues(metric, comparisonStart, comparisonEnd) : [];
  const currentCoverage = days === null ? 0 : share(current, days);
  const comparisonCoverage = days === null ? null : share(reference, days);
  const currentMedian = median(current.map((item) => item.value));
  const comparisonMedian = median(reference.map((item) => item.value));
  if (currentMedian === null) return null;
  const difference = comparisonMedian === null ? null : currentMedian - comparisonMedian;
  const relativeDifference = difference === null || comparisonMedian === null || comparisonMedian === 0 ? null : difference / Math.abs(comparisonMedian);
  const baselineStart = shiftCalendarDateKey(start, -PERSONAL_BASELINE_DAYS);
  const baselineEnd = shiftCalendarDateKey(start, -1);
  const personalBaseline = dailyValues(metric, baselineStart, baselineEnd).map((item) => item.value);
  const baselineMad = personalBaseline.length >= MIN_PERSONAL_BASELINE_DAYS ? mad(personalBaseline) : null;
  const standardizedDifference = difference === null || baselineMad === null || baselineMad === 0
    ? null
    : difference / (baselineMad * 1.4826);
  const meaningfulDirection = difference === null ? 0 : Math.sign(difference);
  const persistenceDays = difference === null || comparisonMedian === null || meaningfulDirection === 0
    ? 0
    : current.filter((item) => Math.sign(item.value - comparisonMedian!) === meaningfulDirection).length;
  const eligible = days !== null && current.length >= MIN_PERIOD_POINTS && reference.length >= MIN_PERIOD_POINTS
    && currentCoverage >= MIN_PERIOD_COVERAGE && (comparisonCoverage ?? 0) >= MIN_PERIOD_COVERAGE;
  const evidence = eligible ? "supported" : current.length >= MIN_PERIOD_POINTS ? "exploratory" : "insufficient";
  const digits = metric.unit === "h" || metric.unit === "ms" || metric.unit === "bpm" ? 1 : 2;
  const delta = difference === null ? null : round(difference, digits);
  const sign = delta !== null && delta > 0 ? "+" : "";
  const unit = metric.unit ? ` ${metric.unit}` : "";
  const summary = comparisonMedian === null
    ? `${metric.label} measured ${round(currentMedian, digits)}${unit} from ${start} through ${end} across ${current.length} observed days.`
    : `${metric.label} changed ${sign}${delta}${unit} from ${start} through ${end} versus ${comparisonStart} through ${comparisonEnd} (${current.length} versus ${reference.length} observed days).`;
  return {
    id: `period-${metric.id}-${start}-${end}`,
    kind: "period_difference",
    metricId: metric.id,
    label: metric.label,
    unit: metric.unit,
    currentStart: start,
    currentEnd: end,
    comparisonStart,
    comparisonEnd,
    currentMedian: round(currentMedian, digits) ?? currentMedian,
    comparisonMedian: comparisonMedian === null ? null : round(comparisonMedian, digits),
    difference: delta,
    relativeDifference: round(relativeDifference, 3),
    standardizedDifference: round(standardizedDifference, 2),
    slopePerWeek: null,
    currentCount: current.length,
    comparisonCount: reference.length,
    currentCoverage: round(currentCoverage, 3) ?? 0,
    comparisonCoverage: comparisonCoverage === null ? null : round(comparisonCoverage, 3),
    persistenceDays,
    evidence,
    source: sourcesFor(metric, current, reference),
    summary: evidence === "supported" ? summary : `${summary} Coverage is below the supported comparison threshold.`,
  };
}

function sustainedTrend(metric: MetricTrend, start: string, end: string): AnalysisFinding | null {
  if ((metric.direction !== "upward" && metric.direction !== "downward") || metric.slopePerWeek === null || metric.confidence === "low" || metric.confidence === "insufficient") return null;
  const values = dailyValues(metric, start, end);
  if (values.length < 28 || metric.persistenceDays <= 0) return null;
  const currentMedian = median(values.map((item) => item.value));
  if (currentMedian === null) return null;
  const slope = metric.slopePerWeek;
  const sign = slope > 0 ? "+" : "";
  return {
    id: `trend-${metric.id}-${start}-${end}`, kind: "sustained_trend",
    metricId: metric.id, label: metric.label, unit: metric.unit,
    currentStart: values[0].date, currentEnd: values.at(-1)!.date,
    comparisonStart: null, comparisonEnd: null,
    currentMedian: round(currentMedian, 2) ?? currentMedian,
    comparisonMedian: null, difference: null, relativeDifference: null,
    standardizedDifference: null, slopePerWeek: round(slope, 2),
    currentCount: values.length, comparisonCount: 0, currentCoverage: metric.coverage, comparisonCoverage: null,
    persistenceDays: metric.persistenceDays, evidence: "supported", source: sourcesFor(metric, values),
    summary: `${metric.label} had a sustained ${metric.direction} pattern at ${sign}${round(slope, 2)}${metric.unit ? ` ${metric.unit}` : ""} per week across ${values.length} observed days.`,
  };
}

function currentDeviation(metric: MetricTrend, endDate: string): AnalysisFinding | null {
  const point = [...metric.points].reverse().find((item) => item.date === endDate && item.value !== null && item.personalRange && item.personalRange.status !== "within");
  if (!point || point.value === null || !point.personalRange) return null;
  const rangeStart = shiftCalendarDateKey(endDate, -28);
  const status = point.personalRange.status;
  const baselineStart = shiftCalendarDateKey(endDate, -28);
  const baselinePoints = metric.points.filter((item) => item.date >= baselineStart && item.date <= endDate && item.value !== null)
    .map((item) => ({ sources: item.sources ?? [] }));
  return {
    id: `deviation-${metric.id}-${endDate}`, kind: "current_deviation",
    metricId: metric.id, label: metric.label, unit: metric.unit,
    currentStart: endDate, currentEnd: endDate, comparisonStart: rangeStart, comparisonEnd: shiftCalendarDateKey(endDate, -1),
    currentMedian: point.value, comparisonMedian: point.personalRange.center,
    difference: round(point.value - point.personalRange.center, 2),
    relativeDifference: point.personalRange.center === 0 ? null : round((point.value - point.personalRange.center) / Math.abs(point.personalRange.center), 3),
    standardizedDifference: point.personalRange.robustZScore, slopePerWeek: null,
    currentCount: 1, comparisonCount: point.personalRange.sampleCount, currentCoverage: 1,
    comparisonCoverage: Math.min(1, point.personalRange.sampleCount / 28), persistenceDays: 1,
    evidence: "supported", source: sourcesFor(metric, baselinePoints),
    summary: `${metric.label} was ${status} the recent personal range on ${endDate}: ${point.value} versus a 28-day median of ${point.personalRange.center}${metric.unit ? ` ${metric.unit}` : ""} (${point.personalRange.sampleCount} prior observed days).`,
  };
}

const FINDING_GROUPS: Record<string, string> = {
  hrv: "physiology", resting_heart_rate: "physiology", respiratory_rate: "physiology", spo2: "physiology", recovery: "physiology",
  sleep_duration: "sleep", sleep_need: "sleep", sleep_efficiency: "sleep", sleep_consistency: "sleep",
  day_strain: "activity",
};

function findingRank(item: AnalysisFinding) {
  const completeness = Math.min(item.currentCoverage, item.comparisonCoverage ?? (item.kind === "current_deviation" ? item.comparisonCount / 28 : item.currentCoverage));
  const effect = item.standardizedDifference !== null
    ? Math.abs(item.standardizedDifference)
    : Math.abs(item.relativeDifference ?? 0);
  const persistence = Math.min(1, item.persistenceDays / Math.max(1, item.currentCount));
  return completeness * (effect + persistence * 0.25) * (item.kind === "current_deviation" ? 0.85 : 1);
}

export function buildLongitudinalAnalysis(metrics: MetricTrend[], range: AnalysisRange, endDate: string): LongitudinalAnalysis {
  const days = analysisRangeDays(range);
  const currentStart = days === null ? metrics.flatMap((metric) => metric.points.map((point) => point.date)).filter((date) => date <= endDate).sort()[0] ?? endDate
    : shiftCalendarDateKey(endDate, -(days - 1));
  const comparisonEnd = days === null ? null : shiftCalendarDateKey(currentStart, -1);
  const comparisonStart = days === null ? null : shiftCalendarDateKey(comparisonEnd!, -(days - 1));
  const eligibleMetrics = metrics.filter((metric) => FINDING_GROUPS[metric.id]);
  const candidates = eligibleMetrics.flatMap((metric) => {
    const period = days === null ? sustainedTrend(metric, currentStart, endDate) : findingFor(metric, currentStart, endDate, comparisonStart, comparisonEnd);
    return [period, currentDeviation(metric, endDate)].filter((item): item is AnalysisFinding => Boolean(item));
  });
  const supportedIds = new Set(candidates.filter((item) => item.evidence === "supported").map((item) => item.metricId));
  const bestByGroup = new Map<string, AnalysisFinding>();
  for (const item of candidates.filter((candidate) => candidate.evidence === "supported")) {
    const group = FINDING_GROUPS[item.metricId];
    const prior = bestByGroup.get(group);
    if (!prior || findingRank(item) > findingRank(prior)) bestByGroup.set(group, item);
  }
  const findings = [...bestByGroup.values()]
    .filter((item) => item.evidence === "supported" && ((item.difference !== null && item.difference !== 0) || item.slopePerWeek !== null))
    .sort((left, right) => findingRank(right) - findingRank(left))
    .slice(0, 3);
  const exclusions = [...new Set(candidates.filter((item) => item.evidence !== "supported" && !supportedIds.has(item.metricId))
    .map((item) => `${item.metricId}: insufficient matched coverage (${item.currentCount}/${item.comparisonCount}).`))];
  return {
    methodVersion: ANALYSIS_METHOD_VERSION,
    range,
    endDate,
    startDate: currentStart,
    comparisonStartDate: comparisonStart,
    comparisonEndDate: comparisonEnd,
    findings,
    eligibleMetricCount: supportedIds.size,
    excludedMetricCount: eligibleMetrics.length - supportedIds.size,
    exclusions,
  };
}
