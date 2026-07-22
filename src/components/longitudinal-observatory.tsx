"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type { LongitudinalHealthView } from "@/lib/longitudinal/types";
import { alcoholHeatmapDays } from "@/lib/longitudinal/alcohol-log";
import { TimeSeriesChart, buildTimeSeriesGeometry, downsampleTimeSeries, filterTimeSeriesRange, nearestTimeSeriesPoint, visiblePointDates, type TimeSeriesMetricIdentity, type TimeSeriesPersonalRange, type TimeSeriesPoint } from "@/components/training-os";

import styles from "./longitudinal-observatory.module.css";

type UnknownRecord = Record<string, unknown>;
type Direction = "improving" | "stable" | "weakening" | "mixed" | "insufficient_data";

type DomainModel = {
  key: string;
  label: string;
  direction: Direction;
  confidence: string;
  coverage: number | null;
  magnitude: number | null;
  persistenceDays: number | null;
  changeLabel: string;
  summary: string;
  limitations: string[];
  metricIds: string[];
  metrics: UnknownRecord[];
  metric: UnknownRecord | null;
};

type ObservationModel = {
  id: string;
  title: string;
  observation: string;
  confidence: string;
  statementType: string;
  startDate: string | null;
  endDate: string | null;
  metricIds: string[];
  sourceRecordIds: string[];
  limitations: string[];
  persistenceDays: number;
};

const DOMAIN_LABELS: Record<string, string> = {
  physiology: "Physiology",
  sleep: "Sleep",
  cardiovascularActivity: "Cardiovascular activity",
  dailyMovement: "Daily movement",
  strength: "Strength training",
  bodyWeight: "Body weight",
  recordedBehaviors: "Recorded behaviors",
};

const DIRECTION_LABELS: Record<Direction, string> = {
  improving: "Improving",
  stable: "Stable",
  weakening: "Weakening",
  mixed: "Mixed direction",
  insufficient_data: "Insufficient data",
};

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? value as UnknownRecord : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function timeSeriesPoint(value: unknown): TimeSeriesPoint {
  const point = record(value);
  const range = record(point.personalRange);
  const center = number(range.center);
  const lower = number(range.lower);
  const upper = number(range.upper);
  const sampleCount = number(range.sampleCount);
  const robustZScore = number(range.robustZScore);
  const status = text(range.status);
  const personalRange: TimeSeriesPersonalRange | undefined = center !== null && lower !== null && upper !== null && sampleCount !== null && robustZScore !== null && (status === "within" || status === "above" || status === "below")
    ? { center, lower, upper, sampleCount, robustZScore, status }
    : undefined;
  return { date: text(point.date), value: number(point.value), ...(personalRange ? { personalRange } : {}) };
}

function direction(value: unknown): Direction {
  const normalized = text(value).toLowerCase();
  if (["improving", "up", "upward", "favorable"].includes(normalized)) return "improving";
  if (["weakening", "down", "downward", "unfavorable"].includes(normalized)) return "weakening";
  if (normalized === "mixed") return "mixed";
  if (["insufficient", "insufficient_data", "missing", "unknown"].includes(normalized)) return "insufficient_data";
  return "stable";
}

function nestedNumber(source: UnknownRecord, keys: string[]): number | null {
  for (const key of keys) {
    const direct = number(source[key]);
    if (direct !== null) return direct;
    const nested = record(source[key]);
    const nestedValue = number(nested.value) ?? number(nested.percent) ?? number(nested.days);
    if (nestedValue !== null) return nestedValue;
  }
  return null;
}

function normalizedCoverage(value: number | null): number | null {
  if (value === null) return null;
  return Math.max(0, Math.min(100, value <= 1 ? value * 100 : value));
}

function domainModels(view: LongitudinalHealthView): DomainModel[] {
  const root = record(view);
  const domains = record(root.domains);
  const coverage = record(record(root.dataCoverage).byDomain);

  return Object.entries(domains).map(([key, value]) => {
    const domain = record(value);
    const metrics = records(domain.metrics);
    const largestId = text(domain.largestShiftMetricId);
    const metric = metrics.find((item) => text(item.id) === largestId) ?? metrics[0] ?? null;
    const currentValue = metric ? number(metric.currentValue) : null;
    const baselineValue = metric ? number(metric.baselineValue) : null;
    const calculatedMagnitude = currentValue !== null && baselineValue !== null && baselineValue !== 0
      ? Math.abs((currentValue - baselineValue) / baselineValue) * 100
      : null;
    const relativeChange = metric ? number(metric.relativeChange) : null;
    const magnitude = metric ? nestedNumber(metric, ["normalizedMagnitude", "magnitudePercent", "changePercent", "magnitude"]) ?? calculatedMagnitude ?? (relativeChange === null ? null : Math.abs(relativeChange) * 100) : null;
    const persistenceDays = metric ? nestedNumber(metric, ["persistenceDays", "persistence", "durationDays"]) : null;
    const absoluteChange = metric ? number(metric.absoluteChange) : null;
    const unit = metric ? text(metric.unit) : "";
    const changeLabel = absoluteChange === null
      ? DIRECTION_LABELS[direction(domain.direction)]
      : `${absoluteChange > 0 ? "↑ +" : absoluteChange < 0 ? "↓ " : "→ "}${Number(absoluteChange.toFixed(2))}${unit}`;
    const domainCoverageDetail = record(coverage[key]);
    const domainCoverage = normalizedCoverage(
      nestedNumber(domain, ["coverage", "coveragePercent"]) ?? number(domainCoverageDetail.ratio),
    );

    return {
      key,
      label: text(domain.label, DOMAIN_LABELS[key] ?? key),
      direction: direction(domain.direction),
      confidence: text(domain.confidence, "Not established"),
      coverage: domainCoverage,
      magnitude: magnitude === null ? null : Math.max(0, Math.min(100, Math.abs(magnitude))),
      persistenceDays,
      changeLabel,
      summary: text(domain.summary, "No supported domain observation is available."),
      limitations: strings(domain.limitations),
      metricIds: metrics.map((item) => text(item.id)).filter(Boolean),
      metrics,
      metric,
    };
  });
}

function observationModels(view: LongitudinalHealthView): ObservationModel[] {
  return records(record(view).notableTrends).map((item, index) => ({
    id: text(item.id, `observation-${index}`),
    title: text(item.title, "Observed change"),
    observation: text(item.observation, text(item.summary, "No observation text is available.")),
    confidence: text(item.confidence, "Not established"),
    statementType: text(item.statementType, "trend_description"),
    startDate: text(item.startDate) || null,
    endDate: text(item.endDate) || null,
    metricIds: strings(item.metricIds),
    sourceRecordIds: strings(record(item.provenance).sourceRecordIds),
    limitations: strings(item.limitations),
    persistenceDays: number(item.persistenceDays) ?? 0,
  }));
}

function formatPercent(value: number | null) {
  return value === null ? "Not established" : `${Math.round(value)}%`;
}

function sentenceCase(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
}

type ChartRange = "week" | "30d" | "3m" | "1y" | "all";

const CHART_RANGES: Array<{ key: ChartRange; label: string; days: number | null }> = [
  { key: "week", label: "Week", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "3m", label: "3 months", days: 90 },
  { key: "1y", label: "1 year", days: 365 },
  { key: "all", label: "All time", days: null },
];

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

type GraphSeries = { key: string; label: string; unit: string; metric: TimeSeriesMetricIdentity; baseline: number | null; values: TimeSeriesPoint[] };

function graphDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "—";
}

function graphValue(value: number | null, unit: string) {
  return value === null || !Number.isFinite(value) ? "—" : `${Number(value.toFixed(1))}${unit}`;
}

function graphDirection(baseline: number | null, average: number | null) {
  if (baseline === null || average === null) return "No comparison";
  if (Math.abs(average - baseline) < 0.05) return "Near baseline";
  return average > baseline ? "Above full-period baseline" : "Below full-period baseline";
}

function rangeValues(series: GraphSeries, range: ChartRange, selectedDate: string) {
  return filterTimeSeriesRange(series.values, range, selectedDate);
}

function MetricGraph({ series, range, rangeLabel, selectedDate, activeDate, pinnedDate, onActiveDateChange, onPinnedDateChange }: { series: GraphSeries; range: ChartRange; rangeLabel: string; selectedDate: string; activeDate: string | null; pinnedDate: string | null; onActiveDateChange: (date: string) => void; onPinnedDateChange: (date: string | null) => void }) {
  const values = rangeValues(series, range, selectedDate);
  const summaryValues = values.map((point) => point.value).filter((value): value is number => value !== null && Number.isFinite(value));
  const average = summaryValues.length ? summaryValues.reduce((sum, value) => sum + value, 0) / summaryValues.length : null;
  const present = values.filter((point): point is TimeSeriesPoint & { value: number } => point.value !== null && Number.isFinite(point.value));
  const latest = present.at(-1) ?? null;
  const active = present.find((point) => point.date === activeDate) ?? latest;
  const outOfRange = active?.personalRange?.status === "above" || active?.personalRange?.status === "below";

  return (
    <article className={styles.metricGraph}>
      <header>
        <div><h3>{series.label}</h3><span>{present.length} observation{present.length === 1 ? "" : "s"}</span></div>
        <div className={styles.metricGraphValue} data-metric={series.metric}><strong>{graphValue(active?.value ?? latest?.value ?? null, series.unit)}</strong><span>{outOfRange ? "Outside personal range" : graphDirection(series.baseline, average)}</span></div>
      </header>
      {present.length < 2 ? <div className={styles.metricGraphEmpty}>No observations in {rangeLabel}</div> : (
        <div className={styles.chartInteractive}>
          <div className={styles.metricGraphStats}><span>max {graphValue(Math.max(...summaryValues), series.unit)}</span><span>avg {graphValue(average, series.unit)}</span><span>min {graphValue(Math.min(...summaryValues), series.unit)}</span></div>
          <TimeSeriesChart metric={series.metric} label={series.label} unit={series.unit} points={values} baseline={series.baseline} presentation="area-line" range={range} activeDate={activeDate} pinnedDate={pinnedDate} showTooltip={Boolean(pinnedDate || (activeDate && activeDate !== selectedDate))} formatValue={(value) => graphValue(value, series.unit)} onActiveDateChange={onActiveDateChange} onPinnedDateChange={onPinnedDateChange} />
          <div className={styles.metricGraphDates}><span>{graphDate(present[0]?.date ?? null)}</span><strong>{active ? `${graphDate(active.date)} ${graphValue(active.value, series.unit)}` : "Select a point"}</strong><span>{graphDate(latest?.date ?? null)}</span></div>
        </div>
      )}
      <footer><span>baseline {graphValue(series.baseline, series.unit)}</span><span>range avg {graphValue(average, series.unit)}</span></footer>
    </article>
  );
}

function AlcoholLogGraph({ view, range, activeDate, pinnedDate, onActiveDateChange, onPinnedDateChange }: { view: LongitudinalHealthView; range: ChartRange; activeDate: string | null; pinnedDate: string | null; onActiveDateChange: (date: string) => void; onPinnedDateChange: (date: string | null) => void }) {
  const entries = view.alcoholLog?.entries ?? [];
  const logMeta = record(view.alcoholLog);
  const coverage = record(logMeta.coverage);
  const sourceAvailable = typeof logMeta.sourceAvailable === "boolean" ? logMeta.sourceAvailable : typeof coverage.sourceAvailable === "boolean" ? coverage.sourceAvailable : Boolean(view.alcoholLog);
  const coverageEnd = text(logMeta.coverageEnd, text(coverage.coverageEnd, text(coverage.endDate)));
  const latestImport = text(logMeta.latestImportAt, text(logMeta.latestImport, text(coverage.latestImportAt)));
  const rawCount = number(logMeta.rawCount) ?? number(coverage.rawCount) ?? number(coverage.rawAnswerCount);
  const deduplicatedCount = number(logMeta.deduplicatedCount) ?? number(coverage.deduplicatedCount) ?? number(coverage.deduplicatedAnswerCount);
  const allDays = view.alcoholLog?.heatmapDays ?? alcoholHeatmapDays(view.selectedDate, entries);
  const daysToShow = range === "week" ? 7 : range === "30d" ? 30 : range === "3m" ? 90 : range === "1y" ? 365 : Math.max(365, allDays.length);
  const days = allDays.slice(-daysToShow);
  const renderedDays = range === "week" ? days : days.filter((day) => day.hasAlcoholEntry).slice(-120);
  const logged = days.filter((day) => day.hasAlcoholEntry).reduce((sum, day) => sum + day.entryCount, 0);
  const latest = [...days].reverse().find((day) => day.hasAlcoholEntry)?.date ?? null;
  const coverageCopy = !sourceAvailable
    ? "WHOOP journal export required"
    : coverageEnd && coverageEnd < view.selectedDate
      ? `Journal data through ${graphDate(coverageEnd)}`
      : logged === 0
        ? "No recorded alcohol in this range"
        : latest ? `Latest ${graphDate(latest)}` : "Recorded journal data available";
  return <article className={styles.metricGraph} data-alcohol-graph="true">
    <header><div><h3>Alcohol log</h3><span>Explicit journal dates</span></div><div className={styles.metricGraphValue} data-metric="alcohol"><strong>{logged} {logged === 1 ? "entry" : "entries"}</strong><span>{coverageCopy}</span></div></header>
    <div className={styles.alcoholMiniChart} data-week={range === "week"} role="group" tabIndex={0} aria-label={`Alcohol log for ${range === "all" ? "all available history" : rangeLabelFor(range)}. ${logged} entries${latest ? `, latest ${graphDate(latest)}` : "."} Use arrow keys to inspect, Enter to pin, and Escape to return to latest.`} onKeyDown={(event) => {
      if (!renderedDays.length || !["ArrowLeft", "ArrowRight", "Home", "End", "Enter", "Escape"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Escape") { const date = renderedDays.at(-1)!.date; onPinnedDateChange(null); onActiveDateChange(date); return; }
      if (event.key === "Enter") { if (activeDate) onPinnedDateChange(activeDate); return; }
      const current = Math.max(0, renderedDays.findIndex((day) => day.date === activeDate));
      const index = event.key === "Home" ? 0 : event.key === "End" ? renderedDays.length - 1 : Math.max(0, Math.min(renderedDays.length - 1, current + (event.key === "ArrowLeft" ? -1 : 1)));
      onActiveDateChange(renderedDays[index].date);
    }}>
      {renderedDays.length ? renderedDays.map((day) => <button key={day.date} type="button" className={styles.alcoholMiniDay} data-logged={day.hasAlcoholEntry} data-active={day.date === activeDate} aria-pressed={day.date === pinnedDate} aria-label={`${graphDate(day.date)}${day.hasAlcoholEntry ? `, ${day.entryCount} ${day.entryCount === 1 ? "entry" : "entries"}` : ", no alcohol entry"}`} title={`${graphDate(day.date)}${day.hasAlcoholEntry ? ` · ${day.entryCount} ${day.entryCount === 1 ? "entry" : "entries"}` : " · No alcohol entry"}`} onPointerEnter={() => onActiveDateChange(day.date)} onClick={() => { onActiveDateChange(day.date); onPinnedDateChange(day.date); }} />) : <span className={styles.alcoholMiniEmpty}>{coverageCopy}</span>}
    </div>
    <div className={styles.metricGraphDates}><span>{graphDate(days[0]?.date ?? null)}</span><strong>{coverageCopy}</strong><span>{graphDate(days.at(-1)?.date ?? null)}</span></div>
    <footer><span>{rawCount !== null && deduplicatedCount !== null ? `${deduplicatedCount} unique of ${rawCount} imported answers` : "Warm orange marks logged days"}</span><span>{latestImport ? `Imported ${graphDate(latestImport.slice(0, 10))}` : "Tracking only"}</span></footer>
  </article>;
}

function rangeLabelFor(range: ChartRange) {
  return CHART_RANGES.find((item) => item.key === range)?.label ?? "selected period";
}

function JournalEventRail({ events, startDate, endDate, activeDate, onSelect }: { events: NonNullable<LongitudinalHealthView["journalEvents"]>; startDate: string; endDate: string; activeDate: string | null; onSelect: (date: string) => void }) {
  const start = Date.parse(`${startDate}T12:00:00Z`);
  const end = Date.parse(`${endDate}T12:00:00Z`);
  const span = Math.max(86_400_000, end - start);
  const visible = events.filter((event) => event.physiologicalDate >= startDate && event.physiologicalDate <= endDate);
  return <section className={styles.journalRail} aria-labelledby="journal-event-rail-title">
    <div><h3 id="journal-event-rail-title">Recorded events</h3><p>Journal records are separate from physiological deviations and do not establish what caused a change.</p></div>
    <div className={styles.journalRailPlot} role="group" aria-label={`${visible.length} journal events in the chart window`}>
      {visible.length ? visible.map((event) => {
        const position = ((Date.parse(`${event.physiologicalDate}T12:00:00Z`) - start) / span) * 100;
        return <button key={event.id} type="button" data-type={event.type} data-active={event.physiologicalDate === activeDate} style={{ left: `${Math.max(0, Math.min(100, position))}%` }} onClick={() => onSelect(event.physiologicalDate)} title={`${event.label} · ${graphDate(event.physiologicalDate)} · recorded event`}><span>{event.label}</span></button>;
      }) : <span className={styles.journalRailEmpty}>No recorded journal events in this range</span>}
    </div>
  </section>;
}

function MetricGraphs({ view }: { view: LongitudinalHealthView }) {
  const [range, setRange] = useState<ChartRange>("week");
  const [activeDate, setActiveDate] = useState<string | null>(view.selectedDate);
  const [pinnedDate, setPinnedDate] = useState<string | null>(null);
  const updateRange = (next: ChartRange) => {
    setRange(next);
    setPinnedDate(null);
    setActiveDate(view.selectedDate);
  };
  const rangeLabel = CHART_RANGES.find((item) => item.key === range)?.label ?? "Week";
  const metricsById = new Map(Object.values(view.domains).flatMap((domain) => domain.metrics.map((metric) => [metric.id, metric] as const)));
  const series = [
    ["recovery", "Recovery", "%", "recovery"], ["sleep_duration", "Sleep", "h", "sleep"], ["hrv", "HRV", "ms", "hrv"],
    ["resting_heart_rate", "Resting HR", "bpm", "restingHeartRate"], ["day_strain", "Strain", "", "strain"], ["skin_temperature", "Skin temp", "°C", "skinTemperature"],
  ].map(([key, label, unit, metricIdentity]) => { const metric = metricsById.get(key); return metric ? { key, label, unit, metric: metricIdentity as TimeSeriesMetricIdentity, baseline: metric.baselineValue, values: metric.points as TimeSeriesPoint[] } : null; }).filter((item): item is GraphSeries => Boolean(item));
  const productionSeries = series.filter((item) => item.key !== "recovery" && item.key !== "sleep_duration");
  const visibleCount = productionSeries[0] ? rangeValues(productionSeries[0], range, view.selectedDate).filter((point) => point.value !== null).length : 0;
  const rangeDays = CHART_RANGES.find((item) => item.key === range)?.days;
  const rangeStart = rangeDays ? shiftDate(view.selectedDate, -(rangeDays - 1)) : productionSeries.flatMap((item) => item.values).map((point) => point.date).sort()[0] ?? view.selectedDate;

  return (
    <section className={`hud-frame ${styles.graphs}`} aria-labelledby="longitudinal-graphs-title">
      <header className={styles.graphsHeader}>
        <div>
          <h2 id="longitudinal-graphs-title">Visual analysis</h2>
          <p>Chart window only: {rangeLabel} ending {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${view.selectedDate}T12:00:00Z`))} · {visibleCount} recorded cycles. Report findings use the independent 28-day analysis window.</p>
        </div>
        <div className={styles.rangeControls} role="group" aria-label="Metric graph range">
          {CHART_RANGES.map((item) => <button key={item.key} type="button" aria-pressed={range === item.key} onClick={() => updateRange(item.key)}>{item.label}</button>)}
        </div>
      </header>
      <div className={styles.graphsGrid}>
        {productionSeries.map((item) => <MetricGraph key={item.key} series={item} range={range} rangeLabel={rangeLabel} selectedDate={view.selectedDate} activeDate={activeDate} pinnedDate={pinnedDate} onActiveDateChange={setActiveDate} onPinnedDateChange={(date) => { setPinnedDate(date); if (date) setActiveDate(date); }} />)}
        <AlcoholLogGraph view={view} range={range} activeDate={activeDate} pinnedDate={pinnedDate} onActiveDateChange={setActiveDate} onPinnedDateChange={(date) => { setPinnedDate(date); if (date) setActiveDate(date); }} />
      </div>
      <JournalEventRail events={view.journalEvents ?? []} startDate={rangeStart} endDate={view.selectedDate} activeDate={activeDate} onSelect={(date) => { setActiveDate(date); setPinnedDate(date); }} />
    </section>
  );
}

function topObservations(view: LongitudinalHealthView, observations: ObservationModel[]) {
  const root = record(view);
  const result: ObservationModel[] = [];
  const largest = observations[0];
  if (largest) result.push(largest);
  const persistent = observations
    .filter((item) => item.id !== largest?.id)
    .sort((a, b) => b.persistenceDays - a.persistenceDays)[0];
  if (persistent) result.push(persistent);
  const current = record(root.currentDeviation);
  if (current.active === true && text(current.summary)) {
    result.push({
      id: "current-deviation",
      title: "Current deviation",
      observation: text(current.summary),
      confidence: "Personal baseline comparison",
      statementType: "personal_baseline_comparison",
      startDate: text(current.date) || null,
      endDate: text(current.date) || null,
      metricIds: strings(current.deviatingMetricIds),
      sourceRecordIds: [],
      limitations: [],
      persistenceDays: 0,
    });
  }

  const association = records(root.recordedAssociations).find((item) => text(item.claim) === "association_detected");
  if (current.active !== true && association && result.length < 3) {
    result.push({
      id: text(association.id, "recorded-association"),
      title: "Recorded association",
      observation: text(association.observation, text(association.summary, "A recorded association met the analysis threshold.")),
      confidence: text(association.confidence, "Not established"),
      statementType: "recorded_association",
      startDate: null,
      endDate: null,
      metricIds: [text(association.outcomeKey)].filter(Boolean),
      sourceRecordIds: [],
      limitations: strings(association.limitations),
      persistenceDays: 0,
    });
  }
  return result.slice(0, 3);
}

function aggregateCounts(view: LongitudinalHealthView, domains: DomainModel[]) {
  const aggregate = record(record(view).aggregateTrend);
  const count = (key: "improving" | "stable" | "weakening") => number(aggregate[`${key}Count`]) ?? domains.filter((item) => item.direction === key).length;
  return {
    improving: count("improving"),
    stable: count("stable"),
    weakening: count("weakening"),
  };
}

function endpoint(directionValue: Direction, x: number, y: number) {
  if (directionValue === "improving") return <circle className={styles.endpoint} cx={x} cy={y} r="7" />;
  if (directionValue === "weakening") return <path className={styles.endpoint} d={`M ${x} ${y - 8} L ${x + 8} ${y} L ${x} ${y + 8} L ${x - 8} ${y} Z`} />;
  if (directionValue === "mixed") return <path className={styles.endpoint} d={`M ${x} ${y - 8} L ${x + 8} ${y + 7} L ${x - 8} ${y + 7} Z`} />;
  return <rect className={styles.endpoint} x={x - 6} y={y - 6} width="12" height="12" />;
}

function TrajectoryHorizon({ domains, selectedKey, windowDays }: { domains: DomainModel[]; selectedKey: string | null; windowDays: number }) {
  const titleId = useId();
  const descriptionId = useId();
  const height = 92 + domains.length * 70;

  return (
    <svg className={styles.horizon} viewBox={`0 0 1000 ${height}`} role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
      <title id={titleId}>Longitudinal trajectory horizon</title>
      <desc id={descriptionId}>Domain lanes show measured direction, magnitude, persistence, confidence, and missing coverage over the selected long-term window. Circles mean improving, squares stable, diamonds weakening, triangles mixed, and interrupted lines indicate insufficient coverage.</desc>
      <g className={styles.axis} aria-hidden="true">
        {[110, 380, 650, 920].map((x) => <line key={x} x1={x} x2={x} y1="48" y2={height - 30} />)}
        <text x="110" y="28">{windowDays} DAYS</text>
        <text x="380" y="28">{Math.round(windowDays / 2)} DAYS</text>
        <text x="650" y="28">{Math.round(windowDays / 6)} DAYS</text>
        <text x="920" y="28" textAnchor="end">CURRENT</text>
      </g>
      {domains.map((domain, index) => {
        const baselineY = 76 + index * 70;
        const directionSign = domain.direction === "improving" ? -1 : domain.direction === "weakening" ? 1 : 0;
        const endY = baselineY + directionSign * ((domain.magnitude ?? 0) / 100) * 24;
        const persistence = Math.max(0, Math.min(windowDays, domain.persistenceDays ?? 0));
        const startX = persistence ? 920 - (persistence / windowDays) * 810 : 110;
        const insufficient = domain.direction === "insufficient_data" || domain.coverage === 0;
        const path = `M ${startX} ${baselineY} C ${startX + (920 - startX) * 0.42} ${baselineY}, ${startX + (920 - startX) * 0.72} ${endY}, 920 ${endY}`;
        return (
          <g key={domain.key} className={styles.lane} data-direction={domain.direction} data-selected={selectedKey === domain.key}>
            <title>{`${domain.label}: ${DIRECTION_LABELS[domain.direction]}; magnitude ${domain.magnitude === null ? "not established" : `${Math.round(domain.magnitude)} percent`}; persistence ${domain.persistenceDays === null ? "not established" : `${Math.round(domain.persistenceDays)} days`}; confidence ${domain.confidence}; coverage ${formatPercent(domain.coverage)}.`}</title>
            <text className={styles.laneLabel} x="18" y={baselineY + 4}>{domain.label}</text>
            <line className={styles.baseline} x1="110" x2="920" y1={baselineY} y2={baselineY} />
            {insufficient ? (
              <>
                <line className={styles.missing} x1="110" x2="360" y1={baselineY} y2={baselineY} />
                <line className={styles.missing} x1="430" x2="650" y1={baselineY} y2={baselineY} />
                <line className={styles.missing} x1="740" x2="920" y1={baselineY} y2={baselineY} />
              </>
            ) : <path className={styles.trail} data-confidence={domain.confidence.toLowerCase()} d={path} />}
            {!insufficient ? endpoint(domain.direction, 920, endY) : null}
            <text className={styles.directionLabel} x="982" y={endY + 4} textAnchor="end">{domain.changeLabel}</text>
          </g>
        );
      })}
    </svg>
  );
}

function MetricChart({ domain, showRaw, showSmoothed, showBaseline, showEvents, events }: { domain: DomainModel; showRaw: boolean; showSmoothed: boolean; showBaseline: boolean; showEvents: boolean; events: NonNullable<LongitudinalHealthView["journalEvents"]> }) {
  const source = records(domain.metric ? domain.metric.points : []).map(timeSeriesPoint);
  const endDate = text(domain.metric?.endDate, source.at(-1)?.date);
  const windowDays = number(domain.metric?.windowDays) ?? 90;
  const startDate = endDate ? shiftDate(endDate, -(windowDays - 1)) : source[0]?.date ?? "";
  const windowPoints = source.filter((point) => point.date >= startDate && (!endDate || point.date <= endDate));
  const sourceValues = windowPoints.map((point) => point.value).filter((value): value is number => value !== null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  if (sourceValues.length < 2) return <div className={styles.comparison} aria-label={`${domain.label} comparison`}><span>Long-term baseline</span><div><i /><b style={{ insetInlineStart: `${50 + (domain.direction === "improving" ? 1 : domain.direction === "weakening" ? -1 : 0) * ((domain.magnitude ?? 0) / 2)}%` }} /></div><strong>{domain.magnitude === null ? "Magnitude not established" : `${Math.round(domain.magnitude)}% measured displacement`}</strong></div>;
  const width = 760;
  const height = 270;
  const left = 58;
  const right = 16;
  const top = 18;
  const bottom = 48;
  const unit = text(domain.metric?.unit);
  const baseline = number(domain.metric?.baselineValue);
  const geometry = buildTimeSeriesGeometry(windowPoints, { baseline, left, right: width - right, top, bottom: height - bottom });
  const points = geometry.points;
  const values = geometry.coordinates.map((point) => point.value);
  const min = geometry.min;
  const max = geometry.max;
  const span = max - min || 1;
  const xForDate = geometry.xForDate;
  const xFor = (index: number) => xForDate(points[index]?.date ?? points[0]?.date);
  const yFor = geometry.yForValue;
  const present = geometry.coordinates.map((point) => ({ ...point, index: point.originalIndex }));
  const pathFor = (series: Array<{ date: string; value: number | null }>) => {
    const segments: string[] = [];
    let path = "";
    series.forEach((point) => {
      if (point.value === null) { if (path) segments.push(path); path = ""; return; }
      path += `${path ? " L" : "M"} ${xForDate(point.date).toFixed(1)} ${yFor(point.value).toFixed(1)}`;
    });
    if (path) segments.push(path);
    return segments;
  };
  const smoothed = points.map((point, index) => ({ ...point, value: point.value === null ? null : median(points.slice(Math.max(0, index - 6), index + 1).map((item) => item.value).filter((value): value is number => value !== null)) }));
  const rangeSegments = geometry.rangeSegments;
  const tickValues = [max, min + span / 2, min];
  const tickIndices = [0, Math.floor((points.length - 1) / 3), Math.floor((points.length - 1) * 2 / 3), points.length - 1].filter((index, i, all) => all.indexOf(index) === i);
  const resolvedIndex = activeIndex ?? pinnedIndex ?? present.at(-1)?.index ?? null;
  const selected = resolvedIndex === null ? null : present.find((point) => point.index === resolvedIndex) ?? null;
  const selectNearest = (clientX: number) => { const bounds = svgRef.current?.getBoundingClientRect(); if (!bounds) return null; const local = ((clientX - bounds.left) / bounds.width) * width; const nearest = nearestTimeSeriesPoint(geometry.coordinates, local); if (nearest) setActiveIndex(nearest.originalIndex); return nearest; };
  const eventMarkers = showEvents ? events.filter((event) => event.physiologicalDate >= startDate && event.physiologicalDate <= endDate).map((event) => ({ ...event, x: xForDate(event.physiologicalDate) })) : [];
  return <div className={styles.detailChartWrap} style={{ "--domain-tone": chartToneForDomain(domain.key) } as CSSProperties}>
    <div className={styles.detailChartInteractive} tabIndex={0} role="group" aria-label={`${domain.label} chart with axes and exact-value inspection. Use arrow keys to inspect, Enter to pin, and Escape to return to latest.`} onKeyDown={(event) => { if (!["ArrowLeft", "ArrowRight", "Home", "End", "Enter", "Escape"].includes(event.key)) return; event.preventDefault(); if (event.key === "Escape") { setActiveIndex(null); setPinnedIndex(null); return; } if (event.key === "Enter") { if (selected) setPinnedIndex(selected.index); return; } const current = resolvedIndex === null ? present.length - 1 : Math.max(0, present.findIndex((point) => point.index === resolvedIndex)); const next = event.key === "Home" ? 0 : event.key === "End" ? present.length - 1 : Math.max(0, Math.min(present.length - 1, current + (event.key === "ArrowLeft" ? -1 : 1))); setActiveIndex(present[next]?.index ?? null); }}>
      <svg ref={svgRef} className={styles.detailChart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${domain.label} from ${points[0]?.date ?? "first observation"} to ${points.at(-1)?.date ?? "latest observation"}. Values range from ${displayNumber(Math.min(...values), unit)} to ${displayNumber(Math.max(...values), unit)}.`} onPointerMove={(event) => selectNearest(event.clientX)} onPointerDown={(event) => { const point = selectNearest(event.clientX); if (point) setPinnedIndex(point.originalIndex); }} onPointerLeave={() => setActiveIndex(pinnedIndex)}>
        {tickValues.map((value) => <g key={value}><line className={styles.detailGrid} x1={left} x2={width - right} y1={yFor(value)} y2={yFor(value)} /><text className={styles.detailTick} x={left - 8} y={yFor(value) + 4} textAnchor="end">{displayNumber(value, unit)}</text></g>)}
        {tickIndices.map((index) => <text key={index} className={styles.detailDateTick} x={xFor(index)} y={height - 20} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}>{chartDateLabel(points[index]?.date)}</text>)}
        <line className={styles.detailAxis} x1={left} x2={left} y1={top} y2={height - bottom} /><line className={styles.detailAxis} x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} />
        {rangeSegments.map((segment, index) => <polygon key={`personal-range-${index}`} className={styles.detailRangeCorridor} points={`${segment.map((point) => `${xForDate(point.date)},${yFor(point.personalRange!.upper)}`).join(" ")} ${[...segment].reverse().map((point) => `${xForDate(point.date)},${yFor(point.personalRange!.lower)}`).join(" ")}`} />)}
        {showBaseline && baseline !== null ? <line className={styles.detailBaseline} x1={left} x2={width - right} y1={yFor(baseline)} y2={yFor(baseline)} /> : null}
        {showRaw ? pathFor(points).map((path, index) => <path key={`raw-${index}`} className={styles.detailRawPath} d={path} />) : null}
        {showSmoothed ? pathFor(smoothed).map((path, index) => <path key={`smooth-${index}`} className={styles.detailSmoothPath} d={path} />) : null}
        {showRaw ? present.map((point) => {
          const breach = point.personalRange?.status === "above" || point.personalRange?.status === "below";
          const boundary = point.personalRange?.status === "above" ? point.personalRange.upper : point.personalRange?.status === "below" ? point.personalRange.lower : null;
          return <g key={`${point.date}-${point.index}`}>
            {breach && boundary !== null ? <line className={styles.detailRangeTether} x1={xFor(point.index)} x2={xFor(point.index)} y1={yFor(point.value)} y2={yFor(boundary)} /> : null}
            <circle className={breach ? styles.detailRangeBreach : styles.detailRawPoint} cx={xFor(point.index)} cy={yFor(point.value)} r={selected?.index === point.index ? 4 : breach ? 3.2 : 2.2} />
          </g>;
        }) : null}
        {eventMarkers.map((event) => <g key={event.id}><line className={styles.detailEventMarker} x1={event.x} x2={event.x} y1={height - bottom + 4} y2={height - bottom + 16} /><title>{`${event.label} · ${event.physiologicalDate} · ${event.source}`}</title></g>)}
        {selected ? <><line className={styles.detailCrosshair} x1={xFor(selected.index)} x2={xFor(selected.index)} y1={top} y2={height - bottom} /><circle className={styles.detailActivePoint} cx={xFor(selected.index)} cy={yFor(selected.value)} r="5" /></> : null}
      </svg>
      {selected ? <div className={styles.detailTooltip}><span>{chartDateLabel(selected.date)}</span><strong>{displayNumber(selected.value, unit)}</strong><em>{selected.personalRange?.status === "above" || selected.personalRange?.status === "below" ? `Outside personal range · ${displayNumber(selected.value - selected.personalRange.center, unit)} from baseline` : baseline === null ? "Recorded value" : `${displayNumber(selected.value - baseline, unit)} vs baseline`}</em></div> : null}
    </div>
  </div>;
}

function DomainDetail({ domain, observations, panelId, events = [] }: { domain: DomainModel; observations: ObservationModel[]; panelId: string; events?: NonNullable<LongitudinalHealthView["journalEvents"]> }) {
  const [activeMetricId, setActiveMetricId] = useState(text(domain.metric?.id));
  const [showRaw, setShowRaw] = useState(true);
  const [showSmoothed, setShowSmoothed] = useState(true);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showEvents, setShowEvents] = useState(false);
  const activeMetric = domain.metrics.find((metric) => text(metric.id) === activeMetricId) ?? domain.metric;
  const activeDomain = activeMetric === domain.metric ? domain : { ...domain, metric: activeMetric };
  const matching = observations.filter((item) => item.metricIds.some((id) => domain.metricIds.includes(id))).slice(0, 3);
  return (
    <section className={styles.detail} id={panelId} aria-labelledby={`${panelId}-title`} style={{ "--domain-tone": chartToneForDomain(domain.key) } as CSSProperties}>
      <header className={styles.detailHeader}>
        <div>
          <h3 id={`${panelId}-title`}>{domain.label}</h3>
          <p>{domain.summary}</p>
        </div>
        <dl>
          <div><dt>Direction</dt><dd>{DIRECTION_LABELS[domain.direction]}</dd></div>
          <div><dt>Confidence</dt><dd>{domain.confidence}</dd></div>
          <div><dt>Coverage</dt><dd>{formatPercent(domain.coverage)}</dd></div>
        </dl>
      </header>
      <div className={styles.detailControls} role="group" aria-label="Detail chart controls">
        {domain.metrics.length > 1 ? <label className={styles.metricSelector}>Metric<select value={domain.metrics.some((metric) => text(metric.id) === activeMetricId) ? activeMetricId : text(domain.metric?.id)} onChange={(event) => setActiveMetricId(event.target.value)}>{domain.metrics.map((metric) => <option key={text(metric.id)} value={text(metric.id)}>{text(metric.label, text(metric.id))}</option>)}</select></label> : null}
        <button type="button" aria-pressed={showRaw} onClick={() => setShowRaw((value) => !value)}>Raw</button>
        <button type="button" aria-pressed={showSmoothed} onClick={() => setShowSmoothed((value) => !value)}>Smoothed</button>
        <button type="button" aria-pressed={showBaseline} onClick={() => setShowBaseline((value) => !value)}>Baseline</button>
        <button type="button" aria-pressed={showEvents} onClick={() => setShowEvents((value) => !value)} disabled={!events.length}>Events{events.length ? ` · ${events.length}` : ""}</button>
      </div>
      <MetricChart domain={activeDomain} showRaw={showRaw} showSmoothed={showSmoothed} showBaseline={showBaseline} showEvents={showEvents} events={events} />
      {matching.length ? <ol className={styles.domainObservations}>{matching.map((item) => <li key={item.id}><strong>{item.title}</strong><p>{item.observation}</p></li>)}</ol> : null}
      <div className={styles.knownUnknown}>
        <section><h4>Known</h4><p>{domain.summary}</p><p className={styles.provenance}>{matching.length ? `${matching[0].startDate ?? "Start unavailable"} – ${matching[0].endDate ?? "end unavailable"} · ${sentenceCase(matching[0].statementType)} · ${matching[0].sourceRecordIds.length} source records` : `${domain.confidence} confidence · ${formatPercent(domain.coverage)} coverage`}</p></section>
        <section><h4>Unknown</h4>{domain.limitations.length ? <ul>{domain.limitations.map((item) => <li key={item}>{item}</li>)}</ul> : <p>The connected data does not establish why this pattern occurred.</p>}</section>
      </div>
    </section>
  );
}

function ProductionOverview({ view }: { view: LongitudinalHealthView }) {
  const domains = domainModels(view);
  const root = record(view);
  const coverage = record(root.dataCoverage);
  const aggregate = record(root.aggregateTrend);
  const comparisonKeys = ["physiology", "sleep", "cardiovascularActivity", "strength"];
  const comparisonDomains = comparisonKeys.map((key) => domains.find((item) => item.key === key)).filter((item): item is DomainModel => Boolean(item));
  const coveragePercent = normalizedCoverage(number(coverage.overall));
  const confidence = text(aggregate.confidence, "Not established");
  const availableInputs = strings(coverage.availableInputs);
  const unavailableInputs = strings(coverage.unavailableInputs);

  return (
    <section className={`hud-frame ${styles.productionOverview}`} aria-labelledby="whoop-observation-overview-title">
      <div className={styles.productionOverviewGrid}>
        <div className={styles.productionOverviewMain}>
          <div className={styles.productionKicker}>OBSERVATION SYSTEM</div>
          <h2 id="whoop-observation-overview-title">Connected health history</h2>
          <p>Long-range baselines and supported patterns from connected records. This surface describes observations; it does not prescribe actions or interpret medical risk.</p>
          <div className={styles.productionStats}>
            <div><span>Coverage</span><strong>{coveragePercent === null ? "—" : `${Math.round(coveragePercent)}%`}</strong></div>
            <div><span>Window</span><strong>{view.windowDays} days</strong></div>
            <div><span>Confidence</span><strong>{confidence}</strong></div>
          </div>
          <p className={styles.productionMeta}>Selected physiological date: {view.selectedDate} · Generated {view.generatedAt}</p>
          <details className={styles.productionDetails}>
            <summary>Dataset detail</summary>
            <p>{availableInputs.length ? `Available: ${availableInputs.join(", ")}.` : "No connected source records are available."}</p>
            <p>{unavailableInputs.length ? `Unavailable: ${unavailableInputs.join(", ")}.` : "No additional unavailable inputs recorded."}</p>
          </details>
        </div>
        <div className={styles.productionComparisons}>
          {comparisonDomains.map((item) => {
            const metric = item.metric;
            const current = metric ? number(metric.currentValue) : null;
            const unit = metric ? text(metric.unit) : "";
            return (
              <div key={item.key} className={styles.productionComparison}>
                <div><span>{item.label}</span><strong>{current === null ? "—" : `${Number(current.toFixed(1))}${unit}`}</strong></div>
                <div><em>{DIRECTION_LABELS[item.direction]}</em><small>{item.coverage === null ? "Coverage not established" : `${Math.round(item.coverage)}% domain coverage`}</small></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type Timeframe = 30 | 90 | 180 | 365;

const TIMEFRAMES: Array<{ value: Timeframe; label: string }> = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "180 days" },
  { value: 365, label: "1 year" },
];

function glyphForStatus(value: Direction) {
  if (value === "improving") return "↗";
  if (value === "weakening") return "↘";
  if (value === "mixed") return "↕";
  if (value === "insufficient_data") return "—";
  return "→";
}

function shortObservation(value: string) {
  const compact = value
    .replace(/ across the available \d+-day comparison\.?/gi, ".")
    .replace(/ across \d+ recorded comparisons\.?/gi, ".")
    .replace(/ across the available records\.?/gi, ".")
    .replace(/\s+/g, " ")
    .trim();
  const strength = compact.match(/Strength sets trended upward by ([\d.]+) \/week/i);
  if (strength) return `Weekly strength volume increased by ${Math.round(Number(strength[1]))} sets.`;
  const sleep = compact.match(/Sleep duration trended upward by ([\d.]+) h/i);
  if (sleep) return `Sleep duration increased by ${Number(sleep[1]).toFixed(1)}h.`;
  return compact;
}

function displayNumber(value: number | null, unit: string) {
  if (value === null || !Number.isFinite(value)) return "—";
  const digits = unit === "h" || unit === "kg" || unit === "lb" ? 1 : 0;
  const formatted = Number(value.toFixed(digits));
  return unit === "lb" ? `${formatted} lb` : `${formatted}${unit}`;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function chartDateLabel(value: string | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function chartToneForDomain(domainId: string) {
  const tones: Record<string, string> = {
    physiology: "var(--domain-physiology)",
    sleep: "var(--domain-sleep)",
    cardiovascularActivity: "var(--domain-cardio)",
    dailyMovement: "var(--domain-movement)",
    strength: "var(--domain-strength)",
    bodyWeight: "var(--domain-weight)",
  };
  return tones[domainId] ?? "var(--os-signal-current)";
}

type CompactChartPoint = { date: string; value: number };

function CompactSparkline({ metric, timeframe, selectedDate, domainId, activeDate, onActiveChange }: { metric: UnknownRecord | null; timeframe: Timeframe; selectedDate: string; domainId: string; activeDate: string | null; onActiveChange: (date: string | null) => void }) {
  const source = records(metric?.points)
    .map(timeSeriesPoint)
    .filter((point) => Boolean(point.date) && point.date >= shiftDate(selectedDate, -(timeframe - 1)) && point.date <= selectedDate);
  if (source.filter((point) => point.value !== null).length < 2) return <div className={styles.cardChartEmpty}>No chartable observations</div>;
  const left = 35;
  const right = 294;
  const top = 10;
  const bottom = 77;
  const tone = chartToneForDomain(domainId);
  const baseline = number(metric?.baselineValue);
  const geometry = buildTimeSeriesGeometry(source, { baseline, left, right, top, bottom });
  const selected = activeDate ? geometry.coordinates.find((point) => point.date === activeDate) ?? null : null;
  const visibleDates = visiblePointDates(geometry.coordinates, String(timeframe), activeDate);
  const baselineY = baseline === null ? null : geometry.yForValue(baseline);
  const nearest = (clientX: number, target: SVGSVGElement) => {
    const bounds = target.getBoundingClientRect();
    const x = Math.max(left, Math.min(right, ((clientX - bounds.left) / bounds.width) * 300));
    return nearestTimeSeriesPoint(geometry.coordinates, x);
  };
  return (
    <div className={styles.cardChartWrap} style={{ "--chart-tone": tone } as CSSProperties}>
      <svg className={styles.cardChart} viewBox="0 0 300 108" role="img" aria-label={`${text(metric?.label, "Metric")} trend from ${geometry.points[0]?.date} to ${geometry.points.at(-1)?.date}. Use the chart control to inspect exact values.`} onPointerMove={(event) => onActiveChange(nearest(event.clientX, event.currentTarget)?.date ?? null)}>
        {[top, (top + bottom) / 2, bottom].map((y) => <line key={y} className={styles.cardChartGrid} x1={left} x2={right} y1={y} y2={y} />)}
        {baselineY !== null && baselineY >= top && baselineY <= bottom ? <line className={styles.cardChartBaseline} x1={left} x2={right} y1={baselineY} y2={baselineY} /> : null}
        <text className={styles.cardChartAxisLabel} x="2" y={top + 3}>{displayNumber(geometry.max, text(metric?.unit))}</text>
        <text className={styles.cardChartAxisLabel} x="2" y={(top + bottom) / 2 + 3}>{displayNumber((geometry.max + geometry.min) / 2, text(metric?.unit))}</text>
        <text className={styles.cardChartAxisLabel} x="2" y={bottom + 3}>{displayNumber(geometry.min, text(metric?.unit))}</text>
        {geometry.rangeSegments.map((segment, index) => <polygon key={`card-range-${index}`} className={styles.cardChartCorridor} points={`${segment.map((point) => `${point.x},${point.rangeUpperY}`).join(" ")} ${[...segment].reverse().map((point) => `${point.x},${point.rangeLowerY}`).join(" ")}`} />)}
        {geometry.segments.map((segment, index) => <path key={`card-path-${index}`} d={segment.map((point, pointIndex) => `${pointIndex ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ")} />)}
        {geometry.coordinates.filter((point) => visibleDates.has(point.date)).map((point) => {
          const breach = point.personalRange?.status === "above" || point.personalRange?.status === "below";
          const boundary = point.personalRange?.status === "above" ? point.rangeUpperY : point.personalRange?.status === "below" ? point.rangeLowerY : null;
          return <g key={point.date}>{breach && boundary !== null ? <line className={styles.cardChartTether} x1={point.x} x2={point.x} y1={point.y} y2={boundary} /> : null}<circle className={breach ? styles.cardChartBreach : styles.cardChartLatest} cx={point.x} cy={point.y} r={breach ? 4 : 3} /></g>;
        })}
        {selected ? <><line className={styles.cardChartCursor} x1={selected.x} y1={top} x2={selected.x} y2={bottom} /><circle className={styles.cardChartActive} cx={selected.x} cy={selected.y} r="3.5" /></> : null}
        {geometry.coordinates.map((point) => <circle key={`hit-${point.date}`} className={styles.cardChartHit} cx={point.x} cy={point.y} r="8" onPointerEnter={() => onActiveChange(point.date)} />)}
        {[...new Set([0, Math.floor((geometry.points.length - 1) / 2), geometry.points.length - 1])].map((index) => <text key={index} className={styles.cardChartDate} x={geometry.xForDate(geometry.points[index]?.date ?? "")} y="101" textAnchor={index === 0 ? "start" : index === geometry.points.length - 1 ? "end" : "middle"}>{chartDateLabel(geometry.points[index]?.date)}</text>)}
      </svg>
      {selected ? <div className={styles.cardChartTooltip}><span>{chartDateLabel(selected.date)}</span><strong>{displayNumber(selected.value, text(metric?.unit))}</strong><em>{selected.personalRange?.status === "above" || selected.personalRange?.status === "below" ? "Outside personal range" : baseline === null ? "Recorded value" : `${displayNumber(selected.value - baseline, text(metric?.unit))} vs baseline`}</em></div> : null}
    </div>
  );
}

function CompactDomainVisual({ card, timeframe, selectedDate, activeDate, onActiveChange }: { card: UnknownRecord; timeframe: Timeframe; selectedDate: string; activeDate: string | null; onActiveChange: (date: string | null) => void }) {
  const metric = record(card.primaryMetric);
  if (text(card.chartType) !== "weekly_bars") return <CompactSparkline metric={metric} timeframe={timeframe} selectedDate={selectedDate} domainId={text(card.id)} activeDate={activeDate} onActiveChange={onActiveChange} />;
  const points = records(metric.points).map((point) => ({ date: text(point.date), value: number(point.value) })).filter((point): point is CompactChartPoint => point.value !== null && Boolean(point.date) && point.date >= shiftDate(selectedDate, -(timeframe - 1))).slice(-8);
  if (points.length < 2) return <div className={styles.cardChartEmpty}>No chartable observations</div>;
  const max = Math.max(...points.map((point) => point.value), 1);
  const tone = chartToneForDomain(text(card.id));
  const selected = activeDate ? points.find((point) => point.date === activeDate) ?? null : null;
  return <div className={styles.cardChartWrap} style={{ "--chart-tone": tone } as CSSProperties}>
    <div className={styles.cardBars} role="img" aria-label={`${text(metric.label, "Weekly metric")} weekly bars. Use arrow keys while focused on the card to inspect exact values.`}>
      <span className={styles.cardBarsAxis}>{displayNumber(max, text(metric.unit))}</span>
      {points.map((point, index) => <i key={`${point.date}-${index}`} role="img" aria-label={`${chartDateLabel(point.date)} ${displayNumber(point.value, text(metric.unit))}`} className={styles.cardBar} data-active={activeDate === point.date} style={{ height: `${Math.max(8, (point.value / max) * 100)}%` }} onPointerEnter={(event) => { event.stopPropagation(); onActiveChange(point.date); }} />)}
      <span className={styles.cardBarsBaseline}>{displayNumber(0, text(metric.unit))}</span>
    </div>
    {selected ? <div className={styles.cardChartTooltip}><span>{chartDateLabel(selected.date)}</span><strong>{displayNumber(selected.value, text(metric.unit))}</strong><em>Recorded week</em></div> : null}
  </div>;
}

function DomainSnapshotCard({ card, timeframe, selectedDate, onSelect, selected }: { card: UnknownRecord; timeframe: Timeframe; selectedDate: string; onSelect: () => void; selected: boolean }) {
  const primary = record(card.primaryMetric);
  const secondary = record(card.secondaryMetric);
  const cardDirection = direction(card.direction);
  const title = DOMAIN_LABELS[text(card.id)] ?? text(card.title, "Health domain");
  const primaryChange = number(primary.absoluteChange);
  const secondaryChange = number(secondary.absoluteChange);
  const filteredChartPoints = records(primary.points)
    .map(timeSeriesPoint)
    .filter((point): point is TimeSeriesPoint & { value: number } => Boolean(point.date) && point.value !== null && point.date >= shiftDate(selectedDate, -(timeframe - 1)) && point.date <= selectedDate);
  const chartPoints = text(card.chartType) === "weekly_bars" ? filteredChartPoints.slice(-8) : downsampleTimeSeries(filteredChartPoints);
  const latestDate = chartPoints.at(-1)?.date ?? null;
  const [activeDate, setActiveDate] = useState<string | null>(latestDate);
  const [pinnedDate, setPinnedDate] = useState<string | null>(null);
  const resolvedActiveDate = activeDate && chartPoints.some((point) => point.date === activeDate) ? activeDate : latestDate;
  const activePoint = resolvedActiveDate ? chartPoints.find((point) => point.date === resolvedActiveDate) ?? null : null;
  const metricLine = (metric: UnknownRecord, change: number | null) => {
    if (!text(metric.label)) return null;
    const unit = text(metric.unit);
    const sign = change === null ? "" : change > 0 ? "↑ " : change < 0 ? "↓ " : "→ ";
    return <div className={styles.cardMetric}><span>{text(metric.label)}</span><strong>{change === null ? displayNumber(number(metric.currentValue), unit) : `${sign}${displayNumber(Math.abs(change), unit)}`}</strong></div>;
  };
  return (
    <article className={styles.domainCard} data-domain={text(card.id)} data-direction={cardDirection} data-selected={selected}>
      <header><div><h3>{title}</h3><span className={styles.cardDirection}><b aria-hidden="true">{glyphForStatus(cardDirection)}</b>{DIRECTION_LABELS[cardDirection]}</span></div><span className={styles.cardConfidence}>{text(card.confidence, "Not established")}</span></header>
      <div className={styles.domainChartControl} role="group" tabIndex={0} aria-label={`${title} chart. Use arrow keys to inspect, Enter to pin, and Escape to return to latest.${activePoint ? ` Selected ${chartDateLabel(activePoint.date)} ${displayNumber(activePoint.value, text(primary.unit))}.` : ""}`} onPointerLeave={() => setActiveDate(pinnedDate ?? latestDate)} onClick={() => { if (resolvedActiveDate) setPinnedDate(resolvedActiveDate); }} onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End", "Enter", "Escape"].includes(event.key)) return;
        event.preventDefault();
        if (event.key === "Escape") { setPinnedDate(null); setActiveDate(latestDate); return; }
        if (event.key === "Enter") { if (resolvedActiveDate) setPinnedDate(resolvedActiveDate); return; }
        const count = chartPoints.length;
        if (!count) return;
        const current = resolvedActiveDate ? Math.max(0, chartPoints.findIndex((point) => point.date === resolvedActiveDate)) : count - 1;
        const next = event.key === "Home" ? 0 : event.key === "End" ? count - 1 : Math.max(0, Math.min(count - 1, current + (event.key === "ArrowLeft" ? -1 : 1)));
        setActiveDate(chartPoints[next]?.date ?? latestDate);
      }}>
        <CompactDomainVisual card={card} timeframe={timeframe} selectedDate={selectedDate} activeDate={resolvedActiveDate} onActiveChange={setActiveDate} />
      </div>
      <div className={styles.cardMetrics}>{metricLine(primary, primaryChange)}{metricLine(secondary, secondaryChange)}</div>
      <p className={styles.cardObservation}>{shortObservation(text(card.observation, "No supported observation is available."))}</p>
      <footer><span>{number(card.coveredDays) ?? 0} / {number(card.expectedDays) ?? 0} days</span><button type="button" className={styles.domainOpen} onClick={onSelect} aria-expanded={selected}>Open detail →</button></footer>
    </article>
  );
}

function TrajectoryHero({ view, timeframe, setTimeframe, observations }: { view: LongitudinalHealthView; timeframe: Timeframe; setTimeframe: (value: Timeframe) => void; observations: ObservationModel[] }) {
  const aggregate = record(view.aggregateTrend);
  const counts = aggregateCounts(view, domainModels(view).filter((domain) => domain.key !== "recordedBehaviors"));
  const largest = observations.find((item) => item.id !== "current-deviation") ?? null;
  const current = record(view.currentDeviation);
  const coverage = record(view.dataCoverage);
  const overall = normalizedCoverage(number(coverage.overall));
  const covered = number(coverage.coveredDays) ?? (overall === null ? null : Math.round((overall / 100) * view.windowDays));
  const expected = number(coverage.expectedDays) ?? view.windowDays;
  return (
    <section className={`hud-frame ${styles.trajectoryHero}`} aria-labelledby="trajectory-hero-title">
      <div className={styles.heroMain}><div className={styles.heroTitleRow}><div><h2 id="trajectory-hero-title">Long-term signals</h2><p>Describes connected-data trends, not overall health or medical risk.</p></div><div className={styles.timeframeControls} role="group" aria-label="Trajectory timeframe">{TIMEFRAMES.map((item) => <button key={item.value} type="button" aria-pressed={timeframe === item.value} onClick={() => setTimeframe(item.value)}>{item.label}</button>)}</div></div>
        <h3 className={styles.heroStatus}>{text(aggregate.summary, DIRECTION_LABELS[direction(aggregate.direction)])}</h3>
        <div className={styles.countChips}><span><b>{counts.improving}</b> improving</span><span><b>{counts.stable}</b> stable</span><span><b>{counts.weakening}</b> weakening</span></div>
      </div>
      <div className={styles.heroFacts}>
        <div><span>Largest measured shift</span><strong>{largest ? shortObservation(largest.observation) : "No supported shift"}</strong></div>
        <div><span>Current deviation</span><strong>{current.active === true && Array.isArray(current.metrics) && current.metrics.length ? `${current.metrics.length} metrics outside recent ranges today` : "No active deviation today"}</strong></div>
        <div><span>Coverage</span><strong>{overall === null ? "Not established" : `${Math.round(overall)}% · ${covered ?? 0} of ${expected} days`}</strong><details className={styles.coverageDetail}><summary>View breakdown</summary><ul>{Object.entries(record(coverage.bySource)).map(([source, detail]) => <li key={source}><span>{source}</span><b>{Math.round((number(record(detail).ratio) ?? 0) * 100)}%</b></li>)}{strings(coverage.unavailableInputs).length > 0 ? <li><span>Unavailable</span><b>{strings(coverage.unavailableInputs).join(", ")}</b></li> : null}</ul></details></div>
      </div>
    </section>
  );
}

function CurrentDeviationBanner({ view }: { view: LongitudinalHealthView }) {
  const deviation = view.currentDeviation;
  if (!deviation.active || !deviation.metrics.length) return null;
  return <section className={styles.deviationBanner} aria-labelledby="current-deviation-title"><div><span>Current deviation</span><h2 id="current-deviation-title">Outside personal ranges today</h2></div><div className={styles.deviationMetrics}>{deviation.metrics.map((item) => <span key={item.metricId}>{item.label}</span>)}</div><small>{deviation.date} · Long-term direction unchanged</small></section>;
}

void TrajectoryHorizon;
void ProductionOverview;
void topObservations;

export function LongitudinalObservatory({ view }: { view: LongitudinalHealthView }) {
  const domains = useMemo(() => domainModels(view).filter((domain) => domain.key !== "recordedBehaviors"), [view]);
  const observations = useMemo(() => observationModels(view), [view]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>(90);
  const panelId = `${useId()}-domain-detail`;
  const selectedDomain = domains.find((item) => item.key === selectedKey) ?? null;
  const cards = (view.domainCards ?? []).map((card) => record(card));
  const cardById = new Map(cards.map((card) => [text(card.id), card]));

  return (
    <div className={styles.observatory}>
      <TrajectoryHero view={view} timeframe={timeframe} setTimeframe={setTimeframe} observations={observations} />
      <CurrentDeviationBanner view={view} />
      <section className={styles.domainGridSection} aria-labelledby="domain-snapshot-title">
        <header className={styles.sectionHeader}><div><h2 id="domain-snapshot-title">Domain snapshots</h2><p>Six connected domains, one primary visual, and real metric units.</p></div></header>
        <div className={styles.domainGrid}>
          {domains.map((domain) => {
            const card = cardById.get(domain.key) ?? { id: domain.key, title: domain.label, direction: domain.direction, confidence: domain.confidence, observation: domain.summary, primaryMetric: domain.metric, secondaryMetric: null, coveredDays: domain.coverage ? Math.round((domain.coverage / 100) * view.windowDays) : 0, expectedDays: view.windowDays };
            return <DomainSnapshotCard key={domain.key} card={card} timeframe={timeframe} selectedDate={view.selectedDate} selected={selectedKey === domain.key} onSelect={() => setSelectedKey(selectedKey === domain.key ? null : domain.key)} />;
          })}
        </div>
      </section>
      {selectedDomain ? <DomainDetail domain={selectedDomain} observations={observations} panelId={panelId} events={view.journalEvents ?? []} /> : null}
      <MetricGraphs view={view} />
    </div>
  );
  /*
  return (
    <div className={styles.observatory}>
      <section className={`hud-frame ${styles.primary}`} aria-labelledby="longitudinal-health-title">
        <aside className={styles.summary} aria-label="Longitudinal summary">
          <div className={styles.aggregate} data-direction={aggregateDirection}>
            <span>Connected data</span>
            <h3>{text(aggregate.label, DIRECTION_LABELS[aggregateDirection])}</h3>
            <p>{counts.improving} improving · {counts.stable} stable · {counts.weakening} weakening</p>
            {text(aggregate.summary) ? <p className={styles.aggregateSummary}>{text(aggregate.summary)}</p> : null}
          </div>
          <ol className={styles.highlights}>
            {highlights.map((item) => <li key={item.id}><span>{item.title}</span><p>{item.observation}</p></li>)}
          </ol>
          <div className={styles.coverage}>
            <div><span>Data coverage</span><strong>{formatPercent(overallCoverage)}</strong></div>
            <div className={styles.coverageTrack} aria-hidden="true"><i style={{ width: `${overallCoverage ?? 0}%` }} /></div>
            <p>{coveredDays !== null && expectedDays !== null ? `${coveredDays} of ${expectedDays} days covered` : text(record(root.dataCoverage).summary, "Coverage is reported only from connected records.")}</p>
          </div>
        </aside>
      </section>

      <div className={styles.domainTabs} role="group" aria-label="Health data domains">
        {domains.map((domain, index) => {
          const selected = domain.key === selectedKey;
          return <button key={domain.key} ref={(element) => { tabsRef.current[index] = element; }} type="button" aria-expanded={selected} aria-controls={selected ? panelId : undefined} tabIndex={selectedKey === null ? (index === 0 ? 0 : -1) : selected ? 0 : -1} data-direction={domain.direction} onKeyDown={(event) => selectFromKeyboard(event, index)} onClick={() => setSelectedKey(selected ? null : domain.key)}><span>{domain.label}</span><span className={styles.tabState}>{DIRECTION_LABELS[domain.direction]}</span></button>;
        })}
      </div>

      {selectedDomain ? <DomainDetail domain={selectedDomain} observations={observations} panelId={panelId} /> : null}
    </div>
  );
  */
}
