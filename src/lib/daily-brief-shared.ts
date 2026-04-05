import type { DailySummary } from "@/lib/insights/types";
import { formatPounds, kilogramsToPounds } from "@/lib/units";

export type LlmHandoffCard = {
  label: string;
  value: string;
  detail: string;
};

export type LlmHandoff = {
  headline: string;
  subheadline: string;
  metricCards: LlmHandoffCard[];
  trainingContextCards: LlmHandoffCard[];
  weeklyMuscleFocus: Array<{ label: string; hits: number }>;
  bodyWeightTrendLabel: string;
  latestLiftFocus: string[];
  overnightReadLabel: string;
  llmQuestion: string;
  promptText: string;
};

export function handoffMetric(value: number | null, suffix = "", digits = 0) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${value.toFixed(digits)}${suffix}`;
}

export function truncateHandoff(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

export function formatHandoffDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(isoDate));
}

function formatDaysSince(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${value}d`;
}

function latestLiftDetail(summary: DailySummary) {
  if (!summary.trainingLoad.hevyLastWorkoutTitle) {
    return "No recent Hevy session";
  }

  return truncateHandoff(summary.trainingLoad.hevyLastWorkoutTitle, 32);
}

function getBodyWeightTrendLabel(summary: DailySummary) {
  const deltaPounds = kilogramsToPounds(summary.readiness.bodyWeightDelta7dKg);

  if (deltaPounds === null || Math.abs(deltaPounds) < 0.4) {
    return "stable versus last week";
  }

  if (deltaPounds <= -1.2) {
    return "down noticeably this week";
  }

  if (deltaPounds < 0) {
    return "slightly down this week";
  }

  if (deltaPounds >= 1.2) {
    return "up noticeably this week";
  }

  return "slightly up this week";
}

function formatWeeklyMuscleSummary(groups: Array<{ label: string; hits: number }>) {
  if (groups.length === 0) {
    return "No recent lifting logged";
  }

  return groups
    .slice(0, 2)
    .map((group) => `${group.label} ${group.hits}x`)
    .join("\n");
}

function formatWeeklyMuscleDetail(groups: Array<{ label: string; hits: number }>, workoutCount: number) {
  if (groups.length === 0) {
    return `${workoutCount} workouts this week`;
  }

  const remainder = groups.slice(2, 4).map((group) => `${group.label} ${group.hits}x`);
  if (remainder.length === 0) {
    return `${workoutCount} workouts this week`;
  }

  return `Then ${remainder.join(", ")}`;
}

export function buildLlmHandoff(summary: DailySummary): LlmHandoff {
  const weeklyMuscleFocus = summary.trainingLoad.weeklyMuscleFocus;
  const latestLiftFocus = summary.trainingLoad.latestWorkoutFocus;
  const bodyWeightTrendLabel = getBodyWeightTrendLabel(summary);
  const metricCards: LlmHandoffCard[] = [
    {
      label: "Recovery",
      value: handoffMetric(summary.readiness.recoveryScore, "%"),
      detail: `3d trend ${handoffMetric(summary.readiness.recoveryTrend3d, "%")}`,
    },
    {
      label: "Actual Sleep",
      value: handoffMetric(summary.readiness.sleepHours, "h", 1),
      detail: `Vs need ${handoffMetric(summary.readiness.sleepVsNeedHours, "h", 1)}`,
    },
    {
      label: "Day Strain",
      value: handoffMetric(summary.strainSummary.score, "", 1),
      detail: summary.strainSummary.supportingPoints[0] ?? "WHOOP day strain",
    },
    {
      label: "Weekly Muscle Focus",
      value: formatWeeklyMuscleSummary(weeklyMuscleFocus),
      detail: formatWeeklyMuscleDetail(
        weeklyMuscleFocus,
        summary.trainingLoad.hevyWorkoutCount7d,
      ),
    },
    {
      label: "Body Weight",
      value: formatPounds(kilogramsToPounds(summary.readiness.bodyWeightKg)),
      detail: bodyWeightTrendLabel,
    },
    {
      label: "Latest Lift",
      value: latestLiftDetail(summary),
      detail:
        latestLiftFocus.length > 0
          ? `${latestLiftFocus.slice(0, 3).join(" - ")}`
          : `Upper ${formatDaysSince(summary.trainingLoad.upperBodyDaysSince)} - Lower ${formatDaysSince(summary.trainingLoad.lowerBodyDaysSince)}`,
    },
  ];

  const trainingContextCards: LlmHandoffCard[] = [
    {
      label: "Overnight Read",
      value: summary.overnightRead.label,
      detail: summary.overnightRead.detail,
    },
    {
      label: "Upper Recency",
      value: formatDaysSince(summary.trainingLoad.upperBodyDaysSince),
      detail: "Days since clear upper-body work",
    },
    {
      label: "Lower Recency",
      value: formatDaysSince(summary.trainingLoad.lowerBodyDaysSince),
      detail: "Days since clear lower-body work",
    },
    {
      label: "Weekly Split",
      value: weeklyMuscleFocus.length > 0 ? formatWeeklyMuscleSummary(weeklyMuscleFocus) : "--",
      detail: `${summary.trainingLoad.hevyConsecutiveDays} consecutive lifting days`,
    },
  ];

  const llmQuestion =
    "Based only on these WHOOP and Hevy metrics, what should today's training, eating, recovery, supplements, and caution priorities be? Explain the tradeoffs, your confidence, and which metrics matter most.";

  const promptText = [
    "Goal: longevity and feeling good first; strength and body composition second.",
    "Use the metrics below to infer today's priorities. Do not mirror any app-generated action cards or assumed recommendations.",
    "",
    "Metrics:",
    `- Recovery score: ${handoffMetric(summary.readiness.recoveryScore, "%")}`,
    `- Recovery 3-day trend: ${handoffMetric(summary.readiness.recoveryTrend3d, "%")}`,
    `- Actual sleep: ${handoffMetric(summary.readiness.sleepHours, "h", 1)}`,
    `- Sleep vs need: ${handoffMetric(summary.readiness.sleepVsNeedHours, "h", 1)}`,
    `- WHOOP day strain: ${handoffMetric(summary.strainSummary.score, "", 1)}`,
    `- Overnight read: ${summary.overnightRead.label}`,
    `- Overnight disruption context: ${summary.lateNightDisruption.blurb}`,
    `- Overnight disruption signal: ${summary.lateNightDisruption.active ? `${summary.lateNightDisruption.likelyLane} (${summary.lateNightDisruption.confidence})` : "inactive"}`,
    `- Weekly muscle groups hit: ${
      weeklyMuscleFocus.length > 0
        ? weeklyMuscleFocus.map((group) => `${group.label} ${group.hits}x`).join(", ")
        : "No recent lifting logged"
    }`,
    `- Workouts this week: ${summary.trainingLoad.hevyWorkoutCount7d}`,
    `- Weekly training demand: ${summary.trainingLoad.hevySetCount7d} sets`,
    `- Current body weight: ${formatPounds(kilogramsToPounds(summary.readiness.bodyWeightKg))}`,
    `- Body weight context: ${bodyWeightTrendLabel}`,
    `- Latest Hevy workout: ${summary.trainingLoad.hevyLastWorkoutTitle ?? "None logged"}`,
    `- Latest workout muscle groups: ${latestLiftFocus.length > 0 ? latestLiftFocus.join(", ") : "Unknown"}`,
    `- Days since upper-body session: ${formatDaysSince(summary.trainingLoad.upperBodyDaysSince)}`,
    `- Days since lower-body session: ${formatDaysSince(summary.trainingLoad.lowerBodyDaysSince)}`,
    `- Days since push session: ${formatDaysSince(summary.trainingLoad.pushDaysSince)}`,
    `- Days since pull session: ${formatDaysSince(summary.trainingLoad.pullDaysSince)}`,
    `- WHOOP strain context: ${summary.strainSummary.blurb}`,
    "",
    "Question:",
    "What do you think today's priorities should be for:",
    "1. Training",
    "2. Eating",
    "3. Recovery",
    "4. Supplements",
    "5. Caution flags",
    "",
    "Please explain the tradeoffs, which metrics drive your answer, and how confident you are.",
  ].join("\n");

  return {
    headline: "Fresh LLM handoff",
    subheadline:
      "A compact WHOOP + Hevy snapshot for an external model to interpret without inheriting the app's built-in recommendations.",
    metricCards,
    trainingContextCards,
    weeklyMuscleFocus,
    bodyWeightTrendLabel,
    latestLiftFocus,
    overnightReadLabel: summary.overnightRead.label,
    llmQuestion,
    promptText,
  };
}
