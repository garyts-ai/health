import type { TrendPoint } from "@/lib/insights/types";
import type { TodayTelemetryMetric } from "./types";

export type TodayTelemetryInput = {
  recoveryScore: number | null;
  sleepHours: number | null;
  sleepVsNeedHours: number | null;
  sleepStageContext?: string | null;
  strainScore: number | null;
  recovery7d: TrendPoint[];
  sleep7d: TrendPoint[];
  strain7d: TrendPoint[];
};

export function mapTodayTelemetry(input: TodayTelemetryInput): TodayTelemetryMetric[] {
  return [
    { label: "Recovery", value: input.recoveryScore === null ? "--" : `${Math.round(input.recoveryScore)}%`, detail: "WHOOP recovery score", tone: "caution", visual: { kind: "line", points: input.recovery7d, unit: "%", valueFormat: "percent" } },
    { label: "Sleep", value: input.sleepHours === null ? "--" : `${input.sleepHours.toFixed(1)}h`, detail: [input.sleepVsNeedHours === null ? "Actual sleep" : `${input.sleepVsNeedHours.toFixed(1)}h vs need`, input.sleepStageContext].filter(Boolean).join(" · "), tone: "current", visual: { kind: "bars", points: input.sleep7d, unit: "h", valueFormat: "hours" } },
    { label: "Strain", value: input.strainScore === null ? "--" : input.strainScore.toFixed(1), detail: "Current day strain", tone: "current", visual: { kind: "line", points: input.strain7d, unit: "", valueFormat: "decimal" } },
  ];
}
