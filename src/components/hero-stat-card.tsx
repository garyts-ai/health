"use client";

import { useState } from "react";

type HeroStatCardProps = {
  label: string;
  value: string;
  detail: string;
  trend: Array<number | null>;
  trendLabels: string[];
  gaugeValue?: number | null;
  sleepWindow?: {
    startLabel: string | null;
    endLabel: string | null;
    inBedLabel?: string | null;
    stages?: Array<{
      key: string;
      label: string;
      hours: number | null;
      color: string;
    }>;
  };
};

function compactValue(label: string, value: string) {
  if (label !== "Sleep") return value;
  const parsed = Number.parseFloat(value.replace("h", ""));
  if (!Number.isFinite(parsed)) return value;
  const hours = Math.floor(parsed);
  const minutes = Math.round((parsed - hours) * 60);
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

function tone(label: string) {
  if (label === "Strain") return { line: "#ff9f1c", soft: "rgba(255,159,28,0.34)", text: "text-[#ffcf8a]" };
  if (label === "Sleep") return { line: "#a873ff", soft: "rgba(168,115,255,0.34)", text: "text-[#d8c8ff]" };
  return { line: "#39f8ff", soft: "rgba(57,248,255,0.32)", text: "text-[#bafffb]" };
}

function trendLabel(label: string, point: number | null) {
  if (point === null) return "--";
  if (label === "Recovery") return `${Math.round(point)}%`;
  if (label === "Sleep") return `${point.toFixed(1)}h`;
  return point.toFixed(1);
}

export function HeroStatCard({
  label,
  value,
  detail,
  trend,
  trendLabels,
  gaugeValue,
  sleepWindow,
}: HeroStatCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = tone(label);
  const numericTrend = trend.filter((point): point is number => typeof point === "number");
  const min = numericTrend.length ? Math.min(...numericTrend) : 0;
  const max = numericTrend.length ? Math.max(...numericTrend) : 0;
  const range = max - min || 1;
  const bars = trend.map((point) => {
    if (point === null) return 8;
    return 10 + ((point - min) / range) * 22;
  });
  const gauge = typeof gaugeValue === "number" ? Math.max(0, Math.min(100, gaugeValue)) : 0;
  const sleepStages = sleepWindow?.stages?.filter((stage) => typeof stage.hours === "number" && stage.hours > 0) ?? [];
  const sleepTotal = sleepStages.reduce((total, stage) => total + (stage.hours ?? 0), 0);

  return (
    <section
      data-premium-surface
      data-premium-tone="hud"
      data-premium-enter
      className="hud-frame overflow-hidden text-white"
    >
      <button
        aria-expanded={expanded}
        className="hud-content flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-[#39f8ff]/70"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <div className="min-w-[4.25rem]">
          <div className="hud-micro-label">{label}</div>
          <div className={`mt-0.5 text-3xl font-semibold leading-none tracking-[-0.055em] ${colors.text}`}>
            {compactValue(label, value)}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {label === "Recovery" ? (
            <div className="h-2 overflow-hidden rounded-full bg-white/12 shadow-[0_0_22px_rgba(57,248,255,0.16)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${gauge}%`,
                  backgroundColor: colors.line,
                  boxShadow: `0 0 16px ${colors.line}`,
                }}
              />
            </div>
          ) : label === "Sleep" && sleepStages.length ? (
            <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
              {sleepStages.map((stage) => (
                <span
                  key={stage.key}
                  className="min-w-[2px]"
                  style={{
                    width: `${((stage.hours ?? 0) / sleepTotal) * 100}%`,
                    backgroundColor: stage.color,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-9 items-end gap-1">
              {bars.map((height, index) => (
                <span
                  key={`${label}-bar-${index}`}
                  className="w-full rounded-t-[3px]"
                  style={{
                    height,
                    backgroundColor: index === bars.length - 1 ? colors.line : colors.soft,
                    boxShadow: index === bars.length - 1 ? `0 0 14px ${colors.line}` : undefined,
                  }}
                />
              ))}
            </div>
          )}
          <p className="mt-1 truncate text-[12px] text-white/58">{detail}</p>
        </div>

        <span className="text-[11px] font-medium text-white/44">{expanded ? "Less" : "Details"}</span>
      </button>

      {expanded ? (
        <div className="hud-content border-t border-white/10 px-3 py-2.5">
          {label === "Sleep" && sleepWindow?.startLabel ? (
            <div className="mb-2 flex justify-between gap-3 text-[12px] text-white/62">
              <span>{sleepWindow.startLabel}</span>
              <span>{sleepWindow.inBedLabel ?? "Sleep window"}</span>
              <span>{sleepWindow.endLabel ?? "--"}</span>
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-px overflow-hidden border border-white/10 bg-white/10">
            {trend.map((point, index) => (
              <div key={`${label}-${trendLabels[index]}`} className="bg-[#06172e]/88 px-2 py-2 text-center">
                <div className="text-[9px] text-white/42">{trendLabels[index] ?? ""}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-white/82">
                  {trendLabel(label, point)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
