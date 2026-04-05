import assert from "node:assert/strict";
import test from "node:test";

import { deriveLateNightDisruption } from "@/lib/insights/overnight-read";
import type { DailyReadiness, DailyStressFlags, DailyTrainingLoad } from "@/lib/insights/types";

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
    weeklyMuscleFocus: [],
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
