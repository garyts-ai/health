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
    sleepStageSummary: {
      inBedHours: 8.3,
      awakeHours: 0.8,
      lightHours: 4.1,
      deepHours: 1.3,
      remHours: 2.1,
    },
    restingHeartRate: 49,
    restingHeartRateVs7d: 1.2,
    hrvRmssd: 78,
    hrvVs7d: 3.1,
    spo2Percentage: 96.2,
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
    recentWorkoutDetails: [
      {
        id: "hevy-1",
        title: "UPPER B: Chest/Arms",
        startedAt: "2026-04-03T10:00:00.000Z",
        durationMinutes: 45,
        volumeKg: 8340,
        setCount: 18,
        exerciseCount: 5,
        exercises: [
          {
            title: "Chest Press",
            setCount: 4,
            workingSetCount: 3,
            topSetLabel: "180 lb x 8 reps",
            setSummary: "160 lb x 10 reps; 170 lb x 9 reps; 180 lb x 8 reps",
          },
          {
            title: "Triceps Pushdown",
            setCount: 3,
            workingSetCount: 3,
            topSetLabel: "80 lb x 12 reps",
            setSummary: "70 lb x 12 reps; 75 lb x 12 reps; 80 lb x 12 reps",
          },
        ],
      },
    ],
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
    campaign: {
      active: false,
      name: "Cancun wedding cut",
      phase: "inactive",
      endDate: "2026-07-17",
      daysRemaining: 0,
      proteinTargetG: 160,
      proteinMinimumG: 140,
      averageCalorieTarget: null,
      trainingDayCalorieTarget: null,
      restDayCalorieTarget: null,
      dayType: "rest",
      qualifiedLossRateLbPerWeek: null,
      currentAverageWeightLb: null,
      previousAverageWeightLb: null,
      currentWindowCount: 0,
      previousWindowCount: 0,
      goalRangeStableDays: 0,
      calorieAdjustment: 0,
      evidence: "",
      plateauCue: null,
      finalWeek: false,
    },
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
    trainingAvailability: "Train",
    trainingTarget: "Lower",
    nextTrainingTarget: "Lower",
    trainingTargetReason: "Lower is due based on split recency: upper 1d, lower 2d.",
    trainingIntent: "Maintain",
    intensityLabel: "Keep normal volume, no forced PRs",
    sessionAnchors: ["Single Leg Press", "Seated Leg Curl", "Leg Extension"],
    calorieRecommendation: "maintain",
    calorieTargetLabel: "2500 cal",
    proteinTargetLabel: "150g",
    mainBottleneck: "Consistency is the main lever: hit volume, protein, and a stable calorie target.",
    primaryDecisionReason: "Train lower if you want the session today, but there is no need to force a PR.",
    daysLeftInWeek: 3,
    liftsNeededForGoal: 0,
    canStillHitWeeklyGoalIfRestToday: true,
    weeklyPaceLabel: "Weekly lift target already met",
    decisionFactors: [
      {
        label: "Schedule flexible",
        tone: "positive",
        detail: "Weekly lift target already met",
      },
      {
        label: "Split recency",
        tone: "neutral",
        detail: "Upper 1d / Lower 2d",
      },
    ],
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
  historicalContext: {
    available: true,
    importAgeTier: "current",
    coverageEnd: "2026-06-24T00:00:00.000Z",
    confidence: "high",
    qualifier: "Recent recovery is above personal baseline.",
    strongestDeviation: "HRV above baseline",
    behaviorCue: "Hydration and consistent sleep timing correlate with better recovery.",
  },
  weeklyPlan: {
    weekStart: "2026-03-30",
    weekEnd: "2026-04-05",
    targetLifts: 4,
    completedLifts: 4,
    days: [
      {
        date: "2026-03-30",
        label: "Mon",
        state: "completed",
        workoutType: "Upper",
        intent: "Maintain",
        anchors: ["Chest Press", "Seated Row"],
        calorieTarget: 2500,
        proteinTargetG: 150,
        recoveryPriority: "Normal recovery routine",
        rationale: "UPPER A completed",
        guardrail: null,
        actualWorkout: "UPPER A",
      },
      {
        date: "2026-04-04",
        label: "Sat",
        state: "today",
        workoutType: "Lower",
        intent: "Maintain",
        anchors: ["Single Leg Press", "Seated Leg Curl"],
        calorieTarget: 2500,
        proteinTargetG: 150,
        recoveryPriority: "Normal recovery routine",
        rationale: "Today mirrors the live decision.",
        guardrail: "Back off if warm-up or live recovery confirms fatigue.",
        actualWorkout: null,
      },
    ],
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
  assert.match(text, /Data packet:/);
  assert.doesNotMatch(text, /\*\*Train:\*\*/);
  assert.doesNotMatch(text, /\*\*Eat:\*\*/);
  assert.doesNotMatch(text, /\*\*Recover:\*\*/);
  assert.doesNotMatch(text, /39247/);
});

test("buildLlmHandoff returns a neutral data context packet", () => {
  const handoff = buildLlmHandoff(summary);

  assert.equal(handoff.copyLabel, "Copy data packet");
  assert.equal(handoff.promptText, handoff.contextPacketText);
  assert.match(handoff.promptText, /HealthMax LLM context packet/);
  assert.match(handoff.promptText, /Gary will ask a separate question alongside this packet/);
  assert.match(handoff.promptText, /HealthMax deterministic output/);
  assert.match(handoff.promptText, /Source freshness and coverage/);
  assert.match(handoff.promptText, /Current recovery, strain, and physiology/);
  assert.match(handoff.promptText, /Sleep detail/);
  assert.match(handoff.promptText, /Recent trends/);
  assert.match(handoff.promptText, /Lifting summary/);
  assert.match(handoff.promptText, /Recent lift details/);
  assert.match(handoff.promptText, /Weekly plan data/);
  assert.match(handoff.promptText, /Nutrition/);
  assert.match(handoff.promptText, /Activity/);
  assert.match(handoff.promptText, /Overnight read: Normal night/);
  assert.match(handoff.promptText, /Weekly muscle groups hit: Chest 2x, Front delts 2x, Biceps 2x, Triceps 2x, Lats 1x/);
  assert.match(handoff.promptText, /Weekly effective sets: Chest 10 effective sets \/ 2x/);
  assert.match(handoff.promptText, /Weekly scorecard: Lifts: 4\/4 - 54 sets Mon-Sun/);
  assert.match(handoff.promptText, /Intake logged today: 1780\/2500 cal, 112\/150g protein/);
  assert.match(handoff.promptText, /Activity context \(Last week\): No walks or tennis logged yet this week/);
  assert.match(handoff.promptText, /Latest non-lifting activity: Tennis: 57 min \/ strain 8\.6/);
  assert.match(handoff.promptText, /Body weight context: stable versus last week/);
  assert.match(handoff.promptText, /Latest workout muscle groups: Chest, Front delts, Biceps, Triceps/);
  assert.match(handoff.promptText, /Source freshness: WHOOP: connected, fresh/);
  assert.match(handoff.promptText, /Historical WHOOP context: coverage end/);
  assert.match(handoff.promptText, /Workout 1: UPPER B: Chest\/Arms/);
  assert.match(handoff.promptText, /Chest Press: 3\/4 working sets; top 180 lb x 8 reps/);
  assert.match(handoff.promptText, /Blood oxygen SpO2: 96\.2%/);
  assert.match(handoff.promptText, /Sat 2026-04-04: today; Lower; intent Maintain/);
  assert.doesNotMatch(handoff.promptText, /My goal or follow-up question/);
  assert.doesNotMatch(handoff.promptText, /What I need from you/);
  assert.doesNotMatch(handoff.promptText, /Coaching rules/);
  assert.doesNotMatch(handoff.promptText, /Output format/);
  assert.doesNotMatch(handoff.promptText, /Action items/);
  assert.doesNotMatch(handoff.promptText, /Next-week game plan/);
  assert.doesNotMatch(handoff.promptText, /For every recommendation/);
  assert.doesNotMatch(handoff.promptText, /Ask clarifying questions/);
  assert.doesNotMatch(handoff.promptText, /Keep intensity moderate/);
  assert.doesNotMatch(handoff.promptText, /Protect tonight's sleep/);
});

test("buildLlmHandoff prompt labels missing data clearly", () => {
  const sparseSummary: DailySummary = structuredClone(summary);
  sparseSummary.readiness.recoveryScore = null;
  sparseSummary.readiness.sleepHours = null;
  sparseSummary.readiness.sleepStageSummary = null;
  sparseSummary.trainingLoad.weeklyMuscleFocus = [];
  sparseSummary.trainingLoad.weeklyMuscleVolume = [];
  sparseSummary.trainingLoad.latestWorkoutFocus = [];
  sparseSummary.physiqueDecision.strengthProgression = [];
  sparseSummary.nutritionActuals.hasLoggedIntake = false;
  sparseSummary.nutritionActuals.remainingCalories = null;
  sparseSummary.nutritionActuals.remainingProteinG = null;

  const handoff = buildLlmHandoff(sparseSummary);

  assert.match(handoff.promptText, /Recovery score: Not available/);
  assert.match(handoff.promptText, /Actual sleep: Not available/);
  assert.match(handoff.promptText, /Sleep composition: Not available/);
  assert.match(handoff.promptText, /Intake logged today: No meals logged yet/);
  assert.match(handoff.promptText, /calories remaining not available/);
  assert.match(handoff.promptText, /Weekly muscle groups hit: No current-week lifting exposure logged/);
  assert.match(handoff.promptText, /Weekly effective sets: No current-week lifting volume/);
  assert.match(handoff.promptText, /Strength progression: Not enough repeat lift history/);
  assert.match(handoff.promptText, /Latest workout muscle groups: Not available/);
});
