import assert from "node:assert/strict";
import test from "node:test";

import { shiftCalendarDateKey } from "@/lib/calendar";
import { buildSleepRelationships, buildStrainRecoveryRelationship, buildTrainingResponse } from "@/lib/longitudinal/relationships";
import type { HevySessionObservation, WhoopCycleObservation, WhoopSleepObservation } from "@/lib/longitudinal/types";

function cycle(date: string, overrides: Partial<WhoopCycleObservation> = {}): WhoopCycleObservation {
  const nextDate = shiftCalendarDateKey(date, 1);
  return {
    id: `cycle-${date}`, date, source: "WHOOP live API", cycleId: `cycle-${date}`, sleepId: `sleep-${date}`,
    startedAt: `${date}T12:00:00.000Z`, endedAt: `${nextDate}T12:00:00.000Z`,
    sleepStartedAt: `${date}T02:00:00.000Z`, sleepEndedAt: `${date}T07:00:00.000Z`,
    completed: true, scoreState: "SCORED", recoveryValid: true, sleepValid: true, strainValid: true,
    recoveryScore: 65, restingHeartRate: 52, hrv: 55, spo2: 97, skinTemperature: 33,
    strain: 10, respiratoryRate: 14, sleepMinutes: 420, sleepNeedMinutes: 450,
    sleepEfficiency: 90, sleepConsistency: 82, calibrating: false, validity: [],
    provenance: { sources: ["WHOOP live API"], sourceRecordIds: [`cycle-${date}`], rawTimestamps: [], normalizedDates: [date], timezone: "America/New_York", syncTimestamps: [] },
    ...overrides,
  };
}

function sleep(date: string, overrides: Partial<WhoopSleepObservation> = {}): WhoopSleepObservation {
  return {
    id: `sleep-${date}`, cycleId: `cycle-${date}`, date, source: "WHOOP live API",
    startedAt: `${date}T02:00:00.000Z`, endedAt: `${date}T07:00:00.000Z`, nap: false,
    scoreState: "SCORED", sleepMinutes: 420, sleepNeedMinutes: 450,
    sleepEfficiency: 90, sleepConsistency: 82, validity: [],
    provenance: { sources: ["WHOOP live API"], sourceRecordIds: [`sleep-${date}`], rawTimestamps: [], normalizedDates: [date], timezone: "America/New_York", syncTimestamps: [] },
    ...overrides,
  };
}

function session(id: string, date: string, split: HevySessionObservation["split"], startHour = 17): HevySessionObservation {
  return {
    id, date, startedAt: `${date}T${String(startHour).padStart(2, "0")}:00:00.000Z`,
    endedAt: `${date}T${String(startHour + 1).padStart(2, "0")}:00:00.000Z`,
    title: null, split, exercises: [], setCount: 10, source: "Hevy",
  };
}

test("sleep relationships pair the cycle's exact sleep ID and require 28 distinct dates", () => {
  const start = "2026-01-01";
  const dates = Array.from({ length: 30 }, (_, index) => shiftCalendarDateKey(start, index));
  const cycles = dates.map((date, index) => cycle(date, { sleepId: `sleep-${date}`, hrv: 40 + index }));
  const sleeps = dates.map((date, index) => sleep(date, { sleepMinutes: 360 + index }));
  // A later sleep on the same calendar date must not replace the one linked to the recovery.
  sleeps.push(sleep(dates[10]!, { id: "unlinked-later-sleep", sleepMinutes: 999 }));
  const relationships = buildSleepRelationships(sleeps, cycles, dates[0]!, dates.at(-1)!);
  const relationship = relationships.find((item) => item.id === "sleep-sleep_duration-hrv");
  assert.equal(relationship?.evidence, "exploratory");
  assert.equal(relationship?.sampleCount, 30);
  assert.equal(relationship?.points.find((point) => point.date === dates[10])?.x, 370);
  assert.equal(relationship?.points.find((point) => point.date === dates[10])?.y, 50);
  assert.ok(relationship?.bootstrapInterval);

  const insufficient = buildSleepRelationships(sleeps, cycles.slice(0, 27), dates[0]!, dates.at(-1)!)
    .find((item) => item.id === "sleep-sleep_duration-hrv");
  assert.equal(insufficient?.evidence, "insufficient");
  assert.equal(insufficient?.sampleCount, 27);
  assert.equal(insufficient?.bootstrapInterval, null);
});

test("sleep relationships do not pair mismatched IDs or pending/calibrating recovery", () => {
  const dates = Array.from({ length: 30 }, (_, index) => shiftCalendarDateKey("2026-02-01", index));
  const cycles = dates.map((date, index) => cycle(date, {
    sleepId: index === 0 ? "wrong-id" : `sleep-${date}`,
    recoveryValid: index !== 1,
    calibrating: index === 2,
  }));
  const relationships = buildSleepRelationships(dates.map((date) => sleep(date)), cycles, dates[0]!, dates.at(-1)!);
  const relationship = relationships.find((item) => item.id === "sleep-sleep_duration-hrv");
  assert.equal(relationship?.sampleCount, 27);
  assert.equal(relationship?.points.some((point) => point.date === dates[0]), false);
  assert.equal(relationship?.points.some((point) => point.date === dates[1] || point.date === dates[2]), false);
});

test("training baseline uses only pre-session HRV and an Unknown session censors later follow-up", () => {
  const start = "2026-03-01";
  const cycles = Array.from({ length: 34 }, (_, index) => {
    const date = shiftCalendarDateKey(start, index - 29);
    return cycle(date, { hrv: 50 });
  });
  const date = start;
  cycles.push(cycle(date, { id: "after-during-workout", cycleId: "after-during-workout", sleepEndedAt: `${date}T18:00:00.000Z`, hrv: 999 }));
  const sessions = [
    session("upper-session", date, "upper", 17),
    session("lower-session", date, "lower", 18),
    session("unknown-session", shiftCalendarDateKey(date, 2), "unknown", 17),
  ];
  const response = buildTrainingResponse(sessions, cycles, date, shiftCalendarDateKey(date, 4));
  const groupedExposure = response.points.filter((point) => point.sessionDate === date);
  assert.equal(response.unknownSessionCount, 1);
  assert.deepEqual(groupedExposure.map((point) => point.split), ["mixed", "mixed"]);
  assert.deepEqual(groupedExposure.map((point) => point.followupIndex), [1, 2]);
  assert.deepEqual(groupedExposure.map((point) => point.sessionId), ["upper-session,lower-session", "upper-session,lower-session"]);
  assert.ok(groupedExposure.every((point) => point.baselineHrv === 50));
  assert.ok(groupedExposure.every((point) => point.elapsedHours > 0));
  assert.equal(groupedExposure.some((point) => point.recoveryHrv === 999), false);
});

test("training response qualifies only with 12 eligible sessions across six weeks and reports lag counts", () => {
  const first = "2026-04-01";
  const end = shiftCalendarDateKey(first, 84);
  const cycles = Array.from({ length: 113 }, (_, index) => cycle(shiftCalendarDateKey(first, index - 28), { hrv: 50 + (index % 5) }));
  const sessions = Array.from({ length: 12 }, (_, index) => session(
    `session-${index}`, shiftCalendarDateKey(first, index * 7), index % 2 === 0 ? "upper" : "lower",
  ));
  const response = buildTrainingResponse(sessions, cycles, first, end);
  assert.equal(response.eligibleSessionCount, 12);
  assert.equal(response.sessionSpanDays, 78);
  assert.equal(response.qualified, true);
  assert.deepEqual(response.followupCounts, [12, 12, 12]);
  assert.equal(response.splitSummary.upper.eligibleSessionCount, 6);
  assert.equal(response.splitSummary.lower.eligibleSessionCount, 6);
});

test("strain relationship links only to the next completed scored recovery", () => {
  const exposure = cycle("2026-05-01", { strain: 15, endedAt: "2026-05-02T12:00:00.000Z" });
  const pending = cycle("2026-05-02", { id: "pending", cycleId: "pending", startedAt: "2026-05-02T12:01:00.000Z", completed: false, recoveryScore: null });
  const next = cycle("2026-05-03", { id: "next", cycleId: "next", startedAt: "2026-05-03T12:00:00.000Z", recoveryScore: 72 });
  const relationship = buildStrainRecoveryRelationship([exposure, pending, next], "2026-05-01", "2026-05-03");
  assert.equal(relationship.sampleCount, 1);
  assert.equal(relationship.points[0]?.x, 15);
  assert.equal(relationship.points[0]?.y, 72);
  assert.match(relationship.points[0]?.observationId ?? "", /cycle-2026-05-01:next/);
});
