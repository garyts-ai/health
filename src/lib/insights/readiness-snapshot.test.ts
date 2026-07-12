import assert from "node:assert/strict";
import test from "node:test";

import { buildReadinessSnapshot } from "@/lib/insights/readiness-snapshot";
import {
  makeMismatchedWhoopReadiness,
  makeMissingWhoopReadiness,
  makeNapOnlyWhoopReadiness,
  makeScoredWhoopReadiness,
  makeStaleWhoopReadiness,
  makeUnscoredWhoopReadiness,
  makeWhoopCycle,
  makeWhoopRecovery,
  makeWhoopSleep,
  WHOOP_FIXTURE_DECISION_AT,
} from "@/test/fixtures/whoop";

function inputFor(fixture = makeScoredWhoopReadiness()) {
  return {
    decisionAt: new Date(fixture.decisionAt),
    sleepRows: fixture.sleep ? [fixture.sleep] : [],
    recoveryRows: fixture.recovery ? [fixture.recovery] : [],
    cycleRows: fixture.cycle ? [fixture.cycle] : [],
  };
}

test("buildReadinessSnapshot selects one current scored coherent cycle", () => {
  const snapshot = buildReadinessSnapshot(inputFor());

  assert.equal(snapshot.status, "available");
  assert.equal(snapshot.cycleId, 1001);
  assert.equal(snapshot.sleep.status, "valid");
  assert.equal(snapshot.recovery.status, "valid");
  assert.equal(snapshot.cycle.status, "valid");
  assert.deepEqual(snapshot.reasons, []);
});

test("buildReadinessSnapshot rejects stale, mismatched, nap-only, unscored, and missing inputs", () => {
  const cases = [
    [makeStaleWhoopReadiness(), "stale"],
    [makeMismatchedWhoopReadiness(), "mismatched_cycle"],
    [makeNapOnlyWhoopReadiness(), "nap_only"],
    [makeUnscoredWhoopReadiness(), "unscored"],
    [makeMissingWhoopReadiness(), "missing"],
  ] as const;

  for (const [fixture, reason] of cases) {
    const snapshot = buildReadinessSnapshot(inputFor(fixture));
    assert.equal(snapshot.status, "unavailable", reason);
    assert.ok(snapshot.reasons.includes(reason), reason);
  }
});

test("buildReadinessSnapshot excludes the current cycle and requires four prior samples", () => {
  const current = makeScoredWhoopReadiness();
  const prior = [1, 2, 3, 4].map((index) => {
    const cycleId = 1001 - index;
    const end = new Date(Date.parse(WHOOP_FIXTURE_DECISION_AT) - index * 86_400_000).toISOString();
    const start = new Date(Date.parse(end) - 86_400_000).toISOString();
    return {
      cycle: makeWhoopCycle({ id: cycleId, start, end, strain: 8 + index }),
      sleep: makeWhoopSleep({
        id: `sleep-${cycleId}`,
        cycleId,
        start: new Date(Date.parse(end) - 8 * 60 * 60 * 1_000).toISOString(),
        end,
        respiratoryRate: 14 + index,
      }),
      recovery: makeWhoopRecovery({
        cycleId,
        recoveryScore: 60 + index,
        restingHeartRate: 48 + index,
        hrvRmssdMilli: 70 + index,
        createdAt: new Date(Date.parse(end) + 60 * 60 * 1_000).toISOString(),
        updatedAt: new Date(Date.parse(end) + 60 * 60 * 1_000).toISOString(),
      }),
    };
  });
  const snapshot = buildReadinessSnapshot({
    decisionAt: new Date(WHOOP_FIXTURE_DECISION_AT),
    sleepRows: [current.sleep!, ...prior.map((row) => row.sleep)],
    recoveryRows: [current.recovery!, ...prior.map((row) => row.recovery)],
    cycleRows: [current.cycle!, ...prior.map((row) => row.cycle)],
  });

  assert.equal(snapshot.status, "available");
  assert.equal(snapshot.baselines.recoveryScore.sampleCount, 4);
  assert.equal(snapshot.baselines.recoveryScore.value, 62.5);
  assert.equal(snapshot.baselines.respiratoryRate.value, 16.5);
  assert.equal(snapshot.baselines.respiratoryRate.status, "available");
});
