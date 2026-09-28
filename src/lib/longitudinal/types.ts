export type StatementType =
  | "direct_observation"
  | "deterministic_calculation"
  | "trend_description"
  | "personal_baseline_comparison"
  | "recorded_association"
  | "data_limitation"
  | "unknown";

export type TrendDirection =
  | "upward"
  | "downward"
  | "improving"
  | "stable"
  | "mixed"
  | "weakening"
  | "insufficient_data";

export type TrendInterpretation = "favorable" | "unfavorable" | "neutral" | "unknown";
export type TrendConfidence = "high" | "moderate" | "low" | "insufficient";

export type LongitudinalSource = "WHOOP live API" | "WHOOP export" | "Hevy" | "Derived";

export type SourceProvenance = {
  sources: LongitudinalSource[];
  sourceRecordIds: string[];
  rawTimestamps: string[];
  normalizedDates: string[];
  timezone: string;
  syncTimestamps: string[];
};

export type MetricPoint = {
  date: string;
  value: number | null;
  sources?: LongitudinalSource[];
  observationIds?: string[];
  personalRange?: {
    center: number;
    lower: number;
    upper: number;
    sampleCount: number;
    robustZScore: number;
    status: "within" | "above" | "below";
  };
};

export type WhoopCycleObservation = {
  id: string;
  date: string;
  source: "WHOOP live API" | "WHOOP export";
  cycleId: string | null;
  sleepId: string | null;
  startedAt: string;
  endedAt: string | null;
  sleepStartedAt: string | null;
  sleepEndedAt: string | null;
  completed: boolean;
  scoreState: string | null;
  recoveryValid: boolean;
  sleepValid: boolean;
  strainValid: boolean;
  recoveryScore: number | null;
  restingHeartRate: number | null;
  hrv: number | null;
  spo2: number | null;
  skinTemperature: number | null;
  strain: number | null;
  respiratoryRate: number | null;
  sleepMinutes: number | null;
  sleepNeedMinutes: number | null;
  sleepEfficiency: number | null;
  sleepConsistency: number | null;
  calibrating: boolean;
  validity: string[];
  provenance: SourceProvenance;
};

export type WhoopSleepObservation = {
  id: string;
  cycleId: string | null;
  date: string;
  source: "WHOOP live API" | "WHOOP export";
  startedAt: string;
  endedAt: string;
  nap: boolean;
  scoreState: string | null;
  sleepMinutes: number | null;
  sleepNeedMinutes: number | null;
  sleepEfficiency: number | null;
  sleepConsistency: number | null;
  validity: string[];
  provenance: SourceProvenance;
};

export type WhoopActivityObservation = {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string;
  title: string;
  strain: number | null;
  source: "WHOOP live API" | "WHOOP export";
  completed: boolean;
};

export type HevySessionObservation = {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string;
  title: string | null;
  split: "upper" | "lower" | "mixed" | "unknown";
  exercises: string[];
  setCount: number;
  source: "Hevy";
};

export type AnalysisRange = "7d" | "30d" | "90d" | "365d" | "all";
export type AnalysisView = "overview" | "sleep" | "training" | "recorded";

export type AnalysisFinding = {
  id: string;
  kind: "period_difference" | "sustained_trend" | "current_deviation";
  metricId: string;
  label: string;
  unit: string;
  currentStart: string;
  currentEnd: string;
  comparisonStart: string | null;
  comparisonEnd: string | null;
  currentMedian: number;
  comparisonMedian: number | null;
  difference: number | null;
  relativeDifference: number | null;
  standardizedDifference: number | null;
  slopePerWeek: number | null;
  currentCount: number;
  comparisonCount: number;
  currentCoverage: number;
  comparisonCoverage: number | null;
  persistenceDays: number;
  evidence: "supported" | "exploratory" | "insufficient";
  source: LongitudinalSource[];
  summary: string;
};

export type LongitudinalAnalysis = {
  methodVersion: string;
  range: AnalysisRange;
  endDate: string;
  startDate: string;
  comparisonStartDate: string | null;
  comparisonEndDate: string | null;
  findings: AnalysisFinding[];
  eligibleMetricCount: number;
  excludedMetricCount: number;
  exclusions: string[];
};

export type RelationshipPoint = { date: string; x: number; y: number; observationId: string };

export type ExploratoryRelationship = {
  id: string;
  methodVersion: string;
  exposureKey: string;
  exposureLabel: string;
  outcomeKey: string;
  outcomeLabel: string;
  exposureUnit: string;
  outcomeUnit: string;
  startDate: string | null;
  endDate: string | null;
  sampleCount: number;
  eligibleCount: number;
  excludedCount: number;
  rankCorrelation: number | null;
  lowerExposureMedian: number | null;
  higherExposureMedian: number | null;
  medianDifference: number | null;
  bootstrapInterval: [number, number] | null;
  points: RelationshipPoint[];
  evidence: "exploratory" | "insufficient";
  method: string;
  limitations: string[];
};

export type TrainingResponsePoint = {
  sessionId: string;
  sessionDate: string;
  split: "upper" | "lower" | "mixed";
  followupIndex: number;
  recoveryDate: string;
  elapsedHours: number;
  baselineHrv: number | null;
  recoveryHrv: number | null;
  difference: number | null;
};

export type TrainingResponseAnalysis = {
  methodVersion: string;
  metric: "hrv";
  eligibleSessionCount: number;
  excludedSessionCount: number;
  sessionSpanDays: number;
  qualified: boolean;
  followupCounts: [number, number, number];
  splitSummary: Record<"upper" | "lower" | "mixed", {
    eligibleSessionCount: number;
    sessionSpanDays: number;
    qualified: boolean;
    followupCounts: [number, number, number];
  }>;
  unknownSessionCount: number;
  points: TrainingResponsePoint[];
  exclusions: string[];
  limitations: string[];
};

export type AnalysisMetricSeries = Pick<MetricTrend, "id" | "domainId" | "label" | "unit" | "points" | "baselineValue" | "confidence" | "coveredDays" | "expectedDays"> & { granularity: "daily" | "weekly" };

export type WhoopAnalysisSelectionView = {
  generatedAt: string;
  timezone: string;
  selectedView: AnalysisView;
  selectedMetric: string | null;
  analysis: LongitudinalAnalysis;
  metrics: AnalysisMetricSeries[];
  cycles: WhoopCycleObservation[];
  latestCycles: WhoopCycleObservation[];
  sleeps: WhoopSleepObservation[];
  activities: WhoopActivityObservation[];
  sessions: HevySessionObservation[];
  relationships: ExploratoryRelationship[];
  trainingResponse: TrainingResponseAnalysis;
  recordedAssociations: RecordedAssociation[];
  journalEvents: JournalEventViewModel[];
  freshness: { lastSyncCompletedAt: string | null; lastSyncStatus: string | null; isStale: boolean };
};

export type MetricTrend = {
  id: string;
  domainId: string;
  label: string;
  unit: string;
  direction: TrendDirection;
  interpretation: TrendInterpretation;
  confidence: TrendConfidence;
  statementType: StatementType;
  observation: string;
  windowDays: number;
  startDate: string | null;
  endDate: string | null;
  currentValue: number | null;
  baselineValue: number | null;
  absoluteChange: number | null;
  relativeChange: number | null;
  slopePerWeek: number | null;
  persistenceDays: number;
  personalPercentile: number | null;
  variability: number | null;
  coveredDays: number;
  expectedDays: number;
  coverage: number;
  points: MetricPoint[];
  provenance: SourceProvenance;
  limitations: string[];
};

export type HealthDomainTrend = {
  id: string;
  label: string;
  direction: TrendDirection;
  confidence: TrendConfidence;
  metrics: MetricTrend[];
  largestShiftMetricId: string | null;
  mostPersistentMetricId: string | null;
  summary: string;
  limitations: string[];
};

export type NotableTrend = {
  id: string;
  metricIds: string[];
  title: string;
  observation: string;
  startDate: string;
  endDate: string;
  magnitude: string;
  persistenceDays: number;
  confidence: TrendConfidence;
  statementType: StatementType;
  provenance: SourceProvenance;
  limitations: string[];
};

export type CurrentDeviationMetric = {
  metricId: string;
  label: string;
  value: number;
  baselineMedian: number;
  robustZScore: number;
  direction: "above" | "below";
  provenance: SourceProvenance;
};

export type CurrentDeviation = {
  active: boolean;
  date: string;
  deviatingMetricIds: string[];
  metrics: CurrentDeviationMetric[];
  summary: string | null;
  changesLongTermAggregate: false;
};

export type RecordedAssociation = {
  id: string;
  methodVersion?: string;
  exposureKey: string;
  exposureLabel: string;
  outcomeKey: string;
  outcomeLabel: string;
  analysisWindowDays: number;
  lagHours: number;
  exposedCount: number;
  comparisonCount: number;
  eligibleCount?: number;
  excludedCount?: number;
  exposedMedian: number | null;
  comparisonMedian: number | null;
  absoluteDifference: number | null;
  relativeDifference: number | null;
  confidence: TrendConfidence;
  matchingMethod: string;
  sensitivityChecksPassed: string[];
  claim: "association_detected" | "no_clear_association" | "insufficient_data";
  observation: string;
  statementType: "recorded_association" | "data_limitation";
  provenance: SourceProvenance;
  limitations: string[];
  exposedDates?: string[];
  comparisonDates?: string[];
  sampleValues?: Array<{ date: string; answer: "yes" | "no"; value: number; observationId: string }>;
  exposedDispersion?: number | null;
  comparisonDispersion?: number | null;
  robustEffectSize?: number | null;
  bootstrapInterval?: [number, number] | null;
};

export type JournalEventType =
  | "alcohol"
  | "caffeine"
  | "late_meal"
  | "travel"
  | "illness"
  | "stress"
  | "medication"
  | "hydration"
  | "menstrual_cycle"
  | "other";

export type JournalEventViewModel = {
  id: string;
  type: JournalEventType;
  label: string;
  occurredAt: string;
  physiologicalDate: string;
  icon: string;
  metadata: Record<string, string | number | boolean | null>;
  source: "WHOOP Journal";
};

export type AlcoholLogEntry = {
  id: string;
  occurredAt: string;
  physiologicalDate: string;
  source: "WHOOP Journal";
  notes?: string | null;
  quantity?: number | null;
  metadata?: Record<string, unknown>;
};

export type AlcoholLogSummary = {
  thisMonthCount: number;
  last30dCount: number;
  last90dCount: number;
  latestEntryDate: string | null;
  currentAlcoholFreeStreakDays: number | null;
  longestAlcoholFreeStreakDays: number | null;
};

export type AlcoholCalendarDay = {
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasAlcoholEntry: boolean;
  entryCount: number;
  entryIds: string[];
};

export type AlcoholLogViewModel = {
  summary: AlcoholLogSummary;
  selectedMonth: string;
  calendarDays: AlcoholCalendarDay[];
  heatmapDays: AlcoholCalendarDay[];
  entries: AlcoholLogEntry[];
  coverage: {
    sourceAvailable: boolean;
    latestImportAt: string | null;
    coverageEnd: string | null;
    rawAnswerCount: number;
    deduplicatedAnswerCount: number;
    alcoholQuestionCount: number;
  };
};

export type DomainDisplayMetric = {
  id: string;
  label: string;
  unit: string;
  baselineValue: number | null;
  currentValue: number | null;
  absoluteChange: number | null;
  relativeChange: number | null;
  direction: TrendDirection;
  interpretation: TrendInterpretation;
  points: MetricPoint[];
};

export type DomainCardViewModel = {
  id: string;
  title: string;
  direction: TrendDirection;
  primaryMetric: DomainDisplayMetric | null;
  secondaryMetric: DomainDisplayMetric | null;
  observation: string;
  chartType: "sparkline" | "weekly_bars" | "distribution" | "smoothed_line";
  confidence: TrendConfidence;
  coveredDays: number;
  expectedDays: number;
};

export type CoverageDetail = {
  covered: number;
  expected: number;
  ratio: number;
  startDate: string | null;
  endDate: string | null;
};

export type DataCoverage = {
  overall: number;
  windowDays: number;
  bySource: Record<string, CoverageDetail>;
  byDomain: Record<string, CoverageDetail>;
  availableInputs: string[];
  unavailableInputs: string[];
  limitations: string[];
  coveredDays?: number;
  expectedDays?: number;
  summary?: string;
};

export type AggregateTrend = {
  direction: TrendDirection;
  confidence: TrendConfidence;
  improvingCount: number;
  stableCount: number;
  weakeningCount: number;
  evaluatedMetricCount: number;
  summary: string;
  subtitle: string;
  excludedMetricIds: string[];
};

export type LongitudinalHealthView = {
  generatedAt: string;
  selectedDate: string;
  timezone: string;
  windowDays: number;
  aggregateTrend: AggregateTrend;
  domains: {
    physiology: HealthDomainTrend;
    sleep: HealthDomainTrend;
    cardiovascularActivity: HealthDomainTrend;
    dailyMovement: HealthDomainTrend;
    strength: HealthDomainTrend;
    bodyWeight: HealthDomainTrend;
    /** @deprecated Recorded events are an event stream, not a health domain. */
    recordedBehaviors?: HealthDomainTrend;
  };
  currentDeviation: CurrentDeviation;
  notableTrends: NotableTrend[];
  recordedAssociations: RecordedAssociation[];
  journalEvents?: JournalEventViewModel[];
  alcoholLog?: AlcoholLogViewModel;
  domainCards?: DomainCardViewModel[];
  cycleObservations?: WhoopCycleObservation[];
  sleepObservations?: WhoopSleepObservation[];
  activityObservations?: WhoopActivityObservation[];
  hevySessions?: HevySessionObservation[];
  analysis?: LongitudinalAnalysis;
  sleepRelationships?: ExploratoryRelationship[];
  strainRelationship?: ExploratoryRelationship;
  trainingResponse?: TrainingResponseAnalysis;
  dataCoverage: DataCoverage;
};
