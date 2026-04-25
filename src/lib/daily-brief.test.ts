import assert from "node:assert/strict";
import test from "node:test";

import { buildDiscordSummaryText, buildLlmHandoff } from "@/lib/daily-brief";
import type { DailySummary } from "@/lib/insights/types";

const summary: DailySummary = {
  date: "2026-04-04T12:00:00.000Z",
  contextLine: "Sleep and recovery improved while upper-body fatigue is still lingering.",
  miniTrends: {
    recovery3d: [54, 61, 71],
    strain3d: [11.2, 8.1, 9.2],
    sleep3d: [7.1, 7.4, 7.5],
    weightTrend: [161.4, 161.8, 162],
    liftsThisWeek: 4,
  },
  readiness: {
    recoveryScore: 71,
    recoveryTrend3d: 62,
    bodyWeightKg: 73.5,
    bodyWeightDelta7dKg: 0.1,
    bodyWeightDelta28dKg: 0.2,
    whoopDayStrain: 9.2,
    whoopDayStrainVs7d: -0.8,
    sleepPerformance: 86,
    sleepHours: 7.5,
    sleepVsNeedHours: -0.6,
    sleepConsistency: 82,
    sleepEfficiency: 90,
    awakeHours: 0.8,
    latestSleepStart: "2026-04-04T03:00:00.000Z",
    latestSleepEnd: "2026-04-04T10:30:00.000Z",
    restingHeartRate: 49,
    restingHeartRateVs7d: 1.2,
    hrvRmssd: 78,
    hrvVs7d: 3.1,
    respiratoryRate: 14.2,
    respiratoryRateVs7d: 0.2,
    skinTempCelsius: 36.8,
    skinTempVs7d: 0.1,
    whoopStrain7dAvg: 10,
  },
  trainingLoad: {
    hevyVolume7d: 39247,
    hevyVolume28dAvg: 13000,
    hevySetCount7d: 54,
    hevyWorkoutCount7d: 4,
    hevySetCountThisWeek: 54,
    hevyWorkoutCountThisWeek: 4,
    hevyConsecutiveDays: 2,
    hevyLastWorkoutTitle: "UPPER B: Chest/Arms",
    hevyLastWorkoutAt: "2026-04-03T10:00:00.000Z",
    hevyLastWorkoutVolumeKg: 8340,
    hevyLastWorkoutDurationSeconds: 2700,
    recentLoadSpike: false,
    upperBodyDaysSince: 1,
    lowerBodyDaysSince: 2,
    pushDaysSince: 1,
    pullDaysSince: 1,
    muscleFocus: ["chest", "biceps", "triceps"],
    upperSessionAnchors: ["Chest Press", "Seated Row", "Triceps Pushdown"],
    lowerSessionAnchors: ["Single Leg Press", "Seated Leg Curl", "Leg Extension"],
    weeklyMuscleFocus: [
      { label: "Chest", hits: 2 },
      { label: "Front delts", hits: 2 },
      { label: "Biceps", hits: 2 },
      { label: "Triceps", hits: 2 },
      { label: "Lats", hits: 1 },
    ],
    weeklyMuscleVolume: [
      { label: "Chest", effectiveSets: 10, hits: 2 },
      { label: "Front delts", effectiveSets: 8, hits: 2 },
      { label: "Biceps", effectiveSets: 6, hits: 2 },
      { label: "Triceps", effectiveSets: 6, hits: 2 },
      { label: "Lats", effectiveSets: 5, hits: 1 },
    ],
    latestWorkoutFocus: ["Chest", "Front delts", "Biceps", "Triceps"],
  },
  stressFlags: {
    illnessRisk: false,
    poorSleepTrend: false,
    lowRecovery: false,
    elevatedRestingHeartRate: false,
    suppressedHrv: false,
    elevatedRespiratoryRate: false,
    elevatedSkinTemp: false,
    highTrainingLoad: true,
    localFatigueUpper: true,
    localFatigueLower: false,
  },
  lateNightDisruption: {
    active: false,
    severity: "low",
    confidence: "low",
    likelyLane: "normal",
    headline: "Normal night",
    blurb: "Overnight sleep and recovery do not show a strong disruption pattern.",
    supportingMetrics: [],
  },
  overnightRead: {
    label: "Normal night",
    tone: "normal",
    detail: "Sleep and recovery stayed close to baseline overnight",
    lane: "normal",
  },
  strainSummary: {
    score: 9.2,
    blurb: "Most of today's logged strain appears to come from walking.",
    supportingPoints: ["Walking is the biggest logged WHOOP activity so far at strain 7.7."],
  },
  nutritionTargets: {
    calorieTarget: 2500,
    proteinTargetG: 150,
    effectiveCalorieTarget: 2500,
    effectiveProteinTargetG: 150,
    smartCalorieTarget: 2450,
    smartProteinTargetG: 160,
    targetSource: "manual",
    smartReason: "Based on 162.0 lb, 4 lifts, 54 sets, and weight trend is controlled.",
    updatedAt: "2026-04-04T11:00:00.000Z",
  },
  nutritionActuals: {
    dateKey: "2026-04-04",
    calories: 1780,
    proteinG: 112,
    carbsG: 185,
    fatG: 58,
    remainingCalories: 720,
    remainingProteinG: 38,
    calorieTarget: 2500,
    proteinTargetG: 150,
    hasLoggedIntake: true,
    entries: [
      {
        id: 1,
        mealType: "restaurant",
        label: "Rice bowl",
        calories: 780,
        proteinG: 48,
        carbsG: 92,
        fatG: 22,
        note: null,
        loggedAt: "2026-04-04T18:00:00.000Z",
      },
    ],
  },
  physiqueDecision: {
    trainingTarget: "Lower",
    trainingTargetReason: "Lower is due based on split recency: upper 1d, lower 2d.",
    trainingIntent: "Maintain",
    intensityLabel: "Keep normal volume, no forced PRs",
    sessionAnchors: ["Single Leg Press", "Seated Leg Curl", "Leg Extension"],
    calorieRecommendation: "maintain",
    calorieTargetLabel: "2500 cal",
    proteinTargetLabel: "150g",
    mainBottleneck: "Consistency is the main lever: hit volume, protein, and a stable calorie target.",
    weightTrend: {
      currentLb: 162,
      average7dLb: 161.8,
      weeklyDeltaLb: 0.2,
    },
    strengthProgression: [
      {
        exercise: "Chest Press",
        latestValue: 112,
        previousValue: 108,
        delta: 4,
        latestLabel: "112 est",
        previousLabel: "108 prev",
        deltaLabel: "+4.0 lb",
        trend: "up",
        confidence: "medium",
        confidenceLabel: "estimated",
      },
    ],
    weeklyScorecard: [
      { label: "Lifts", value: "4/4", detail: "54 sets Mon-Sun", status: "good" },
      { label: "Weight trend", value: "+0.2 lb", detail: "161.8 lb 7d avg", status: "good" },
      { label: "Strength", value: "+4.0 lb", detail: "Chest Press", status: "good" },
      { label: "Nutrition", value: "112/150g", detail: "1780/2500 cal", status: "good" },
    ],
  },
  activityContext: {
    displayWindowLabel: "Last week",
    currentWeekHasActivity: false,
    fallbackUsed: true,
    hasActivity: true,
    summaryLine: "No walks or tennis logged yet this week. Last week had 5 walks and 1 tennis session.",
    interpretation:
      "Last week shows tennis as meaningful conditioning load; it can matter when recovery is low even though it does not count as lifting volume.",
    latestSession: {
      id: "tennis-1",
      kind: "tennis",
      sportName: "Tennis",
      start: "2026-03-29T18:00:00.000Z",
      end: "2026-03-29T18:57:00.000Z",
      durationMinutes: 57,
      strain: 8.6,
      averageHeartRate: 120,
      maxHeartRate: 146,
      distanceMeter: null,
    },
    buckets: [
      { kind: "walking", label: "Walking", count: 5, durationMinutes: 132, strain: 25.2, distanceMeter: null },
      { kind: "tennis", label: "Tennis", count: 1, durationMinutes: 57, strain: 8.6, distanceMeter: null },
    ],
    days: [],
    totalSessions: 6,
    totalDurationMinutes: 189,
    totalStrain: 33.8,
    totalDistanceMeter: null,
  },
  bodyCard: {
    recoveryScore: 71,
    sleepHours: 7.5,
    weightLb: 162,
    latestWorkoutName: "UPPER B: Chest/Arms",
    highlightedRegions: [],
    weeklyHighlightedRegions: [],
    latestWorkoutOverlayRegions: [],
    displayRegions: [],
  },
  recommendations: [
    {
      category: "training",
      title: "Keep intensity moderate",
      priority: "high",
      confidence: "high",
      action: "Train upper body or technique work, but skip a second high-fatigue push.",
      actionBullets: [
        "Train upper body or technique work",
        "Skip a second high-fatigue push",
      ],
      primaryActions: [
        { label: "Technique", icon: "technique" },
        { label: "Upper body", icon: "fuel" },
      ],
      conditionalActions: undefined,
      why: "Upper-body fatigue is still elevated from the last session.",
      supportingMetrics: ["Upper-body fatigue", "4 lifts this week"],
    },
    {
      category: "nutrition",
      title: "Bias carbs around training",
      priority: "medium",
      confidence: "medium",
      action: "Keep protein steady and put more carbs near your workout window today.",
      actionBullets: [
        "Keep protein steady",
        "Put more carbs near your workout window",
      ],
      primaryActions: [
        { label: "Protein", icon: "protein" },
        { label: "Carbs", icon: "carbs" },
      ],
      conditionalActions: undefined,
      why: "Recovery is good enough to support training if fuel is there.",
      supportingMetrics: ["Recovery 71%", "Sleep 7.5h"],
    },
    {
      category: "recovery",
      title: "Protect tonight's sleep",
      priority: "medium",
      confidence: "medium",
      action: "Keep the evening calm and give yourself enough time in bed to close the sleep gap.",
      actionBullets: [
        "Keep the evening calm",
        "Give yourself enough time in bed to close the sleep gap",
      ],
      primaryActions: [
        { label: "Downshift", icon: "stress" },
        { label: "Protect sleep", icon: "sleep" },
      ],
      conditionalActions: undefined,
      why: "You are still slightly below WHOOP sleep need.",
      supportingMetrics: ["Sleep vs need -0.6h"],
    },
    {
      category: "caution",
      title: "Upper-body fatigue still matters",
      priority: "medium",
      confidence: "medium",
      action: "Avoid piling more pressing volume onto the same muscle groups today.",
      actionBullets: [
        "Avoid piling more pressing volume onto the same muscle groups",
      ],
      primaryActions: [
        { label: "Back off load", icon: "rest" },
      ],
      conditionalActions: undefined,
      why: "Recent upper-body load is still the main limiter.",
      supportingMetrics: ["Upper-body fatigue"],
    },
  ],
  freshness: {
    whoop: {
      connected: true,
      isStale: false,
      lastSyncCompletedAt: "2026-04-04T11:00:00.000Z",
    },
    hevy: {
      connected: true,
      isStale: false,
      lastSyncCompletedAt: "2026-04-04T11:00:00.000Z",
    },
  },
  whyChangedToday: {
    headline: "Recovery improved, but upper-body fatigue and weekly load still shape the day.",
    deltas: ["Recovery improved, but upper-body fatigue and weekly load still shape the day."],
  },
  llmPromptText: "Prompt text",
};

test("buildDiscordSummaryText stays metrics-led for fresh LLM judgment", () => {
  const text = buildDiscordSummaryText(summary);

  assert.match(text, /Daily Health Brief/);
  assert.match(text, /Recovery 71%/);
  assert.match(text, /Overnight read: Normal night/);
  assert.match(text, /Weekly muscle focus: Chest 2x, Front delts 2x, Biceps 2x, Triceps 2x/);
  assert.match(text, /Activity context \(Last week\): No walks or tennis logged yet this week/);
  assert.match(text, /Nutrition: 1780\/2500 cal \| 112\/150g protein/);
  assert.match(text, /Body weight: 162\.0 lb \| stable versus last week/);
  assert.match(text, /Latest session:/);
  assert.match(text, /Prompt:/);
  assert.doesNotMatch(text, /\*\*Train:\*\*/);
  assert.doesNotMatch(text, /\*\*Eat:\*\*/);
  assert.doesNotMatch(text, /\*\*Recover:\*\*/);
  assert.doesNotMatch(text, /39247/);
});

test("buildLlmHandoff prompt asks the model to infer priorities from metrics", () => {
  const handoff = buildLlmHandoff(summary);

  assert.match(handoff.promptText, /Rules/);
  assert.match(handoff.promptText, /Do not mirror any app-generated action cards/);
  assert.match(handoff.promptText, /Infer fresh priorities from the data/);
  assert.match(handoff.promptText, /Overnight read: Normal night/);
  assert.match(handoff.promptText, /Weekly muscle groups hit: Chest 2x, Front delts 2x, Biceps 2x, Triceps 2x, Lats 1x/);
  assert.match(handoff.promptText, /Intake logged today: 1780\/2500 cal, 112\/150g protein/);
  assert.match(handoff.promptText, /Activity context \(Last week\): No walks or tennis logged yet this week/);
  assert.match(handoff.promptText, /Latest non-lifting activity: Tennis: 57 min \/ strain 8\.6/);
  assert.match(handoff.promptText, /Body weight context: stable versus last week/);
  assert.match(handoff.promptText, /Latest workout muscle groups: Chest, Front delts, Biceps, Triceps/);
  assert.match(handoff.promptText, /Output/);
  assert.match(handoff.promptText, /For each section, give:/);
  assert.doesNotMatch(handoff.promptText, /Keep intensity moderate/);
  assert.doesNotMatch(handoff.promptText, /Protect tonight's sleep/);
});
