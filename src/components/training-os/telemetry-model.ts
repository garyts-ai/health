import type { TrendPoint } from "@/lib/insights/types";
import type { InstrumentVisual } from "./types";

const clampIndex = (index: number, count: number) => Math.max(0, Math.min(count - 1, index));

export function indexFromPointer(clientX: number, left: number, width: number, count: number) {
  if (count <= 1 || width <= 0) return 0;
  return clampIndex(Math.round(((clientX - left) / width) * (count - 1)), count);
}

export function nextTelemetryIndex(key: string, current: number, count: number) {
  if (count <= 0) return -1;
  if (key === "ArrowLeft") return clampIndex(current - 1, count);
  if (key === "ArrowRight") return clampIndex(current + 1, count);
  if (key === "Home") return 0;
  if (key === "End" || key === "Escape") return count - 1;
  return current;
}

export function bestTelemetryIndex(visuals: InstrumentVisual[]) {
  const count = Math.max(0, ...visuals.map((visual) => visual.points.length));
  let bestIndex = Math.max(0, count - 1);
  let bestCoverage = -1;
  for (let index = 0; index < count; index += 1) {
    const coverage = visuals.reduce((total, visual) => total + Number(visual.points[index]?.value != null), 0);
    if (coverage >= bestCoverage) {
      bestCoverage = coverage;
      bestIndex = index;
    }
  }
  return bestIndex;
}

export function telemetryPointKey(point: TrendPoint | undefined) {
  return point ? (point.dateKey ?? point.label) : undefined;
}

export function resolveTelemetryIndex(points: TrendPoint[], selectedKey: string | undefined, defaultIndex: number) {
  const selectedIndex = points.findIndex((point) => telemetryPointKey(point) === selectedKey);
  return clampIndex(selectedIndex >= 0 ? selectedIndex : defaultIndex, Math.max(points.length, 1));
}

export function chartSummary(visual: InstrumentVisual) {
  const values = visual.points.flatMap((point) => point.value == null ? [] : [point.value]);
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values), average: values.reduce((sum, value) => sum + value, 0) / values.length };
}

export function formatInstrumentValue(visual: InstrumentVisual, value: number) {
  if (visual.valueFormat === "percent") return `${Math.round(value)}%`;
  if (visual.valueFormat === "hours") return `${value.toFixed(1)}h`;
  return value.toFixed(1);
}
