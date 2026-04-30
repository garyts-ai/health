import assert from "node:assert/strict";
import test from "node:test";

import { buildOvernightRead, deriveLateNightDisruption } from "@/lib/insights/overnight-read";
import {
  buildActivityContextFromRows,
  buildPhysiqueDecision,
  classifyWhoopActivity,
  inferBuckets,
} from "@/lib/insights/engine";
import type {
  DailyActivityContext,
  DailyLateNightDisruption,
  DailyNutritionActuals,
  DailyNutritionTargets,
  DailyReadiness,
  DailyStressFlags,
  DailyTrainingLoad,
} from "@/lib/insights/types";

function makeReadiness(overrides: Partial<DailyReadiness> = {}): DailyReadiness {
  return {
    recoveryScore: 70,
    recoveryTrend3d: 68,
    bodyWeightKg: 79,
    bodyWeightDelta7dKg: 0,
    bodyWeightDelta28dKg: 0.4,
    whoopDayStrain: 10,
    whoopDayStrainVs7d: 0.5,
    sleepPerformance: 88,
    sleepHours: 8,
    sleepVsNeedHours: 0.2,
    sleepConsistency: 85,
    sleepEfficiency: 90,
    awakeHours: 0.4,
    latestSleepStart: "2026-04-05T03:00:00.000Z",
    latestSleepEnd: "2026-04-05T11:00:00.000Z",
    sleepStageSummary: {
      inBedHours: 8.4,
      awakeHours: 0.4,
      lightHours: 4.2,
      deepHours: 1.4,
      remHours: 2.4,
    },
    restingHeartRate: 50,
    restingHeartRateVs7d: 0,
    hrvRmssd: 70,
    hrvVs7d: 0,
    respiratoryRate: 15,
    respiratoryRateVs7d: 0,
    skinTempCelsius: 0,
    skinTempVs7d: 0,
    whoopStrain7dAvg: 10,
    ...overrides,
  };
}

function makeTraining(overrides: Partial<DailyTrainingLoad> = {}): DailyTrainingLoad {
  return {
    hevyVolume7d: 12000,
    hevyVolume28dAvg: 11000,
    hevySetCount7d: 50,
    hevyWorkoutCount7d: 4,
    hevySetCountThisWeek: 50,
    hevyWorkoutCountThisWeek: 4,
    hevyConsecutiveDays: 1,
    hevyLastWorkoutTitle: "Upper Body",
    hevyLastWorkoutAt: new Date().toISOString(),
    hevyLastWorkoutVolumeKg: 3200,
    hevyLastWorkoutDurationSeconds: 3600,
    recentLoadSpike: false,
    upperBodyDaysSince: 0,
    lowerBodyDaysSince: 2,
    pushDaysSince: 0,
    pullDaysSince: 3,
    muscleFocus: ["bench press", "lat pulldown"],
    upperSessionAnchors: ["Bench Press", "Lat Pulldown"],
    lowerSessionAnchors: ["Leg Press", "Seated Leg Curl"],
    weeklyMuscleFocus: [],
    weeklyMuscleVolume: [],
    latestWorkoutFocus: [],
    ...overrides,
  };
}

function makeStressFlags(overrides: Partial<DailyStressFlags> = {}): DailyStressFlags {
  return {
    illnessRisk: false,
    poorSleepTrend: false,
    lowRecovery: false,
    elevatedRestingHeartRate: false,
    suppressedHrv: false,
    elevatedRespiratoryRate: false,
    elevatedSkinTemp: false,
    highTrainingLoad: false,
    localFatigueUpper: false,
    localFatigueLower: false,
    ...overrides,
  };
}

function makeLateNight(
  overrides: Partial<DailyLateNightDisruption> = {},
): DailyLateNightDisruption {
  return {
    active: false,
    severity: "low",
    confidence: "low",
    likelyLane: "none",
    headline: "No late-night disruption",
    blurb: "Sleep and physiology do not suggest a major overnight disruption.",
    supportingMetrics: [],
    ...overrides,
  };
}

function makeActivityContext(overrides: Partial<DailyActivityContext> = {}): DailyActivityContext {
  return {
    displayWindowLabel: "This week",
    currentWeekHasActivity: false,
    fallbackUsed: false,
    hasActivity: false,
    summaryLine: "No walks, tennis, or conditioning logged this week.",
    interpretation: "No extra conditioning load is affecting today.",
    latestSession: null,
    buckets: [],
    days: [],
    totalSessions: 0,
    totalDurationMinutes: 0,
    totalStrain: 0,
    totalDistanceMeter: null,
    ...overrides,
  };
}

const nutritionTargets: DailyNutritionTargets = {
  calorieTarget: 2450,
  proteinTargetG: 160,
  effectiveCalorieTarget: 2450,
  effectiveProteinTargetG: 160,
  smartCalorieTarget: 2450,
  smartProteinTargetG: 160,
  targetSource: "smart",
  smartReason: "Smart target from body weight and training goal.",
  updatedAt: null,
};

const nutritionActuals: DailyNutritionActuals = {
  dateKey: "2026-04-27",
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  remainingCalories: 2450,
  remainingProteinG: 160,
  calorieTarget: 2450,
  proteinTargetG: 160,
  hasLoggedIntake: false,
  entries: [],
};

test("readiness fixture defaults to supportive recovery", () => {
  const readiness = makeReadiness();
  assert.equal(readiness.recoveryScore, 70);
  assert.equal(readiness.sleepVsNeedHours, 0.2);
});

test("poor recovery fixture exposes high caution state", () => {
  const readiness = makeReadiness({
    recoveryScore: 35,
    sleepVsNeedHours: -1.5,
    restingHeartRateVs7d: 5,
    hrvVs7d: -10,
  });

  assert.equal(readiness.recoveryScore! < 45, true);
  assert.equal(readiness.sleepVsNeedHours! < -0.75, true);
  assert.equal(readiness.restingHeartRateVs7d! >= 4, true);
  assert.equal(readiness.hrvVs7d! <= -8, true);
});

test("load spike fixture exposes heavy recent training", () => {
  const training = makeTraining({
    hevyConsecutiveDays: 4,
    recentLoadSpike: true,
    lowerBodyDaysSince: 0,
  });

  assert.equal(training.recentLoadSpike, true);
  assert.equal(training.hevyConsecutiveDays >= 3, true);
  assert.equal(training.lowerBodyDaysSince, 0);
});

test("squat press is classified as lower body, not upper push", () => {
  const buckets = inferBuckets([
    "squat press",
    "seated leg curl",
    "hip adduction",
    "leg extension (machine)",
  ]);

  assert.deepEqual(buckets, ["lower"]);
});

test("WHOOP activity classification excludes lifting and separates walking, tennis, and conditioning", () => {
  assert.equal(classifyWhoopActivity("Weightlifting"), null);
  assert.equal(classifyWhoopActivity("walking"), "walking");
  assert.equal(classifyWhoopActivity("Hiking-Rucking"), "walking");
  assert.equal(classifyWhoopActivity("Tennis"), "tennis");
  assert.equal(classifyWhoopActivity("Activity"), "other_conditioning");
});

test("activity context falls back to last week and keeps latest tennis visible", () => {
  const context = buildActivityContextFromRows(
    [
      {
        id: "lift-current",
        sport_name: "weightlifting",
        start: "2026-04-23T14:00:00.000Z",
        end: "2026-04-23T15:00:00.000Z",
        strain: 10,
      },
      {
        id: "tennis",
        sport_name: "tennis",
        start: "2026-04-19T15:00:00.000Z",
        end: "2026-04-19T15:57:00.000Z",
        strain: 8.6,
        average_heart_rate: 120,
        max_heart_rate: 146,
      },
      {
        id: "walk-1",
        sport_name: "walking",
        start: "2026-04-15T13:00:00.000Z",
        end: "2026-04-15T13:38:00.000Z",
        strain: 5.5,
      },
      {
        id: "walk-2",
        sport_name: "walking",
        start: "2026-04-15T18:00:00.000Z",
        end: "2026-04-15T18:24:00.000Z",
        strain: 5.2,
      },
      {
        id: "ruck",
        sport_name: "hiking-rucking",
        start: "2026-04-14T13:00:00.000Z",
        end: "2026-04-14T13:13:00.000Z",
        strain: 4.4,
      },
      {
        id: "other",
        sport_name: "activity",
        start: "2026-04-13T13:00:00.000Z",
        end: "2026-04-13T13:51:00.000Z",
        strain: 7.4,
      },
    ],
    new Date("2026-04-25T12:00:00.000Z"),
  );

  assert.equal(context.displayWindowLabel, "Last week");
  assert.equal(context.currentWeekHasActivity, false);
  assert.equal(context.fallbackUsed, true);
  assert.equal(context.latestSession?.sportName, "tennis");
  assert.equal(context.buckets.find((bucket) => bucket.kind === "walking")?.count, 3);
  assert.equal(context.buckets.find((bucket) => bucket.kind === "tennis")?.count, 1);
  assert.equal(context.buckets.find((bucket) => bucket.kind === "other_conditioning")?.count, 1);
  assert.match(context.summaryLine, /Last week had 3 walks, 1 tennis session, and 1 conditioning session/);
});

test("activity context uses current week when present", () => {
  const context = buildActivityContextFromRows(
    [
      {
        id: "walk-current",
        sport_name: "walking",
        start: "2026-04-21T13:00:00.000Z",
        end: "2026-04-21T13:30:00.000Z",
        strain: 4,
      },
      {
        id: "tennis-last",
        sport_name: "tennis",
        start: "2026-04-19T13:00:00.000Z",
        end: "2026-04-19T14:00:00.000Z",
        strain: 8,
      },
    ],
    new Date("2026-04-25T12:00:00.000Z"),
  );

  assert.equal(context.displayWindowLabel, "This week");
  assert.equal(context.currentWeekHasActivity, true);
  assert.equal(context.fallbackUsed, false);
  assert.equal(context.latestSession?.id, "walk-current");
  assert.equal(context.buckets.length, 1);
});

test("activity context exposes a quiet empty state when no non-lifting activity exists", () => {
  const context = buildActivityContextFromRows(
    [
      {
        id: "lift",
        sport_name: "weightlifting",
        start: "2026-04-21T13:00:00.000Z",
        end: "2026-04-21T14:00:00.000Z",
        strain: 9,
      },
    ],
    new Date("2026-04-25T12:00:00.000Z"),
  );

  assert.equal(context.hasActivity, false);
  assert.equal(context.latestSession, null);
  assert.match(context.summaryLine, /No walks, tennis, or conditioning logged/);
});

test("physique decision rests on poor recovery when the weekly goal is still reachable", () => {
  const decision = buildPhysiqueDecision(
    makeReadiness({ recoveryScore: 28, sleepVsNeedHours: -1.6, restingHeartRateVs7d: 5 }),
    makeTraining({
      hevyWorkoutCountThisWeek: 1,
      upperBodyDaysSince: 1,
      lowerBodyDaysSince: 3,
    }),
    makeStressFlags({ lowRecovery: true, poorSleepTrend: true, elevatedRestingHeartRate: true }),
    makeLateNight({ active: true, severity: "medium", confidence: "medium", likelyLane: "hangover_like" }),
    makeActivityContext(),
    nutritionTargets,
    nutritionActuals,
    [],
    new Date("2026-04-27T14:00:00.000Z"),
  );

  assert.equal(decision.trainingAvailability, "Rest");
  assert.equal(decision.nextTrainingTarget, "Lower");
  assert.equal(decision.canStillHitWeeklyGoalIfRestToday, true);
  assert.match(decision.primaryDecisionReason, /Rest today/);
});

test("physique decision trains with a back-off intent when poor recovery meets schedule pressure", () => {
  const decision = buildPhysiqueDecision(
    makeReadiness({ recoveryScore: 30, sleepVsNeedHours: -1.4 }),
    makeTraining({
      hevyWorkoutCountThisWeek: 1,
      upperBodyDaysSince: 3,
      lowerBodyDaysSince: 1,
    }),
    makeStressFlags({ lowRecovery: true, poorSleepTrend: true }),
    makeLateNight({ active: true, severity: "medium", confidence: "medium", likelyLane: "hangover_like" }),
    makeActivityContext(),
    nutritionTargets,
    nutritionActuals,
    [],
    new Date("2026-05-02T14:00:00.000Z"),
  );

  assert.equal(decision.trainingAvailability, "Train");
  assert.equal(decision.trainingTarget, "Upper");
  assert.equal(decision.trainingIntent, "Back off");
  assert.equal(decision.canStillHitWeeklyGoalIfRestToday, false);
});

test("physique decision rests for illness-like physiology regardless of weekly pace", () => {
  const decision = buildPhysiqueDecision(
    makeReadiness({ recoveryScore: 62, sleepVsNeedHours: 0 }),
    makeTraining({ hevyWorkoutCountThisWeek: 1 }),
    makeStressFlags({ illnessRisk: true }),
    makeLateNight({ active: true, severity: "high", confidence: "high", likelyLane: "illness_like" }),
    makeActivityContext(),
    nutritionTargets,
    nutritionActuals,
    [],
    new Date("2026-05-02T14:00:00.000Z"),
  );

  assert.equal(decision.trainingAvailability, "Rest");
  assert.match(decision.primaryDecisionReason, /illness-like/);
});

test("physique decision pushes when readiness is good and the 4x target is behind pace", () => {
  const decision = buildPhysiqueDecision(
    makeReadiness(),
    makeTraining({
      hevyWorkoutCountThisWeek: 2,
      upperBodyDaysSince: 4,
      lowerBodyDaysSince: 2,
    }),
    makeStressFlags(),
    makeLateNight(),
    makeActivityContext(),
    nutritionTargets,
    nutritionActuals,
    [],
    new Date("2026-05-02T14:00:00.000Z"),
  );

  assert.equal(decision.trainingAvailability, "Train");
  assert.equal(decision.trainingTarget, "Upper");
  assert.equal(decision.trainingIntent, "Push");
  assert.match(decision.weeklyPaceLabel, /Behind pace/);
});

test("physique decision maintains when readiness is good and the week is on pace", () => {
  const decision = buildPhysiqueDecision(
    makeReadiness(),
    makeTraining({
      hevyWorkoutCountThisWeek: 2,
      upperBodyDaysSince: 2,
      lowerBodyDaysSince: 2,
    }),
    makeStressFlags(),
    makeLateNight(),
    makeActivityContext(),
    nutritionTargets,
    nutritionActuals,
    [],
    new Date("2026-04-29T14:00:00.000Z"),
  );

  assert.equal(decision.trainingAvailability, "Train");
  assert.equal(decision.trainingIntent, "Maintain");
  assert.match(decision.weeklyPaceLabel, /needed/);
});

test("physique decision rests when high current-week tennis load combines with poor sleep", () => {
  const decision = buildPhysiqueDecision(
    makeReadiness({ recoveryScore: 54, sleepVsNeedHours: -1.6 }),
    makeTraining({ hevyWorkoutCountThisWeek: 1, upperBodyDaysSince: 1, lowerBodyDaysSince: 3 }),
    makeStressFlags({ poorSleepTrend: true }),
    makeLateNight(),
    makeActivityContext({
      hasActivity: true,
      currentWeekHasActivity: true,
      totalStrain: 11,
      latestSession: {
        id: "tennis-current",
        kind: "tennis",
        sportName: "tennis",
        start: "2026-04-26T16:00:00.000Z",
        end: "2026-04-26T17:00:00.000Z",
        durationMinutes: 60,
        strain: 8.5,
        averageHeartRate: 125,
        maxHeartRate: 154,
        distanceMeter: null,
      },
    }),
    nutritionTargets,
    nutritionActuals,
    [],
    new Date("2026-04-27T14:00:00.000Z"),
  );

  assert.equal(decision.trainingAvailability, "Rest");
  assert.equal(decision.decisionFactors.some((factor) => factor.label === "Tennis load"), true);
});

test("physique decision ignores previous-week fallback activity for today's fatigue", () => {
  const decision = buildPhysiqueDecision(
    makeReadiness(),
    makeTraining({ hevyWorkoutCountThisWeek: 2 }),
    makeStressFlags({ poorSleepTrend: true }),
    makeLateNight(),
    makeActivityContext({
      displayWindowLabel: "Last week",
      fallbackUsed: true,
      hasActivity: true,
      totalStrain: 22,
      latestSession: {
        id: "tennis-fallback",
        kind: "tennis",
        sportName: "tennis",
        start: "2026-04-19T16:00:00.000Z",
        end: "2026-04-19T17:00:00.000Z",
        durationMinutes: 60,
        strain: 9,
        averageHeartRate: 125,
        maxHeartRate: 154,
        distanceMeter: null,
      },
    }),
    nutritionTargets,
    nutritionActuals,
    [],
    new Date("2026-04-27T14:00:00.000Z"),
  );

  assert.equal(decision.trainingAvailability, "Train");
  assert.equal(decision.decisionFactors.some((factor) => factor.label === "Tennis load"), false);
});

test("late-night disruption infers a hangover-like lane from a rough night without illness markers", () => {
  const disruption = deriveLateNightDisruption(
    makeReadiness({
      recoveryScore: 18,
      sleepPerformance: 39,
      sleepConsistency: 44,
      sleepEfficiency: 72,
      awakeHours: 1.4,
      restingHeartRateVs7d: 9,
      hrvVs7d: -18,
      respiratoryRateVs7d: 0.1,
      skinTempVs7d: 0.1,
    }),
    makeStressFlags(),
  );

  assert.equal(disruption.active, true);
  assert.equal(disruption.likelyLane, "hangover_like");
});

test("overnight read does not present late-night disruption as confirmed alcohol", () => {
  const readiness = makeReadiness({
    recoveryScore: 18,
    sleepHours: 6.4,
    sleepPerformance: 39,
    sleepConsistency: 44,
    sleepEfficiency: 72,
    awakeHours: 1.4,
    restingHeartRateVs7d: 9,
    hrvVs7d: -18,
    respiratoryRateVs7d: 0.1,
    skinTempVs7d: 0.1,
  });
  const disruption = deriveLateNightDisruption(readiness, makeStressFlags());
  const overnightRead = buildOvernightRead(disruption, readiness);

  assert.equal(disruption.likelyLane, "hangover_like");
  assert.equal(overnightRead.label, "Short sleep + recovery hit");
  assert.doesNotMatch(overnightRead.label, /alcohol/i);
  assert.doesNotMatch(overnightRead.detail, /alcohol/i);
});

test("late-night disruption infers an illness-like lane when respiratory and temperature markers drift", () => {
  const disruption = deriveLateNightDisruption(
    makeReadiness({
      recoveryScore: 20,
      sleepPerformance: 48,
      sleepConsistency: 55,
      sleepEfficiency: 78,
      awakeHours: 1.1,
      restingHeartRateVs7d: 7,
      hrvVs7d: -16,
      respiratoryRateVs7d: 0.5,
      skinTempVs7d: 0.4,
    }),
    makeStressFlags({ illnessRisk: true }),
  );

  assert.equal(disruption.active, true);
  assert.equal(disruption.likelyLane, "illness_like");
});
