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
  if (label === "Strain") return { line: "#ff8b72", soft: "rgba(255,139,114,0.22)" };
  if (label === "Sleep") return { line: "#b5abff", soft: "rgba(181,171,255,0.22)" };
  return { line: "#72fff2", soft: "rgba(114,255,242,0.18)" };
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
      data-premium-tone="light"
      data-premium-enter
      className="overflow-hidden rounded-[10px] border border-[#d8d2e4] bg-[#f7f4fb] text-[#171329]"
    >
      <button
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors hover:bg-white/42 focus-visible:ring-2 focus-visible:ring-[#71fff1]/40"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <div className="min-w-[4.25rem]">
          <div className="text-[11px] font-medium text-[#746d8e]">{label}</div>
          <div className="mt-0.5 text-2xl font-semibold leading-none tracking-[-0.05em] text-[#171329]">
            {compactValue(label, value)}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {label === "Recovery" ? (
            <div className="h-2 overflow-hidden rounded-full bg-[#e5dfef]">
              <div
                className="h-full rounded-full"
                style={{ width: `${gauge}%`, backgroundColor: colors.line }}
              />
            </div>
          ) : label === "Sleep" && sleepStages.length ? (
            <div className="flex h-2 overflow-hidden rounded-full bg-[#e5dfef]">
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
                  }}
                />
              ))}
            </div>
          )}
          <p className="mt-1 truncate text-[12px] text-[#675f80]">{detail}</p>
        </div>

        <span className="text-[11px] font-medium text-[#7b7492]">{expanded ? "Less" : "More"}</span>
      </button>

      {expanded ? (
        <div className="border-t border-[#e4deec] px-3 py-2.5">
          {label === "Sleep" && sleepWindow?.startLabel ? (
            <div className="mb-2 flex justify-between gap-3 text-[12px] text-[#625b7c]">
              <span>{sleepWindow.startLabel}</span>
              <span>{sleepWindow.inBedLabel ?? "Sleep window"}</span>
              <span>{sleepWindow.endLabel ?? "--"}</span>
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[8px] bg-[#e6e0ed]">
            {trend.map((point, index) => (
              <div key={`${label}-${trendLabels[index]}`} className="bg-white/54 px-2 py-2 text-center">
                <div className="text-[9px] text-[#7f7895]">{trendLabels[index] ?? ""}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-[#342d5f]">
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
