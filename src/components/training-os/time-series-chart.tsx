"use client";

import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

import { buildTimeSeriesGeometry, nearestTimeSeriesPoint, visiblePointDates, type TimeSeriesCoordinate, type TimeSeriesPoint } from "./time-series";
import styles from "./time-series-chart.module.css";

export type TimeSeriesMetricIdentity = "recovery" | "sleep" | "hrv" | "restingHeartRate" | "strain" | "skinTemperature" | "alcohol" | "current";
export type TimeSeriesRange = "week" | "30d" | "3m" | "1y" | "all" | string;
export type TimeSeriesPresentation = "line" | "area-line" | "bar";

export type TimeSeriesEvent = {
  id: string;
  date: string;
  label: string;
  type: string;
};

export type TimeSeriesChartProps = {
  metric: TimeSeriesMetricIdentity;
  label: string;
  unit: string;
  points: TimeSeriesPoint[];
  baseline?: number | null;
  presentation?: TimeSeriesPresentation;
  range?: TimeSeriesRange;
  activeDate?: string | null;
  pinnedDate?: string | null;
  events?: TimeSeriesEvent[];
  height?: number;
  showTooltip?: boolean;
  showEvents?: boolean;
  className?: string;
  tone?: string;
  formatValue?: (value: number | null) => string;
  onActiveDateChange?: (date: string) => void;
  onPinnedDateChange?: (date: string | null) => void;
};

const dateLabel = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

export function TimeSeriesChart({
  metric,
  label,
  unit,
  points,
  baseline = null,
  presentation = "line",
  range = "all",
  activeDate,
  pinnedDate,
  events = [],
  height = 148,
  showTooltip = true,
  showEvents = false,
  className,
  tone,
  formatValue = (value) => value === null ? "—" : `${Number(value.toFixed(1))}${unit}`,
  onActiveDateChange,
  onPinnedDateChange,
}: TimeSeriesChartProps) {
  const geometry = useMemo(() => buildTimeSeriesGeometry(points, { baseline }), [baseline, points]);
  const latestDate = geometry.coordinates.at(-1)?.date ?? null;
  const [localActiveDate, setLocalActiveDate] = useState<string | null>(null);
  const [localPinnedDate, setLocalPinnedDate] = useState<string | null>(null);
  const resolvedPinnedDate = pinnedDate === undefined ? localPinnedDate : pinnedDate;
  const resolvedActiveDate = activeDate === undefined ? (localActiveDate ?? resolvedPinnedDate ?? latestDate) : (activeDate ?? resolvedPinnedDate ?? latestDate);
  const active = geometry.coordinates.find((point) => point.date === resolvedActiveDate) ?? (resolvedActiveDate ? nearestTimeSeriesPoint(geometry.coordinates, geometry.xForDate(resolvedActiveDate)) : geometry.coordinates.at(-1)) ?? null;
  const visibleDates = visiblePointDates(geometry.coordinates, range, active?.date);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const style = { "--chart-height": `${height}px`, ...(tone ? { "--chart-tone": tone } : {}) } as CSSProperties;
  const setActive = (date: string) => {
    if (activeDate === undefined) setLocalActiveDate(date);
    onActiveDateChange?.(date);
  };
  const setPinned = (date: string | null) => {
    if (pinnedDate === undefined) setLocalPinnedDate(date);
    onPinnedDateChange?.(date);
  };
  const reset = () => {
    if (activeDate === undefined) setLocalActiveDate(latestDate);
    setPinned(null);
    if (latestDate) onActiveDateChange?.(latestDate);
  };
  const selectPointer = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    const nearest = nearestTimeSeriesPoint(geometry.coordinates, Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)));
    if (nearest) setActive(nearest.date);
    return nearest;
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End", "Enter", "Escape"].includes(event.key) || !geometry.coordinates.length) return;
    event.preventDefault();
    if (event.key === "Escape") { reset(); return; }
    if (event.key === "Enter") { if (active) setPinned(active.date); return; }
    const current = Math.max(0, active ? geometry.coordinates.findIndex((point) => point.date === active.date) : geometry.coordinates.length - 1);
    const next = event.key === "Home" ? 0 : event.key === "End" ? geometry.coordinates.length - 1 : Math.max(0, Math.min(geometry.coordinates.length - 1, current + (event.key === "ArrowLeft" ? -1 : 1)));
    setActive(geometry.coordinates[next].date);
  };
  const rangePath = (segment: TimeSeriesCoordinate[]) => {
    const upper = segment.map((point) => `${point.x},${point.rangeUpperY}`).join(" ");
    const lower = [...segment].reverse().map((point) => `${point.x},${point.rangeLowerY}`).join(" ");
    return `${upper} ${lower}`;
  };
  const barWidth = Math.max(.8, Math.min(8, 72 / Math.max(1, geometry.coordinates.length)));
  const coordinateByDate = new Map(geometry.coordinates.map((point) => [point.date, point]));
  const currentEvents = events.filter((event) => points.some((point) => point.date === event.date));
  return <div className={`${styles.chart}${className ? ` ${className}` : ""}`} data-metric={metric} style={style}>
    <div className={styles.viewport} role="group" tabIndex={0} aria-label={`${label} chart. Use left and right arrows to inspect, Enter to pin, Home or End to jump, and Escape to return to latest.`} onKeyDown={handleKeyDown}>
      <svg ref={svgRef} className={styles.svg} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${label} trend with ${geometry.coordinates.length} recorded observations.`} onPointerMove={selectPointer} onPointerDown={(event) => { const point = selectPointer(event); if (point) setPinned(point.date); }} onPointerLeave={() => { const restore = resolvedPinnedDate ?? latestDate; if (restore) setActive(restore); }}>
        {[12, 50, 88].map((y) => <line className={styles.grid} key={y} x1="0" x2="100" y1={y} y2={y} />)}
        {baseline !== null ? <line className={styles.baseline} x1="0" x2="100" y1={geometry.yForValue(baseline)} y2={geometry.yForValue(baseline)} /> : null}
        {geometry.rangeSegments.map((segment, index) => <polygon className={styles.corridor} points={rangePath(segment)} key={`range-${index}`} />)}
        {presentation === "area-line" ? geometry.segments.map((segment, index) => { const first = segment[0]; const last = segment.at(-1); return first && last ? <polygon className={styles.area} key={`area-${index}`} points={`${first.x},88 ${segment.map((point) => `${point.x},${point.y}`).join(" ")} ${last.x},88`} /> : null; }) : null}
        {presentation !== "bar" ? geometry.segments.map((segment, index) => <polyline className={styles.line} key={`line-${index}`} points={segment.map((point) => `${point.x},${point.y}`).join(" ")} />) : geometry.points.map((point) => {
          const coordinate = coordinateByDate.get(point.date);
          const x = geometry.xForDate(point.date);
          return coordinate
            ? <rect className={styles.bar} key={point.date} x={x - barWidth / 2} y={coordinate.y} width={barWidth} height={88 - coordinate.y} />
            : <rect className={styles.missingBar} key={point.date} x={x - barWidth / 2} y="80" width={barWidth} height="8" />;
        })}
        {active ? <line className={styles.cursor} x1={active.x} x2={active.x} y1="8" y2="92" /> : null}
      </svg>
      <div className={styles.pointLayer} aria-hidden="true">
        {geometry.coordinates.filter((point) => visibleDates.has(point.date) && presentation !== "bar").map((point) => {
          const breach = point.personalRange?.status === "above" || point.personalRange?.status === "below";
          const boundary = point.personalRange?.status === "above" ? point.rangeUpperY : point.personalRange?.status === "below" ? point.rangeLowerY : null;
          return <span key={point.date}>
            {breach && boundary !== null ? <i className={styles.tether} style={{ left: `${point.x}%`, top: `${Math.min(point.y, boundary)}%`, height: `${Math.abs(point.y - boundary)}%` }} /> : null}
            <i className={styles.point} data-active={active?.date === point.date} data-breach={breach} style={{ left: `${point.x}%`, top: `${point.y}%` }} />
          </span>;
        })}
      </div>
      {active && showTooltip ? <div className={styles.tooltip} data-breach={active.personalRange?.status === "above" || active.personalRange?.status === "below"} style={{ left: `${Math.max(18, Math.min(82, active.x))}%`, top: `${Math.max(24, active.y)}%` }}><span>{dateLabel(active.date)}</span><strong>{formatValue(active.value)}</strong><em>{active.personalRange?.status === "above" || active.personalRange?.status === "below" ? `Outside personal range · ${formatValue(active.value - active.personalRange.center)} from baseline` : baseline === null ? "Recorded value" : `${formatValue(active.value - baseline)} vs baseline`}</em></div> : null}
      <span className={styles.srOnly} aria-live="polite">{active ? `${dateLabel(active.date)}, ${formatValue(active.value)}${active.personalRange?.status === "above" || active.personalRange?.status === "below" ? ", outside personal range" : ""}` : "No recorded value"}</span>
    </div>
    {showEvents && currentEvents.length ? <div className={styles.eventRail} aria-label="Recorded journal events. These marks do not establish a cause."><span className={styles.eventRailLabel}>Recorded events</span><div className={styles.eventTrack}>{currentEvents.map((event) => <i className={styles.event} data-type={event.type} key={event.id} style={{ left: `${geometry.xForDate(event.date)}%` }} title={`${event.label} · ${dateLabel(event.date)} · journal record only`} />)}</div></div> : null}
  </div>;
}
