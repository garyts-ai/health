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
  personalRange?: {
    center: number;
    lower: number;
    upper: number;
    sampleCount: number;
    robustZScore: number;
    status: "within" | "above" | "below";
  };
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
  exposureKey: string;
  exposureLabel: string;
  outcomeKey: string;
  outcomeLabel: string;
  analysisWindowDays: number;
  lagHours: number;
  exposedCount: number;
  comparisonCount: number;
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
  dataCoverage: DataCoverage;
};
