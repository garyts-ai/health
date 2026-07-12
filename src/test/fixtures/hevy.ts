import type { HevyWorkoutSummary } from "@/lib/hevy/types";

export type HevyHistoryFixture = {
  complete: boolean;
  workouts: HevyWorkoutSummary[];
};

export function makeHevyWorkout(
  overrides: Partial<HevyWorkoutSummary> = {},
): HevyWorkoutSummary {
  const value: HevyWorkoutSummary = {
    id: "hevy-workout-1",
    title: "Upper Body",
    description: "Deterministic fixture",
    routineId: "routine-upper",
    startTime: "2026-05-01T18:00:00.000Z",
    endTime: "2026-05-01T19:00:00.000Z",
    createdAt: "2026-05-01T19:00:00.000Z",
    updatedAt: "2026-05-01T19:01:00.000Z",
    exerciseCount: 2,
    setCount: 6,
    volumeKg: 3_650,
    durationSeconds: 3_600,
    rawJson: "{}",
    ...overrides,
  };

  return {
    ...value,
    rawJson: overrides.rawJson ?? JSON.stringify({
      id: value.id,
      title: value.title,
      description: value.description,
      routine_id: value.routineId,
      start_time: value.startTime,
      end_time: value.endTime,
      created_at: value.createdAt,
      updated_at: value.updatedAt,
      exercises: [
        {
          title: "Bench Press",
          sets: [
            { type: "normal", weight_kg: 100, reps: 5 },
            { type: "normal", weight_kg: 90, reps: 8 },
            { type: "normal", weight_kg: 80, reps: 10 },
          ],
        },
        {
          title: "Lat Pulldown",
          sets: [
            { type: "normal", weight_kg: 60, reps: 8 },
            { type: "normal", weight_kg: 55, reps: 10 },
            { type: "normal", weight_kg: 50, reps: 12 },
          ],
        },
      ],
    }),
  };
}

export function makeCompleteHevyHistory(
  workouts: HevyWorkoutSummary[] = [makeHevyWorkout()],
): HevyHistoryFixture {
  return { complete: true, workouts };
}

export function makePartialHevyHistory(
  workouts: HevyWorkoutSummary[] = [makeHevyWorkout()],
): HevyHistoryFixture {
  return { complete: false, workouts };
}

export function makeEmptyHevyHistory(): HevyHistoryFixture {
  return { complete: true, workouts: [] };
}
