import assert from "node:assert/strict";
import test from "node:test";

import { buildDecisionEvidence } from "@/lib/insights/decision-evidence";
import { buildReadinessSnapshot } from "@/lib/insights/readiness-snapshot";
import { makeMissingWhoopReadiness, makeScoredWhoopReadiness } from "@/test/fixtures/whoop";
import type { DailyPhysiqueDecision } from "@/lib/insights/types";

const decision: DailyPhysiqueDecision = {
  trainingAvailability: "Train",
  trainingTarget: "Upper",
  nextTrainingTarget: "Upper",
  trainingTargetReason: "Upper is next by split recency.",
  trainingIntent: "Push",
  intensityLabel: "Target",
  sessionAnchors: ["Bench press"],
  mainBottleneck: "None",
  primaryDecisionReason: "Readiness is supportive.",
  daysLeftInWeek: 3,
  liftsNeededForGoal: 1,
  canStillHitWeeklyGoalIfRestToday: true,
  weeklyPaceLabel: "On pace",
  decisionFactors: [{ label: "Weekly lift goal", tone: "neutral", detail: "3/4 lifts Mon-Sun" }],
  weightTrend: { currentLb: 180, average7dLb: 179, weeklyDeltaLb: 1 },
  strengthProgression: [],
  weeklyScorecard: [],
};

function snapshotFor(fixture = makeScoredWhoopReadiness()) {
  return buildReadinessSnapshot({
    decisionAt: new Date(fixture.decisionAt),
    sleepRows: fixture.sleep ? [fixture.sleep] : [],
    recoveryRows: fixture.recovery ? [fixture.recovery] : [],
    cycleRows: fixture.cycle ? [fixture.cycle] : [],
  });
}

test("decision evidence exposes provenance, values, and baseline coverage", () => {
  const evidence = buildDecisionEvidence(snapshotFor(), decision, {
    available: true,
    importAgeTier: "current",
    coverageEnd: "2026-05-02",
    confidence: "medium",
    qualifier: null,
    strongestDeviation: "HRV is within baseline.",
    strongestDeviationUnfavorable: false,
    behaviorCue: null,
  });

  assert.equal(evidence.readinessStatus, "available");
  assert.equal(evidence.confidence, "low");
  assert.equal(evidence.observations.find((item) => item.key === "recoveryScore")?.value, 70);
  assert.equal(evidence.observations.find((item) => item.key === "recoveryScore")?.source, "WHOOP live API");
  assert.equal(evidence.observations.find((item) => item.key === "recoveryScore")?.baseline?.sampleCount, 0);
  assert.equal(evidence.ruleTrace.find((item) => item.label === "Weekly pressure")?.outcome, "applied");
});

test("unavailable evidence preserves failure reasons and caps confidence", () => {
  const evidence = buildDecisionEvidence(snapshotFor(makeMissingWhoopReadiness()), { ...decision, trainingAvailability: "Rest", trainingIntent: "Maintain" });

  assert.equal(evidence.readinessStatus, "unavailable");
  assert.equal(evidence.confidence, "low");
  assert.ok(evidence.observations.every((item) => item.value === null));
  assert.ok(evidence.observations.some((item) => item.reason === "missing"));
  assert.equal(evidence.ruleTrace.find((item) => item.label === "Readiness safety guard")?.outcome, "applied");
});
