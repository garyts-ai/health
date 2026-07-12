import type { AnatomyHeroLayerAsset } from "@/lib/anatomy-hero-manifest";

export const ASSEMBLY_ENERGIZE_AT_MS = 1900;
export const ASSEMBLY_LOCK_AT_MS = 2250;
export const ASSEMBLY_TOTAL_MS = 2450;
export const ASSEMBLY_MOBILE_TOTAL_MS = 2200;

export function assemblyScale(viewportWidth: number) {
  return viewportWidth <= 560 ? ASSEMBLY_MOBILE_TOTAL_MS / ASSEMBLY_TOTAL_MS : 1;
}

export function timingForLayer(asset: AnatomyHeroLayerAsset, viewportWidth: number) {
  if (!asset.assembly) return null;
  const scale = assemblyScale(viewportWidth);
  return {
    delay: Math.round(asset.assembly.delayMs * scale),
    duration: Math.round(asset.assembly.durationMs * scale),
  };
}

export function keyframesForLayer(asset: AnatomyHeroLayerAsset): Keyframe[] {
  const { x, y, rotate, scale } = asset.explodedTransform;
  return [
    {
      transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) scale(${scale})`,
      opacity: .32,
      filter: "brightness(.58) saturate(.62)",
      offset: 0,
    },
    {
      transform: `translate3d(${x * -.045}px, ${y * -.045}px, 0) rotate(${rotate * -.04}deg) scale(1.006)`,
      opacity: 1,
      filter: "brightness(1.12) saturate(1.12)",
      offset: .9,
    },
    {
      transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)",
      opacity: 1,
      filter: "brightness(1) saturate(1)",
      offset: 1,
    },
  ];
}
