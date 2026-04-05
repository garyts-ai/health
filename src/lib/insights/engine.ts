import { getDb } from "@/lib/db";
import { getHevyConnectionStatus } from "@/lib/hevy/provider";
import {
  buildBodyHighlightsFromWorkout,
  summarizeWeeklyMuscleHits,
  summarizeWorkoutMuscleGroups,
} from "@/lib/insights/body-map";
import { buildOvernightRead, deriveLateNightDisruption } from "@/lib/insights/overnight-read";
import { kilogramsToPounds } from "@/lib/units";
import { getWhoopConnectionStatus } from "@/lib/whoop/provider";
import type {
  BodyCardSummary,
  DailyFreshness,
  DailyLateNightDisruption,
  DailyReadiness,
  DailyRecommendation,
  RecommendationActionTile,
  DailyStressFlags,
  DailySummary,
  DailyTrainingLoad,
  TrendPoint,
  DailyWhyChanged,
  RecommendationConfidence,
  RecommendationPriority,
} from "@/lib/insights/types";

type WhoopSleepRow = {
  start: string;
  sleep_performance_percentage: number | null;
  sleep_consistency_percentage: number | null;
  sleep_efficiency_percentage: number | null;
  total_in_bed_time_milli: number | null;
  total_awake_time_milli: number | null;
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

  if (
    typeof row.total_in_bed_time_milli === "number" &&
    typeof row.total_awake_time_milli === "number"
  ) {
    return Math.max(0, (row.total_in_bed_time_milli - row.total_awake_time_milli) / 3_600_000);
  }

  return hoursFromMillis(row.total_in_bed_time_milli);
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

function inferBuckets(exerciseTitles: string[]) {
  const buckets = new Set<MuscleBucket>();

  for (const title of exerciseTitles) {
    if (
      /(squat|deadlift|lunge|leg|calf|hamstring|glute|quad|rdl|hip thrust|split squat)/.test(
        title,
      )
    ) {
      buckets.add("lower");
    }

    if (/(bench|press|dip|push|incline|tricep|fly|pec)/.test(title)) {
      buckets.add("push");
      buckets.add("upper");
    }

    if (/(row|pull|lat|chin|curl|rear delt|face pull|pullup|pulldown)/.test(title)) {
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

function buildFreshness(): DailyFreshness {
  const whoop = getWhoopConnectionStatus();
  const hevy = getHevyConnectionStatus();

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

function buildReadiness(): DailyReadiness {
  const db = getDb();
  const sleepRows = db
    .prepare(`
      SELECT start, sleep_performance_percentage, sleep_consistency_percentage,
             sleep_efficiency_percentage, total_in_bed_time_milli, total_awake_time_milli, sleep_needed_baseline_milli,
             sleep_needed_debt_milli, sleep_needed_strain_milli, sleep_needed_nap_milli
      FROM whoop_sleep_summaries
      WHERE start >= ?
      ORDER BY start DESC
    `)
    .all(getStartDate(28)) as WhoopSleepRow[];
  const recoveryRows = db
    .prepare(`
      SELECT created_at, recovery_score, resting_heart_rate, hrv_rmssd_milli,
             skin_temp_celsius, raw_json
      FROM whoop_recovery_summaries
      WHERE created_at >= ?
      ORDER BY created_at DESC
    `)
    .all(getStartDate(28)) as WhoopRecoveryRow[];
  const cycleRows = db
    .prepare(`
      SELECT id, start, "end", strain, kilojoule, average_heart_rate, max_heart_rate, raw_json
      FROM whoop_cycles
      WHERE start >= ?
      ORDER BY start DESC
    `)
    .all(getStartDate(28)) as WhoopCycleRow[];
  const bodyRows = db
    .prepare(`
      SELECT observed_on, observed_at, weight_kilogram, height_meter, max_heart_rate
      FROM whoop_body_measurements
      WHERE observed_on >= ?
      ORDER BY observed_on DESC
    `)
    .all(getStartDate(28).slice(0, 10)) as WhoopBodyMeasurementRow[];
  const workoutRows = db
    .prepare(`
      SELECT start, strain
      FROM whoop_workouts
      WHERE start >= ?
      ORDER BY start DESC
    `)
    .all(getStartDate(28)) as WhoopWorkoutRow[];

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


function buildMiniTrends() {
  const db = getDb();
  const recoveryRows = db
    .prepare(`
      SELECT created_at, recovery_score
      FROM whoop_recovery_summaries
      WHERE created_at >= ?
      ORDER BY created_at DESC
    `)
    .all(getStartDate(7)) as Array<{ created_at: string; recovery_score: number | null }>;
  const cycleRows = db
    .prepare(`
      SELECT start, strain
      FROM whoop_cycles
      WHERE start >= ?
      ORDER BY start DESC
    `)
    .all(getStartDate(7)) as Array<{ start: string; strain: number | null }>;
  const sleepRows = db
    .prepare(`
      SELECT start, total_in_bed_time_milli, total_awake_time_milli
      FROM whoop_sleep_summaries
      WHERE start >= ?
      ORDER BY start DESC
    `)
    .all(getStartDate(7)) as Array<{
      start: string;
      total_in_bed_time_milli: number | null;
      total_awake_time_milli: number | null;
    }>;
  const bodyRows = db
    .prepare(`
      SELECT observed_on, weight_kilogram
      FROM whoop_body_measurements
      WHERE observed_on >= ?
      ORDER BY observed_on ASC
    `)
    .all(getStartDate(7).slice(0, 10)) as Array<{ observed_on: string; weight_kilogram: number | null }>;
  const liftsThisWeek = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM hevy_workouts
      WHERE start_time >= ?
    `)
    .get(getStartOfWeekIso()) as { count: number };

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
              sleep_performance_percentage: null,
              sleep_consistency_percentage: null,
              sleep_efficiency_percentage: null,
              total_in_bed_time_milli: row.total_in_bed_time_milli,
              total_awake_time_milli: row.total_awake_time_milli,
              sleep_needed_baseline_milli: null,
              sleep_needed_debt_milli: null,
              sleep_needed_strain_milli: null,
              sleep_needed_nap_milli: null,
            }),
          ),
        ),
    ),
    weightTrend: toThreePointSeries(bodyRows.map((row) => round(row.weight_kilogram))),
    liftsThisWeek: liftsThisWeek.count,
  };
}

function buildTrendSeries() {
  const db = getDb();
  const dateWindow7 = getDateWindow(7);
  const dateWindow14 = getDateWindow(14);
  const recoveryRows = db
    .prepare(`
      SELECT created_at, recovery_score
      FROM whoop_recovery_summaries
      WHERE created_at >= ?
      ORDER BY created_at DESC
    `)
    .all(getStartDate(14)) as Array<{ created_at: string; recovery_score: number | null }>;
  const cycleRows = db
    .prepare(`
      SELECT start, strain
      FROM whoop_cycles
      WHERE start >= ?
      ORDER BY start DESC
    `)
    .all(getStartDate(14)) as Array<{ start: string; strain: number | null }>;
  const sleepRows = db
    .prepare(`
      SELECT start, total_in_bed_time_milli, total_awake_time_milli
      FROM whoop_sleep_summaries
      WHERE start >= ?
      ORDER BY start DESC
    `)
    .all(getStartDate(14)) as Array<{
      start: string;
      total_in_bed_time_milli: number | null;
      total_awake_time_milli: number | null;
    }>;
  const bodyRows = db
    .prepare(`
      SELECT observed_on, observed_at, weight_kilogram
      FROM whoop_body_measurements
      WHERE observed_on >= ?
      ORDER BY observed_on DESC, observed_at DESC
    `)
    .all(getStartDate(21).slice(0, 10)) as Array<{
      observed_on: string;
      observed_at: string;
      weight_kilogram: number | null;
    }>;
  const loadRows = db
    .prepare(`
      SELECT start_time
      FROM hevy_workouts
      WHERE start_time >= ?
      ORDER BY start_time DESC
    `)
    .all(getStartDate(14)) as Array<{ start_time: string }>;

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
            sleep_performance_percentage: null,
            sleep_consistency_percentage: null,
            sleep_efficiency_percentage: null,
            total_in_bed_time_milli: row.total_in_bed_time_milli,
            total_awake_time_milli: row.total_awake_time_milli,
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

function buildBodyCard(readiness: DailyReadiness): BodyCardSummary {
  const latestWorkout = getDb()
    .prepare(`
      SELECT title, raw_json
      FROM hevy_workouts
      ORDER BY start_time DESC
      LIMIT 1
    `)
    .get() as { title: string | null; raw_json: string } | undefined;
  const highlightedRegions = latestWorkout
    ? buildBodyHighlightsFromWorkout(latestWorkout.raw_json)
    : [];

  return {
    recoveryScore: readiness.recoveryScore,
    sleepHours: readiness.sleepHours,
    weightLb: kilogramsToPounds(readiness.bodyWeightKg),
    latestWorkoutName: latestWorkout?.title ?? null,
    highlightedRegions,
    displayRegions: highlightedRegions.slice(0, 5).map((highlight) => ({
      regionId: highlight.regionId,
      label: highlight.regionId.replace(/([A-Z])/g, " $1").trim(),
      intensity: highlight.intensity,
      view: highlight.view,
    })),
  };
}

function buildStrainSummary(readiness: DailyReadiness, trainingLoad: DailyTrainingLoad) {
  const score = readiness.whoopDayStrain;
  const latestCycleStart = getDb()
    .prepare(`SELECT start FROM whoop_cycles ORDER BY start DESC LIMIT 1`)
    .get() as { start?: string } | undefined;
  const todayActivities = latestCycleStart?.start
    ? (getDb()
        .prepare(`
          SELECT id, sport_name, start, "end", strain, average_heart_rate, max_heart_rate
          FROM whoop_workouts
          WHERE start >= ?
          ORDER BY start DESC
        `)
        .all(latestCycleStart.start) as WhoopWorkoutRow[])
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

function buildTrainingLoad(): DailyTrainingLoad {
  const db = getDb();
  const workouts = db
    .prepare(`
      SELECT id, title, start_time, exercise_count, set_count, volume_kg,
             duration_seconds, raw_json
      FROM hevy_workouts
      WHERE start_time >= ?
      ORDER BY start_time DESC
    `)
    .all(getStartDate(28)) as HevyWorkoutRow[];
  const workouts7d = workouts.filter((workout) => workout.start_time >= getStartDate(7));
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
  for (const workout of workouts7d) {
    const buckets = inferBuckets(getExerciseTitles(workout.raw_json));
    for (const bucket of buckets) {
      if (!bucketDates.has(bucket)) {
        bucketDates.set(bucket, workout.start_time);
      }
    }
  }

  return {
    hevyVolume7d: round(sum(workouts7d.map((workout) => workout.volume_kg))) ?? 0,
    hevyVolume28dAvg: round(average(weeklyAverages)) ?? 0,
    hevySetCount7d: sum(workouts7d.map((workout) => workout.set_count)),
    hevyWorkoutCount7d: workouts7d.length,
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
    weeklyMuscleFocus: summarizeWeeklyMuscleHits(
      workouts7d.map((workout) => workout.raw_json),
    ),
    latestWorkoutFocus: latestWorkout ? summarizeWorkoutMuscleGroups(latestWorkout.raw_json) : [],
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
  stressFlags: DailyStressFlags,
  lateNightDisruption: DailyLateNightDisruption,
  freshness: DailyFreshness,
) {
  const stalePenalty = Number(freshness.whoop.isStale) + Number(freshness.hevy.isStale);
  const items: DailyRecommendation[] = [];

  if (stressFlags.illnessRisk || stressFlags.lowRecovery) {
    items.push(
      recommendation(
        "training",
        "Keep training easy or rest today",
        "Favor a recovery day, easy walk, mobility, or a light technique session instead of a hard lift.",
        [
          "Favor a recovery day or full rest",
          "Use an easy walk or mobility session if you want movement",
          "Only do light technique work if your warm-up feels clearly better",
        ],
        [
          { label: "Rest", icon: "rest" },
          { label: "Easy walk", icon: "walk" },
          { label: "Technique", icon: "technique" },
        ],
        undefined,
        "Your recovery signals and recent stress do not support a hard session today.",
        [
          `Recovery ${readiness.recoveryScore ?? "--"}`,
          `Sleep gap ${readiness.sleepVsNeedHours ?? "--"}h`,
          `RHR delta ${readiness.restingHeartRateVs7d ?? "--"}`,
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
    items.push(
      recommendation(
        "training",
        "Aim for a moderate day",
        "Keep intensity in the middle range and let exercise selection work around recently trained areas.",
        [
          "Keep intensity in the middle range",
          "Choose exercises that avoid recently overworked areas",
          "Leave the session feeling better than destroyed",
        ],
        [
          { label: "Moderate load", icon: "fuel" },
          { label: "Work around fatigue", icon: "walk" },
          { label: "Finish fresh", icon: "rest" },
        ],
        undefined,
        "Your signals are mixed, so a quality but not maximal session is the most durable option.",
        [
          `Recovery ${readiness.recoveryScore ?? "--"}`,
          `Consecutive days ${trainingLoad.hevyConsecutiveDays}`,
          `Load spike ${trainingLoad.recentLoadSpike ? "yes" : "no"}`,
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
          ? "Use symptom-matched head and stomach support"
          : lateNightDisruption.likelyLane === "illness_like"
            ? "Use simple sick-day support, not a normal training day"
            : "Use gentle stomach and recovery support first",
        lateNightDisruption.likelyLane === "hangover_like"
          ? "Start with water plus electrolytes, eat something bland like toast, crackers, banana, rice, or broth if your stomach is off, use ginger chews if nausea is the main issue, and only use Pepcid for acid/heartburn or Gas-X for true bloating/gas. Do not expect B vitamins, vitamin D, a multivitamin, or magnesium to rescue the morning."
          : lateNightDisruption.likelyLane === "illness_like"
            ? "Hydrate, use electrolytes if intake feels low, keep food bland and easy to tolerate like toast or broth if your stomach is off, and rest more aggressively. Let symptoms, not ambition, decide whether any movement is worth it."
            : "Hydrate first, keep food gentle and bland if your stomach feels off, use ginger chews if nausea shows up, and let symptoms rather than ambition decide how active you should be today.",
        lateNightDisruption.likelyLane === "hangover_like"
          ? [
              "Start with water plus electrolytes",
              "Use bland food like toast, crackers, banana, rice, or broth if your stomach is off",
              "Use ginger chews if nausea is the main issue",
              "Use Pepcid only for acid or Gas-X only for true gas/bloating",
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
              { label: "Bland food", icon: "food" },
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
              { label: "Ginger", icon: "ginger", conditionLabel: "if nausea" },
              { label: "Pepcid", icon: "stomach", conditionLabel: "if acid" },
              { label: "Gas-X", icon: "stomach", conditionLabel: "if bloating" },
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
  return [
    "Goal: longevity and feeling good first; strength/body composition second.",
    "Use this WHOOP + Hevy brief to recommend today's training intensity, eating focus, recovery priorities, and conservative supplement guidance.",
    `Recovery score: ${summary.readiness.recoveryScore ?? "--"}.`,
    `WHOOP day strain: ${summary.strainSummary.score ?? "--"}. ${summary.strainSummary.blurb}`,
    `Body weight: ${poundsText(summary.readiness.bodyWeightKg, 1)}, 7-day delta: ${signedPoundsText(summary.readiness.bodyWeightDelta7dKg)}.`,
    `Actual sleep: ${summary.readiness.sleepHours ?? "--"}h, sleep vs need: ${summary.readiness.sleepVsNeedHours ?? "--"}h.`,
    `Overnight read: ${summary.overnightRead.label}. ${summary.overnightRead.detail}`,
    `Late-night disruption signal: ${summary.lateNightDisruption.active ? `${summary.lateNightDisruption.likelyLane} (${summary.lateNightDisruption.confidence})` : "inactive"}.`,
    `Recent load: ${summary.trainingLoad.hevyWorkoutCount7d} workouts and ${poundsText(summary.trainingLoad.hevyVolume7d, 0)} over 7 days.`,
    `Why today changed: ${summary.whyChangedToday.deltas.join(" ")}`,
    `Top actions: ${summary.recommendations
      .slice(0, 3)
      .map((item) => `${item.title}: ${item.action}`)
      .join(" ")}`,
    "Given this, what should I do today for training, eating, recovery, and supplements?",
  ].join("\n");
}

export function getDailySummary(): DailySummary {
  const freshness = buildFreshness();
  const miniTrends = buildMiniTrends();
  const trendSeries = buildTrendSeries();
  const readiness = buildReadiness();
  const trainingLoad = buildTrainingLoad();
  const stressFlags = buildStressFlags(readiness, trainingLoad);
  const lateNightDisruption = deriveLateNightDisruption(readiness, stressFlags);
  const overnightRead = buildOvernightRead(lateNightDisruption, readiness);
  const strainSummary = buildStrainSummary(readiness, trainingLoad);
  const bodyCard = buildBodyCard(readiness);
  const recommendations = buildRecommendations(
    readiness,
    trainingLoad,
    stressFlags,
    lateNightDisruption,
    freshness,
  );
  const whyChangedToday = buildWhyChangedToday(
    readiness,
    trainingLoad,
    stressFlags,
    lateNightDisruption,
  );

  const summary: DailySummary = {
    date: new Date().toISOString(),
    contextLine: "Goal: longevity and feeling good first; strength/body composition second.",
    miniTrends,
    trendSeries,
    readiness,
    trainingLoad,
    stressFlags,
    lateNightDisruption,
    overnightRead,
    strainSummary,
    bodyCard,
    recommendations,
    freshness,
    whyChangedToday,
    llmPromptText: "",
  };

  summary.llmPromptText = buildPromptText(summary);
  return summary;
}
