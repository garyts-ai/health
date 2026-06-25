"use client";

import { useEffect, useState } from "react";

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
  green: { line: "#78e08f", fill: "#78e08f", text: "text-[#4f8e60]" },
  violet: { line: "#8e80e8", fill: "#8e80e8", text: "text-[#6258a8]" },
  cyan: { line: "#35cfc0", fill: "#35cfc0", text: "text-[#237f78]" },
  coral: { line: "#ef8069", fill: "#ef8069", text: "text-[#a54f3e]" },
  amber: { line: "#d9a93f", fill: "#d9a93f", text: "text-[#8b681e]" },
  rose: { line: "#d77f98", fill: "#d77f98", text: "text-[#984c63]" },
};

const impactStyles = {
  favorable: { text: "text-[#257d4b]", line: "#4fbf78", label: "Favorable" },
  unfavorable: { text: "text-[#a14938]", line: "#e07863", label: "Unfavorable" },
  neutral: { text: "text-[#686178]", line: "#8a8297", label: "Neutral" },
  unknown: { text: "text-[#8a8498]", line: "#aaa3b5", label: "No signal" },
};

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value))
    : "Not available";
}

function directionLabel(direction: WhoopMetric["direction"]) {
  if (direction === "missing") return "No comparison";
  if (direction === "flat") return "Near baseline";
  return direction === "up" ? "Trending up" : "Trending down";
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

function chartGeometry(
  values: Array<{ date: string; value: number | null }>,
  baseline: number | null,
  floor = 12,
  ceiling = 88,
) {
  const present = values.filter((point) => point.value !== null);
  const numeric = present.map((point) => point.value as number);
  const domain = baseline === null ? numeric : [...numeric, baseline];
  const min = domain.length ? Math.min(...domain) : 0;
  const max = domain.length ? Math.max(...domain) : 1;
  const span = max - min || 1;
  const coordinates = present.map((point, index) => ({
    x: present.length === 1 ? 50 : (index / (present.length - 1)) * 100,
    y: ceiling - (((point.value as number) - min) / span) * (ceiling - floor),
  }));
  return {
    present,
    points: coordinates.map((point) => `${point.x},${point.y}`).join(" "),
    area: coordinates.length
      ? `0,${ceiling + 4} ${coordinates.map((point) => `${point.x},${point.y}`).join(" ")} 100,${ceiling + 4}`
      : "",
    latest: coordinates.at(-1),
    baselineY: baseline === null ? null : ceiling - ((baseline - min) / span) * (ceiling - floor),
  };
}

function Sparkline({
  series,
  range,
  heightClass = "h-20",
}: {
  series: WhoopAnalysisReport["series"][number];
  range: WhoopChartRange;
  heightClass?: string;
}) {
  const values = filterWhoopChartValues(series.values, range);
  const geometry = chartGeometry(values, series.baseline, 18, 82);
  const tone = tones[series.tone];
  const gradientId = `spark-${series.key}-${range}`;

  if (geometry.present.length < 2) {
    return <div className={`${heightClass} flex items-center text-xs text-[#8a8498]`}>Insufficient observations</div>;
  }

  return (
    <svg
      className={`${heightClass} w-full`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="img"
      aria-label={`${series.label} sparkline`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={tone.fill} stopOpacity="0.2" />
          <stop offset="100%" stopColor={tone.fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      {geometry.baselineY !== null ? (
        <line x1="0" y1={geometry.baselineY} x2="100" y2={geometry.baselineY} stroke="#bdb6c8" strokeWidth="1" strokeDasharray="3 3" />
      ) : null}
      <polygon points={geometry.area} fill={`url(#${gradientId})`} />
      <polyline points={geometry.points} fill="none" stroke={tone.line} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {geometry.latest ? <circle cx={geometry.latest.x} cy={geometry.latest.y} r="2.2" fill={tone.line} /> : null}
    </svg>
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
  const summary = summarizeWhoopChartRange(series, range);
  const geometry = chartGeometry(summary.values, series.baseline, 16, 88);
  const tone = tones[series.tone];
  const gradientId = `whoop-${series.key}-${range}`;

  return (
    <section data-premium-surface data-premium-tone="dark" data-premium-enter className="min-w-0 bg-[#171126] p-5 text-white">
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
      {geometry.present.length > 1 ? (
        <svg className="mt-4 h-36 w-full" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${series.label} trend for ${rangeLabel}`}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={tone.fill} stopOpacity="0.28" />
              <stop offset="100%" stopColor={tone.fill} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="92" x2="100" y2="92" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          {geometry.baselineY !== null ? (
            <line x1="0" y1={geometry.baselineY} x2="100" y2={geometry.baselineY} stroke="rgba(255,255,255,0.26)" strokeWidth="1" strokeDasharray="3 3" />
          ) : null}
          <polygon points={geometry.area} fill={`url(#${gradientId})`} />
          <polyline points={geometry.points} fill="none" stroke={tone.line} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          {geometry.latest ? <circle cx={geometry.latest.x} cy={geometry.latest.y} r="2.4" fill={tone.line} /> : null}
        </svg>
      ) : (
        <div className="mt-4 flex h-36 items-center justify-center text-sm text-white/48">
          {geometry.present.length === 1 ? "One observation in this range" : "No observations in this range"}
        </div>
      )}
      <div className="mt-2 flex justify-between gap-2 text-[11px] text-white/36">
        <span>{formatDate(geometry.present[0]?.date ?? null)}</span>
        <span>baseline {series.baseline === null ? "--" : `${series.baseline}${series.unit}`}</span>
        <span>{formatDate(geometry.present.at(-1)?.date ?? null)}</span>
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
      <div className="relative h-1 bg-[#ddd7e5]">
        <span className="absolute left-1/2 top-[-3px] h-2.5 w-px bg-[#938ba1]" />
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
}: {
  title: string;
  rows: WhoopMetric[];
  series: WhoopAnalysisReport["series"][number];
  range: WhoopChartRange;
}) {
  const summary = summarizeWhoopChartRange(series, range);
  const direction = summary.direction;
  const healthImpact = selectedImpact(series.key, direction);
  const impact = impactStyles[healthImpact];
  const delta = summary.average === null || series.baseline === null ? null : summary.average - series.baseline;

  return (
    <section data-premium-surface data-premium-tone="light" data-premium-enter className="grid gap-5 border-t border-[#ded8e7] px-5 py-5 first:border-t-0 lg:grid-cols-[11rem_minmax(14rem,1fr)_12rem_minmax(20rem,1.4fr)] lg:items-center">
      <div>
        <h3 className="text-lg font-semibold text-[#171329]">{title}</h3>
        <div className={`mt-2 flex items-center gap-2 text-sm font-medium ${impact.text}`}>
          <span className="text-xl leading-none">{directionArrow(direction)}</span>
          <span>{impact.label}</span>
        </div>
        <div className="mt-1 text-xs text-[#7b7492]">{directionLabel(direction)}</div>
      </div>

      <Sparkline series={series} range={range} />

      <div>
        <div className="text-xs text-[#746d87]">{series.label} average</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-[#171329]">
          {summary.average === null ? "--" : `${Number(summary.average.toFixed(1))}${series.unit}`}
        </div>
        <div className={`mt-1 text-sm font-medium tabular-nums ${impact.text}`}>
          {delta === null ? "No baseline delta" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}${series.unit}`}
        </div>
        <div className="text-xs text-[#8a8498]">baseline {series.baseline ?? "--"}{series.unit}</div>
      </div>

      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-3">
        {rows.slice(0, 3).map((row) => (
          <div key={row.label} className="min-w-0">
            <div className="truncate text-xs text-[#746d87]">{row.label}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-base font-semibold tabular-nums text-[#312c49]">{row.recent}</span>
              <span className={`text-base ${impactStyles[row.healthImpact].text}`}>{directionArrow(row.direction)}</span>
            </div>
            <div className="text-[11px] text-[#8a8498]">28d vs {row.value}</div>
            <DeltaBar metric={row} />
          </div>
        ))}
      </div>

      <details className="lg:col-start-2 lg:col-span-3">
        <summary className="cursor-pointer text-sm font-medium text-[#554d70]">Full baseline detail</summary>
        <div className="mt-3 overflow-x-auto border-t border-[#e8e3ed]">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-[#6d6785]">
              <tr>
                <th className="py-3 pr-5 font-medium">Metric</th>
                <th className="px-5 py-3 font-medium">Full baseline</th>
                <th className="px-5 py-3 font-medium">Recent 28 days</th>
                <th className="py-3 pl-5 font-medium">Direction</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-[#eeeaf3]">
                  <td className="py-3 pr-5 font-medium text-[#312c49]">
                    {row.label}
                    {row.note ? <div className="mt-1 text-xs font-normal text-[#7b7492]">{row.note}</div> : null}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-[#171329]">{row.value}</td>
                  <td className="px-5 py-3 tabular-nums text-[#4f4965]">{row.recent}</td>
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
            <span className="text-[#746d87]">{label}</span>
            <span className="h-2 bg-[#e8e3ed]"><span className="block h-2" style={{ width: `${(Number(value) / max) * 100}%`, backgroundColor: String(color) }} /></span>
            <span className="text-right font-medium tabular-nums text-[#312c49]">{Number(value).toFixed(1)}{visual.unit}</span>
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
        <div className="relative h-3 bg-[#e8e3ed]">
          <span className="block h-3 bg-[#d9a93f]" style={{ width: `${width}%` }} />
          <span className="absolute top-[-3px] h-5 w-px bg-[#5f576d]" style={{ left: `${threshold}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-[#746d87]">
          <span>{visual.value.toFixed(0)} {visual.unit} variation</span>
          <span>{visual.threshold} {visual.unit} reference</span>
        </div>
      </div>
    );
  }
  if (visual.kind === "autonomic") {
    return (
      <div className="grid grid-cols-2 gap-px bg-[#ded8e7]">
        <div className="bg-[#fbf9fd] py-2 pr-3">
          <div className="text-xs text-[#746d87]">HRV</div>
          <div className={`mt-1 text-lg font-semibold ${selectedImpact("hrv_rmssd_milli", visual.hrvDelta === null ? "missing" : visual.hrvDelta > 0 ? "up" : visual.hrvDelta < 0 ? "down" : "flat") === "favorable" ? "text-[#257d4b]" : "text-[#a14938]"}`}>
            {visual.hrvDelta === null ? "—" : `${visual.hrvDelta >= 0 ? "↗ +" : "↘ "}${visual.hrvDelta.toFixed(1)} ms`}
          </div>
        </div>
        <div className="bg-[#fbf9fd] py-2 pl-3">
          <div className="text-xs text-[#746d87]">Resting HR</div>
          <div className={`mt-1 text-lg font-semibold ${selectedImpact("resting_heart_rate", visual.rhrDelta === null ? "missing" : visual.rhrDelta > 0 ? "up" : visual.rhrDelta < 0 ? "down" : "flat") === "favorable" ? "text-[#257d4b]" : "text-[#a14938]"}`}>
            {visual.rhrDelta === null ? "—" : `${visual.rhrDelta >= 0 ? "↗ +" : "↘ "}${visual.rhrDelta.toFixed(1)} bpm`}
          </div>
        </div>
      </div>
    );
  }
  const magnitude = Math.min(100, Math.abs(visual.recoveryDelta) / 40 * 100);
  return (
    <div>
      <div className="relative h-3 bg-[#e8e3ed]">
        <span className="absolute left-1/2 top-[-3px] h-5 w-px bg-[#6f687d]" />
        <span
          className="absolute top-0 h-3"
          style={{
            left: visual.recoveryDelta < 0 ? `${50 - magnitude / 2}%` : "50%",
            width: `${magnitude / 2}%`,
            backgroundColor: visual.recoveryDelta >= 0 ? "#4fbf78" : "#e07863",
          }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-[#746d87]">
        <span>{visual.yesCount} yes / {visual.noCount} no</span>
        <span className={visual.recoveryDelta >= 0 ? "text-[#257d4b]" : "text-[#a14938]"}>
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
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#171329]">Patterns worth attention</h2>
        <span className="text-xs text-[#8a8498]">Ranked by confidence and effect</span>
      </div>
      <div className="border-y border-[#d8d2e4] bg-[#fbf9fd]">
        {findings.map((finding, index) => (
          <article
            key={`${finding.title}-${finding.evidence}`}
            data-premium-surface
            data-premium-tone={finding.confidence === "High" ? "caution" : "light"}
            data-premium-enter
            className="grid gap-4 border-t border-[#e4dfeb] px-5 py-5 first:border-t-0 lg:grid-cols-[2.5rem_minmax(14rem,1fr)_minmax(16rem,0.9fr)_7rem] lg:items-center"
          >
            <div className="text-2xl font-semibold tabular-nums text-[#aaa2b7]">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <h3 className="font-semibold text-[#312c49]">{finding.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5f5871]">{finding.evidence}</p>
              <details className="mt-2 text-sm text-[#6d6785]">
                <summary className="cursor-pointer font-medium">Interpretation</summary>
                <p className="mt-2 leading-6">{finding.interpretation}</p>
              </details>
            </div>
            <FindingVisual finding={finding} />
            <div className="lg:text-right">
              <div className="text-xs text-[#8a8498]">Confidence</div>
              <div className="mt-1 font-semibold text-[#4f4965]">{finding.confidence}</div>
            </div>
          </article>
        ))}
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
        <div className="flex flex-col gap-4 border-b border-[#d4cedf] pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#171329]">Visual analysis</h2>
            <div className="mt-1 text-sm text-[#746d87]">
              {rangeLabel} ending {Number.isFinite(newestDate) ? formatDate(new Date(newestDate).toISOString()) : "at latest record"} · {visibleDates.length} recorded cycles
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
                    ? "border-[#4f3b93] text-[#171329]"
                    : "border-transparent text-[#746d87] hover:text-[#312c49]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-hidden border border-white/10 bg-white/10">
          <div className="grid gap-px bg-white/10 md:grid-cols-2 xl:grid-cols-3">
            {report.series.map((item) => (
              <TrendChart key={item.key} series={item} range={range} rangeLabel={rangeLabel} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold tracking-[-0.03em] text-[#171329]">Baseline instruments</h2>
        <div className="border-y border-[#d8d2e4] bg-[#fbf9fd]">
          {instruments.map(([title, rows, series]) =>
            series ? <InstrumentRow key={title} title={title} rows={rows} series={series} range={range} /> : null,
          )}
        </div>
      </section>

      <EvidenceLeaderboard findings={report.findings} />
    </div>
  );
}
