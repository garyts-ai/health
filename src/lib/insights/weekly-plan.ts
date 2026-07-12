import { dbAll } from "@/lib/db";
import { calendarDateFromKey, calendarDateKey, calendarWeekInterval } from "@/lib/calendar";
import type { DailyPhysiqueDecision, DailyReadiness, DailyTrainingLoad, WeeklyPlan, WeeklyPlanDay } from "@/lib/insights/types";

export function buildWeeklyPlanFromInputs({
  now,
  decision,
  readiness,
  trainingLoad,
  completed,
}: {
  now: Date;
  decision: DailyPhysiqueDecision;
  readiness: DailyReadiness;
  trainingLoad: DailyTrainingLoad;
  completed: Array<{ date: string; title: string | null }>;
}): WeeklyPlan {
  const interval = calendarWeekInterval(now);
  const today = calendarDateKey(now);
  const completedByDay = new Map(completed.map((item) => [calendarDateKey(item.date), item]));
  const completedLifts = completedByDay.size;
  let remaining = Math.max(0, 4 - completedLifts);
  let next: "Upper" | "Lower" = decision.nextTrainingTarget === "Lower" ? "Lower" : "Upper";
  let consecutivePlanned = 0;
  const days: WeeklyPlanDay[] = [];

  for (let index = 0; index < 7; index += 1) {
    const date = calendarDateFromKey(interval.startKey);
    date.setUTCDate(date.getUTCDate() + index);
    const key = calendarDateKey(date);
    const actual = completedByDay.get(key);
    const isToday = key === today;
    const futureSlots = 7 - index;
    let workoutType: WeeklyPlanDay["workoutType"] = "Rest";
    let state: WeeklyPlanDay["state"] = key < today ? "unobserved" : "planned";
    let intent: WeeklyPlanDay["intent"] = "Recover";
    let rationale = "No workout was recorded for this past date; no recovery state is inferred.";
    let guardrail: string | null = null;

    if (actual) {
      const lower = actual.title?.toLowerCase().includes("lower");
      workoutType = lower ? "Lower" : "Upper";
      state = "completed";
      intent = "Maintain";
      rationale = actual.title ?? `${workoutType} session completed`;
      consecutivePlanned += 1;
    } else if (isToday) {
      workoutType = decision.trainingAvailability === "Rest" ? "Rest" : decision.trainingTarget === "Either" ? next : decision.trainingTarget;
      state = "today";
      intent = decision.trainingAvailability === "Rest" ? "Recover" : decision.trainingIntent;
      rationale = decision.primaryDecisionReason;
      guardrail = decision.trainingAvailability === "Rest" ? null : "Back off if warm-up or live recovery confirms fatigue.";
      if (workoutType === "Upper" || workoutType === "Lower") {
        remaining = Math.max(0, remaining - 1);
        next = workoutType === "Upper" ? "Lower" : "Upper";
        consecutivePlanned += 1;
      } else consecutivePlanned = 0;
    } else if (key > today && remaining > 0) {
      const mustTrain = remaining >= futureSlots;
      const scheduleLift = mustTrain || consecutivePlanned < 2 && (index % 2 === 0 || remaining > Math.ceil(futureSlots / 2));
      if (scheduleLift) {
        workoutType = next;
        intent = mustTrain ? "Back off" : "Maintain";
        rationale = `${next} is next by split recency; ${remaining} ${remaining === 1 ? "lift remains" : "lifts remain"} for the weekly target.`;
        guardrail = "Change to recovery if WHOOP is red, illness-like, or sleep misses need by more than 1 hour.";
        next = next === "Upper" ? "Lower" : "Upper";
        remaining -= 1;
        consecutivePlanned += 1;
      } else consecutivePlanned = 0;
    } else consecutivePlanned = 0;

    const anchors = workoutType === "Upper" ? trainingLoad.upperSessionAnchors.slice(0, 3)
      : workoutType === "Lower" ? trainingLoad.lowerSessionAnchors.slice(0, 3) : [];
    days.push({
      date: key,
      label: new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" }).format(date),
      state, workoutType, intent, anchors,
      recoveryPriority: state === "unobserved" ? "No recorded workout; physiology not inferred" : workoutType === "Rest" ? "Sleep, walking, and low strain" : readiness.sleepVsNeedHours !== null && readiness.sleepVsNeedHours < -1 ? "Protect sleep after training" : "Normal recovery routine",
      rationale, guardrail, actualWorkout: actual?.title ?? null,
    });
  }
  return { generatedAt: now.toISOString(), weekStart: days[0].date, weekEnd: days[6].date, targetLifts: 4, completedLifts, days };
}

export async function buildWeeklyPlan(
  now: Date,
  decision: DailyPhysiqueDecision,
  readiness: DailyReadiness,
  trainingLoad: DailyTrainingLoad,
) {
  const interval = calendarWeekInterval(now);
  const completed = await dbAll<{ date: string; title: string | null }>(
    "SELECT start_time AS date, title FROM hevy_workouts WHERE start_time >= ? AND start_time < ? ORDER BY start_time",
    interval.start.toISOString(),
    interval.end.toISOString(),
  );
  return buildWeeklyPlanFromInputs({ now, decision, readiness, trainingLoad, completed });
}
