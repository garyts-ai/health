import { ANALYSIS_METRIC_IDS, isAnalysisRange, validAnalysisEndDate } from "@/lib/longitudinal/analysis";
import type { AnalysisRange, AnalysisView } from "@/lib/longitudinal/types";

const ANALYSIS_VIEWS = new Set<AnalysisView>(["overview", "sleep", "training", "recorded"]);
const ANALYSIS_METRICS = new Set<string>(ANALYSIS_METRIC_IDS);

export type WhoopAnalysisRequest = {
  range: AnalysisRange;
  endDate?: string;
  view: AnalysisView;
  metric: string | null;
};

export function buildWhoopAnalysisRequestQuery(selection: { range: AnalysisRange; endDate: string; view: AnalysisView }) {
  return new URLSearchParams({ range: selection.range, endDate: selection.endDate, view: selection.view });
}

export function parseWhoopAnalysisRequest(params: URLSearchParams, today: string): WhoopAnalysisRequest | { error: string } {
  const rangeParam = params.get("range");
  const range = rangeParam ?? "30d";
  if (!isAnalysisRange(range)) return { error: "Invalid analysis range." };

  const endParam = params.get("endDate");
  const endDate = endParam ? validAnalysisEndDate(endParam, today) : undefined;
  if (endParam && (!/^\d{4}-\d{2}-\d{2}$/.test(endParam) || endDate !== endParam)) {
    return { error: "Invalid analysis end date." };
  }

  const viewParam = params.get("view");
  const view = viewParam ?? "overview";
  if (!ANALYSIS_VIEWS.has(view as AnalysisView)) return { error: "Invalid analysis view." };

  const metric = params.get("metric");
  if (metric !== null && !ANALYSIS_METRICS.has(metric)) return { error: "Invalid analysis metric." };

  return {
    range: range as AnalysisRange,
    ...(endDate ? { endDate } : {}),
    view: view as AnalysisView,
    metric,
  };
}
