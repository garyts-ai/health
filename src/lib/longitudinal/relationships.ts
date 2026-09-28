import { shiftCalendarDateKey } from "@/lib/calendar";
import { median, round } from "@/lib/longitudinal/statistics";
import type {
  ExploratoryRelationship,
  HevySessionObservation,
  TrainingResponseAnalysis,
  TrainingResponsePoint,
  WhoopCycleObservation,
  WhoopSleepObservation,
} from "@/lib/longitudinal/types";

const BOOTSTRAP_REPLICATES = 400;
const METHOD_VERSION = "whoop-associated-cycle-exploration-v1";

type Pair = { date: string; x: number; y: number; observationId: string };

function keyedRank(values: number[]) {
  const ordered = values.map((value, index) => ({ value, index })).sort((left, right) => left.value - right.value);
  const ranks = Array(values.length).fill(0) as number[];
  for (let index = 0; index < ordered.length;) {
    let end = index + 1;
    while (end < ordered.length && ordered[end].value === ordered[index].value) end += 1;
    const rank = (index + 1 + end) / 2;
    for (let position = index; position < end; position += 1) ranks[ordered[position].index] = rank;
    index = end;
  }
  return ranks;
}

function pearson(left: number[], right: number[]) {
  if (left.length < 2 || left.length !== right.length) return null;
  const leftMean = left.reduce((sum, item) => sum + item, 0) / left.length;
  const rightMean = right.reduce((sum, item) => sum + item, 0) / right.length;
  const numerator = left.reduce((sum, item, index) => sum + (item - leftMean) * (right[index] - rightMean), 0);
  const leftSquares = left.reduce((sum, item) => sum + (item - leftMean) ** 2, 0);
  const rightSquares = right.reduce((sum, item) => sum + (item - rightMean) ** 2, 0);
  const denominator = Math.sqrt(leftSquares * rightSquares);
  return denominator > 0 ? numerator / denominator : null;
}

function spearman(points: Pair[]) {
  return pearson(keyedRank(points.map((item) => item.x)), keyedRank(points.map((item) => item.y)));
}

function stableSeed(value: string) {
  let state = 2166136261;
  for (const character of value) state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  return state || 1;
}

function weekStart(date: string) {
  const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  return shiftCalendarDateKey(date, -((weekday + 6) % 7));
}

function bootstrapDifference(points: Pair[], threshold: number, seed: string): [number, number] | null {
  if (points.length < 4) return null;
  const blocks = new Map<string, Pair[]>();
  for (const point of points) blocks.set(weekStart(point.date), [...(blocks.get(weekStart(point.date)) ?? []), point]);
  const blockValues = [...blocks.values()];
  let state = stableSeed(seed);
  const random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  const estimates: number[] = [];
  for (let iteration = 0; iteration < BOOTSTRAP_REPLICATES; iteration += 1) {
    const sample = Array.from({ length: blockValues.length }, () => blockValues[Math.floor(random() * blockValues.length)]).flat();
    const low = median(sample.filter((point) => point.x <= threshold).map((point) => point.y));
    const high = median(sample.filter((point) => point.x > threshold).map((point) => point.y));
    if (low !== null && high !== null) estimates.push(high - low);
  }
  if (estimates.length < 200) return null;
  estimates.sort((a, b) => a - b);
  return [round(estimates[Math.floor(estimates.length * 0.025)], 2)!, round(estimates[Math.min(estimates.length - 1, Math.floor(estimates.length * 0.975))], 2)!];
}

function makeRelationship(input: {
  id: string;
  exposureKey: string;
  exposureLabel: string;
  outcomeKey: string;
  outcomeLabel: string;
  exposureUnit: string;
  outcomeUnit: string;
  points: Pair[];
  eligibleCount?: number;
  excludedCount?: number;
}): ExploratoryRelationship {
  const points = input.points.sort((a, b) => a.date.localeCompare(b.date));
  const threshold = median(points.map((item) => item.x));
  const lower = threshold === null ? null : median(points.filter((point) => point.x <= threshold).map((point) => point.y));
  const higher = threshold === null ? null : median(points.filter((point) => point.x > threshold).map((point) => point.y));
  const spanDays = points.length > 1
    ? Math.round((Date.parse(`${points.at(-1)!.date}T12:00:00.000Z`) - Date.parse(`${points[0].date}T12:00:00.000Z`)) / 86_400_000) + 1
    : points.length;
  const distinctDates = new Set(points.map((point) => point.date)).size;
  const evidence = distinctDates >= 28 && spanDays >= 28 && lower !== null && higher !== null ? "exploratory" : "insufficient";
  return {
    id: input.id, methodVersion: METHOD_VERSION,
    exposureKey: input.exposureKey, exposureLabel: input.exposureLabel,
    outcomeKey: input.outcomeKey, outcomeLabel: input.outcomeLabel,
    exposureUnit: input.exposureUnit, outcomeUnit: input.outcomeUnit,
    startDate: points[0]?.date ?? null, endDate: points.at(-1)?.date ?? null,
    sampleCount: points.length, eligibleCount: input.eligibleCount ?? points.length,
    excludedCount: input.excludedCount ?? 0, rankCorrelation: round(spearman(points), 2),
    lowerExposureMedian: round(lower, 2), higherExposureMedian: round(higher, 2),
    medianDifference: lower === null || higher === null ? null : round(higher - lower, 2),
    bootstrapInterval: evidence === "exploratory" && threshold !== null ? bootstrapDifference(points, threshold, input.id) : null,
    points: points.map((point) => ({ ...point, x: round(point.x, 2)!, y: round(point.y, 2)! })),
    evidence,
    method: "Sleep and the recovery record linked to its sleep ID (or an unambiguous cycle match) are paired by WHOOP physiological cycle. Rank correlation is descriptive; grouped outcomes compare values at or below versus above the exposure median. Confidence intervals resample seven-day date blocks.",
    limitations: [
      "Exploratory personal-data relationship; association does not establish causation.",
      "Recovery is a composite measure; HRV and resting heart rate are shown as separate outcomes.",
      ...(distinctDates < 28 || spanDays < 28 ? [`At least 28 distinct paired dates spanning four weeks are required; ${distinctDates} distinct dates were available.`] : []),
      ...(distinctDates >= 28 && (lower === null || higher === null) ? ["The exposure values do not form two measurable groups around their median."] : []),
    ],
  };
}

export function buildSleepRelationships(
  sleeps: WhoopSleepObservation[], cycles: WhoopCycleObservation[], startDate: string, endDate: string,
): ExploratoryRelationship[] {
  const sleepById = new Map(sleeps.filter((sleep) => !sleep.nap && sleep.scoreState === "SCORED").map((sleep) => [sleep.id, sleep]));
  const inRangeCycles = cycles.filter((cycle) => cycle.date >= startDate && cycle.date <= endDate);
  const candidateCycleCount = inRangeCycles.filter((cycle) => cycle.completed && cycle.recoveryValid
    && cycle.sleepValid && !cycle.calibrating && Boolean(cycle.sleepId) && sleepById.has(cycle.sleepId!)).length;
  const latestByDate = new Map<string, WhoopCycleObservation>();
  for (const cycle of inRangeCycles) {
    if (!cycle.completed || !cycle.recoveryValid || !cycle.sleepValid || cycle.calibrating || !cycle.sleepId) continue;
    const sleep = sleepById.get(cycle.sleepId);
    if (!sleep || sleep.date !== cycle.date || !sleep.sleepMinutes) continue;
    const previous = latestByDate.get(cycle.date);
    const cycleSleepEnd = cycle.sleepEndedAt ?? sleep.endedAt;
    const previousSleepEnd = previous ? previous.sleepEndedAt ?? sleepById.get(previous.sleepId ?? "")?.endedAt ?? "" : "";
    if (!previous || cycleSleepEnd > previousSleepEnd) latestByDate.set(cycle.date, cycle);
  }
  const pairs = [...latestByDate.values()].flatMap((cycle) => {
    const sleep = sleepById.get(cycle.sleepId!);
    if (!sleep) return [];
    return [{ cycle, sleep }];
  });
  const specifications = [
    { exposureKey: "sleep_duration", exposureLabel: "Sleep duration", exposureUnit: "min", read: (cycle: WhoopCycleObservation, sleep: WhoopSleepObservation) => sleep.sleepMinutes },
    { exposureKey: "sleep_need_gap", exposureLabel: "Unmet sleep need (+ means shortfall)", exposureUnit: "min", read: (cycle: WhoopCycleObservation, sleep: WhoopSleepObservation) => sleep.sleepNeedMinutes === null ? null : sleep.sleepNeedMinutes - sleep.sleepMinutes! },
    { exposureKey: "sleep_consistency", exposureLabel: "Sleep consistency", exposureUnit: "%", read: (cycle: WhoopCycleObservation, sleep: WhoopSleepObservation) => sleep.sleepConsistency },
  ];
  const outcomes = [
    { outcomeKey: "hrv", outcomeLabel: "Associated morning HRV", outcomeUnit: "ms", read: (cycle: WhoopCycleObservation) => cycle.hrv },
    { outcomeKey: "resting_heart_rate", outcomeLabel: "Associated morning resting heart rate", outcomeUnit: "bpm", read: (cycle: WhoopCycleObservation) => cycle.restingHeartRate },
    { outcomeKey: "recovery", outcomeLabel: "Associated-cycle recovery", outcomeUnit: "%", read: (cycle: WhoopCycleObservation) => cycle.recoveryScore },
  ];
  return specifications.flatMap((exposure) => outcomes.map((outcome) => makeRelationship({
    id: `sleep-${exposure.exposureKey}-${outcome.outcomeKey}`,
    exposureKey: exposure.exposureKey, exposureLabel: exposure.exposureLabel,
    outcomeKey: outcome.outcomeKey, outcomeLabel: outcome.outcomeLabel,
    exposureUnit: exposure.exposureUnit, outcomeUnit: outcome.outcomeUnit,
    points: pairs.flatMap(({ cycle, sleep }) => {
      const x = exposure.read(cycle, sleep);
      const y = outcome.read(cycle);
      return typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y)
        ? [{ date: cycle.date, x, y, observationId: `${sleep.id}:${cycle.cycleId}` }]
        : [];
    }),
    eligibleCount: candidateCycleCount,
    excludedCount: Math.max(0, inRangeCycles.length - pairs.filter(({ cycle, sleep }) => {
      const x = exposure.read(cycle, sleep);
      const y = outcome.read(cycle);
      return typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y);
    }).length),
  })));
}

export function buildStrainRecoveryRelationship(cycles: WhoopCycleObservation[], startDate: string, endDate: string): ExploratoryRelationship {
  const ordered = cycles.filter((cycle) => cycle.completed && cycle.strainValid && cycle.strain !== null)
    .sort((a, b) => (a.endedAt ?? a.startedAt).localeCompare(b.endedAt ?? b.startedAt));
  const exposures = ordered.filter((cycle) => cycle.date >= startDate && cycle.date <= endDate && cycle.endedAt);
  const points: Pair[] = [];
  for (const exposure of exposures) {
    const response = cycles.filter((cycle) => cycle.completed && cycle.recoveryValid && !cycle.calibrating
      && cycle.recoveryScore !== null && cycle.startedAt > exposure.endedAt!
      && cycle.date <= endDate)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0];
    if (response) points.push({ date: exposure.date, x: exposure.strain!, y: response.recoveryScore!, observationId: `${exposure.cycleId}:${response.cycleId}` });
  }
  return makeRelationship({
    id: "cycle-strain-following-recovery", exposureKey: "cycle_strain", exposureLabel: "Completed-cycle strain",
    outcomeKey: "following_recovery", outcomeLabel: "Following recovery", exposureUnit: "strain", outcomeUnit: "%", points,
    eligibleCount: exposures.length,
    excludedCount: Math.max(0, exposures.length - points.length),
  });
}

function combineSessions(sessions: HevySessionObservation[], startDate: string, endDate: string) {
  const byDate = new Map<string, HevySessionObservation[]>();
  for (const session of sessions.filter((item) => item.date >= startDate && item.date <= endDate)) {
    byDate.set(session.date, [...(byDate.get(session.date) ?? []), session]);
  }
  return [...byDate.entries()].map(([date, daySessions]) => {
    const known = new Set(daySessions.map((item) => item.split).filter((item) => item !== "unknown"));
    const split: "upper" | "lower" | "mixed" | "unknown" = known.size > 1 ? "mixed"
      : known.has("upper") ? "upper" : known.has("lower") ? "lower" : "unknown";
    return { date, split, sessions: daySessions, startedAt: daySessions[0].startedAt, endedAt: daySessions.reduce((latest, item) => item.endedAt > latest ? item.endedAt : latest, daySessions[0].endedAt) };
  }).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export function buildTrainingResponse(
  sessions: HevySessionObservation[], cycles: WhoopCycleObservation[], startDate: string, endDate: string,
): TrainingResponseAnalysis {
  const baselineStart = shiftCalendarDateKey(startDate, -28);
  const recoveries = cycles.filter((cycle) => cycle.completed && cycle.recoveryValid && !cycle.calibrating && cycle.hrv !== null && cycle.sleepEndedAt)
    .sort((a, b) => a.sleepEndedAt!.localeCompare(b.sleepEndedAt!));
  const allExposures = combineSessions(sessions, baselineStart, endDate);
  const exposures = allExposures.filter((day): day is typeof day & { split: "upper" | "lower" | "mixed" } => day.date >= startDate && day.split !== "unknown");
  const points: TrainingResponsePoint[] = [];
  let excludedWithoutBaseline = 0;
  let excludedWithoutFollowup = 0;
  for (const exposure of exposures) {
    const before = recoveries.filter((cycle) => cycle.date >= shiftCalendarDateKey(exposure.date, -28)
      && cycle.sleepEndedAt! < exposure.startedAt);
    const dailyBaseline = new Map<string, number[]>();
    for (const cycle of before) dailyBaseline.set(cycle.date, [...(dailyBaseline.get(cycle.date) ?? []), cycle.hrv!]);
    const baselineValues = [...dailyBaseline.values()].map((values) => median(values)!).filter(Number.isFinite);
    const baseline = baselineValues.length >= 14 ? median(baselineValues) : null;
    if (baseline === null) { excludedWithoutBaseline += 1; continue; }
    const nextExposure = allExposures.find((candidate) => candidate.startedAt > exposure.endedAt)?.startedAt ?? null;
    const following = recoveries.filter((cycle) => cycle.sleepEndedAt! > exposure.endedAt
      && cycle.date <= endDate && (!nextExposure || cycle.sleepEndedAt! < nextExposure))
      .slice(0, 3);
    if (!following.length) { excludedWithoutFollowup += 1; continue; }
    following.forEach((cycle, index) => {
      const elapsedHours = (Date.parse(cycle.sleepEndedAt!) - Date.parse(exposure.endedAt)) / 3_600_000;
      points.push({
        sessionId: exposure.sessions.map((item) => item.id).join(","), sessionDate: exposure.date,
        split: exposure.split, followupIndex: index + 1, recoveryDate: cycle.date,
        elapsedHours: round(elapsedHours, 1) ?? elapsedHours, baselineHrv: round(baseline, 1),
        recoveryHrv: round(cycle.hrv, 1), difference: round(cycle.hrv! - baseline, 1),
      });
    });
  }
  const summarize = (items: TrainingResponsePoint[]) => {
    const contributingSessions = new Set(items.map((point) => point.sessionId));
    const contributingDates = [...new Set(items.map((point) => point.sessionDate))].sort();
    const sessionSpanDays = contributingDates.length > 1
      ? Math.round((Date.parse(`${contributingDates.at(-1)}T12:00:00.000Z`) - Date.parse(`${contributingDates[0]}T12:00:00.000Z`)) / 86_400_000) + 1
      : contributingDates.length;
    const followupCounts = [1, 2, 3].map((index) => new Set(items.filter((point) => point.followupIndex === index).map((point) => point.sessionId)).size) as [number, number, number];
    return { eligibleSessionCount: contributingSessions.size, sessionSpanDays, qualified: contributingSessions.size >= 12 && sessionSpanDays >= 42, followupCounts };
  };
  const summary = summarize(points);
  const splitSummary = Object.fromEntries((['upper', 'lower', 'mixed'] as const).map((split) => [split, summarize(points.filter((point) => point.split === split))])) as TrainingResponseAnalysis['splitSummary'];
  const followupCounts = summary.followupCounts;
  return {
    methodVersion: "hevy-recovery-response-v1", metric: "hrv",
    eligibleSessionCount: summary.eligibleSessionCount, sessionSpanDays: summary.sessionSpanDays,
    excludedSessionCount: Math.max(0, allExposures.filter((exposure) => exposure.date >= startDate).length - summary.eligibleSessionCount),
    qualified: summary.qualified, followupCounts, splitSummary,
    unknownSessionCount: allExposures.filter((exposure) => exposure.date >= startDate && exposure.split === "unknown").length,
    points,
    exclusions: [
      ...(excludedWithoutBaseline ? [`${excludedWithoutBaseline} sessions excluded because the preceding 28 days had fewer than 14 distinct HRV dates.`] : []),
      ...(excludedWithoutFollowup ? [`${excludedWithoutFollowup} sessions had no eligible subsequent recovery before another session.`] : []),
    ],
    limitations: [
      "Training response is descriptive and does not establish training as the cause of a later measurement.",
      "The baseline is the median of daily HRV medians from the 28 days before each session and requires 14 measured dates; a same-day measurement is used only when recorded before the session.",
      "Each trace stops when another training exposure occurs; follow-up points are the next recorded recoveries, not equally spaced days.",
    ],
  };
}
