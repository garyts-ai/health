import { assertLongitudinalCopySafe } from "@/lib/longitudinal-copy-safety";
import type {
  CoverageDetail,
  ExploratoryRelationship,
  HealthDomainTrend,
  LongitudinalHealthView,
  MetricTrend,
  NotableTrend,
  RecordedAssociation,
  SourceProvenance,
  TrainingResponseAnalysis,
} from "@/lib/longitudinal/types";

export const LONGITUDINAL_QUESTION_PLACEHOLDER =
  "[Add the health-data question you want the external LLM to investigate.]";

function text(value: string | number | null | undefined, fallback = "Not available") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
  return value;
}

function list(values: readonly string[] | undefined, fallback = "None") {
  return values?.length ? values.join(" | ") : fallback;
}

function dateRange(dates: readonly string[]) {
  if (!dates.length) return "unavailable";
  const ordered = [...dates].sort();
  return `${ordered[0]} through ${ordered.at(-1)}`;
}

function provenanceSummary(provenance: SourceProvenance) {
  const latestSync = provenance.syncTimestamps.length
    ? [...provenance.syncTimestamps].sort().at(-1)
    : null;
  return [
    `sources=${list(provenance.sources)}`,
    `records=${provenance.sourceRecordIds.length}`,
    `dates=${dateRange(provenance.normalizedDates)}`,
    `timezone=${text(provenance.timezone)}`,
    `latestSync=${text(latestSync)}`,
  ].join("; ");
}

function metricLine(metric: MetricTrend) {
  return [
    `id=${metric.id}`,
    `label=${metric.label}`,
    `window=${metric.windowDays}d (${text(metric.startDate)} through ${text(metric.endDate)})`,
    `current=${text(metric.currentValue)}${metric.unit}`,
    `baseline=${text(metric.baselineValue)}${metric.unit}`,
    `direction=${metric.direction}`,
    `interpretation=${metric.interpretation}`,
    `absoluteChange=${text(metric.absoluteChange)}${metric.unit}`,
    `relativeChange=${text(metric.relativeChange)}%`,
    `persistence=${metric.persistenceDays}d`,
    `confidence=${metric.confidence}`,
    `coverage=${metric.coveredDays}/${metric.expectedDays} (${text(metric.coverage)})`,
    `percentile=${text(metric.personalPercentile)}`,
    `observation=${metric.observation}`,
    `provenance: ${provenanceSummary(metric.provenance)}`,
    `limitations=${list(metric.limitations)}`,
  ].join("; ");
}

function domainLines(domains: LongitudinalHealthView["domains"]) {
  return Object.values(domains).flatMap((domain: HealthDomainTrend) => [
    `- ${domain.label}: direction=${domain.direction}; confidence=${domain.confidence}; summary=${domain.summary}`,
    ...(domain.metrics.length
      ? domain.metrics.map((metric) => `  - ${metricLine(metric)}`)
      : ["  - No metric trends available"]),
    ...(domain.limitations.length ? [`  - Limitations: ${list(domain.limitations)}`] : []),
  ]);
}

function coverageDetail(label: string, detail: CoverageDetail) {
  return `${label}=${detail.covered}/${detail.expected} (${text(detail.ratio)}), ${text(detail.startDate)} through ${text(detail.endDate)}`;
}

function notableLine(trend: NotableTrend) {
  return [
    `id=${trend.id}`,
    `metrics=${list(trend.metricIds)}`,
    `title=${trend.title}`,
    `observation=${trend.observation}`,
    `period=${trend.startDate} through ${trend.endDate}`,
    `magnitude=${trend.magnitude}`,
    `persistence=${trend.persistenceDays}d`,
    `confidence=${trend.confidence}`,
    `statementType=${trend.statementType}`,
    `provenance: ${provenanceSummary(trend.provenance)}`,
    `limitations=${list(trend.limitations)}`,
  ].join("; ");
}

function associationLine(association: RecordedAssociation) {
  return [
    `id=${association.id}`,
    `methodVersion=${text(association.methodVersion)}`,
    `exposure=${association.exposureLabel}`,
    `outcome=${association.outcomeLabel}`,
    `window=${association.analysisWindowDays}d`,
    `lag=${association.lagHours}h`,
    `exposed=${association.exposedCount}`,
    `comparison=${association.comparisonCount}`,
    `eligible=${text(association.eligibleCount)}`,
    `excluded=${text(association.excludedCount)}`,
    `sampleDates=${dateRange([...(association.exposedDates ?? []), ...(association.comparisonDates ?? [])])}`,
    `exposedMedian=${text(association.exposedMedian)}`,
    `comparisonMedian=${text(association.comparisonMedian)}`,
    `absoluteDifference=${text(association.absoluteDifference)}`,
    `relativeDifference=${text(association.relativeDifference)}%`,
    `confidence=${association.confidence}`,
    `claim=${association.claim}`,
    `matching=${association.matchingMethod}`,
    `sensitivityChecks=${list(association.sensitivityChecksPassed)}`,
    `observation=${association.observation}`,
    `provenance: ${provenanceSummary(association.provenance)}`,
    `limitations=${list(association.limitations)}`,
  ].join("; ");
}

function analysisFindingLine(finding: NonNullable<LongitudinalHealthView["analysis"]>["findings"][number]) {
  return [
    `id=${finding.id}`,
    `kind=${finding.kind}`,
    `metric=${finding.metricId}`,
    `current=${finding.currentStart} through ${finding.currentEnd} (${finding.currentCount} observations; coverage=${finding.currentCoverage})`,
    `comparison=${finding.comparisonStart ?? "none"} through ${finding.comparisonEnd ?? "none"} (${finding.comparisonCount} observations; coverage=${text(finding.comparisonCoverage)})`,
    `median=${finding.currentMedian}; comparisonMedian=${text(finding.comparisonMedian)}; difference=${text(finding.difference)}${finding.unit ? ` ${finding.unit}` : ""}`,
    `standardizedDifference=${text(finding.standardizedDifference)}`,
    `persistence=${finding.persistenceDays}d`,
    `evidence=${finding.evidence}`,
    `sources=${list(finding.source)}`,
    `summary=${finding.summary}`,
  ].join("; ");
}

function relationshipLine(relationship: ExploratoryRelationship) {
  return [
    `id=${relationship.id}`,
    `methodVersion=${relationship.methodVersion}`,
    `exposure=${relationship.exposureLabel} (${relationship.exposureUnit})`,
    `outcome=${relationship.outcomeLabel} (${relationship.outcomeUnit})`,
    `sampleCount=${relationship.sampleCount}`,
    `eligible=${relationship.eligibleCount}; excluded=${relationship.excludedCount}`,
    `dates=${dateRange([relationship.startDate ?? "", relationship.endDate ?? ""].filter(Boolean))}`,
    `rankCorrelation=${text(relationship.rankCorrelation)}`,
    `lowerExposureMedian=${text(relationship.lowerExposureMedian)}`,
    `higherExposureMedian=${text(relationship.higherExposureMedian)}`,
    `medianDifference=${text(relationship.medianDifference)}`,
    `bootstrapInterval=${relationship.bootstrapInterval ? relationship.bootstrapInterval.join(" to ") : "unavailable"}`,
    `evidence=${relationship.evidence}`,
    `method=${relationship.method}`,
    `limitations=${list(relationship.limitations)}`,
  ].join("; ");
}

function trainingResponseLines(response: TrainingResponseAnalysis) {
  return [
    `- methodVersion=${response.methodVersion}; metric=${response.metric}; eligibleSessions=${response.eligibleSessionCount}; excludedSessions=${response.excludedSessionCount}; span=${response.sessionSpanDays}d; qualified=${response.qualified}; followupSessionCounts=${response.followupCounts.join(",")}`,
    ...(["upper", "lower", "mixed"] as const).map((split) => {
      const summary = response.splitSummary[split];
      return `- ${split}: eligibleSessions=${summary.eligibleSessionCount}; span=${summary.sessionSpanDays}d; qualified=${summary.qualified}; followupSessionCounts=${summary.followupCounts.join(",")}`;
    }),
    `- Unknown sessions retained as censoring exposures=${response.unknownSessionCount}`,
    ...response.exclusions.map((item) => `- Exclusion: ${item}`),
    ...response.limitations.map((item) => `- Limitation: ${item}`),
  ];
}

type OptionalSignalSummary = {
  observation?: string;
  metrics?: string[];
  metricIds?: string[];
  period?: string;
  startDate?: string;
  endDate?: string;
  limitations?: string[];
};

function optionalSignalLines(title: string, value: unknown) {
  const items = Array.isArray(value) ? (value as OptionalSignalSummary[]) : [];
  return [
    title,
    ...(items.length
      ? items.map((item) => `- metrics=${list(item.metrics ?? item.metricIds)}; period=${text(item.period ?? (item.startDate && item.endDate ? `${item.startDate} through ${item.endDate}` : null))}; observation=${text(item.observation)}; limitations=${list(item.limitations)}`)
      : ["- None available"]),
  ];
}

/** Builds a bounded deterministic handoff packet without serializing raw daily series. */
export function buildLongitudinalContextPacket(view: LongitudinalHealthView) {
  const optional = view as LongitudinalHealthView & {
    signalsMovingTogether?: OptionalSignalSummary[];
    coMovingSignals?: OptionalSignalSummary[];
    contradictorySignals?: OptionalSignalSummary[];
  };
  const aggregate = view.aggregateTrend;
  const coverage = view.dataCoverage;
  const deviation = view.currentDeviation;

  const lines = [
    "HEALTHMAXER LONGITUDINAL CONTEXT",
    "",
    "External LLM instructions",
    "- Treat this as observational personal data, not a diagnosis or causal model.",
    "- Distinguish observations, calculations, trends, baseline comparisons, recorded associations, limitations, and unknowns.",
    "- Interpret only in response to the user's separate question.",
    "- Preserve uncertainty, provenance summaries, sample counts, lags, effect sizes, matching methods, sensitivity checks, and limitations.",
    "- Do not invent missing measurements, exposures, intent, mechanisms, or medical significance.",
    "- Do not prescribe an action unless the user's separate question explicitly asks for options.",
    "",
    "Snapshot and freshness",
    `- Generated at: ${view.generatedAt}`,
    `- Selected physiological date: ${view.selectedDate}`,
    `- User timezone: ${view.timezone}`,
    `- Analysis window: ${view.windowDays} days`,
    "",
    "Data coverage",
    `- Overall: ${text(coverage.overall)} across ${coverage.windowDays} days`,
    `- By source: ${Object.entries(coverage.bySource).map(([key, detail]) => coverageDetail(key, detail)).join(" | ") || "None"}`,
    `- By domain: ${Object.entries(coverage.byDomain).map(([key, detail]) => coverageDetail(key, detail)).join(" | ") || "None"}`,
    `- Available inputs: ${list(coverage.availableInputs)}`,
    `- Unavailable inputs: ${list(coverage.unavailableInputs)}`,
    `- Coverage limitations: ${list(coverage.limitations)}`,
    "",
    "Current state",
    `- Active current deviation: ${deviation.active ? "Yes" : "No"}`,
    `- Date: ${deviation.date}`,
    `- Summary: ${text(deviation.summary)}`,
    `- Deviating metrics: ${list(deviation.deviatingMetricIds)}`,
    `- Changes long-term aggregate: ${deviation.changesLongTermAggregate ? "Yes" : "No"}`,
    ...deviation.metrics.map((metric) => `- ${metric.label}: value=${metric.value}; baselineMedian=${metric.baselineMedian}; robustZ=${metric.robustZScore}; direction=${metric.direction}; provenance: ${provenanceSummary(metric.provenance)}`),
    "",
    "Domain trends (7 / 30 / 90 / 180-day windows where available)",
    ...domainLines(view.domains),
    "",
    "Notable longitudinal trends",
    ...(view.notableTrends.length ? view.notableTrends.map((trend) => `- ${notableLine(trend)}`) : ["- None available"]),
    "",
    "WHOOP analysis findings",
    ...(view.analysis?.findings.length ? view.analysis.findings.map((finding) => `- ${analysisFindingLine(finding)}`) : ["- None met the current evidence rules"]),
    `- Method=${text(view.analysis?.methodVersion)}; range=${text(view.analysis?.range)}; dates=${text(view.analysis?.startDate)} through ${text(view.analysis?.endDate)}; eligibleMetrics=${text(view.analysis?.eligibleMetricCount)}; excludedMetrics=${text(view.analysis?.excludedMetricCount)}; exclusions=${list(view.analysis?.exclusions)}`,
    "",
    "Sleep and strain relationships (exploratory)",
    ...(view.sleepRelationships?.length ? view.sleepRelationships.map((relationship) => `- ${relationshipLine(relationship)}`) : ["- No sleep relationships available in this view"]),
    ...(view.strainRelationship ? [`- ${relationshipLine(view.strainRelationship)}`] : []),
    "",
    "Hevy response analysis",
    ...(view.trainingResponse ? trainingResponseLines(view.trainingResponse) : ["- No Hevy response analysis available in this view"]),
    "",
    "Explicitly recorded associations",
    ...(view.recordedAssociations.length ? view.recordedAssociations.map((association) => `- ${associationLine(association)}`) : ["- No supported recorded associations"]),
    "",
    ...optionalSignalLines("Signals moving together (no causal explanation)", optional.coMovingSignals ?? optional.signalsMovingTogether),
    "",
    ...optionalSignalLines("Contradictory signals", optional.contradictorySignals),
    "",
    "Known unknowns",
    ...([...coverage.unavailableInputs, ...coverage.limitations].length
      ? [...coverage.unavailableInputs, ...coverage.limitations].map((item) => `- ${item}`)
      : ["- None recorded"]),
    "",
    "High-level app summary",
    `- Aggregate descriptive direction: ${aggregate.direction}`,
    `- Aggregate: ${aggregate.improvingCount} improving; ${aggregate.stableCount} stable; ${aggregate.weakeningCount} weakening; ${aggregate.evaluatedMetricCount} evaluated; confidence=${aggregate.confidence}`,
    `- Summary: ${aggregate.summary}`,
    `- Boundary: ${aggregate.subtitle}`,
    `- Excluded metrics: ${list(aggregate.excludedMetricIds)}`,
    `- Largest measured shift: ${view.notableTrends[0] ? notableLine(view.notableTrends[0]) : "Not available"}`,
    `- Strongest recorded association: ${view.recordedAssociations[0] ? associationLine(view.recordedAssociations[0]) : "Not available"}`,
    `- Current acute deviation: ${text(deviation.summary)}`,
    "",
    "User question",
    LONGITUDINAL_QUESTION_PLACEHOLDER,
  ];

  const contextPacketText = lines.join("\n");
  assertLongitudinalCopySafe(contextPacketText);
  const promptText = [
    "Use the following HealthMaxer observational context to answer the user question.",
    "Keep observations separate from hypotheses and state what additional data would distinguish plausible interpretations.",
    "",
    contextPacketText,
  ].join("\n");
  assertLongitudinalCopySafe(promptText);
  return { contextPacketText, promptText };
}
