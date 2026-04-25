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
  };
};

function formatSleepDuration(rawValue: string) {
  const parsed = Number.parseFloat(rawValue.replace("h", ""));
  if (!Number.isFinite(parsed)) {
    return rawValue;
  }

  const hours = Math.floor(parsed);
  const minutes = Math.round((parsed - hours) * 60);
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

function parseClockMinutes(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/(\d+):(\d+)\s?(AM|PM)/i);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM") {
    hours += 12;
  }

  return hours * 60 + minutes;
}

function formatTrendValue(label: string, point: number | null) {
  if (point === null) {
    return "--";
  }

  if (label === "Recovery") {
    return `${Math.round(point)}%`;
  }

  if (label === "Sleep") {
    return `${point.toFixed(1)}h`;
  }

  return point.toFixed(1);
}

function getInterpretation(label: string, point: number | null, index: number, trend: Array<number | null>) {
  if (point === null) {
    return "No reading";
  }

  const previous = index > 0 ? trend[index - 1] : null;
  const delta = typeof previous === "number" ? point - previous : null;

  if (label === "Recovery") {
    if (point < 34) return "Low";
    if (point < 67) return delta !== null && delta > 5 ? "Rebounding" : "Moderate";
    return "High";
  }

  if (label === "Sleep") {
    if (point < 6) return "Short";
    if (point < 7.5) return "Okay";
    return "Solid";
  }

  if (point < 6) return "Easy";
  if (point < 12) return "Moderate";
  return "High";
}

function getCardTone(label: string) {
  if (label === "Strain") {
    return {
      accent: "#ff8f75",
      accentSoft: "rgba(255, 143, 117, 0.28)",
      track: "rgba(255, 143, 117, 0.14)",
    };
  }

  if (label === "Sleep") {
    return {
      accent: "#6d68bd",
      accentSoft: "rgba(109, 104, 189, 0.3)",
      track: "rgba(95, 88, 167, 0.13)",
    };
  }

  return {
    accent: "#625bb0",
    accentSoft: "rgba(98, 91, 176, 0.3)",
    track: "rgba(95, 88, 167, 0.13)",
  };
}

function buildSleepCoordinates(sleepWindow: HeroStatCardProps["sleepWindow"]) {
  const sleepStartMinutes = parseClockMinutes(sleepWindow?.startLabel);
  const sleepEndMinutes = parseClockMinutes(sleepWindow?.endLabel);
  const timelineStart = 20 * 60;
  const timelineEnd = 12 * 60 + 24 * 60;
  const normalize = (value: number | null) =>
    value === null ? null : value < timelineStart ? value + 24 * 60 : value;
  const normalizedSleepStart = normalize(sleepStartMinutes);
  const normalizedSleepEnd = normalize(sleepEndMinutes);
  const scale = (value: number | null, fallback: number) =>
    value === null
      ? fallback
      : 24 + ((value - timelineStart) / (timelineEnd - timelineStart)) * 252;

  return {
    startX: scale(normalizedSleepStart, 24),
    endX: scale(normalizedSleepEnd, 276),
  };
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
  const tone = getCardTone(label);
  const numericTrend = trend.filter((point): point is number => typeof point === "number");
  const min = numericTrend.length ? Math.min(...numericTrend) : 0;
  const max = numericTrend.length ? Math.max(...numericTrend) : 0;
  const range = max - min || 1;
  const chartMode =
    label === "Recovery" ? "gauge" : label === "Sleep" ? "timeline" : "bars";
  const recoveryGauge = typeof gaugeValue === "number" ? Math.max(0, Math.min(100, gaugeValue)) : 0;
  const sleepDurationLabel = label === "Sleep" ? formatSleepDuration(value) : value;
  const latestStrainValue =
    trend.length && trend[trend.length - 1] !== null
      ? trend[trend.length - 1]!.toFixed(1)
      : value;
  const sleepCoordinates = buildSleepCoordinates(sleepWindow);
  const bars = trend.map((point) => {
    if (point === null) {
      return { height: 10 };
    }

    const normalized = (point - min) / range;
    return { height: 18 + normalized * 34 };
  });

  return (
    <section
      className="@container group rounded-[10px] border border-[rgba(79,70,127,0.14)] bg-[linear-gradient(180deg,_rgba(247,244,252,0.96)_0%,_rgba(239,234,247,0.88)_100%)] p-3.5 text-[#171329] shadow-[0_8px_22px_rgba(22,20,35,0.07)] transition-colors hover:border-[rgba(95,88,167,0.25)]"
    >
      <button
        aria-expanded={expanded}
        className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-[#6d68bd]/35"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] font-medium text-[#6b6484]">{label}</div>
          <div className="text-[10px] font-medium text-[#8a83a4]">
            {expanded ? "Hide" : "Details"}
          </div>
        </div>
      </button>

      <div className="mt-2 @lg:grid @lg:grid-cols-[minmax(180px,0.82fr)_minmax(210px,1fr)] @lg:items-center @lg:gap-4">
        <button
          aria-expanded={expanded}
          className="flex min-h-[104px] w-full items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#6d68bd]/35"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {chartMode === "gauge" ? (
            <svg aria-hidden="true" viewBox="0 0 128 112" className="h-[106px] w-[128px] overflow-visible">
              <circle cx="64" cy="56" r="39" fill="none" stroke={tone.track} strokeWidth="12" />
              <circle
                cx="64"
                cy="56"
                r="39"
                fill="none"
                stroke={tone.accent}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 39}
                strokeDashoffset={(2 * Math.PI * 39) * (1 - recoveryGauge / 100)}
                transform="rotate(-90 64 56)"
              />
              <text x="64" y="59" textAnchor="middle" className="fill-[#2f285f] text-[25px] font-semibold">
                {value}
              </text>
            </svg>
          ) : chartMode === "timeline" ? (
            <svg aria-hidden="true" viewBox="0 0 320 92" className="h-[96px] w-full max-w-[300px] overflow-visible">
              <text x="160" y="25" textAnchor="middle" className="fill-[#2f285f] text-[28px] font-semibold">
                {sleepDurationLabel}
              </text>
              <line x1="24" y1="54" x2="296" y2="54" stroke={tone.track} strokeWidth="7" strokeLinecap="round" />
              <line
                x1={sleepCoordinates.startX}
                y1="54"
                x2={sleepCoordinates.endX}
                y2="54"
                stroke={tone.accent}
                strokeWidth="7"
                strokeLinecap="round"
              />
              <circle cx={sleepCoordinates.startX} cy="54" r="5" fill={tone.accent} />
              <circle cx={sleepCoordinates.endX} cy="54" r="5" fill="#8d86db" />
              <text x="24" y="82" className="fill-[#655d85] text-[11px] font-medium">
                {sleepWindow?.startLabel ?? "--"}
              </text>
              <text x="296" y="82" textAnchor="end" className="fill-[#655d85] text-[11px] font-medium">
                {sleepWindow?.endLabel ?? "--"}
              </text>
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 260 104" className="h-[96px] w-full max-w-[260px] overflow-visible">
              <text x="130" y="25" textAnchor="middle" className="fill-[#2f285f] text-[28px] font-semibold">
                {latestStrainValue}
              </text>
              <line x1="72" y1="78" x2="188" y2="78" stroke="rgba(99,90,126,0.16)" strokeWidth="1.5" />
              {bars.map((bar, index) => (
                <rect
                  key={`${label}-bar-${index}`}
                  x={88 + index * 34}
                  y={80 - bar.height}
                  width={18}
                  height={bar.height}
                  rx="4"
                  fill={index === bars.length - 1 ? tone.accent : tone.accentSoft}
                />
              ))}
            </svg>
          )}
        </button>

        <div className="@lg:min-w-0">
          <div className="text-center text-[13px] leading-5 text-[#625b7c] @lg:text-left">{detail}</div>

          <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[9px] border border-[rgba(116,108,152,0.09)] bg-[rgba(255,255,255,0.34)]">
            {trend.map((point, index) => (
              <div
                key={`${label}-trend-${index}`}
                className="border-l border-[rgba(116,108,152,0.09)] px-2 py-2 text-center first:border-l-0"
              >
                <div className="text-[9px] text-[#807894]">{trendLabels[index] ?? ""}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-[#382f68]">
                  {formatTrendValue(label, point)}
                </div>
              </div>
            ))}
          </div>

          {expanded ? (
            <div className="mt-3 rounded-[9px] border border-[rgba(116,108,152,0.1)] bg-[rgba(255,255,255,0.32)] p-2.5">
              <div className="grid gap-1.5">
                {trend.map((point, index) => (
                  <div
                    key={`${label}-detail-${index}`}
                    className="flex items-center justify-between gap-3 text-[12px]"
                  >
                    <span className="text-[#746d8e]">{trendLabels[index] ?? `Day ${index + 1}`}</span>
                    <span className="font-semibold text-[#2f285f]">{formatTrendValue(label, point)}</span>
                    <span className="min-w-[74px] text-right text-[#6b6484]">
                      {getInterpretation(label, point, index, trend)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
