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
  copyLabel: string;
  contextPacketText: string;
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

function formatPromptDateTime(isoDate: string | null) {
  if (!isoDate) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function formatPromptTime(isoDate: string | null) {
  if (!isoDate) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function formatOptionalNumber(value: number | null, suffix = "", digits = 0) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${value.toFixed(digits)}${suffix}`;
}

function formatDistanceMeters(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${(value / 1609.344).toFixed(2)} mi`;
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
      (factor) => `${factor.label} (${factor.tone})`,
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

function yesNo(value: boolean) {
  return value ? "yes" : "no";
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

function formatOptional(value: string | number | null | undefined, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return `${value}${suffix}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMinutesValue(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : `${value} min`;
}

function formatKg(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : `${Math.round(value)} kg`;
}

function formatRecentWorkoutDetails(summary: DailySummary) {
  const details = summary.trainingLoad.recentWorkoutDetails ?? [];
  if (details.length === 0) {
    return ["- Recent workout details: Not available"];
  }

  return details.flatMap((workout, index) => [
    `- Workout ${index + 1}: ${workout.title} | ${formatDateTime(workout.startedAt)} | ${formatMinutesValue(workout.durationMinutes)} | ${formatKg(workout.volumeKg)} | ${workout.setCount} sets / ${workout.exerciseCount} exercises`,
    ...workout.exercises.slice(0, 8).map(
      (exercise) =>
        `  - ${exercise.title}: ${exercise.workingSetCount}/${exercise.setCount} working sets; top ${exercise.topSetLabel ?? "Not available"}; sets ${exercise.setSummary}`,
    ),
  ]);
}

function formatObservedWeeklyData(summary: DailySummary) {
  const days = summary.weeklyPlan?.days ?? [];
  if (!summary.weeklyPlan || days.length === 0) {
    return ["- Weekly calendar observations: Not available"];
  }

  const completedDays = days.filter((day) => day.state === "completed");
  const todayEntries = days.filter((day) => day.state === "today");
  const futureEntries = days.filter((day) => day.state === "planned" || day.state === "recovery");
  const missedOrUnloggedPastDays = days.filter(
    (day) => day.state === "completed" && day.actualWorkout === null,
  );

  return [
    `- Completed day entries: ${completedDays.length}`,
    `- Today entries without actual workout: ${todayEntries.filter((day) => day.actualWorkout === null).length}`,
    `- Future planned/recovery entries: ${futureEntries.length}`,
    `- Missed or unlogged completed-day workouts: ${missedOrUnloggedPastDays.length}`,
    ...completedDays.map(
      (day) =>
        `- Completed ${day.label} ${day.date}: ${day.actualWorkout ?? "actual workout not logged"}; classified ${day.workoutType}`,
    ),
    ...todayEntries.map(
      (day) =>
        `- Today ${day.label} ${day.date}: actual workout ${day.actualWorkout ?? "none logged yet"}`,
    ),
  ];
}

function formatNutritionEntries(summary: DailySummary) {
  if (summary.nutritionActuals.entries.length === 0) {
    return ["- Logged meals: none"];
  }

  return summary.nutritionActuals.entries.slice(0, 8).map(
    (entry) =>
      `- ${formatDateTime(entry.loggedAt)} ${entry.mealType}: ${entry.label}; ${entry.calories} cal, ${entry.proteinG}g protein, ${entry.carbsG}g carbs, ${entry.fatG}g fat`,
  );
}

function formatRecentSleepWindows(summary: DailySummary) {
  return formatPromptList(
    summary.trendSeries.sleepWindows7d.slice(-7).map((window) => {
      const endLabel = window.end ? formatPromptTime(window.end) : "open";
      return [
        `${window.label} ${formatPromptDateTime(window.start)}-${endLabel}`,
        `${formatOptionalNumber(window.sleepHours, "h", 1)} sleep`,
        `${formatOptionalNumber(window.inBedHours, "h", 1)} in bed`,
        `${formatOptionalNumber(window.awakeHours, "h", 1)} awake`,
        `deep ${formatOptionalNumber(window.deepHours, "h", 1)}`,
        `REM ${formatOptionalNumber(window.remHours, "h", 1)}`,
        `light ${formatOptionalNumber(window.lightHours, "h", 1)}`,
        `perf ${formatOptionalNumber(window.sleepPerformance, "%")}`,
        `eff ${formatOptionalNumber(window.sleepEfficiency, "%")}`,
      ].join("; ");
    }),
    "No recent sleep windows available",
  );
}

function formatActivitySessions(summary: DailySummary) {
  return formatPromptList(
    summary.activityContext.sessions.slice(0, 10).map((session) => {
      const endLabel = session.end ? formatPromptTime(session.end) : "open";
      return [
        `${formatPromptDateTime(session.start)}-${endLabel}`,
        session.sportName,
        `${session.durationMinutes} min`,
        `strain ${formatOptionalNumber(session.strain, "", 1)}`,
        `avg HR ${formatOptionalNumber(session.averageHeartRate, " bpm")}`,
        `max HR ${formatOptionalNumber(session.maxHeartRate, " bpm")}`,
        `distance ${formatDistanceMeters(session.distanceMeter)}`,
      ].join("; ");
    }),
    "No walking, tennis, or conditioning sessions in displayed activity window",
  );
}

function formatActivityDays(summary: DailySummary) {
  return formatPromptList(
    summary.activityContext.days.map((day) => {
      if (!day.hasActivity) {
        return `${day.label}: none`;
      }

      const buckets = day.buckets
        .map((bucket) => `${bucket.kind} ${bucket.count}x / strain ${bucket.strain.toFixed(1)}`)
        .join(", ");
      return `${day.label}: ${buckets}; total strain ${day.totalStrain.toFixed(1)}`;
    }),
    "No activity day buckets available",
  );
}

function formatNutritionEntrySummary(summary: DailySummary) {
  return formatPromptList(
    summary.nutritionActuals.entries.map((entry) =>
      [
        `${formatPromptDateTime(entry.loggedAt)} ${entry.mealType}`,
        entry.label,
        `${entry.calories} cal`,
        `${entry.proteinG}g protein`,
        `${entry.carbsG}g carbs`,
        `${entry.fatG}g fat`,
        entry.note ? `note: ${entry.note}` : "",
      ]
        .filter(Boolean)
        .join("; "),
    ),
    "No meal entries logged today",
  );
}

function formatWeeklyPlanRows(summary: DailySummary) {
  if (!summary.weeklyPlan) {
    return "No weekly plan available";
  }

  return formatPromptList(
    summary.weeklyPlan.days.map((day) =>
      [
        `${day.label} ${day.date}`,
        day.state,
        day.workoutType,
        day.actualWorkout ? `actual: ${day.actualWorkout}` : "",
        day.anchors.length ? `anchors: ${day.anchors.join(", ")}` : "",
        `${day.calorieTarget ?? "--"} cal`,
        `${day.proteinTargetG ?? "--"}g protein`,
        `recovery: ${day.recoveryPriority}`,
      ]
        .filter(Boolean)
        .join("; "),
    ),
  );
}

function formatActivityBuckets(summary: DailySummary) {
  if (summary.activityContext.buckets.length === 0) {
    return "Not available";
  }

  return summary.activityContext.buckets
    .map(
      (bucket) =>
        `${bucket.label}: ${bucket.count} sessions, ${bucket.durationMinutes} min, strain ${bucket.strain.toFixed(1)}, distance ${
          bucket.distanceMeter === null ? "Not available" : `${Math.round(bucket.distanceMeter)}m`
        }`,
    )
    .join("; ");
}

function formatHistoricalContext(summary: DailySummary) {
  const context = summary.historicalContext;
  if (!context?.available) {
    return "Not available";
  }

  return [
    `coverage end ${context.coverageEnd ?? "Not available"}`,
    `age tier ${context.importAgeTier}`,
    `confidence ${context.confidence}`,
    `qualifier ${context.qualifier ?? "Not available"}`,
    `strongest deviation ${context.strongestDeviation ?? "Not available"}`,
    `behavior cue ${context.behaviorCue ?? "Not available"}`,
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
    "Paste this data-only context packet with your own question. It gives an external LLM HealthMax facts without app-authored advice or planned actions.";

  const contextPacketText = [
    "HealthMax LLM context packet",
    "",
    "How to use this packet",
    "- Gary will ask a separate question alongside this packet.",
    "- Use only the data below unless Gary adds more context.",
    "- Do not invent missing values; treat `Not available` as unavailable data.",
    "- This packet is observational data only; it excludes HealthMax planned actions and prescription-style fields.",
    "",
    "Source freshness and coverage",
    `- Snapshot date: ${formatDateTime(summary.date)}`,
    `- Source freshness: ${formatFreshness(summary)}`,
    `- Historical WHOOP context: ${formatHistoricalContext(summary)}`,
    "",
    "Current app-observed state",
    `- Training availability status: ${summary.physiqueDecision.trainingAvailability}`,
    `- Training-load bottleneck data: ${summary.trainingLoad.hevyWorkoutCount7d} lifts / ${summary.trainingLoad.hevySetCount7d} sets in 7 days; ${summary.trainingLoad.hevyWorkoutCountThisWeek} lifts / ${summary.trainingLoad.hevySetCountThisWeek} sets Mon-Sun`,
    `- Load flags: high training load ${yesNo(summary.stressFlags.highTrainingLoad)}; recent load spike ${yesNo(summary.trainingLoad.recentLoadSpike)}; consecutive lifting days ${summary.trainingLoad.hevyConsecutiveDays}`,
    `- Split recency observations: upper ${formatDaysSince(summary.trainingLoad.upperBodyDaysSince)}; lower ${formatDaysSince(summary.trainingLoad.lowerBodyDaysSince)}; push ${formatDaysSince(summary.trainingLoad.pushDaysSince)}; pull ${formatDaysSince(summary.trainingLoad.pullDaysSince)}`,
    `- Weekly goal pressure data: days left ${summary.physiqueDecision.daysLeftInWeek}; lifts remaining for weekly goal ${summary.physiqueDecision.liftsNeededForGoal}; weekly pace ${summary.physiqueDecision.weeklyPaceLabel}; goal still reachable if no lift today ${yesNo(summary.physiqueDecision.canStillHitWeeklyGoalIfRestToday)}`,
    `- Source signal factors: ${formatDecisionFactors(summary)}`,
    `- Weekly scorecard: ${formatScorecard(summary)}`,
    "",
    "Current recovery, strain, and physiology",
    `- Recovery score: ${promptMetric(summary.readiness.recoveryScore, "%")}`,
    `- Recovery 3-day trend: ${promptMetric(summary.readiness.recoveryTrend3d, "%")}`,
    `- HRV RMSSD: ${promptMetric(summary.readiness.hrvRmssd, " ms")}`,
    `- HRV vs 7-day: ${promptMetric(summary.readiness.hrvVs7d, " ms", 1)}`,
    `- Blood oxygen SpO2: ${promptMetric(summary.readiness.spo2Percentage, "%", 1)}`,
    `- Resting heart rate: ${promptMetric(summary.readiness.restingHeartRate, " bpm")}`,
    `- Resting heart rate vs 7-day: ${promptMetric(summary.readiness.restingHeartRateVs7d, " bpm", 1)}`,
    `- Respiratory rate: ${promptMetric(summary.readiness.respiratoryRate, " rpm", 1)}`,
    `- Respiratory rate vs 7-day: ${promptMetric(summary.readiness.respiratoryRateVs7d, " rpm", 1)}`,
    `- Skin temperature: ${promptMetric(summary.readiness.skinTempCelsius, " C", 1)}`,
    `- Skin temperature vs 7-day: ${promptMetric(summary.readiness.skinTempVs7d, " C", 1)}`,
    `- WHOOP day strain: ${promptMetric(summary.strainSummary.score, "", 1)}`,
    `- WHOOP 7-day strain average: ${promptMetric(summary.readiness.whoopStrain7dAvg, "", 1)}`,
    `- WHOOP day strain vs 7-day: ${promptMetric(summary.readiness.whoopDayStrainVs7d, "", 1)}`,
    `- WHOOP strain context: ${summary.strainSummary.blurb}`,
    `- WHOOP strain support: ${formatPromptList(summary.strainSummary.supportingPoints)}`,
    `- Overnight read: ${summary.overnightRead.label}. ${summary.overnightRead.detail}`,
    `- Overnight disruption context: ${summary.lateNightDisruption.blurb}`,
    `- Overnight disruption signal: ${summary.lateNightDisruption.active ? `${summary.lateNightDisruption.likelyLane} (${summary.lateNightDisruption.confidence})` : "inactive"}`,
    "",
    "Sleep detail",
    `- Actual sleep: ${promptMetric(summary.readiness.sleepHours, "h", 1)}`,
    `- Sleep vs need: ${promptMetric(summary.readiness.sleepVsNeedHours, "h", 1)}`,
    `- Sleep performance: ${promptMetric(summary.readiness.sleepPerformance, "%")}`,
    `- Sleep consistency: ${promptMetric(summary.readiness.sleepConsistency, "%")}`,
    `- Sleep efficiency: ${promptMetric(summary.readiness.sleepEfficiency, "%")}`,
    `- Awake time: ${promptMetric(summary.readiness.awakeHours, "h", 1)}`,
    `- Sleep onset: ${formatDateTime(summary.readiness.latestSleepStart)}`,
    `- Wake time: ${formatDateTime(summary.readiness.latestSleepEnd)}`,
    `- Sleep composition: ${sleepCompositionLine(summary)}`,
    "",
    "Recent trends",
    `- 14-day weight trend: ${formatTrend(summary.trendSeries?.weight14d ?? [], " lb", 1)}`,
    `- 7-day recovery trend: ${formatTrend(summary.trendSeries?.recovery7d ?? [], "%", 0)}`,
    `- 7-day sleep trend: ${formatTrend(summary.trendSeries?.sleep7d ?? [], "h", 1)}`,
    `- 7-day strain trend: ${formatTrend(summary.trendSeries?.strain7d ?? [], "", 1)}`,
    `- 7-day lifting load trend: ${formatTrend(summary.trendSeries?.load7d ?? [], " sets", 0)}`,
    `- Current body weight: ${formatPounds(kilogramsToPounds(summary.readiness.bodyWeightKg))}`,
    `- Body weight context: ${bodyWeightTrendLabel}`,
    "",
    "Lifting summary",
    `- Latest Hevy workout: ${summary.trainingLoad.hevyLastWorkoutTitle ?? "Not available"}`,
    `- Latest Hevy workout time: ${formatDateTime(summary.trainingLoad.hevyLastWorkoutAt)}`,
    `- Latest workout volume: ${formatKg(summary.trainingLoad.hevyLastWorkoutVolumeKg)}`,
    `- Latest workout duration: ${
      summary.trainingLoad.hevyLastWorkoutDurationSeconds === null
        ? "Not available"
        : `${Math.round(summary.trainingLoad.hevyLastWorkoutDurationSeconds / 60)} min`
    }`,
    `- Latest workout muscle groups: ${formatPromptList(latestLiftFocus, "Not available")}`,
    `- Workouts this week: ${summary.trainingLoad.hevyWorkoutCountThisWeek}`,
    `- Weekly training demand: ${summary.trainingLoad.hevySetCountThisWeek} sets Mon-Sun`,
    `- Rolling 7-day training: ${summary.trainingLoad.hevyWorkoutCount7d} workouts, ${summary.trainingLoad.hevySetCount7d} sets`,
    `- Rolling 7-day volume: ${summary.trainingLoad.hevyVolume7d} kg`,
    `- 28-day average weekly volume: ${summary.trainingLoad.hevyVolume28dAvg} kg`,
    `- Consecutive lifting days: ${summary.trainingLoad.hevyConsecutiveDays}`,
    `- Recent load spike: ${summary.trainingLoad.recentLoadSpike ? "yes" : "no"}`,
    `- Days since upper-body session: ${formatDaysSince(summary.trainingLoad.upperBodyDaysSince)}`,
    `- Days since lower-body session: ${formatDaysSince(summary.trainingLoad.lowerBodyDaysSince)}`,
    `- Days since push session: ${formatDaysSince(summary.trainingLoad.pushDaysSince)}`,
    `- Days since pull session: ${formatDaysSince(summary.trainingLoad.pullDaysSince)}`,
    `- Weekly muscle groups hit: ${formatWeeklyMuscleFocus(summary)}`,
    `- Weekly effective sets: ${formatWeeklyMuscleVolume(summary)}`,
    `- Strength progression: ${formatStrengthProgression(summary)}`,
    "",
    "Recent lift details",
    ...formatRecentWorkoutDetails(summary),
    "",
    "Weekly observed data",
    `- Week: ${summary.weeklyPlan ? `${summary.weeklyPlan.weekStart} through ${summary.weeklyPlan.weekEnd}` : "Not available"}`,
    `- Target lifts: ${summary.weeklyPlan?.targetLifts ?? "Not available"}`,
    `- Completed lifts: ${summary.weeklyPlan?.completedLifts ?? "Not available"}`,
    ...formatObservedWeeklyData(summary),
    "",
    "Nutrition",
    `- Calorie target: ${summary.physiqueDecision.calorieTargetLabel}`,
    `- Protein target: ${summary.physiqueDecision.proteinTargetLabel}`,
    `- Nutrition campaign: ${
      summary.nutritionTargets.campaign.active
        ? `${summary.nutritionTargets.campaign.phase}, ${summary.nutritionTargets.campaign.daysRemaining} days remaining`
        : "inactive"
    }`,
    `- Campaign calorie lanes: ${
      summary.nutritionTargets.campaign.active
        ? `${summary.nutritionTargets.campaign.averageCalorieTarget} average / ${summary.nutritionTargets.campaign.trainingDayCalorieTarget} training / ${summary.nutritionTargets.campaign.restDayCalorieTarget} rest`
        : "Not available"
    }`,
    `- Protein floor: ${summary.nutritionTargets.campaign.active ? `${summary.nutritionTargets.campaign.proteinMinimumG}g` : "Not available"}`,
    `- Qualified loss rate: ${
      summary.nutritionTargets.campaign.qualifiedLossRateLbPerWeek === null
        ? "Not available"
        : `${summary.nutritionTargets.campaign.qualifiedLossRateLbPerWeek.toFixed(2)} lb/week`
    }`,
    `- Nutrition target evidence: ${formatOptional(summary.nutritionTargets.campaign.evidence)}`,
    `- Intake logged today: ${formatNutritionActuals(summary)}`,
    `- Intake remaining: ${formatNutritionRemaining(summary)}`,
    ...formatNutritionEntries(summary),
    "",
    "Activity",
    `- Activity context (${summary.activityContext.displayWindowLabel}): ${summary.activityContext.summaryLine}`,
    `- Activity interpretation: ${summary.activityContext.interpretation}`,
    `- Activity buckets: ${formatActivityBuckets(summary)}`,
    `- Latest non-lifting activity: ${activityDetail(summary)}`,
    `- Total non-lifting sessions: ${summary.activityContext.totalSessions}`,
    `- Total non-lifting duration: ${summary.activityContext.totalDurationMinutes} min`,
    `- Total non-lifting strain: ${summary.activityContext.totalStrain.toFixed(1)}`,
    "",
    "Recent high-resolution data",
    `- Recent sleep windows: ${formatRecentSleepWindows(summary)}`,
    `- Activity sessions (${summary.activityContext.displayWindowLabel}): ${formatActivitySessions(summary)}`,
    `- Activity day buckets (${summary.activityContext.displayWindowLabel}): ${formatActivityDays(summary)}`,
    `- Today's meal entries: ${formatNutritionEntrySummary(summary)}`,
    `- Weekly plan rows: ${formatWeeklyPlanRows(summary)}`,
    `- App recommendation candidates as evidence: ${formatPromptList(
      summary.recommendations.map(
        (item) =>
          `${item.category}/${item.priority}/${item.confidence}: ${item.title}; actions ${item.actionBullets.join(", ")}; evidence ${
            item.supportingMetrics.join(", ") || item.why
          }`,
      ),
      "No recommendation candidates available",
    )}`,
  ].join("\n");

  return {
    headline: "LLM context packet",
    subheadline:
      "A concise data-only HealthMax packet with no planned actions or app-authored advice.",
    metricCards,
    trainingContextCards,
    weeklyMuscleFocus,
    weeklyMuscleVolume,
    bodyWeightTrendLabel,
    latestLiftFocus,
    overnightReadLabel: summary.overnightRead.label,
    llmQuestion,
    copyLabel: "Copy data packet",
    contextPacketText,
    promptText: contextPacketText,
  };
}
