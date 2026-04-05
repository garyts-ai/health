import type { HevyWorkoutSummary } from "@/lib/hevy/types";

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

type HevySetRecord = {
  weight_kg?: number | null;
  reps?: number | null;
};

type HevyExerciseRecord = {
  sets?: HevySetRecord[];
};

export function normalizeHevyWorkout(
  workout: Record<string, unknown>,
): HevyWorkoutSummary {
  const exercises = Array.isArray(workout.exercises)
    ? (workout.exercises as HevyExerciseRecord[])
    : [];

  const setCount = exercises.reduce((count, exercise) => {
    return count + (Array.isArray(exercise.sets) ? exercise.sets.length : 0);
  }, 0);

  const volumeKg = exercises.reduce((total, exercise) => {
    if (!Array.isArray(exercise.sets)) {
      return total;
    }

    return (
      total +
      exercise.sets.reduce((setTotal, setRecord) => {
        const weight = typeof setRecord.weight_kg === "number" ? setRecord.weight_kg : 0;
        const reps = typeof setRecord.reps === "number" ? setRecord.reps : 0;
        return setTotal + weight * reps;
      }, 0)
    );
  }, 0);

  const startTime = asString(workout.start_time) ?? new Date(0).toISOString();
  const endTime = asString(workout.end_time) ?? startTime;
  const durationSeconds = Math.max(
    0,
    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000),
  );

  return {
    id: asString(workout.id) ?? crypto.randomUUID(),
    title: asString(workout.title),
    description: asString(workout.description),
    routineId: asString(workout.routine_id),
    startTime,
    endTime,
    createdAt: asString(workout.created_at) ?? startTime,
    updatedAt: asString(workout.updated_at) ?? endTime,
    exerciseCount: exercises.length,
    setCount,
    volumeKg: volumeKg > 0 ? Number(volumeKg.toFixed(2)) : null,
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
    rawJson: JSON.stringify(workout),
  };
}

export function getLatestHevyWorkouts(workouts: HevyWorkoutSummary[], count = 3) {
  return [...workouts]
    .sort((left, right) => right.startTime.localeCompare(left.startTime))
    .slice(0, count);
}
