import assert from "node:assert/strict";
import test from "node:test";

import { buildRecentWorkoutDetailsForLlm } from "@/lib/insights/engine";

const now = new Date("2026-04-15T12:00:00.000Z");

test("buildRecentWorkoutDetailsForLlm summarizes quoted raw Hevy JSON with set types", () => {
  const details = buildRecentWorkoutDetailsForLlm(
    [
      {
        id: "workout-1",
        title: "Upper \"B\"",
        start_time: "2026-04-14T10:00:00.000Z",
        exercise_count: 2,
        set_count: 6,
        volume_kg: 1200,
        duration_seconds: 2700,
        raw_json: JSON.stringify({
          exercises: [
            {
              title: "Chest Press",
              sets: [
                { type: "warmup", weight_kg: 40, reps: 10 },
                { type: "normal", weight_kg: 80, reps: 8 },
                { type: "drop", weight_kg: 60, reps: 12 },
              ],
            },
            {
              title: "Pull-down",
              sets: [
                { type: "failure", weight_kg: 70, reps: 9 },
                { type: "normal", weight_kg: null, reps: 10 },
              ],
            },
          ],
        }),
      },
    ],
    now,
  );

  assert.equal(details.length, 1);
  assert.equal(details[0].title, 'Upper "B"');
  assert.equal(details[0].durationMinutes, 45);
  assert.equal(details[0].exercises[0].title, "Chest Press");
  assert.equal(details[0].exercises[0].setCount, 3);
  assert.equal(details[0].exercises[0].workingSetCount, 2);
  assert.match(details[0].exercises[0].topSetLabel ?? "", /176 lb x 8 reps/);
  assert.match(details[0].exercises[0].setSummary, /drop/);
  assert.match(details[0].exercises[1].setSummary, /bodyweight x 10 reps/);
});

test("buildRecentWorkoutDetailsForLlm falls back to latest four workouts and bounds exercises", () => {
  const oldWorkouts = Array.from({ length: 6 }, (_, index) => ({
    id: `old-${index}`,
    title: `Old ${index}`,
    start_time: `2026-03-0${Math.min(index + 1, 9)}T10:00:00.000Z`,
    exercise_count: 10,
    set_count: 20,
    volume_kg: null,
    duration_seconds: null,
    raw_json: JSON.stringify({
      exercises: Array.from({ length: 10 }, (__, exerciseIndex) => ({
        title: `Exercise ${exerciseIndex}`,
        sets: [],
      })),
    }),
  }));

  const details = buildRecentWorkoutDetailsForLlm(oldWorkouts, now);

  assert.equal(details.length, 4);
  assert.equal(details[0].title, "Old 0");
  assert.equal(details[0].exercises.length, 8);
  assert.equal(details[0].exercises[0].setSummary, "No set detail");
});

test("buildRecentWorkoutDetailsForLlm returns empty detail when no workouts are available", () => {
  assert.deepEqual(buildRecentWorkoutDetailsForLlm([], now), []);
});
