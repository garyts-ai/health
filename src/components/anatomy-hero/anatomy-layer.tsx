import Image from "next/image";
import type { CSSProperties } from "react";
import type { BodyHighlight } from "@/lib/insights/types";
import type { AnatomyHeroLayerAsset } from "@/lib/anatomy-hero-manifest";
import { intensityForRegions, regionsIntersect } from "./anatomy-hero-state";
import styles from "./anatomy-hero.module.css";

type AnatomyLayerProps = {
  asset: AnatomyHeroLayerAsset;
  viewBox: { width: number; height: number };
  weeklyHighlights: BodyHighlight[];
  latestHighlights: BodyHighlight[];
  activeRegionIds: AnatomyHeroLayerAsset["regionIds"];
  previewRegionIds: AnatomyHeroLayerAsset["regionIds"];
  selectedRegionIds: AnatomyHeroLayerAsset["regionIds"];
  targetRegionIds: AnatomyHeroLayerAsset["regionIds"];
  phase: string;
  glowEnabled: boolean;
};

type LayerStyle = CSSProperties & {
  "--layer-x": string;
  "--layer-y": string;
  "--layer-width": string;
  "--layer-height": string;
  "--focus-x": string;
  "--focus-y": string;
  "--layer-z": number;
  "--glow-limit": number;
  "--layer-mask": string;
};

export function AnatomyLayer({
  asset,
  viewBox,
  weeklyHighlights,
  latestHighlights,
  activeRegionIds,
  previewRegionIds,
  selectedRegionIds,
  targetRegionIds,
  phase,
  glowEnabled,
}: AnatomyLayerProps) {
  const weeklyIntensity = intensityForRegions(weeklyHighlights, asset.regionIds);
  const latest = latestHighlights.some((highlight) => asset.regionIds.includes(highlight.regionId));
  const active = regionsIntersect(asset.regionIds, activeRegionIds);
  const preview = regionsIntersect(asset.regionIds, previewRegionIds);
  const selected = regionsIntersect(asset.regionIds, selectedRegionIds);
  const target = regionsIntersect(asset.regionIds, targetRegionIds);
  const regionLayer = asset.regionIds.length > 0;
  const style: LayerStyle = {
    "--layer-x": `${asset.bounds.x / viewBox.width * 100}%`,
    "--layer-y": `${asset.bounds.y / viewBox.height * 100}%`,
    "--layer-width": `${asset.bounds.width / viewBox.width * 100}%`,
    "--layer-height": `${asset.bounds.height / viewBox.height * 100}%`,
    "--focus-x": `${asset.focusOffset.x}px`,
    "--focus-y": `${asset.focusOffset.y}px`,
    "--layer-z": asset.z,
    "--glow-limit": Math.max(0, Math.min(1, asset.glowLimit)),
    "--layer-mask": `url("${asset.src}")`,
  };

  return (
    <span
      className={styles.layer}
      style={style}
      data-layer-id={asset.id}
      data-depth={asset.depthPlane}
      data-region-layer={regionLayer || undefined}
      data-intensity={weeklyIntensity ?? "none"}
      data-latest={latest || undefined}
      data-active={active || undefined}
      data-preview={preview || undefined}
      data-selected={selected || undefined}
      data-target={target || undefined}
      data-dimmed={activeRegionIds.length > 0 && regionLayer && !active || undefined}
      data-assembling={phase === "assembling" || undefined}
      data-glow={glowEnabled || undefined}
    >
      <Image
        className={styles.art}
        src={asset.src}
        alt=""
        fill
        sizes="(max-width: 700px) 94vw, 52vw"
        loading="eager"
        unoptimized
        draggable={false}
      />
      {regionLayer ? <span className={styles.rim} /> : null}
      {regionLayer ? <span className={styles.energy} /> : null}
    </span>
  );
}
