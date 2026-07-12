import {
  ANATOMY_HERO_FRONT_LAYERS,
  ANATOMY_HERO_FRONT_REGION_IDS,
  ANATOMY_HERO_VIEWBOX,
} from "@/lib/anatomy-hero-manifest";
import type { BodyHighlight, BodyRegionId } from "@/lib/insights/types";

const UPPER_TARGET_REGIONS: BodyRegionId[] = ["chest", "frontDelts", "sideDelts", "biceps", "triceps", "forearms", "lats"];
const LOWER_TARGET_REGIONS: BodyRegionId[] = ["quads", "adductors", "calves"];

export function regionsForTrainingTarget(
  target: "Upper" | "Lower" | "Either",
  availability: "Train" | "Rest",
) {
  if (availability === "Rest" || target === "Either") return [];
  return target === "Upper" ? [...UPPER_TARGET_REGIONS] : [...LOWER_TARGET_REGIONS];
}

const WEIGHT = { high: 3, medium: 2, low: 1 } as const;

export function bestFrontRegion(weekly: BodyHighlight[], latest: BodyHighlight[]) {
  const available = (regionId: BodyRegionId) => ANATOMY_HERO_FRONT_REGION_IDS.includes(regionId);
  const latestCandidate = latest.find((item) => available(item.regionId));
  if (latestCandidate) return latestCandidate.regionId;
  return weekly
    .filter((item) => available(item.regionId))
    .sort((left, right) => WEIGHT[right.intensity] - WEIGHT[left.intensity])[0]?.regionId ?? null;
}

export function defaultAnatomyView() {
  return "front" as const;
}

export function visibleCalloutRegions(weekly: BodyHighlight[], latest: BodyHighlight[]) {
  const ids: BodyRegionId[] = [];
  for (const item of [...latest, ...weekly]) {
    if (ANATOMY_HERO_FRONT_REGION_IDS.includes(item.regionId) && !ids.includes(item.regionId)) {
      ids.push(item.regionId);
    }
  }
  return ids;
}

export function projectedHeroCallout(regionId: BodyRegionId) {
  const assets = ANATOMY_HERO_FRONT_LAYERS.filter((asset) => asset.regionIds.includes(regionId));
  const anchors = assets.map((asset) => asset.calloutAnchor);
  const x = anchors.reduce((sum, anchor) => sum + anchor.x, 0) / Math.max(1, anchors.length);
  const y = anchors.reduce((sum, anchor) => sum + anchor.y, 0) / Math.max(1, anchors.length);
  const rightSideRegions = new Set<BodyRegionId>([
    "chest", "sideDelts", "triceps", "abs", "obliques", "adductors", "calves",
  ]);
  return {
    side: rightSideRegions.has(regionId) ? "right" as const : "left" as const,
    xPercent: x / ANATOMY_HERO_VIEWBOX.width * 100,
    yPercent: y / ANATOMY_HERO_VIEWBOX.height * 100,
  };
}

export function isFrontHeroRegion(regionId: BodyRegionId) {
  return ANATOMY_HERO_FRONT_REGION_IDS.includes(regionId);
}
