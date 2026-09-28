import "server-only";

import { calendarDateKey, shiftCalendarDateKey } from "@/lib/calendar";
import { buildLongitudinalAnalysis } from "@/lib/longitudinal/analysis";
import { buildTrainingResponse } from "@/lib/longitudinal/relationships";
import { getLongitudinalHealthView } from "@/lib/longitudinal/engine";
import { getWhoopConnectionStatus } from "@/lib/whoop/provider";
import type { AnalysisRange, AnalysisView, LongitudinalHealthView, MetricTrend, WhoopAnalysisSelectionView } from "@/lib/longitudinal/types";

function metricTrends(view: LongitudinalHealthView) {
  return Object.values(view.domains).flatMap((domain) => domain.metrics) as MetricTrend[];
}

function mondayOf(date: string) {
  const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  return shiftCalendarDateKey(date, -((weekday + 6) % 7));
}

function fillMissingChartDates(metric: MetricTrend, startDate: string, endDate: string) {
  const values = new Map(metric.points.map((point) => [point.date, point]));
  const weekly = ["aerobic_minutes", "walking_minutes", "strength_frequency", "strength_sets"].includes(metric.id);
  const points: typeof metric.points = [];
  for (let date = weekly ? mondayOf(startDate) : startDate; date <= endDate; date = shiftCalendarDateKey(date, weekly ? 7 : 1)) {
    points.push(values.get(date) ?? { date, value: null });
  }
  return points;
}

export async function getWhoopAnalysisSelection(options: {
  range: AnalysisRange;
  endDate?: string;
  view: AnalysisView;
  metric?: string | null;
}): Promise<WhoopAnalysisSelectionView> {
  const now = new Date();
  const today = calendarDateKey(now);
  const endDate = options.endDate ?? shiftCalendarDateKey(today, -1);
  const [health, connection] = await Promise.all([
    getLongitudinalHealthView({ range: options.range, endDate, view: options.view }),
    getWhoopConnectionStatus(),
  ]);
  const metrics = metricTrends(health);
  const analysis = health.analysis ?? buildLongitudinalAnalysis(metrics, options.range, endDate);
  const plotStart = analysis.comparisonStartDate ?? analysis.startDate;
  const inPlotRange = (date: string) => date >= plotStart && date <= endDate;
  const latestCycles = (health.cycleObservations ?? []).filter((cycle) => cycle.date === today);
  const trainingResponse = options.view === "training"
    ? health.trainingResponse ?? buildTrainingResponse([], health.cycleObservations ?? [], analysis.startDate, endDate)
    : buildTrainingResponse([], [], analysis.startDate, endDate);

  return {
    generatedAt: now.toISOString(),
    timezone: health.timezone,
    selectedView: options.view,
    selectedMetric: options.metric ?? null,
    analysis,
    metrics: metrics.map((metric) => ({
      id: metric.id, domainId: metric.domainId, label: metric.label, unit: metric.unit,
      points: fillMissingChartDates(metric, plotStart, endDate),
      baselineValue: metric.baselineValue, confidence: metric.confidence,
      coveredDays: metric.coveredDays, expectedDays: metric.expectedDays,
      granularity: ["aerobic_minutes", "walking_minutes", "strength_frequency", "strength_sets"].includes(metric.id) ? "weekly" as const : "daily" as const,
    })),
    cycles: (health.cycleObservations ?? []).filter((cycle) => inPlotRange(cycle.date)),
    latestCycles,
    sleeps: (health.sleepObservations ?? []).filter((sleep) => inPlotRange(sleep.date)),
    activities: (health.activityObservations ?? []).filter((item) => inPlotRange(item.date)),
    sessions: (health.hevySessions ?? []).filter((item) => inPlotRange(item.date)),
    relationships: options.view === "sleep"
      ? health.sleepRelationships ?? []
      : options.view === "training" && health.strainRelationship ? [health.strainRelationship] : [],
    trainingResponse,
    recordedAssociations: options.view === "recorded" ? health.recordedAssociations : [],
    journalEvents: health.journalEvents ?? [],
    freshness: {
      lastSyncCompletedAt: connection.lastSyncCompletedAt,
      lastSyncStatus: connection.lastSyncStatus,
      isStale: connection.isStale,
    },
  };
}
