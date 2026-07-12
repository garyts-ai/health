"use client";

import { useEffect, useId, useRef, useState } from "react";

import type {
  WhoopAnalysisReport,
  WhoopFinding,
  WhoopMetric,
} from "@/lib/whoop-export/analysis";
import {
  DEFAULT_WHOOP_CHART_RANGE,
  filterWhoopChartValues,
  parseWhoopChartRange,
  summarizeWhoopChartRange,
  WHOOP_CHART_RANGES,
  WHOOP_CHART_RANGE_STORAGE_KEY,
  type WhoopChartRange,
} from "@/lib/whoop-export/chart-ranges";

const tones = {
  green: { line: "#78e08f", fill: "#78e08f", text: "text-[#9af0ac]" },
  violet: { line: "#8e80e8", fill: "#8e80e8", text: "text-[#d2ccff]" },
  cyan: { line: "#35cfc0", fill: "#35cfc0", text: "text-[#9afff6]" },
  coral: { line: "#ef8069", fill: "#ef8069", text: "text-[#ffb6a6]" },
  amber: { line: "#d9a93f", fill: "#d9a93f", text: "text-[#f9dc98]" },
  rose: { line: "#d77f98", fill: "#d77f98", text: "text-[#f1bac9]" },
};

const impactStyles = {
  favorable: { text: "text-[#78e08f]", line: "#4fbf78", label: "Favorable" },
  unfavorable: { text: "text-[#ff8b72]", line: "#e07863", label: "Unfavorable" },
  neutral: { text: "text-white/60", line: "#8a8297", label: "Neutral" },
  unknown: { text: "text-white/42", line: "#aaa3b5", label: "No signal" },
};

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value))
    : "Not available";
}

function formatShortDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value))
    : "--";
}

function formatChartValue(value: number | null, unit: string, digits = 1) {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return `${Number(value.toFixed(digits))}${unit}`;
}

function formatChartDelta(value: number | null, baseline: number | null, unit: string) {
  if (value === null || baseline === null) {
    return "No baseline";
  }

  const delta = value - baseline;
  if (Math.abs(delta) < 0.05) {
    return `even vs baseline`;
  }

  return `${delta > 0 ? "+" : ""}${Number(delta.toFixed(1))}${unit} vs baseline`;
}

function directionLabel(direction: WhoopMetric["direction"]) {
  if (direction === "missing") return "No comparison";
  if (direction === "flat") return "Near baseline";
  return direction === "up" ? "Above full-period baseline" : "Below full-period baseline";
}

function directionArrow(direction: WhoopMetric["direction"]) {
  if (direction === "up") return "↗";
  if (direction === "down") return "↘";
  if (direction === "flat") return "→";
  return "—";
}

function selectedImpact(
  key: string,
  direction: WhoopMetric["direction"],
): WhoopMetric["healthImpact"] {
  if (direction === "missing") return "unknown";
  if (direction === "flat") return "neutral";
  if (key === "resting_heart_rate") return direction === "down" ? "favorable" : "unfavorable";
  if (key === "day_strain" || key === "skin_temp_celsius") return "neutral";
  return direction === "up" ? "favorable" : "unfavorable";
}

type ChartPoint = {
  date: string;
  value: number;
  x: number;
  y: number;
  originalIndex: number;
};

export function chartGeometry(
  values: Array<{ date: string; value: number | null }>,
  baseline: number | null,
  floor = 12,
  ceiling = 88,
) {
  const present = values
    .map((point, index) => ({ ...point, originalIndex: index }))
    .filter((point): point is { date: string; value: number; originalIndex: number } => point.value !== null && Number.isFinite(point.value));
  const numeric = present.map((point) => point.value);
  const domain = baseline === null ? numeric : [...numeric, baseline];
  const min = domain.length ? Math.min(...domain) : 0;
  const max = domain.length ? Math.max(...domain) : 1;
  const span = max - min || 1;
  const coordinates: ChartPoint[] = present.map((point) => ({
    date: point.date,
    value: point.value,
    originalIndex: point.originalIndex,
    x: values.length <= 1 ? 50 : (point.originalIndex / (values.length - 1)) * 100,
    y: ceiling - (((point.value as number) - min) / span) * (ceiling - floor),
  }));
  const coordinateByIndex = new Map(coordinates.map((point) => [point.originalIndex, point]));
  const segments: ChartPoint[][] = [];
  let currentSegment: ChartPoint[] = [];
  values.forEach((point, index) => {
    const coordinate = point.value === null ? undefined : coordinateByIndex.get(index);
    if (!coordinate) {
      if (currentSegment.length) segments.push(currentSegment);
      currentSegment = [];
      return;
    }
    currentSegment.push(coordinate);
  });
  if (currentSegment.length) segments.push(currentSegment);

  return {
    present,
    coordinates,
    segments,
    areaFloor: ceiling + 4,
    latest: coordinates.at(-1),
    baselineY: baseline === null ? null : ceiling - ((baseline - min) / span) * (ceiling - floor),
    min,
    max,
  };
}

function nearestPoint(points: ChartPoint[], x: number) {
  return points.reduce<ChartPoint | null>((best, point) => {
    if (!best) return point;
    return Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best;
  }, null);
}

export function sampleChartValues<T>(values: T[], limit = 120) {
  if (values.length <= limit) return values;

  const sampled: T[] = [];
  const lastIndex = values.length - 1;
  for (let index = 0; index < limit; index += 1) {
    sampled.push(values[Math.round((index / (limit - 1)) * lastIndex)]);
  }
  return sampled;
}

export function chartPointIndexForKey(
  key: "ArrowLeft" | "ArrowRight" | "Home" | "End",
  length: number,
  currentIndex: number | null,
) {
  if (length <= 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  const index = currentIndex ?? length - 1;
  return Math.max(0, Math.min(length - 1, index + (key === "ArrowLeft" ? -1 : 1)));
}

function InteractiveSeriesChart({
  series,
  range,
  rangeLabel,
  heightClass = "h-20",
  compact = false,
  dark = false,
}: {
  series: WhoopAnalysisReport["series"][number];
  range: WhoopChartRange;
  rangeLabel: string;
  heightClass?: string;
  compact?: boolean;
  dark?: boolean;
}) {
  const summary = summarizeWhoopChartRange(series, range);
  const displayValues = sampleChartValues(summary.values);
  const geometry = chartGeometry(displayValues, series.baseline, compact ? 20 : 16, compact ? 80 : 88);
  const tone = tones[series.tone];
  const gradientSeed = useId().replace(/:/g, "");
  const gradientId = `whoop-chart-${series.key}-${range}-${gradientSeed}`;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activePoint, setActivePoint] = useState<ChartPoint | null>(null);
  const displayPoint = activePoint;
  const latestPoint = geometry.latest ?? null;
  const textTone = dark ? "text-white/56" : "text-[#746d87]";
  const strongTone = dark ? "text-white" : "text-[#171329]";
  const mutedLine = dark ? "rgba(255,255,255,0.11)" : "rgba(63,54,82,0.12)";
  const baselineLine = dark ? "rgba(255,255,255,0.3)" : "rgba(63,54,82,0.28)";

  const setNearestFromClientX = (clientX: number) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds || geometry.coordinates.length === 0) return;

    const relativeX = ((clientX - bounds.left) / bounds.width) * 100;
    setActivePoint(nearestPoint(geometry.coordinates, Math.max(0, Math.min(100, relativeX))));
  };

  if (geometry.present.length < 2) {
    const onlyPoint = geometry.coordinates[0] ?? null;
    return (
      <div className={`${heightClass} flex flex-col justify-center ${textTone}`}>
        <div className={`text-sm font-medium tabular-nums ${strongTone}`}>
          {onlyPoint ? formatChartValue(onlyPoint.value, series.unit) : "No values"}
        </div>
        <div className="mt-1 text-xs">
          {onlyPoint ? `${formatDate(onlyPoint.date)} · one observation in ${rangeLabel}` : `No observations in ${rangeLabel}`}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-[#ffd45a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10131b]"
      tabIndex={0}
      role="group"
      aria-label={`${series.label} trend for ${rangeLabel}. Use left and right arrow keys to inspect points.`}
      onBlur={() => setActivePoint(null)}
      onKeyDown={(event) => {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const currentIndex = activePoint
            ? geometry.coordinates.findIndex(
                (point) => point.originalIndex === activePoint.originalIndex,
              )
            : null;
          const nextIndex = chartPointIndexForKey(
            event.key as "ArrowLeft" | "ArrowRight" | "Home" | "End",
            geometry.coordinates.length,
            currentIndex,
          );
          setActivePoint(nextIndex === null ? null : geometry.coordinates[nextIndex] ?? null);
        }
      }}
    >
      {!compact ? (
        <div className={`mb-2 flex items-center justify-between gap-3 text-[11px] ${textTone}`}>
          <span>max {formatChartValue(geometry.max, series.unit)}</span>
          <span>avg {formatChartValue(summary.average, series.unit)}</span>
          <span>min {formatChartValue(geometry.min, series.unit)}</span>
        </div>
      ) : null}
      <svg
        ref={svgRef}
        className={`${heightClass} w-full touch-pan-y outline-none`}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${series.label} trend for ${rangeLabel}. Latest ${formatChartValue(summary.latest, series.unit)}.`}
        onPointerMove={(event) => setNearestFromClientX(event.clientX)}
        onPointerDown={(event) => setNearestFromClientX(event.clientX)}
        onPointerLeave={() => setActivePoint(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={tone.fill} stopOpacity={dark ? "0.28" : "0.18"} />
            <stop offset="100%" stopColor={tone.fill} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="88" x2="100" y2="88" stroke={mutedLine} strokeWidth="1" />
        <line x1="0" y1="52" x2="100" y2="52" stroke={mutedLine} strokeWidth="0.7" />
        <line x1="0" y1="16" x2="100" y2="16" stroke={mutedLine} strokeWidth="0.7" />
        {geometry.baselineY !== null ? (
          <line x1="0" y1={geometry.baselineY} x2="100" y2={geometry.baselineY} stroke={baselineLine} strokeWidth="1" strokeDasharray="3 3" />
        ) : null}
        {geometry.segments.map((segment, index) => {
          const points = segment.map((point) => `${point.x},${point.y}`).join(" ");
          const first = segment[0];
          const last = segment.at(-1);
          if (!first || !last) return null;
          return (
            <g key={`${series.key}-segment-${index}`}>
              <polygon
                points={`${first.x},${geometry.areaFloor} ${points} ${last.x},${geometry.areaFloor}`}
                fill={`url(#${gradientId})`}
              />
              <polyline
                points={points}
                fill="none"
                stroke={tone.line}
                strokeWidth={compact ? "1.8" : "2.2"}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
        {latestPoint && !displayPoint ? (
          <circle cx={latestPoint.x} cy={latestPoint.y} r={compact ? "2" : "2.5"} fill={tone.line} vectorEffect="non-scaling-stroke" />
        ) : null}
        {displayPoint ? (
          <>
            <line x1={displayPoint.x} y1="12" x2={displayPoint.x} y2="92" stroke={dark ? "rgba(255,255,255,0.24)" : "rgba(57,48,74,0.26)"} strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <circle cx={displayPoint.x} cy={displayPoint.y} r={compact ? "2.4" : "3"} fill={tone.line} stroke={dark ? "#171126" : "#fbf9fd"} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
          </>
        ) : null}
        {geometry.coordinates.map((point) => (
          <circle
            key={`${series.key}-${point.date}-${point.originalIndex}`}
            cx={point.x}
            cy={point.y}
            r={compact ? "5" : "4.8"}
            fill="transparent"
            onPointerEnter={() => setActivePoint(point)}
          />
        ))}
      </svg>
      {activePoint ? (
        <div
          className={`pointer-events-none absolute z-10 min-w-[8.5rem] border px-2.5 py-2 text-xs shadow-[0_2px_8px_rgba(0,0,0,0.16)] ${
            dark ? "border-white/12 bg-[#211a32] text-white" : "border-[#d8d2e4] bg-[#fbf9fd] text-[#171329]"
          }`}
          style={{
            left: `${Math.min(78, Math.max(22, activePoint.x))}%`,
            top: `${Math.min(78, Math.max(8, activePoint.y - 22))}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className={dark ? "text-white/54" : "text-[#746d87]"}>{formatDate(activePoint.date)}</div>
          <div className="mt-1 font-semibold tabular-nums" style={{ color: tone.line }}>
            {formatChartValue(activePoint.value, series.unit)}
          </div>
          <div className={dark ? "mt-1 text-white/58" : "mt-1 text-[#5f5871]"}>
            {formatChartDelta(activePoint.value, series.baseline, series.unit)}
          </div>
        </div>
      ) : null}
      <div className={`mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] ${textTone}`}>
        <span>{formatShortDate(geometry.coordinates[0]?.date ?? null)}</span>
        <span className={`tabular-nums ${strongTone}`} aria-live="polite">
          {activePoint
            ? `${formatShortDate(activePoint.date)} ${formatChartValue(activePoint.value, series.unit)}`
            : latestPoint
              ? `Latest ${formatShortDate(latestPoint.date)} ${formatChartValue(latestPoint.value, series.unit)}`
              : "Select a point"}
        </span>
        <span>{formatShortDate(geometry.coordinates.at(-1)?.date ?? null)}</span>
      </div>
    </div>
  );
}

function TrendChart({
  series,
  range,
  rangeLabel,
}: {
  series: WhoopAnalysisReport["series"][number];
  range: WhoopChartRange;
  rangeLabel: string;
}) {
  const tone = tones[series.tone];
  const summary = summarizeWhoopChartRange(series, range);

  return (
    <section data-premium-surface data-premium-tone="dark" data-premium-enter className="min-w-0 bg-[#07101c] p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{series.label}</h3>
          <div className="mt-1 text-xs text-white/42">
            {summary.observationCount} observation{summary.observationCount === 1 ? "" : "s"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tabular-nums" style={{ color: tone.line }}>
            {summary.latest === null ? "--" : `${summary.latest}${series.unit}`}
          </div>
          <div className="mt-1 text-xs text-white/46">{directionLabel(summary.direction)}</div>
        </div>
      </div>
      <div className="mt-4">
        <InteractiveSeriesChart series={series} range={range} rangeLabel={rangeLabel} heightClass="h-36" dark />
      </div>
      <div className="mt-2 flex justify-between gap-2 text-[11px] text-white/36">
        <span>baseline {series.baseline === null ? "--" : `${series.baseline}${series.unit}`}</span>
        <span>range avg {summary.average === null ? "--" : `${Number(summary.average.toFixed(1))}${series.unit}`}</span>
      </div>
    </section>
  );
}

function DeltaBar({ metric }: { metric: WhoopMetric }) {
  const scale =
    metric.baselineValue === null || metric.delta === null || metric.baselineValue === 0
      ? 0
      : Math.max(-1, Math.min(1, metric.delta / Math.abs(metric.baselineValue)));
  const impact = impactStyles[metric.healthImpact];
  return (
    <div className="mt-2">
      <div className="relative h-1 bg-white/12">
        <span className="absolute left-1/2 top-[-3px] h-2.5 w-px bg-white/42" />
        <span
          className="absolute top-0 h-1"
          style={{
            backgroundColor: impact.line,
            left: scale < 0 ? `${50 + scale * 48}%` : "50%",
            width: `${Math.max(2, Math.abs(scale) * 48)}%`,
          }}
        />
      </div>
    </div>
  );
}

function InstrumentRow({
  title,
  rows,
  series,
  range,
  rangeLabel,
}: {
  title: string;
  rows: WhoopMetric[];
  series: WhoopAnalysisReport["series"][number];
  range: WhoopChartRange;
  rangeLabel: string;
}) {
  const summary = summarizeWhoopChartRange(series, range);
  const direction = summary.direction;
  const healthImpact = selectedImpact(series.key, direction);
  const impact = impactStyles[healthImpact];
  const delta = summary.average === null || series.baseline === null ? null : summary.average - series.baseline;

  return (
    <section data-premium-surface data-premium-tone="dark" data-premium-enter className="grid gap-5 border-t border-white/10 px-5 py-5 text-white first:border-t-0 lg:grid-cols-[11rem_minmax(14rem,1fr)_12rem_minmax(20rem,1.4fr)] lg:items-center">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className={`mt-2 flex items-center gap-2 text-sm font-medium ${impact.text}`}>
          <span className="text-xl leading-none">{directionArrow(direction)}</span>
          <span>{impact.label}</span>
        </div>
        <div className="mt-1 text-xs text-white/42">{directionLabel(direction)}</div>
      </div>

      <InteractiveSeriesChart series={series} range={range} rangeLabel={rangeLabel} compact dark />

      <div>
        <div className="text-xs text-white/48">{series.label} average</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-white">
          {summary.average === null ? "--" : `${Number(summary.average.toFixed(1))}${series.unit}`}
        </div>
        <div className={`mt-1 text-sm font-medium tabular-nums ${impact.text}`}>
          {delta === null ? "No baseline delta" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}${series.unit}`}
        </div>
        <div className="text-xs text-white/38">baseline {series.baseline ?? "--"}{series.unit}</div>
      </div>

      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-3">
        {rows.slice(0, 3).map((row) => (
          <div key={row.label} className="min-w-0">
            <div className="truncate text-xs text-white/48">{row.label}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-base font-semibold tabular-nums text-white/88">{row.recent}</span>
              <span className={`text-base ${impactStyles[row.healthImpact].text}`}>{directionArrow(row.direction)}</span>
            </div>
            <div className="text-[11px] text-white/38">28d vs {row.value}</div>
            <DeltaBar metric={row} />
          </div>
        ))}
      </div>

      <details className="lg:col-start-2 lg:col-span-3">
        <summary className="cursor-pointer text-sm font-medium text-[#39f8ff]">Full baseline detail</summary>
        <div className="mt-3 overflow-x-auto border-t border-white/10">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-white/46">
              <tr>
                <th className="py-3 pr-5 font-medium">Metric</th>
                <th className="px-5 py-3 font-medium">Full baseline</th>
                <th className="px-5 py-3 font-medium">Recent 28 days</th>
                <th className="py-3 pl-5 font-medium">Direction</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-white/8">
                  <td className="py-3 pr-5 font-medium text-white/84">
                    {row.label}
                    {row.note ? <div className="mt-1 text-xs font-normal text-white/42">{row.note}</div> : null}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-white/84">{row.value}</td>
                  <td className="px-5 py-3 tabular-nums text-white/64">{row.recent}</td>
                  <td className={`py-3 pl-5 ${impactStyles[row.healthImpact].text}`}>
                    {directionArrow(row.direction)} {directionLabel(row.direction)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function FindingVisual({ finding }: { finding: WhoopFinding }) {
  const visual = finding.visualization;
  if (visual.kind === "gap") {
    const max = Math.max(visual.actual, visual.target, 1);
    return (
      <div className="space-y-2">
        {[["Actual", visual.actual, "#8e80e8"], ["Need", visual.target, "#e07863"]].map(([label, value, color]) => (
          <div key={String(label)} className="grid grid-cols-[3rem_1fr_3.5rem] items-center gap-2 text-xs">
            <span className="text-white/48">{label}</span>
            <span className="h-2 bg-white/12"><span className="block h-2" style={{ width: `${(Number(value) / max) * 100}%`, backgroundColor: String(color) }} /></span>
            <span className="text-right font-medium tabular-nums text-white/84">{Number(value).toFixed(1)}{visual.unit}</span>
          </div>
        ))}
      </div>
    );
  }
  if (visual.kind === "variability") {
    const width = Math.min(100, (visual.value / Math.max(visual.value, visual.threshold * 2)) * 100);
    const threshold = Math.min(100, (visual.threshold / Math.max(visual.value, visual.threshold * 2)) * 100);
    return (
      <div>
        <div className="relative h-3 bg-white/12">
          <span className="block h-3 bg-[#d9a93f]" style={{ width: `${width}%` }} />
          <span className="absolute top-[-3px] h-5 w-px bg-white/48" style={{ left: `${threshold}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-white/48">
          <span>{visual.value.toFixed(0)} {visual.unit} variation</span>
          <span>{visual.threshold} {visual.unit} reference</span>
        </div>
      </div>
    );
  }
  if (visual.kind === "autonomic") {
    return (
      <div className="grid grid-cols-2 gap-px bg-[#39f8ff]/12">
        <div className="bg-[#07101c] py-2 pr-3">
          <div className="text-xs text-white/48">HRV</div>
          <div className={`mt-1 text-lg font-semibold ${selectedImpact("hrv_rmssd_milli", visual.hrvDelta === null ? "missing" : visual.hrvDelta > 0 ? "up" : visual.hrvDelta < 0 ? "down" : "flat") === "favorable" ? "text-[#78e08f]" : "text-[#ff8b72]"}`}>
            {visual.hrvDelta === null ? "—" : `${visual.hrvDelta >= 0 ? "↗ +" : "↘ "}${visual.hrvDelta.toFixed(1)} ms`}
          </div>
        </div>
        <div className="bg-[#07101c] py-2 pl-3">
          <div className="text-xs text-white/48">Resting HR</div>
          <div className={`mt-1 text-lg font-semibold ${selectedImpact("resting_heart_rate", visual.rhrDelta === null ? "missing" : visual.rhrDelta > 0 ? "up" : visual.rhrDelta < 0 ? "down" : "flat") === "favorable" ? "text-[#78e08f]" : "text-[#ff8b72]"}`}>
            {visual.rhrDelta === null ? "—" : `${visual.rhrDelta >= 0 ? "↗ +" : "↘ "}${visual.rhrDelta.toFixed(1)} bpm`}
          </div>
        </div>
      </div>
    );
  }
  const magnitude = Math.min(100, Math.abs(visual.recoveryDelta) / 40 * 100);
  return (
    <div>
      <div className="relative h-3 bg-white/12">
        <span className="absolute left-1/2 top-[-3px] h-5 w-px bg-white/48" />
        <span
          className="absolute top-0 h-3"
          style={{
            left: visual.recoveryDelta < 0 ? `${50 - magnitude / 2}%` : "50%",
            width: `${magnitude / 2}%`,
            backgroundColor: visual.recoveryDelta >= 0 ? "#4fbf78" : "#e07863",
          }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-white/48">
        <span>{visual.yesCount} yes / {visual.noCount} no</span>
        <span className={visual.recoveryDelta >= 0 ? "text-[#78e08f]" : "text-[#ff8b72]"}>
          {visual.recoveryDelta >= 0 ? "↗ +" : "↘ "}{visual.recoveryDelta.toFixed(1)} recovery
        </span>
      </div>
    </div>
  );
}

function EvidenceLeaderboard({ findings }: { findings: WhoopFinding[] }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">Patterns worth attention</h2>
        <span className="text-xs text-white/42">Ranked by confidence and effect</span>
      </div>
      <div className="hud-frame overflow-hidden text-white">
        <div className="hud-content">
        {findings.map((finding, index) => (
          <article
            key={`${finding.title}-${finding.evidence}`}
            data-premium-surface
            data-premium-tone={finding.confidence === "High" ? "caution" : "dark"}
            data-premium-enter
            className="grid gap-4 border-t border-white/10 px-5 py-5 first:border-t-0 lg:grid-cols-[2.5rem_minmax(14rem,1fr)_minmax(16rem,0.9fr)_7rem] lg:items-center"
          >
            <div className="text-2xl font-semibold tabular-nums text-[#39f8ff]">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <h3 className="font-semibold text-white">{finding.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/64">{finding.evidence}</p>
              <details className="mt-2 text-sm text-white/52">
                <summary className="cursor-pointer font-medium text-[#39f8ff]">Interpretation</summary>
                <p className="mt-2 leading-6">{finding.interpretation}</p>
              </details>
            </div>
            <FindingVisual finding={finding} />
            <div className="lg:text-right">
              <div className="text-xs text-white/42">Confidence</div>
              <div className="mt-1 font-semibold text-white/76">{finding.confidence}</div>
            </div>
          </article>
        ))}
        </div>
      </div>
    </section>
  );
}

export function WhoopVisualAnalysis({ report }: { report: WhoopAnalysisReport }) {
  const [range, setRange] = useState<WhoopChartRange>(DEFAULT_WHOOP_CHART_RANGE);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setRange(parseWhoopChartRange(window.localStorage.getItem(WHOOP_CHART_RANGE_STORAGE_KEY)));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const updateRange = (nextRange: WhoopChartRange) => {
    setRange(nextRange);
    window.localStorage.setItem(WHOOP_CHART_RANGE_STORAGE_KEY, nextRange);
  };
  const rangeLabel = WHOOP_CHART_RANGES.find((item) => item.key === range)?.label ?? "30 days";
  const newestDate = Math.max(...report.series.flatMap((item) => item.values.map((point) => new Date(point.date).getTime())));
  const visibleDates = filterWhoopChartValues(report.series[0]?.values ?? [], range);
  const seriesByKey = new Map(report.series.map((series) => [series.key, series]));
  const instruments = [
    ["Sleep", report.metrics.sleep, seriesByKey.get("asleep_minutes")],
    ["Cardiovascular", report.metrics.cardiovascular, seriesByKey.get("hrv_rmssd_milli")],
    ["Recovery", report.metrics.recovery, seriesByKey.get("recovery_score")],
    ["Activity and strain", report.metrics.activity, seriesByKey.get("day_strain")],
  ] as const;

  return (
    <div className="space-y-7">
      <section>
        <div className="flex flex-col gap-4 border-b border-[#2adfff]/20 pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">Visual analysis</h2>
            <div className="mt-1 text-sm text-white/54">
              Chart window only: {rangeLabel} ending {Number.isFinite(newestDate) ? formatDate(new Date(newestDate).toISOString()) : "at latest record"} · {visibleDates.length} recorded cycles. Report findings use the independent 28-day analysis window.
            </div>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="WHOOP chart range">
            {WHOOP_CHART_RANGES.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={range === item.key}
                onClick={() => updateRange(item.key)}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  range === item.key
                    ? "border-[#39f8ff] text-white"
                    : "border-transparent text-white/52 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hud-frame mt-5 overflow-hidden text-white">
          <div className="hud-content grid gap-px bg-[#39f8ff]/12 md:grid-cols-2 xl:grid-cols-3">
            {report.series.map((item) => (
              <TrendChart key={item.key} series={item} range={range} rangeLabel={rangeLabel} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold tracking-[-0.03em] text-white">Baseline instruments</h2>
        <div className="hud-frame overflow-hidden text-white">
          <div className="hud-content">
          {instruments.map(([title, rows, series]) =>
            series ? <InstrumentRow key={title} title={title} rows={rows} series={series} range={range} rangeLabel={rangeLabel} /> : null,
          )}
          </div>
        </div>
      </section>

      <EvidenceLeaderboard findings={report.findings} />
    </div>
  );
}
