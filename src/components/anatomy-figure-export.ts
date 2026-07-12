import { ANATOMY_HERO_FRONT_LAYERS, ANATOMY_HERO_VIEWBOX } from "@/lib/anatomy-hero-manifest";
import type { BodyHighlight, BodyHighlightIntensity, BodyRegionId } from "@/lib/insights/types";

export type AnatomyFigureImageLayer = {
  svg: string;
  opacity?: number;
  filter?: string;
};

const INTENSITY_WEIGHT: Record<BodyHighlightIntensity, number> = { low: 1, medium: 2, high: 3 };

function intensityMap(highlights: readonly BodyHighlight[]) {
  const result = new Map<BodyRegionId, BodyHighlightIntensity>();
  for (const highlight of highlights) {
    const current = result.get(highlight.regionId);
    if (!current || INTENSITY_WEIGHT[highlight.intensity] > INTENSITY_WEIGHT[current]) {
      result.set(highlight.regionId, highlight.intensity);
    }
  }
  return result;
}

export async function renderAnatomyFigureImageLayers({
  highlights = [],
  weeklyHighlights,
  latestHighlights = [],
  className = "anatomy-hero-static-export",
  view = "front",
}: {
  highlights?: BodyHighlight[];
  weeklyHighlights?: BodyHighlight[];
  latestHighlights?: BodyHighlight[];
  className?: string;
  view?: "front" | "back" | "both";
}): Promise<AnatomyFigureImageLayer[]> {
  if (view === "back") return [];
  const weekly = intensityMap(weeklyHighlights ?? highlights);
  const latest = new Set(latestHighlights.map((highlight) => highlight.regionId));
  const images = ANATOMY_HERO_FRONT_LAYERS.map((asset) => {
    const intensity = asset.regionIds.map((regionId) => weekly.get(regionId)).find(Boolean);
    const isLatest = asset.regionIds.some((regionId) => latest.has(regionId));
    const attributes = [
      `data-anatomy-layer="${asset.id}"`,
      asset.regionIds.length ? `data-anatomy-regions="${asset.regionIds.join(" ")}"` : "",
      intensity ? `data-intensity="${intensity}"` : "",
      isLatest ? 'data-latest="true"' : "",
    ].filter(Boolean).join(" ");
    return `<image ${attributes} href="${asset.src}" x="${asset.bounds.x}" y="${asset.bounds.y}" width="${asset.bounds.width}" height="${asset.bounds.height}" preserveAspectRatio="none"/>`;
  }).join("");
  const svg = [
    `<svg class="${className}" data-anatomy-hero-static="front" viewBox="0 0 ${ANATOMY_HERO_VIEWBOX.width} ${ANATOMY_HERO_VIEWBOX.height}" xmlns="http://www.w3.org/2000/svg">`,
    "<style>",
    "[data-intensity=low]{filter:saturate(1.03) brightness(1.01)}",
    "[data-intensity=medium]{filter:saturate(1.08) brightness(1.05)}",
    "[data-intensity=high]{filter:saturate(1.13) brightness(1.08)}",
    "[data-latest=true]{filter:saturate(1.16) brightness(1.1) drop-shadow(0 0 5px #45e8ff)}",
    "</style>",
    images,
    "</svg>",
  ].join("");
  return [{ svg, opacity: 1 }];
}
