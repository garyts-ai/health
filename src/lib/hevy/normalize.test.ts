import assert from "node:assert/strict";
import test from "node:test";

import { getLatestHevyWorkouts, normalizeHevyWorkout } from "@/lib/hevy/normalize";

test("normalizeHevyWorkout derives counts, duration, and volume", () => {
  const workout = normalizeHevyWorkout({
    id: "workout-1",
    title: "Upper Body",
    description: "Push day",
    routine_id: "routine-1",
    start_time: "2026-04-03T10:00:00Z",
    end_time: "2026-04-03T11:15:00Z",
    created_at: "2026-04-03T11:15:00Z",
    updated_at: "2026-04-03T11:16:00Z",
    exercises: [
      {
        sets: [
          { weight_kg: 100, reps: 5 },
          { weight_kg: 90, reps: 8 },
        ],
      },
      {
        sets: [{ weight_kg: 30, reps: 12 }],
      },
    ],
  });

  assert.equal(workout.exerciseCount, 2);
  assert.equal(workout.setCount, 3);
  assert.equal(workout.durationSeconds, 4500);
  assert.equal(workout.volumeKg, 1580);
});

test("getLatestHevyWorkouts sorts newest first", () => {
  const workouts = getLatestHevyWorkouts([
    {
      id: "1",
      title: null,
      description: null,
      routineId: null,
      startTime: "2026-04-01T00:00:00Z",
      endTime: "2026-04-01T01:00:00Z",
      createdAt: "2026-04-01T01:00:00Z",
      updatedAt: "2026-04-01T01:00:00Z",
      exerciseCount: 1,
      setCount: 1,
      volumeKg: null,
      durationSeconds: 3600,
      rawJson: "{}",
    },
    {
      id: "2",
      title: null,
      description: null,
      routineId: null,
      startTime: "2026-04-03T00:00:00Z",
      endTime: "2026-04-03T01:00:00Z",
      createdAt: "2026-04-03T01:00:00Z",
      updatedAt: "2026-04-03T01:00:00Z",
      exerciseCount: 1,
      setCount: 1,
      volumeKg: null,
      durationSeconds: 3600,
      rawJson: "{}",
    },
  ]);

  assert.equal(workouts[0]?.id, "2");
});
