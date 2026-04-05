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
    weeklyMuscleFocus: [
      { label: "Chest", hits: 2 },
      { label: "Shoulders", hits: 2 },
      { label: "Biceps", hits: 2 },
      { label: "Triceps", hits: 2 },
      { label: "Back", hits: 1 },
    ],
    latestWorkoutFocus: ["Chest", "Shoulders", "Biceps", "Triceps"],
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
  bodyCard: {
    recoveryScore: 71,
    sleepHours: 7.5,
    weightLb: 162,
    latestWorkoutName: "UPPER B: Chest/Arms",
    highlightedRegions: [],
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
  assert.match(text, /Weekly muscle focus: Chest 2x, Shoulders 2x, Biceps 2x, Triceps 2x/);
  assert.match(text, /Weight 162\.0 lb \| stable versus last week/);
  assert.match(text, /Latest lift:/);
  assert.match(text, /\*\*Ask the LLM:\*\*/);
  assert.doesNotMatch(text, /\*\*Train:\*\*/);
  assert.doesNotMatch(text, /\*\*Eat:\*\*/);
  assert.doesNotMatch(text, /\*\*Recover:\*\*/);
  assert.doesNotMatch(text, /39247/);
});

test("buildLlmHandoff prompt asks the model to infer priorities from metrics", () => {
  const handoff = buildLlmHandoff(summary);

  assert.match(handoff.promptText, /Use the metrics below to infer today's priorities/);
  assert.match(handoff.promptText, /Do not mirror any app-generated action cards/);
  assert.match(handoff.promptText, /Overnight read: Normal night/);
  assert.match(handoff.promptText, /Weekly muscle groups hit: Chest 2x, Shoulders 2x, Biceps 2x, Triceps 2x, Back 1x/);
  assert.match(handoff.promptText, /Body weight context: stable versus last week/);
  assert.match(handoff.promptText, /Latest workout muscle groups: Chest, Shoulders, Biceps, Triceps/);
  assert.match(handoff.promptText, /What do you think today's priorities should be for:/);
  assert.doesNotMatch(handoff.promptText, /Keep intensity moderate/);
  assert.doesNotMatch(handoff.promptText, /Protect tonight's sleep/);
});
