import type { TrendPoint } from "@/lib/insights/types";

export type SignalTone = "current" | "emphasis" | "caution" | "positive" | "danger";
export type SurfaceLevel = "base" | "raised" | "overlay";

export type InstrumentVisual = {
  kind: "line" | "bars";
  points: TrendPoint[];
  unit: string;
  baseline?: number;
  valueFormat: "percent" | "hours" | "decimal";
};

export type TodayTelemetryMetric = {
  label: string;
  value: string;
  detail: string;
  tone: SignalTone;
  visual?: InstrumentVisual;
};
