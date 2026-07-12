import type { DailySummary, TrendPoint } from "@/lib/insights/types";
import { formatPounds, kilogramsToPounds } from "@/lib/units";

export const LLM_QUESTION_PLACEHOLDER = "[Add your goal, constraint, or follow-up question here.]";

function metric(value: number | null, unit = "", digits = 1) {
  return value === null ? "Not available" : `${value.toFixed(digits)}${unit}`;
}

function trend(points: TrendPoint[], unit = "", digits = 1) {
  return points.map((point) => `${point.label} ${point.value === null ? "--" : `${point.value.toFixed(digits)}${unit}`}`).join(" / ");
}

function freshness(summary: DailySummary) {
  const source = (name: string, item: DailySummary["freshness"]["whoop"]) =>
    `${name} ${item.connected ? item.isStale ? "connected, stale" : "connected" : "disconnected"}${item.lastSyncCompletedAt ? `; last sync ${item.lastSyncCompletedAt}` : ""}`;
  return `${source("WHOOP", summary.freshness.whoop)} / ${source("Hevy", summary.freshness.hevy)}`;
}

function sleepComposition(summary: DailySummary) {
  const stages = summary.readiness.sleepStageSummary;
  if (!stages) return "Not available";
  return `deep ${metric(stages.deepHours, "h")} / REM ${metric(stages.remHours, "h")} / light ${metric(stages.lightHours, "h")} / awake ${metric(stages.awakeHours, "h")}`;
}

function recommendationLines(summary: DailySummary) {
  const visible = summary.recommendations.filter((item) => ["training", "recovery", "caution"].includes(item.category)).slice(0, 3);
  return visible.length ? visible.flatMap((item) => [
    `- ${item.category}: ${item.title}`,
    `  Reason: ${item.why}`,
    `  Evidence: ${item.supportingMetrics.join("; ") || "Not available"}`,
  ]) : ["- No app recommendation available."];
}

function recentWorkoutLines(summary: DailySummary) {
  const workouts = summary.trainingLoad.recentWorkoutDetails?.slice(0, 3) ?? [];
  if (!workouts.length) return ["- No recent workout details available."];
  return workouts.flatMap((workout) => [
    `- ${workout.startedAt}: ${workout.title}; ${workout.setCount} sets; ${workout.durationMinutes ?? "--"} min; ${workout.volumeKg ?? "--"} kg`,
    ...workout.exercises.slice(0, 5).map((exercise) => `  - ${exercise.title}: ${exercise.setSummary}${exercise.topSetLabel ? `; top ${exercise.topSetLabel}` : ""}`),
  ]);
}

export function buildLlmContextPacket(summary: DailySummary) {
  const weight = formatPounds(kilogramsToPounds(summary.readiness.bodyWeightKg));
  const lines = [
    "HealthMaxer training and recovery context",
    "",
    "Instructions for the external LLM",
    "- Use the observations below and the user's question; do not invent missing values.",
    "- Expand the minimal app recommendation only when supported by the evidence.",
    "- If asked for nutrition targets or general advice, calculate them independently and state assumptions; ask for missing age, height, goals, or constraints when required.",
    "- Distinguish observation from inference and avoid diagnosing illness.",
    "",
    "Snapshot and freshness",
    `- Snapshot: ${summary.physiologicalDate} (generated ${summary.date})`,
    `- Sources: ${freshness(summary)}`,
    `- Historical context: ${summary.historicalContext?.qualifier ?? "Not available"}`,
    "",
    "Current physiology and recovery",
    `- Recovery: ${metric(summary.readiness.recoveryScore, "%", 0)}`,
    `- Sleep: ${metric(summary.readiness.sleepHours, "h")} (${metric(summary.readiness.sleepVsNeedHours, "h")} vs need)` ,
    `- Sleep performance / consistency / efficiency: ${metric(summary.readiness.sleepPerformance, "%", 0)} / ${metric(summary.readiness.sleepConsistency, "%", 0)} / ${metric(summary.readiness.sleepEfficiency, "%", 0)}`,
    `- Sleep composition: ${sleepComposition(summary)}`,
    `- Day strain: ${metric(summary.strainSummary.score)}; ${summary.strainSummary.blurb}`,
    `- HRV: ${metric(summary.readiness.hrvRmssd, " ms")} (${metric(summary.readiness.hrvVs7d, " ms")} vs 7d)` ,
    `- Resting HR: ${metric(summary.readiness.restingHeartRate, " bpm", 0)} (${metric(summary.readiness.restingHeartRateVs7d, " bpm")} vs 7d)` ,
    `- Respiratory rate / delta: ${metric(summary.readiness.respiratoryRate, " rpm")} / ${metric(summary.readiness.respiratoryRateVs7d, " rpm")}`,
    `- Skin temperature delta: ${metric(summary.readiness.skinTempVs7d, " C")}`,
    `- Overnight read: ${summary.overnightRead.label}. ${summary.overnightRead.detail}`,
    "",
    "Seven-day trends",
    `- Recovery: ${trend(summary.trendSeries.recovery7d, "%", 0)}`,
    `- Sleep: ${trend(summary.trendSeries.sleep7d, "h")}`,
    `- Strain: ${trend(summary.trendSeries.strain7d)}`,
    `- Lifting sets: ${trend(summary.trendSeries.load7d, "", 0)}`,
    `- Body weight: ${weight}; ${summary.physiqueDecision.weightTrend.average7dLb === null ? "7d average unavailable" : `${summary.physiqueDecision.weightTrend.average7dLb.toFixed(1)} lb 7d average`}`,
    "",
    "Training status",
    `- Availability / target / intent: ${summary.physiqueDecision.trainingAvailability} / ${summary.physiqueDecision.trainingTarget} / ${summary.physiqueDecision.trainingIntent}`,
    `- Decision reason: ${summary.physiqueDecision.primaryDecisionReason}`,
    `- Weekly pace: ${summary.physiqueDecision.weeklyPaceLabel}; ${summary.physiqueDecision.liftsNeededForGoal} lifts remaining; ${summary.physiqueDecision.daysLeftInWeek} days left`,
    `- Rolling 7d: ${summary.trainingLoad.hevyWorkoutCount7d} workouts / ${summary.trainingLoad.hevySetCount7d} sets / ${summary.trainingLoad.hevyVolume7d} kg`,
    `- This week: ${summary.trainingLoad.hevyWorkoutCountThisWeek} workouts / ${summary.trainingLoad.hevySetCountThisWeek} sets`,
    `- Split recency: upper ${summary.trainingLoad.upperBodyDaysSince ?? "--"}d / lower ${summary.trainingLoad.lowerBodyDaysSince ?? "--"}d / push ${summary.trainingLoad.pushDaysSince ?? "--"}d / pull ${summary.trainingLoad.pullDaysSince ?? "--"}d`,
    `- Weekly muscle volume: ${summary.trainingLoad.weeklyMuscleVolume.slice(0, 8).map((item) => `${item.label} ${item.effectiveSets} sets (${item.hits}x)`).join(" / ") || "Not available"}`,
    "",
    "Recent workouts",
    ...recentWorkoutLines(summary),
    "",
    "Activity context",
    `- ${summary.activityContext.displayWindowLabel}: ${summary.activityContext.summaryLine}`,
    `- Latest: ${summary.activityContext.latestSession ? `${summary.activityContext.latestSession.sportName}, ${summary.activityContext.latestSession.durationMinutes} min, strain ${summary.activityContext.latestSession.strain ?? "--"}` : "Not available"}`,
    `- Total: ${summary.activityContext.totalSessions} sessions / ${summary.activityContext.totalDurationMinutes} min / strain ${summary.activityContext.totalStrain.toFixed(1)}`,
    "",
    "Minimal app recommendation",
    ...recommendationLines(summary),
    "",
    "User question",
    LLM_QUESTION_PLACEHOLDER,
  ];
  const contextPacketText = lines.join("\n");
  return { contextPacketText, promptText: contextPacketText };
}
