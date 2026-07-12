import type { BodyHighlight, BodyRegionId } from "@/lib/insights/types";

export type AnatomyHeroMode = "idle" | "upper";

export type AnatomyHeroPhase = "idle" | "preview" | "pinned" | "assembling" | "lockIn";

export type AnatomyHeroProps = {
  weeklyHighlights: BodyHighlight[];
  latestHighlights: BodyHighlight[];
  mode?: AnatomyHeroMode;
  targetRegionIds?: BodyRegionId[];
  assemblyRun?: number;
  previewRegionIds?: BodyRegionId[];
  selectedRegionIds?: BodyRegionId[];
  onPreviewChange?: (regions: BodyRegionId[]) => void;
  onSelectionChange?: (regions: BodyRegionId[]) => void;
  glowEnabled?: boolean;
  forceReducedMotion?: boolean;
  className?: string;
};

export type AnatomyInteractionState = {
  phase: AnatomyHeroPhase;
  previewRegionIds: BodyRegionId[];
  selectedRegionIds: BodyRegionId[];
  motionPaused: boolean;
  assemblyRun: number;
};

export type AnatomyInteractionAction =
  | { type: "startAssembly" }
  | { type: "enterLockIn" }
  | { type: "completeAssembly" }
  | { type: "cancelAssembly" }
  | { type: "preview"; regionIds: BodyRegionId[] }
  | { type: "toggleSelection"; regionIds: BodyRegionId[] }
  | { type: "setSelection"; regionIds: BodyRegionId[] }
  | { type: "clearSelection" }
  | { type: "setMotionPaused"; paused: boolean };
