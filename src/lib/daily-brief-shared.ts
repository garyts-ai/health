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
  weeklyMuscleVolume: Array<{ label: string; effectiveSets: number; hits: number }>;
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

export function buildLlmHandoff(summary: DailySummary): LlmHandoff {
  const weeklyMuscleFocus = summary.trainingLoad.weeklyMuscleFocus;
  const weeklyMuscleVolume = summary.trainingLoad.weeklyMuscleVolume;
  const latestLiftFocus = summary.trainingLoad.latestWorkoutFocus;
  const bodyWeightTrendLabel = getBodyWeightTrendLabel(summary);
  const intensityDisplay =
    summary.physiqueDecision.trainingIntent === "Push"
      ? "Progress"
      : summary.physiqueDecision.trainingIntent;
  const metricCards: LlmHandoffCard[] = [
    {
      label: "Train",
      value: summary.physiqueDecision.trainingTarget,
      detail: `${intensityDisplay}: ${summary.physiqueDecision.intensityLabel}`,
    },
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
      label: "Calories",
      value: summary.nutritionActuals.hasLoggedIntake
        ? `${summary.nutritionActuals.calories}/${summary.nutritionActuals.calorieTarget ?? "--"}`
        : summary.physiqueDecision.calorieTargetLabel,
      detail: summary.nutritionActuals.hasLoggedIntake
        ? `${summary.nutritionActuals.remainingCalories ?? "--"} remaining`
        : summary.physiqueDecision.calorieRecommendation,
    },
    {
      label: "Protein",
      value: summary.nutritionActuals.hasLoggedIntake
        ? `${summary.nutritionActuals.proteinG}/${summary.nutritionActuals.proteinTargetG ?? "--"}g`
        : summary.physiqueDecision.proteinTargetLabel,
      detail: summary.nutritionActuals.hasLoggedIntake
        ? `${summary.nutritionActuals.remainingProteinG ?? "--"}g remaining`
        : "Target only; intake not logged yet",
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
      label: "Bottleneck",
      value: truncateHandoff(summary.physiqueDecision.mainBottleneck, 38),
      detail: "Dashboard decision layer",
    },
    {
      label: "Session Anchors",
      value:
        summary.physiqueDecision.sessionAnchors.length > 0
          ? summary.physiqueDecision.sessionAnchors.slice(0, 2).join("\n")
          : "--",
      detail: summary.physiqueDecision.trainingTargetReason,
    },
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
      label: "Muscle Volume",
      value:
        weeklyMuscleVolume.length > 0
          ? weeklyMuscleVolume
              .slice(0, 2)
              .map((group) => `${group.label} ${group.effectiveSets}`)
              .join("\n")
          : "--",
      detail: `${summary.trainingLoad.hevySetCountThisWeek} sets Mon-Sun`,
    },
  ];

  const llmQuestion =
    "Use only this snapshot to make a fresh call on training, eating, recovery, supplements, and caution. Keep it terse; cite the metrics that drive each call.";

  const promptText = [
    "Goal",
    "- Longevity and feeling good first; strength and body composition second.",
    "",
    "Rules",
    "- Use only the metrics below.",
    "- Do not mirror any app-generated action cards or assumed recommendations.",
    "- Infer fresh priorities from the data.",
    "",
    "Snapshot",
    `- Training target: ${summary.physiqueDecision.trainingTarget}`,
    `- Training target reason: ${summary.physiqueDecision.trainingTargetReason}`,
    `- Intensity intent: ${intensityDisplay}`,
    `- Intensity cue: ${summary.physiqueDecision.intensityLabel}`,
    `- Session anchors: ${
      summary.physiqueDecision.sessionAnchors.length > 0
        ? summary.physiqueDecision.sessionAnchors.join(", ")
        : "Use planned main lifts"
    }`,
    `- Main bottleneck: ${summary.physiqueDecision.mainBottleneck}`,
    `- Calorie target: ${summary.physiqueDecision.calorieTargetLabel}`,
    `- Calorie recommendation: ${summary.physiqueDecision.calorieRecommendation}`,
    `- Protein target: ${summary.physiqueDecision.proteinTargetLabel}`,
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
    `- Weekly effective sets: ${
      weeklyMuscleVolume.length > 0
        ? weeklyMuscleVolume
            .slice(0, 12)
            .map((group) => `${group.label} ${group.effectiveSets}`)
            .join(", ")
        : "No current-week lifting volume"
    }`,
    `- Strength progression: ${
      summary.physiqueDecision.strengthProgression.length > 0
        ? summary.physiqueDecision.strengthProgression
            .map((lift) => `${lift.exercise} ${lift.deltaLabel}`)
            .join(", ")
        : "Not enough repeat lift history"
    }`,
    `- Workouts this week: ${summary.trainingLoad.hevyWorkoutCountThisWeek}`,
    `- Weekly training demand: ${summary.trainingLoad.hevySetCountThisWeek} sets Mon-Sun`,
    `- Rolling 7-day training: ${summary.trainingLoad.hevyWorkoutCount7d} workouts, ${summary.trainingLoad.hevySetCount7d} sets`,
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
    "Output",
    "1. Training",
    "2. Eating",
    "3. Recovery",
    "4. Supplements",
    "5. Caution flags",
    "",
    "For each section, give:",
    "- priority",
    "- main metric drivers",
    "- tradeoffs",
    "- confidence",
  ].join("\n");

  return {
    headline: "External model handoff",
    subheadline:
      "A structured WHOOP + Hevy snapshot for fresh interpretation without inheriting the app's built-in recommendations.",
    metricCards,
    trainingContextCards,
    weeklyMuscleFocus,
    weeklyMuscleVolume,
    bodyWeightTrendLabel,
    latestLiftFocus,
    overnightReadLabel: summary.overnightRead.label,
    llmQuestion,
    promptText,
  };
}
