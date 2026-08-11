"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { BodyRegionId } from "@/lib/insights/types";
import { anatomyInteractionReducer, INITIAL_ANATOMY_INTERACTION_STATE } from "./anatomy-hero-state";
import type { AnatomyHeroMode, AnatomyInteractionState } from "./types";

export type AnatomyInteractionControllerValue = {
  state: AnatomyInteractionState;
  reducedMotion: boolean;
  preview: (regionIds: BodyRegionId[]) => void;
  toggleSelection: (regionIds: BodyRegionId[]) => void;
  clearSelection: () => void;
  enterLockIn: () => void;
  completeAssembly: () => void;
  cancelAssembly: () => void;
};

type AnatomyInteractionControllerProps = {
  mode: AnatomyHeroMode;
  assemblyRun?: number;
  previewRegionIds?: BodyRegionId[];
  selectedRegionIds?: BodyRegionId[];
  forceReducedMotion?: boolean;
  onPreviewChange?: (regions: BodyRegionId[]) => void;
  onSelectionChange?: (regions: BodyRegionId[]) => void;
  children: (controller: AnatomyInteractionControllerValue) => React.ReactNode;
};

function sameRegions(left: readonly BodyRegionId[], right: readonly BodyRegionId[]) {
  return left.length === right.length && left.every((regionId) => right.includes(regionId));
}

export function AnatomyInteractionController({
  mode,
  assemblyRun = 0,
  previewRegionIds,
  selectedRegionIds,
  forceReducedMotion = false,
  onPreviewChange,
  onSelectionChange,
  children,
}: AnatomyInteractionControllerProps) {
  void mode;
  const [state, dispatch] = useReducer(anatomyInteractionReducer, INITIAL_ANATOMY_INTERACTION_STATE);
  const [systemReducedMotion, setSystemReducedMotion] = useReducer((_: boolean, next: boolean) => next, false);
  const reducedMotion = forceReducedMotion || systemReducedMotion;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => dispatch({ type: "setMotionPaused", paused: document.hidden });
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (state.phase === "assembling" || state.phase === "lockIn") return;
    if (previewRegionIds && !sameRegions(previewRegionIds, state.previewRegionIds)) {
      dispatch({ type: "preview", regionIds: previewRegionIds });
    }
  }, [previewRegionIds, state.phase, state.previewRegionIds]);

  useEffect(() => {
    if (state.phase === "assembling" || state.phase === "lockIn") return;
    if (selectedRegionIds && !sameRegions(selectedRegionIds, state.selectedRegionIds)) {
      dispatch({ type: "setSelection", regionIds: selectedRegionIds });
    }
  }, [selectedRegionIds, state.phase, state.selectedRegionIds]);

  useEffect(() => {
    if (assemblyRun <= 0) return;
    onPreviewChange?.([]);
    onSelectionChange?.([]);
    dispatch({ type: "startAssembly" });
  }, [assemblyRun, onPreviewChange, onSelectionChange]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      dispatch({ type: "clearSelection" });
      onPreviewChange?.([]);
      onSelectionChange?.([]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onPreviewChange, onSelectionChange]);

  const preview = useCallback((regionIds: BodyRegionId[]) => {
    dispatch({ type: "cancelAssembly" });
    dispatch({ type: "preview", regionIds });
    onPreviewChange?.(regionIds);
  }, [onPreviewChange]);

  const toggleSelection = useCallback((regionIds: BodyRegionId[]) => {
    const clearing = state.selectedRegionIds.length === regionIds.length
      && state.selectedRegionIds.every((regionId) => regionIds.includes(regionId));
    dispatch({ type: "cancelAssembly" });
    dispatch({ type: "toggleSelection", regionIds });
    onSelectionChange?.(clearing ? [] : regionIds);
  }, [onSelectionChange, state.selectedRegionIds]);

  const clearSelection = useCallback(() => {
    dispatch({ type: "cancelAssembly" });
    dispatch({ type: "clearSelection" });
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  const enterLockIn = useCallback(() => dispatch({ type: "enterLockIn" }), []);
  const completeAssembly = useCallback(() => dispatch({ type: "completeAssembly" }), []);
  const cancelAssembly = useCallback(() => dispatch({ type: "cancelAssembly" }), []);

  const value = useMemo<AnatomyInteractionControllerValue>(() => ({
    state,
    reducedMotion,
    preview,
    toggleSelection,
    clearSelection,
    enterLockIn,
    completeAssembly,
    cancelAssembly,
  }), [cancelAssembly, clearSelection, completeAssembly, enterLockIn, preview, reducedMotion, state, toggleSelection]);

  return children(value);
}
