import type { BodyHighlight, BodyRegionId } from "@/lib/insights/types";
import {
  ANATOMY_REGION_IDS,
  anatomyRegionView,
  isAnatomyRegionId,
} from "@/lib/anatomy-regions";

const FRONT_LOW: BodyRegionId[] = ["biceps", "forearms", "abs", "obliques"];
const FRONT_MEDIUM: BodyRegionId[] = ["frontDelts", "sideDelts", "adductors", "calves"];
const FRONT_HIGH: BodyRegionId[] = ["chest", "quads"];
const BACK_LOW: BodyRegionId[] = ["triceps"];
const BACK_MEDIUM: BodyRegionId[] = ["rearDelts", "traps", "hamstrings"];
const BACK_HIGH: BodyRegionId[] = ["lats", "upperBack", "glutes"];

export const ANATOMY_QA_REGIONS: BodyRegionId[] = [...ANATOMY_REGION_IDS];

export function isAnatomyQaRegion(value: string | undefined): value is BodyRegionId {
  return isAnatomyRegionId(value);
}

export function anatomyQaHighlight(regionId: BodyRegionId): BodyHighlight {
  return {
    regionId,
    intensity: "high",
    view: anatomyRegionView(regionId),
  };
}

function highlightsFor(regions: BodyRegionId[], intensity: BodyHighlight["intensity"], view: BodyHighlight["view"]) {
  return regions.map((regionId) => ({ regionId, intensity, view }));
}

export const ANATOMY_QA_WEEKLY_HIGHLIGHTS: BodyHighlight[] = [
  ...highlightsFor(FRONT_LOW, "low", "front"),
  ...highlightsFor(FRONT_MEDIUM, "medium", "front"),
  ...highlightsFor(FRONT_HIGH, "high", "front"),
  ...highlightsFor(BACK_LOW, "low", "back"),
  ...highlightsFor(BACK_MEDIUM, "medium", "back"),
  ...highlightsFor(BACK_HIGH, "high", "back"),
];

export const ANATOMY_QA_LATEST_HIGHLIGHTS: BodyHighlight[] = highlightsFor(
  ["lats", "upperBack", "traps", "rearDelts", "biceps"],
  "high",
  "back",
);

export const ANATOMY_QA_WEEKLY_VOLUME = [
  { label: "Lats / upper back", effectiveSets: 14, hits: 3 },
  { label: "Chest", effectiveSets: 11, hits: 3 },
  { label: "Quads", effectiveSets: 10, hits: 3 },
  { label: "Glutes", effectiveSets: 9, hits: 3 },
  { label: "Hamstrings", effectiveSets: 7, hits: 2 },
  { label: "Delts", effectiveSets: 6, hits: 2 },
  { label: "Arms", effectiveSets: 5, hits: 1 },
];

export const ANATOMY_QA_REGION_CHECKS = [
  { label: "Chest", view: "front", exposure: "high / magenta" },
  { label: "Front + side delts", view: "front", exposure: "medium / amber" },
  { label: "Back, lats, traps", view: "back", exposure: "high + latest cyan" },
  { label: "Biceps + arms", view: "front/back", exposure: "low + latest cyan" },
  { label: "Abs + obliques", view: "front", exposure: "low / violet" },
  { label: "Glutes", view: "back", exposure: "high / magenta" },
  { label: "Quads", view: "front", exposure: "high / magenta" },
  { label: "Hamstrings", view: "back", exposure: "medium / amber" },
  { label: "Calves", view: "front/back", exposure: "medium / amber" },
];
