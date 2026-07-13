import { assertLongitudinalCopySafe } from "@/lib/longitudinal-copy-safety";
import type {
  CoverageDetail,
  HealthDomainTrend,
  LongitudinalHealthView,
  MetricTrend,
  NotableTrend,
  RecordedAssociation,
  SourceProvenance,
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
    `exposure=${association.exposureLabel}`,
    `outcome=${association.outcomeLabel}`,
    `window=${association.analysisWindowDays}d`,
    `lag=${association.lagHours}h`,
    `exposed=${association.exposedCount}`,
    `comparison=${association.comparisonCount}`,
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
