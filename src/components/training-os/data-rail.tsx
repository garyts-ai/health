"use client";

import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { TodayTelemetryMetric } from "./types";
import { MetricInstrument } from "./metric-instrument";
import { GlassPanel } from "./glass-panel";
import { bestTelemetryIndex, formatInstrumentValue, indexFromPointer, nextTelemetryIndex, resolveTelemetryIndex, telemetryPointKey } from "./telemetry-model";
import styles from "./data-rail.module.css";

function formatPointLabel(dateKey: string | undefined, fallback: string) {
  if (!dateKey) return fallback;
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${dateKey}T12:00:00`));
}

export function DataRail({ metrics, label = "Today telemetry" }: { metrics: TodayTelemetryMetric[]; label?: string }) {
  const readoutId = useId();
  const pointCount = Math.max(0, ...metrics.map((metric) => metric.visual?.points.length ?? 0));
  const defaultIndex = useMemo(() => bestTelemetryIndex(metrics.flatMap((metric) => metric.visual ? [metric.visual] : [])), [metrics]);
  const representativePoints = metrics.find((metric) => metric.visual?.points.length)?.visual?.points ?? [];
  const defaultKey = telemetryPointKey(representativePoints[defaultIndex]);
  const [selectedKey, setSelectedKey] = useState(defaultKey);
  const activeIndex = resolveTelemetryIndex(representativePoints, selectedKey, defaultIndex);
  const activePoint = metrics.find((metric) => metric.visual?.points[activeIndex])?.visual?.points[activeIndex];
  const activeLabel = activePoint ? formatPointLabel(activePoint.dateKey, activePoint.label) : "Selected day";
  const readout = useMemo(() => metrics.map((metric) => {
    const point = metric.visual?.points[activeIndex];
    return { label: metric.label, value: point?.value == null || !metric.visual ? "No data" : formatInstrumentValue(metric.visual, point.value) };
  }), [activeIndex, metrics]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Escape") setSelectedKey(defaultKey);
    else setSelectedKey(telemetryPointKey(representativePoints[nextTelemetryIndex(event.key, activeIndex, pointCount)]));
  }

  function selectFromPointer(event: PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setSelectedKey(telemetryPointKey(representativePoints[indexFromPointer(event.clientX, bounds.left, bounds.width, pointCount)]));
  }

  return <GlassPanel as="div" level="raised" className={styles.shell}>
    <div className={styles.interaction} role="group" tabIndex={0} aria-label={`${label}. Use left and right arrow keys to inspect each day.`} aria-describedby={readoutId} onKeyDown={handleKeyDown}>
      <div className={styles.readout} id={readoutId} aria-live="polite">
        <strong>{activeLabel}</strong>
        <dl>{readout.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
      </div>
      <dl className={styles.rail} aria-label={label}>
        {metrics.map((metric) => <MetricInstrument {...metric} key={metric.label} selectedIndex={activeIndex} onPointerMove={selectFromPointer} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); selectFromPointer(event); }} />)}
      </dl>
    </div>
  </GlassPanel>;
}
