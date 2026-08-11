"use client";

import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { AnatomyHero } from "@/components/anatomy-hero";
import { ANATOMY_REGION_META } from "@/lib/anatomy-regions";
import type { BodyHighlight, BodyHighlightIntensity, BodyRegionId } from "@/lib/insights/types";
import {
  isFrontHeroRegion,
  projectedHeroCallout,
  visibleCalloutRegions,
} from "./anatomy-viewer-model";
import { MuscleVolumeRow } from "./muscle-volume-row";
import styles from "./anatomy-viewer.module.css";

export type AnatomyVolumeItem = {
  label: string;
  effectiveSets: number;
  hits: number;
  regions: BodyRegionId[];
};

function intensityFor(hits: number): BodyHighlightIntensity {
  return hits >= 3 ? "high" : hits >= 2 ? "medium" : "low";
}

function sameRegions(left: readonly BodyRegionId[], right: readonly BodyRegionId[]) {
  return left.length === right.length && left.every((regionId) => right.includes(regionId));
}

export function AnatomyViewer({
  weeklyHighlights,
  latestHighlights,
  targetRegionIds,
  volume,
  latestWorkout,
  latestSessionAge,
  workoutCount,
  emptyMessage,
  note,
}: {
  weeklyHighlights: BodyHighlight[];
  latestHighlights: BodyHighlight[];
  targetRegionIds: BodyRegionId[];
  volume: AnatomyVolumeItem[];
  latestWorkout: string;
  latestSessionAge: string;
  workoutCount: number;
  emptyMessage: string;
  note?: string | null;
}) {
  const [selectedRegions, setSelectedRegions] = useState<BodyRegionId[]>([]);
  const [previewRegions, setPreviewRegions] = useState<BodyRegionId[]>([]);
  const [activationRun, setActivationRun] = useState(0);
  const activeRegions = previewRegions.length > 0 ? previewRegions : selectedRegions;
  const callouts = useMemo(
    () => visibleCalloutRegions(weeklyHighlights, latestHighlights),
    [latestHighlights, weeklyHighlights],
  );
  const visualCallouts = callouts.slice(0, 6);
  const visibleVolume = useMemo(
    () => volume.filter((item) => item.regions.some(isFrontHeroRegion)),
    [volume],
  );

  const inspect = (regions: BodyRegionId[]) => {
    setSelectedRegions((current) => sameRegions(current, regions) ? [] : regions);
    setPreviewRegions([]);
  };

  const clearFocus = () => {
    setSelectedRegions([]);
    setPreviewRegions([]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    clearFocus();
  };

  return (
    <section className={styles.viewer} aria-labelledby="training-core-title" onKeyDown={onKeyDown}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>Training core / profile</span>
          <h2 id="training-core-title">Illustrated anatomy</h2>
          <p>{workoutCount} lifts · latest {latestSessionAge}</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.online}>Online<i aria-hidden="true" /></span>
          <div className={styles.stageControls} aria-label="Anatomy controls">
            <button aria-label="Replay powered anatomy assembly" onClick={() => { clearFocus(); setActivationRun((run) => run + 1); }} type="button">Replay</button>
            <button disabled={selectedRegions.length === 0} onClick={clearFocus} type="button">Full body</button>
          </div>
        </div>
      </header>

      <div className={styles.stage}>
        <div className={styles.figure}>
          <AnatomyHero
            className={styles.figureInner}
            weeklyHighlights={weeklyHighlights}
            latestHighlights={latestHighlights}
            mode="idle"
            targetRegionIds={targetRegionIds}
            assemblyRun={activationRun}
            autoCycle
            previewRegionIds={previewRegions}
            selectedRegionIds={selectedRegions}
            onPreviewChange={setPreviewRegions}
            onSelectionChange={setSelectedRegions}
          />
        </div>

        <div className={styles.callouts} aria-label="Front anatomy regions">
          {visualCallouts.map((region) => {
            const placement = projectedHeroCallout(region);
            const sameSide = visualCallouts.filter((candidate) => projectedHeroCallout(candidate).side === placement.side);
            const laneIndex = sameSide.indexOf(region);
            const laneY = sameSide.length <= 1 ? placement.yPercent : 26 + laneIndex * (48 / (sameSide.length - 1));
            const active = activeRegions.includes(region);
            return (
              <button
                aria-pressed={selectedRegions.includes(region)}
                className={styles.callout}
                data-active={active || undefined}
                data-side={placement.side}
                key={region}
                onBlur={() => setPreviewRegions([])}
                onClick={() => inspect([region])}
                onFocus={() => setPreviewRegions([region])}
                onMouseEnter={() => setPreviewRegions([region])}
                onMouseLeave={() => setPreviewRegions([])}
                style={{ "--callout-y": `${laneY}%` } as CSSProperties}
                type="button"
              >
                {ANATOMY_REGION_META[region].label}<i aria-hidden="true" />
              </button>
            );
          })}
        </div>

      </div>

      <div className={styles.mobileRegions} aria-label="Front anatomy region controls">
        {callouts.map((region) => (
          <button
            aria-pressed={selectedRegions.includes(region)}
            data-active={activeRegions.includes(region) || undefined}
            key={region}
            onBlur={() => setPreviewRegions([])}
            onClick={() => inspect([region])}
            onFocus={() => setPreviewRegions([region])}
            type="button"
          >
            {ANATOMY_REGION_META[region].label}
          </button>
        ))}
      </div>

      <div className={styles.session}>
        <span>Latest session</span>
        <strong>{latestWorkout}</strong>
        <p>{note ?? `${workoutCount} lifts · latest ${latestSessionAge}`}</p>
      </div>
      <div className={styles.legend} aria-label="Training map legend">
        <span data-tone="low">1×</span><span data-tone="medium">2×</span>
        <span data-tone="high">3×+</span><span data-tone="latest">Latest</span>
      </div>
      <div className={styles.volume}>
        <div className={styles.volumeHeading}><h3>Weekly muscle volume</h3><span>sets / freq</span></div>
        {visibleVolume.length ? visibleVolume.map((item) => (
          <MuscleVolumeRow
            {...item}
            active={item.regions.some((region) => activeRegions.includes(region))}
            intensity={intensityFor(item.hits)}
            key={item.label}
            onInspect={inspect}
            onPreview={setPreviewRegions}
            selected={sameRegions(selectedRegions, item.regions)}
          />
        )) : <p className={styles.empty}>{emptyMessage}</p>}
      </div>
    </section>
  );
}
