"use client";

import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { TodayTelemetryMetric } from "./types";
import { MetricInstrument } from "./metric-instrument";
import { GlassPanel } from "./glass-panel";
import { bestTelemetryIndex, formatInstrumentValue, indexFromPointer, nextTelemetryIndex, resolveTelemetryIndex, telemetryPointKey } from "./telemetry-model";
import styles from "./data-rail.module.css";

function formatPointLabel(dateKey: string | undefined, fallback: string) {
  if (!dateKey) return fallback;
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function DataRail({ metrics, label = "Today telemetry" }: { metrics: TodayTelemetryMetric[]; label?: string }) {
  const readoutId = useId();
  const pointCount = Math.max(0, ...metrics.map((metric) => metric.visual?.points.length ?? 0));
  const defaultIndex = useMemo(() => bestTelemetryIndex(metrics.flatMap((metric) => metric.visual ? [metric.visual] : [])), [metrics]);
  const representativePoints = metrics.find((metric) => metric.visual?.points.length)?.visual?.points ?? [];
  const defaultKey = telemetryPointKey(representativePoints[defaultIndex]);
  const [selectedKey, setSelectedKey] = useState(defaultKey);
  const [hoveredKey, setHoveredKey] = useState<string | undefined>();
  const selectedIndex = resolveTelemetryIndex(representativePoints, selectedKey, defaultIndex);
  const activeIndex = resolveTelemetryIndex(representativePoints, hoveredKey ?? selectedKey, selectedIndex);
  const activePoint = metrics.find((metric) => metric.visual?.points[activeIndex])?.visual?.points[activeIndex];
  const activeLabel = activePoint ? formatPointLabel(activePoint.dateKey, activePoint.label) : "Selected day";
  const readout = useMemo(() => metrics.map((metric) => {
    const point = metric.visual?.points[activeIndex];
    return { label: metric.label, value: point?.value == null || !metric.visual ? "No data" : formatInstrumentValue(metric.visual, point.value), detail: metric.detail };
  }), [activeIndex, metrics]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End", "Escape", "Enter"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Escape") {
      setHoveredKey(undefined);
      setSelectedKey(telemetryPointKey(representativePoints[Math.max(0, pointCount - 1)]));
      return;
    }
    if (event.key === "Enter") {
      pinActiveDay();
      return;
    }
    setHoveredKey(telemetryPointKey(representativePoints[nextTelemetryIndex(event.key, activeIndex, pointCount)]));
  }

  function selectFromPointer(event: PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setHoveredKey(telemetryPointKey(representativePoints[indexFromPointer(event.clientX, bounds.left, bounds.width, pointCount)]));
  }

  function pinFromPointer(event: PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const index = indexFromPointer(event.clientX, bounds.left, bounds.width, pointCount);
    setSelectedKey(telemetryPointKey(representativePoints[index]));
    setHoveredKey(undefined);
  }

  function pinActiveDay() {
    setSelectedKey(telemetryPointKey(representativePoints[activeIndex]));
    setHoveredKey(undefined);
  }

  return <GlassPanel as="div" level="raised" className={styles.shell}>
    <div className={styles.interaction} role="group" tabIndex={0} aria-label={`${label}. Use left and right arrow keys to inspect each day. Press Enter to pin a day, or Escape to return to latest.`} aria-describedby={readoutId} onKeyDown={handleKeyDown} onPointerLeave={() => setHoveredKey(undefined)}>
      <header className={styles.telemetryHeader} id={readoutId} aria-live="polite">
        <div className={styles.headerTitle}>
          <span className={styles.eyebrow}>Daily telemetry</span>
          <strong>{activeLabel}</strong>
          <span className={styles.selectionState}>{hoveredKey ? "Inspecting day" : "Selected day"}</span>
        </div>
        <dl className={styles.headerValues}>
          {readout.map((item) => <div key={item.label} data-metric={item.label.toLowerCase()}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
        </dl>
      </header>
      {hoveredKey ? <div className={styles.tooltip} role="tooltip" aria-label={`Telemetry for ${activeLabel}`}>
        <span>{activeLabel}</span>
        {readout.map((item) => <b key={item.label}><small>{item.label}</small>{item.value}</b>)}
      </div> : null}
      <dl className={styles.rail} aria-label={label}>
        {metrics.map((metric) => <MetricInstrument {...metric} key={metric.label} selectedIndex={activeIndex} permanentIndex={selectedIndex} onPointerMove={selectFromPointer} onPointerLeave={() => setHoveredKey(undefined)} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pinFromPointer(event); }} onDayFocus={(index) => setHoveredKey(telemetryPointKey(representativePoints[index]))} onDayPin={(index) => { const next = index ?? Math.max(0, pointCount - 1); setSelectedKey(telemetryPointKey(representativePoints[next])); setHoveredKey(undefined); }} />)}
      </dl>
    </div>
  </GlassPanel>;
}
