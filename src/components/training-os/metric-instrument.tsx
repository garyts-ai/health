import type { PointerEventHandler } from "react";
import type { InstrumentVisual, TodayTelemetryMetric } from "./types";
import { chartSummary, formatInstrumentValue } from "./telemetry-model";
import { TimeSeriesChart, type TimeSeriesMetricIdentity } from "./time-series-chart";
import styles from "./metric-instrument.module.css";

const chartValues = (visual: InstrumentVisual) => visual.points.flatMap((point) => point.value == null ? [] : [point.value]);

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

function InstrumentChart({ visual, label, selectedIndex, permanentIndex, onDayFocus, onDayPin }: { visual: InstrumentVisual; label: string; selectedIndex: number; permanentIndex: number; onDayFocus: (index: number) => void; onDayPin: (index: number | null) => void }) {
  const fallbackStart = Date.UTC(2000, 0, 1);
  const points = visual.points.map((point, index) => ({
    date: point.dateKey ?? new Date(fallbackStart + index * 86_400_000).toISOString().slice(0, 10),
    value: point.value,
  }));
  const metric = label.toLowerCase() as "recovery" | "sleep" | "strain";
  const identity: TimeSeriesMetricIdentity = metric === "recovery" || metric === "sleep" || metric === "strain" ? metric : "current";
  const dateAt = (index: number) => points[Math.max(0, Math.min(points.length - 1, index))]?.date ?? null;
  const focusDate = (date: string) => {
    const index = points.findIndex((point) => point.date === date);
    if (index >= 0) onDayFocus(index);
  };
  return <TimeSeriesChart
    metric={identity}
    label={`${label} seven-day telemetry`}
    unit={visual.unit}
    points={points}
    baseline={visual.baseline}
    presentation={visual.kind === "bars" ? "bar" : metric === "recovery" || metric === "strain" ? "area-line" : "line"}
    range="week"
    activeDate={dateAt(selectedIndex)}
    pinnedDate={dateAt(permanentIndex)}
    height={122}
    showTooltip={false}
    formatValue={(value) => value === null ? "No data" : formatInstrumentValue(visual, value)}
    onActiveDateChange={focusDate}
    onPinnedDateChange={(date) => {
      if (!date) { onDayPin(null); return; }
      const index = points.findIndex((point) => point.date === date);
      if (index >= 0) onDayPin(index);
    }}
  />;
}

type Props = TodayTelemetryMetric & {
  selectedIndex: number;
  permanentIndex: number;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerLeave: PointerEventHandler<HTMLElement>;
  onPointerDown: PointerEventHandler<HTMLElement>;
  onDayFocus: (index: number) => void;
  onDayPin: (index: number | null) => void;
};

export function MetricInstrument({ label, value, detail, tone, visual, selectedIndex, permanentIndex, onPointerMove, onPointerLeave, onPointerDown, onDayFocus, onDayPin }: Props) {
  const summary = visual ? chartSummary(visual) : null;
  const med = visual ? median(chartValues(visual)) : null;
  const metricId = label.toLowerCase();
  const rangeLabels = metricId === "sleep" ? ["Shortest", "Median", "Longest"] : metricId === "strain" ? ["Low", "Average", "High"] : ["Low", "Median", "High"];
  return <div className={styles.instrument} data-tone={tone} data-metric={metricId}>
    <dt>{label}</dt><dd>
      <div className={styles.heading}><strong>{value}</strong><p>{detail}</p></div>
      {visual ? <div className={styles.plot} aria-label={`${label} seven-day chart. Focus the daily telemetry module and use arrow keys to inspect dates.`} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} onPointerDown={onPointerDown}>
        <InstrumentChart visual={visual} label={label} selectedIndex={selectedIndex} permanentIndex={permanentIndex} onDayFocus={onDayFocus} onDayPin={onDayPin} />
        <div className={styles.dayLabels} aria-hidden="true">{visual.points.map((point, index) => <span className={index === selectedIndex ? styles.activeDay : undefined} key={`${point.label}-${index}`}>{point.label.slice(0, 1)}</span>)}</div>
      </div> : null}
      {summary && visual ? <div className={styles.range} aria-label={`${label} ${rangeLabels[0].toLowerCase()} ${formatInstrumentValue(visual, summary.min)}, ${rangeLabels[1].toLowerCase()} ${formatInstrumentValue(visual, med ?? summary.average)}, ${rangeLabels[2].toLowerCase()} ${formatInstrumentValue(visual, summary.max)}`}><span><small>{rangeLabels[0]}</small>{formatInstrumentValue(visual, summary.min)}</span><span><small>{rangeLabels[1]}</small>{formatInstrumentValue(visual, med ?? summary.average)}</span><span><small>{rangeLabels[2]}</small>{formatInstrumentValue(visual, summary.max)}</span></div> : <p className={styles.empty}>No seven-day data</p>}
      {visual ? <ul className={styles.srOnly} aria-label={`${label} exact daily observations`}>{visual.points.map((point, index) => <li key={`${point.label}-${index}`} tabIndex={0} onFocus={() => onDayFocus(index)}>{dateLabel(point)}: {point.value == null ? "No data" : formatInstrumentValue(visual, point.value)}</li>)}</ul> : null}
    </dd>
  </div>;
}
