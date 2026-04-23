import type {
  DailyStressFlags,
  DailySummary,
  DiscordDeliveryStatus,
} from "@/lib/insights/types";

type ProviderStatus = {
  connected: boolean;
  isStale: boolean;
  lastSyncCompletedAt?: string | null;
};

const ACTIVE_SIGNAL_LABELS: Array<{
  key: keyof DailyStressFlags;
  label: string;
}> = [
  { key: "illnessRisk", label: "Physiology is under stress" },
  { key: "poorSleepTrend", label: "Sleep is under baseline" },
  { key: "lowRecovery", label: "Recovery is suppressed" },
  { key: "elevatedRestingHeartRate", label: "Resting heart rate is elevated" },
  { key: "suppressedHrv", label: "HRV is suppressed" },
  { key: "highTrainingLoad", label: "Training load is stacked" },
  { key: "localFatigueUpper", label: "Upper body is still carrying load" },
  { key: "localFatigueLower", label: "Lower body is still carrying load" },
];

function formatHours(value: number | null) {
  return value === null ? "--" : `${value.toFixed(1)}h`;
}

function formatPercent(value: number | null) {
  return value === null ? "--" : `${Math.round(value)}%`;
}

function formatPoundsValue(value: number | null) {
  return value === null ? "--" : `${value.toFixed(1)} lb`;
}

function formatMacroGrams(value: number) {
  return `${Math.round(value)}g`;
}

function sanitizeTrend(values: Array<number | null>) {
  return values.slice(-3).map((value) => (typeof value === "number" ? value : null));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatClockTime(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSyncTime(value: string | null) {
  if (!value) {
    return "never";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildFreshnessNotice(summary: DailySummary) {
  const staleSources = [
    !summary.freshness.whoop.connected
      ? `WHOOP disconnected, last sync ${formatSyncTime(summary.freshness.whoop.lastSyncCompletedAt)}`
      : summary.freshness.whoop.isStale
        ? `WHOOP last sync ${formatSyncTime(summary.freshness.whoop.lastSyncCompletedAt)}`
        : null,
    !summary.freshness.hevy.connected
      ? `Hevy disconnected, last sync ${formatSyncTime(summary.freshness.hevy.lastSyncCompletedAt)}`
      : summary.freshness.hevy.isStale
        ? `Hevy last sync ${formatSyncTime(summary.freshness.hevy.lastSyncCompletedAt)}`
      : null,
  ].filter((item): item is string => item !== null);

  if (staleSources.length === 0) {
    return null;
  }

  return `Source check: ${staleSources.join(" / ")}`;
}

function buildRecentDateLabels(summaryDate: string) {
  const summary = new Date(summaryDate);
  return [-2, -1, 0].map((offset) => {
    if (offset === 0) {
      return "Today";
    }

    const date = new Date(summary);
    date.setDate(summary.getDate() + offset);
    return formatShortDate(date.toISOString());
  });
}

function daysBetween(start: Date, end: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / msPerDay));
}

function formatLatestSessionAge(value: string | null, summaryDate: string) {
  if (!value) {
    return "No recent session";
  }

  const workoutAt = new Date(value);
  const summaryAt = new Date(summaryDate);
  const daysAgo = daysBetween(workoutAt, summaryAt);

  if (daysAgo <= 0) {
    return "Today";
  }

  if (daysAgo === 1) {
    return "1 day ago";
  }

  return `${daysAgo} days ago`;
}

function buildReadinessQualifier(summary: DailySummary) {
  const latestWorkoutAt = summary.trainingLoad.hevyLastWorkoutAt;
  if (!latestWorkoutAt) {
    return "No recent session map yet, so sleep and recovery should drive today's ceiling.";
  }

  const daysAgo = daysBetween(new Date(latestWorkoutAt), new Date(summary.date));
  const systemicHit =
    summary.lateNightDisruption.active ||
    summary.stressFlags.lowRecovery ||
    summary.stressFlags.poorSleepTrend;

  if (daysAgo >= 3 && systemicHit) {
    return "Local soreness is probably easing, but overnight recovery is the main reason not to push today.";
  }

  if (daysAgo >= 3) {
    return "This session map is older, so local fatigue is probably easing unless a body region still feels off.";
  }

  if (daysAgo <= 1 && systemicHit) {
    return "Recent lifting and overnight recovery are both working against a hard push today.";
  }

  if (daysAgo <= 1) {
    return "This session is recent enough that local fatigue may still matter today.";
  }

  if (systemicHit) {
    return "Muscle readiness may be improving, but systemic recovery is still the main limiter today.";
  }

  return "Local fatigue looks more relevant than systemic recovery today.";
}

function getUtilityStatusLabel(
  whoop: ProviderStatus,
  hevy: ProviderStatus,
  delivery: DiscordDeliveryStatus,
) {
  const providerIssues = [whoop, hevy].filter((status) => !status.connected || status.isStale).length;

  if (providerIssues === 0 && delivery.today.hasSuccessfulSend) {
    return "Connections healthy, Discord delivered";
  }

  if (providerIssues === 0) {
    return "Connections healthy, Discord ready";
  }

  if (providerIssues === 1) {
    return "One connection needs attention";
  }

  return "Connections need attention";
}

export function buildTodayViewModel(
  summary: DailySummary,
  whoop: ProviderStatus,
  hevy: ProviderStatus,
  delivery: DiscordDeliveryStatus,
) {
  const recentDateLabels = buildRecentDateLabels(summary.date);
  const hasWeeklyTraining = summary.trainingLoad.weeklyMuscleFocus.length > 0;
  const hasLatestCarryover =
    !hasWeeklyTraining && summary.bodyCard.latestWorkoutOverlayRegions.length > 0;
  const activeSignals = ACTIVE_SIGNAL_LABELS.filter(({ key }) => summary.stressFlags[key])
    .map((item) => item.label)
    .slice(0, 3);

  if (summary.overnightRead.label !== "Normal night") {
    activeSignals.unshift(
      summary.lateNightDisruption.likelyLane === "illness_like"
        ? "Possible illness-like pattern"
        : "Late-night disruption",
    );
  }

  return {
    header: {
      productName: "Health OS",
      dateLabel: formatDate(summary.date),
      utilityLabel: getUtilityStatusLabel(whoop, hevy, delivery),
      freshnessNotice: buildFreshnessNotice(summary),
    },
    hero: {
      decision: {
        train: summary.physiqueDecision.trainingTarget,
        intensity: summary.physiqueDecision.intensityLabel,
        intensityIntent: summary.physiqueDecision.trainingIntent,
        intensityIntentLabel:
          summary.physiqueDecision.trainingIntent === "Push"
            ? "Progress"
            : summary.physiqueDecision.trainingIntent,
        calories:
          summary.physiqueDecision.calorieRecommendation === "set target"
            ? summary.physiqueDecision.calorieTargetLabel
            : `${summary.physiqueDecision.calorieTargetLabel} / ${summary.physiqueDecision.calorieRecommendation}`,
        protein: summary.physiqueDecision.proteinTargetLabel,
        intake:
          summary.nutritionActuals.hasLoggedIntake
            ? `${summary.nutritionActuals.calories}/${summary.nutritionActuals.calorieTarget ?? "--"} cal`
            : "Log first meal",
        remaining:
          summary.nutritionActuals.hasLoggedIntake
            ? `${summary.nutritionActuals.remainingCalories ?? "--"} cal / ${summary.nutritionActuals.remainingProteinG ?? "--"}g protein`
            : "No meals logged",
        bottleneck: summary.physiqueDecision.mainBottleneck,
        targetReason: summary.physiqueDecision.trainingTargetReason,
        sessionAnchors: summary.physiqueDecision.sessionAnchors,
        sessionAnchorsLabel:
          summary.physiqueDecision.sessionAnchors.length > 0
            ? summary.physiqueDecision.sessionAnchors.slice(0, 3).join(" / ")
            : "Use planned main lifts",
      },
      overnightRead: {
        label: summary.overnightRead.label,
        detail: summary.overnightRead.detail,
      },
      metrics: [
        {
          label: "Recovery",
          value: formatPercent(summary.readiness.recoveryScore),
          detail: "WHOOP recovery score",
          trend: sanitizeTrend(summary.miniTrends.recovery3d),
          trendLabels: recentDateLabels,
          gaugeValue: summary.readiness.recoveryScore,
        },
        {
          label: "Sleep",
          value: formatHours(summary.readiness.sleepHours),
          detail: summary.readiness.sleepVsNeedHours === null
            ? "Actual sleep"
            : `${summary.readiness.sleepVsNeedHours.toFixed(1)}h vs need`,
          trend: sanitizeTrend(summary.miniTrends.sleep3d),
          trendLabels: recentDateLabels,
          sleepWindow: {
            startLabel: formatClockTime(summary.readiness.latestSleepStart),
            endLabel: formatClockTime(summary.readiness.latestSleepEnd),
          },
        },
        {
          label: "Strain",
          value:
            summary.strainSummary.score === null
              ? "--"
              : summary.strainSummary.score.toFixed(1),
          detail: "Current day strain",
          trend: sanitizeTrend(summary.miniTrends.strain3d),
          trendLabels: recentDateLabels,
        },
      ],
      focusLabel:
        summary.trainingLoad.weeklyMuscleFocus.length > 0
          ? summary.trainingLoad.weeklyMuscleFocus
              .slice(0, 4)
              .map((item) => `${item.label} ${item.hits}x`)
              .join(" / ")
          : "No recent lifting context",
      workoutLabel: summary.bodyCard.latestWorkoutName ?? "No workout logged",
      latestSessionAgeLabel: formatLatestSessionAge(
        summary.trainingLoad.hevyLastWorkoutAt,
        summary.date,
      ),
      readinessQualifier: buildReadinessQualifier(summary),
      weeklyFocus: summary.trainingLoad.weeklyMuscleVolume.length
        ? summary.trainingLoad.weeklyMuscleVolume.slice(0, 12)
        : summary.trainingLoad.weeklyMuscleFocus.slice(0, 12).map((item) => ({
            ...item,
            effectiveSets: item.hits,
          })),
      weeklyMapNote: hasWeeklyTraining
        ? null
        : hasLatestCarryover
          ? "Weekly map resets on Monday. Outline shows your latest weekend session."
          : "Weekly training map will populate after the first logged session.",
      weeklyFocusEmptyMessage: "No lifts logged yet this week",
      todayCall:
        summary.physiqueDecision.trainingTarget === "Either"
          ? "Upper or lower"
          : `${summary.physiqueDecision.trainingTarget} day`,
    },
    actionCards: summary.recommendations.slice(0, 3),
    contextBand: {
      whyChanged: summary.whyChangedToday.deltas.slice(0, 3),
      activeSignals: activeSignals.slice(0, 4),
    },
    trendBand: [
      {
        label: "Weight trend",
        value:
          summary.physiqueDecision.weightTrend.currentLb === null
            ? "--"
            : formatPoundsValue(summary.physiqueDecision.weightTrend.currentLb),
        detail:
          summary.physiqueDecision.weightTrend.average7dLb === null
            ? "7-day average unavailable"
            : `${formatPoundsValue(summary.physiqueDecision.weightTrend.average7dLb)} avg / ${summary.physiqueDecision.weightTrend.weeklyDeltaLb && summary.physiqueDecision.weightTrend.weeklyDeltaLb > 0 ? "+" : ""}${summary.physiqueDecision.weightTrend.weeklyDeltaLb?.toFixed(1) ?? "--"} lb`,
      },
      {
        label: "Weekly score",
        value: `${summary.trainingLoad.hevyWorkoutCountThisWeek} lifts`,
        detail: `${summary.trainingLoad.hevySetCountThisWeek} sets Mon-Sun / ${summary.physiqueDecision.calorieRecommendation}`,
      },
      {
        label: "Strength signal",
        value:
          summary.physiqueDecision.strengthProgression[0]?.deltaLabel ??
          "Needs repeats",
        detail:
          summary.physiqueDecision.strengthProgression[0]
            ? `${summary.physiqueDecision.strengthProgression[0].exercise} / ${summary.physiqueDecision.strengthProgression[0].confidenceLabel}`
            : "Auto-detecting repeat lifts",
      },
      {
        label: "Nutrition",
        value: summary.nutritionActuals.hasLoggedIntake
          ? `${summary.nutritionActuals.calories} cal`
          : "Log meals",
        detail: summary.nutritionActuals.hasLoggedIntake
          ? `${formatMacroGrams(summary.nutritionActuals.proteinG)} protein / ${summary.nutritionActuals.remainingCalories ?? "--"} cal left`
          : `${summary.physiqueDecision.calorieTargetLabel} / ${summary.physiqueDecision.proteinTargetLabel} target`,
      },
    ],
    scorecard: summary.physiqueDecision.weeklyScorecard,
    strengthProgression: summary.physiqueDecision.strengthProgression,
  };
}
