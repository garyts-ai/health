import type {
  DailyActivityContext,
  DailyLateNightDisruption,
  DailyReadiness,
  DailyStressFlags,
  DailyTrainingLoad,
} from "@/lib/insights/types";

export function makeReadiness(overrides: Partial<DailyReadiness> = {}): DailyReadiness {
  return {
    recoveryScore: 70,
    recoveryTrend3d: 68,
    bodyWeightKg: 79,
    bodyWeightDelta7dKg: 0,
    bodyWeightDelta28dKg: 0.4,
    whoopDayStrain: 10,
    whoopDayStrainVs7d: 0.5,
    sleepPerformance: 88,
    sleepHours: 8,
    sleepVsNeedHours: 0.2,
    sleepConsistency: 85,
    sleepEfficiency: 90,
    awakeHours: 0.4,
    latestSleepStart: "2026-05-02T03:00:00.000Z",
    latestSleepEnd: "2026-05-02T11:00:00.000Z",
    sleepStageSummary: {
      inBedHours: 8.4,
      awakeHours: 0.4,
      lightHours: 4.2,
      deepHours: 1.4,
      remHours: 2.4,
    },
    restingHeartRate: 50,
    restingHeartRateVs7d: 0,
    hrvRmssd: 70,
    hrvVs7d: 0,
    spo2Percentage: 98,
    respiratoryRate: 15,
    respiratoryRateVs7d: 0,
    skinTempCelsius: 0,
    skinTempVs7d: 0,
    whoopStrain7dAvg: 10,
    ...overrides,
  };
}

export function makeMissingReadiness(): DailyReadiness {
  return makeReadiness({
    recoveryScore: null,
    recoveryTrend3d: null,
    whoopDayStrain: null,
    whoopDayStrainVs7d: null,
    sleepPerformance: null,
    sleepHours: null,
    sleepVsNeedHours: null,
    sleepConsistency: null,
    sleepEfficiency: null,
    awakeHours: null,
    latestSleepStart: null,
    latestSleepEnd: null,
    sleepStageSummary: null,
    restingHeartRate: null,
    restingHeartRateVs7d: null,
    hrvRmssd: null,
    hrvVs7d: null,
    spo2Percentage: null,
    respiratoryRate: null,
    respiratoryRateVs7d: null,
    skinTempCelsius: null,
    skinTempVs7d: null,
    whoopStrain7dAvg: null,
  });
}

export function makeTraining(overrides: Partial<DailyTrainingLoad> = {}): DailyTrainingLoad {
  return {
    hevyVolume7d: 12_000,
    hevyVolume28dAvg: 11_000,
    hevySetCount7d: 50,
    hevyWorkoutCount7d: 4,
    hevySetCountThisWeek: 50,
    hevyWorkoutCountThisWeek: 4,
    hevyConsecutiveDays: 1,
    hevyLastWorkoutTitle: "Upper Body",
    hevyLastWorkoutAt: "2026-05-01T18:00:00.000Z",
    hevyLastWorkoutVolumeKg: 3_200,
    hevyLastWorkoutDurationSeconds: 3_600,
    recentLoadSpike: false,
    upperBodyDaysSince: 0,
    lowerBodyDaysSince: 2,
    pushDaysSince: 0,
    pullDaysSince: 3,
    muscleFocus: ["bench press", "lat pulldown"],
    upperSessionAnchors: ["Bench Press", "Lat Pulldown"],
    lowerSessionAnchors: ["Leg Press", "Seated Leg Curl"],
    weeklyMuscleFocus: [],
    weeklyMuscleVolume: [],
    latestWorkoutFocus: [],
    ...overrides,
  };
}

export function makeStressFlags(overrides: Partial<DailyStressFlags> = {}): DailyStressFlags {
  return {
    illnessRisk: false,
    poorSleepTrend: false,
    lowRecovery: false,
    elevatedRestingHeartRate: false,
    suppressedHrv: false,
    elevatedRespiratoryRate: false,
    elevatedSkinTemp: false,
    highTrainingLoad: false,
    localFatigueUpper: false,
    localFatigueLower: false,
    ...overrides,
  };
}

export function makeLateNight(
  overrides: Partial<DailyLateNightDisruption> = {},
): DailyLateNightDisruption {
  return {
    active: false,
    severity: "low",
    confidence: "low",
    likelyLane: "normal",
    headline: "No late-night disruption",
    blurb: "Sleep and physiology do not suggest a major overnight disruption.",
    supportingMetrics: [],
    ...overrides,
  };
}

export function makeActivityContext(
  overrides: Partial<DailyActivityContext> = {},
): DailyActivityContext {
  return {
    displayWindowLabel: "This week",
    currentWeekHasActivity: false,
    fallbackUsed: false,
    hasActivity: false,
    summaryLine: "No walks, tennis, or conditioning logged this week.",
    interpretation: "No extra conditioning load is affecting today.",
    latestSession: null,
    sessions: [],
    buckets: [],
    days: [],
    totalSessions: 0,
    totalDurationMinutes: 0,
    totalStrain: 0,
    totalDistanceMeter: null,
    ...overrides,
  };
}
