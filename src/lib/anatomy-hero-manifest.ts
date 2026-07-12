import type { BodyRegionId } from "@/lib/insights/types";
import { ANATOMY_HERO_HIT_PATHS } from "@/lib/anatomy-hero-hit-paths";

export type AnatomyHeroLayerAsset = {
  id: string;
  src: string;
  regionIds: BodyRegionId[];
  bounds: { x: number; y: number; width: number; height: number };
  z: number;
  focusOffset: { x: number; y: number };
  explodedTransform: { x: number; y: number; rotate: number; scale: number };
  assembly: { delayMs: number; durationMs: number } | null;
  calloutAnchor: { x: number; y: number };
  depthPlane: 0 | 1 | 2;
  activationOrder: number | null;
  glowLimit: number;
  hitPath: string | null;
};

export const ANATOMY_HERO_VIEWBOX = { width: 1024, height: 1536 } as const;

function layer(
  id: string,
  regionIds: BodyRegionId[],
  bounds: [number, number, number, number],
  options: Omit<AnatomyHeroLayerAsset, "id" | "src" | "regionIds" | "bounds" | "calloutAnchor" | "hitPath" | "explodedTransform" | "assembly"> & {
    calloutAnchor?: { x: number; y: number };
  },
): AnatomyHeroLayerAsset {
  const [x, y, right, bottom] = bounds;
  const centerX = (x + right) / 2;
  const centerY = (y + bottom) / 2;
  const deltaX = centerX - ANATOMY_HERO_VIEWBOX.width / 2;
  const deltaY = centerY - ANATOMY_HERO_VIEWBOX.height * .48;
  const magnitude = Math.max(1, Math.hypot(deltaX, deltaY));
  const regionId = regionIds[0];
  const assembly = regionId === undefined ? null
    : ["abs", "obliques", "adductors"].includes(regionId) ? { delayMs: 180, durationMs: 470 }
    : ["chest", "lats"].includes(regionId) ? { delayMs: 420, durationMs: 630 }
    : ["frontDelts", "sideDelts"].includes(regionId) ? { delayMs: 680, durationMs: 720 }
    : ["biceps", "triceps", "forearms"].includes(regionId) ? { delayMs: 920, durationMs: 780 }
    : { delayMs: 1150, durationMs: 800 };
  const explodeDistance = regionId && ["abs", "obliques", "adductors"].includes(regionId) ? 16 : 28;
  const side = Math.sign(deltaX);
  return {
    id,
    src: `/images/anatomy-hero-v2/front/${id}-v3.webp`,
    regionIds,
    bounds: { x, y, width: right - x, height: bottom - y },
    calloutAnchor: options.calloutAnchor ?? { x: (x + right) / 2, y: (y + bottom) / 2 },
    z: options.z,
    focusOffset: { x: options.focusOffset.x * 1.8, y: options.focusOffset.y * 1.8 },
    explodedTransform: {
      x: deltaX / magnitude * explodeDistance,
      y: deltaY / magnitude * explodeDistance,
      rotate: side * Math.min(3, Math.max(1.2, Math.abs(deltaX) / 120)),
      scale: .965,
    },
    assembly,
    depthPlane: options.depthPlane,
    activationOrder: options.activationOrder,
    glowLimit: options.glowLimit,
    hitPath: (ANATOMY_HERO_HIT_PATHS as Record<string, string>)[id] ?? null,
  };
}

export const ANATOMY_HERO_FRONT_LAYERS: AnatomyHeroLayerAsset[] = [
  layer("base_body", [], [198, 41, 820, 1455], {
    z: 0, focusOffset: { x: 0, y: 0 }, depthPlane: 0, activationOrder: null, glowLimit: 0,
  }),
  layer("lats-left", ["lats"], [362, 427, 469, 670], {
    z: 1, focusOffset: { x: -4, y: 1 }, depthPlane: 0, activationOrder: 5, glowLimit: 0.66,
    calloutAnchor: { x: 374, y: 450 },
  }),
  layer("lats-right", ["lats"], [556, 427, 660, 670], {
    z: 1, focusOffset: { x: 4, y: 1 }, depthPlane: 0, activationOrder: 5, glowLimit: 0.66,
    calloutAnchor: { x: 646, y: 450 },
  }),
  layer("obliques", ["obliques"], [372, 617, 648, 701], {
    z: 2, focusOffset: { x: 0, y: 2 }, depthPlane: 1, activationOrder: null, glowLimit: 0.58,
  }),
  layer("adductors", ["adductors"], [430, 690, 595, 968], {
    z: 4, focusOffset: { x: 0, y: 3 }, depthPlane: 1, activationOrder: null, glowLimit: 0.55,
  }),
  layer("abs", ["abs"], [439, 391, 586, 718], {
    z: 3, focusOffset: { x: 0, y: -2 }, depthPlane: 1, activationOrder: null, glowLimit: 0.62,
  }),
  layer("quads", ["quads"], [333, 688, 685, 1095], {
    z: 3, focusOffset: { x: 0, y: 4 }, depthPlane: 1, activationOrder: null, glowLimit: 0.62,
  }),
  layer("calves", ["calves"], [310, 1032, 708, 1420], {
    z: 3, focusOffset: { x: 0, y: 4 }, depthPlane: 1, activationOrder: null, glowLimit: 0.58,
  }),
  layer("triceps-left", ["triceps"], [221, 433, 279, 532], {
    z: 4, focusOffset: { x: -5, y: 0 }, depthPlane: 1, activationOrder: 4, glowLimit: 0.68,
  }),
  layer("triceps-right", ["triceps"], [746, 439, 794, 526], {
    z: 4, focusOffset: { x: 5, y: 0 }, depthPlane: 1, activationOrder: 4, glowLimit: 0.68,
  }),
  layer("chest-left", ["chest"], [337, 241, 512, 464], {
    z: 5, focusOffset: { x: -3, y: -2 }, depthPlane: 2, activationOrder: 0, glowLimit: 0.85,
    calloutAnchor: { x: 414, y: 342 },
  }),
  layer("chest-right", ["chest"], [513, 241, 688, 464], {
    z: 5, focusOffset: { x: 3, y: -2 }, depthPlane: 2, activationOrder: 0, glowLimit: 0.85,
    calloutAnchor: { x: 610, y: 342 },
  }),
  layer("biceps-left", ["biceps"], [255, 371, 381, 565], {
    z: 5, focusOffset: { x: -5, y: 0 }, depthPlane: 2, activationOrder: 3, glowLimit: 0.74,
  }),
  layer("biceps-right", ["biceps"], [644, 371, 770, 565], {
    z: 5, focusOffset: { x: 5, y: 0 }, depthPlane: 2, activationOrder: 3, glowLimit: 0.74,
  }),
  layer("forearms-left", ["forearms"], [198, 510, 321, 751], {
    z: 5, focusOffset: { x: -5, y: 2 }, depthPlane: 2, activationOrder: null, glowLimit: 0.64,
  }),
  layer("forearms-right", ["forearms"], [699, 511, 821, 751], {
    z: 5, focusOffset: { x: 5, y: 2 }, depthPlane: 2, activationOrder: null, glowLimit: 0.64,
  }),
  layer("front-delts-left", ["frontDelts"], [302, 256, 416, 396], {
    z: 6, focusOffset: { x: -4, y: -2 }, depthPlane: 2, activationOrder: 1, glowLimit: 0.78,
  }),
  layer("front-delts-right", ["frontDelts"], [609, 260, 723, 396], {
    z: 6, focusOffset: { x: 4, y: -2 }, depthPlane: 2, activationOrder: 1, glowLimit: 0.78,
  }),
  layer("side-delts-left", ["sideDelts"], [255, 285, 327, 454], {
    z: 7, focusOffset: { x: -6, y: 0 }, depthPlane: 2, activationOrder: 2, glowLimit: 0.76,
  }),
  layer("side-delts-right", ["sideDelts"], [698, 291, 765, 452], {
    z: 7, focusOffset: { x: 6, y: 0 }, depthPlane: 2, activationOrder: 2, glowLimit: 0.76,
  }),
];

export const ANATOMY_HERO_FRONT_REGION_IDS = Array.from(new Set(
  ANATOMY_HERO_FRONT_LAYERS.flatMap((asset) => asset.regionIds),
));
