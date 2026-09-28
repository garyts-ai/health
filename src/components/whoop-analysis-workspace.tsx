"use client";

import { useMemo, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

import type {
  AnalysisFinding,
  AnalysisRange,
  AnalysisMetricSeries,
  ExploratoryRelationship,
  HevySessionObservation,
  RecordedAssociation,
  WhoopAnalysisSelectionView,
  WhoopSleepObservation,
} from "@/lib/longitudinal/types";
import { TimeSeriesChart, type TimeSeriesEvent, type TimeSeriesMetricIdentity, type TimeSeriesPoint } from "@/components/training-os";
import { buildTimeSeriesGeometry, downsampleTimeSeries } from "@/components/training-os/time-series";

import styles from "./whoop-analysis-workspace.module.css";

export type WhoopAnalysisViewKey = "overview" | "sleep" | "training" | "recorded";

export type WhoopAnalysisSelection = {
  range: AnalysisRange;
  endDate: string;
  view: WhoopAnalysisViewKey;
  metricId: string | null;
  selectedDate: string | null;
  activeDate: string | null;
};

export type WhoopAnalysisWorkspaceProps = WhoopAnalysisSelection & {
  data: WhoopAnalysisSelectionView | null;
  loading?: boolean;
  error?: string | null;
  onRangeChange: (range: AnalysisRange) => void;
  onEndDateChange: (date: string) => void;
  onViewChange: (view: WhoopAnalysisViewKey) => void;
  onMetricChange: (metricId: string | null) => void;
  onDateSelect: (date: string | null) => void;
  onDateHover: (date: string | null) => void;
  onFindingOpen?: (finding: AnalysisFinding) => void;
  onRetry?: () => void;
};

const RANGES: Array<{ key: AnalysisRange; label: string }> = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "365d", label: "1 year" },
  { key: "all", label: "All" },
];

const VIEWS: Array<{ key: WhoopAnalysisViewKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "sleep", label: "Sleep" },
  { key: "training", label: "Training" },
  { key: "recorded", label: "Recorded behaviors" },
];

const MILLIS_PER_DAY = 86_400_000;

function dayValue(date: string) {
  const value = Date.parse(`${date}T12:00:00.000Z`);
  return Number.isFinite(value) ? value : 0;
}

function formatDate(date: string | null | undefined, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!date) return "Not available";
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(parsed) : "Not available";
}

function formatTimestamp(value: string | null | undefined, timezone: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat("en-US", { ...options, timeZone: timezone }).format(parsed) : "Not available";
}

function localClockFraction(value: string, timezone: string) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(parsed);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return Number.isFinite(hour) && Number.isFinite(minute) ? (hour * 60 + minute) / 1440 : null;
}

function todayInZone(timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function numberText(value: number | null | undefined, unit = "", digits = 1) {
  return typeof value === "number" && Number.isFinite(value) ? `${Number(value.toFixed(digits))}${unit}` : "—";
}

function associationUnit(association: RecordedAssociation) {
  const key = `${association.outcomeKey} ${association.outcomeLabel}`.toLowerCase();
  if (key.includes("hrv")) return " ms";
  if (key.includes("resting") || key.includes("heart rate")) return " bpm";
  if (key.includes("recovery")) return "%";
  if (key.includes("sleep")) return key.includes("consistency") || key.includes("efficiency") ? "%" : " min";
  if (key.includes("strain")) return " strain";
  return "";
}

function percentText(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value * 100)}%` : "Not established";
}

function median(values: Array<number | null | undefined>) {
  const sorted = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function metricIdentity(series: AnalysisMetricSeries): TimeSeriesMetricIdentity {
  const id = `${series.id} ${series.label} ${series.domainId}`.toLowerCase();
  if (id.includes("recovery")) return "recovery";
  if (id.includes("sleep")) return "sleep";
  if (id.includes("hrv")) return "hrv";
  if (id.includes("resting") || id.includes("heart_rate")) return "restingHeartRate";
  if (id.includes("strain")) return "strain";
  if (id.includes("temperature")) return "skinTemperature";
  return "current";
}

function metricColor(series: AnalysisMetricSeries) {
  const id = `${series.id} ${series.label} ${series.domainId}`.toLowerCase();
  if (id.includes("sleep")) return "var(--metric-sleep)";
  if (id.includes("recovery")) return "var(--metric-recovery)";
  if (id.includes("hrv")) return "var(--metric-hrv)";
  if (id.includes("resting") || id.includes("heart_rate")) return "var(--metric-resting-hr)";
  if (id.includes("strain")) return "var(--metric-strain)";
  if (id.includes("weight")) return "var(--os-signal-volume-low)";
  if (id.includes("strength")) return "var(--os-signal-emphasis)";
  return "var(--os-signal-current)";
}

function normalizedMetricPoints(series: AnalysisMetricSeries): TimeSeriesPoint[] {
  return series.points.map((point) => ({
    date: point.date,
    value: point.value,
    personalRange: point.personalRange ?? null,
  }));
}

function rangesFor(metric: AnalysisMetricSeries, data: WhoopAnalysisSelectionView) {
  const current = metric.points.filter((point) => point.date >= data.analysis.startDate && point.date <= data.analysis.endDate);
  const prior = data.analysis.comparisonStartDate && data.analysis.comparisonEndDate
    ? metric.points.filter((point) => point.date >= data.analysis.comparisonStartDate! && point.date <= data.analysis.comparisonEndDate!)
    : [];
  return { current, prior };
}

function dateCount(start: string, end: string) {
  return Math.max(1, Math.floor((dayValue(end) - dayValue(start)) / MILLIS_PER_DAY) + 1);
}

function relativeDate(date: string, offset: number) {
  return new Date(dayValue(date) + offset * MILLIS_PER_DAY).toISOString().slice(0, 10);
}

function domainForMetric(metric: AnalysisMetricSeries): WhoopAnalysisViewKey {
  if (metric.domainId === "sleep" || metric.id.toLowerCase().includes("sleep")) return "sleep";
  if (metric.domainId === "strength" || metric.domainId === "cardiovascularActivity" || metric.id.toLowerCase().includes("strain")) return "training";
  return "overview";
}

function findingPrecision(finding: AnalysisFinding) {
  return finding.unit === "%" || finding.unit.toLowerCase().includes("score") ? 1 : 1;
}

function periodCopy(finding: AnalysisFinding) {
  if (finding.kind === "sustained_trend") return `${formatDate(finding.currentStart)}–${formatDate(finding.currentEnd)} · ${finding.persistenceDays} persistent days · ${numberText(finding.slopePerWeek, `${finding.unit}/week`)}`;
  if (finding.kind === "current_deviation") return `${formatDate(finding.currentEnd)} vs personal range ${formatDate(finding.comparisonStart)}–${formatDate(finding.comparisonEnd)} · ${finding.comparisonCount} prior observations`;
  if (finding.comparisonMedian === null || finding.difference === null || !finding.comparisonStart || !finding.comparisonEnd) return "No eligible preceding period";
  const change = `${finding.difference > 0 ? "+" : ""}${numberText(finding.difference, finding.unit, findingPrecision(finding))}`;
  return `${change} · ${formatDate(finding.currentStart)}–${formatDate(finding.currentEnd)} vs ${formatDate(finding.comparisonStart)}–${formatDate(finding.comparisonEnd)}`;
}

function matchedCurrentAndPrevious(metric: AnalysisMetricSeries, data: WhoopAnalysisSelectionView) {
  const { current, prior } = rangesFor(metric, data);
  const shift = prior.length && data.analysis.comparisonStartDate
    ? dateCount(data.analysis.comparisonStartDate, data.analysis.comparisonEndDate ?? data.analysis.comparisonStartDate) - 1
    : 0;
  const mappedPrior = prior.map((point) => ({
    date: relativeDate(point.date, shift + 1),
    value: point.value,
    personalRange: point.personalRange ?? null,
  }));
  return { current, prior: mappedPrior };
}

function comparisonSegments(currentPoints: TimeSeriesPoint[], previousPoints: TimeSeriesPoint[], baseline: number | null) {
  const geometry = buildTimeSeriesGeometry(downsampleTimeSeries(currentPoints, 120), { baseline });
  const source = downsampleTimeSeries(previousPoints, 120);
  const segments: string[] = [];
  let segment: string[] = [];
  let previousDate: string | null = null;
  for (const point of source) {
    if (point.value === null || !Number.isFinite(point.value)) {
      if (segment.length > 1) segments.push(segment.join(" "));
      segment = [];
      previousDate = null;
      continue;
    }
    if (previousDate && dayValue(point.date) - dayValue(previousDate) > MILLIS_PER_DAY * 1.5) {
      if (segment.length > 1) segments.push(segment.join(" "));
      segment = [];
    }
    segment.push(`${geometry.xForDate(point.date)},${geometry.yForValue(point.value)}`);
    previousDate = point.date;
  }
  if (segment.length > 1) segments.push(segment.join(" "));
  return segments;
}

function rollingMedianPoints(points: TimeSeriesPoint[]) {
  if (!points.length) return [];
  const byDate = new Map(points.map((point) => [point.date, point]));
  const output: TimeSeriesPoint[] = [];
  const start = dayValue(points[0]!.date);
  const end = dayValue(points.at(-1)!.date);
  for (let current = start; current <= end; current += MILLIS_PER_DAY) {
    const date = new Date(current).toISOString().slice(0, 10);
    const recent = Array.from({ length: 7 }, (_, offset) => byDate.get(relativeDate(date, -offset))?.value ?? null);
    const value = recent.filter((item): item is number => item !== null && Number.isFinite(item)).length >= 5 ? median(recent) : null;
    output.push({ date, value });
  }
  return output;
}

function FindingRow({ finding, onOpen }: { finding: AnalysisFinding; onOpen: () => void }) {
  const delta = finding.difference;
  const kindLabel = finding.kind === "period_difference" ? "Period difference" : finding.kind === "sustained_trend" ? "Sustained trend" : "Current deviation";
  const mainValue = finding.kind === "sustained_trend"
    ? numberText(finding.slopePerWeek, `${finding.unit}/wk`)
    : delta === null ? numberText(finding.currentMedian, finding.unit) : `${delta > 0 ? "+" : ""}${numberText(delta, finding.unit, findingPrecision(finding))}`;
  return <li className={styles.findingRow}>
    <div className={styles.findingText}>
      <div className={styles.findingTitle}>{finding.label}<span>{kindLabel} · {finding.evidence === "supported" ? "Supported" : "Exploratory"}</span></div>
      <p>{finding.summary}</p>
      <p className={styles.findingPeriods}>{periodCopy(finding)}</p>
      <p className={styles.findingCoverage}>{finding.currentCount} observations current · {finding.comparisonCount} comparison · {percentText(finding.currentCoverage)} current coverage{finding.comparisonCoverage === null ? "" : ` · ${percentText(finding.comparisonCoverage)} comparison coverage`} · {finding.source.join(", ") || "Source not recorded"}{finding.standardizedDifference === null ? "" : ` · personal difference ${numberText(finding.standardizedDifference, " MAD")}`}</p>
    </div>
    <div className={styles.findingValue}>
      <strong>{mainValue}</strong>
      <button type="button" onClick={onOpen}>Inspect graph <span aria-hidden="true">→</span></button>
    </div>
  </li>;
}

function MetricPlot({ series, data, range, activeDate, selectedDate, onHover, onSelect, showComparison, showRollingMedian }: {
  series: AnalysisMetricSeries;
  data: WhoopAnalysisSelectionView;
  range: AnalysisRange;
  activeDate: string | null;
  selectedDate: string | null;
  onHover: (date: string | null) => void;
  onSelect: (date: string | null) => void;
  showComparison: boolean;
  showRollingMedian: boolean;
}) {
  const [showSamples, setShowSamples] = useState(false);
  const { current, prior } = rangesFor(series, data);
  const currentValues = current.map((point) => point.value);
  const previousValues = prior.map((point) => point.value);
  const currentMedian = median(currentValues);
  const previousMedian = median(previousValues);
  const chartRange = range === "7d" ? "week" : range === "90d" ? "3m" : range === "365d" ? "1y" : range;
  const selectedWithinRange = selectedDate !== null && selectedDate >= data.analysis.startDate && selectedDate <= data.analysis.endDate;
  const activeWithinRange = activeDate !== null && activeDate >= data.analysis.startDate && activeDate <= data.analysis.endDate;
  const chartSelectedDate = selectedWithinRange ? selectedDate : null;
  const chartActiveDate = activeWithinRange ? activeDate : chartSelectedDate;
  const allPoints = normalizedMetricPoints(series).filter((point) => point.date <= data.analysis.endDate);
  const points = allPoints.filter((point) => point.date >= data.analysis.startDate);
  const displayed = showComparison ? matchedCurrentAndPrevious(series, data) : null;
  const plotId = `metric-${series.id.replace(/[^a-z0-9_-]/gi, "-")}`;
  const comparison = displayed ? comparisonSegments(points, displayed.prior.map((point) => ({ ...point, personalRange: point.personalRange ?? null })), series.baselineValue) : [];
  const rollingStart = relativeDate(data.analysis.startDate, -6);
  const rollingSource = allPoints.filter((point) => point.date >= rollingStart);
  const rollingPoints = rollingMedianPoints(rollingSource).filter((point) => point.date >= data.analysis.startDate && point.date <= data.analysis.endDate);
  const rolling = showRollingMedian && series.granularity === "daily" ? comparisonSegments(points, rollingPoints, series.baselineValue) : [];
  const events: TimeSeriesEvent[] = [
    ...data.sessions.map((item) => ({ id: item.id, date: item.date, label: `Hevy ${item.split} · ${item.title ?? "session"}`, type: "workout" })),
    ...data.activities.map((item) => ({ id: item.id, date: item.date, label: `WHOOP · ${item.title}`, type: "activity" })),
    ...data.journalEvents.map((item) => ({ id: item.id, date: item.physiologicalDate, label: item.label, type: item.type })),
  ].filter((item) => item.date >= data.analysis.startDate && item.date <= data.analysis.endDate);
  return <article className={styles.metricPlot} style={{ "--series-tone": metricColor(series) } as CSSProperties} aria-labelledby={`${plotId}-title`}>
    <header className={styles.plotHeader}>
      <div><h3 id={`${plotId}-title`}>{series.label}</h3><span>{series.unit || "Recorded value"}</span></div>
      <strong>{numberText(currentMedian, series.unit)}</strong>
    </header>
    {points.some((point) => point.value !== null) ? <div className={styles.chartWithCompare}>
      <TimeSeriesChart
        metric={metricIdentity(series)} label={series.label} unit={series.unit} points={points}
        baseline={series.baselineValue} presentation="line" range={chartRange}
        activeDate={chartActiveDate} pinnedDate={chartSelectedDate}
        events={events} showTooltip={Boolean(activeWithinRange || selectedWithinRange)} showEvents
        onActiveDateChange={onHover} onPinnedDateChange={onSelect}
      />
      {comparison.length || rolling.length ? <svg className={styles.comparisonOverlay} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs><clipPath id={`${plotId}-clip`}><rect x="0" y="8" width="100" height="84" /></clipPath></defs>
        <g clipPath={`url(#${plotId}-clip)`}>{comparison.map((segment, index) => <polyline className={styles.comparisonTrace} points={segment} key={`previous-${index}`} />)}{rolling.map((segment, index) => <polyline className={styles.rollingTrace} points={segment} key={`rolling-${index}`} />)}</g>
      </svg> : null}
      {showComparison || showRollingMedian ? <div className={styles.traceLegend}><span><i /> Daily observations</span>{comparison.length ? <span data-previous="true"><i /> Previous period, date aligned</span> : null}{rolling.length ? <span data-rolling="true"><i /> 7-day median</span> : null}</div> : null}
    </div> : <div className={styles.plotEmpty}>No observations in {RANGES.find((item) => item.key === range)?.label ?? "this range"}</div>}
    {showComparison ? <div className={styles.comparisonLine} aria-live="polite">
      <span>Period median</span><strong>{numberText(currentMedian, series.unit)}</strong>
      <span>Previous period</span><strong>{numberText(previousMedian, series.unit)}</strong>
      <span>{current.length} / {prior.length} observations</span>
    </div> : null}
    <details className={styles.sampleDisclosure} open={showSamples} onToggle={(event) => setShowSamples(event.currentTarget.open)}>
      <summary>Observation values <span>{current.filter((point) => point.value !== null).length}</span></summary>
      <div className={styles.tableScroll}><table><thead><tr><th scope="col">Period</th><th scope="col">Date</th><th scope="col">Value</th><th scope="col">Personal range</th></tr></thead><tbody>
        {current.map((point) => <tr key={`current-${point.date}`}><td>Current</td><th scope="row">{formatDate(point.date)}</th><td>{numberText(point.value, series.unit)}</td><td>{point.personalRange ? `${numberText(point.personalRange.lower, series.unit)}–${numberText(point.personalRange.upper, series.unit)}` : "Not established"}</td></tr>)}
        {prior.map((point) => <tr key={`previous-${point.date}`}><td>Previous</td><th scope="row">{formatDate(point.date)}</th><td>{numberText(point.value, series.unit)}</td><td>Not calculated</td></tr>)}
        {!current.length && !prior.length ? <tr><td colSpan={4}>No observations in this period.</td></tr> : null}
      </tbody></table></div>
    </details>
  </article>;
}

function InspectorValue({ label, value }: { label: string; value: ReactNode }) {
  return <div className={styles.inspectorValue}><dt>{label}</dt><dd>{value}</dd></div>;
}

function DateInspector({ date, data, onOpenLatest }: { date: string; data: WhoopAnalysisSelectionView; onOpenLatest: (date: string) => void }) {
  const cycles = [...data.cycles, ...data.latestCycles.filter((cycle) => cycle.date === date && !data.cycles.some((item) => item.id === cycle.id))].filter((cycle) => cycle.date === date).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const latest = [...cycles].reverse().find((cycle) => cycle.recoveryValid) ?? null;
  const sleeps = data.sleeps.filter((sleep) => sleep.date === date);
  const activities = data.activities.filter((item) => item.date === date);
  const sessions = data.sessions.filter((session) => session.date === date);
  const events = data.journalEvents.filter((event) => event.physiologicalDate === date);
  const relevantLatest = data.latestCycles.filter((cycle) => cycle.date > data.analysis.endDate).sort((a, b) => b.date.localeCompare(a.date))[0];
  return <section className={styles.inspector} aria-labelledby="whoop-date-inspector">
    <header className={styles.inspectorHeader}><div><h3 id="whoop-date-inspector">Date inspection</h3><time dateTime={date}>{formatDate(date)}</time></div>{relevantLatest ? <button type="button" onClick={() => onOpenLatest(relevantLatest.date)}>Latest available · {formatDate(relevantLatest.date)} →</button> : null}</header>
    {latest ? <dl className={styles.inspectorGrid}>
      <InspectorValue label="Recovery" value={numberText(latest.recoveryScore, "%", 0)} />
      <InspectorValue label="HRV" value={numberText(latest.hrv, " ms")} />
      <InspectorValue label="Resting HR" value={numberText(latest.restingHeartRate, " bpm")} />
      <InspectorValue label="Sleep" value={numberText(latest.sleepMinutes === null ? null : latest.sleepMinutes / 60, " h")} />
      <InspectorValue label="Sleep need" value={numberText(latest.sleepNeedMinutes === null ? null : latest.sleepNeedMinutes / 60, " h")} />
      <InspectorValue label="Daily strain" value={numberText(latest.strain)} />
    </dl> : <p className={styles.inspectorEmpty}>No scored recovery cycle is recorded for this date.</p>}
    <div className={styles.inspectorDetails}>
      <InspectorValue label="Cycles" value={cycles.length ? cycles.map((cycle) => <span key={cycle.id} className={styles.sourceTag}>{cycle.scoreState ?? (cycle.completed ? "Completed" : "In progress")}{cycle.cycleId ? ` · ${cycle.cycleId}` : ""}</span>) : "None"} />
      <InspectorValue label="Sleep / naps" value={sleeps.length ? sleeps.map((sleep) => <span key={sleep.id} className={styles.inspectorItem}>{sleep.nap ? "Nap" : "Main sleep"} · {formatTimestamp(sleep.startedAt, data.timezone)}–{formatTimestamp(sleep.endedAt, data.timezone)} · {numberText(sleep.sleepMinutes === null ? null : sleep.sleepMinutes / 60, " h")}</span>) : "None"} />
      <InspectorValue label="Training" value={sessions.length || activities.length ? <>{sessions.map((session) => <span className={styles.inspectorItem} key={session.id}>Hevy · {session.title ?? "Workout"} · {session.split} · {session.setCount} sets</span>)}{activities.map((activity) => <span className={styles.inspectorItem} key={activity.id}>WHOOP · {activity.title} · strain {numberText(activity.strain)}</span>)}</> : "None"} />
      <InspectorValue label="Recorded events" value={events.length ? events.map((event) => <span className={styles.inspectorItem} key={event.id}>{event.label} · {formatTimestamp(event.occurredAt, data.timezone)}</span>) : "None"} />
      <InspectorValue label="Source records" value={cycles.length || sleeps.length ? <>{cycles.map((cycle) => <span className={styles.inspectorItem} key={`provenance-${cycle.id}`}>{cycle.source} · {cycle.provenance.sourceRecordIds.join(", ") || cycle.id} · {cycle.provenance.rawTimestamps.join(", ")} · {cycle.provenance.timezone}</span>)}{sleeps.map((sleep) => <span className={styles.inspectorItem} key={`sleep-source-${sleep.id}`}>{sleep.source} sleep · {sleep.id} · {sleep.validity.join(", ") || "Validity not stated"}</span>)}</> : "None"} />
    </div>
  </section>;
}

function RelationshipPlot({ relationship, selectedDate, onSelectDate, onHoverDate }: { relationship: ExploratoryRelationship | null; selectedDate: string | null; onSelectDate: (date: string) => void; onHoverDate: (date: string | null) => void }) {
  if (!relationship) return <div className={styles.relationshipEmpty}>No eligible sleep and morning measurement pairs are available for this range.</div>;
  const points = relationship.points;
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const xMin = Math.min(...xValues, 0);
  const xMax = Math.max(...xValues, 1);
  const yMin = Math.min(...yValues, 0);
  const yMax = Math.max(...yValues, 1);
  const xPad = Math.max(1, (xMax - xMin) * 0.08);
  const yPad = Math.max(1, (yMax - yMin) * 0.08);
  const coord = (point: { x: number; y: number }) => ({
    x: 46 + ((point.x - (xMin - xPad)) / (xMax - xMin + xPad * 2)) * 324,
    y: 183 - ((point.y - (yMin - yPad)) / (yMax - yMin + yPad * 2)) * 156,
  });
  const selectNearest = (event: PointerEvent<SVGSVGElement>) => {
    if (!points.length) return;
    const box = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - box.left) / box.width) * 400;
    const pointerY = ((event.clientY - box.top) / box.height) * 220;
    let nearest = points[0]!;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const point of points) {
      const current = coord(point);
      const distance = Math.hypot(current.x - pointerX, current.y - pointerY);
      if (distance < nearestDistance) { nearest = point; nearestDistance = distance; }
    }
    if (nearest) { onHoverDate(nearest.date); if (event.type === "pointerdown") onSelectDate(nearest.date); }
  };
  const changePoint = (index: number) => {
    const point = points[index];
    if (point) { onHoverDate(point.date); onSelectDate(point.date); }
  };
  const first = points[0];
  const last = points.at(-1);
  return <div className={styles.relationshipBody}>
    <div className={styles.relationshipStats}>
      <span>{relationship.sampleCount} paired dates · {relationship.eligibleCount} eligible · {relationship.excludedCount} excluded</span>
      <span>Rank correlation {numberText(relationship.rankCorrelation, "", 2)}</span>
      <span>{relationship.startDate ? formatDate(relationship.startDate) : "—"}–{relationship.endDate ? formatDate(relationship.endDate) : "—"}</span>
    </div>
    <svg className={styles.scatterPlot} viewBox="0 0 400 220" role="group" aria-label={`${relationship.exposureLabel} versus ${relationship.outcomeLabel}, ${relationship.sampleCount} paired dates. Use arrow keys to inspect dates or select a row below.`} tabIndex={0} onPointerMove={selectNearest} onPointerDown={selectNearest} onKeyDown={(event) => {
      if (!points.length) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const current = points.findIndex((point) => point.date === selectedDate);
        const next = current < 0 ? (event.key === "ArrowRight" ? 0 : points.length - 1) : current + (event.key === "ArrowRight" ? 1 : -1);
        changePoint(Math.min(points.length - 1, Math.max(0, next)));
      } else if (event.key === "Home") { event.preventDefault(); changePoint(0); }
      else if (event.key === "End") { event.preventDefault(); changePoint(points.length - 1); }
    }}>
      <line x1="46" y1="183" x2="372" y2="183" className={styles.axis} />
      <line x1="46" y1="20" x2="46" y2="183" className={styles.axis} />
      <line x1="46" y1="101" x2="372" y2="101" className={styles.grid} />
      <line x1="208" y1="20" x2="208" y2="183" className={styles.grid} />
      {points.map((point) => { const p = coord(point); return <circle key={point.observationId} cx={p.x} cy={p.y} r={point.date === selectedDate ? 6 : 4} data-selected={point.date === selectedDate} className={styles.scatterPoint} onClick={() => changePoint(points.indexOf(point))} onPointerEnter={() => onHoverDate(point.date)} />; })}
      <text x="46" y="207" className={styles.axisLabel}>{numberText(first?.x, ` ${relationship.exposureUnit}`)}</text>
      <text x="372" y="207" textAnchor="end" className={styles.axisLabel}>{numberText(last?.x, ` ${relationship.exposureUnit}`)}</text>
      <text x="8" y="25" className={styles.axisLabel}>{numberText(yMax, ` ${relationship.outcomeUnit}`)}</text>
      <text x="8" y="182" className={styles.axisLabel}>{numberText(yMin, ` ${relationship.outcomeUnit}`)}</text>
    </svg>
    <p className={styles.relationshipSummary}>
      {relationship.lowerExposureMedian === null || relationship.higherExposureMedian === null ? "Group distributions are not established." : `Median ${relationship.outcomeLabel}: ${numberText(relationship.lowerExposureMedian, relationship.outcomeUnit)} at lower ${relationship.exposureLabel.toLowerCase()} and ${numberText(relationship.higherExposureMedian, relationship.outcomeUnit)} at higher ${relationship.exposureLabel.toLowerCase()}.`}
      {relationship.medianDifference !== null ? ` Difference ${numberText(relationship.medianDifference, relationship.outcomeUnit)}${relationship.bootstrapInterval ? ` · block-resampled interval ${numberText(relationship.bootstrapInterval[0], relationship.outcomeUnit)} to ${numberText(relationship.bootstrapInterval[1], relationship.outcomeUnit)}` : ""}.` : ""}
    </p>
    <p className={styles.limitation}>Exploratory association; this does not establish cause. {relationship.limitations.join(" ")}</p>
    <details className={styles.sampleDisclosure}><summary>Relationship method <span>{relationship.methodVersion}</span></summary><p className={styles.methodCopy}>{relationship.method}</p></details>
    <details className={styles.sampleDisclosure}><summary>Paired observations <span>{points.length}</span></summary>
      <div className={styles.tableScroll}><table><thead><tr><th>Date</th><th>{relationship.exposureLabel}</th><th>{relationship.outcomeLabel}</th></tr></thead><tbody>{points.map((point) => <tr key={point.observationId}><th scope="row"><button type="button" className={styles.dateLink} onClick={() => changePoint(points.indexOf(point))}>{formatDate(point.date)}</button></th><td>{numberText(point.x, ` ${relationship.exposureUnit}`)}</td><td>{numberText(point.y, ` ${relationship.outcomeUnit}`)}</td></tr>)}</tbody></table></div>
    </details>
  </div>;
}

function SleepTiming({ sleeps, timezone, selectedDate, onSelect }: { sleeps: WhoopSleepObservation[]; timezone: string; selectedDate: string | null; onSelect: (date: string) => void }) {
  const ordered = [...sleeps].sort((a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt));
  return <div className={styles.sleepTiming}>
    {ordered.length ? ordered.map((sleep) => {
      const start = localClockFraction(sleep.startedAt, timezone);
      const end = localClockFraction(sleep.endedAt, timezone);
      const duration = sleep.sleepMinutes === null ? 0 : sleep.sleepMinutes / 1440;
      const left = (start ?? 0) * 100;
      const crossesMidnight = start !== null && end !== null && end < start;
      const width = crossesMidnight ? (1 - (start ?? 0)) * 100 : Math.max(1.5, duration * 100);
      const wrapWidth = crossesMidnight ? (end ?? 0) * 100 : 0;
      return <button type="button" key={sleep.id} className={styles.sleepBand} data-nap={sleep.nap} data-selected={sleep.date === selectedDate} onClick={() => onSelect(sleep.date)} aria-label={`${sleep.nap ? "Nap" : "Main sleep"} on ${formatDate(sleep.date)}, started ${formatTimestamp(sleep.startedAt, timezone)}, duration ${numberText(sleep.sleepMinutes === null ? null : sleep.sleepMinutes / 60, " hours")}`}>
        <span className={styles.sleepBandLabel}>{formatDate(sleep.date, { month: "short", day: "numeric" })}<small>{sleep.nap ? "Nap" : "Sleep"}</small></span>
        <span className={styles.dayTrack}><i style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} />{crossesMidnight ? <i data-wrap="true" style={{ left: "0%", width: `${Math.max(1.5, wrapWidth)}%` }} /> : null}</span>
        <span className={styles.sleepBandValue}>{numberText(sleep.sleepMinutes === null ? null : sleep.sleepMinutes / 60, " h")}</span>
      </button>;
    }) : <p className={styles.plotEmpty}>No sleep intervals are available for this selection.</p>}
    <div className={styles.timeAxis}><span>12 a.m.</span><span>6 a.m.</span><span>Noon</span><span>6 p.m.</span><span>12 a.m.</span></div>
  </div>;
}

function TrainingResponse({ data, splitFilter, setSplitFilter, selectedDate, onSelectDate }: { data: WhoopAnalysisSelectionView; splitFilter: string; setSplitFilter: (split: string) => void; selectedDate: string | null; onSelectDate: (date: string) => void }) {
  const response = data.trainingResponse;
  const points = response.points.filter((point) => splitFilter === "all" || point.split === splitFilter);
  const splitSummary = splitFilter === "upper" || splitFilter === "lower" || splitFilter === "mixed" ? response.splitSummary[splitFilter] : null;
  const sessionCount = splitFilter === "all" ? response.eligibleSessionCount : splitSummary?.eligibleSessionCount ?? 0;
  const sessionSpan = splitFilter === "all" ? response.sessionSpanDays : splitSummary?.sessionSpanDays ?? 0;
  const followupCounts = splitFilter === "all" ? response.followupCounts : splitSummary?.followupCounts ?? [0, 0, 0];
  const qualified = splitFilter === "all" ? response.qualified : splitSummary?.qualified ?? false;
  const values = points.map((point) => point.difference).filter((value): value is number => value !== null);
  const spread = Math.max(1, ...values.map(Math.abs));
  const options = ["all", "upper", "lower", "mixed", "unknown"];
  const unknownSessionCount = data.sessions.filter((session) => session.split === "unknown").length || response.unknownSessionCount;
  return <section className={styles.analysisSection} aria-labelledby="response-title">
    <div className={styles.analysisHeading}><div><h3 id="response-title">Recovery after training</h3><p>HRV change from the pre-session baseline at the next three recorded recoveries.</p></div><label className={styles.field}><span>Session split</span><select value={splitFilter} onChange={(event) => setSplitFilter(event.target.value)}>{options.map((option) => <option value={option} key={option}>{option === "all" ? "All recognized splits" : option === "mixed" ? "Mixed / full-body" : option === "unknown" ? `Unknown (${unknownSessionCount})` : option[0]!.toUpperCase() + option.slice(1)}</option>)}</select></label></div>
    <div className={styles.responseMeta}>
      <span>{sessionCount} contributing sessions · {response.excludedSessionCount} excluded · {sessionSpan} days of session coverage</span>
      <span>Contributing sessions by follow-up: {followupCounts.map((count, index) => `${index + 1}: ${count}`).join(" · ")}</span>
      {!qualified ? <span className={styles.sparseMessage}>This sample is below the minimum for a grouped response summary.</span> : <span>Minimum grouped sample met</span>}
      {splitFilter === "unknown" ? <span className={styles.sparseMessage}>{unknownSessionCount} Unknown sessions remain inspectable in the timeline and are excluded from response summaries.</span> : null}
    </div>
    {points.length ? <div className={styles.responsePlot}>
      <div className={styles.zeroLine} />
      {[1, 2, 3].map((index) => <div key={index} className={styles.responseColumn}>
        <span className={styles.responseLag}>Recovery {index}</span>
        {points.filter((point) => point.followupIndex === index && point.difference !== null).map((point) => <button type="button" key={`${point.sessionId}-${point.recoveryDate}`} className={styles.responseDot} data-split={point.split} data-selected={point.recoveryDate === selectedDate} style={{ top: `${Math.max(5, Math.min(95, 50 - (point.difference! / spread) * 42))}%` }} title={`${point.split} · ${formatDate(point.sessionDate)} → ${formatDate(point.recoveryDate)} · ${numberText(point.difference, " ms")} · ${numberText(point.elapsedHours, " h")} elapsed`} onClick={() => onSelectDate(point.recoveryDate)} aria-label={`${point.split} session from ${formatDate(point.sessionDate)}, recovery ${index} on ${formatDate(point.recoveryDate)}, HRV change ${numberText(point.difference, " ms")}, ${numberText(point.elapsedHours, " hours")} elapsed`} />)}
        <span className={styles.responseCount}>{points.filter((point) => point.followupIndex === index).length} observations</span>
      </div>)}</div> : <p className={styles.plotEmpty}>No eligible Hevy training response observations are available.</p>}
    <p className={styles.limitation}>Each trajectory ends when another training exposure intervenes. Recovery sequence and elapsed hours are shown separately; missing days are not treated as equal intervals.</p>
    <dl className={styles.methodGrid}><InspectorValue label="Analysis method" value={response.methodVersion} /><InspectorValue label="Eligible / excluded exposures" value={`${response.eligibleSessionCount} / ${response.excludedSessionCount}`} /><InspectorValue label="Unknown split sessions" value={`${response.unknownSessionCount} excluded from response summary`} /><InspectorValue label="Exclusion detail" value={`${response.exclusions.length ? response.exclusions.join("; ") : "No exclusion reason recorded"}`} /></dl>
    <details className={styles.sampleDisclosure}><summary>Session observations <span>{points.length}</span></summary>
      <div className={styles.tableScroll}><table><thead><tr><th>Session</th><th>Recovery</th><th>Sequence</th><th>Elapsed</th><th>HRV change</th><th>Baseline</th><th>HRV</th></tr></thead><tbody>{points.map((point) => <tr key={`${point.sessionId}-${point.recoveryDate}`}><th scope="row">{formatDate(point.sessionDate)} · {point.split}</th><td><button type="button" className={styles.dateLink} onClick={() => onSelectDate(point.recoveryDate)}>{formatDate(point.recoveryDate)}</button></td><td>{point.followupIndex}</td><td>{numberText(point.elapsedHours, " h")}</td><td>{numberText(point.difference, " ms")}</td><td>{numberText(point.baselineHrv, " ms")}</td><td>{numberText(point.recoveryHrv, " ms")}</td></tr>)}</tbody></table></div>
    </details>
  </section>;
}

function AnswerDistribution({ association, onSelectDate }: { association: RecordedAssociation; onSelectDate: (date: string) => void }) {
  const samples = association.sampleValues ?? [];
  if (!samples.length) return null;
  const values = samples.map((sample) => sample.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return <div className={styles.answerDistribution} aria-label="Matched outcome distributions">
    {(["yes", "no"] as const).map((answer) => {
      const group = samples.filter((sample) => sample.answer === answer);
      const medianValue = answer === "yes" ? association.exposedMedian : association.comparisonMedian;
      const dispersion = answer === "yes" ? association.exposedDispersion : association.comparisonDispersion;
      return <div className={styles.distributionRow} key={answer}>
        <div className={styles.distributionLabel}><span>{answer === "yes" ? "Yes" : "Matched No"} · n={group.length}</span><small>Median {numberText(medianValue, associationUnit(association))} · median absolute deviation {numberText(dispersion, associationUnit(association))}</small></div>
        <div className={styles.distributionLane} role="group" aria-label={`${answer === "yes" ? "Yes" : "Matched No"} observed outcomes`}>
          {group.map((sample, index) => <button type="button" key={sample.observationId} className={styles.distributionPoint} data-answer={answer} style={{ left: `${8 + ((sample.value - min) / span) * 84}%`, top: `${22 + (index % 3) * 28}%` }} onClick={() => onSelectDate(sample.date)} title={`${formatDate(sample.date)} · ${numberText(sample.value, associationUnit(association))}`} aria-label={`${answer === "yes" ? "Yes" : "Matched No"} outcome ${numberText(sample.value, associationUnit(association))} on ${formatDate(sample.date)}. Inspect date.`} />)}
        </div>
      </div>;
    })}
    <div className={styles.distributionAxis}><span>{numberText(min, associationUnit(association))}</span><span>{numberText(max, associationUnit(association))}</span></div>
  </div>;
}

function RecordedBehavior({ associations, selectedDate, onSelectDate }: { associations: RecordedAssociation[]; selectedDate: string | null; onSelectDate: (date: string) => void }) {
  const [associationId, setAssociationId] = useState(associations[0]?.id ?? "");
  const selected = associations.find((item) => item.id === associationId) ?? associations[0] ?? null;
  if (!selected) return <p className={styles.inspectorEmpty}>No recorded behavior comparison is available for this period. A longer range may contain enough explicit Yes and No observations.</p>;
  const interval = selected.bootstrapInterval;
  const outcomeUnit = associationUnit(selected);
  return <section className={styles.analysisSection} aria-labelledby="recorded-title">
    <div className={styles.analysisHeading}><div><h3 id="recorded-title">Recorded answers and associated recovery</h3><p>Only explicit answers are compared. Missing answers remain unknown.</p></div><label className={styles.field}><span>Question and outcome</span><select value={selected.id} onChange={(event) => setAssociationId(event.target.value)}>{associations.map((item) => <option key={item.id} value={item.id}>{item.exposureLabel} · {item.outcomeLabel}</option>)}</select></label></div>
    <p className={styles.questionIdentity}>Question: <strong>{selected.exposureLabel}</strong> <span>·</span> Outcome: <strong>{selected.outcomeLabel}</strong></p>
    {selected.claim === "insufficient_data" ? <p className={styles.sparseMessage}>Insufficient matched observations: {selected.exposedCount} Yes and {selected.comparisonCount} No. Extend the range to include more recorded answers.</p> : <div className={styles.answerComparison}>
      <div><span>Yes · {selected.exposedCount}</span><strong>{numberText(selected.exposedMedian, outcomeUnit)}</strong><small>Median absolute deviation {numberText(selected.exposedDispersion, outcomeUnit)} · {selected.exposedDates?.map((date) => formatDate(date)).join(" · ") || "Dates unavailable"}</small></div>
      <div><span>No · {selected.comparisonCount} matched dates</span><strong>{numberText(selected.comparisonMedian, outcomeUnit)}</strong><small>Median absolute deviation {numberText(selected.comparisonDispersion, outcomeUnit)} · {selected.comparisonDates?.map((date) => formatDate(date)).join(" · ") || "Dates unavailable"}</small></div>
      <div><span>{selected.claim === "association_detected" ? "Observed difference · Yes minus matched No" : "No clear association · Yes minus matched No"}</span><strong>{numberText(selected.absoluteDifference, outcomeUnit)}</strong><small>{interval ? `Block-resampled interval ${numberText(interval[0], outcomeUnit)} to ${numberText(interval[1], outcomeUnit)}` : "Uncertainty interval unavailable"}</small></div>
    </div>}
    <AnswerDistribution association={selected} onSelectDate={onSelectDate} />
    <dl className={styles.methodGrid}>
      <InspectorValue label="Matching" value={selected.matchingMethod} />
      <InspectorValue label="Analysis method" value={selected.methodVersion ?? "Version not recorded"} />
      <InspectorValue label="Eligible / excluded" value={`${selected.eligibleCount ?? selected.exposedCount + selected.comparisonCount} / ${selected.excludedCount ?? 0}`} />
      <InspectorValue label="Timing" value={selected.lagHours === 0 ? "Associated cycle recovery" : `${selected.lagHours} hours after recorded event`} />
    </dl>
    <p className={styles.limitation}>Exploratory comparison; it does not establish a cause. {selected.limitations.join(" ")}</p>
    <details className={styles.sampleDisclosure}><summary>Matched sample dates <span>{(selected.exposedDates?.length ?? 0) + (selected.comparisonDates?.length ?? 0)}</span></summary>
      <div className={styles.tableScroll}><table><thead><tr><th>Date</th><th>Answer group</th><th>{selected.outcomeLabel}</th></tr></thead><tbody>
        {(selected.sampleValues ?? []).filter((sample) => sample.answer === "yes").map((sample) => <tr data-selected={sample.date === selectedDate} key={`yes-${sample.observationId}`}><th scope="row"><button type="button" className={styles.dateLink} onClick={() => onSelectDate(sample.date)}>{formatDate(sample.date)}</button></th><td>Yes</td><td>{numberText(sample.value, ` ${outcomeUnit}`)}</td></tr>)}
        {(selected.sampleValues ?? []).filter((sample) => sample.answer === "no").map((sample) => <tr data-selected={sample.date === selectedDate} key={`no-${sample.observationId}`}><th scope="row"><button type="button" className={styles.dateLink} onClick={() => onSelectDate(sample.date)}>{formatDate(sample.date)}</button></th><td>No</td><td>{numberText(sample.value, ` ${outcomeUnit}`)}</td></tr>)}
      </tbody></table></div>
    </details>
  </section>;
}

function cycleSessionsForDate(data: WhoopAnalysisSelectionView) {
  const grouped = new Map<string, HevySessionObservation[]>();
  for (const session of data.sessions) grouped.set(session.date, [...(grouped.get(session.date) ?? []), session]);
  return grouped;
}

function TrainingTimeline({ data, splitFilter, selectedDate, onSelect }: { data: WhoopAnalysisSelectionView; splitFilter: string; selectedDate: string | null; onSelect: (date: string) => void }) {
  const groups = cycleSessionsForDate(data);
  const dates = [...new Set([...groups.keys(), ...data.activities.map((item) => item.date), ...data.journalEvents.map((item) => item.physiologicalDate), ...data.cycles.filter((cycle) => cycle.strainValid).map((cycle) => cycle.date)])].sort();
  return <section className={styles.analysisSection} aria-labelledby="training-timeline-title">
    <div className={styles.analysisHeading}><div><h3 id="training-timeline-title">Training and recovery timeline</h3><p>Training exposures share dates with recorded WHOOP strain and morning measurements.</p></div></div>
    {dates.length ? <div className={styles.timelineRows}>{dates.slice(-90).map((date) => {
      const sessions = (groups.get(date) ?? []).filter((session) => splitFilter === "all" || session.split === splitFilter);
      const activity = data.activities.filter((item) => item.date === date);
      const events = data.journalEvents.filter((item) => item.physiologicalDate === date);
      const cycle = [...data.cycles].reverse().find((item) => item.date === date && item.recoveryValid);
      return <button type="button" className={styles.timelineRow} key={date} data-selected={date === selectedDate} onClick={() => onSelect(date)}>
        <time dateTime={date}>{formatDate(date, { month: "short", day: "numeric" })}</time>
        <span className={styles.timelineMarks}>{sessions.map((session) => <span key={session.id} data-split={session.split}>Hevy · {session.split} · {session.title ?? "Session"}</span>)}{activity.map((item) => <span key={item.id} data-split="unknown">WHOOP · {item.title}</span>)}{events.map((item) => <span key={item.id} data-split="recorded">Journal · {item.label}</span>)}{!sessions.length && !activity.length && !events.length ? <span data-split="recovery">Recovery observation</span> : null}</span>
        <span className={styles.timelineNumbers}>strain {numberText(cycle?.strain)} · HRV {numberText(cycle?.hrv, " ms")}</span>
      </button>;
    })}</div> : <p className={styles.plotEmpty}>No training exposures or strain observations are available for this period.</p>}
  </section>;
}

function EvidenceMethods({ data }: { data: WhoopAnalysisSelectionView }) {
  return <details className={styles.evidenceMethods}>
    <summary>Methods, source records, and exclusions</summary>
    <div className={styles.methodGrid}>
      <InspectorValue label="Analysis method" value={data.analysis.methodVersion} />
      <InspectorValue label="Selected period" value={`${formatDate(data.analysis.startDate)}–${formatDate(data.analysis.endDate)}`} />
      <InspectorValue label="Comparison period" value={data.analysis.comparisonStartDate && data.analysis.comparisonEndDate ? `${formatDate(data.analysis.comparisonStartDate)}–${formatDate(data.analysis.comparisonEndDate)}` : "Not available for All"} />
      <InspectorValue label="Eligible / excluded metrics" value={`${data.analysis.eligibleMetricCount} / ${data.analysis.excludedMetricCount}`} />
      <InspectorValue label="Data timezone" value={data.timezone} />
      <InspectorValue label="Sources" value="WHOOP live API, WHOOP export, Hevy, and derived observations where available." />
    </div>
    {data.analysis.exclusions.length ? <><h4>Analysis exclusions</h4><ul>{data.analysis.exclusions.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></> : null}
    {data.trainingResponse.exclusions.length ? <><h4>Training exclusions</h4><ul>{data.trainingResponse.exclusions.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></> : null}
    {data.recordedAssociations.some((item) => (item.excludedCount ?? 0) > 0) ? <p>{data.recordedAssociations.reduce((sum, item) => sum + (item.excludedCount ?? 0), 0)} journal answers or matched observations were excluded, including conflicts or missing outcome cycles.</p> : null}
  </details>;
}

export function WhoopAnalysisWorkspace({
  data,
  range,
  endDate,
  view,
  metricId,
  selectedDate,
  activeDate,
  loading = false,
  error = null,
  onRangeChange,
  onEndDateChange,
  onViewChange,
  onMetricChange,
  onDateSelect,
  onDateHover,
  onFindingOpen,
  onRetry,
}: WhoopAnalysisWorkspaceProps) {
  const [showComparison, setShowComparison] = useState(true);
  const [showRollingMedian, setShowRollingMedian] = useState(false);
  const [relationshipId, setRelationshipId] = useState("");
  const [splitFilter, setSplitFilter] = useState("all");

  const availableMetrics = data?.metrics ?? [];
  const activeMetric = availableMetrics.find((metric) => metric.id === metricId) ?? null;
  const graphMetrics = useMemo(() => {
    if (!data) return [];
    if (activeMetric) return [activeMetric];
    const available = data.metrics.filter((item) => item.points.some((point) => point.value !== null));
    if (view === "sleep") return available.filter((item) => item.domainId === "sleep" || item.id.toLowerCase().includes("sleep")).slice(0, 4);
    if (view === "training") return available.filter((item) => ["strength", "cardiovascularActivity", "physiology"].includes(item.domainId) || item.id.toLowerCase().includes("strain")).slice(0, 4);
    return available.slice(0, 6);
  }, [activeMetric, data, view]);
  const sleepRelationships = data?.relationships.filter((item) => `${item.exposureKey} ${item.exposureLabel}`.toLowerCase().includes("sleep")) ?? [];
  const relationship = sleepRelationships.find((item) => item.id === relationshipId)
    ?? sleepRelationships.find((item) => `${item.outcomeKey} ${item.outcomeLabel}`.toLowerCase().includes("hrv"))
    ?? sleepRelationships[0] ?? null;
  const strainRelationship = data?.relationships.find((item) => `${item.exposureKey} ${item.exposureLabel}`.toLowerCase().includes("strain") && `${item.outcomeKey} ${item.outcomeLabel}`.toLowerCase().includes("recovery")) ?? null;
  const inspectionDate = activeDate ?? selectedDate ?? data?.analysis.endDate ?? endDate;
  const findings = data?.analysis.findings ?? [];
  const statusCopy = !data ? "Analysis data is not available." : data.freshness.isStale
    ? `Data may be stale${data.freshness.lastSyncCompletedAt ? ` · last sync ${formatTimestamp(data.freshness.lastSyncCompletedAt, data.timezone)}` : ""}.`
    : data.freshness.lastSyncStatus && !["completed", "success", "succeeded"].includes(data.freshness.lastSyncStatus.toLowerCase())
      ? `Last sync: ${data.freshness.lastSyncStatus}.`
      : data.freshness.lastSyncCompletedAt ? `Last synced ${formatTimestamp(data.freshness.lastSyncCompletedAt, data.timezone)}.` : "Sync time unavailable.";

  const openFinding = (finding: AnalysisFinding) => {
    if (onFindingOpen) { onFindingOpen(finding); return; }
    const metric = availableMetrics.find((item) => item.id === finding.metricId);
    onViewChange(metric ? domainForMetric(metric) : "overview");
    onMetricChange(finding.metricId);
    onEndDateChange(finding.currentEnd);
    onDateSelect(finding.currentEnd);
  };
  const openLatest = (date: string) => { onDateSelect(date); onDateHover(null); };

  return <section className={styles.workspace} aria-labelledby="whoop-analysis-title" aria-busy={loading}>
    <div className={styles.workspaceTitle}>
      <div><h2 id="whoop-analysis-title">WHOOP analysis</h2><p>Measurements, personal history, training, and explicitly recorded behavior.</p></div>
      <div className={styles.freshness} data-stale={data?.freshness.isStale || undefined}><span className={styles.freshnessDot} />{statusCopy}</div>
    </div>

    {error ? <div className={styles.statusMessage} role="status"><span>{data ? `Refresh failed; showing the previous valid analysis. ${error}` : error}</span>{onRetry ? <button type="button" onClick={onRetry}>Retry</button> : null}</div> : null}
    {loading && data ? <p className={styles.loadingMessage} role="status">Updating this analysis; the last complete view remains available.</p> : null}

    <section className={styles.findings} aria-labelledby="whoop-findings-title">
      <header className={styles.sectionHeader}><div><h3 id="whoop-findings-title">What changed</h3><p>Period comparisons are descriptive and require sufficient observations.</p></div></header>
      {data ? findings.length ? <ol className={styles.findingList}>{findings.slice(0, 3).map((finding) => <FindingRow key={finding.id} finding={finding} onOpen={() => openFinding(finding)} />)}</ol> : <p className={styles.sparseMessage}>{data.analysis.exclusions[0] ?? "No period differences met the observation and coverage rules for this range."}</p> : loading ? <p className={styles.sparseMessage}>Loading findings…</p> : <p className={styles.sparseMessage}>WHOOP analysis is unavailable.</p>}
    </section>

    <section className={styles.explore} aria-labelledby="whoop-explore-title">
      <header className={styles.sectionHeader}><div><h3 id="whoop-explore-title">Explore</h3><p>Linked plots share one date selection. Select a point to inspect its source observations.</p></div></header>
      <div className={styles.controls}>
        <fieldset className={styles.rangeField}><legend>Range</legend><div className={styles.rangeButtons}>{RANGES.map((item) => <button key={item.key} type="button" aria-pressed={range === item.key} onClick={() => onRangeChange(item.key)}>{item.label}</button>)}</div></fieldset>
        <label className={styles.field}><span>End date</span><input type="date" value={endDate} max={todayInZone(data?.timezone ?? "America/New_York")} onChange={(event) => { if (event.target.value) onEndDateChange(event.target.value); }} /></label>
        <label className={styles.field}><span>Metric</span><select value={metricId ?? "all"} onChange={(event) => onMetricChange(event.target.value === "all" ? null : event.target.value)}><option value="all">Key indicators</option>{availableMetrics.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.unit}</option>)}</select></label>
        <label className={styles.compareToggle}><input type="checkbox" checked={showComparison} disabled={!data?.analysis.comparisonStartDate} onChange={(event) => setShowComparison(event.target.checked)} /><span>Compare preceding period</span></label>
        <label className={styles.compareToggle}><input type="checkbox" checked={showRollingMedian} onChange={(event) => setShowRollingMedian(event.target.checked)} /><span>7-day median</span></label>
      </div>
      <div className={styles.tabs} role="tablist" aria-label="WHOOP analysis views">{VIEWS.map((item) => <button key={item.key} type="button" role="tab" aria-selected={view === item.key} aria-controls="whoop-analysis-panel" id={`whoop-tab-${item.key}`} onClick={() => onViewChange(item.key)}>{item.label}</button>)}</div>
      <div id="whoop-analysis-panel" role="tabpanel" aria-labelledby={`whoop-tab-${view}`} className={styles.viewPanel}>
        {!data ? loading ? <div className={styles.loadingState} role="status">Loading WHOOP measurements…</div> : <div className={styles.loadingState}>Choose a range to load analysis.</div> : <>
          {view === "overview" || view === "sleep" ? <div className={styles.graphGrid}>
            {graphMetrics.map((item) => <MetricPlot key={item.id} series={item} data={data} range={range} activeDate={activeDate} selectedDate={selectedDate} onHover={onDateHover} onSelect={onDateSelect} showComparison={showComparison} showRollingMedian={showRollingMedian} />)}
            {!graphMetrics.length ? <p className={styles.plotEmpty}>No metric observations are available for this view and range.</p> : null}
          </div> : null}
          {view === "sleep" ? <section className={styles.analysisSection} aria-labelledby="sleep-relationship-title">
            <div className={styles.analysisHeading}><div><h3 id="sleep-relationship-title">Sleep and morning measurements</h3><p>Paired by the recorded physiological sleep and recovery cycle.</p></div><label className={styles.field}><span>Relationship</span><select value={relationship?.id ?? ""} onChange={(event) => setRelationshipId(event.target.value)}>{sleepRelationships.map((item) => <option key={item.id} value={item.id}>{item.exposureLabel} vs {item.outcomeLabel}</option>)}</select></label></div>
            <RelationshipPlot relationship={relationship} selectedDate={selectedDate} onSelectDate={onDateSelect} onHoverDate={onDateHover} />
          </section> : null}
          {view === "sleep" ? <section className={styles.analysisSection} aria-labelledby="sleep-timing-title"><div className={styles.analysisHeading}><div><h3 id="sleep-timing-title">Sleep timing</h3><p>Start and duration by {data.timezone}; naps remain separate from main sleep.</p></div></div><SleepTiming sleeps={data.sleeps} timezone={data.timezone} selectedDate={selectedDate} onSelect={onDateSelect} /></section> : null}
          {view === "training" ? <>
            <TrainingTimeline data={data} splitFilter={splitFilter} selectedDate={selectedDate} onSelect={onDateSelect} />
            <section className={styles.analysisSection} aria-labelledby="strain-recovery-title">
              <div className={styles.analysisHeading}><div><h3 id="strain-recovery-title">Completed-cycle strain and following recovery</h3><p>WHOOP strain from a completed cycle paired with the next recorded cycle recovery.</p></div></div>
              <RelationshipPlot relationship={strainRelationship} selectedDate={selectedDate} onSelectDate={onDateSelect} onHoverDate={onDateHover} />
            </section>
            {graphMetrics.length ? <div className={styles.graphGrid}>{graphMetrics.map((item) => <MetricPlot key={item.id} series={item} data={data} range={range} activeDate={activeDate} selectedDate={selectedDate} onHover={onDateHover} onSelect={onDateSelect} showComparison={showComparison} showRollingMedian={showRollingMedian} />)}</div> : null}
            <TrainingResponse data={data} splitFilter={splitFilter} setSplitFilter={setSplitFilter} selectedDate={selectedDate} onSelectDate={onDateSelect} />
          </> : null}
          {view === "recorded" ? <RecordedBehavior associations={data.recordedAssociations} selectedDate={selectedDate} onSelectDate={onDateSelect} /> : null}
        </>}
      </div>
    </section>

    {data ? <DateInspector date={inspectionDate} data={data} onOpenLatest={openLatest} /> : null}
    {data ? <EvidenceMethods data={data} /> : null}
  </section>;
}
