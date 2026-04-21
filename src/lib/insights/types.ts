export type RecommendationCategory =
  | "training"
  | "nutrition"
  | "recovery"
  | "supplement"
  | "caution";

export type RecommendationPriority = "high" | "medium" | "low";

export type RecommendationConfidence = "high" | "medium" | "low";

export type RecommendationActionIcon =
  | "rest"
  | "walk"
  | "technique"
  | "electrolytes"
  | "food"
  | "ginger"
  | "stomach"
  | "protein"
  | "carbs"
  | "fuel"
  | "sleep"
  | "stress"
  | "symptoms";

export type RecommendationActionTile = {
  label: string;
  icon: RecommendationActionIcon;
  conditionLabel?: string;
};

export type DailyRecommendation = {
  category: RecommendationCategory;
  title: string;
  priority: RecommendationPriority;
  confidence: RecommendationConfidence;
  action: string;
  actionBullets: string[];
  primaryActions: RecommendationActionTile[];
  conditionalActions?: RecommendationActionTile[];
  why: string;
  supportingMetrics: string[];
};

export type DailyFreshness = {
  whoop: {
    connected: boolean;
    isStale: boolean;
    lastSyncCompletedAt: string | null;
  };
  hevy: {
    connected: boolean;
    isStale: boolean;
    lastSyncCompletedAt: string | null;
  };
};

export type DailyReadiness = {
  recoveryScore: number | null;
  recoveryTrend3d: number | null;
  bodyWeightKg: number | null;
  bodyWeightDelta7dKg: number | null;
  bodyWeightDelta28dKg: number | null;
  whoopDayStrain: number | null;
  whoopDayStrainVs7d: number | null;
  sleepPerformance: number | null;
  sleepHours: number | null;
  sleepVsNeedHours: number | null;
  sleepConsistency: number | null;
  sleepEfficiency: number | null;
  awakeHours: number | null;
  latestSleepStart: string | null;
  latestSleepEnd: string | null;
  restingHeartRate: number | null;
  restingHeartRateVs7d: number | null;
  hrvRmssd: number | null;
  hrvVs7d: number | null;
  respiratoryRate: number | null;
  respiratoryRateVs7d: number | null;
  skinTempCelsius: number | null;
  skinTempVs7d: number | null;
  whoopStrain7dAvg: number | null;
};

export type LateNightDisruptionLane = "hangover_like" | "illness_like" | "unclear" | "normal";

export type DailyLateNightDisruption = {
  active: boolean;
  severity: "high" | "medium" | "low";
  confidence: RecommendationConfidence;
  likelyLane: LateNightDisruptionLane;
  headline: string;
  blurb: string;
  supportingMetrics: string[];
};

export type DailyOvernightRead = {
  label: string;
  tone: "normal" | "warning" | "caution" | "danger";
  detail: string;
  lane: LateNightDisruptionLane;
};

export type DailyTrainingLoad = {
  hevyVolume7d: number;
  hevyVolume28dAvg: number;
  hevySetCount7d: number;
  hevyWorkoutCount7d: number;
  hevySetCountThisWeek: number;
  hevyWorkoutCountThisWeek: number;
  hevyConsecutiveDays: number;
  hevyLastWorkoutTitle: string | null;
  hevyLastWorkoutAt: string | null;
  hevyLastWorkoutVolumeKg: number | null;
  hevyLastWorkoutDurationSeconds: number | null;
  recentLoadSpike: boolean;
  upperBodyDaysSince: number | null;
  lowerBodyDaysSince: number | null;
  pushDaysSince: number | null;
  pullDaysSince: number | null;
  muscleFocus: string[];
  upperSessionAnchors: string[];
  lowerSessionAnchors: string[];
  weeklyMuscleFocus: Array<{
    label: string;
    hits: number;
  }>;
  weeklyMuscleVolume: Array<{
    label: string;
    effectiveSets: number;
    hits: number;
  }>;
  latestWorkoutFocus: string[];
};

export type DailyNutritionTargets = {
  calorieTarget: number | null;
  proteinTargetG: number | null;
  effectiveCalorieTarget: number | null;
  effectiveProteinTargetG: number | null;
  smartCalorieTarget: number | null;
  smartProteinTargetG: number | null;
  targetSource: "manual" | "smart" | "missing";
  smartReason: string;
  updatedAt: string | null;
};

export type DailyWeightTrend = {
  currentLb: number | null;
  average7dLb: number | null;
  weeklyDeltaLb: number | null;
};

export type DailyStrengthProgression = {
  exercise: string;
  latestValue: number | null;
  previousValue: number | null;
  delta: number | null;
  latestLabel: string;
  previousLabel: string;
  deltaLabel: string;
  trend: "up" | "down" | "flat" | "unknown";
};

export type DailyPhysiqueDecision = {
  trainingTarget: "Upper" | "Lower" | "Either";
  trainingTargetReason: string;
  trainingIntent: "Push" | "Maintain" | "Back off";
  intensityLabel: string;
  sessionAnchors: string[];
  calorieRecommendation: "maintain" | "+150 cal" | "-150 cal" | "set target";
  calorieTargetLabel: string;
  proteinTargetLabel: string;
  mainBottleneck: string;
  weightTrend: DailyWeightTrend;
  strengthProgression: DailyStrengthProgression[];
  weeklyScorecard: Array<{
    label: string;
    value: string;
    detail: string;
    status: "good" | "watch" | "missing";
  }>;
};

export type DailyStressFlags = {
  illnessRisk: boolean;
  poorSleepTrend: boolean;
  lowRecovery: boolean;
  elevatedRestingHeartRate: boolean;
  suppressedHrv: boolean;
  elevatedRespiratoryRate: boolean;
  elevatedSkinTemp: boolean;
  highTrainingLoad: boolean;
  localFatigueUpper: boolean;
  localFatigueLower: boolean;
};

export type DailyWhyChanged = {
  headline: string;
  deltas: string[];
};

export type BodyRegionId =
  | "chest"
  | "frontDelts"
  | "sideDelts"
  | "rearDelts"
  | "biceps"
  | "triceps"
  | "forearms"
  | "lats"
  | "upperBack"
  | "traps"
  | "abs"
  | "obliques"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

export type BodyHighlightIntensity = "low" | "medium" | "high";

export type BodyHighlight = {
  regionId: BodyRegionId;
  intensity: BodyHighlightIntensity;
  view: "front" | "back";
};

export type BodyCardSummary = {
  recoveryScore: number | null;
  sleepHours: number | null;
  weightLb: number | null;
  latestWorkoutName: string | null;
  highlightedRegions: BodyHighlight[];
  weeklyHighlightedRegions: BodyHighlight[];
  latestWorkoutOverlayRegions: BodyHighlight[];
  displayRegions: Array<{
    regionId: BodyRegionId;
    label: string;
    intensity: BodyHighlightIntensity;
    view: "front" | "back";
  }>;
};

export type TrendPoint = {
  label: string;
  value: number | null;
};

export type DailySummary = {
  date: string;
  contextLine: string;
  miniTrends: {
    recovery3d: Array<number | null>;
    strain3d: Array<number | null>;
    sleep3d: Array<number | null>;
    weightTrend: Array<number | null>;
    liftsThisWeek: number;
  };
  trendSeries: {
    recovery7d: TrendPoint[];
    sleep7d: TrendPoint[];
    strain7d: TrendPoint[];
    load7d: TrendPoint[];
    weight14d: TrendPoint[];
  };
  readiness: DailyReadiness;
  trainingLoad: DailyTrainingLoad;
  stressFlags: DailyStressFlags;
  lateNightDisruption: DailyLateNightDisruption;
  overnightRead: DailyOvernightRead;
  strainSummary: {
    score: number | null;
    blurb: string;
    supportingPoints: string[];
  };
  nutritionTargets: DailyNutritionTargets;
  physiqueDecision: DailyPhysiqueDecision;
  bodyCard: BodyCardSummary;
  recommendations: DailyRecommendation[];
  freshness: DailyFreshness;
  whyChangedToday: DailyWhyChanged;
  llmPromptText: string;
};

export type DiscordDeliveryTrigger = "manual" | "scheduled";

export type DiscordDeliveryRunStatus = "success" | "failed" | "skipped";

export type DiscordDeliveryStatus = {
  today: {
    dateKey: string;
    lastStatus: DiscordDeliveryRunStatus | null;
    lastTrigger: DiscordDeliveryTrigger | null;
    lastSentAt: string | null;
    lastErrorMessage: string | null;
    hasSuccessfulSend: boolean;
    scheduledSentAt: string | null;
  };
  latestSuccessfulSendAt: string | null;
};
