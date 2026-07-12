import type { PointerEventHandler } from "react";
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

function InstrumentChart({ visual, selectedIndex }: { visual: InstrumentVisual; selectedIndex: number }) {
  const { min, max } = chartBounds(visual);
  const range = max - min || 1;
  const x = (index: number) => visual.points.length <= 1 ? 50 : 4 + (index / (visual.points.length - 1)) * 92;
  const y = (value: number) => 63 - ((value - min) / range) * 51;
  const coords = visual.points.map((point, index) => point.value == null ? null : { x: x(index), y: y(point.value) });
  const segments: string[] = [];
  let segment = "";
  for (const coordinate of coords) {
    if (!coordinate) { if (segment) segments.push(segment); segment = ""; continue; }
    segment += `${segment ? " L" : "M"}${coordinate.x.toFixed(1)} ${coordinate.y.toFixed(1)}`;
  }
  if (segment) segments.push(segment);
  const selectedX = x(selectedIndex);
  return <svg className={styles.chart} viewBox="0 0 100 68" preserveAspectRatio="none" aria-hidden="true">
    {[12, 37.5, 63].map((gridY) => <line className={styles.grid} x1="4" x2="96" y1={gridY} y2={gridY} key={gridY} />)}
    {visual.baseline != null && visual.baseline >= min && visual.baseline <= max ? <line className={styles.baseline} x1="4" x2="96" y1={y(visual.baseline)} y2={y(visual.baseline)} /> : null}
    {visual.kind === "line" ? segments.map((path) => <path className={styles.line} d={path} key={path} />) : null}
    {visual.kind === "bars" ? coords.map((point, index) => point ? <rect className={index === selectedIndex ? styles.selectedBar : styles.bar} x={x(index) - 4.5} y={point.y} width="9" height={63 - point.y} key={index} /> : null) : null}
    <line className={styles.cursor} x1={selectedX} x2={selectedX} y1="8" y2="65" />
    {coords.map((point, index) => point && visual.kind === "line" ? <circle className={index === selectedIndex ? styles.selectedPoint : styles.point} key={index} cx={point.x} cy={point.y} r={index === selectedIndex ? 2.8 : 1.5} /> : null)}
  </svg>;
}

type Props = TodayTelemetryMetric & { selectedIndex: number; onPointerMove: PointerEventHandler<HTMLElement>; onPointerDown: PointerEventHandler<HTMLElement> };

export function MetricInstrument({ label, value, detail, tone, visual, selectedIndex, onPointerMove, onPointerDown }: Props) {
  const summary = visual ? chartSummary(visual) : null;
  return <div className={styles.instrument} data-tone={tone}>
    <dt>{label}</dt><dd>
      <div className={styles.heading}><strong>{value}</strong><p>{detail}</p></div>
      {visual ? <div className={styles.plot} onPointerMove={onPointerMove} onPointerDown={onPointerDown}>
        <InstrumentChart visual={visual} selectedIndex={selectedIndex} />
        <div className={styles.dayLabels} aria-hidden="true">{visual.points.map((point, index) => <span key={`${point.label}-${index}`}>{point.label.slice(0, 1)}</span>)}</div>
      </div> : null}
      {summary && visual ? <div className={styles.range} aria-label={`${label} seven-day minimum ${formatInstrumentValue(visual, summary.min)}, average ${formatInstrumentValue(visual, summary.average)}, maximum ${formatInstrumentValue(visual, summary.max)}`}><span>MIN {formatInstrumentValue(visual, summary.min)}</span><span>AVG {formatInstrumentValue(visual, summary.average)}</span><span>MAX {formatInstrumentValue(visual, summary.max)}</span></div> : <p className={styles.empty}>No seven-day data</p>}
    </dd>
  </div>;
}
