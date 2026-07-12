import { dbAll, dbGet } from "@/lib/db";
import { calendarDaysIntervalEnding, isInCalendarInterval } from "@/lib/calendar";

type CycleRow = {
  cycle_start: string;
  timezone_offset: string | null;
  recovery_score: number | null;
  resting_heart_rate: number | null;
  hrv_rmssd_milli: number | null;
  skin_temp_celsius: number | null;
  spo2_percentage: number | null;
  day_strain: number | null;
  respiratory_rate: number | null;
  asleep_minutes: number | null;
  sleep_need_minutes: number | null;
  sleep_debt_minutes: number | null;
  sleep_efficiency: number | null;
  sleep_consistency: number | null;
  sleep_performance: number | null;
  light_minutes: number | null;
  deep_minutes: number | null;
  rem_minutes: number | null;
  awake_minutes: number | null;
  sleep_onset: string | null;
  wake_onset: string | null;
};

type WorkoutRow = {
  workout_start: string;
  duration_minutes: number | null;
  activity_name: string | null;
  activity_strain: number | null;
};

type JournalRow = {
  cycle_start: string | null;
  question_text: string;
  answered_yes: number;
};

export type WhoopMetric = {
  label: string;
  value: string;
  recent: string;
  baselineValue: number | null;
  recentValue: number | null;
  delta: number | null;
  direction: "up" | "down" | "flat" | "missing";
  healthImpact: "favorable" | "unfavorable" | "neutral" | "unknown";
  unit: string;
  note?: string;
};

export type WhoopFindingVisualization =
  | { kind: "gap"; actual: number; target: number; unit: string }
  | { kind: "variability"; value: number; threshold: number; unit: string }
  | { kind: "autonomic"; hrvDelta: number | null; rhrDelta: number | null }
  | {
      kind: "journal";
      yesCount: number;
      noCount: number;
      recoveryDelta: number;
      hrvDelta: number | null;
    };

export type WhoopFinding = {
  title: string;
  evidence: string;
  interpretation: string;
  confidence: "High" | "Moderate" | "Suggestive";
  severity: number;
  visualization: WhoopFindingVisualization;
};

export type WhoopLeveragePoint = {
  title: string;
  evidence: string;
  why: string;
  impact: string;
  actions: string[];
  score: number;
};

export type WhoopAnalysisReport = {
  empty: boolean;
  analysisWindow: {
    start: string | null;
    end: string | null;
    sampleCount: number;
    calendarDays: number;
  };
  inventory: {
    sourceName: string | null;
    importedAt: string | null;
    latestImport: {
      sourceName: string;
      importedAt: string;
      fingerprint: string;
      start: string | null;
      end: string | null;
    } | null;
    imports: Array<{
      sourceName: string;
      importedAt: string;
      fingerprint: string;
      start: string | null;
      end: string | null;
    }>;
    start: string | null;
    end: string | null;
    days: number;
    counts: Record<string, number>;
    gaps: number;
    reliability: string;
    missing: string[];
  };
  metrics: {
    sleep: WhoopMetric[];
    cardiovascular: WhoopMetric[];
    recovery: WhoopMetric[];
    activity: WhoopMetric[];
  };
  overview: {
    title: string;
    detail: string;
    confidence: WhoopFinding["confidence"];
    comparisons: Array<{
      key: string;
      label: string;
      baseline: number | null;
      recent: number | null;
      baselineLabel: string;
      recentLabel: string;
      delta: number | null;
      direction: WhoopMetric["direction"];
      tone: "green" | "violet" | "cyan" | "coral" | "amber";
      lowerIsBetter?: boolean;
    }>;
  };
  series: Array<{
    key: string;
    label: string;
    unit: string;
    baseline: number | null;
    direction: WhoopMetric["direction"];
    tone: "green" | "violet" | "cyan" | "coral" | "amber" | "rose";
    values: Array<{ date: string; value: number | null }>;
  }>;
  findings: WhoopFinding[];
  leveragePoints: WhoopLeveragePoint[];
  protocol: {
    nonNegotiables: string[];
    quickWins: string[];
    watch: string[];
    medicalFlags: string[];
  };
};

function values(rows: CycleRow[], key: keyof CycleRow) {
  return rows
    .map((row) => row[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function average(input: number[]) {
  return input.length ? input.reduce((sum, value) => sum + value, 0) / input.length : null;
}

function round(value: number | null, digits = 1) {
  return value === null ? null : Number(value.toFixed(digits));
}

function display(value: number | null, suffix = "", digits = 1) {
  return value === null ? "Not available" : `${value.toFixed(digits)}${suffix}`;
}

export function comparisonDirection(
  baseline: number | null,
  recent: number | null,
  tolerance = 0.05,
): WhoopMetric["direction"] {
  if (baseline === null || recent === null) return "missing";
  const delta = recent - baseline;
  if (Math.abs(delta) <= tolerance) return "flat";
  return delta > 0 ? "up" : "down";
}

export function healthImpactDirection(
  direction: WhoopMetric["direction"],
  betterDirection: "up" | "down" | "neutral" = "up",
): WhoopMetric["healthImpact"] {
  if (direction === "missing") return "unknown";
  if (direction === "flat" || betterDirection === "neutral") return "neutral";
  return direction === betterDirection ? "favorable" : "unfavorable";
}

function metric(
  label: string,
  overall: number | null,
  recent: number | null,
  suffix: string,
  digits = 1,
  note?: string,
  betterDirection: "up" | "down" | "neutral" = "up",
): WhoopMetric {
  const direction = comparisonDirection(overall, recent, digits === 0 ? 0.5 : 0.05);
  return {
    label,
    value: display(overall, suffix, digits),
    recent: display(recent, suffix, digits),
    baselineValue: overall,
    recentValue: recent,
    delta: overall === null || recent === null ? null : round(recent - overall, digits),
    direction,
    healthImpact: healthImpactDirection(direction, betterDirection),
    unit: suffix.trim(),
    note,
  };
}

function textMetric(label: string, value: string, recent: string, note?: string): WhoopMetric {
  return {
    label,
    value,
    recent,
    baselineValue: null,
    recentValue: null,
    delta: null,
    direction: "missing",
    healthImpact: "unknown",
    unit: "",
    note,
  };
}

export function selectOverviewFinding(findings: WhoopFinding[]) {
  return (
    findings.find((finding) => finding.title.includes("Sleep is running below")) ??
    findings.find((finding) => finding.title.includes("autonomic")) ??
    findings[0] ?? {
      title: "No dominant pattern yet",
      evidence: "The current export does not contain enough evidence for a leading takeaway.",
      interpretation: "",
      confidence: "Suggestive" as const,
      severity: 0,
      visualization: { kind: "variability" as const, value: 0, threshold: 45, unit: "min" },
    }
  );
}

function findingRank(finding: WhoopFinding) {
  const confidence = finding.confidence === "High" ? 3 : finding.confidence === "Moderate" ? 2 : 1;
  return confidence * 1000 + finding.severity;
}

export function rankWhoopFindings(findings: WhoopFinding[]) {
  return [...findings].sort((a, b) => findingRank(b) - findingRank(a));
}

export function standardDeviation(input: number[]) {
  const mean = average(input);
  if (mean === null || input.length < 2) return null;
  return Math.sqrt(input.reduce((sum, value) => sum + (value - mean) ** 2, 0) / input.length);
}

function minutesFromLocalMidnight(iso: string | null, timezoneOffset: string | null = null) {
  if (!iso) return null;
  const date = new Date(iso);
  const match = timezoneOffset?.match(/UTC([+-])(\d{2}):(\d{2})/);
  const offsetMinutes = match
    ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]))
    : 0;
  let minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + offsetMinutes;
  if (minutes < 12 * 60) minutes += 24 * 60;
  return minutes;
}

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "Not available";
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(2020, 0, 1, hour, minute)),
  );
}

function trendDelta(recentRows: CycleRow[], priorRows: CycleRow[], key: keyof CycleRow) {
  const recent = average(values(recentRows, key));
  const prior = average(values(priorRows, key));
  return recent === null || prior === null ? null : recent - prior;
}

export function windowConfidence(recentCount: number, priorCount = recentCount): WhoopFinding["confidence"] {
  const paired = Math.min(recentCount, priorCount);
  return paired >= 14 ? "High" : paired >= 4 ? "Moderate" : "Suggestive";
}

export function gapCount(rows: Array<Pick<CycleRow, "cycle_start">>) {
  let gaps = 0;
  for (let index = 1; index < rows.length; index += 1) {
    const previous = new Date(rows[index - 1].cycle_start).getTime();
    const current = new Date(rows[index].cycle_start).getTime();
    if (current - previous > 2.25 * 86_400_000) gaps += 1;
  }
  return gaps;
}

export function journalFindings(cycles: CycleRow[], journals: JournalRow[]) {
  const cycleMap = new Map(cycles.map((cycle) => [cycle.cycle_start, cycle]));
  const groups = new Map<string, { yes: CycleRow[]; no: CycleRow[] }>();
  for (const answer of journals) {
    const cycle = answer.cycle_start ? cycleMap.get(answer.cycle_start) : undefined;
    if (!cycle) continue;
    const group = groups.get(answer.question_text) ?? { yes: [], no: [] };
    group[answer.answered_yes ? "yes" : "no"].push(cycle);
    groups.set(answer.question_text, group);
  }

  return [...groups.entries()]
    .map(([question, group]) => {
      if (group.yes.length < 10 || group.no.length < 10) return null;
      const recoveryYes = average(values(group.yes, "recovery_score"));
      const recoveryNo = average(values(group.no, "recovery_score"));
      const hrvYes = average(values(group.yes, "hrv_rmssd_milli"));
      const hrvNo = average(values(group.no, "hrv_rmssd_milli"));
      if (recoveryYes === null || recoveryNo === null) return null;
      const recoveryDelta = recoveryYes - recoveryNo;
      const hrvDelta = hrvYes !== null && hrvNo !== null ? hrvYes - hrvNo : null;
      return {
        question,
        yesCount: group.yes.length,
        noCount: group.no.length,
        recoveryDelta,
        hrvDelta,
        magnitude: Math.abs(recoveryDelta) + Math.abs(hrvDelta ?? 0) / 5,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.magnitude - a.magnitude);
}

export async function getWhoopAnalysisReport(): Promise<WhoopAnalysisReport> {
  const imports = await dbAll<{
    fingerprint: string;
    source_name: string;
    imported_at: string;
    date_start: string | null;
    date_end: string | null;
    cycle_count: number;
    sleep_count: number;
    workout_count: number;
    journal_count: number;
  }>("SELECT * FROM whoop_export_imports ORDER BY imported_at DESC LIMIT 8");
  const latestImport = imports[0] ?? null;

  if (!latestImport) {
    return {
      empty: true,
      analysisWindow: { start: null, end: null, sampleCount: 0, calendarDays: 0 },
      inventory: {
        sourceName: null, importedAt: null, latestImport: null, imports: [], start: null, end: null, days: 0,
        counts: {}, gaps: 0, reliability: "No WHOOP export has been seeded.", missing: [],
      },
      metrics: { sleep: [], cardiovascular: [], recovery: [], activity: [] },
      overview: {
        title: "No WHOOP export seeded",
        detail: "Seed a WHOOP export to build the recovery overview.",
        confidence: "Suggestive",
        comparisons: [],
      },
      series: [], findings: [], leveragePoints: [],
      protocol: { nonNegotiables: [], quickWins: [], watch: [], medicalFlags: [] },
    };
  }

  const [cycles, workouts, journals, sleepCount] = await Promise.all([
    dbAll<CycleRow>("SELECT * FROM whoop_export_cycles ORDER BY cycle_start ASC"),
    dbAll<WorkoutRow>("SELECT * FROM whoop_export_workouts ORDER BY workout_start ASC"),
    dbAll<JournalRow>("SELECT cycle_start, question_text, answered_yes FROM whoop_export_journal_answers"),
    dbGet<{ count: number | string }>("SELECT COUNT(*) AS count FROM whoop_export_sleeps"),
  ]);
  const coverageStart = cycles[0]?.cycle_start ?? latestImport.date_start;
  const coverageEnd = cycles.at(-1)?.cycle_start ?? latestImport.date_end;
  const analysisEndDate = coverageEnd ? new Date(coverageEnd) : new Date();
  const recentInterval = calendarDaysIntervalEnding(analysisEndDate, 28);
  const priorInterval = calendarDaysIntervalEnding(new Date(recentInterval.start.getTime() - 1), 28);
  const recent = cycles.filter((row) => isInCalendarInterval(row.cycle_start, recentInterval));
  const prior = cycles.filter((row) => isInCalendarInterval(row.cycle_start, priorInterval));
  const recentWorkouts = workouts.filter((row) => isInCalendarInterval(row.workout_start, recentInterval));
  const medical14Interval = calendarDaysIntervalEnding(analysisEndDate, 14);
  const medical7Interval = calendarDaysIntervalEnding(analysisEndDate, 7);
  const medical14 = cycles.filter((row) => isInCalendarInterval(row.cycle_start, medical14Interval));
  const medical7 = cycles.filter((row) => isInCalendarInterval(row.cycle_start, medical7Interval));
  const days =
    coverageStart && coverageEnd
      ? Math.floor((new Date(coverageEnd).getTime() - new Date(coverageStart).getTime()) / 86_400_000) + 1
      : cycles.length;
  const asleep = average(values(cycles, "asleep_minutes"));
  const asleepRecent = average(values(recent, "asleep_minutes"));
  const need = average(values(cycles, "sleep_need_minutes"));
  const needRecent = average(values(recent, "sleep_need_minutes"));
  const bedtimeValues = cycles
    .map((row) => minutesFromLocalMidnight(row.sleep_onset, row.timezone_offset))
    .filter((value): value is number => value !== null);
  const wakeValues = cycles
    .map((row) => minutesFromLocalMidnight(row.wake_onset, row.timezone_offset))
    .filter((value): value is number => value !== null);
  const stageTotal = ["light_minutes", "deep_minutes", "rem_minutes"].reduce(
    (sum, key) => sum + (average(values(cycles, key as keyof CycleRow)) ?? 0),
    0,
  );
  const journalEffects = journalFindings(cycles, journals);
  const findings: WhoopFinding[] = [];

  const sleepGap = asleep !== null && need !== null ? asleep - need : null;
  const recentBedtimeValues = recent
    .map((row) => minutesFromLocalMidnight(row.sleep_onset, row.timezone_offset))
    .filter((value): value is number => value !== null);
  const bedtimeVariance = standardDeviation(recentBedtimeValues);
  if (sleepGap !== null) {
    findings.push({
      title: sleepGap < 0 ? "Sleep is running below calculated need" : "Sleep duration is meeting calculated need",
      evidence: `Full-export average: ${display(asleep !== null ? asleep / 60 : null, "h")} asleep versus ${display(need !== null ? need / 60 : null, "h")} average need; recent 28-day coverage N=${recent.length}.`,
      interpretation: sleepGap < 0
        ? "The recurring duration gap is a direct constraint on recovery, independent of sleep-stage mix."
        : "Duration is not the dominant recovery constraint across the full export.",
      confidence: windowConfidence(recent.length),
      severity: Math.abs(sleepGap),
      visualization: {
        kind: "gap",
        actual: (asleep ?? 0) / 60,
        target: (need ?? 0) / 60,
        unit: "h",
      },
    });
  }
  if (bedtimeVariance !== null) {
    findings.push({
      title: bedtimeVariance > 45 ? "Sleep timing varies materially" : "Sleep timing is comparatively stable",
      evidence: `Bedtime standard deviation is ${bedtimeVariance.toFixed(0)} minutes; average onset is ${formatMinutes(average(recentBedtimeValues))}.`,
      interpretation: bedtimeVariance > 45
        ? "Timing variability can weaken sleep consistency even when total duration is adequate."
        : "Timing consistency is unlikely to be a major standalone limiter.",
      confidence: windowConfidence(recent.length),
      severity: bedtimeVariance,
      visualization: { kind: "variability", value: bedtimeVariance, threshold: 45, unit: "min" },
    });
  }
  const hrvDelta = trendDelta(recent, prior, "hrv_rmssd_milli");
  const rhrDelta = trendDelta(recent, prior, "resting_heart_rate");
  findings.push({
    title: "Recent autonomic direction",
    evidence: `Recent 28-day HRV is ${display(average(values(recent, "hrv_rmssd_milli")), " ms", 0)} (${display(hrvDelta, " ms", 1)} versus prior 28 days; N=${values(recent, "hrv_rmssd_milli").length}/${values(prior, "hrv_rmssd_milli").length}); RHR is ${display(average(values(recent, "resting_heart_rate")), " bpm", 1)} (${display(rhrDelta, " bpm", 1)}; N=${values(recent, "resting_heart_rate").length}/${values(prior, "resting_heart_rate").length}).`,
    interpretation:
      (hrvDelta ?? 0) < -3 || (rhrDelta ?? 0) > 2
        ? "The recent window shows more physiological strain than the preceding month."
        : "The recent window does not show a strong adverse autonomic shift.",
    confidence: windowConfidence(Math.min(values(recent, "hrv_rmssd_milli").length, values(recent, "resting_heart_rate").length), Math.min(values(prior, "hrv_rmssd_milli").length, values(prior, "resting_heart_rate").length)),
    severity: Math.abs(hrvDelta ?? 0) + Math.abs(rhrDelta ?? 0) * 3,
    visualization: { kind: "autonomic", hrvDelta, rhrDelta },
  });
  for (const effect of journalEffects.slice(0, 3)) {
    const direction = effect.recoveryDelta >= 0 ? "higher" : "lower";
    findings.push({
      title: effect.question.replace(/\?$/, ""),
      evidence: `${effect.yesCount} yes cycles versus ${effect.noCount} no cycles: recovery was ${Math.abs(effect.recoveryDelta).toFixed(1)} points ${direction}${effect.hrvDelta === null ? "" : ` and HRV differed by ${Math.abs(effect.hrvDelta).toFixed(1)} ms`}.`,
      interpretation: "This is a personal association, not proof of causation, but the repeated journal split makes it useful for experimentation.",
      confidence: Math.min(effect.yesCount, effect.noCount) >= 30 ? "Moderate" : "Suggestive",
      severity: effect.magnitude,
      visualization: {
        kind: "journal",
        yesCount: effect.yesCount,
        noCount: effect.noCount,
        recoveryDelta: effect.recoveryDelta,
        hrvDelta: effect.hrvDelta,
      },
    });
  }

  const leverage: WhoopLeveragePoint[] = [];
  if (sleepGap !== null && sleepGap < -20 && asleep !== null && need !== null) {
    leverage.push({
      title: "Close the recurring sleep-need gap",
      evidence: `Average sleep is ${display(asleep / 60, "h")} against ${display(need / 60, "h")} of calculated need.`,
      why: "Repeated under-sleeping limits overnight autonomic recovery and makes training strain more expensive.",
      impact: "Most likely to improve recovery consistency, HRV, and next-day energy.",
      actions: ["Move the sleep opportunity 30 minutes earlier on four nights.", "Use sleep need—not a fixed eight-hour rule—to set bedtime.", "Protect the final hour from work and bright stimulation."],
      score: Math.abs(sleepGap) + 25,
    });
  }
  if (bedtimeVariance !== null && bedtimeVariance > 45) {
    leverage.push({
      title: "Narrow the bedtime window",
      evidence: `Bedtime varies by about ${bedtimeVariance.toFixed(0)} minutes around the personal average.`,
      why: "A wide timing range works against circadian consistency and can reduce sleep quality at the same duration.",
      impact: "Expected to improve sleep consistency and reduce low-recovery outliers.",
      actions: ["Keep bedtime inside a 45-minute window this week.", "Anchor wake time within 30 minutes, including the weekend."],
      score: bedtimeVariance,
    });
  }
  for (const effect of journalEffects.slice(0, 3)) {
    if (Math.abs(effect.recoveryDelta) < 3) continue;
    const positive = effect.recoveryDelta > 0;
    leverage.push({
      title: `${positive ? "Repeat" : "Reduce"}: ${effect.question.replace(/\?$/, "").toLowerCase()}`,
      evidence: `${effect.yesCount} yes observations were associated with ${Math.abs(effect.recoveryDelta).toFixed(1)} ${positive ? "higher" : "lower"} recovery points than ${effect.noCount} no observations.`,
      why: "This is one of the strongest repeated behavior-to-recovery splits in the personal journal.",
      impact: "Useful as a low-friction one-week experiment with a measurable next-morning signal.",
      actions: [positive ? "Repeat the behavior on at least five days." : "Avoid the behavior for seven days.", "Track recovery and HRV the following morning."],
      score: effect.magnitude + 20,
    });
  }

  const medicalFlags: string[] = [];
  const lowSpo2 = values(medical14, "spo2_percentage").filter((value) => value < 94);
  const measuredSpo2 = values(medical14, "spo2_percentage");
  if (lowSpo2.length >= 3) medicalFlags.push(`${lowSpo2.length}/${measuredSpo2.length} measured nights in the last 14 calendar days had average SpO2 below 94%. This is not a diagnosis.`);
  const highTemp = values(medical7, "skin_temp_celsius");
  const measuredTemp = values(medical7, "skin_temp_celsius");
  const fullTemp = average(values(cycles, "skin_temp_celsius"));
  if (fullTemp !== null && highTemp.filter((value) => value - fullTemp > 0.5).length >= 3) {
    medicalFlags.push(`${highTemp.filter((value) => value - fullTemp > 0.5).length}/${measuredTemp.length} measured nights in the last 7 calendar days were more than 0.5C above personal baseline. This is not a diagnosis.`);
  }

  const workoutDuration = average(
    workouts.map((row) => row.duration_minutes).filter((value): value is number => value !== null),
  );
  const weeklyWorkoutFrequency = days > 0 ? workouts.length / (days / 7) : 0;
  const metrics = {
    sleep: [
      metric("Total sleep", asleep === null ? null : asleep / 60, asleepRecent === null ? null : asleepRecent / 60, "h"),
      metric("Sleep efficiency", average(values(cycles, "sleep_efficiency")), average(values(recent, "sleep_efficiency")), "%"),
      metric("Sleep performance", average(values(cycles, "sleep_performance")), average(values(recent, "sleep_performance")), "%"),
      metric("Sleep consistency", average(values(cycles, "sleep_consistency")), average(values(recent, "sleep_consistency")), "%"),
      textMetric("Average sleep onset", formatMinutes(average(bedtimeValues)), formatMinutes(average(recent.map((row) => minutesFromLocalMidnight(row.sleep_onset, row.timezone_offset)).filter((value): value is number => value !== null)))),
      textMetric("Average wake time", formatMinutes(average(wakeValues)), formatMinutes(average(recent.map((row) => minutesFromLocalMidnight(row.wake_onset, row.timezone_offset)).filter((value): value is number => value !== null)))),
      metric("Deep sleep share", stageTotal ? ((average(values(cycles, "deep_minutes")) ?? 0) / stageTotal) * 100 : null, null, "%"),
      metric("REM sleep share", stageTotal ? ((average(values(cycles, "rem_minutes")) ?? 0) / stageTotal) * 100 : null, null, "%"),
    ],
    cardiovascular: [
      metric("Resting heart rate", average(values(cycles, "resting_heart_rate")), average(values(recent, "resting_heart_rate")), " bpm", 1, undefined, "down"),
      metric("HRV (RMSSD)", average(values(cycles, "hrv_rmssd_milli")), average(values(recent, "hrv_rmssd_milli")), " ms", 0),
      metric("Blood oxygen", average(values(cycles, "spo2_percentage")), average(values(recent, "spo2_percentage")), "%"),
      metric("Respiratory rate", average(values(cycles, "respiratory_rate")), average(values(recent, "respiratory_rate")), " rpm", 1, undefined, "neutral"),
      metric("Skin temperature", average(values(cycles, "skin_temp_celsius")), average(values(recent, "skin_temp_celsius")), "°C", 2, "WHOOP reports absolute skin temperature in this export.", "neutral"),
    ],
    recovery: [
      metric("Recovery score", average(values(cycles, "recovery_score")), average(values(recent, "recovery_score")), "%"),
      metric("Daily strain", average(values(cycles, "day_strain")), average(values(recent, "day_strain")), "", 1, undefined, "neutral"),
      metric("Sleep need", need === null ? null : need / 60, needRecent === null ? null : needRecent / 60, "h", 1, undefined, "neutral"),
      metric("Sleep debt", average(values(cycles, "sleep_debt_minutes")), average(values(recent, "sleep_debt_minutes")), " min", 0, undefined, "down"),
    ],
    activity: [
      metric("Workout frequency", weeklyWorkoutFrequency, recentWorkouts.length / 4, "/week", 1, undefined, "neutral"),
      metric("Workout duration", workoutDuration, average(recentWorkouts.map((row) => row.duration_minutes).filter((value): value is number => value !== null)), " min", 0, undefined, "neutral"),
      metric("Workout strain", average(workouts.map((row) => row.activity_strain).filter((value): value is number => value !== null)), average(recentWorkouts.map((row) => row.activity_strain).filter((value): value is number => value !== null)), "", 1, undefined, "neutral"),
      textMetric("Most common activity", [...new Map(workouts.map((row) => [row.activity_name ?? "Unknown", workouts.filter((item) => item.activity_name === row.activity_name).length])).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Not available", "Full export"),
    ],
  };

  const seriesKeys: Array<
    [keyof CycleRow, string, string, WhoopAnalysisReport["series"][number]["tone"]]
  > = [
    ["recovery_score", "Recovery", "%", "green"],
    ["asleep_minutes", "Sleep", "h", "violet"],
    ["hrv_rmssd_milli", "HRV", "ms", "cyan"],
    ["resting_heart_rate", "Resting HR", "bpm", "coral"],
    ["day_strain", "Strain", "", "amber"],
    ["skin_temp_celsius", "Skin temp", "°C", "rose"],
  ];
  const leadFinding = selectOverviewFinding(findings);
  const recoveryMetric = metrics.recovery[0];
  const sleepMetric = metrics.sleep[0];
  const hrvMetric = metrics.cardiovascular[1];
  const rhrMetric = metrics.cardiovascular[0];
  const strainMetric = metrics.recovery[1];

  return {
    empty: false,
    analysisWindow: {
      start: recentInterval.startKey,
      end: recentInterval.endKey,
      sampleCount: recent.length,
      calendarDays: 28,
    },
    inventory: {
      sourceName: latestImport.source_name,
      importedAt: latestImport.imported_at,
      latestImport: {
        sourceName: latestImport.source_name,
        importedAt: latestImport.imported_at,
        fingerprint: latestImport.fingerprint,
        start: latestImport.date_start,
        end: latestImport.date_end,
      },
      imports: imports.map((item) => ({
        sourceName: item.source_name,
        importedAt: item.imported_at,
        fingerprint: item.fingerprint,
        start: item.date_start,
        end: item.date_end,
      })),
      start: coverageStart,
      end: coverageEnd,
      days,
      counts: {
        cycles: cycles.length,
        sleeps: Number(sleepCount?.count ?? 0),
        workouts: workouts.length,
        journalAnswers: journals.length,
      },
      gaps: gapCount(cycles),
      reliability: days < 14 ? "Suggestive only: fewer than 14 days." : `${days} days supports baseline and pattern analysis.`,
      missing: ["Daily steps", "VO₂ max", "ECG or irregular rhythm flags", "Sleep latency", "Intra-night SpO₂ drops"],
    },
    metrics,
    overview: {
      title: leadFinding.title,
      detail: leadFinding.evidence,
      confidence: leadFinding.confidence,
      comparisons: [
        { key: "recovery", label: "Recovery", baseline: recoveryMetric.baselineValue, recent: recoveryMetric.recentValue, baselineLabel: recoveryMetric.value, recentLabel: recoveryMetric.recent, delta: recoveryMetric.delta, direction: recoveryMetric.direction, tone: "green" },
        { key: "sleep", label: "Sleep", baseline: sleepMetric.baselineValue, recent: sleepMetric.recentValue, baselineLabel: sleepMetric.value, recentLabel: sleepMetric.recent, delta: sleepMetric.delta, direction: sleepMetric.direction, tone: "violet" },
        { key: "hrv", label: "HRV", baseline: hrvMetric.baselineValue, recent: hrvMetric.recentValue, baselineLabel: hrvMetric.value, recentLabel: hrvMetric.recent, delta: hrvMetric.delta, direction: hrvMetric.direction, tone: "cyan" },
        { key: "rhr", label: "Resting HR", baseline: rhrMetric.baselineValue, recent: rhrMetric.recentValue, baselineLabel: rhrMetric.value, recentLabel: rhrMetric.recent, delta: rhrMetric.delta, direction: rhrMetric.direction, tone: "coral", lowerIsBetter: true },
        { key: "strain", label: "Strain", baseline: strainMetric.baselineValue, recent: strainMetric.recentValue, baselineLabel: strainMetric.value, recentLabel: strainMetric.recent, delta: strainMetric.delta, direction: strainMetric.direction, tone: "amber" },
      ],
    },
    series: seriesKeys.map(([key, label, unit, tone]) => {
      const divisor = key === "asleep_minutes" ? 60 : 1;
      const baseline = average(values(cycles, key));
      const recentAverage = average(values(recent, key));
      const normalizedBaseline = baseline === null ? null : baseline / divisor;
      const normalizedRecent = recentAverage === null ? null : recentAverage / divisor;
      return {
        key,
        label,
        unit,
        tone,
        baseline: round(normalizedBaseline),
        direction: comparisonDirection(normalizedBaseline, normalizedRecent),
        values: cycles.map((row) => ({
          date: row.cycle_start,
          value:
            key === "asleep_minutes" && typeof row[key] === "number"
              ? round((row[key] as number) / 60)
              : typeof row[key] === "number"
                ? round(row[key] as number)
                : null,
        })),
      };
    }),
    findings: rankWhoopFindings(findings),
    leveragePoints: leverage.sort((a, b) => b.score - a.score).slice(0, 5),
    protocol: {
      nonNegotiables: leverage.slice(0, 2).flatMap((item) => item.actions.slice(0, 1)),
      quickWins: leverage.slice(0, 4).flatMap((item) => item.actions.slice(1, 2)),
      watch: [
        "7-day average recovery: look for a sustained increase, not one green day.",
        "HRV and resting heart rate versus the prior 28-day window.",
        "Sleep duration versus calculated sleep need and bedtime variability.",
      ],
      medicalFlags,
    },
  };
}
