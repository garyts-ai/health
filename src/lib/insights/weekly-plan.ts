import { dbAll } from "@/lib/db";
import type { DailyNutritionTargets, DailyPhysiqueDecision, DailyReadiness, DailyTrainingLoad, WeeklyPlan, WeeklyPlanDay } from "@/lib/insights/types";

const TIME_ZONE = "America/New_York";
const DAY_MS = 86_400_000;

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

function monday(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(date);
  const localDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() - ((localDay + 6) % 7));
  return new Date(`${dateKey(copy)}T12:00:00.000Z`);
}

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
  const start = monday(now);
  const today = dateKey(now);
  const completedByDay = new Map(completed.map((item) => [item.date.slice(0, 10), item]));
  const completedLifts = completedByDay.size;
  let remaining = Math.max(0, 4 - completedLifts);
  let next: "Upper" | "Lower" = decision.nextTrainingTarget === "Lower" ? "Lower" : "Upper";
  let consecutivePlanned = 0;
  const days: WeeklyPlanDay[] = [];

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start.getTime() + index * DAY_MS);
    const key = dateKey(date);
    const actual = completedByDay.get(key);
    const isToday = key === today;
    const futureSlots = 7 - index;
    let workoutType: WeeklyPlanDay["workoutType"] = "Recovery";
    let state: WeeklyPlanDay["state"] = key < today ? "recovery" : "planned";
    let intent: WeeklyPlanDay["intent"] = "Recover";
    let rationale = "Use this as a recovery and preparation day.";
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
      label: new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: TIME_ZONE }).format(date),
      state, workoutType, intent, anchors,
      calorieTarget: null,
      proteinTargetG: null,
      recoveryPriority: workoutType === "Rest" || workoutType === "Recovery" ? "Sleep, walking, and low strain" : readiness.sleepVsNeedHours !== null && readiness.sleepVsNeedHours < -1 ? "Protect sleep after training" : "Normal recovery routine",
      rationale, guardrail, actualWorkout: actual?.title ?? null,
    });
  }
  return { weekStart: days[0].date, weekEnd: days[6].date, targetLifts: 4, completedLifts, days };
}

export async function buildWeeklyPlan(
  now: Date,
  decision: DailyPhysiqueDecision,
  readiness: DailyReadiness,
  trainingLoad: DailyTrainingLoad,
  nutritionTargets: DailyNutritionTargets,
) {
  const start = monday(now);
  const completed = await dbAll<{ date: string; title: string | null }>(
    "SELECT start_time AS date, title FROM hevy_workouts WHERE start_time >= ? ORDER BY start_time",
    start.toISOString(),
  );
  const plan = buildWeeklyPlanFromInputs({ now, decision, readiness, trainingLoad, completed });
  plan.days.forEach((day) => {
    const isLift = day.workoutType === "Upper" || day.workoutType === "Lower";
    day.calorieTarget = nutritionTargets.campaign.active
      ? isLift
        ? nutritionTargets.campaign.trainingDayCalorieTarget
        : nutritionTargets.campaign.restDayCalorieTarget
      : nutritionTargets.effectiveCalorieTarget;
    day.proteinTargetG = nutritionTargets.effectiveProteinTargetG;
  });
  return plan;
}
