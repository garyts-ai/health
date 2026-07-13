import { useId, type PointerEventHandler } from "react";
import type { InstrumentVisual, TodayTelemetryMetric } from "./types";
import { chartSummary, formatInstrumentValue } from "./telemetry-model";
import styles from "./metric-instrument.module.css";

const chartValues = (visual: InstrumentVisual) => visual.points.flatMap((point) => point.value == null ? [] : [point.value]);

function chartBounds(visual: InstrumentVisual) {
  const values = chartValues(visual);
  if (!values.length) return { min: 0, max: 1 };
  const rawMin = Math.min(...values, visual.baseline ?? Infinity);
  const rawMax = Math.max(...values, visual.baseline ?? -Infinity);
  const padding = Math.max((rawMax - rawMin) * .14, visual.unit === "%" ? 4 : .4);
  return { min: Math.max(0, rawMin - padding), max: rawMax + padding };
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function dateLabel(point: { dateKey?: string; label: string }) {
  if (!point.dateKey) return point.label;
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${point.dateKey}T12:00:00Z`));
}

function InstrumentChart({ visual, label, selectedIndex, permanentIndex }: { visual: InstrumentVisual; label: string; selectedIndex: number; permanentIndex: number }) {
  const gradientId = useId().replace(/:/g, "");
  const { min, max } = chartBounds(visual);
  const range = max - min || 1;
  const x = (index: number) => visual.points.length <= 1 ? 50 : 4 + (index / (visual.points.length - 1)) * 92;
  const y = (value: number) => 63 - ((value - min) / range) * 51;
  const coords = visual.points.map((point, index) => point.value == null ? null : { x: x(index), y: y(point.value) });
  const segments: string[] = [];
  const areaSegments: string[] = [];
  let segment = "";
  let areaSegment = "";
  let areaStartX: number | null = null;
  let areaEndX: number | null = null;
  for (const coordinate of coords) {
    if (!coordinate) {
      if (segment) segments.push(segment);
      if (areaSegment && areaStartX != null && areaEndX != null) areaSegments.push(`${areaSegment} L${areaEndX.toFixed(1)} 63 L${areaStartX.toFixed(1)} 63 Z`);
      segment = "";
      areaSegment = "";
      areaStartX = null;
      areaEndX = null;
      continue;
    }
    segment += `${segment ? " L" : "M"}${coordinate.x.toFixed(1)} ${coordinate.y.toFixed(1)}`;
    areaSegment += `${areaSegment ? " L" : "M"}${coordinate.x.toFixed(1)} ${coordinate.y.toFixed(1)}`;
    areaStartX ??= coordinate.x;
    areaEndX = coordinate.x;
  }
  if (segment) segments.push(segment);
  if (areaSegment && areaStartX != null && areaEndX != null) areaSegments.push(`${areaSegment} L${areaEndX.toFixed(1)} 63 L${areaStartX.toFixed(1)} 63 Z`);
  const selectedX = x(selectedIndex);
  const metricId = label.toLowerCase();
  const isStrain = metricId === "strain";
  return <svg className={styles.chart} viewBox="0 0 100 68" preserveAspectRatio="none" role="img" aria-label={`${label} seven-day telemetry chart`}>
    <defs>
      <linearGradient id={`${gradientId}-area`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="currentColor" stopOpacity={isStrain ? ".26" : ".16"} />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${gradientId}-sleep`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="var(--sleep-primary)" />
        <stop offset="1" stopColor="var(--sleep-secondary)" stopOpacity=".64" />
      </linearGradient>
    </defs>
    {[12, 37.5, 63].map((gridY) => <line className={styles.grid} x1="4" x2="96" y1={gridY} y2={gridY} key={gridY} />)}
    {visual.baseline != null && visual.baseline >= min && visual.baseline <= max ? <line className={styles.baseline} x1="4" x2="96" y1={y(visual.baseline)} y2={y(visual.baseline)} /> : null}
    {(isStrain || metricId === "recovery") ? areaSegments.map((path) => <path className={styles.area} d={path} fill={`url(#${gradientId}-area)`} key={path} />) : null}
    {visual.kind === "line" ? segments.map((path) => <path className={styles.line} d={path} key={path} />) : null}
    {visual.kind === "bars" ? visual.points.map((point, index) => {
      if (point.value == null) return <rect className={styles.missingBar} x={x(index) - 4.5} y="52" width="9" height="11" rx="2.2" key={index} />;
      const coordinate = coords[index];
      if (!coordinate) return null;
      return <g key={index}>
        <rect className={index === selectedIndex ? styles.selectedBar : styles.bar} x={x(index) - 4.5} y={coordinate.y} width="9" height={Math.max(1, 63 - coordinate.y)} rx="2.2" fill={`url(#${gradientId}-sleep)`} />
        <line className={styles.barHighlight} x1={x(index) - 3.5} x2={x(index) + 3.5} y1={coordinate.y + .8} y2={coordinate.y + .8} />
      </g>;
    }) : null}
    {selectedIndex !== permanentIndex ? <line className={styles.permanentCursor} x1={x(permanentIndex)} x2={x(permanentIndex)} y1="8" y2="65" /> : null}
    <line className={styles.cursor} data-permanent={selectedIndex === permanentIndex ? "true" : undefined} x1={selectedX} x2={selectedX} y1="8" y2="65" />
    {coords.map((point, index) => point && visual.kind === "line" ? <circle className={index === selectedIndex ? styles.selectedPoint : index === permanentIndex ? styles.permanentPoint : styles.point} key={index} cx={point.x} cy={point.y} r={index === selectedIndex ? 2.8 : index === permanentIndex ? 2.2 : 1.35} /> : null)}
  </svg>;
}

type Props = TodayTelemetryMetric & {
  selectedIndex: number;
  permanentIndex: number;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerLeave: PointerEventHandler<HTMLElement>;
  onPointerDown: PointerEventHandler<HTMLElement>;
  onDayFocus: (index: number) => void;
};

export function MetricInstrument({ label, value, detail, tone, visual, selectedIndex, permanentIndex, onPointerMove, onPointerLeave, onPointerDown, onDayFocus }: Props) {
  const summary = visual ? chartSummary(visual) : null;
  const med = visual ? median(chartValues(visual)) : null;
  const metricId = label.toLowerCase();
  const rangeLabels = metricId === "sleep" ? ["Shortest", "Median", "Longest"] : metricId === "strain" ? ["Low", "Average", "High"] : ["Low", "Median", "High"];
  return <div className={styles.instrument} data-tone={tone} data-metric={metricId}>
    <dt>{label}</dt><dd>
      <div className={styles.heading}><strong>{value}</strong><p>{detail}</p></div>
      {visual ? <div className={styles.plot} aria-label={`${label} seven-day chart. Focus the daily telemetry module and use arrow keys to inspect dates.`} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} onPointerDown={onPointerDown}>
        <InstrumentChart visual={visual} label={label} selectedIndex={selectedIndex} permanentIndex={permanentIndex} />
        <div className={styles.dayLabels} aria-hidden="true">{visual.points.map((point, index) => <span className={index === selectedIndex ? styles.activeDay : undefined} key={`${point.label}-${index}`}>{point.label.slice(0, 1)}</span>)}</div>
      </div> : null}
      {summary && visual ? <div className={styles.range} aria-label={`${label} ${rangeLabels[0].toLowerCase()} ${formatInstrumentValue(visual, summary.min)}, ${rangeLabels[1].toLowerCase()} ${formatInstrumentValue(visual, med ?? summary.average)}, ${rangeLabels[2].toLowerCase()} ${formatInstrumentValue(visual, summary.max)}`}><span><small>{rangeLabels[0]}</small>{formatInstrumentValue(visual, summary.min)}</span><span><small>{rangeLabels[1]}</small>{formatInstrumentValue(visual, med ?? summary.average)}</span><span><small>{rangeLabels[2]}</small>{formatInstrumentValue(visual, summary.max)}</span></div> : <p className={styles.empty}>No seven-day data</p>}
      {visual ? <ul className={styles.srOnly} aria-label={`${label} exact daily observations`}>{visual.points.map((point, index) => <li key={`${point.label}-${index}`} tabIndex={0} onFocus={() => onDayFocus(index)}>{dateLabel(point)}: {point.value == null ? "No data" : formatInstrumentValue(visual, point.value)}</li>)}</ul> : null}
    </dd>
  </div>;
}
