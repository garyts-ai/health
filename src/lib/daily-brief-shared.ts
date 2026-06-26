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

function promptMetric(value: number | null, suffix = "", digits = 0) {
  if (value === null || Number.isNaN(value)) {
    return "Not available";
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
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(isoDate));
}

function sleepCompositionLine(summary: DailySummary) {
  const stages = summary.readiness.sleepStageSummary;
  if (!stages) {
    return "Not available";
  }

  return [
    `deep ${handoffMetric(stages.deepHours, "h", 1)}`,
    `REM ${handoffMetric(stages.remHours, "h", 1)}`,
    `light ${handoffMetric(stages.lightHours, "h", 1)}`,
    `awake ${handoffMetric(stages.awakeHours, "h", 1)}`,
    `in bed ${handoffMetric(stages.inBedHours, "h", 1)}`,
  ].join(", ");
}

function formatPromptList(values: string[], fallback = "Not available") {
  const cleanValues = values.filter((value) => value.trim().length > 0);

  return cleanValues.length > 0 ? cleanValues.join(", ") : fallback;
}

function formatDecisionFactors(summary: DailySummary) {
  return formatPromptList(
    summary.physiqueDecision.decisionFactors.map(
      (factor) => `${factor.label} (${factor.tone}): ${factor.detail}`,
    ),
  );
}

function formatNutritionActuals(summary: DailySummary) {
  if (!summary.nutritionActuals.hasLoggedIntake) {
    return "No meals logged yet";
  }

  return [
    `${summary.nutritionActuals.calories}/${summary.nutritionActuals.calorieTarget ?? "Not available"} cal`,
    `${summary.nutritionActuals.proteinG}/${summary.nutritionActuals.proteinTargetG ?? "Not available"}g protein`,
    `${summary.nutritionActuals.carbsG}g carbs`,
    `${summary.nutritionActuals.fatG}g fat`,
  ].join(", ");
}

function formatNutritionRemaining(summary: DailySummary) {
  return [
    summary.nutritionActuals.remainingCalories === null
      ? "calories remaining not available"
      : `${summary.nutritionActuals.remainingCalories} cal remaining`,
    summary.nutritionActuals.remainingProteinG === null
      ? "protein remaining not available"
      : `${summary.nutritionActuals.remainingProteinG}g protein remaining`,
  ].join(", ");
}

function formatWeeklyMuscleFocus(summary: DailySummary) {
  return formatPromptList(
    summary.trainingLoad.weeklyMuscleFocus.map((group) => `${group.label} ${group.hits}x`),
    "No current-week lifting exposure logged",
  );
}

function formatWeeklyMuscleVolume(summary: DailySummary) {
  return formatPromptList(
    summary.trainingLoad.weeklyMuscleVolume
      .slice(0, 12)
      .map((group) => `${group.label} ${group.effectiveSets} effective sets / ${group.hits}x`),
    "No current-week lifting volume",
  );
}

function formatStrengthProgression(summary: DailySummary) {
  return formatPromptList(
    summary.physiqueDecision.strengthProgression.map(
      (lift) => `${lift.exercise}: ${lift.deltaLabel} (${lift.confidenceLabel})`,
    ),
    "Not enough repeat lift history",
  );
}

function formatScorecard(summary: DailySummary) {
  return formatPromptList(
    summary.physiqueDecision.weeklyScorecard.map(
      (item) => `${item.label}: ${item.value} - ${item.detail} (${item.status})`,
    ),
  );
}

function formatTrend(points: Array<{ label: string; value: number | null }>, suffix = "", digits = 1) {
  return formatPromptList(
    points
      .slice(-7)
      .map((point) => `${point.label} ${promptMetric(point.value, suffix, digits)}`),
  );
}

function formatFreshness(summary: DailySummary) {
  const sourceLine = (label: string, source: { connected: boolean; isStale: boolean; lastSyncCompletedAt: string | null }) =>
    `${label}: ${source.connected ? "connected" : "not connected"}, ${
      source.isStale ? "stale" : "fresh"
    }, last sync ${source.lastSyncCompletedAt ?? "Not available"}`;

  return [
    sourceLine("WHOOP", summary.freshness.whoop),
    sourceLine("Hevy", summary.freshness.hevy),
  ].join("; ");
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

function activityDetail(summary: DailySummary) {
  const latest = summary.activityContext.latestSession;

  if (!latest) {
    return summary.activityContext.summaryLine;
  }

  return `${latest.sportName}: ${latest.durationMinutes} min / strain ${
    latest.strain?.toFixed(1) ?? "--"
  }`;
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
      label: "Decision",
      value:
        summary.physiqueDecision.trainingAvailability === "Rest"
          ? "Rest"
          : summary.physiqueDecision.trainingTarget,
      detail: `${intensityDisplay}: ${summary.physiqueDecision.primaryDecisionReason}`,
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
        : summary.nutritionTargets.campaign.active
          ? `${summary.nutritionTargets.campaign.dayType} day · ${summary.nutritionTargets.campaign.daysRemaining} days left`
          : summary.physiqueDecision.calorieRecommendation,
    },
    {
      label: "Protein",
      value: summary.nutritionActuals.hasLoggedIntake
        ? `${summary.nutritionActuals.proteinG}/${summary.nutritionActuals.proteinTargetG ?? "--"}g`
        : summary.physiqueDecision.proteinTargetLabel,
      detail: summary.nutritionActuals.hasLoggedIntake
        ? `${summary.nutritionActuals.remainingProteinG ?? "--"}g remaining`
        : summary.nutritionTargets.campaign.active
          ? `${summary.nutritionTargets.campaign.proteinMinimumG}g minimum`
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
    {
      label: "Activity",
      value: summary.activityContext.displayWindowLabel,
      detail: activityDetail(summary),
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
    "Use this full Health OS context to make a fresh call on today's actions and the next-week game plan. Keep it practical; cite the main metric drivers.";

  const promptText = [
    "My goal or follow-up question",
    "[Add your goal, constraint, or follow-up question here before sending.]",
    "",
    "Role",
    "Act as a practical strength, nutrition, recovery, and health coach. Use only the Health OS context below. Do not diagnose medical conditions or invent missing data.",
    "",
    "What I need from you",
    "- Give action items for today.",
    "- Give a next-week game plan that accounts for weekly lift pace, split recency, recovery, nutrition, activity, and strength progression.",
    "- Identify the main bottleneck and the tradeoffs.",
    "- Separate high-confidence calls from guesses.",
    "- Ask clarifying questions only if they would materially change the plan.",
    "",
    "Coaching rules",
    "- Use the full context, not just today's metrics.",
    "- Treat the app's deterministic decision as evidence, not as something to blindly echo.",
    summary.nutritionTargets.campaign.active
      ? "- Prioritize the Cancun cut: health, digestion, sleep, and function first; modest fat loss and visual sharpness second. No dehydration or crash-diet tactics."
      : "- Prioritize sustainable progress: longevity and feeling good first; strength and body composition second.",
    "- If signals conflict, call out the conflict and choose the most practical path.",
    "- Keep rationale brief: cite the metrics that drive each call, but do not show hidden chain-of-thought.",
    "- Avoid extreme calorie changes, unsafe training jumps, and medical claims.",
    "",
    "Current snapshot",
    `- Training availability: ${summary.physiqueDecision.trainingAvailability}`,
    `- Training target: ${summary.physiqueDecision.trainingTarget}`,
    `- Next training target: ${summary.physiqueDecision.nextTrainingTarget}`,
    `- Training target reason: ${summary.physiqueDecision.trainingTargetReason}`,
    `- Decision reason: ${summary.physiqueDecision.primaryDecisionReason}`,
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
    `- Nutrition campaign: ${
      summary.nutritionTargets.campaign.active
        ? `${summary.nutritionTargets.campaign.phase}, ${summary.nutritionTargets.campaign.daysRemaining} days remaining`
        : "inactive"
    }`,
    `- Campaign calorie lanes: ${
      summary.nutritionTargets.campaign.active
        ? `${summary.nutritionTargets.campaign.averageCalorieTarget} average / ${summary.nutritionTargets.campaign.trainingDayCalorieTarget} training / ${summary.nutritionTargets.campaign.restDayCalorieTarget} rest`
        : "normal saved or smart targets"
    }`,
    `- Protein floor: ${summary.nutritionTargets.campaign.active ? `${summary.nutritionTargets.campaign.proteinMinimumG}g` : "not campaign-managed"}`,
    `- Qualified loss rate: ${
      summary.nutritionTargets.campaign.qualifiedLossRateLbPerWeek === null
        ? "unavailable"
        : `${summary.nutritionTargets.campaign.qualifiedLossRateLbPerWeek.toFixed(2)} lb/week`
    }`,
    `- Nutrition target evidence: ${summary.nutritionTargets.campaign.evidence}`,
    `- Intake logged today: ${formatNutritionActuals(summary)}`,
    `- Intake remaining: ${formatNutritionRemaining(summary)}`,
    `- Recovery score: ${promptMetric(summary.readiness.recoveryScore, "%")}`,
    `- Recovery 3-day trend: ${promptMetric(summary.readiness.recoveryTrend3d, "%")}`,
    `- Actual sleep: ${promptMetric(summary.readiness.sleepHours, "h", 1)}`,
    `- Sleep vs need: ${promptMetric(summary.readiness.sleepVsNeedHours, "h", 1)}`,
    `- Sleep composition: ${sleepCompositionLine(summary)}`,
    `- WHOOP day strain: ${promptMetric(summary.strainSummary.score, "", 1)}`,
    `- WHOOP strain context: ${summary.strainSummary.blurb}`,
    `- Activity context (${summary.activityContext.displayWindowLabel}): ${summary.activityContext.summaryLine}`,
    `- Latest non-lifting activity: ${activityDetail(summary)}`,
    `- Activity interpretation: ${summary.activityContext.interpretation}`,
    `- Overnight read: ${summary.overnightRead.label}`,
    `- Overnight disruption context: ${summary.lateNightDisruption.blurb}`,
    `- Overnight disruption signal: ${summary.lateNightDisruption.active ? `${summary.lateNightDisruption.likelyLane} (${summary.lateNightDisruption.confidence})` : "inactive"}`,
    `- Latest Hevy workout: ${summary.trainingLoad.hevyLastWorkoutTitle ?? "Not available"}`,
    `- Latest workout muscle groups: ${formatPromptList(latestLiftFocus, "Not available")}`,
    `- Days since upper-body session: ${formatDaysSince(summary.trainingLoad.upperBodyDaysSince)}`,
    `- Days since lower-body session: ${formatDaysSince(summary.trainingLoad.lowerBodyDaysSince)}`,
    `- Source freshness: ${formatFreshness(summary)}`,
    "",
    "Trend and weekly context",
    `- Weekly pace: ${summary.physiqueDecision.weeklyPaceLabel}`,
    `- Days left in week: ${summary.physiqueDecision.daysLeftInWeek}`,
    `- Lifts needed for 4x: ${summary.physiqueDecision.liftsNeededForGoal}`,
    `- Can still hit 4x if resting today: ${summary.physiqueDecision.canStillHitWeeklyGoalIfRestToday ? "yes" : "no"}`,
    `- Decision factors: ${formatDecisionFactors(summary)}`,
    `- Weekly scorecard: ${formatScorecard(summary)}`,
    `- Weekly muscle groups hit: ${formatWeeklyMuscleFocus(summary)}`,
    `- Weekly effective sets: ${formatWeeklyMuscleVolume(summary)}`,
    `- Strength progression: ${formatStrengthProgression(summary)}`,
    `- Workouts this week: ${summary.trainingLoad.hevyWorkoutCountThisWeek}`,
    `- Weekly training demand: ${summary.trainingLoad.hevySetCountThisWeek} sets Mon-Sun`,
    `- Rolling 7-day training: ${summary.trainingLoad.hevyWorkoutCount7d} workouts, ${summary.trainingLoad.hevySetCount7d} sets`,
    `- Current body weight: ${formatPounds(kilogramsToPounds(summary.readiness.bodyWeightKg))}`,
    `- Body weight context: ${bodyWeightTrendLabel}`,
    `- 14-day weight trend: ${formatTrend(summary.trendSeries?.weight14d ?? [], " lb", 1)}`,
    `- 7-day recovery trend: ${formatTrend(summary.trendSeries?.recovery7d ?? [], "%", 0)}`,
    `- 7-day sleep trend: ${formatTrend(summary.trendSeries?.sleep7d ?? [], "h", 1)}`,
    `- 7-day strain trend: ${formatTrend(summary.trendSeries?.strain7d ?? [], "", 1)}`,
    `- 7-day lifting load trend: ${formatTrend(summary.trendSeries?.load7d ?? [], " sets", 0)}`,
    `- Days since push session: ${formatDaysSince(summary.trainingLoad.pushDaysSince)}`,
    `- Days since pull session: ${formatDaysSince(summary.trainingLoad.pullDaysSince)}`,
    "",
    "Output format",
    "1. Read on the situation: 2-4 sentences, including the main bottleneck and any conflicting signals.",
    "2. Action items for today: training, eating, recovery, supplements, and caution. Keep each item concrete.",
    "3. Next-week game plan: suggested lifting cadence, upper/lower sequencing, nutrition focus, and recovery guardrails.",
    "4. Nutrition targets: calories, protein, timing, and what to do if intake is already behind.",
    "5. Training priorities: target split, intensity, exercise anchors, progression or deload guidance.",
    "6. Recovery priorities: sleep, strain, activity, and when to preserve a better training day.",
    "7. Watchouts: risks, low-confidence areas, or data that would change the recommendation.",
    "8. Optional follow-up questions: ask only questions that would materially improve the plan.",
    "",
    "For every recommendation, include:",
    "- the main metric drivers",
    "- the practical tradeoff",
    "- confidence: high, medium, or low",
  ].join("\n");

  return {
    headline: "ChatGPT coach handoff",
    subheadline:
      "A one-shot prompt with today context, weekly trajectory, and enough metric drivers for a fresh coach read.",
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
