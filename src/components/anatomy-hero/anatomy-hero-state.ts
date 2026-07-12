import type { BodyHighlight, BodyHighlightIntensity, BodyRegionId } from "@/lib/insights/types";
import type { AnatomyInteractionAction, AnatomyInteractionState } from "./types";

export const INITIAL_ANATOMY_INTERACTION_STATE: AnatomyInteractionState = {
  phase: "idle",
  previewRegionIds: [],
  selectedRegionIds: [],
  motionPaused: false,
  assemblyRun: 0,
};

function sameRegions(left: readonly BodyRegionId[], right: readonly BodyRegionId[]) {
  return left.length === right.length && left.every((regionId) => right.includes(regionId));
}

export function anatomyInteractionReducer(
  state: AnatomyInteractionState,
  action: AnatomyInteractionAction,
): AnatomyInteractionState {
  switch (action.type) {
    case "startAssembly":
      return {
        ...state,
        phase: "assembling",
        previewRegionIds: [],
        selectedRegionIds: [],
        assemblyRun: state.assemblyRun + 1,
      };
    case "enterLockIn":
      return state.phase === "assembling" ? { ...state, phase: "lockIn" } : state;
    case "completeAssembly":
      return state.phase === "lockIn" || state.phase === "assembling" ? { ...state, phase: "idle" } : state;
    case "cancelAssembly":
      return state.phase === "assembling" || state.phase === "lockIn" ? { ...state, phase: "idle" } : state;
    case "preview":
      return {
        ...state,
        phase: state.selectedRegionIds.length > 0 ? "pinned" : action.regionIds.length > 0 ? "preview" : "idle",
        previewRegionIds: action.regionIds,
      };
    case "toggleSelection": {
      const shouldClear = sameRegions(state.selectedRegionIds, action.regionIds);
      return {
        ...state,
        phase: shouldClear ? "idle" : "pinned",
        previewRegionIds: [],
        selectedRegionIds: shouldClear ? [] : action.regionIds,
      };
    }
    case "setSelection":
      return {
        ...state,
        phase: action.regionIds.length > 0 ? "pinned" : "idle",
        previewRegionIds: [],
        selectedRegionIds: action.regionIds,
      };
    case "clearSelection":
      return { ...state, phase: "idle", previewRegionIds: [], selectedRegionIds: [] };
    case "setMotionPaused":
      return { ...state, motionPaused: action.paused };
    default:
      return state;
  }
}

export function activeAnatomyRegions(state: AnatomyInteractionState): BodyRegionId[] {
  if (state.selectedRegionIds.length > 0) return state.selectedRegionIds;
  if (state.previewRegionIds.length > 0) return state.previewRegionIds;
  return [];
}

const INTENSITY_RANK: Record<BodyHighlightIntensity, number> = { low: 1, medium: 2, high: 3 };

export function intensityForRegions(
  highlights: readonly BodyHighlight[],
  regionIds: readonly BodyRegionId[],
): BodyHighlightIntensity | null {
  let result: BodyHighlightIntensity | null = null;
  for (const highlight of highlights) {
    if (!regionIds.includes(highlight.regionId)) continue;
    if (!result || INTENSITY_RANK[highlight.intensity] > INTENSITY_RANK[result]) result = highlight.intensity;
  }
  return result;
}

export function regionsIntersect(left: readonly BodyRegionId[], right: readonly BodyRegionId[]) {
  return left.some((regionId) => right.includes(regionId));
}
