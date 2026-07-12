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

export type AnatomyRegionMeta = {
  label: string;
  view: "front" | "back";
  calloutSide: "left" | "right";
  calloutY: number;
};

export const ANATOMY_REGION_META: Record<BodyRegionId, AnatomyRegionMeta> = {
  chest: { label: "Chest", view: "front", calloutSide: "left", calloutY: 31 },
  frontDelts: { label: "Front delts", view: "front", calloutSide: "left", calloutY: 22 },
  sideDelts: { label: "Side delts", view: "front", calloutSide: "right", calloutY: 22 },
  rearDelts: { label: "Rear delts", view: "back", calloutSide: "left", calloutY: 24 },
  lats: { label: "Lats", view: "back", calloutSide: "left", calloutY: 36 },
  upperBack: { label: "Upper back", view: "back", calloutSide: "right", calloutY: 30 },
  traps: { label: "Traps", view: "back", calloutSide: "right", calloutY: 19 },
  biceps: { label: "Biceps", view: "front", calloutSide: "left", calloutY: 38 },
  triceps: { label: "Triceps", view: "back", calloutSide: "left", calloutY: 40 },
  forearms: { label: "Forearms", view: "front", calloutSide: "left", calloutY: 50 },
  abs: { label: "Core", view: "front", calloutSide: "right", calloutY: 45 },
  obliques: { label: "Obliques", view: "front", calloutSide: "right", calloutY: 52 },
  glutes: { label: "Glutes", view: "back", calloutSide: "right", calloutY: 56 },
  quads: { label: "Quads", view: "front", calloutSide: "left", calloutY: 66 },
  adductors: { label: "Adductors", view: "front", calloutSide: "right", calloutY: 66 },
  hamstrings: { label: "Hamstrings", view: "back", calloutSide: "left", calloutY: 69 },
  calves: { label: "Calves", view: "back", calloutSide: "right", calloutY: 84 },
};

export function isAnatomyRegionId(value: string | undefined): value is BodyRegionId {
  return ANATOMY_REGION_IDS.includes(value as BodyRegionId);
}

export function anatomyRegionView(regionId: BodyRegionId): "front" | "back" {
  return ANATOMY_REGION_META[regionId].view;
}
