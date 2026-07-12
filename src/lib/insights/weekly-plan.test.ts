import assert from "node:assert/strict";
import test from "node:test";

import { applyHistoricalModifier } from "@/lib/insights/historical-context";
import { buildWeeklyPlanFromInputs } from "@/lib/insights/weekly-plan";
import type { DailyPhysiqueDecision, DailyReadiness, DailyTrainingLoad } from "@/lib/insights/types";

const decision = {
  trainingAvailability: "Train", trainingTarget: "Upper", nextTrainingTarget: "Upper",
  trainingTargetReason: "", trainingIntent: "Push", intensityLabel: "", sessionAnchors: [],
  mainBottleneck: "", primaryDecisionReason: "Train upper today.", daysLeftInWeek: 7,
  liftsNeededForGoal: 4, canStillHitWeeklyGoalIfRestToday: true, weeklyPaceLabel: "",
  decisionFactors: [], weightTrend: { currentLb: null, average7dLb: null, weeklyDeltaLb: null },
  strengthProgression: [], weeklyScorecard: [],
} satisfies DailyPhysiqueDecision;

const readiness = { sleepVsNeedHours: 0 } as DailyReadiness;
const trainingLoad = {
  upperSessionAnchors: ["Bench", "Row"], lowerSessionAnchors: ["Squat", "Curl"],
} as DailyTrainingLoad;

test("historical context can soften push but cannot flip availability or split", () => {
  const modified = applyHistoricalModifier(decision, {
    available: true, importAgeTier: "current", coverageEnd: null, confidence: "high",
    qualifier: "Sleep is in your bottom quartile.", strongestDeviation: null,
    strongestDeviationUnfavorable: true, behaviorCue: "Sleep is in your bottom quartile.",
  });
  assert.equal(modified.trainingIntent, "Maintain");
  assert.equal(modified.trainingAvailability, "Train");
  assert.equal(modified.trainingTarget, "Upper");
  assert.equal(modified.intensityLabel, "Keep normal volume, no forced PRs");
  assert.match(modified.primaryDecisionReason, /Historical context supports maintaining normal volume/);
  assert.equal(
    (modified.decisionFactors as DailyPhysiqueDecision["decisionFactors"]).at(-1)?.label,
    "Historical context",
  );
});

test("favorable low resting heart rate does not soften a push decision", () => {
  const modified = applyHistoricalModifier(decision, {
    available: true, importAgeTier: "current", coverageEnd: null, confidence: "high",
    qualifier: "Resting HR is in your bottom quartile.", strongestDeviation: null,
    strongestDeviationUnfavorable: false, behaviorCue: null,
  });

  assert.equal(modified.trainingIntent, "Push");
  assert.equal(modified.intensityLabel, "");
  assert.equal(modified.primaryDecisionReason, "Train upper today.");
});

test("weekly plan creates seven Monday-Sunday days and four total lift slots", () => {
  const plan = buildWeeklyPlanFromInputs({
    now: new Date("2026-06-22T16:00:00.000Z"),
    decision, readiness, trainingLoad, completed: [],
  });
  assert.equal(plan.days.length, 7);
  assert.equal(plan.weekStart, "2026-06-22");
  assert.equal(plan.weekEnd, "2026-06-28");
  assert.equal(plan.generatedAt, "2026-06-22T16:00:00.000Z");
  assert.equal(plan.days.filter((day) => day.workoutType === "Upper" || day.workoutType === "Lower").length, 4);
});

test("weekly plan preserves completed workouts and alternates future splits", () => {
  const plan = buildWeeklyPlanFromInputs({
    now: new Date("2026-06-24T16:00:00.000Z"),
    decision: { ...decision, trainingTarget: "Lower", nextTrainingTarget: "Lower" },
    readiness, trainingLoad,
    completed: [{ date: "2026-06-22T12:00:00.000Z", title: "Upper A" }],
  });
  assert.equal(plan.days[0].state, "completed");
  assert.equal(plan.days[0].workoutType, "Upper");
  assert.ok(plan.days.some((day) => day.state === "planned" && day.guardrail));
});

test("weekly forecast keeps past dates without workouts explicitly unobserved", () => {
  const plan = buildWeeklyPlanFromInputs({
    now: new Date("2026-06-24T16:00:00.000Z"),
    decision, readiness, trainingLoad, completed: [],
  });
  assert.equal(plan.days[0].state, "unobserved");
  assert.equal(plan.days[0].workoutType, "Rest");
  assert.match(plan.days[0].rationale, /No workout was recorded/);
});
