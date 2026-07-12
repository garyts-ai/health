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

test("buildReadinessSnapshot keeps the partial current physiological day regardless of record order", () => {
  const prior = makeScoredWhoopReadiness({
    cycle: makeWhoopCycle({ id: 2001, start: "2026-07-11T07:00:00.000Z", end: "2026-07-11T23:00:00.000Z", strain: 16.5 }),
    sleep: makeWhoopSleep({ id: "sleep-2001", cycleId: 2001, end: "2026-07-11T12:00:00.000Z", sleepPerformancePercentage: 92 }),
    recovery: makeWhoopRecovery({ cycleId: 2001, recoveryScore: 65, updatedAt: "2026-07-11T12:30:00.000Z", createdAt: "2026-07-11T12:30:00.000Z" }),
  });
  const current = makeScoredWhoopReadiness({
    cycle: makeWhoopCycle({ id: 2002, start: "2026-07-12T07:44:12.640Z", end: "1970-01-01T00:00:00.000Z", strain: 0.3 }),
    sleep: makeWhoopSleep({ cycleId: 2002, end: "2026-07-12T12:26:58.070Z", sleepPerformancePercentage: 49, totalLightSleepTimeMilli: 4_806_000, totalSlowWaveSleepTimeMilli: 7_086_240, totalRemSleepTimeMilli: 3_693_170 }),
    recovery: makeWhoopRecovery({
      cycleId: 2002,
      recoveryScore: 10,
      hrvRmssdMilli: null,
      createdAt: "2026-07-12T12:30:34.988Z",
      updatedAt: "2026-07-12T12:30:34.988Z",
    }),
    decisionAt: "2026-07-12T21:00:00.000Z",
  });
  const snapshot = buildReadinessSnapshot({
    decisionAt: new Date(current.decisionAt),
    sleepRows: [prior.sleep!, current.sleep!],
    recoveryRows: [prior.recovery!, current.recovery!],
    cycleRows: [prior.cycle!, current.cycle!],
  });

  assert.equal(snapshot.status, "available");
  assert.equal(snapshot.selectedDate, "2026-07-12");
  assert.equal(snapshot.physiologicalDate, "2026-07-12");
  assert.equal(snapshot.recovery.value?.recoveryScore, 10);
  assert.equal(snapshot.sleep.value?.sleepPerformancePercentage, 49);
  assert.equal(snapshot.cycle.value?.strain, 0.3);
  assert.equal(snapshot.cycle.observedAt, "2026-07-12T07:44:12.640Z");
});

test("buildReadinessSnapshot does not relabel yesterday as today and handles a UTC midnight boundary", () => {
  const yesterday = makeScoredWhoopReadiness({
    decisionAt: "2026-05-02T03:45:00.000Z",
    sleep: makeWhoopSleep({ end: "2026-05-02T03:30:00.000Z" }),
    cycle: makeWhoopCycle({ end: "2026-05-02T03:30:00.000Z" }),
    recovery: makeWhoopRecovery({ updatedAt: "2026-05-02T03:31:00.000Z", createdAt: "2026-05-02T03:31:00.000Z" }),
  });
  const midnight = buildReadinessSnapshot({
    decisionAt: new Date(yesterday.decisionAt),
    sleepRows: [yesterday.sleep!],
    recoveryRows: [yesterday.recovery!],
    cycleRows: [yesterday.cycle!],
  });
  assert.equal(midnight.status, "available");
  assert.equal(midnight.selectedDate, "2026-05-01");

  const missingCurrent = makeScoredWhoopReadiness({
    decisionAt: "2026-05-02T14:00:00.000Z",
    sleep: makeWhoopSleep({ end: "2026-05-01T11:00:00.000Z" }),
    recovery: makeWhoopRecovery({ updatedAt: "2026-05-01T11:02:00.000Z", createdAt: "2026-05-01T11:02:00.000Z" }),
    cycle: makeWhoopCycle({ end: "2026-05-01T11:00:00.000Z" }),
  });
  const unavailable = buildReadinessSnapshot({
    decisionAt: new Date(missingCurrent.decisionAt),
    sleepRows: [missingCurrent.sleep!],
    recoveryRows: [missingCurrent.recovery!],
    cycleRows: [missingCurrent.cycle!],
  });
  assert.equal(unavailable.status, "unavailable");
  assert.ok(unavailable.reasons.includes("different_date"));
  assert.equal(unavailable.sleep.value, null);
});
