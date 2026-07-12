"use client";

import { AnatomyHero } from "@/components/anatomy-hero";
import type { BodyHighlight, BodyRegionId } from "@/lib/insights/types";

export type AnatomyFigureProps = {
  highlights?: BodyHighlight[];
  weeklyHighlights?: BodyHighlight[];
  latestHighlights?: BodyHighlight[];
  className?: string;
  mode?: "svg" | "instrument";
  assetStyle?: "clinical" | "biomech";
  motionMode?: "static" | "charged";
  preload?: boolean;
  view?: "front" | "back" | "both";
  activeRegionId?: BodyRegionId | null;
  previewRegionId?: BodyRegionId | null;
  selectedRegionId?: BodyRegionId | null;
  onRegionPointerEnter?: (regionId: BodyRegionId) => void;
  onRegionPointerLeave?: (regionId: BodyRegionId) => void;
  onRegionClick?: (regionId: BodyRegionId) => void;
};

export function AnatomyFigure({
  highlights = [],
  weeklyHighlights,
  latestHighlights = [],
  className,
  motionMode = "charged",
  view = "front",
  activeRegionId = null,
  previewRegionId = null,
  selectedRegionId = null,
  onRegionPointerEnter,
  onRegionPointerLeave,
  onRegionClick,
}: AnatomyFigureProps) {
  if (view === "back") {
    return <div aria-hidden="true" className={className} data-anatomy-back-pending="true" />;
  }

  const selected = selectedRegionId ?? activeRegionId;
  return (
    <AnatomyHero
      className={className}
      weeklyHighlights={weeklyHighlights ?? highlights}
      latestHighlights={latestHighlights}
      mode="idle"
      previewRegionIds={previewRegionId ? [previewRegionId] : []}
      selectedRegionIds={selected ? [selected] : []}
      onPreviewChange={(regions) => {
        if (regions[0]) onRegionPointerEnter?.(regions[0]);
        else if (previewRegionId) onRegionPointerLeave?.(previewRegionId);
      }}
      onSelectionChange={(regions) => {
        if (regions[0]) onRegionClick?.(regions[0]);
      }}
      glowEnabled={motionMode !== "static"}
      forceReducedMotion={motionMode === "static"}
    />
  );
}

export { anatomyRegionView } from "@/lib/anatomy-regions";
export { renderAnatomyFigureImageLayers } from "@/components/anatomy-figure-export";
export type { AnatomyFigureImageLayer } from "@/components/anatomy-figure-export";
