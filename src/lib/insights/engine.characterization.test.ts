import assert from "node:assert/strict";
import test from "node:test";

import { buildPhysiqueDecision } from "@/lib/insights/engine";
import type { DailyPhysiqueDecision } from "@/lib/insights/types";
import {
  makeActivityContext,
  makeLateNight,
  makeMissingReadiness,
  makeReadiness,
  makeStressFlags,
  makeTraining,
} from "@/test/fixtures/insights";

function projectDecision(decision: DailyPhysiqueDecision) {
  return {
    trainingAvailability: decision.trainingAvailability,
    trainingTarget: decision.trainingTarget,
    nextTrainingTarget: decision.nextTrainingTarget,
    trainingIntent: decision.trainingIntent,
    intensityLabel: decision.intensityLabel,
    primaryDecisionReason: decision.primaryDecisionReason,
    daysLeftInWeek: decision.daysLeftInWeek,
    liftsNeededForGoal: decision.liftsNeededForGoal,
    canStillHitWeeklyGoalIfRestToday: decision.canStillHitWeeklyGoalIfRestToday,
    weeklyPaceLabel: decision.weeklyPaceLabel,
    decisionFactorLabels: decision.decisionFactors.map((factor) => factor.label),
  };
}

test("characterizes a healthy on-pace decision", () => {
  const decision = buildPhysiqueDecision(
    makeReadiness({
      latestSleepStart: "2026-04-29T03:00:00.000Z",
      latestSleepEnd: "2026-04-29T11:00:00.000Z",
    }),
    makeTraining({
      hevyWorkoutCountThisWeek: 2,
      hevyLastWorkoutAt: "2026-04-28T18:00:00.000Z",
      upperBodyDaysSince: 2,
      lowerBodyDaysSince: 2,
    }),
    makeStressFlags(),
    makeLateNight(),
    makeActivityContext(),
    [],
    new Date("2026-04-29T14:00:00.000Z"),
  );

  assert.deepEqual(projectDecision(decision), {
    trainingAvailability: "Train",
    trainingTarget: "Lower",
    nextTrainingTarget: "Lower",
    trainingIntent: "Maintain",
    intensityLabel: "Keep normal volume, no forced PRs",
    primaryDecisionReason: "Train lower at planned volume; the schedule does not require extra work today.",
    daysLeftInWeek: 5,
    liftsNeededForGoal: 2,
    canStillHitWeeklyGoalIfRestToday: true,
    weeklyPaceLabel: "2 lifts needed with 4 days after today",
    decisionFactorLabels: [
      "Schedule flexible",
      "Physiology supportive",
      "Weekly lift goal",
      "Split recency",
    ],
  });
});

test("characterizes poor readiness when the schedule can absorb rest", () => {
  const decision = buildPhysiqueDecision(
    makeReadiness({
      recoveryScore: 28,
      sleepVsNeedHours: -1.6,
      restingHeartRateVs7d: 5,
      latestSleepStart: "2026-04-27T03:00:00.000Z",
      latestSleepEnd: "2026-04-27T11:00:00.000Z",
    }),
    makeTraining({
      hevyWorkoutCountThisWeek: 1,
      hevyLastWorkoutAt: "2026-04-26T18:00:00.000Z",
      upperBodyDaysSince: 1,
      lowerBodyDaysSince: 3,
    }),
    makeStressFlags({
      lowRecovery: true,
      poorSleepTrend: true,
      elevatedRestingHeartRate: true,
    }),
    makeLateNight({
      active: true,
      severity: "medium",
      confidence: "medium",
      likelyLane: "hangover_like",
    }),
    makeActivityContext(),
    [],
    new Date("2026-04-27T14:00:00.000Z"),
  );

  assert.deepEqual(projectDecision(decision), {
    trainingAvailability: "Rest",
    trainingTarget: "Either",
    nextTrainingTarget: "Lower",
    trainingIntent: "Back off",
    intensityLabel: "Save the lift for a better recovery window",
    primaryDecisionReason: "Rest today: 28% recovery is paired with a multi-signal overnight disruption; 3 lifts needed with 6 days after today.",
    daysLeftInWeek: 7,
    liftsNeededForGoal: 3,
    canStillHitWeeklyGoalIfRestToday: true,
    weeklyPaceLabel: "3 lifts needed with 6 days after today",
    decisionFactorLabels: [
      "Schedule flexible",
      "Recovery suppressed",
      "Sleep gap",
      "Weekly lift goal",
      "Split recency",
    ],
  });
});

test("characterizes the known Phase 1 missing-readiness defect", () => {
  const decision = buildPhysiqueDecision(
    makeMissingReadiness(),
    makeTraining({
      hevyWorkoutCountThisWeek: 2,
      hevyLastWorkoutAt: "2026-04-28T18:00:00.000Z",
      upperBodyDaysSince: 2,
      lowerBodyDaysSince: 2,
    }),
    makeStressFlags(),
    makeLateNight(),
    makeActivityContext(),
    [],
    new Date("2026-04-29T14:00:00.000Z"),
  );

  assert.deepEqual(projectDecision(decision), {
    trainingAvailability: "Rest",
    trainingTarget: "Either",
    nextTrainingTarget: "Lower",
    trainingIntent: "Maintain",
    intensityLabel: "Wait for current recovery data before training hard",
    primaryDecisionReason: "Readiness unavailable: no current coherent scored sleep/recovery cycle (missing).",
    daysLeftInWeek: 5,
    liftsNeededForGoal: 2,
    canStillHitWeeklyGoalIfRestToday: true,
    weeklyPaceLabel: "2 lifts needed with 4 days after today",
    decisionFactorLabels: [
      "Readiness unavailable",
      "Weekly lift goal",
      "Split recency",
    ],
  });
});

test("characterizes the known Phase 1 late-week readiness defect", () => {
  const decision = buildPhysiqueDecision(
    makeReadiness({ recoveryScore: 30, sleepVsNeedHours: -1.4 }),
    makeTraining({
      hevyWorkoutCountThisWeek: 1,
      upperBodyDaysSince: 3,
      lowerBodyDaysSince: 1,
    }),
    makeStressFlags({ lowRecovery: true, poorSleepTrend: true }),
    makeLateNight({
      active: true,
      severity: "medium",
      confidence: "medium",
      likelyLane: "hangover_like",
    }),
    makeActivityContext(),
    [],
    new Date("2026-05-02T14:00:00.000Z"),
  );

  assert.deepEqual(projectDecision(decision), {
    trainingAvailability: "Rest",
    trainingTarget: "Either",
    nextTrainingTarget: "Upper",
    trainingIntent: "Back off",
    intensityLabel: "Rest if symptoms are obvious; otherwise keep it very easy",
    primaryDecisionReason: "Rest today: 30% recovery is paired with a multi-signal overnight disruption; behind pace: 3 lifts needed and schedule pressure is high.",
    daysLeftInWeek: 2,
    liftsNeededForGoal: 3,
    canStillHitWeeklyGoalIfRestToday: false,
    weeklyPaceLabel: "Behind pace: 3 lifts needed and schedule pressure is high",
    decisionFactorLabels: [
      "Schedule pressure",
      "Recovery suppressed",
      "Sleep gap",
      "Weekly lift goal",
      "Split recency",
    ],
  });
});
