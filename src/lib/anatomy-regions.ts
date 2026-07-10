import type { BodyRegionId } from "@/lib/insights/types";

export const ANATOMY_REGION_IDS = [
  "chest",
  "frontDelts",
  "sideDelts",
  "rearDelts",
  "lats",
  "upperBack",
  "traps",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "glutes",
  "quads",
  "adductors",
  "hamstrings",
  "calves",
] as const satisfies readonly BodyRegionId[];

export function isAnatomyRegionId(value: string | undefined): value is BodyRegionId {
  return ANATOMY_REGION_IDS.includes(value as BodyRegionId);
}

export function anatomyRegionView(regionId: BodyRegionId): "front" | "back" {
  const backRegions: BodyRegionId[] = [
    "rearDelts",
    "triceps",
    "lats",
    "upperBack",
    "traps",
    "glutes",
    "hamstrings",
    "calves",
  ];

  return backRegions.includes(regionId) ? "back" : "front";
}
