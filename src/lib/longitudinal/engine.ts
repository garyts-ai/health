import { dbAll } from "@/lib/db";
import { calendarDateKey, shiftCalendarDateKey, HEALTH_TIME_ZONE } from "@/lib/calendar";
import { clamp01, mad, median, percentile, round, theilSen } from "@/lib/longitudinal/statistics";
import { buildAlcoholLogView } from "@/lib/longitudinal/alcohol-log";
import { classifyJournalQuestion, deduplicateJournalRows, normalizeJournalQuestion } from "@/lib/longitudinal/journal";
import type {
  AggregateTrend,
  CurrentDeviation,
  DataCoverage,
  DomainCardViewModel,
  HealthDomainTrend,
  JournalEventViewModel,
  LongitudinalHealthView,
  MetricPoint,
  MetricTrend,
  RecordedAssociation,
  SourceProvenance,
  TrendConfidence,
  TrendDirection,
  TrendInterpretation,
} from "@/lib/longitudinal/types";

const RECENT_DAYS = 30;
const TREND_DAYS = 90;
const MIN_TREND_POINTS = 28;
const MIN_ASSOCIATION_EXPOSED = 12;
const MIN_ASSOCIATION_COMPARISON = 24;
const ROBUST_Z_THRESHOLD = 2.5;

type LiveDayRow = {
  source_record_id: string | number;
  cycle_start: string;
  sleep_end: string | null;
  timezone_offset: string | null;
  synced_at: string;
  recovery_score: number | null;
  resting_heart_rate: number | null;
  hrv_rmssd_milli: number | null;
  skin_temp_celsius: number | null;
  spo2_percentage: number | null;
  day_strain: number | null;
  respiratory_rate: number | null;
  asleep_minutes: number | null;
  sleep_efficiency: number | null;
  sleep_consistency: number | null;
};

type ExportDayRow = Omit<LiveDayRow, "source_record_id" | "sleep_end" | "synced_at"> & {
  cycle_start: string;
  wake_onset: string | null;
};

type BodyRow = {
  observed_on: string;
  observed_at: string;
  weight_kilogram: number | null;
  synced_at: string;
};

type HevyRow = {
  id: string;
  start_time: string;
  set_count: number;
  volume_kg: number | null;
  duration_seconds: number | null;
  raw_json: string;
  synced_at: string;
};

type WorkoutRow = {
  id: string;
  sport_name: string | null;
  start: string;
  end: string;
  strain: number | null;
  distance_meter: number | null;
  zone_one_milli: number | null;
  zone_two_milli: number | null;
  zone_three_milli: number | null;
  zone_four_milli: number | null;
  zone_five_milli: number | null;
  synced_at: string;
};

type JournalRow = {
  id: string;
  cycle_start: string | null;
  question_text: string;
  answered_yes: number;
};

type JournalImportRow = {
  imported_at: string;
  date_end: string | null;
};

export type LongitudinalEngineInput = {
  now: Date;
  liveDays: LiveDayRow[];
  exportDays: ExportDayRow[];
  bodyRows: BodyRow[];
  hevyRows: HevyRow[];
  workoutRows: WorkoutRow[];
  journalRows: JournalRow[];
  journalImports?: JournalImportRow[];
  exportWorkoutRows: ExportWorkoutRow[];
};

type ExportWorkoutRow = {
  workout_start: string;
  workout_end: string | null;
  activity_name: string | null;
  duration_minutes: number | null;
  zone_2_percentage: number | null;
  zone_3_percentage: number | null;
  zone_4_percentage: number | null;
  zone_5_percentage: number | null;
};

type CanonicalDay = {
  date: string;
  source: "WHOOP live API" | "WHOOP export";
  sourceRecordId: string;
  rawTimestamp: string;
  timezoneOffset: string | null;
  syncTimestamp: string | null;
  recovery: number | null;
  rhr: number | null;
  hrv: number | null;
  skinTemp: number | null;
  spo2: number | null;
  strain: number | null;
  respiratory: number | null;
  sleepHours: number | null;
  sleepEfficiency: number | null;
  sleepConsistency: number | null;
};

type SeriesPoint = {
  date: string;
  value: number;
  source: SourceProvenance["sources"][number];
  sourceRecordId: string;
  rawTimestamp: string;
  syncTimestamp: string | null;
};

type ActivityPoint = SeriesPoint & { sport: string };

type MetricConfig = {
  id: string;
  domainId: string;
  label: string;
  unit: string;
  favorable: "up" | "down" | "neutral";
  absoluteThreshold: number;
  relativeThreshold: number;
  digits?: number;
  expectedCadence?: "daily" | "weekly";
};

export const LONGITUDINAL_THRESHOLDS = {
  defaultWindowDays: 180,
  minimumTrendPoints: MIN_TREND_POINTS,
  moderateCoverage: 0.75,
  highCoverage: 0.85,
  minimumAssociationExposed: MIN_ASSOCIATION_EXPOSED,
  minimumAssociationComparison: MIN_ASSOCIATION_COMPARISON,
  robustDeviationZ: ROBUST_Z_THRESHOLD,
} as const;

const METRICS: Record<string, MetricConfig> = {
  hrv: { id: "hrv", domainId: "physiology", label: "HRV", unit: "ms", favorable: "up", absoluteThreshold: 3, relativeThreshold: 0.06 },
  rhr: { id: "resting_heart_rate", domainId: "physiology", label: "Resting heart rate", unit: "bpm", favorable: "down", absoluteThreshold: 2, relativeThreshold: 0.035 },
  respiratory: { id: "respiratory_rate", domainId: "physiology", label: "Respiratory rate", unit: "rpm", favorable: "neutral", absoluteThreshold: 0.5, relativeThreshold: 0.04 },
  skinTemp: { id: "skin_temperature", domainId: "physiology", label: "Skin temperature", unit: "°C", favorable: "neutral", absoluteThreshold: 0.25, relativeThreshold: 0.01 },
  spo2: { id: "spo2", domainId: "physiology", label: "Blood oxygen", unit: "%", favorable: "neutral", absoluteThreshold: 1, relativeThreshold: 0.01 },
  recovery: { id: "recovery", domainId: "physiology", label: "Recovery", unit: "%", favorable: "neutral", absoluteThreshold: 5, relativeThreshold: 0.08 },
  sleepHours: { id: "sleep_duration", domainId: "sleep", label: "Sleep duration", unit: "h", favorable: "up", absoluteThreshold: 0.3, relativeThreshold: 0.05 },
  sleepEfficiency: { id: "sleep_efficiency", domainId: "sleep", label: "Sleep efficiency", unit: "%", favorable: "up", absoluteThreshold: 2, relativeThreshold: 0.025 },
  sleepConsistency: { id: "sleep_consistency", domainId: "sleep", label: "Sleep consistency", unit: "%", favorable: "up", absoluteThreshold: 3, relativeThreshold: 0.04 },
  strain: { id: "day_strain", domainId: "cardiovascularActivity", label: "Day Strain", unit: "", favorable: "neutral", absoluteThreshold: 1, relativeThreshold: 0.1 },
  aerobicMinutes: { id: "aerobic_minutes", domainId: "cardiovascularActivity", label: "Recorded aerobic minutes", unit: "min/week", favorable: "up", absoluteThreshold: 25, relativeThreshold: 0.2, expectedCadence: "weekly" },
  walkingMinutes: { id: "walking_minutes", domainId: "dailyMovement", label: "Recorded walking minutes", unit: "min/week", favorable: "up", absoluteThreshold: 20, relativeThreshold: 0.2, expectedCadence: "weekly" },
  strengthFrequency: { id: "strength_frequency", domainId: "strength", label: "Strength sessions", unit: "/week", favorable: "up", absoluteThreshold: 0.5, relativeThreshold: 0.2, expectedCadence: "weekly" },
  strengthSets: { id: "strength_sets", domainId: "strength", label: "Strength sets", unit: "/week", favorable: "neutral", absoluteThreshold: 5, relativeThreshold: 0.2, expectedCadence: "weekly" },
  weight: { id: "body_weight", domainId: "bodyWeight", label: "Body weight", unit: "lb", favorable: "neutral", absoluteThreshold: 2.2, relativeThreshold: 0.015, digits: 1, expectedCadence: "weekly" },
};

/** WHOOP stores body measurements in kilograms; the product displays pounds. */
export const KILOGRAMS_TO_POUNDS = 2.2046226218;

function provenance(points: SeriesPoint[]): SourceProvenance {
  return {
    sources: [...new Set(points.map((point) => point.source))],
    sourceRecordIds: [...new Set(points.map((point) => point.sourceRecordId))],
    rawTimestamps: [...new Set(points.map((point) => point.rawTimestamp))],
    normalizedDates: [...new Set(points.map((point) => point.date))],
    timezone: HEALTH_TIME_ZONE,
    syncTimestamps: [...new Set(points.map((point) => point.syncTimestamp).filter((value): value is string => Boolean(value)))],
  };
}

function canonicalize(input: LongitudinalEngineInput) {
  const days = new Map<string, CanonicalDay>();
  for (const row of input.exportDays) {
    const timestamp = row.wake_onset ?? row.cycle_start;
    const date = calendarDateKey(timestamp);
    days.set(date, {
      date, source: "WHOOP export", sourceRecordId: row.cycle_start, rawTimestamp: timestamp,
      timezoneOffset: row.timezone_offset, syncTimestamp: null, recovery: row.recovery_score,
      rhr: row.resting_heart_rate, hrv: row.hrv_rmssd_milli, skinTemp: row.skin_temp_celsius,
      spo2: row.spo2_percentage, strain: row.day_strain, respiratory: row.respiratory_rate,
      sleepHours: row.asleep_minutes === null ? null : row.asleep_minutes / 60,
      sleepEfficiency: row.sleep_efficiency, sleepConsistency: row.sleep_consistency,
    });
  }
  for (const row of input.liveDays) {
    const timestamp = row.sleep_end ?? row.cycle_start;
    const date = calendarDateKey(timestamp);
    days.set(date, {
      date, source: "WHOOP live API", sourceRecordId: String(row.source_record_id), rawTimestamp: timestamp,
      timezoneOffset: row.timezone_offset, syncTimestamp: row.synced_at, recovery: row.recovery_score,
      rhr: row.resting_heart_rate, hrv: row.hrv_rmssd_milli, skinTemp: row.skin_temp_celsius,
      spo2: row.spo2_percentage, strain: row.day_strain, respiratory: row.respiratory_rate,
      sleepHours: row.asleep_minutes === null ? null : row.asleep_minutes / 60,
      sleepEfficiency: row.sleep_efficiency, sleepConsistency: row.sleep_consistency,
    });
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function dailySeries(days: CanonicalDay[], key: keyof CanonicalDay): SeriesPoint[] {
  return days.flatMap((day) => {
    const value = day[key];
    return typeof value === "number" && Number.isFinite(value)
      ? [{ date: day.date, value, source: day.source, sourceRecordId: day.sourceRecordId, rawTimestamp: day.rawTimestamp, syncTimestamp: day.syncTimestamp }]
      : [];
  });
}

function weekKey(date: string) {
  const instant = new Date(`${date}T12:00:00.000Z`);
  const day = instant.getUTCDay();
  return shiftCalendarDateKey(date, -((day + 6) % 7));
}

function weeklySum(points: SeriesPoint[]) {
  const groups = new Map<string, SeriesPoint[]>();
  for (const point of points) groups.set(weekKey(point.date), [...(groups.get(weekKey(point.date)) ?? []), point]);
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => ({
    date,
    value: rows.reduce((sum, row) => sum + row.value, 0),
    source: rows[0].source,
    sourceRecordId: rows.map((row) => row.sourceRecordId).join(","),
    rawTimestamp: rows.at(-1)?.rawTimestamp ?? date,
    syncTimestamp: rows.at(-1)?.syncTimestamp ?? null,
  }));
}

function trendConfidence(config: MetricConfig, count: number, expected: number): TrendConfidence {
  const coverage = clamp01(count / expected);
  const minimum = config.expectedCadence === "weekly" ? 4 : Math.min(MIN_TREND_POINTS, expected);
  if (count < minimum) return "insufficient";
  if (coverage >= LONGITUDINAL_THRESHOLDS.highCoverage) return "high";
  if (coverage >= LONGITUDINAL_THRESHOLDS.moderateCoverage) return "moderate";
  return "low";
}

function movementInterpretation(direction: TrendDirection, favorable: MetricConfig["favorable"]): TrendInterpretation {
  if (direction === "stable") return "neutral";
  if (direction === "insufficient_data" || favorable === "neutral") return favorable === "neutral" ? "neutral" : "unknown";
  if (direction === "upward") return favorable === "up" ? "favorable" : "unfavorable";
  if (direction === "downward") return favorable === "down" ? "favorable" : "unfavorable";
  return "unknown";
}

function buildMetric(config: MetricConfig, allPoints: SeriesPoint[], selectedDate: string, windowDays: number): MetricTrend {
  const startDate = shiftCalendarDateKey(selectedDate, -(windowDays - 1));
  const points = allPoints.filter((point) => point.date >= startDate && point.date <= selectedDate);
  const chartPoints = allPoints.filter((point) => point.date <= selectedDate);
  const expectedDays = config.expectedCadence === "weekly" ? Math.ceil(windowDays / 7) : windowDays;
  const coveredDays = config.expectedCadence === "weekly" ? new Set(points.map((point) => weekKey(point.date))).size : new Set(points.map((point) => point.date)).size;
  const coverage = clamp01(coveredDays / expectedDays);
  const comparisonDays = Math.min(TREND_DAYS, windowDays);
  const recentDays = windowDays <= 30 ? 14 : RECENT_DAYS;
  const recentStart = shiftCalendarDateKey(selectedDate, -(recentDays - 1));
  const baselineEnd = shiftCalendarDateKey(recentStart, -1);
  const baselineStart = shiftCalendarDateKey(selectedDate, -(comparisonDays - 1));
  const recentValues = points.filter((point) => point.date >= recentStart).map((point) => point.value);
  const baselineValues = points.filter((point) => point.date >= baselineStart && point.date <= baselineEnd).map((point) => point.value);
  const currentValue = median(recentValues);
  const baselineValue = median(baselineValues);
  const absoluteChange = currentValue === null || baselineValue === null ? null : currentValue - baselineValue;
  const relativeChange = absoluteChange === null || baselineValue === null || baselineValue === 0 ? null : absoluteChange / Math.abs(baselineValue);
  const weekly = new Map<string, number[]>();
  for (const point of points.filter((point) => point.date >= baselineStart)) weekly.set(weekKey(point.date), [...(weekly.get(weekKey(point.date)) ?? []), point.value]);
  const weeklyPoints = [...weekly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, values], index) => ({ x: index, y: median(values) ?? 0 }));
  const slopePerWeek = theilSen(weeklyPoints);
  const baselineNoise = mad(baselineValues);
  const normalizedEffect = absoluteChange === null || baselineNoise === null
    ? null
    : baselineNoise === 0 ? (absoluteChange === 0 ? 0 : Number.POSITIVE_INFINITY) : Math.abs(absoluteChange) / (baselineNoise * 1.4826);
  const thresholdMet = absoluteChange !== null && relativeChange !== null
    && (Math.abs(absoluteChange) >= config.absoluteThreshold || Math.abs(relativeChange) >= config.relativeThreshold)
    && (normalizedEffect ?? 0) >= 0.5;
  const slopeAligned = slopePerWeek !== null && absoluteChange !== null && (Math.sign(slopePerWeek) === Math.sign(absoluteChange) || Math.abs(slopePerWeek) < config.absoluteThreshold / 8);
  const trendExpected = config.expectedCadence === "weekly" ? Math.ceil(comparisonDays / 7) : comparisonDays;
  const trendCount = config.expectedCadence === "weekly" ? weeklyPoints.length : points.filter((point) => point.date >= baselineStart).length;
  const confidence = trendConfidence(config, trendCount, trendExpected);
  const persistenceWindow = weeklyPoints.slice(-(windowDays <= 30 ? 4 : 8));
  const candidateSign = (absoluteChange ?? 0) >= 0 ? 1 : -1;
  const alignedWeeks = persistenceWindow.filter((point) => (point.y - (baselineValue ?? point.y)) * candidateSign >= config.absoluteThreshold * 0.1).length;
  const persistenceMet = persistenceWindow.length >= (windowDays <= 30 ? 4 : 8)
    && alignedWeeks >= (windowDays <= 30 ? 3 : 6);
  let direction: TrendDirection = "stable";
  if (confidence === "insufficient" || currentValue === null || baselineValue === null || weeklyPoints.length < 4) direction = "insufficient_data";
  else if (thresholdMet && slopeAligned && persistenceMet) direction = (absoluteChange ?? 0) > 0 ? "upward" : "downward";
  const interpretation = movementInterpretation(direction, config.favorable);
  let persistenceDays = 0;
  if (direction === "upward" || direction === "downward") {
    const sign = direction === "upward" ? 1 : -1;
    for (const point of [...persistenceWindow].reverse()) {
      if ((point.y - (baselineValue ?? point.y)) * sign >= config.absoluteThreshold * 0.1) persistenceDays += 7;
      else break;
    }
  }
  const digits = config.digits ?? (config.unit === "%" || config.unit === "bpm" ? 1 : 2);
  const deltaText = absoluteChange === null ? "" : `${Math.abs(absoluteChange).toFixed(digits)}${config.unit ? ` ${config.unit}` : ""}`;
  const observation = direction === "insufficient_data"
    ? `${config.label} does not have enough covered observations for a supported long-term direction.`
    : direction === "stable"
      ? `${config.label} remained stable across the available 90-day comparison.`
      : `${config.label} trended ${direction === "upward" ? "upward" : "downward"} by ${deltaText} across the available 90-day comparison.`;
  const values = points.map((point) => point.value);
  return {
    id: config.id, domainId: config.domainId, label: config.label, unit: config.unit, direction, interpretation,
    confidence, statementType: direction === "insufficient_data" ? "data_limitation" : "trend_description", observation,
    windowDays, startDate: points[0]?.date ?? null, endDate: points.at(-1)?.date ?? null,
    currentValue: round(currentValue, digits), baselineValue: round(baselineValue, digits),
    absoluteChange: round(absoluteChange, digits), relativeChange: round(relativeChange, 3), slopePerWeek: round(slopePerWeek, digits),
    persistenceDays, personalPercentile: percentile(values, points.at(-1)?.value ?? null), variability: round(mad(values), digits),
    coveredDays, expectedDays, coverage: round(coverage, 3) ?? 0,
    points: metricPointsWithPersonalRanges(chartPoints, digits), provenance: provenance(points),
    limitations: [
      ...(confidence === "low" || confidence === "insufficient" ? ["Limited coverage reduces confidence in the estimated direction."] : []),
      ...(!persistenceMet && thresholdMet ? ["The measured change did not persist in enough recent weekly medians."] : []),
    ],
  };
}

export function metricPointsWithPersonalRanges(points: Array<{ date: string; value: number | null }>, digits = 2): MetricPoint[] {
  const ordered = [...points].sort((left, right) => left.date.localeCompare(right.date));
  const history: number[] = [];
  const decorated: MetricPoint[] = [];
  for (let index = 0; index < ordered.length;) {
    const date = ordered[index].date;
    const group: Array<{ date: string; value: number | null }> = [];
    while (index < ordered.length && ordered[index].date === date) {
      group.push(ordered[index]);
      index += 1;
    }
    const center = median(history);
    const dispersion = mad(history);
    const rangeDistance = dispersion === null || dispersion === 0 ? null : ROBUST_Z_THRESHOLD * dispersion / 0.6745;
    for (const point of group) {
      const robustZ = point.value === null || center === null || dispersion === null || dispersion === 0 || history.length < 14
        ? null
        : 0.6745 * (point.value - center) / dispersion;
      const personalRange = robustZ === null || center === null || rangeDistance === null
        ? undefined
        : {
            center: round(center, digits) ?? center,
            lower: round(center - rangeDistance, digits) ?? center - rangeDistance,
            upper: round(center + rangeDistance, digits) ?? center + rangeDistance,
            sampleCount: history.length,
            robustZScore: round(robustZ, 2) ?? robustZ,
            status: robustZ >= ROBUST_Z_THRESHOLD ? "above" as const : robustZ <= -ROBUST_Z_THRESHOLD ? "below" as const : "within" as const,
          };
      decorated.push({ date: point.date, value: round(point.value, digits), ...(personalRange ? { personalRange } : {}) });
    }
    history.push(...group.map((point) => point.value).filter((value): value is number => value !== null && Number.isFinite(value)));
  }
  return decorated;
}

function domain(id: string, label: string, metrics: MetricTrend[], extraLimitations: string[] = []): HealthDomainTrend {
  const supported = metrics.filter((metric) => metric.direction !== "insufficient_data");
  const improving = supported.filter((metric) => metric.interpretation === "favorable" && metric.direction !== "stable");
  const weakening = supported.filter((metric) => metric.interpretation === "unfavorable" && metric.direction !== "stable");
  const changed = supported.filter((metric) => metric.direction === "upward" || metric.direction === "downward");
  let direction: TrendDirection = "stable";
  if (!supported.length) direction = "insufficient_data";
  else if (improving.length && weakening.length) direction = "mixed";
  else if (improving.length) direction = "improving";
  else if (weakening.length) direction = "weakening";
  else if (changed.length > 1) direction = "mixed";
  const confidence: TrendConfidence = supported.some((metric) => metric.confidence === "high") ? "high" : supported.some((metric) => metric.confidence === "moderate") ? "moderate" : supported.length ? "low" : "insufficient";
  const ranked = [...changed].sort((a, b) => Math.abs(b.relativeChange ?? 0) - Math.abs(a.relativeChange ?? 0));
  const persistent = [...changed].sort((a, b) => b.persistenceDays - a.persistenceDays);
  return {
    id, label, direction, confidence, metrics, largestShiftMetricId: ranked[0]?.id ?? null,
    mostPersistentMetricId: persistent[0]?.id ?? null,
    summary: direction === "insufficient_data" ? `${label} has insufficient data for a supported trend.` : `${label} is ${direction === "mixed" ? "mixed" : direction}.`,
    limitations: [...new Set([...extraLimitations, ...metrics.flatMap((metric) => metric.limitations)])],
  };
}

function aggregate(metrics: MetricTrend[]): AggregateTrend {
  const excludedIds = ["recovery", "body_weight", "day_strain", "strength_sets", "respiratory_rate", "skin_temperature", "spo2"];
  const included = metrics.filter((metric) => !excludedIds.includes(metric.id) && metric.direction !== "insufficient_data" && metric.confidence !== "low");
  const grouped = new Map<string, MetricTrend[]>();
  for (const metric of included) grouped.set(metric.domainId, [...(grouped.get(metric.domainId) ?? []), metric]);
  const confidenceWeight = (confidence: TrendConfidence) => confidence === "high" ? 1 : confidence === "moderate" ? 0.7 : 0.4;
  const votes = [...grouped.entries()].map(([domainId, domainMetrics]) => {
    const directional = domainMetrics.filter((metric) => metric.direction !== "stable" && (metric.interpretation === "favorable" || metric.interpretation === "unfavorable"));
    const weights = directional.map((metric) => confidenceWeight(metric.confidence));
    const score = directional.length
      ? directional.reduce((sum, metric, index) => sum + weights[index] * (metric.interpretation === "favorable" ? 1 : -1), 0) / weights.reduce((sum, weight) => sum + weight, 0)
      : 0;
    const weight = Math.max(...domainMetrics.map((metric) => confidenceWeight(metric.confidence)));
    return { domainId, score, weight, direction: score > 0.35 ? "improving" : score < -0.35 ? "weakening" : "stable" } as const;
  });
  const improving = votes.filter((vote) => vote.direction === "improving").length;
  const weakening = votes.filter((vote) => vote.direction === "weakening").length;
  const stable = votes.filter((vote) => vote.direction === "stable").length;
  const totalWeight = votes.reduce((sum, vote) => sum + vote.weight, 0);
  const normalizedScore = totalWeight ? votes.reduce((sum, vote) => sum + vote.score * vote.weight, 0) / totalWeight : 0;
  const stableWeight = totalWeight ? votes.filter((vote) => vote.direction === "stable").reduce((sum, vote) => sum + vote.weight, 0) / totalWeight : 0;
  let direction: TrendDirection = "stable";
  if (votes.length < 3) direction = "insufficient_data";
  else if (normalizedScore > 0.35 && improving >= 2) direction = "improving";
  else if (normalizedScore < -0.35 && weakening >= 2) direction = "weakening";
  else if (stableWeight >= 0.6) direction = "stable";
  else direction = "mixed";
  const confidence: TrendConfidence = votes.length < 3 ? "insufficient" : included.some((metric) => metric.confidence === "high") ? "high" : "moderate";
  return {
    direction, confidence, improvingCount: improving, stableCount: stable, weakeningCount: weakening,
    evaluatedMetricCount: votes.length,
    summary: direction === "insufficient_data" ? "Insufficient data" : direction === "stable" ? "Broadly stable" : direction === "mixed" ? "Mixed direction" : direction === "improving" ? "Broadly improving" : "Broadly weakening",
    subtitle: "Describes trends in connected data, not overall health or medical risk.", excludedMetricIds: excludedIds,
  };
}

function currentDeviation(metrics: MetricTrend[], selectedDate: string): CurrentDeviation {
  const deviations = metrics.flatMap((metric) => {
    const latest = metric.points.findLast((point) => point.date === selectedDate);
    if (!latest || latest.value === null || !latest.personalRange || latest.personalRange.status === "within") return [];
    return [{
      metricId: metric.id,
      label: metric.label,
      value: latest.value,
      baselineMedian: latest.personalRange.center,
      robustZScore: latest.personalRange.robustZScore,
      direction: latest.personalRange.status,
      provenance: metric.provenance,
    }];
  });
  const labels = deviations.map((item) => item.label);
  return {
    active: deviations.length > 0, date: selectedDate, deviatingMetricIds: deviations.map((item) => item.metricId), metrics: deviations,
    summary: deviations.length ? `${labels.join(", ")} ${deviations.length === 1 ? "is" : "are"} outside the recent personal range today. Long-term trends are unchanged.` : null,
    changesLongTermAggregate: false,
  };
}

function outcomeThreshold(key: string) {
  if (key === "recovery") return 5;
  if (key === "hrv") return 3;
  return 2;
}

function trimmedMedianDifference(exposed: number[], comparison: number[]) {
  const trim = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const count = Math.floor(sorted.length * 0.1);
    return sorted.slice(count, sorted.length - count || undefined);
  };
  const left = median(trim(exposed));
  const right = median(trim(comparison));
  return left === null || right === null ? null : left - right;
}

function bootstrapMedianInterval(exposed: number[], comparison: number[], iterations = 400) {
  let state = (exposed.length * 2654435761 + comparison.length * 1013904223) >>> 0;
  const random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  const samples: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const left = Array.from({ length: exposed.length }, () => exposed[Math.floor(random() * exposed.length)]);
    const right = Array.from({ length: comparison.length }, () => comparison[Math.floor(random() * comparison.length)]);
    const difference = (median(left) ?? 0) - (median(right) ?? 0);
    samples.push(difference);
  }
  samples.sort((a, b) => a - b);
  return [samples[Math.floor(iterations * 0.025)], samples[Math.floor(iterations * 0.975)]] as const;
}

function associations(journals: JournalRow[], days: CanonicalDay[], windowDays: number): RecordedAssociation[] {
  const questionGroups = new Map<string, JournalRow[]>();
  for (const row of journals.filter((row) => row.cycle_start)) {
    const questionKey = normalizeJournalQuestion(row.question_text);
    questionGroups.set(questionKey, [...(questionGroups.get(questionKey) ?? []), row]);
  }
  const outcomes = [
    { key: "recovery", label: "Recovery", read: (day: CanonicalDay) => day.recovery },
    { key: "hrv", label: "HRV", read: (day: CanonicalDay) => day.hrv },
    { key: "resting_heart_rate", label: "resting heart rate", read: (day: CanonicalDay) => day.rhr },
  ];
  const byDate = new Map(days.map((day) => [day.date, day]));
  return [...questionGroups.values()].flatMap((rows) => outcomes.map((outcome) => {
    const question = rows[0].question_text;
    const exposureDates = new Set(rows.filter((row) => row.answered_yes === 1).map((row) => calendarDateKey(row.cycle_start!)));
    const explicitlyUnexposedDates = new Set(rows.filter((row) => row.answered_yes === 0).map((row) => calendarDateKey(row.cycle_start!)));
    const exposedObservations = [...exposureDates].flatMap((date) => {
      const target = byDate.get(shiftCalendarDateKey(date, 1));
      const value = target ? outcome.read(target) : null;
      return typeof value === "number" ? [{ date, value }] : [];
    });
    const exposedPoints = exposedObservations.map((item) => item.value);
    const exposedWeekdays = new Set([...exposureDates].map((date) => new Date(`${date}T12:00:00Z`).getUTCDay()));
    const comparisonObservations = [...explicitlyUnexposedDates].flatMap((date) => {
      const target = byDate.get(shiftCalendarDateKey(date, 1));
      const value = target ? outcome.read(target) : null;
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      return exposedWeekdays.has(weekday) && typeof value === "number" ? [{ date, value }] : [];
    });
    const comparisonPoints = comparisonObservations.map((item) => item.value);
    const exposedMedian = median(exposedPoints);
    const comparisonMedian = median(comparisonPoints);
    const difference = exposedMedian === null || comparisonMedian === null ? null : exposedMedian - comparisonMedian;
    const sufficient = exposedPoints.length >= MIN_ASSOCIATION_EXPOSED && comparisonPoints.length >= MIN_ASSOCIATION_COMPARISON;
    const comparisonNoise = mad(comparisonPoints);
    const normalizedEffect = difference === null || comparisonNoise === null
      ? 0 : comparisonNoise === 0 ? (difference === 0 ? 0 : Number.POSITIVE_INFINITY) : Math.abs(difference) / (comparisonNoise * 1.4826);
    const interval = sufficient ? bootstrapMedianInterval(exposedPoints, comparisonPoints) : null;
    const bootstrapExcludesZero = Boolean(interval && (interval[0] > 0 || interval[1] < 0));
    const trimmedDifference = sufficient ? trimmedMedianDifference(exposedPoints, comparisonPoints) : null;
    const trimmedRetainsSign = difference !== null && trimmedDifference !== null && Math.sign(difference) === Math.sign(trimmedDifference);
    const orderedExposureDates = [...exposureDates].sort();
    const nonAdjacentDates = orderedExposureDates.filter((date, index) => index === 0 || Date.parse(`${date}T12:00:00Z`) - Date.parse(`${orderedExposureDates[index - 1]}T12:00:00Z`) > 36 * 60 * 60 * 1000);
    const adjacentSensitivityPassed = nonAdjacentDates.length >= Math.ceil(exposureDates.size * 0.75);
    const detected = sufficient && difference !== null && Math.abs(difference) >= outcomeThreshold(outcome.key)
      && normalizedEffect >= 0.35 && bootstrapExcludesZero && trimmedRetainsSign && adjacentSensitivityPassed;
    const claim = !sufficient ? "insufficient_data" as const : detected ? "association_detected" as const : "no_clear_association" as const;
    const exposureLabel = question.replace(/\?$/, "");
    const observation = claim === "insufficient_data"
      ? `${exposureLabel} does not have enough recorded comparisons to evaluate its association with ${outcome.label}.`
      : claim === "no_clear_association"
        ? `No clear association was detected between ${exposureLabel.toLowerCase()} and next-day ${outcome.label} in the available records. This does not establish that no relationship exists.`
        : `${exposureLabel} was associated with ${Math.abs(difference ?? 0).toFixed(1)} ${difference! < 0 ? "lower" : "higher"} next-day ${outcome.label} across ${exposedPoints.length} recorded comparisons.`;
    const sourceRows = rows.map((row) => ({ date: calendarDateKey(row.cycle_start!), value: 1, source: "WHOOP export" as const, sourceRecordId: row.id, rawTimestamp: row.cycle_start!, syncTimestamp: null }));
    return {
      id: `${question.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${outcome.key}`,
      exposureKey: question, exposureLabel, outcomeKey: outcome.key, outcomeLabel: outcome.label,
      analysisWindowDays: windowDays, lagHours: 24, exposedCount: exposedPoints.length, comparisonCount: comparisonPoints.length,
      exposedMedian: round(exposedMedian), comparisonMedian: round(comparisonMedian), absoluteDifference: round(difference),
      relativeDifference: difference === null || comparisonMedian === null || comparisonMedian === 0 ? null : round(difference / Math.abs(comparisonMedian), 3),
      confidence: !sufficient ? "insufficient" as const : Math.min(exposedPoints.length, comparisonPoints.length) >= 20 ? "moderate" as const : "low" as const,
      matchingMethod: "Next physiological day; unexposed comparison days matched to exposure weekday.",
      sensitivityChecksPassed: [
        ...(sufficient ? ["minimum sample size", "weekday matching", "median effect estimate"] : []),
        ...(normalizedEffect >= 0.35 ? ["robust standardized effect ≥0.35"] : []),
        ...(bootstrapExcludesZero ? ["deterministic 95% bootstrap interval excludes zero"] : []),
        ...(trimmedRetainsSign ? ["trimmed-outlier sign retained"] : []),
        ...(adjacentSensitivityPassed ? ["adjacent-exposure sensitivity"] : []),
      ],
      claim, observation, statementType: claim === "insufficient_data" ? "data_limitation" as const : "recorded_association" as const,
      provenance: provenance(sourceRows),
      limitations: ["Observational association; causality is not established.", "Unmeasured confounding may remain.", "No recorded event does not establish that the event did not occur."],
      exposedDates: exposedObservations.map((item) => item.date),
      comparisonDates: comparisonObservations.map((item) => item.date),
      exposedDispersion: round(mad(exposedPoints)),
      comparisonDispersion: round(mad(comparisonPoints)),
      robustEffectSize: round(normalizedEffect, 2),
      bootstrapInterval: interval ? [round(interval[0], 2) ?? interval[0], round(interval[1], 2) ?? interval[1]] : null,
    } satisfies RecordedAssociation;
  })).sort((a, b) => (a.claim === "association_detected" ? -1 : 1) - (b.claim === "association_detected" ? -1 : 1));
}

function journalEvents(rows: JournalRow[], selectedDate: string, windowDays: number): JournalEventViewModel[] {
  const startDate = shiftCalendarDateKey(selectedDate, -(windowDays - 1));
  return rows.flatMap((row) => {
    if (row.answered_yes !== 1 || !row.cycle_start) return [];
    const physiologicalDate = calendarDateKey(row.cycle_start);
    if (physiologicalDate < startDate || physiologicalDate > selectedDate) return [];
    const rule = classifyJournalQuestion(row.question_text);
    return [{
      id: row.id,
      type: rule.type,
      label: rule.label,
      occurredAt: row.cycle_start,
      physiologicalDate,
      icon: rule.icon,
      metadata: { answeredYes: true, questionText: row.question_text },
      source: "WHOOP Journal" as const,
    }];
  }).sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
}

function domainCards(domains: Omit<LongitudinalHealthView["domains"], "recordedBehaviors">, coverage: DataCoverage): DomainCardViewModel[] {
  const chartTypes: Record<string, DomainCardViewModel["chartType"]> = {
    physiology: "sparkline",
    sleep: "sparkline",
    cardiovascularActivity: "weekly_bars",
    dailyMovement: "distribution",
    strength: "weekly_bars",
    bodyWeight: "smoothed_line",
  };
  const preferred: Record<string, string[]> = {
    physiology: ["hrv", "resting_heart_rate"],
    sleep: ["sleep_duration", "sleep_consistency"],
    cardiovascularActivity: ["aerobic_minutes", "day_strain"],
    dailyMovement: ["walking_minutes"],
    strength: ["strength_frequency", "strength_sets"],
    bodyWeight: ["body_weight"],
  };
  return Object.values(domains).map((item) => {
    const ordered = preferred[item.id].flatMap((id) => item.metrics.filter((metric) => metric.id === id));
    const display = ordered.slice(0, 2).map((metric) => ({
      id: metric.id, label: metric.label, unit: metric.unit, baselineValue: metric.baselineValue,
      currentValue: metric.currentValue, absoluteChange: metric.absoluteChange, relativeChange: metric.relativeChange,
      direction: metric.direction, interpretation: metric.interpretation, points: metric.points,
    }));
    const detail = coverage.byDomain[item.id];
    const changed = ordered.find((metric) => metric.direction === "upward" || metric.direction === "downward");
    return {
      id: item.id, title: item.label, direction: item.direction,
      primaryMetric: display[0] ?? null, secondaryMetric: display[1] ?? null,
      observation: changed?.observation ?? ordered[0]?.observation ?? item.summary,
      chartType: chartTypes[item.id], confidence: item.confidence,
      coveredDays: detail?.covered ?? 0, expectedDays: detail?.expected ?? 0,
    };
  });
}

function coverageDetail(dates: string[], expected: number) {
  const unique = [...new Set(dates)].sort();
  return { covered: unique.length, expected, ratio: round(clamp01(unique.length / expected), 3) ?? 0, startDate: unique[0] ?? null, endDate: unique.at(-1) ?? null };
}

function buildCoverage(selectedDate: string, windowDays: number, days: CanonicalDay[], bodyRows: BodyRow[], hevyRows: HevyRow[], activityPoints: SeriesPoint[], walkingPoints: SeriesPoint[], journals: JournalRow[]): DataCoverage {
  const start = shiftCalendarDateKey(selectedDate, -(windowDays - 1));
  const within = (date: string) => date >= start && date <= selectedDate;
  const liveDates = days.filter((day) => day.source === "WHOOP live API").map((day) => day.date).filter(within);
  const exportDates = days.filter((day) => day.source === "WHOOP export").map((day) => day.date).filter(within);
  const whoopDates = days.map((day) => day.date).filter(within);
  const strengthDates = hevyRows.map((row) => calendarDateKey(row.start_time)).filter(within);
  const activityDates = activityPoints.map((row) => row.date).filter(within);
  const weightDates = bodyRows.map((row) => row.observed_on).filter(within);
  const journalDates = journals.flatMap((row) => row.cycle_start ? [calendarDateKey(row.cycle_start)] : []).filter(within);
  const expectedWeeks = Math.ceil(windowDays / 7);
  const bySource = {
    "WHOOP live API": coverageDetail(liveDates, windowDays),
    "WHOOP export": coverageDetail(exportDates, windowDays),
    Hevy: coverageDetail([...new Set(strengthDates.map(weekKey))], expectedWeeks),
    "WHOOP Journal": coverageDetail(journalDates, windowDays),
  };
  return {
    overall: coverageDetail(whoopDates, windowDays).ratio, windowDays, bySource,
    byDomain: {
      physiology: coverageDetail(whoopDates, windowDays), sleep: coverageDetail(days.filter((day) => day.sleepHours !== null).map((day) => day.date).filter(within), windowDays),
      cardiovascularActivity: coverageDetail(activityDates, windowDays), dailyMovement: coverageDetail(walkingPoints.map((row) => row.date).filter(within), windowDays),
      strength: coverageDetail([...new Set(strengthDates.map(weekKey))], expectedWeeks), bodyWeight: coverageDetail([...new Set(weightDates.map(weekKey))], expectedWeeks),
      recordedBehaviors: coverageDetail(journalDates, windowDays),
    },
    availableInputs: [whoopDates.length ? "WHOOP physiology and sleep" : null, activityDates.length ? "WHOOP recorded activities" : null, strengthDates.length ? "Hevy strength training" : null, weightDates.length ? "Body weight snapshots" : null, journalDates.length ? "Explicit WHOOP Journal entries" : null].filter((value): value is string => Boolean(value)),
    unavailableInputs: ["Daily steps", "Sedentary duration", "Meal timestamps", "Body composition", "Weight-change intent", "Verified VO₂ max"],
    limitations: ["Coverage is reported per source and domain; expected cadence differs across inputs.", ...(journalDates.length ? [] : ["Recorded behavior associations are unavailable without explicit journal entries."])],
    coveredDays: new Set(whoopDates).size,
    expectedDays: windowDays,
    summary: `${new Set(whoopDates).size} of ${windowDays} physiological days covered.`,
  };
}

function durationMinutes(start: string, end: string) {
  const value = (Date.parse(end) - Date.parse(start)) / 60_000;
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function selectWindowDays(days: CanonicalDay[], selectedDate: string) {
  const ratio = (windowDays: number) => {
    const start = shiftCalendarDateKey(selectedDate, -(windowDays - 1));
    return new Set(days.filter((day) => day.date >= start && day.date <= selectedDate).map((day) => day.date)).size / windowDays;
  };
  if (ratio(180) >= 0.75) return 180;
  if (ratio(90) >= 0.75) return 90;
  return 30;
}

export function buildLongitudinalHealthView(input: LongitudinalEngineInput): LongitudinalHealthView {
  const generatedAt = input.now.toISOString();
  const selectedDate = calendarDateKey(input.now);
  const journalRows = deduplicateJournalRows(input.journalRows);
  const allCanonical = canonicalize(input);
  const windowDays = selectWindowDays(allCanonical, selectedDate);
  const startDate = shiftCalendarDateKey(selectedDate, -(windowDays - 1));
  const canonical = allCanonical.filter((day) => day.date >= startDate && day.date <= selectedDate);
  const physiological = [
    buildMetric(METRICS.hrv, dailySeries(allCanonical, "hrv"), selectedDate, windowDays),
    buildMetric(METRICS.rhr, dailySeries(allCanonical, "rhr"), selectedDate, windowDays),
    buildMetric(METRICS.respiratory, dailySeries(allCanonical, "respiratory"), selectedDate, windowDays),
    buildMetric(METRICS.skinTemp, dailySeries(allCanonical, "skinTemp"), selectedDate, windowDays),
    buildMetric(METRICS.spo2, dailySeries(allCanonical, "spo2"), selectedDate, windowDays),
    buildMetric(METRICS.recovery, dailySeries(allCanonical, "recovery"), selectedDate, windowDays),
  ];
  const sleep = [
    buildMetric(METRICS.sleepHours, dailySeries(allCanonical, "sleepHours"), selectedDate, windowDays),
    buildMetric(METRICS.sleepEfficiency, dailySeries(allCanonical, "sleepEfficiency"), selectedDate, windowDays),
    buildMetric(METRICS.sleepConsistency, dailySeries(allCanonical, "sleepConsistency"), selectedDate, windowDays),
  ];
  const strain = buildMetric(METRICS.strain, dailySeries(allCanonical, "strain"), selectedDate, windowDays);
  const exportActivity: ActivityPoint[] = input.exportWorkoutRows.map((row) => ({
    date: calendarDateKey(row.workout_start),
    value: row.duration_minutes === null ? 0 : row.duration_minutes * (((row.zone_2_percentage ?? 0) + 2 * ((row.zone_3_percentage ?? 0) + (row.zone_4_percentage ?? 0) + (row.zone_5_percentage ?? 0))) / 100),
    source: "WHOOP export" as const, sourceRecordId: row.workout_start, rawTimestamp: row.workout_start, syncTimestamp: null,
    sport: row.activity_name ?? "",
  }));
  const liveActivity: ActivityPoint[] = input.workoutRows.map((row) => ({
    date: calendarDateKey(row.start),
    value: ((row.zone_two_milli ?? 0) + 2 * ((row.zone_three_milli ?? 0) + (row.zone_four_milli ?? 0) + (row.zone_five_milli ?? 0))) / 60_000,
    source: "WHOOP live API" as const, sourceRecordId: row.id, rawTimestamp: row.start, syncTimestamp: row.synced_at,
    sport: row.sport_name ?? "",
  }));
  const mergedActivities = new Map<string, ActivityPoint>(exportActivity.map((point) => [point.rawTimestamp, point]));
  liveActivity.forEach((point) => mergedActivities.set(point.rawTimestamp, point));
  const activityRows = [...mergedActivities.values()].filter((point) => point.date <= selectedDate);
  const workoutPoints: SeriesPoint[] = activityRows.map((point) => ({
    date: point.date,
    value: point.value,
    source: point.source,
    sourceRecordId: point.sourceRecordId,
    rawTimestamp: point.rawTimestamp,
    syncTimestamp: point.syncTimestamp,
  }));
  const walkingPoints: SeriesPoint[] = activityRows.filter((point) => point.sport.toLowerCase().includes("walk")).map((point) => ({ ...point, value: point.source === "WHOOP live API" ? durationMinutes(point.rawTimestamp, input.workoutRows.find((row) => row.id === point.sourceRecordId)?.end ?? point.rawTimestamp) : input.exportWorkoutRows.find((row) => row.workout_start === point.rawTimestamp)?.duration_minutes ?? 0 }));
  const aerobic = buildMetric(METRICS.aerobicMinutes, weeklySum(workoutPoints.filter((point) => point.value > 0)), selectedDate, windowDays);
  const walking = buildMetric(METRICS.walkingMinutes, weeklySum(walkingPoints), selectedDate, windowDays);
  const hevyBase = input.hevyRows.filter((row) => calendarDateKey(row.start_time) <= selectedDate).map((row) => ({ date: calendarDateKey(row.start_time), value: 1, source: "Hevy" as const, sourceRecordId: row.id, rawTimestamp: row.start_time, syncTimestamp: row.synced_at }));
  const strengthFrequency = buildMetric(METRICS.strengthFrequency, weeklySum(hevyBase), selectedDate, windowDays);
  const strengthSets = buildMetric(METRICS.strengthSets, weeklySum(input.hevyRows.filter((row) => calendarDateKey(row.start_time) <= selectedDate).map((row) => ({ date: calendarDateKey(row.start_time), value: row.set_count, source: "Hevy" as const, sourceRecordId: row.id, rawTimestamp: row.start_time, syncTimestamp: row.synced_at }))), selectedDate, windowDays);
  const weight = buildMetric(METRICS.weight, input.bodyRows.filter((row) => row.weight_kilogram !== null && row.observed_on <= selectedDate).map((row) => ({ date: row.observed_on, value: row.weight_kilogram! * KILOGRAMS_TO_POUNDS, source: "WHOOP live API" as const, sourceRecordId: row.observed_on, rawTimestamp: row.observed_at, syncTimestamp: row.synced_at })), selectedDate, windowDays);
  weight.interpretation = "neutral";
  weight.limitations.push("Weight direction is not interpreted; body composition and change intent are unknown.", "WHOOP body values are sync-time snapshots, not a complete measurement history.");
  const metrics = [...physiological, ...sleep, strain, aerobic, walking, strengthFrequency, strengthSets, weight];
  const domains: Omit<LongitudinalHealthView["domains"], "recordedBehaviors"> = {
    physiology: domain("physiology", "Physiological trends", physiological, ["Recovery is treated as a short-term composite and excluded from the aggregate trend."]),
    sleep: domain("sleep", "Sleep trends", sleep, ["Wearable sleep-stage estimates are not treated as clinical measurements."]),
    cardiovascularActivity: domain("cardiovascularActivity", "Cardiovascular activity", [strain, aerobic], ["Day Strain is not treated as cardiovascular fitness."]),
    dailyMovement: domain("dailyMovement", "Daily movement", [walking], ["Steps and sedentary duration are not available; only recorded walking sessions can be evaluated."]),
    strength: domain("strength", "Strength training", [strengthFrequency, strengthSets], ["Logged sets and frequency do not establish muscle gain, loss, or injury risk."]),
    bodyWeight: domain("bodyWeight", "Body weight and composition", [weight], weight.limitations),
  };
  const notableExcluded = new Set(["recovery", "body_weight", "day_strain"]);
  const changed = metrics.filter((metric) => !notableExcluded.has(metric.id) && (metric.direction === "upward" || metric.direction === "downward") && metric.confidence !== "low");
  const largest = [...changed].sort((a, b) => Math.abs(b.relativeChange ?? 0) - Math.abs(a.relativeChange ?? 0))[0];
  const persistent = [...changed].filter((metric) => metric.id !== largest?.id).sort((a, b) => b.persistenceDays - a.persistenceDays)[0];
  const additional = [...changed].filter((metric) => metric.id !== largest?.id && metric.id !== persistent?.id).sort((a, b) => Math.abs(b.relativeChange ?? 0) - Math.abs(a.relativeChange ?? 0))[0];
  const notableMetrics = [largest, persistent, additional].filter((metric): metric is MetricTrend => Boolean(metric));
  const notableTitles = ["Largest shift", "Most persistent change", "Additional observed change"];
  const notableTrends = notableMetrics.map((metric, index) => ({
    id: `notable-${metric.id}`, metricIds: [metric.id], title: notableTitles[index], observation: metric.observation,
    startDate: metric.startDate ?? selectedDate, endDate: metric.endDate ?? selectedDate,
    magnitude: metric.absoluteChange === null ? "Not available" : `${Math.abs(metric.absoluteChange)}${metric.unit ? ` ${metric.unit}` : ""}`,
    persistenceDays: metric.persistenceDays, confidence: metric.confidence, statementType: metric.statementType,
    provenance: metric.provenance, limitations: metric.limitations,
  }));
  const dataCoverage = buildCoverage(selectedDate, windowDays, canonical, input.bodyRows, input.hevyRows, workoutPoints, walkingPoints, journalRows);
  const latestJournalImport = [...(input.journalImports ?? [])].sort((left, right) => right.imported_at.localeCompare(left.imported_at))[0];
  const journalCoverageEnd = (input.journalImports ?? []).flatMap((item) => item.date_end ? [calendarDateKey(item.date_end)] : []).sort().at(-1) ?? null;
  return {
    generatedAt, selectedDate, timezone: HEALTH_TIME_ZONE, windowDays,
    aggregateTrend: aggregate(metrics), domains, currentDeviation: currentDeviation([...physiological, ...sleep], selectedDate),
    notableTrends, recordedAssociations: associations(journalRows, canonical, windowDays),
    journalEvents: journalEvents(journalRows, selectedDate, windowDays),
    alcoholLog: buildAlcoholLogView(input.journalRows, selectedDate, {
      importCount: input.journalImports?.length ?? 0,
      latestImportAt: latestJournalImport?.imported_at ?? null,
      coverageEnd: journalCoverageEnd,
    }),
    domainCards: domainCards(domains, dataCoverage),
    dataCoverage,
  };
}

export async function getLongitudinalHealthView(): Promise<LongitudinalHealthView> {
  const [liveDays, exportDays, bodyRows, hevyRows, workoutRows, journalRows, exportWorkoutRows, journalImports] = await Promise.all([
    dbAll<LiveDayRow>(`
      SELECT c.id AS source_record_id, c.start AS cycle_start, s."end" AS sleep_end,
             c.timezone_offset, c.synced_at, r.recovery_score, r.resting_heart_rate,
             r.hrv_rmssd_milli, r.skin_temp_celsius, r.spo2_percentage, c.strain AS day_strain,
             s.respiratory_rate,
             (s.total_light_sleep_time_milli + s.total_slow_wave_sleep_time_milli + s.total_rem_sleep_time_milli) / 60000.0 AS asleep_minutes,
             s.sleep_efficiency_percentage AS sleep_efficiency,
             s.sleep_consistency_percentage AS sleep_consistency
      FROM whoop_cycles c
      LEFT JOIN whoop_recovery_summaries r ON r.cycle_id = c.id
      LEFT JOIN whoop_sleep_summaries s ON s.cycle_id = c.id AND s.nap = 0
      ORDER BY c.start`),
    dbAll<ExportDayRow>(`SELECT cycle_start, wake_onset, timezone_offset, recovery_score,
      resting_heart_rate, hrv_rmssd_milli, skin_temp_celsius, spo2_percentage,
      day_strain, respiratory_rate, asleep_minutes, sleep_efficiency, sleep_consistency
      FROM whoop_export_cycles ORDER BY cycle_start`),
    dbAll<BodyRow>(`SELECT observed_on, observed_at, weight_kilogram, synced_at FROM whoop_body_measurements ORDER BY observed_on`),
    dbAll<HevyRow>(`SELECT id, start_time, set_count, volume_kg, duration_seconds, raw_json, synced_at FROM hevy_workouts ORDER BY start_time`),
    dbAll<WorkoutRow>(`SELECT id, sport_name, start, "end", strain, distance_meter,
      zone_one_milli, zone_two_milli, zone_three_milli, zone_four_milli, zone_five_milli, synced_at
      FROM whoop_workouts ORDER BY start`),
    dbAll<JournalRow>(`SELECT id, cycle_start, question_text, answered_yes FROM whoop_export_journal_answers ORDER BY cycle_start`),
    dbAll<ExportWorkoutRow>(`SELECT workout_start, workout_end, activity_name, duration_minutes,
      zone_2_percentage, zone_3_percentage, zone_4_percentage, zone_5_percentage
      FROM whoop_export_workouts ORDER BY workout_start`),
    dbAll<JournalImportRow>(`SELECT imported_at, date_end FROM whoop_export_imports ORDER BY imported_at DESC`),
  ]);
  return buildLongitudinalHealthView({ now: new Date(), liveDays, exportDays, bodyRows, hevyRows, workoutRows, journalRows, exportWorkoutRows, journalImports });
}
