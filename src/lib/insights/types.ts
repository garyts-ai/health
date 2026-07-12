export type RecommendationCategory =
  | "training"
  | "recovery"
  | "caution";

export type RecommendationPriority = "high" | "medium" | "low";

export type RecommendationConfidence = "high" | "medium" | "low";

export type RecommendationActionIcon =
  | "rest"
  | "walk"
  | "technique"
  | "intensity"
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
  observationStatus?: "available" | "unavailable";
  observationReasons?: string[];
  observationObservedAt?: string | null;
  observationCycleId?: number | null;
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
  sleepStageSummary: {
    inBedHours: number | null;
    awakeHours: number | null;
    lightHours: number | null;
    deepHours: number | null;
    remHours: number | null;
  } | null;
  restingHeartRate: number | null;
  restingHeartRateVs7d: number | null;
  hrvRmssd: number | null;
  hrvVs7d: number | null;
  spo2Percentage: number | null;
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
  recentWorkoutDetails?: DailyRecentWorkoutDetail[];
};

export type DailyRecentWorkoutDetail = {
  id: string;
  title: string;
  startedAt: string;
  durationMinutes: number | null;
  volumeKg: number | null;
  setCount: number;
  exerciseCount: number;
  exercises: DailyRecentExerciseDetail[];
};

export type DailyRecentExerciseDetail = {
  title: string;
  setCount: number;
  workingSetCount: number;
  topSetLabel: string | null;
  setSummary: string;
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
  confidence: "high" | "medium" | "low";
  confidenceLabel: string;
};

export type DailyPhysiqueDecision = {
  trainingAvailability: "Train" | "Rest";
  trainingTarget: "Upper" | "Lower" | "Either";
  nextTrainingTarget: "Upper" | "Lower" | "Either";
  trainingTargetReason: string;
  trainingIntent: "Push" | "Maintain" | "Back off";
  intensityLabel: string;
  sessionAnchors: string[];
  mainBottleneck: string;
  primaryDecisionReason: string;
  daysLeftInWeek: number;
  liftsNeededForGoal: number;
  canStillHitWeeklyGoalIfRestToday: boolean;
  weeklyPaceLabel: string;
  decisionFactors: Array<{
    label: string;
    tone: "positive" | "caution" | "neutral";
    detail: string;
  }>;
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

export type DailyHistoricalContext = {
  available: boolean;
  importAgeTier: "current" | "aging" | "legacy" | "missing";
  coverageEnd: string | null;
  confidence: "high" | "medium" | "low";
  qualifier: string | null;
  strongestDeviation: string | null;
  strongestDeviationUnfavorable?: boolean;
  behaviorCue: string | null;
};

export type WeeklyPlanDay = {
  date: string;
  label: string;
  state: "completed" | "today" | "planned" | "recovery";
  workoutType: "Upper" | "Lower" | "Rest" | "Recovery";
  intent: "Push" | "Maintain" | "Back off" | "Recover";
  anchors: string[];
  recoveryPriority: string;
  rationale: string;
  guardrail: string | null;
  actualWorkout: string | null;
};

export type WeeklyPlan = {
  weekStart: string;
  weekEnd: string;
  targetLifts: number;
  completedLifts: number;
  days: WeeklyPlanDay[];
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
  | "adductors"
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
  dateKey?: string;
  label: string;
  value: number | null;
};

export type DailySleepWindow = {
  dateKey: string;
  label: string;
  start: string;
  end: string | null;
  sleepHours: number | null;
  inBedHours: number | null;
  awakeHours: number | null;
  lightHours: number | null;
  deepHours: number | null;
  remHours: number | null;
  sleepPerformance: number | null;
  sleepEfficiency: number | null;
};

export type DailyActivityKind = "walking" | "tennis" | "other_conditioning";

export type DailyActivitySession = {
  id: string;
  kind: DailyActivityKind;
  sportName: string;
  start: string;
  end: string | null;
  durationMinutes: number;
  strain: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  distanceMeter: number | null;
};

export type DailyActivityBucket = {
  kind: DailyActivityKind;
  label: string;
  count: number;
  durationMinutes: number;
  strain: number;
  distanceMeter: number | null;
};

export type DailyActivityDay = {
  dateKey: string;
  label: string;
  buckets: Array<{
    kind: DailyActivityKind;
    count: number;
    strain: number;
  }>;
  totalStrain: number;
  hasActivity: boolean;
};

export type DailyActivityContext = {
  displayWindowLabel: "This week" | "Last week";
  currentWeekHasActivity: boolean;
  fallbackUsed: boolean;
  hasActivity: boolean;
  summaryLine: string;
  interpretation: string;
  latestSession: DailyActivitySession | null;
  sessions: DailyActivitySession[];
  buckets: DailyActivityBucket[];
  days: DailyActivityDay[];
  totalSessions: number;
  totalDurationMinutes: number;
  totalStrain: number;
  totalDistanceMeter: number | null;
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
    sleepWindows7d: DailySleepWindow[];
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
  physiqueDecision: DailyPhysiqueDecision;
  activityContext: DailyActivityContext;
  bodyCard: BodyCardSummary;
  recommendations: DailyRecommendation[];
  freshness: DailyFreshness;
  whyChangedToday: DailyWhyChanged;
  historicalContext?: DailyHistoricalContext;
  weeklyPlan?: WeeklyPlan;
  llmPromptText: string;
};
