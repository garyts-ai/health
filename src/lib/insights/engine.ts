import { dbAll, dbGet } from "@/lib/db";
import { getHevyConnectionStatus } from "@/lib/hevy/provider";
import {
  buildBodyHighlightsFromWorkout,
  buildWeeklyBodyHighlights,
  summarizeWeeklyMuscleHits,
  summarizeWeeklyMuscleVolume,
  summarizeWorkoutMuscleGroups,
} from "@/lib/insights/body-map";
import { buildOvernightRead, deriveLateNightDisruption } from "@/lib/insights/overnight-read";
import { getNutritionIntakeSummary } from "@/lib/nutrition-intake";
import { getNutritionTargets } from "@/lib/nutrition-targets";
import { kilogramsToPounds } from "@/lib/units";
import { getWhoopConnectionStatus } from "@/lib/whoop/provider";
import type {
  BodyCardSummary,
  DailyActivityContext,
  DailyActivityKind,
  DailyActivitySession,
  DailyFreshness,
  DailyLateNightDisruption,
  DailyReadiness,
  DailyPhysiqueDecision,
  DailyRecommendation,
  RecommendationActionTile,
  DailyStressFlags,
  DailySummary,
  DailyTrainingLoad,
  DailyNutritionTargets,
  DailyNutritionActuals,
  DailyStrengthProgression,
  DailyWeightTrend,
  TrendPoint,
  DailyWhyChanged,
  RecommendationConfidence,
  RecommendationPriority,
} from "@/lib/insights/types";

type WhoopSleepRow = {
  start: string;
  end: string;
  sleep_performance_percentage: number | null;
  sleep_consistency_percentage: number | null;
  sleep_efficiency_percentage: number | null;
  total_in_bed_time_milli: number | null;
  total_awake_time_milli: number | null;
  total_light_sleep_time_milli: number | null;
  total_slow_wave_sleep_time_milli: number | null;
  total_rem_sleep_time_milli: number | null;
  sleep_needed_baseline_milli: number | null;
  sleep_needed_debt_milli: number | null;
  sleep_needed_strain_milli: number | null;
  sleep_needed_nap_milli: number | null;
};

type WhoopBodyMeasurementRow = {
  observed_on: string;
  observed_at: string;
  weight_kilogram: number | null;
  height_meter: number | null;
  max_heart_rate: number | null;
};

type WhoopCycleRow = {
  id: number;
  start: string;
  end: string;
  strain: number | null;
  kilojoule: number | null;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  raw_json: string;
};

type WhoopRecoveryRow = {
  created_at: string;
  recovery_score: number | null;
  resting_heart_rate: number | null;
  hrv_rmssd_milli: number | null;
  skin_temp_celsius: number | null;
  raw_json: string;
};

type WhoopWorkoutRow = {
  id?: string;
  sport_name?: string | null;
  start: string;
  end?: string;
  strain: number | null;
  average_heart_rate?: number | null;
  max_heart_rate?: number | null;
  distance_meter?: number | null;
};

type HevyWorkoutRow = {
  id: string;
  title: string | null;
  start_time: string;
  exercise_count: number;
  set_count: number;
  volume_kg: number | null;
  duration_seconds: number | null;
  raw_json: string;
};

type HevySetEntry = {
  type?: string | null;
  weight_kg?: number | null;
  reps?: number | null;
};

type HevyExerciseEntry = {
  title?: string | null;
  sets?: HevySetEntry[];
};

type MuscleBucket = "upper" | "lower" | "push" | "pull";

const DAY_MS = 1000 * 60 * 60 * 24;
const NEW_YORK_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const NEW_YORK_WEEKDAY = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
});
const NEW_YORK_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
});

function round(value: number | null, digits = 1) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === "number");

  if (filtered.length === 0) {
    return null;
  }

  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>(
    (total, value) => total + (typeof value === "number" ? value : 0),
    0,
  );
}

function hoursFromMillis(milliseconds: number | null) {
  return milliseconds === null ? null : milliseconds / 3_600_000;
}

function getActualSleepHours(row: WhoopSleepRow | null) {
  if (!row) {
    return null;
  }

  const stageSleepMillis = sum([
    row.total_light_sleep_time_milli,
    row.total_slow_wave_sleep_time_milli,
    row.total_rem_sleep_time_milli,
  ]);

  if (stageSleepMillis > 0) {
    return stageSleepMillis / 3_600_000;
  }

  if (
    typeof row.total_in_bed_time_milli === "number" &&
    typeof row.total_awake_time_milli === "number"
  ) {
    return Math.max(0, (row.total_in_bed_time_milli - row.total_awake_time_milli) / 3_600_000);
  }

  return hoursFromMillis(row.total_in_bed_time_milli);
}

function buildSleepStageSummary(row: WhoopSleepRow | null): DailyReadiness["sleepStageSummary"] {
  if (!row) {
    return null;
  }

  const values = [
    row.total_in_bed_time_milli,
    row.total_awake_time_milli,
    row.total_light_sleep_time_milli,
    row.total_slow_wave_sleep_time_milli,
    row.total_rem_sleep_time_milli,
  ];
  const hasAnyStageValue = values.some((value) => typeof value === "number" && value > 0);

  if (!hasAnyStageValue) {
    return null;
  }

  return {
    inBedHours: round(hoursFromMillis(row.total_in_bed_time_milli)),
    awakeHours: round(hoursFromMillis(row.total_awake_time_milli)),
    lightHours: round(hoursFromMillis(row.total_light_sleep_time_milli)),
    deepHours: round(hoursFromMillis(row.total_slow_wave_sleep_time_milli)),
    remHours: round(hoursFromMillis(row.total_rem_sleep_time_milli)),
  };
}

function daysSince(isoDate: string | null) {
  if (!isoDate) {
    return null;
  }

  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diff / DAY_MS));
}

function getStartDate(days: number) {
  return new Date(Date.now() - DAY_MS * days).toISOString();
}

function getStartOfWeekIso() {
  const now = new Date();
  const day = now.getDay();
  const distanceFromMonday = (day + 6) % 7;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - distanceFromMonday);
  return start.toISOString();
}

function isMonday(date: Date) {
  return date.getDay() === 1;
}

function getDateKey(date: string | Date) {
  return NEW_YORK_DAY.format(typeof date === "string" ? new Date(date) : date);
}

function getDateWindow(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.now() - (days - index - 1) * DAY_MS);
    return {
      date,
      key: getDateKey(date),
      weekday: NEW_YORK_WEEKDAY.format(date),
      monthDay: NEW_YORK_MONTH_DAY.format(date),
    };
  });
}

function getStartOfWeek(date: Date) {
  const day = date.getDay();
  const distanceFromMonday = (day + 6) % 7;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(date.getDate() - distanceFromMonday);
  return start;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function activityKindLabel(kind: DailyActivityKind) {
  if (kind === "walking") {
    return "Walking";
  }

  if (kind === "tennis") {
    return "Tennis";
  }

  return "Other conditioning";
}

function activitySummaryNoun(kind: DailyActivityKind) {
  if (kind === "walking") {
    return "walk";
  }

  if (kind === "tennis") {
    return "tennis session";
  }

  return "conditioning session";
}

function formatActivityList(parts: string[]) {
  if (parts.length <= 1) {
    return parts[0] ?? "no activity";
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function classifyWhoopActivity(sportName: string | null | undefined): DailyActivityKind | null {
  const normalized = sportName?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("weightlifting") ||
    normalized.includes("weight lifting") ||
    normalized.includes("strength") ||
    normalized.includes("lifting")
  ) {
    return null;
  }

  if (
    normalized.includes("walking") ||
    normalized === "walk" ||
    normalized.includes("hiking") ||
    normalized.includes("rucking")
  ) {
    return "walking";
  }

  if (normalized.includes("tennis")) {
    return "tennis";
  }

  return "other_conditioning";
}

function getActivityDurationMinutes(row: Pick<WhoopWorkoutRow, "start" | "end">) {
  if (!row.end) {
    return 0;
  }

  const durationMs = new Date(row.end).getTime() - new Date(row.start).getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return 0;
  }

  return Math.round(durationMs / 60_000);
}

function toActivitySession(row: WhoopWorkoutRow): DailyActivitySession | null {
  const kind = classifyWhoopActivity(row.sport_name);
  if (!kind) {
    return null;
  }

  return {
    id: row.id ?? `${row.sport_name ?? "activity"}-${row.start}`,
    kind,
    sportName: row.sport_name ?? activityKindLabel(kind),
    start: row.start,
    end: row.end ?? null,
    durationMinutes: getActivityDurationMinutes(row),
    strain: typeof row.strain === "number" ? round(row.strain, 1) : null,
    averageHeartRate:
      typeof row.average_heart_rate === "number" ? Math.round(row.average_heart_rate) : null,
    maxHeartRate: typeof row.max_heart_rate === "number" ? Math.round(row.max_heart_rate) : null,
    distanceMeter: typeof row.distance_meter === "number" ? row.distance_meter : null,
  };
}

function summarizeActivityBuckets(sessions: DailyActivitySession[]) {
  const kinds: DailyActivityKind[] = ["walking", "tennis", "other_conditioning"];
  return kinds
    .map((kind) => {
      const kindSessions = sessions.filter((session) => session.kind === kind);
      const distanceValues = kindSessions.map((session) => session.distanceMeter);
      const hasDistance = distanceValues.some((value) => typeof value === "number");

      return {
        kind,
        label: activityKindLabel(kind),
        count: kindSessions.length,
        durationMinutes: sum(kindSessions.map((session) => session.durationMinutes)),
        strain: round(sum(kindSessions.map((session) => session.strain)), 1) ?? 0,
        distanceMeter: hasDistance ? sum(distanceValues) : null,
      };
    })
    .filter((bucket) => bucket.count > 0);
}

function buildActivityDays(windowStart: Date, sessions: DailyActivitySession[]) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(windowStart, index);
    const dateKey = getDateKey(date);
    const daySessions = sessions.filter((session) => getDateKey(session.start) === dateKey);
    const buckets = summarizeActivityBuckets(daySessions).map((bucket) => ({
      kind: bucket.kind,
      count: bucket.count,
      strain: bucket.strain,
    }));

    return {
      dateKey,
      label: NEW_YORK_WEEKDAY.format(date),
      buckets,
      totalStrain: round(sum(daySessions.map((session) => session.strain)), 1) ?? 0,
      hasActivity: daySessions.length > 0,
    };
  });
}

function buildActivitySummaryLine(
  displayWindowLabel: DailyActivityContext["displayWindowLabel"],
  currentWeekHasActivity: boolean,
  buckets: ReturnType<typeof summarizeActivityBuckets>,
) {
  const parts = buckets.map((bucket) =>
    pluralize(bucket.count, activitySummaryNoun(bucket.kind), `${activitySummaryNoun(bucket.kind)}s`),
  );
  const summary = formatActivityList(parts);

  if (displayWindowLabel === "This week" && currentWeekHasActivity) {
    return `${summary} logged this week.`;
  }

  if (displayWindowLabel === "Last week" && buckets.length > 0) {
    return `No walks or tennis logged yet this week. Last week had ${summary}.`;
  }

  return "No walks, tennis, or conditioning logged in the current or previous week.";
}

function buildActivityInterpretation(sessions: DailyActivitySession[], fallbackUsed: boolean) {
  if (sessions.length === 0) {
    return "Activity context will appear after WHOOP logs walks, tennis, or conditioning.";
  }

  const tennis = sessions.filter((session) => session.kind === "tennis");
  const walking = sessions.filter((session) => session.kind === "walking");
  const other = sessions.filter((session) => session.kind === "other_conditioning");
  const maxTennisStrain = Math.max(...tennis.map((session) => session.strain ?? 0), 0);
  const totalWalkingMinutes = sum(walking.map((session) => session.durationMinutes));
  const totalOtherStrain = sum(other.map((session) => session.strain));
  const prefix = fallbackUsed ? "Last week shows" : "This week shows";

  if (maxTennisStrain >= 8) {
    return `${prefix} tennis as meaningful conditioning load; it can matter when recovery is low even though it does not count as lifting volume.`;
  }

  if (totalWalkingMinutes >= 60) {
    return `${prefix} a useful walking base, which is health-positive movement unless daily strain starts stacking unusually high.`;
  }

  if (totalOtherStrain >= 10) {
    return `${prefix} non-lifting conditioning load that should sit beside recovery and strain, not inside the muscle map.`;
  }

  return `${prefix} light non-lifting movement. Treat it as context, while Hevy still owns lifting volume and muscle exposure.`;
}

export function buildActivityContextFromRows(
  rows: WhoopWorkoutRow[],
  now = new Date(),
): DailyActivityContext {
  const currentWeekStart = getStartOfWeek(now);
  const previousWeekStart = addDays(currentWeekStart, -7);
  const currentWeekStartMs = currentWeekStart.getTime();
  const previousWeekStartMs = previousWeekStart.getTime();

  const sessions = rows
    .map(toActivitySession)
    .filter((session): session is DailyActivitySession => session !== null)
    .sort((left, right) => new Date(right.start).getTime() - new Date(left.start).getTime());

  const currentWeekSessions = sessions.filter(
    (session) => new Date(session.start).getTime() >= currentWeekStartMs,
  );
  const previousWeekSessions = sessions.filter((session) => {
    const time = new Date(session.start).getTime();
    return time >= previousWeekStartMs && time < currentWeekStartMs;
  });
  const currentWeekHasActivity = currentWeekSessions.length > 0;
  const fallbackUsed = !currentWeekHasActivity && previousWeekSessions.length > 0;
  const displaySessions = currentWeekHasActivity
    ? currentWeekSessions
    : fallbackUsed
      ? previousWeekSessions
      : [];
  const displayWindowLabel = fallbackUsed ? "Last week" : "This week";
  const windowStart = fallbackUsed ? previousWeekStart : currentWeekStart;
  const buckets = summarizeActivityBuckets(displaySessions);
  const distanceValues = displaySessions.map((session) => session.distanceMeter);
  const hasDistance = distanceValues.some((value) => typeof value === "number");

  return {
    displayWindowLabel,
    currentWeekHasActivity,
    fallbackUsed,
    hasActivity: displaySessions.length > 0,
    summaryLine: buildActivitySummaryLine(displayWindowLabel, currentWeekHasActivity, buckets),
    interpretation: buildActivityInterpretation(displaySessions, fallbackUsed),
    latestSession: displaySessions[0] ?? null,
    buckets,
    days: buildActivityDays(windowStart, displaySessions),
    totalSessions: displaySessions.length,
    totalDurationMinutes: sum(displaySessions.map((session) => session.durationMinutes)),
    totalStrain: round(sum(displaySessions.map((session) => session.strain)), 1) ?? 0,
    totalDistanceMeter: hasDistance ? sum(distanceValues) : null,
  };
}

function toThreePointSeries(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => typeof value === "number");

  if (filtered.length === 0) {
    return [null, null, null];
  }

  if (filtered.length === 1) {
    return [filtered[0], filtered[0], filtered[0]];
  }

  if (filtered.length === 2) {
    return [filtered[0], filtered[0], filtered[1]];
  }

  const first = filtered[0];
  const middle = filtered[Math.floor((filtered.length - 1) / 2)];
  const last = filtered[filtered.length - 1];
  return [first, middle, last];
}

function parseRespiratoryRate(rawJson: string) {
  try {
    const parsed = JSON.parse(rawJson) as { score?: { respiratory_rate?: number } };
    return typeof parsed.score?.respiratory_rate === "number"
      ? parsed.score.respiratory_rate
      : null;
  } catch {
    return null;
  }
}

function getExerciseTitles(rawJson: string) {
  try {
    const parsed = JSON.parse(rawJson) as {
      exercises?: Array<{ title?: string | null }>;
    };
    return parsed.exercises
      ?.map((exercise) => exercise.title?.toLowerCase() ?? "")
      .filter(Boolean) ?? [];
  } catch {
    return [];
  }
}

function getWorkoutExerciseLabels(rawJson: string) {
  return getHevyExercises(rawJson)
    .map((exercise) => exercise.title?.trim() ?? "")
    .filter(Boolean);
}

function getHevyExercises(rawJson: string) {
  try {
    const parsed = JSON.parse(rawJson) as { exercises?: HevyExerciseEntry[] };
    return Array.isArray(parsed.exercises) ? parsed.exercises : [];
  } catch {
    return [];
  }
}

function normalizeExerciseTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(machine|dumbbell|barbell|cable|standing|seated|single)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatExerciseTitle(title: string) {
  return title
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getExerciseFamily(title: string) {
  if (/(bench|chest press|incline press|incline bench)/.test(title)) {
    return "push";
  }

  if (/(row|pull|pulldown|chin)/.test(title)) {
    return "pull";
  }

  if (/(squat|leg press|lunge|split squat|leg extension)/.test(title)) {
    return "legs";
  }

  if (/(deadlift|rdl|romanian|hip thrust|leg curl|hamstring)/.test(title)) {
    return "hinge";
  }

  if (/(shoulder press|overhead press|lateral raise|rear delt)/.test(title)) {
    return "shoulders";
  }

  return "accessory";
}

function estimateTopSetValue(sets: HevySetEntry[] | undefined) {
  if (!Array.isArray(sets)) {
    return null;
  }

  const estimates = sets
    .filter((set) => set?.type !== "warmup")
    .map((set) => {
      if (typeof set.weight_kg !== "number" || typeof set.reps !== "number" || set.reps <= 0) {
        return null;
      }

      return set.weight_kg * (1 + set.reps / 30);
    })
    .filter((value): value is number => typeof value === "number");

  return estimates.length ? Math.max(...estimates) : null;
}

function buildStrengthProgression(workouts: HevyWorkoutRow[]): DailyStrengthProgression[] {
  const byExercise = new Map<
    string,
    Array<{
      title: string;
      family: string;
      value: number;
      workoutAt: string;
    }>
  >();

  for (const workout of [...workouts].reverse()) {
    for (const exercise of getHevyExercises(workout.raw_json)) {
      const title = exercise.title ?? "";
      const normalized = normalizeExerciseTitle(title);
      if (!normalized) {
        continue;
      }

      const value = estimateTopSetValue(exercise.sets);
      if (value === null || value <= 0) {
        continue;
      }

      const current = byExercise.get(normalized) ?? [];
      current.push({
        title: formatExerciseTitle(normalized),
        family: getExerciseFamily(normalized),
        value,
        workoutAt: workout.start_time,
      });
      byExercise.set(normalized, current);
    }
  }

  const candidates = [...byExercise.values()]
    .filter((entries) => entries.length >= 2)
    .map((entries) => {
      const latest = entries[entries.length - 1];
      const previous = entries[entries.length - 2];
      const delta = latest.value - previous.value;
      const deltaLb = round(kilogramsToPounds(delta), 1);
      const confidence =
        deltaLb !== null && Math.abs(deltaLb) >= 25
          ? "low"
          : entries.length >= 3
            ? "high"
            : "medium";
      const confidenceLabel =
        confidence === "high"
          ? "repeat trend"
          : confidence === "medium"
            ? "estimated"
            : "check context";
      return {
        exercise: latest.title,
        latestValue: round(kilogramsToPounds(latest.value), 1),
        previousValue: round(kilogramsToPounds(previous.value), 1),
        delta: deltaLb,
        latestLabel: `${round(kilogramsToPounds(latest.value), 0) ?? "--"} est`,
        previousLabel: `${round(kilogramsToPounds(previous.value), 0) ?? "--"} prev`,
        deltaLabel:
          delta > 0
            ? `+${deltaLb} lb`
            : delta < 0
              ? `${deltaLb} lb`
              : "flat",
        trend: (Math.abs(delta) < 0.5
          ? "flat"
          : delta > 0
            ? "up"
            : "down") satisfies DailyStrengthProgression["trend"],
        confidence,
        confidenceLabel,
        family: latest.family,
        recency: new Date(latest.workoutAt).getTime(),
      };
    })
    .sort((left, right) => {
      const familyOrder = ["push", "pull", "legs", "hinge", "shoulders", "accessory"];
      const leftFamily = familyOrder.indexOf(left.family);
      const rightFamily = familyOrder.indexOf(right.family);
      if (leftFamily !== rightFamily) {
        return leftFamily - rightFamily;
      }

      return right.recency - left.recency;
    });

  const selected: typeof candidates = [];
  const usedFamilies = new Set<string>();

  for (const candidate of candidates) {
    if (selected.length >= 5) {
      break;
    }

    if (candidate.family !== "accessory" && usedFamilies.has(candidate.family)) {
      continue;
    }

    selected.push(candidate);
    usedFamilies.add(candidate.family);
  }

  for (const candidate of candidates) {
    if (selected.length >= 5) {
      break;
    }

    if (!selected.includes(candidate)) {
      selected.push(candidate);
    }
  }

  return selected.slice(0, 5).map((item) => ({
    exercise: item.exercise,
    latestValue: item.latestValue,
    previousValue: item.previousValue,
    delta: item.delta,
    latestLabel: item.latestLabel,
    previousLabel: item.previousLabel,
    deltaLabel: item.deltaLabel,
    trend: item.trend as DailyStrengthProgression["trend"],
    confidence: item.confidence as DailyStrengthProgression["confidence"],
    confidenceLabel: item.confidenceLabel,
  }));
}

export function inferBuckets(exerciseTitles: string[]) {
  const buckets = new Set<MuscleBucket>();

  for (const title of exerciseTitles) {
    const isLowerBody =
      /(squat|deadlift|lunge|leg|calf|hamstring|glute|quad|rdl|hip thrust|split squat|adductor|adduction)/.test(
        title,
      );
    const isLowerBodyPress = /(squat press|leg press)/.test(title);
    const isLowerBodyCurl = /(leg curl|hamstring curl|nordic)/.test(title);

    if (isLowerBody) {
      buckets.add("lower");
    }

    if (/(bench|press|dip|push|incline|tricep|fly|pec)/.test(title) && !isLowerBodyPress) {
      buckets.add("push");
      buckets.add("upper");
    }

    if (
      /(\brow\b|\bpull[- ]?up\b|\bchin[- ]?up\b|\blat\b|pulldown|\bcurl\b|rear delt|face pull)/.test(
        title,
      ) &&
      !isLowerBodyCurl
    ) {
      buckets.add("pull");
      buckets.add("upper");
    }

    if (/(shoulder|arm|chest|back)/.test(title)) {
      buckets.add("upper");
    }
  }

  return [...buckets];
}

function getConfidenceLabel(score: number): RecommendationConfidence {
  if (score >= 3) {
    return "high";
  }
  if (score >= 2) {
    return "medium";
  }
  return "low";
}

function poundsText(value: number | null, digits = 0) {
  const pounds = kilogramsToPounds(value);
  if (pounds === null) {
    return "--";
  }

  return `${pounds.toFixed(digits)} lb`;
}

function signedPoundsText(value: number | null, digits = 1) {
  const pounds = kilogramsToPounds(value);
  if (pounds === null) {
    return "--";
  }

  const prefix = pounds > 0 ? "+" : "";
  return `${prefix}${pounds.toFixed(digits)} lb`;
}

async function buildFreshness(): Promise<DailyFreshness> {
  const [whoop, hevy] = await Promise.all([getWhoopConnectionStatus(), getHevyConnectionStatus()]);

  return {
    whoop: {
      connected: whoop.connected,
      isStale: whoop.isStale,
      lastSyncCompletedAt: whoop.lastSyncCompletedAt,
    },
    hevy: {
      connected: hevy.connected,
      isStale: hevy.isStale,
      lastSyncCompletedAt: hevy.lastSyncCompletedAt,
    },
  };
}

async function buildReadiness(): Promise<DailyReadiness> {
  const [sleepRows, recoveryRows, cycleRows, bodyRows, workoutRows] = await Promise.all([
    dbAll<WhoopSleepRow>(
      `
      SELECT start, "end", sleep_performance_percentage, sleep_consistency_percentage,
             sleep_efficiency_percentage, total_in_bed_time_milli, total_awake_time_milli,
             total_light_sleep_time_milli, total_slow_wave_sleep_time_milli, total_rem_sleep_time_milli,
             sleep_needed_baseline_milli,
             sleep_needed_debt_milli, sleep_needed_strain_milli, sleep_needed_nap_milli
      FROM whoop_sleep_summaries
      WHERE start >= ?
      ORDER BY start DESC
    `,
      getStartDate(28),
    ),
    dbAll<WhoopRecoveryRow>(
      `
      SELECT created_at, recovery_score, resting_heart_rate, hrv_rmssd_milli,
             skin_temp_celsius, raw_json
      FROM whoop_recovery_summaries
      WHERE created_at >= ?
      ORDER BY created_at DESC
    `,
      getStartDate(28),
    ),
    dbAll<WhoopCycleRow>(
      `
      SELECT id, start, "end", strain, kilojoule, average_heart_rate, max_heart_rate, raw_json
      FROM whoop_cycles
      WHERE start >= ?
      ORDER BY start DESC
    `,
      getStartDate(28),
    ),
    dbAll<WhoopBodyMeasurementRow>(
      `
      SELECT observed_on, observed_at, weight_kilogram, height_meter, max_heart_rate
      FROM whoop_body_measurements
      WHERE observed_on >= ?
      ORDER BY observed_on DESC
    `,
      getStartDate(28).slice(0, 10),
    ),
    dbAll<WhoopWorkoutRow>(
      `
      SELECT start, strain
      FROM whoop_workouts
      WHERE start >= ?
      ORDER BY start DESC
    `,
      getStartDate(28),
    ),
  ]);

  const latestSleep = sleepRows[0] ?? null;
  const latestRecovery = recoveryRows[0] ?? null;
  const latestCycle = cycleRows[0] ?? null;
  const latestBody = bodyRows[0] ?? null;
  const sleepNeedHours = latestSleep
    ? hoursFromMillis(
        sum([
          latestSleep.sleep_needed_baseline_milli,
          latestSleep.sleep_needed_debt_milli,
          latestSleep.sleep_needed_strain_milli,
          latestSleep.sleep_needed_nap_milli,
        ]),
      )
    : null;
  const sleepHours = getActualSleepHours(latestSleep);
  const restingHr7d = average(recoveryRows.slice(0, 7).map((row) => row.resting_heart_rate));
  const hrv7d = average(recoveryRows.slice(0, 7).map((row) => row.hrv_rmssd_milli));
  const strain7d = average(cycleRows.slice(0, 7).map((row) => row.strain));
  const bodyWeight7d = average(bodyRows.slice(0, 7).map((row) => row.weight_kilogram));
  const bodyWeight28d = average(bodyRows.slice(0, 28).map((row) => row.weight_kilogram));
  const respiratoryRate7d = average(
    recoveryRows.slice(0, 7).map((row) => parseRespiratoryRate(row.raw_json)),
  );
  const skinTemp7d = average(recoveryRows.slice(0, 7).map((row) => row.skin_temp_celsius));

  return {
    recoveryScore: latestRecovery?.recovery_score ?? null,
    recoveryTrend3d: round(average(recoveryRows.slice(0, 3).map((row) => row.recovery_score))),
    bodyWeightKg: latestBody?.weight_kilogram ?? null,
    bodyWeightDelta7dKg:
      latestBody?.weight_kilogram !== null && bodyWeight7d !== null
        ? round(latestBody.weight_kilogram - bodyWeight7d)
        : null,
    bodyWeightDelta28dKg:
      latestBody?.weight_kilogram !== null && bodyWeight28d !== null
        ? round(latestBody.weight_kilogram - bodyWeight28d)
        : null,
    whoopDayStrain: latestCycle?.strain ?? null,
    whoopDayStrainVs7d:
      latestCycle?.strain !== null && strain7d !== null ? round(latestCycle.strain - strain7d) : null,
    sleepPerformance: latestSleep?.sleep_performance_percentage ?? null,
    sleepHours: round(sleepHours),
    sleepVsNeedHours:
      sleepHours !== null && sleepNeedHours !== null ? round(sleepHours - sleepNeedHours) : null,
    sleepConsistency: latestSleep?.sleep_consistency_percentage ?? null,
    sleepEfficiency: latestSleep?.sleep_efficiency_percentage ?? null,
    awakeHours: round(hoursFromMillis(latestSleep?.total_awake_time_milli ?? null)),
    latestSleepStart: latestSleep?.start ?? null,
    latestSleepEnd: latestSleep?.end ?? null,
    sleepStageSummary: buildSleepStageSummary(latestSleep),
    restingHeartRate: latestRecovery?.resting_heart_rate ?? null,
    restingHeartRateVs7d:
      latestRecovery?.resting_heart_rate !== null && restingHr7d !== null
        ? round(latestRecovery.resting_heart_rate - restingHr7d)
        : null,
    hrvRmssd: round(latestRecovery?.hrv_rmssd_milli ?? null),
    hrvVs7d:
      latestRecovery?.hrv_rmssd_milli !== null && hrv7d !== null
        ? round(latestRecovery.hrv_rmssd_milli - hrv7d)
        : null,
    respiratoryRate: round(latestRecovery ? parseRespiratoryRate(latestRecovery.raw_json) : null),
    respiratoryRateVs7d:
      latestRecovery !== null && respiratoryRate7d !== null
        ? round(parseRespiratoryRate(latestRecovery.raw_json)! - respiratoryRate7d)
        : null,
    skinTempCelsius: round(latestRecovery?.skin_temp_celsius ?? null),
    skinTempVs7d:
      latestRecovery?.skin_temp_celsius !== null && skinTemp7d !== null
        ? round(latestRecovery.skin_temp_celsius - skinTemp7d)
        : null,
    whoopStrain7dAvg: round(average(workoutRows.slice(0, 7).map((row) => row.strain))),
  };
}


async function buildMiniTrends() {
  const [recoveryRows, cycleRows, sleepRows, bodyRows, liftsThisWeek] = await Promise.all([
    dbAll<Array<{ created_at: string; recovery_score: number | null }>[number]>(
      `
      SELECT created_at, recovery_score
      FROM whoop_recovery_summaries
      WHERE created_at >= ?
      ORDER BY created_at DESC
    `,
      getStartDate(7),
    ),
    dbAll<Array<{ start: string; strain: number | null }>[number]>(
      `
      SELECT start, strain
      FROM whoop_cycles
      WHERE start >= ?
      ORDER BY start DESC
    `,
      getStartDate(7),
    ),
    dbAll<{
      start: string;
      end: string;
      total_in_bed_time_milli: number | null;
      total_awake_time_milli: number | null;
      total_light_sleep_time_milli: number | null;
      total_slow_wave_sleep_time_milli: number | null;
      total_rem_sleep_time_milli: number | null;
    }>(
      `
      SELECT start, total_in_bed_time_milli, total_awake_time_milli,
             total_light_sleep_time_milli, total_slow_wave_sleep_time_milli,
             total_rem_sleep_time_milli
             , "end"
      FROM whoop_sleep_summaries
      WHERE start >= ?
      ORDER BY start DESC
    `,
      getStartDate(7),
    ),
    dbAll<{ observed_on: string; weight_kilogram: number | null }>(
      `
      SELECT observed_on, weight_kilogram
      FROM whoop_body_measurements
      WHERE observed_on >= ?
      ORDER BY observed_on ASC
    `,
      getStartDate(7).slice(0, 10),
    ),
    dbGet<{ count: number }>(
      `
      SELECT COUNT(*) AS count
      FROM hevy_workouts
      WHERE start_time >= ?
    `,
      getStartOfWeekIso(),
    ),
  ]);

  return {
    recovery3d: toThreePointSeries(
      recoveryRows.slice(0, 3).reverse().map((row) => round(row.recovery_score, 0)),
    ),
    strain3d: toThreePointSeries(
      cycleRows.slice(0, 3).reverse().map((row) => round(row.strain)),
    ),
    sleep3d: toThreePointSeries(
      sleepRows
        .slice(0, 3)
        .reverse()
        .map((row) =>
          round(
            getActualSleepHours({
              start: row.start,
              end: row.end,
              sleep_performance_percentage: null,
              sleep_consistency_percentage: null,
              sleep_efficiency_percentage: null,
              total_in_bed_time_milli: row.total_in_bed_time_milli,
              total_awake_time_milli: row.total_awake_time_milli,
              total_light_sleep_time_milli: row.total_light_sleep_time_milli,
              total_slow_wave_sleep_time_milli: row.total_slow_wave_sleep_time_milli,
              total_rem_sleep_time_milli: row.total_rem_sleep_time_milli,
              sleep_needed_baseline_milli: null,
              sleep_needed_debt_milli: null,
              sleep_needed_strain_milli: null,
              sleep_needed_nap_milli: null,
            }),
          ),
        ),
    ),
    weightTrend: toThreePointSeries(bodyRows.map((row) => round(row.weight_kilogram))),
    liftsThisWeek: Number(liftsThisWeek?.count ?? 0),
  };
}

async function buildTrendSeries() {
  const dateWindow7 = getDateWindow(7);
  const dateWindow14 = getDateWindow(14);
  const [recoveryRows, cycleRows, sleepRows, bodyRows, loadRows] = await Promise.all([
    dbAll<{ created_at: string; recovery_score: number | null }>(
      `
      SELECT created_at, recovery_score
      FROM whoop_recovery_summaries
      WHERE created_at >= ?
      ORDER BY created_at DESC
    `,
      getStartDate(14),
    ),
    dbAll<{ start: string; strain: number | null }>(
      `
      SELECT start, strain
      FROM whoop_cycles
      WHERE start >= ?
      ORDER BY start DESC
    `,
      getStartDate(14),
    ),
    dbAll<{
      start: string;
      end: string;
      total_in_bed_time_milli: number | null;
      total_awake_time_milli: number | null;
      total_light_sleep_time_milli: number | null;
      total_slow_wave_sleep_time_milli: number | null;
      total_rem_sleep_time_milli: number | null;
    }>(
      `
      SELECT start, total_in_bed_time_milli, total_awake_time_milli,
             total_light_sleep_time_milli, total_slow_wave_sleep_time_milli,
             total_rem_sleep_time_milli
             , "end"
      FROM whoop_sleep_summaries
      WHERE start >= ?
      ORDER BY start DESC
    `,
      getStartDate(14),
    ),
    dbAll<{
      observed_on: string;
      observed_at: string;
      weight_kilogram: number | null;
    }>(
      `
      SELECT observed_on, observed_at, weight_kilogram
      FROM whoop_body_measurements
      WHERE observed_on >= ?
      ORDER BY observed_on DESC, observed_at DESC
    `,
      getStartDate(21).slice(0, 10),
    ),
    dbAll<{ start_time: string }>(
      `
      SELECT start_time
      FROM hevy_workouts
      WHERE start_time >= ?
      ORDER BY start_time DESC
    `,
      getStartDate(14),
    ),
  ]);

  const latestRecoveryByDay = new Map<string, number | null>();
  for (const row of recoveryRows) {
    const key = getDateKey(row.created_at);
    if (!latestRecoveryByDay.has(key)) {
      latestRecoveryByDay.set(key, round(row.recovery_score, 0));
    }
  }

  const latestStrainByDay = new Map<string, number | null>();
  for (const row of cycleRows) {
    const key = getDateKey(row.start);
    if (!latestStrainByDay.has(key)) {
      latestStrainByDay.set(key, round(row.strain));
    }
  }

  const latestSleepByDay = new Map<string, number | null>();
  for (const row of sleepRows) {
    const key = getDateKey(row.start);
    if (!latestSleepByDay.has(key)) {
      latestSleepByDay.set(
        key,
        round(
          getActualSleepHours({
            start: row.start,
            end: row.end,
            sleep_performance_percentage: null,
            sleep_consistency_percentage: null,
            sleep_efficiency_percentage: null,
            total_in_bed_time_milli: row.total_in_bed_time_milli,
            total_awake_time_milli: row.total_awake_time_milli,
            total_light_sleep_time_milli: row.total_light_sleep_time_milli,
            total_slow_wave_sleep_time_milli: row.total_slow_wave_sleep_time_milli,
            total_rem_sleep_time_milli: row.total_rem_sleep_time_milli,
            sleep_needed_baseline_milli: null,
            sleep_needed_debt_milli: null,
            sleep_needed_strain_milli: null,
            sleep_needed_nap_milli: null,
          }),
        ),
      );
    }
  }

  const latestWeightByDay = new Map<string, number | null>();
  for (const row of bodyRows) {
    if (!latestWeightByDay.has(row.observed_on)) {
      latestWeightByDay.set(row.observed_on, round(kilogramsToPounds(row.weight_kilogram)));
    }
  }

  const loadCountByDay = new Map<string, number>();
  for (const row of loadRows) {
    const key = getDateKey(row.start_time);
    loadCountByDay.set(key, (loadCountByDay.get(key) ?? 0) + 1);
  }

  const toTrendPoints = (
    window: ReturnType<typeof getDateWindow>,
    values: Map<string, number | null>,
    labelKey: "weekday" | "monthDay",
  ): TrendPoint[] =>
    window.map((entry) => ({
      label: entry[labelKey],
      value: values.get(entry.key) ?? null,
    }));

  return {
    recovery7d: toTrendPoints(dateWindow7, latestRecoveryByDay, "weekday"),
    sleep7d: toTrendPoints(dateWindow7, latestSleepByDay, "weekday"),
    strain7d: toTrendPoints(dateWindow7, latestStrainByDay, "weekday"),
    load7d: dateWindow7.map((entry) => ({
      label: entry.weekday,
      value: loadCountByDay.get(entry.key) ?? 0,
    })),
    weight14d: toTrendPoints(dateWindow14, latestWeightByDay, "monthDay"),
  };
}

async function buildBodyCard(readiness: DailyReadiness): Promise<BodyCardSummary> {
  const startOfWeekIso = getStartOfWeekIso();
  const startOfWeek = new Date(startOfWeekIso);
  const [latestWorkout, weekWorkouts] = await Promise.all([
    dbGet<{ title: string | null; start_time: string; raw_json: string }>(
      `
      SELECT title, start_time, raw_json
      FROM hevy_workouts
      ORDER BY start_time DESC
      LIMIT 1
    `,
    ),
    dbAll<{ raw_json: string }>(
      `
      SELECT raw_json
      FROM hevy_workouts
      WHERE start_time >= ?
      ORDER BY start_time DESC
    `,
      getStartOfWeekIso(),
    ),
  ]);
  const weeklyHighlightedRegions = buildWeeklyBodyHighlights(
    weekWorkouts.map((workout) => workout.raw_json),
  );
  const shouldShowLatestOverlay = (() => {
    if (!latestWorkout) {
      return false;
    }

    const latestWorkoutAt = new Date(latestWorkout.start_time);
    if (latestWorkoutAt >= startOfWeek) {
      return true;
    }

    if (!isMonday(new Date())) {
      return false;
    }

    const saturdayStart = new Date(startOfWeek);
    saturdayStart.setDate(startOfWeek.getDate() - 2);
    return latestWorkoutAt >= saturdayStart && latestWorkoutAt < startOfWeek;
  })();
  const latestWorkoutOverlayRegions =
    latestWorkout && shouldShowLatestOverlay
      ? buildBodyHighlightsFromWorkout(latestWorkout.raw_json)
      : [];

  return {
    recoveryScore: readiness.recoveryScore,
    sleepHours: readiness.sleepHours,
    weightLb: kilogramsToPounds(readiness.bodyWeightKg),
    latestWorkoutName: latestWorkout?.title ?? null,
    highlightedRegions: weeklyHighlightedRegions,
    weeklyHighlightedRegions,
    latestWorkoutOverlayRegions,
    displayRegions: weeklyHighlightedRegions.slice(0, 6).map((highlight) => ({
      regionId: highlight.regionId,
      label: highlight.regionId.replace(/([A-Z])/g, " $1").trim(),
      intensity: highlight.intensity,
      view: highlight.view,
    })),
  };
}

async function buildStrainSummary(readiness: DailyReadiness, trainingLoad: DailyTrainingLoad) {
  const score = readiness.whoopDayStrain;
  const latestCycleStart = await dbGet<{ start?: string }>(
    `SELECT start FROM whoop_cycles ORDER BY start DESC LIMIT 1`,
  );
  const todayActivities = latestCycleStart?.start
    ? await dbAll<WhoopWorkoutRow>(
        `
          SELECT id, sport_name, start, "end", strain, average_heart_rate, max_heart_rate
          FROM whoop_workouts
          WHERE start >= ?
          ORDER BY start DESC
        `,
        latestCycleStart.start,
      )
    : [];
  const topActivity =
    [...todayActivities]
      .filter((activity) => typeof activity.strain === "number")
      .sort((left, right) => (right.strain ?? 0) - (left.strain ?? 0))[0] ?? null;
  const supportingPoints: string[] = [];

  if (score !== null) {
    supportingPoints.push(`WHOOP day strain is ${score.toFixed(1)} today.`);
  }
  if (readiness.whoopDayStrainVs7d !== null) {
    supportingPoints.push(
      readiness.whoopDayStrainVs7d >= 0
        ? `${readiness.whoopDayStrainVs7d.toFixed(1)} above your 7-day average.`
        : `${Math.abs(readiness.whoopDayStrainVs7d).toFixed(1)} below your 7-day average.`,
    );
  }
  if (trainingLoad.hevyLastWorkoutTitle) {
    supportingPoints.push(`Most recent Hevy session: ${trainingLoad.hevyLastWorkoutTitle}.`);
  }
  if (topActivity?.sport_name && topActivity.strain !== null) {
    supportingPoints.push(
      `${topActivity.sport_name} is the biggest logged WHOOP activity so far at strain ${topActivity.strain.toFixed(1)}.`,
    );
  }

  let blurb = "Strain context is not available yet.";

  if (score === null) {
    blurb = "WHOOP has not returned a day-level strain score yet, so the app is leaning on sleep, recovery, and training history instead.";
  } else if (
    topActivity?.sport_name &&
    topActivity.strain !== null &&
    score > 0 &&
    topActivity.strain / score >= 0.6
  ) {
    blurb = `Most of today's logged strain appears to be coming from your ${topActivity.sport_name} activity, with the rest likely coming from background daily movement and general day stress.`;
  } else if (trainingLoad.hevyLastWorkoutAt && trainingLoad.upperBodyDaysSince !== null) {
    if (trainingLoad.hevyConsecutiveDays >= 1 && score >= 12) {
      blurb =
        "Today's strain looks meaningfully elevated, and recent lifting is likely one contributor alongside normal daily movement and non-lifting stress.";
    } else if (score >= 10) {
      blurb =
        "Today's strain is moderate. That likely reflects a mix of regular daily activity plus any recent training load, rather than one single hard lift by itself.";
    } else {
      blurb =
        "Today's strain is still on the lighter side, so most of the load so far looks like normal movement and background daily stress rather than a hard training day.";
    }
  } else if (score >= 10) {
    blurb =
      "Today's strain is moderate to high, but without recent training context it is safer to read this as whole-day stress rather than workout-only load.";
  } else {
    blurb =
      "Today's strain is relatively light so far, which usually means everyday movement is the main contributor rather than a demanding workout.";
  }

  return {
    score,
    blurb,
    supportingPoints,
  };
}

async function buildActivityContext(now: Date) {
  const previousWeekStart = addDays(getStartOfWeek(now), -7);
  const rows = await dbAll<WhoopWorkoutRow>(
    `
      SELECT id, sport_name, start, "end", strain, average_heart_rate, max_heart_rate,
             distance_meter
      FROM whoop_workouts
      WHERE start >= ?
      ORDER BY start DESC
    `,
    previousWeekStart.toISOString(),
  );

  return buildActivityContextFromRows(rows, now);
}

async function buildTrainingLoad(): Promise<DailyTrainingLoad> {
  const workouts = await dbAll<HevyWorkoutRow>(
    `
      SELECT id, title, start_time, exercise_count, set_count, volume_kg,
             duration_seconds, raw_json
      FROM hevy_workouts
      WHERE start_time >= ?
      ORDER BY start_time DESC
    `,
    getStartDate(28),
  );
  const workouts7d = workouts.filter((workout) => workout.start_time >= getStartDate(7));
  const workoutsThisWeek = workouts.filter((workout) => workout.start_time >= getStartOfWeekIso());
  const latestWorkout = workouts[0] ?? null;
  const weeklyAverages = [0, 1, 2, 3].map((weekIndex) => {
    const end = Date.now() - weekIndex * 7 * DAY_MS;
    const start = end - 7 * DAY_MS;
    return sum(
      workouts
        .filter((workout) => {
          const time = new Date(workout.start_time).getTime();
          return time <= end && time > start;
        })
        .map((workout) => workout.volume_kg),
    );
  });

  const uniqueDays = new Set(workouts.slice(0, 7).map((workout) => workout.start_time.slice(0, 10)));
  let consecutiveDays = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(Date.now() - offset * DAY_MS).toISOString().slice(0, 10);
    if (uniqueDays.has(date)) {
      consecutiveDays += 1;
    } else {
      break;
    }
  }

  const bucketDates = new Map<MuscleBucket, string>();
  let upperSessionAnchors: string[] = [];
  let lowerSessionAnchors: string[] = [];
  for (const workout of workouts) {
    const buckets = inferBuckets(getExerciseTitles(workout.raw_json));
    for (const bucket of buckets) {
      if (!bucketDates.has(bucket)) {
        bucketDates.set(bucket, workout.start_time);
      }
    }

    if (upperSessionAnchors.length === 0 && buckets.includes("upper")) {
      upperSessionAnchors = getWorkoutExerciseLabels(workout.raw_json).slice(0, 5);
    }

    if (lowerSessionAnchors.length === 0 && buckets.includes("lower")) {
      lowerSessionAnchors = getWorkoutExerciseLabels(workout.raw_json).slice(0, 5);
    }
  }

  return {
    hevyVolume7d: round(sum(workouts7d.map((workout) => workout.volume_kg))) ?? 0,
    hevyVolume28dAvg: round(average(weeklyAverages)) ?? 0,
    hevySetCount7d: sum(workouts7d.map((workout) => workout.set_count)),
    hevyWorkoutCount7d: workouts7d.length,
    hevySetCountThisWeek: sum(workoutsThisWeek.map((workout) => workout.set_count)),
    hevyWorkoutCountThisWeek: workoutsThisWeek.length,
    hevyConsecutiveDays: consecutiveDays,
    hevyLastWorkoutTitle: latestWorkout?.title ?? null,
    hevyLastWorkoutAt: latestWorkout?.start_time ?? null,
    hevyLastWorkoutVolumeKg: latestWorkout?.volume_kg ?? null,
    hevyLastWorkoutDurationSeconds: latestWorkout?.duration_seconds ?? null,
    recentLoadSpike:
      average(weeklyAverages) !== null
        ? (sum(workouts7d.map((workout) => workout.volume_kg)) ?? 0) > (average(weeklyAverages) ?? 0) * 1.2
        : false,
    upperBodyDaysSince: daysSince(bucketDates.get("upper") ?? null),
    lowerBodyDaysSince: daysSince(bucketDates.get("lower") ?? null),
    pushDaysSince: daysSince(bucketDates.get("push") ?? null),
    pullDaysSince: daysSince(bucketDates.get("pull") ?? null),
    muscleFocus: latestWorkout ? getExerciseTitles(latestWorkout.raw_json).slice(0, 4) : [],
    upperSessionAnchors,
    lowerSessionAnchors,
    weeklyMuscleFocus: summarizeWeeklyMuscleHits(
      workoutsThisWeek.map((workout) => workout.raw_json),
    ),
    weeklyMuscleVolume: summarizeWeeklyMuscleVolume(
      workoutsThisWeek.map((workout) => workout.raw_json),
    ),
    latestWorkoutFocus: latestWorkout ? summarizeWorkoutMuscleGroups(latestWorkout.raw_json) : [],
  };
}

async function getRecentHevyWorkouts(days: number) {
  return dbAll<HevyWorkoutRow>(
    `
      SELECT id, title, start_time, exercise_count, set_count, volume_kg,
             duration_seconds, raw_json
      FROM hevy_workouts
      WHERE start_time >= ?
      ORDER BY start_time DESC
    `,
    getStartDate(days),
  );
}

function buildWeightTrend(readiness: DailyReadiness): DailyWeightTrend {
  const currentLb = round(kilogramsToPounds(readiness.bodyWeightKg), 1);
  const deltaLb = round(kilogramsToPounds(readiness.bodyWeightDelta7dKg), 1);
  const average7dLb =
    currentLb !== null && deltaLb !== null ? round(currentLb - deltaLb, 1) : null;

  return {
    currentLb,
    average7dLb,
    weeklyDeltaLb: deltaLb,
  };
}

function formatSignedPounds(value: number | null) {
  if (value === null) {
    return "--";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(1)} lb`;
}

const WEEKLY_LIFT_GOAL = 4;

function getNewYorkWeekdayIndex(date = new Date()) {
  const weekday = NEW_YORK_WEEKDAY.format(date);
  const index = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday);
  return index === -1 ? 0 : index;
}

function formatSplitRecency(trainingLoad: DailyTrainingLoad) {
  return `upper ${
    trainingLoad.upperBodyDaysSince === null ? "not recent" : `${trainingLoad.upperBodyDaysSince}d`
  }, lower ${
    trainingLoad.lowerBodyDaysSince === null ? "not recent" : `${trainingLoad.lowerBodyDaysSince}d`
  }`;
}

function chooseTrainingTarget(trainingLoad: DailyTrainingLoad): DailyPhysiqueDecision["trainingTarget"] {
  const upperDays = trainingLoad.upperBodyDaysSince ?? 99;
  const lowerDays = trainingLoad.lowerBodyDaysSince ?? 99;

  if (upperDays === 99 && lowerDays === 99) {
    return "Either";
  }

  if (lowerDays > upperDays) {
    return "Lower";
  }

  if (upperDays > lowerDays) {
    return "Upper";
  }

  return trainingLoad.hevyLastWorkoutTitle?.toLowerCase().includes("upper") ? "Lower" : "Upper";
}

function buildScheduleEvidence(
  trainingLoad: DailyTrainingLoad,
  now = new Date(),
) {
  const weekdayIndex = getNewYorkWeekdayIndex(now);
  const daysLeftInWeek = 7 - weekdayIndex;
  const daysAfterToday = Math.max(0, daysLeftInWeek - 1);
  const liftsCompleted = trainingLoad.hevyWorkoutCountThisWeek;
  const liftsNeededForGoal = Math.max(0, WEEKLY_LIFT_GOAL - liftsCompleted);
  const canStillHitWeeklyGoalIfRestToday =
    liftsCompleted >= WEEKLY_LIFT_GOAL || liftsCompleted + daysAfterToday >= WEEKLY_LIFT_GOAL;
  const isBehindPace = liftsNeededForGoal > daysLeftInWeek - 1;
  const isOnPace = liftsNeededForGoal <= daysLeftInWeek;
  const weeklyPaceLabel =
    liftsCompleted >= WEEKLY_LIFT_GOAL
      ? "Weekly lift target already met"
      : canStillHitWeeklyGoalIfRestToday
        ? `${liftsNeededForGoal} lifts needed with ${daysAfterToday} days after today`
        : `Behind pace: ${liftsNeededForGoal} lifts needed and schedule pressure is high`;

  return {
    daysLeftInWeek,
    daysAfterToday,
    liftsNeededForGoal,
    canStillHitWeeklyGoalIfRestToday,
    isBehindPace,
    isOnPace,
    weeklyPaceLabel,
  };
}

function buildDecisionFactors(
  readiness: DailyReadiness,
  trainingLoad: DailyTrainingLoad,
  activityContext: DailyActivityContext,
  stressFlags: DailyStressFlags,
  lateNightDisruption: DailyLateNightDisruption,
  schedule: ReturnType<typeof buildScheduleEvidence>,
): DailyPhysiqueDecision["decisionFactors"] {
  const factors: DailyPhysiqueDecision["decisionFactors"] = [];

  factors.push({
    label: schedule.canStillHitWeeklyGoalIfRestToday ? "Schedule flexible" : "Schedule pressure",
    tone: schedule.canStillHitWeeklyGoalIfRestToday ? "positive" : "caution",
    detail: schedule.weeklyPaceLabel,
  });

  if (lateNightDisruption.likelyLane === "illness_like") {
    factors.push({
      label: "Illness-like physiology",
      tone: "caution",
      detail: lateNightDisruption.blurb,
    });
  } else if (stressFlags.illnessRisk) {
    factors.push({
      label: "Physiology caution",
      tone: "caution",
      detail: lateNightDisruption.active
        ? lateNightDisruption.blurb
        : "Recovery markers are off enough to treat today conservatively.",
    });
  } else if (stressFlags.lowRecovery) {
    factors.push({
      label: "Recovery suppressed",
      tone: "caution",
      detail: `Recovery ${readiness.recoveryScore ?? "--"}%`,
    });
  }

  if (stressFlags.poorSleepTrend) {
    factors.push({
      label: "Sleep gap",
      tone: "caution",
      detail: `${readiness.sleepVsNeedHours ?? "--"}h vs need, awake ${readiness.awakeHours ?? "--"}h`,
    });
  }

  if (stressFlags.highTrainingLoad) {
    factors.push({
      label: "Lifting load stacked",
      tone: "caution",
      detail: `${trainingLoad.hevyWorkoutCount7d} lifts / ${trainingLoad.hevySetCount7d} sets in 7d`,
    });
  }

  if (activityContext.hasActivity && !activityContext.fallbackUsed && activityContext.totalStrain >= 8) {
    const latest = activityContext.latestSession;
    factors.push({
      label: latest?.kind === "tennis" ? "Tennis load" : "Conditioning load",
      tone: "caution",
      detail: `${activityContext.displayWindowLabel}: strain ${activityContext.totalStrain.toFixed(1)}`,
    });
  }

  if (trainingLoad.hevyWorkoutCountThisWeek < WEEKLY_LIFT_GOAL) {
    factors.push({
      label: "Weekly lift goal",
      tone: schedule.isBehindPace ? "caution" : "neutral",
      detail: `${trainingLoad.hevyWorkoutCountThisWeek}/${WEEKLY_LIFT_GOAL} lifts Mon-Sun`,
    });
  } else {
    factors.push({
      label: "Weekly lift goal",
      tone: "positive",
      detail: `${trainingLoad.hevyWorkoutCountThisWeek}/${WEEKLY_LIFT_GOAL} lifts complete`,
    });
  }

  factors.push({
    label: "Split recency",
    tone: "neutral",
    detail: formatSplitRecency(trainingLoad),
  });

  return factors.slice(0, 6);
}

function formatSleepStagePrompt(readiness: DailyReadiness) {
  const stages = readiness.sleepStageSummary;
  if (!stages) {
    return "unavailable";
  }

  return [
    `Deep ${stages.deepHours ?? "--"}h`,
    `REM ${stages.remHours ?? "--"}h`,
    `Light ${stages.lightHours ?? "--"}h`,
    `Awake ${stages.awakeHours ?? "--"}h`,
    `In bed ${stages.inBedHours ?? "--"}h`,
  ].join(", ");
}

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}

function buildNutritionTargets(
  manualTargets: Pick<DailyNutritionTargets, "calorieTarget" | "proteinTargetG" | "updatedAt">,
  readiness: DailyReadiness,
  trainingLoad: DailyTrainingLoad,
): DailyNutritionTargets {
  const weightLb = kilogramsToPounds(readiness.bodyWeightKg);
  const weightDeltaLb = kilogramsToPounds(readiness.bodyWeightDelta7dKg);

  if (weightLb === null) {
    return {
      ...manualTargets,
      effectiveCalorieTarget: manualTargets.calorieTarget,
      effectiveProteinTargetG: manualTargets.proteinTargetG,
      smartCalorieTarget: null,
      smartProteinTargetG: null,
      targetSource:
        manualTargets.calorieTarget !== null && manualTargets.proteinTargetG !== null
          ? "manual"
          : "missing",
      smartReason: "Smart targets need a recent body-weight reading.",
    };
  }

  const activityMultiplier =
    trainingLoad.hevyWorkoutCount7d >= 4
      ? 15.7
      : trainingLoad.hevyWorkoutCount7d >= 2
        ? 15.1
        : 14.5;
  const setAdjustment = trainingLoad.hevySetCount7d >= 55 ? 100 : 0;
  const trendAdjustment =
    (weightDeltaLb ?? 0) <= -0.8 && trainingLoad.hevyWorkoutCount7d >= 3
      ? 150
      : (weightDeltaLb ?? 0) >= 1.2
        ? -150
        : 0;
  const smartCalorieTarget = roundToNearest(weightLb * activityMultiplier + setAdjustment + trendAdjustment, 50);
  const smartProteinTargetG = Math.max(130, Math.min(210, roundToNearest(weightLb, 5)));
  const targetSource =
    manualTargets.calorieTarget !== null && manualTargets.proteinTargetG !== null
      ? "manual"
      : "smart";
  const trendPhrase =
    trendAdjustment > 0
      ? "weight is slipping while training demand is present"
      : trendAdjustment < 0
        ? "weight is rising faster than the lean-gain lane"
        : "weight trend is controlled";

  return {
    ...manualTargets,
    effectiveCalorieTarget: manualTargets.calorieTarget ?? smartCalorieTarget,
    effectiveProteinTargetG: manualTargets.proteinTargetG ?? smartProteinTargetG,
    smartCalorieTarget,
    smartProteinTargetG,
    targetSource,
    smartReason: `Based on ${weightLb.toFixed(1)} lb, ${trainingLoad.hevyWorkoutCount7d} lifts, ${trainingLoad.hevySetCount7d} sets, and ${trendPhrase}.`,
  };
}

async function buildNutritionActuals(
  dateKey: string,
  nutritionTargets: DailyNutritionTargets,
): Promise<DailyNutritionActuals> {
  const intake = await getNutritionIntakeSummary(dateKey);
  const calorieTarget = nutritionTargets.effectiveCalorieTarget;
  const proteinTargetG = nutritionTargets.effectiveProteinTargetG;

  return {
    dateKey,
    calories: intake.calories,
    proteinG: intake.proteinG,
    carbsG: intake.carbsG,
    fatG: intake.fatG,
    remainingCalories:
      calorieTarget === null ? null : Math.max(0, calorieTarget - intake.calories),
    remainingProteinG:
      proteinTargetG === null ? null : Math.max(0, proteinTargetG - intake.proteinG),
    calorieTarget,
    proteinTargetG,
    hasLoggedIntake: intake.hasLoggedIntake,
    entries: intake.entries.map((entry) => ({
      id: entry.id,
      mealType: entry.mealType,
      label: entry.label,
      calories: entry.calories,
      proteinG: entry.proteinG,
      carbsG: entry.carbsG,
      fatG: entry.fatG,
      note: entry.note,
      loggedAt: entry.loggedAt,
    })),
  };
}

export function buildPhysiqueDecision(
  readiness: DailyReadiness,
  trainingLoad: DailyTrainingLoad,
  stressFlags: DailyStressFlags,
  lateNightDisruption: DailyLateNightDisruption,
  activityContext: DailyActivityContext,
  nutritionTargets: DailyNutritionTargets,
  nutritionActuals: DailyNutritionActuals,
  strengthProgression: DailyStrengthProgression[],
  now = new Date(),
): DailyPhysiqueDecision {
  const weightTrend = buildWeightTrend(readiness);
  const schedule = buildScheduleEvidence(trainingLoad, now);
  const nextTrainingTarget = chooseTrainingTarget(trainingLoad);
  const latestCurrentWeekActivity =
    activityContext.hasActivity && !activityContext.fallbackUsed ? activityContext.latestSession : null;
  const currentWeekActivityLoad =
    activityContext.hasActivity && !activityContext.fallbackUsed ? activityContext.totalStrain : 0;
  const poorSystemicReadiness =
    stressFlags.lowRecovery ||
    lateNightDisruption.active ||
    ((readiness.sleepVsNeedHours ?? 0) <= -1.25 && (readiness.recoveryScore ?? 100) < 55) ||
    ((readiness.restingHeartRateVs7d ?? 0) >= 4 && (readiness.sleepVsNeedHours ?? 0) <= -0.75);
  const clearIllnessSignal = lateNightDisruption.likelyLane === "illness_like";
  const physiologyRisk = stressFlags.illnessRisk || clearIllnessSignal;
  const conditioningFatigue =
    currentWeekActivityLoad >= 10 ||
    ((latestCurrentWeekActivity?.kind === "tennis" || latestCurrentWeekActivity?.kind === "other_conditioning") &&
      (latestCurrentWeekActivity?.strain ?? 0) >= 8);
  const highLoadPressure =
    stressFlags.highTrainingLoad ||
    trainingLoad.hevyConsecutiveDays >= 3 ||
    trainingLoad.recentLoadSpike ||
    (readiness.whoopDayStrainVs7d ?? 0) >= 4;
  const trainedRecently = trainingLoad.upperBodyDaysSince === 0 || trainingLoad.lowerBodyDaysSince === 0;
  const lowWeeklyFrequency = trainingLoad.hevyWorkoutCountThisWeek < WEEKLY_LIFT_GOAL;
  const strengthDown = strengthProgression.some((item) => item.trend === "down");
  const strengthUp = strengthProgression.some((item) => item.trend === "up");
  const proteinGap =
    nutritionActuals.hasLoggedIntake &&
    nutritionActuals.remainingProteinG !== null &&
    nutritionActuals.remainingProteinG >= 45;
  const calorieGap =
    nutritionActuals.hasLoggedIntake &&
    nutritionActuals.remainingCalories !== null &&
    nutritionActuals.remainingCalories >= 900;
  const shouldRest =
    physiologyRisk ||
    ((poorSystemicReadiness || (conditioningFatigue && stressFlags.poorSleepTrend)) &&
      schedule.canStillHitWeeklyGoalIfRestToday);
  const trainingAvailability: DailyPhysiqueDecision["trainingAvailability"] = shouldRest ? "Rest" : "Train";
  const trainingTarget: DailyPhysiqueDecision["trainingTarget"] =
    trainingAvailability === "Rest" ? "Either" : nextTrainingTarget;
  const sessionAnchors =
    nextTrainingTarget === "Lower"
      ? trainingLoad.lowerSessionAnchors
      : nextTrainingTarget === "Upper"
        ? trainingLoad.upperSessionAnchors
        : [];
  const trainingTargetReason =
    nextTrainingTarget === "Either"
      ? "No clear upper/lower recency exists yet, so use warm-up feel and the planned split."
      : `${nextTrainingTarget} is due based on split recency: ${formatSplitRecency(trainingLoad)}.`;

  const trainingIntent: DailyPhysiqueDecision["trainingIntent"] =
    trainingAvailability === "Rest" || poorSystemicReadiness || conditioningFatigue || highLoadPressure
      ? "Back off"
      : lowWeeklyFrequency && !trainedRecently && schedule.isBehindPace
        ? "Push"
        : "Maintain";
  const intensityLabel =
    trainingAvailability === "Rest"
      ? schedule.canStillHitWeeklyGoalIfRestToday
        ? "Save the lift for a better recovery window"
        : "Rest if symptoms are obvious; otherwise keep it very easy"
      :
    trainingIntent === "Push"
      ? "Add load or reps if warm-up is normal"
      : trainingIntent === "Back off"
        ? "Cap hard sets; preserve the week"
        : "Keep normal volume, no forced PRs";
  const decisionFactors = buildDecisionFactors(
    readiness,
    trainingLoad,
    activityContext,
    stressFlags,
    lateNightDisruption,
    schedule,
  );
  const primaryDecisionReason =
    clearIllnessSignal
      ? "Rest today: physiology looks illness-like, so preserving recovery beats chasing volume."
      : stressFlags.illnessRisk
        ? "Rest today: physiology is sharply off, so preserving recovery beats chasing volume."
      : trainingAvailability === "Rest"
        ? `Rest today: recovery is compromised and ${schedule.weeklyPaceLabel.toLowerCase()}, so you can preserve a better lift.`
        : poorSystemicReadiness
          ? `Train only if needed: recovery is compromised, but ${schedule.weeklyPaceLabel.toLowerCase()}.`
          : schedule.isBehindPace
            ? `Train ${nextTrainingTarget.toLowerCase()} today: the week is behind pace and readiness is acceptable.`
            : `Train ${nextTrainingTarget.toLowerCase()} if you want, but the week does not require a forced push.`;

  const calorieRecommendation: DailyPhysiqueDecision["calorieRecommendation"] =
    nutritionTargets.effectiveCalorieTarget === null
      ? "set target"
      : (weightTrend.weeklyDeltaLb ?? 0) <= -0.8 && trainingLoad.hevyWorkoutCount7d >= 3
        ? "+150 cal"
        : (weightTrend.weeklyDeltaLb ?? 0) >= 1.2 && trainingLoad.hevyWorkoutCount7d < 4
          ? "-150 cal"
          : "maintain";

  const mainBottleneck =
    nutritionTargets.effectiveCalorieTarget === null || nutritionTargets.effectiveProteinTargetG === null
      ? "Body weight is missing, so nutrition targets still need a manual baseline."
      : trainingAvailability === "Rest"
        ? primaryDecisionReason
      : poorSystemicReadiness
        ? "Systemic recovery is the limiter; keep training productive but not heroic."
      : proteinGap
        ? "Protein is behind today; close that gap before judging training progress."
      : calorieGap
        ? "Calories are still light today; keep the meal plan aligned with the session."
      : lowWeeklyFrequency
          ? `${nextTrainingTarget} is the split target; recent training frequency is behind the physique goal.`
          : strengthDown
            ? "Progression is soft on at least one key lift; check food, sleep, and exercise selection."
            : strengthUp
              ? "Progression signal is positive; keep food and volume consistent."
              : "Consistency is the main lever: hit volume, protein, and a stable calorie target.";

  const weeklyScorecard: DailyPhysiqueDecision["weeklyScorecard"] = [
    {
      label: "Lifts",
      value: `${trainingLoad.hevyWorkoutCountThisWeek}/4`,
      detail: `${schedule.liftsNeededForGoal} needed / ${schedule.daysLeftInWeek} days left`,
      status: trainingLoad.hevyWorkoutCountThisWeek >= WEEKLY_LIFT_GOAL ? "good" : "watch",
    },
    {
      label: "Weight trend",
      value: formatSignedPounds(weightTrend.weeklyDeltaLb),
      detail:
        weightTrend.average7dLb === null
          ? "7-day average unavailable"
          : `${weightTrend.average7dLb.toFixed(1)} lb 7d avg`,
      status:
        weightTrend.weeklyDeltaLb === null
          ? "missing"
          : Math.abs(weightTrend.weeklyDeltaLb) <= 0.8
            ? "good"
            : "watch",
    },
    {
      label: "Strength",
      value:
        strengthProgression.length === 0
          ? "--"
          : strengthProgression[0].deltaLabel,
      detail:
        strengthProgression.length === 0
          ? "Need repeat lift history"
          : `${strengthProgression[0].exercise} - ${strengthProgression[0].confidenceLabel}`,
      status:
        strengthProgression.length === 0
          ? "missing"
          : strengthProgression[0].confidence === "low" || strengthProgression[0].trend === "down"
            ? "watch"
            : "good",
    },
    {
      label: "Nutrition",
      value:
        nutritionTargets.effectiveCalorieTarget === null || nutritionTargets.effectiveProteinTargetG === null
          ? "Set target"
          : nutritionActuals.hasLoggedIntake
            ? `${nutritionActuals.proteinG}/${nutritionTargets.effectiveProteinTargetG}g`
            : "No meals",
      detail:
        nutritionTargets.effectiveCalorieTarget === null
          ? "Calories not set"
          : nutritionActuals.hasLoggedIntake
            ? `${nutritionActuals.calories}/${nutritionTargets.effectiveCalorieTarget} cal`
            : `${nutritionTargets.effectiveCalorieTarget} cal / ${nutritionTargets.effectiveProteinTargetG}g target`,
      status:
        nutritionTargets.effectiveCalorieTarget === null || nutritionTargets.effectiveProteinTargetG === null
          ? "missing"
          : nutritionActuals.hasLoggedIntake
            ? "good"
            : "missing",
    },
  ];

  return {
    trainingAvailability,
    trainingTarget,
    nextTrainingTarget,
    trainingTargetReason,
    trainingIntent,
    intensityLabel,
    sessionAnchors,
    calorieRecommendation,
    calorieTargetLabel:
      nutritionTargets.effectiveCalorieTarget === null
        ? "Set target"
        : `${nutritionTargets.effectiveCalorieTarget} cal`,
    proteinTargetLabel:
      nutritionTargets.effectiveProteinTargetG === null
        ? "Set target"
        : `${nutritionTargets.effectiveProteinTargetG}g`,
    mainBottleneck,
    primaryDecisionReason,
    daysLeftInWeek: schedule.daysLeftInWeek,
    liftsNeededForGoal: schedule.liftsNeededForGoal,
    canStillHitWeeklyGoalIfRestToday: schedule.canStillHitWeeklyGoalIfRestToday,
    weeklyPaceLabel: schedule.weeklyPaceLabel,
    decisionFactors,
    weightTrend,
    strengthProgression,
    weeklyScorecard,
  };
}

function buildStressFlags(readiness: DailyReadiness, trainingLoad: DailyTrainingLoad): DailyStressFlags {
  return {
    illnessRisk:
      (readiness.respiratoryRateVs7d ?? 0) > 0.3 ||
      (readiness.skinTempVs7d ?? 0) > 0.3 ||
      ((readiness.restingHeartRateVs7d ?? 0) >= 4 && (readiness.sleepVsNeedHours ?? 0) < -0.5),
    poorSleepTrend:
      (readiness.sleepVsNeedHours ?? 0) < -0.75 ||
      (readiness.sleepConsistency ?? 100) < 70 ||
      (readiness.sleepPerformance ?? 100) < 75,
    lowRecovery: (readiness.recoveryScore ?? 100) < 45,
    elevatedRestingHeartRate: (readiness.restingHeartRateVs7d ?? 0) >= 4,
    suppressedHrv: (readiness.hrvVs7d ?? 0) <= -8,
    elevatedRespiratoryRate: (readiness.respiratoryRateVs7d ?? 0) >= 0.3,
    elevatedSkinTemp: (readiness.skinTempVs7d ?? 0) >= 0.3,
    highTrainingLoad:
      trainingLoad.hevyWorkoutCount7d >= 5 ||
      trainingLoad.hevyConsecutiveDays >= 3 ||
      trainingLoad.recentLoadSpike,
    localFatigueUpper:
      trainingLoad.upperBodyDaysSince !== null && trainingLoad.upperBodyDaysSince <= 1,
    localFatigueLower:
      trainingLoad.lowerBodyDaysSince !== null && trainingLoad.lowerBodyDaysSince <= 1,
  };
}

function recommendation(
  category: DailyRecommendation["category"],
  title: string,
  action: string,
  actionBullets: string[],
  primaryActions: RecommendationActionTile[],
  conditionalActions: RecommendationActionTile[] | undefined,
  why: string,
  supportingMetrics: string[],
  signalScore: number,
  priority: RecommendationPriority,
): DailyRecommendation {
  return {
    category,
    title,
    action,
    actionBullets,
    primaryActions,
    conditionalActions,
    why,
    supportingMetrics,
    confidence: getConfidenceLabel(signalScore),
    priority,
  };
}

function buildRecommendations(
  readiness: DailyReadiness,
  trainingLoad: DailyTrainingLoad,
  physiqueDecision: DailyPhysiqueDecision,
  activityContext: DailyActivityContext,
  stressFlags: DailyStressFlags,
  lateNightDisruption: DailyLateNightDisruption,
  freshness: DailyFreshness,
) {
  const stalePenalty = Number(freshness.whoop.isStale) + Number(freshness.hevy.isStale);
  const items: DailyRecommendation[] = [];

  if (physiqueDecision.trainingAvailability === "Rest") {
    const nextTarget =
      physiqueDecision.nextTrainingTarget === "Either"
        ? "planned split"
        : `${physiqueDecision.nextTrainingTarget.toLowerCase()} day`;
    items.push(
      recommendation(
        "training",
        "Rest today and preserve the next lift",
        `Use today as a recovery day so the next ${nextTarget} can be higher quality.`,
        [
          "Save the lift for a better recovery window",
          "Use an easy walk or mobility session if you want movement",
          "Only do light technique if symptoms and warm-up clearly improve",
        ],
        [
          { label: "Rest", icon: "rest" },
          { label: "Easy walk", icon: "walk" },
          { label: "Technique", icon: "technique" },
        ],
        undefined,
        physiqueDecision.primaryDecisionReason,
        [
          `Week ${trainingLoad.hevyWorkoutCountThisWeek}/4 lifts`,
          `${physiqueDecision.liftsNeededForGoal} needed`,
          `${physiqueDecision.daysLeftInWeek} days left`,
        ],
        3 - stalePenalty,
        "high",
      ),
    );
  } else if (physiqueDecision.trainingIntent === "Push") {
    const target =
      physiqueDecision.trainingTarget === "Either"
        ? "planned"
        : physiqueDecision.trainingTarget.toLowerCase();
    items.push(
      recommendation(
        "training",
        `Progress ${target} day`,
        "Use the first working sets to confirm readiness, then add load or reps on the planned anchors without adding junk volume.",
        [
          "Use warm-up and first working sets to confirm readiness",
          "Add load or reps on one or two anchor lifts",
          "Keep accessory work clean and avoid extra junk volume",
        ],
        [
          { label: "Warm-up check", icon: "technique" },
          { label: "Add reps/load", icon: "fuel" },
          { label: "Clean accessories", icon: "technique" },
        ],
        undefined,
        physiqueDecision.mainBottleneck,
        [
          `Target ${physiqueDecision.trainingTarget}`,
          `Upper ${trainingLoad.upperBodyDaysSince ?? "--"}d`,
          `Lower ${trainingLoad.lowerBodyDaysSince ?? "--"}d`,
          `Week ${trainingLoad.hevyWorkoutCountThisWeek}/4 lifts`,
        ],
        3 - stalePenalty,
        "high",
      ),
    );
  } else if (
    (readiness.recoveryScore ?? 0) >= 65 &&
    (readiness.sleepVsNeedHours ?? -10) > -0.25 &&
    !trainingLoad.recentLoadSpike &&
    trainingLoad.hevyConsecutiveDays < 3
  ) {
    items.push(
      recommendation(
        "training",
        "This is a good day for a meaningful workout",
        `If your warm-up feels normal, lean into a ${stressFlags.localFatigueLower ? "harder upper-body or mixed" : "harder"} session.`,
        [
          "Use the warm-up to confirm you feel normal",
          `Lean into a ${stressFlags.localFatigueLower ? "harder upper-body or mixed" : "harder"} session`,
          "Keep execution sharp instead of chasing junk volume",
        ],
        [
          { label: "Warm-up", icon: "technique" },
          { label: "Train hard", icon: "fuel" },
          { label: "Sharp reps", icon: "technique" },
        ],
        undefined,
        "Sleep, recovery, and recent training load are supportive of productive work today.",
        [
          `Recovery ${readiness.recoveryScore ?? "--"}`,
          `Sleep gap ${readiness.sleepVsNeedHours ?? "--"}h`,
          `7d volume ${poundsText(trainingLoad.hevyVolume7d, 0)}`,
        ],
        3 - stalePenalty,
        "high",
      ),
    );
  } else {
    const target =
      physiqueDecision.trainingTarget === "Either"
        ? "planned"
        : physiqueDecision.trainingTarget.toLowerCase();
    items.push(
      recommendation(
        "training",
        `Maintain ${target} day`,
        "Hit the planned split with normal volume, then stop before the session turns into forced progression.",
        [
          "Use normal working weights",
          "Hit planned volume without chasing forced PRs",
          "Leave the session with clean reps still available",
        ],
        [
          { label: "Normal load", icon: "fuel" },
          { label: "Planned sets", icon: "technique" },
          { label: "Stop clean", icon: "rest" },
        ],
        undefined,
        physiqueDecision.mainBottleneck,
        [
          `Target ${physiqueDecision.trainingTarget}`,
          `Recovery ${readiness.recoveryScore ?? "--"}`,
          `Consecutive days ${trainingLoad.hevyConsecutiveDays}`,
          `Load spike ${trainingLoad.recentLoadSpike ? "yes" : "no"}`,
        ],
        2 - stalePenalty,
        "medium",
      ),
    );
  }

  const latestActivity = activityContext.latestSession;
  if (
    latestActivity?.kind === "tennis" &&
    (latestActivity.strain ?? 0) >= 8 &&
    (stressFlags.lowRecovery || stressFlags.poorSleepTrend || lateNightDisruption.active)
  ) {
    items.push(
      recommendation(
        "recovery",
        "Account for tennis conditioning load",
        "Treat the tennis session as real conditioning stress when deciding whether warm-up quality is good enough to push.",
        [
          "Let warm-up quality decide whether to progress",
          "Keep easy movement easy if recovery is soft",
          "Do not count tennis as lifting volume, but do count it as fatigue context",
        ],
        [
          { label: "Warm-up check", icon: "technique" },
          { label: "Easy movement", icon: "walk" },
          { label: "Downshift", icon: "rest" },
        ],
        undefined,
        activityContext.interpretation,
        [
          `${latestActivity.sportName} strain ${latestActivity.strain?.toFixed(1) ?? "--"}`,
          `${latestActivity.durationMinutes} min`,
          `${activityContext.displayWindowLabel} context`,
        ],
        2 - stalePenalty,
        "medium",
      ),
    );
  }

  if (lateNightDisruption.active) {
    items.push(
      recommendation(
        "recovery",
        lateNightDisruption.likelyLane === "hangover_like"
          ? "Use late-night recovery support"
          : lateNightDisruption.likelyLane === "illness_like"
            ? "Use simple sick-day support, not a normal training day"
            : "Use gentle stomach and recovery support first",
        lateNightDisruption.likelyLane === "hangover_like"
          ? "Start with water plus electrolytes, keep food easy to digest if your stomach is off, and use caffeine carefully instead of trying to force intensity through a rough recovery signal."
          : lateNightDisruption.likelyLane === "illness_like"
            ? "Hydrate, use electrolytes if intake feels low, keep food bland and easy to tolerate like toast or broth if your stomach is off, and rest more aggressively. Let symptoms, not ambition, decide whether any movement is worth it."
            : "Hydrate first, keep food gentle and bland if your stomach feels off, use ginger chews if nausea shows up, and let symptoms rather than ambition decide how active you should be today.",
        lateNightDisruption.likelyLane === "hangover_like"
          ? [
              "Start with water plus electrolytes",
              "Keep food easy to digest if your stomach is off",
              "Use caffeine carefully rather than forcing intensity",
              "Downshift training if warm-up feels unusually flat",
            ]
          : lateNightDisruption.likelyLane === "illness_like"
            ? [
                "Hydrate early and use electrolytes if intake feels low",
                "Keep food bland and easy to tolerate if your stomach is off",
                "Rest more aggressively than a normal recovery day",
                "Only use easy movement if symptoms and warm-up clearly allow it",
              ]
            : [
                "Hydrate first",
                "Keep food gentle and bland if your stomach feels off",
                "Use ginger chews if nausea shows up",
                "Let symptoms decide how active you should be today",
              ],
        lateNightDisruption.likelyLane === "hangover_like"
          ? [
              { label: "Electrolytes", icon: "electrolytes" },
              { label: "Easy food", icon: "food" },
            ]
          : lateNightDisruption.likelyLane === "illness_like"
            ? [
                { label: "Hydrate", icon: "electrolytes" },
                { label: "Easy food", icon: "food" },
                { label: "Rest harder", icon: "rest" },
              ]
            : [
                { label: "Hydrate", icon: "electrolytes" },
                { label: "Gentle food", icon: "food" },
                { label: "Symptom-led", icon: "symptoms" },
              ],
        lateNightDisruption.likelyLane === "hangover_like"
          ? [
              { label: "Easy walk", icon: "walk", conditionLabel: "if stiff" },
              { label: "Early meal", icon: "food", conditionLabel: "if flat" },
            ]
          : undefined,
        lateNightDisruption.blurb,
        lateNightDisruption.supportingMetrics,
        lateNightDisruption.confidence === "high" ? 3 - stalePenalty : 2 - stalePenalty,
        "high",
      ),
    );
  }

  items.push(
    (trainingLoad.hevyLastWorkoutVolumeKg ?? 0) > 8000 || trainingLoad.hevyWorkoutCount7d >= 4
      ? recommendation(
          "nutrition",
          "Prioritize recovery fueling today",
          "Keep protein high and bias more carbs around training or earlier in the day instead of under-fueling.",
          [
            "Keep protein high across the day",
            "Bias more carbs around training or earlier in the day",
            "Do not under-fuel a high-demand week",
          ],
          [
            { label: "Protein", icon: "protein" },
            { label: "Carbs", icon: "carbs" },
            { label: "Fuel enough", icon: "fuel" },
          ],
          undefined,
          (readiness.bodyWeightDelta7dKg ?? 0) <= -0.6
            ? "Recent training demand is high and body weight is trending down, which can be a sign that recovery fueling is lagging demand."
            : "Recent training demand is high enough that consistent fueling will support recovery, performance, and feeling better.",
          [
            `Last volume ${poundsText(trainingLoad.hevyLastWorkoutVolumeKg, 0)}`,
            `7d workouts ${trainingLoad.hevyWorkoutCount7d}`,
            `7d sets ${trainingLoad.hevySetCount7d}`,
            `Weight 7d delta ${signedPoundsText(readiness.bodyWeightDelta7dKg)}`,
          ],
          2 - stalePenalty,
          "medium",
        )
      : recommendation(
          "nutrition",
          "Keep food simple and protein-consistent",
          "Hit steady protein across the day, keep meals regular, and avoid treating a lighter day like a reason to under-eat.",
          [
            "Hit steady protein across the day",
            "Keep meals regular and simple",
            "Do not use a lighter day as a reason to under-eat",
          ],
          [
            { label: "Protein", icon: "protein" },
            { label: "Regular meals", icon: "food" },
            { label: "Do not under-eat", icon: "fuel" },
          ],
          undefined,
          "Longevity and body-composition goals respond better to consistency than dramatic swings.",
          [
            `Sleep ${readiness.sleepHours ?? "--"}h`,
            `Workout count ${trainingLoad.hevyWorkoutCount7d}`,
            `Weight 28d delta ${signedPoundsText(readiness.bodyWeightDelta28dKg)}`,
          ],
          1,
          "medium",
        ),
  );

  if (stressFlags.poorSleepTrend || stressFlags.elevatedRestingHeartRate || stressFlags.suppressedHrv) {
    items.push(
      recommendation(
        "recovery",
        "Treat sleep and downregulation as a priority",
        "Protect tonight's sleep opportunity, lower nonessential stress, and use simple recovery work like walking and a calmer evening.",
        [
          "Protect tonight's sleep opportunity",
          "Lower nonessential stress and stimulation",
          "Use walking or a calmer evening instead of more intensity",
        ],
        [
          { label: "Protect sleep", icon: "sleep" },
          { label: "Downshift", icon: "stress" },
          { label: "Easy walk", icon: "walk" },
        ],
        undefined,
        "Your recent recovery pattern suggests returning to baseline matters more than squeezing out extra intensity.",
        [
          `Sleep performance ${readiness.sleepPerformance ?? "--"}%`,
          `Sleep consistency ${readiness.sleepConsistency ?? "--"}%`,
          `HRV delta ${readiness.hrvVs7d ?? "--"}`,
        ],
        3 - stalePenalty,
        "high",
      ),
    );
  }

  if (trainingLoad.hevyWorkoutCount7d >= 3) {
    items.push(
      recommendation(
        "supplement",
        "Keep the supplement stack conservative",
        "If you already use creatine monohydrate and tolerate it well, keep it steady rather than adding more supplements.",
        [
          "Keep creatine steady if you already tolerate it well",
          "Do not add new supplements just because today feels off",
        ],
        [
          { label: "Keep steady", icon: "symptoms" },
          { label: "No new stack", icon: "stomach" },
        ],
        undefined,
        "Given regular lifting, creatine remains the highest-confidence supplement fit.",
        [
          `7d workouts ${trainingLoad.hevyWorkoutCount7d}`,
          `7d volume ${poundsText(trainingLoad.hevyVolume7d, 0)}`,
        ],
        2,
        "low",
      ),
    );
  }

  if (stressFlags.illnessRisk) {
    items.push(
      recommendation(
        "caution",
        "Your physiology may be under extra stress",
        "Avoid using stimulants or a hard workout to push through if you feel off; let symptoms and warm-up feel guide you conservatively.",
        [
          "Do not try to push through with stimulants",
          "Skip the hard workout if you still feel off after warming up",
          "Use symptoms and warm-up feel as your limiter today",
        ],
        [
          { label: "No stimulants", icon: "stress" },
          { label: "Skip hard push", icon: "rest" },
          { label: "Symptom-led", icon: "symptoms" },
        ],
        undefined,
        "Multiple WHOOP markers are drifting away from baseline in a way that can reflect systemic stress.",
        [
          `Resp delta ${readiness.respiratoryRateVs7d ?? "--"}`,
          `Temp delta ${readiness.skinTempVs7d ?? "--"}`,
          `RHR delta ${readiness.restingHeartRateVs7d ?? "--"}`,
        ],
        3 - stalePenalty,
        "high",
      ),
    );
  }

  if ((readiness.bodyWeightDelta7dKg ?? 0) <= -0.9 && trainingLoad.hevyWorkoutCount7d >= 3) {
    items.push(
      recommendation(
        "caution",
        "Weight is dropping quickly relative to recent baseline",
        "If that drop is not intentional, treat it as a sign to tighten recovery fueling and avoid stacking hard training on top of low energy availability.",
        [
          "Tighten recovery fueling if the drop is not intentional",
          "Avoid stacking hard training on top of low energy availability",
          "Use the next few days to stabilize instead of digging deeper",
        ],
        [
          { label: "Fuel more", icon: "fuel" },
          { label: "Back off load", icon: "rest" },
          { label: "Stabilize", icon: "symptoms" },
        ],
        undefined,
        "Short-term body-weight drops become more meaningful when training demand is already high.",
        [
          `Weight 7d delta ${signedPoundsText(readiness.bodyWeightDelta7dKg)}`,
          `7d workouts ${trainingLoad.hevyWorkoutCount7d}`,
          `Recovery ${readiness.recoveryScore ?? "--"}`,
        ],
        2 - stalePenalty,
        "medium",
      ),
    );
  }

  return items.slice(0, 5);
}

function buildWhyChangedToday(
  readiness: DailyReadiness,
  trainingLoad: DailyTrainingLoad,
  activityContext: DailyActivityContext,
  stressFlags: DailyStressFlags,
  lateNightDisruption: DailyLateNightDisruption,
): DailyWhyChanged {
  const deltas: string[] = [];

  if (lateNightDisruption.active) {
    deltas.push(lateNightDisruption.blurb);
  }

  if ((readiness.sleepVsNeedHours ?? 0) < -0.75) {
    deltas.push(`Sleep is running ${Math.abs(readiness.sleepVsNeedHours ?? 0)}h below need.`);
  }
  if ((readiness.restingHeartRateVs7d ?? 0) >= 4) {
    deltas.push("Resting heart rate is elevated versus your 7-day baseline.");
  }
  if ((readiness.bodyWeightDelta7dKg ?? 0) <= -0.9) {
    deltas.push(
      `Body weight is down ${poundsText(Math.abs(readiness.bodyWeightDelta7dKg ?? 0), 1)} versus your 7-day trend.`,
    );
  }
  if (trainingLoad.recentLoadSpike) {
    deltas.push("Recent lifting load is above your rolling 28-day baseline.");
  }
  if (trainingLoad.hevyConsecutiveDays >= 3) {
    deltas.push(`You are on a ${trainingLoad.hevyConsecutiveDays}-day lifting streak.`);
  }
  if (activityContext.hasActivity) {
    const latest = activityContext.latestSession;
    if (activityContext.fallbackUsed) {
      deltas.push(
        `${activityContext.displayWindowLabel} activity context: ${activityContext.summaryLine} This is reference context, not current-week lifting load.`,
      );
    } else if (latest?.kind === "tennis" && (latest.strain ?? 0) >= 8) {
      deltas.push(
        `Tennis added a meaningful conditioning load this week at strain ${latest.strain?.toFixed(1) ?? "--"}.`,
      );
    } else if (activityContext.totalDurationMinutes >= 60) {
      deltas.push(
        `${activityContext.displayWindowLabel} includes ${activityContext.totalDurationMinutes} minutes of non-lifting movement.`,
      );
    }
  }
  if (stressFlags.illnessRisk) {
    deltas.push("Recovery markers suggest extra physiological stress today.");
  }
  if (deltas.length === 0) {
    deltas.push("Your readiness and recent training load are relatively stable versus baseline.");
  }

  return {
    headline: deltas[0] ?? "Your signals are stable today.",
    deltas,
  };
}

function buildPromptText(summary: DailySummary) {
  const intensityDisplay =
    summary.physiqueDecision.trainingIntent === "Push"
      ? "Progress"
      : summary.physiqueDecision.trainingIntent;
  const latestActivity = summary.activityContext.latestSession;

  return [
    "Goal",
    "- Physique progression without ignoring recovery.",
    "",
    "Decision layer",
    `- Training availability: ${summary.physiqueDecision.trainingAvailability}`,
    `- Training target: ${summary.physiqueDecision.trainingTarget}`,
    `- Next training target: ${summary.physiqueDecision.nextTrainingTarget}`,
    `- Training target reason: ${summary.physiqueDecision.trainingTargetReason}`,
    `- Decision reason: ${summary.physiqueDecision.primaryDecisionReason}`,
    `- Weekly pace: ${summary.physiqueDecision.weeklyPaceLabel}`,
    `- Lifts needed for 4x: ${summary.physiqueDecision.liftsNeededForGoal}`,
    `- Days left in week: ${summary.physiqueDecision.daysLeftInWeek}`,
    `- Can still hit 4x if resting today: ${summary.physiqueDecision.canStillHitWeeklyGoalIfRestToday ? "yes" : "no"}`,
    `- Decision factors: ${summary.physiqueDecision.decisionFactors.map((factor) => `${factor.label} (${factor.tone}): ${factor.detail}`).join("; ")}`,
    `- Intensity intent: ${intensityDisplay}`,
    `- Intensity cue: ${summary.physiqueDecision.intensityLabel}`,
    `- Session anchors: ${
      summary.physiqueDecision.sessionAnchors.length > 0
        ? summary.physiqueDecision.sessionAnchors.join(", ")
        : "Use planned main lifts"
    }`,
    `- Calories: ${summary.physiqueDecision.calorieTargetLabel} (${summary.physiqueDecision.calorieRecommendation})`,
    `- Protein: ${summary.physiqueDecision.proteinTargetLabel}`,
    `- Intake logged today: ${
      summary.nutritionActuals.hasLoggedIntake
        ? `${summary.nutritionActuals.calories}/${summary.nutritionActuals.calorieTarget ?? "--"} cal, ${summary.nutritionActuals.proteinG}/${summary.nutritionActuals.proteinTargetG ?? "--"}g protein, ${summary.nutritionActuals.carbsG}g carbs, ${summary.nutritionActuals.fatG}g fat`
        : "No meals logged yet"
    }`,
    `- Intake remaining: ${
      summary.nutritionActuals.remainingCalories === null
        ? "No calorie target"
        : `${summary.nutritionActuals.remainingCalories} cal`
    }, ${
      summary.nutritionActuals.remainingProteinG === null
        ? "no protein target"
        : `${summary.nutritionActuals.remainingProteinG}g protein`
    }`,
    `- Bottleneck: ${summary.physiqueDecision.mainBottleneck}`,
    "",
    "Metrics",
    `- Recovery: ${summary.readiness.recoveryScore ?? "--"}%`,
    `- Sleep: ${summary.readiness.sleepHours ?? "--"}h (${summary.readiness.sleepVsNeedHours ?? "--"}h vs need)`,
    `- Sleep composition: ${formatSleepStagePrompt(summary.readiness)}`,
    `- Strain: ${summary.strainSummary.score ?? "--"}`,
    `- Overnight: ${summary.overnightRead.label}. ${summary.overnightRead.detail}`,
    `- Weight: ${summary.physiqueDecision.weightTrend.currentLb ?? "--"} lb (${formatSignedPounds(summary.physiqueDecision.weightTrend.weeklyDeltaLb)} vs 7d avg)`,
    `- Training this week: ${summary.trainingLoad.hevyWorkoutCountThisWeek} workouts, ${summary.trainingLoad.hevySetCountThisWeek} sets`,
    `- Rolling 7-day training: ${summary.trainingLoad.hevyWorkoutCount7d} workouts, ${summary.trainingLoad.hevySetCount7d} sets`,
    `- Activity context (${summary.activityContext.displayWindowLabel}): ${summary.activityContext.summaryLine}`,
    `- Latest non-lifting activity: ${
      latestActivity
        ? `${latestActivity.sportName}, ${latestActivity.durationMinutes} min, strain ${latestActivity.strain ?? "--"}`
        : "none"
    }`,
    `- Activity interpretation: ${summary.activityContext.interpretation}`,
    `- Weekly effective sets: ${
      summary.trainingLoad.weeklyMuscleVolume.length
        ? summary.trainingLoad.weeklyMuscleVolume
            .slice(0, 8)
            .map((item) => `${item.label} ${item.effectiveSets}`)
            .join(", ")
        : "none logged"
    }`,
    `- Strength progression: ${
      summary.physiqueDecision.strengthProgression.length
        ? summary.physiqueDecision.strengthProgression
            .slice(0, 5)
            .map((item) => `${item.exercise} ${item.deltaLabel} (${item.confidenceLabel})`)
            .join(", ")
        : "not enough repeat lift history"
    }`,
    "",
    "Ask",
    "- Make a fresh call for training, eating, recovery, supplements, and cautions.",
  ].join("\n");
}

export async function getDailySummary(): Promise<DailySummary> {
  const now = new Date();
  const dateKey = getDateKey(now);
  const [freshness, miniTrends, trendSeries, readiness, trainingLoad] = await Promise.all([
    buildFreshness(),
    buildMiniTrends(),
    buildTrendSeries(),
    buildReadiness(),
    buildTrainingLoad(),
  ]);
  const stressFlags = buildStressFlags(readiness, trainingLoad);
  const nutritionTargets = buildNutritionTargets(await getNutritionTargets(), readiness, trainingLoad);
  const nutritionActuals = await buildNutritionActuals(dateKey, nutritionTargets);
  const strengthProgression = buildStrengthProgression(await getRecentHevyWorkouts(90));
  const lateNightDisruption = deriveLateNightDisruption(readiness, stressFlags);
  const overnightRead = buildOvernightRead(lateNightDisruption, readiness);
  const [strainSummary, bodyCard, activityContext] = await Promise.all([
    buildStrainSummary(readiness, trainingLoad),
    buildBodyCard(readiness),
    buildActivityContext(now),
  ]);
  const physiqueDecision = buildPhysiqueDecision(
    readiness,
    trainingLoad,
    stressFlags,
    lateNightDisruption,
    activityContext,
    nutritionTargets,
    nutritionActuals,
    strengthProgression,
    now,
  );
  const recommendations = buildRecommendations(
    readiness,
    trainingLoad,
    physiqueDecision,
    activityContext,
    stressFlags,
    lateNightDisruption,
    freshness,
  );
  const whyChangedToday = buildWhyChangedToday(
    readiness,
    trainingLoad,
    activityContext,
    stressFlags,
    lateNightDisruption,
  );

  const summary: DailySummary = {
    date: now.toISOString(),
    contextLine: "Goal: longevity and feeling good first; strength/body composition second.",
    miniTrends,
    trendSeries,
    readiness,
    trainingLoad,
    stressFlags,
    lateNightDisruption,
    overnightRead,
    strainSummary,
    nutritionTargets,
    nutritionActuals,
    physiqueDecision,
    activityContext,
    bodyCard,
    recommendations,
    freshness,
    whyChangedToday,
    llmPromptText: "",
  };

  summary.llmPromptText = buildPromptText(summary);
  return summary;
}
