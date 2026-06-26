const TIME_ZONE = "America/New_York";
const DAY_MS = 86_400_000;
const CAMPAIGN_START = "2026-06-25";
const FINAL_WEEK_START = "2026-07-10";
const CAMPAIGN_END = "2026-07-17";

export type CampaignWeightObservation = {
  date: string;
  weightLb: number;
};

export type CancunCampaignPhase = "inactive" | "cut" | "final_week" | "sharpening" | "complete";

export type CancunCampaign = {
  active: boolean;
  name: "Cancun wedding cut";
  phase: CancunCampaignPhase;
  endDate: string;
  daysRemaining: number;
  proteinTargetG: number;
  proteinMinimumG: number;
  averageCalorieTarget: number | null;
  trainingDayCalorieTarget: number | null;
  restDayCalorieTarget: number | null;
  dayType: "training" | "rest";
  qualifiedLossRateLbPerWeek: number | null;
  currentAverageWeightLb: number | null;
  previousAverageWeightLb: number | null;
  currentWindowCount: number;
  previousWindowCount: number;
  goalRangeStableDays: number;
  calorieAdjustment: number;
  evidence: string;
  plateauCue: string | null;
  finalWeek: boolean;
};

export type BloatEntry = {
  label: string;
  note: string | null;
  calories: number;
  fatG: number;
  loggedAt: string;
};

export function proteinCoachingStatus(
  proteinG: number,
  minimumG = 140,
  targetG = 160,
) {
  if (proteinG < minimumG) return "below_minimum" as const;
  if (proteinG < targetG) return "below_target" as const;
  return "complete" as const;
}

export function detectBloatContext(entries: BloatEntry[], finalWeek: boolean) {
  const triggerText = entries
    .map((entry) => `${entry.label} ${entry.note ?? ""}`.toLowerCase())
    .join(" ");
  const triggerFood =
    /(broccoli|cauliflower|brussels|cabbage|garlic|onion|crucifer|sulfur|alcohol|beer|wine|cocktail)/.test(
      triggerText,
    );
  const largeOrFatMeal = entries.some((entry) => entry.calories >= 800 || entry.fatG >= 35);
  const dairyStack =
    entries.filter((entry) =>
      /(yogurt|kefir|milk|cheese|dairy)/.test(`${entry.label} ${entry.note ?? ""}`.toLowerCase()),
    ).length >= 2;
  const lateMeal = entries.some((entry) => {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: TIME_ZONE,
        hour: "2-digit",
        hour12: false,
      }).format(new Date(entry.loggedAt)),
    );
    return hour >= 20;
  });
  return {
    active: finalWeek || triggerFood || largeOrFatMeal || dairyStack || lateMeal,
    finalWeek,
    triggerFood,
    largeOrFatMeal,
    dairyStack,
    lateMeal,
  };
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseDateKey(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
}

function shiftDateKey(value: string, days: number) {
  return dateKey(new Date(parseDateKey(value).getTime() + days * DAY_MS));
}

function differenceInDays(from: string, to: string) {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / DAY_MS);
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function rounded(value: number | null, digits = 1) {
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function dedupeWeights(observations: CampaignWeightObservation[]) {
  const byDay = new Map<string, number>();
  observations
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((entry) => byDay.set(entry.date.slice(0, 10), entry.weightLb));
  return byDay;
}

function windowAverage(weights: Map<string, number>, endDate: string) {
  const values: number[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const value = weights.get(shiftDateKey(endDate, -offset));
    if (typeof value === "number") values.push(value);
  }
  return { average: average(values), count: values.length };
}

function stableGoalDays(weights: Map<string, number>, today: string) {
  let stableDays = 0;
  for (let offset = 0; offset < 3; offset += 1) {
    const result = windowAverage(weights, shiftDateKey(today, -offset));
    if (
      result.count >= 4 &&
      result.average !== null &&
      result.average >= 161 &&
      result.average <= 162.5
    ) {
      stableDays += 1;
    } else {
      break;
    }
  }
  return stableDays;
}

function baseLane(weightLb: number | null) {
  if (weightLb !== null && weightLb >= 165) {
    return { average: 2400, training: 2500, rest: 2300, label: "165+ lb lane" };
  }
  if (weightLb !== null && weightLb >= 160 && weightLb <= 162) {
    return { average: 2300, training: 2400, rest: 2200, label: "160–162 lb lane" };
  }
  return { average: 2350, training: 2450, rest: 2250, label: "162–165 lb lane" };
}

export function buildCancunCampaign({
  now,
  observations,
  isTrainingDay,
}: {
  now: Date;
  observations: CampaignWeightObservation[];
  isTrainingDay: boolean;
}): CancunCampaign {
  const today = dateKey(now);
  const beforeCampaign = today < CAMPAIGN_START;
  const afterCampaign = today > CAMPAIGN_END;
  const active = !beforeCampaign && !afterCampaign;
  const weights = dedupeWeights(observations);
  const current = windowAverage(weights, today);
  const previous = windowAverage(weights, shiftDateKey(today, -7));
  const qualified =
    current.count >= 4 && previous.count >= 4 && current.average !== null && previous.average !== null;
  const lossRate = qualified ? rounded(previous.average! - current.average!, 2) : null;
  const currentAverage = rounded(current.average);
  const previousAverage = rounded(previous.average);
  const goalRangeStableDays = stableGoalDays(weights, today);
  const atOrBelowFloor = currentAverage !== null && currentAverage <= 160;
  const sharpening = active && (goalRangeStableDays >= 3 || atOrBelowFloor);
  const finalWeek = active && today >= FINAL_WEEK_START;

  if (!active) {
    return {
      active: false,
      name: "Cancun wedding cut",
      phase: afterCampaign ? "complete" : "inactive",
      endDate: CAMPAIGN_END,
      daysRemaining: Math.max(0, differenceInDays(today, CAMPAIGN_END)),
      proteinTargetG: 160,
      proteinMinimumG: 140,
      averageCalorieTarget: null,
      trainingDayCalorieTarget: null,
      restDayCalorieTarget: null,
      dayType: isTrainingDay ? "training" : "rest",
      qualifiedLossRateLbPerWeek: lossRate,
      currentAverageWeightLb: currentAverage,
      previousAverageWeightLb: previousAverage,
      currentWindowCount: current.count,
      previousWindowCount: previous.count,
      goalRangeStableDays,
      calorieAdjustment: 0,
      evidence: afterCampaign
        ? "Cancun campaign ended July 17; normal saved and smart targets are active."
        : "Cancun campaign has not started.",
      plateauCue: null,
      finalWeek: false,
    };
  }

  const lane = sharpening
    ? { average: 2400, training: 2500, rest: 2300, label: "goal-range sharpening lane" }
    : baseLane(currentAverage);
  const finalWeekFloor = finalWeek && lane.average < 2350
    ? { average: 2350, training: 2450, rest: 2250, label: "final-week consistency floor" }
    : lane;
  const calorieAdjustment = lossRate !== null && lossRate > 1.25 ? 150 : 0;
  const plateauCue =
    lossRate !== null && lossRate < 0.25
      ? "Weight trend is flat or slow. Audit oils, sauces, snacks, alcohol, and weekend drift before cutting calories; otherwise add 1,500–2,500 steps."
      : null;
  const adjusted = {
    average: finalWeekFloor.average + calorieAdjustment,
    training: finalWeekFloor.training + calorieAdjustment,
    rest: finalWeekFloor.rest + calorieAdjustment,
  };
  const phase: CancunCampaignPhase = sharpening ? "sharpening" : finalWeek ? "final_week" : "cut";
  const trendEvidence =
    lossRate === null
      ? `Loss rate unavailable (${current.count}/4 current and ${previous.count}/4 previous weigh-ins).`
      : lossRate > 1.25
        ? `Loss rate ${lossRate.toFixed(2)} lb/week is above 1.25; calories increased by 150.`
        : lossRate < 0.25
          ? `Loss rate ${lossRate.toFixed(2)} lb/week is below 0.25; calories held because adherence is unknown.`
          : `Loss rate ${lossRate.toFixed(2)} lb/week is within the acceptable 0.25–1.0+ lane; calories held.`;

  return {
    active: true,
    name: "Cancun wedding cut",
    phase,
    endDate: CAMPAIGN_END,
    daysRemaining: Math.max(0, differenceInDays(today, CAMPAIGN_END)),
    proteinTargetG: 160,
    proteinMinimumG: 140,
    averageCalorieTarget: adjusted.average,
    trainingDayCalorieTarget: adjusted.training,
    restDayCalorieTarget: adjusted.rest,
    dayType: isTrainingDay ? "training" : "rest",
    qualifiedLossRateLbPerWeek: lossRate,
    currentAverageWeightLb: currentAverage,
    previousAverageWeightLb: previousAverage,
    currentWindowCount: current.count,
    previousWindowCount: previous.count,
    goalRangeStableDays,
    calorieAdjustment,
    evidence: `${finalWeekFloor.label}; ${trendEvidence}`,
    plateauCue,
    finalWeek,
  };
}

export function activeCampaignCalorieTarget(campaign: CancunCampaign) {
  if (!campaign.active) return null;
  return campaign.dayType === "training"
    ? campaign.trainingDayCalorieTarget
    : campaign.restDayCalorieTarget;
}
