"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WhoopAnalysisWorkspace, type WhoopAnalysisViewKey } from "@/components/whoop-analysis-workspace";
import { buildWhoopAnalysisRequestQuery } from "@/lib/longitudinal/analysis-request";
import type { AnalysisRange, WhoopAnalysisSelectionView } from "@/lib/longitudinal/types";

function selectionMatches(data: WhoopAnalysisSelectionView | null, selection: Pick<WhoopAnalysisSelectionView, "selectedView"> & { range: AnalysisRange; endDate: string }) {
  return Boolean(data && data.analysis.range === selection.range && data.analysis.endDate === selection.endDate
    && data.selectedView === selection.selectedView);
}

export function WhoopAnalysisClient({ initialData }: { initialData: WhoopAnalysisSelectionView }) {
  const [data, setData] = useState<WhoopAnalysisSelectionView | null>(initialData);
  const [range, setRange] = useState<AnalysisRange>(initialData.analysis.range);
  const [endDate, setEndDate] = useState(initialData.analysis.endDate);
  const [view, setView] = useState<WhoopAnalysisViewKey>(initialData.selectedView);
  const [metricId, setMetricId] = useState<string | null>(initialData.selectedMetric);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialData.analysis.endDate);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{ key: string; message: string } | null>(null);
  const [reload, setReload] = useState(0);
  const requestSelection = useMemo(() => ({ range, endDate, selectedView: view }), [range, endDate, view]);
  const selectionKey = useMemo(() => JSON.stringify(requestSelection), [requestSelection]);
  const error = requestError?.key === selectionKey ? requestError.message : null;
  const loading = !selectionMatches(data, requestSelection) && !error;

  useEffect(() => {
    if (selectionMatches(data, requestSelection)) return;
    const controller = new AbortController();
    const query = buildWhoopAnalysisRequestQuery({ range, endDate, view });
    void fetch(`/api/whoop/analysis?${query.toString()}`, { method: "GET", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 400 ? "That analysis selection is not valid." : "WHOOP analysis could not be refreshed.");
        return await response.json() as WhoopAnalysisSelectionView;
      })
      .then((next) => {
        if (controller.signal.aborted) return;
        setData(next);
        setRequestError(null);
        setReload(0);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setRequestError({
          key: selectionKey,
          message: reason instanceof Error ? reason.message : "WHOOP analysis could not be refreshed.",
        });
      });
    return () => controller.abort();
  }, [data, endDate, range, reload, requestSelection, selectionKey, view]);

  const changeRange = useCallback((next: AnalysisRange) => {
    setRange(next);
    setSelectedDate(endDate);
    setActiveDate(null);
  }, [endDate]);
  const changeEndDate = useCallback((next: string) => {
    setEndDate(next);
    setSelectedDate(next);
    setActiveDate(null);
  }, []);
  const selectDate = useCallback((date: string | null) => setSelectedDate(date), []);
  const hoverDate = useCallback((date: string | null) => setActiveDate(date), []);
  const retry = useCallback(() => {
    setRequestError(null);
    setReload((value) => value + 1);
  }, []);

  return <WhoopAnalysisWorkspace
    data={data}
    range={range}
    endDate={endDate}
    view={view}
    metricId={metricId}
    selectedDate={selectedDate}
    activeDate={activeDate}
    loading={loading}
    error={error}
    onRangeChange={changeRange}
    onEndDateChange={changeEndDate}
    onViewChange={setView}
    onMetricChange={setMetricId}
    onDateSelect={selectDate}
    onDateHover={hoverDate}
    onRetry={retry}
  />;
}
