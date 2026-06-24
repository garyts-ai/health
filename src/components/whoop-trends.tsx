"use client";

import { useEffect, useState } from "react";

import type { WhoopAnalysisReport, WhoopMetric } from "@/lib/whoop-export/analysis";
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
  violet: { line: "#b5abff", fill: "#b5abff", text: "text-[#d2ccff]" },
  cyan: { line: "#71fff1", fill: "#71fff1", text: "text-[#9afff6]" },
  coral: { line: "#ff8b72", fill: "#ff8b72", text: "text-[#ffb6a6]" },
  amber: { line: "#f4c96b", fill: "#f4c96b", text: "text-[#f9dc98]" },
  rose: { line: "#e99aaf", fill: "#e99aaf", text: "text-[#f1bac9]" },
};

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value))
    : "Not available";
}

function directionLabel(direction: WhoopMetric["direction"]) {
  if (direction === "missing") return "No comparison";
  if (direction === "flat") return "Near baseline";
  return direction === "up" ? "Above baseline" : "Below baseline";
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
  const summary = summarizeWhoopChartRange(series, range);
  const present = summary.values.filter((point) => point.value !== null);
  const numeric = present.map((point) => point.value as number);
  const baseline = series.baseline;
  const domain = baseline === null ? numeric : [...numeric, baseline];
  const min = domain.length ? Math.min(...domain) : 0;
  const max = domain.length ? Math.max(...domain) : 1;
  const chartRange = max - min || 1;
  const coordinates = present.map((point, index) => ({
    x: present.length === 1 ? 50 : (index / (present.length - 1)) * 100,
    y: 88 - (((point.value as number) - min) / chartRange) * 72,
  }));
  const points = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = coordinates.length ? `0,92 ${points} 100,92` : "";
  const baselineY = baseline === null ? null : 88 - ((baseline - min) / chartRange) * 72;
  const latestPoint = coordinates.at(-1);
  const tone = tones[series.tone];
  const gradientId = `whoop-${series.key}-${range}`;

  return (
    <section className="border border-white/10 bg-[#171126] p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{series.label}</h3>
          <div className="mt-1 text-xs text-white/42">
            {rangeLabel} · {summary.observationCount} observation{summary.observationCount === 1 ? "" : "s"}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-semibold tabular-nums ${tone.text}`}>
            {summary.latest === null ? "--" : `${summary.latest}${series.unit}`}
          </div>
          <div className="mt-1 text-xs text-white/42">{directionLabel(summary.direction)}</div>
        </div>
      </div>
      {present.length > 1 ? (
        <svg className="mt-4 h-36 w-full" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${series.label} trend for ${rangeLabel}, ${summary.observationCount} observations`}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={tone.fill} stopOpacity="0.28" />
              <stop offset="100%" stopColor={tone.fill} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="92" x2="100" y2="92" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          {baselineY !== null ? (
            <line x1="0" y1={baselineY} x2="100" y2={baselineY} stroke="rgba(255,255,255,0.26)" strokeWidth="1" strokeDasharray="3 3" />
          ) : null}
          <polygon points={area} fill={`url(#${gradientId})`} />
          <polyline points={points} fill="none" stroke={tone.line} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          {latestPoint ? <circle cx={latestPoint.x} cy={latestPoint.y} r="2.4" fill={tone.line} /> : null}
        </svg>
      ) : (
        <div className="mt-4 flex h-36 items-center justify-center text-sm text-white/48">
          {present.length === 1 ? "One observation in this range" : "No observations in this range"}
        </div>
      )}
      <div className="mt-2 flex justify-between text-xs text-white/36">
        <span>{formatDate(present[0]?.date ?? null)}</span>
        <span>baseline {baseline === null ? "--" : `${baseline}${series.unit}`}</span>
        <span>{formatDate(present.at(-1)?.date ?? null)}</span>
      </div>
    </section>
  );
}

export function WhoopTrends({ series }: { series: WhoopAnalysisReport["series"] }) {
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
  const newestDate = Math.max(
    ...series.flatMap((item) => item.values.map((point) => new Date(point.date).getTime())),
  );
  const visibleDates = filterWhoopChartValues(
    series[0]?.values ?? [],
    range,
  );

  return (
    <section>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#171329]">Physiological trends</h2>
          <div className="mt-1 text-sm text-[#746d87]">
            {rangeLabel} ending {Number.isFinite(newestDate) ? formatDate(new Date(newestDate).toISOString()) : "at latest record"} · dashed line = full baseline
          </div>
        </div>
        <div className="flex flex-wrap gap-1 border-b border-[#d4cedf]" role="group" aria-label="WHOOP chart range">
          {WHOOP_CHART_RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={range === item.key}
              onClick={() => updateRange(item.key)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                range === item.key
                  ? "border-[#4f3b93] text-[#171329]"
                  : "border-transparent text-[#746d87] hover:text-[#312c49]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 text-xs text-[#8a8498]">
        {visibleDates.length} recorded cycle{visibleDates.length === 1 ? "" : "s"} in the selected calendar window
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {series.map((item) => (
          <TrendChart key={item.key} series={item} range={range} rangeLabel={rangeLabel} />
        ))}
      </div>
    </section>
  );
}
