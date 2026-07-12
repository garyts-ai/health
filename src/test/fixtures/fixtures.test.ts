import assert from "node:assert/strict";
import test from "node:test";

import {
  makeCompleteHevyHistory,
  makeEmptyHevyHistory,
  makeHevyWorkout,
  makePartialHevyHistory,
} from "@/test/fixtures/hevy";
import {
  makeMismatchedWhoopReadiness,
  makeMissingWhoopReadiness,
  makeNapOnlyWhoopReadiness,
  makePartialWhoopReadiness,
  makeScoredWhoopReadiness,
  makeStaleWhoopReadiness,
  makeUnscoredWhoopReadiness,
} from "@/test/fixtures/whoop";

test("WHOOP scored fixture keeps sleep, recovery, and cycle coherent", () => {
  const fixture = makeScoredWhoopReadiness();
  const rawSleep = JSON.parse(fixture.sleep!.rawJson) as {
    cycle_id: number;
    score: { respiratory_rate: number };
  };

  assert.equal(fixture.cycle?.scoreState, "SCORED");
  assert.equal(fixture.sleep?.cycleId, fixture.cycle?.id);
  assert.equal(fixture.recovery?.cycleId, fixture.cycle?.id);
  assert.equal(fixture.sleep?.nap, false);
  assert.equal(rawSleep.cycle_id, fixture.cycle?.id);
  assert.equal(rawSleep.score.respiratory_rate, fixture.sleep?.respiratoryRate);
});

test("WHOOP edge fixtures isolate one validity condition at a time", () => {
  const stale = makeStaleWhoopReadiness();
  const mismatch = makeMismatchedWhoopReadiness();
  const missing = makeMissingWhoopReadiness();
  const napOnly = makeNapOnlyWhoopReadiness();
  const unscored = makeUnscoredWhoopReadiness();
  const partial = makePartialWhoopReadiness();

  assert.ok(
    new Date(stale.decisionAt).getTime() - new Date(stale.sleep!.end).getTime()
      > 36 * 60 * 60 * 1_000,
  );
  assert.notEqual(mismatch.recovery?.cycleId, mismatch.cycle?.id);
  assert.deepEqual(
    { cycle: missing.cycle, sleep: missing.sleep, recovery: missing.recovery },
    { cycle: null, sleep: null, recovery: null },
  );
  assert.equal(napOnly.sleep?.nap, true);
  assert.equal(unscored.recovery?.scoreState, "PENDING_SCORE");
  assert.equal(partial.recovery, null);
});

test("Hevy fixtures distinguish complete, partial, and empty histories", () => {
  const partialWorkout = makeHevyWorkout({
    title: null,
    description: null,
    routineId: null,
    volumeKg: null,
    durationSeconds: null,
  });

  assert.equal(makeCompleteHevyHistory().complete, true);
  assert.deepEqual(makeEmptyHevyHistory().workouts, []);
  assert.deepEqual(makePartialHevyHistory([partialWorkout]), {
    complete: false,
    workouts: [partialWorkout],
  });

  const rawWorkout = JSON.parse(makeHevyWorkout().rawJson) as {
    exercises: Array<{ title: string; sets: unknown[] }>;
  };
  assert.deepEqual(rawWorkout.exercises.map((exercise) => exercise.title), [
    "Bench Press",
    "Lat Pulldown",
  ]);
  assert.equal(rawWorkout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0), 6);
});
