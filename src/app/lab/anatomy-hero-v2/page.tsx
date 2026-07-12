"use client";

import { useState } from "react";
import Link from "next/link";
import type { BodyHighlight, BodyHighlightIntensity, BodyRegionId } from "@/lib/insights/types";
import { AnatomyHero, type AnatomyHeroMode } from "@/components/anatomy-hero";
import styles from "./page.module.css";

const UPPER_WEEKLY: BodyHighlight[] = [
  { regionId: "chest", intensity: "high", view: "front" },
  { regionId: "frontDelts", intensity: "high", view: "front" },
  { regionId: "sideDelts", intensity: "medium", view: "front" },
  { regionId: "biceps", intensity: "medium", view: "front" },
  { regionId: "triceps", intensity: "low", view: "back" },
  { regionId: "lats", intensity: "low", view: "back" },
  { regionId: "quads", intensity: "low", view: "front" },
];

const UPPER_LATEST: BodyHighlight[] = [
  { regionId: "chest", intensity: "high", view: "front" },
  { regionId: "frontDelts", intensity: "high", view: "front" },
  { regionId: "sideDelts", intensity: "medium", view: "front" },
  { regionId: "biceps", intensity: "medium", view: "front" },
];

const VOLUME_ROWS: Array<{
  label: string;
  value: string;
  intensity: BodyHighlightIntensity;
  regions: BodyRegionId[];
}> = [
  { label: "Chest", value: "12 sets / 2×", intensity: "high", regions: ["chest"] },
  { label: "Delts", value: "11 sets / 2×", intensity: "high", regions: ["frontDelts", "sideDelts"] },
  { label: "Arms", value: "8 sets / 2×", intensity: "medium", regions: ["biceps", "triceps", "forearms"] },
  { label: "Lats", value: "6 sets / 1×", intensity: "low", regions: ["lats"] },
  { label: "Quads", value: "4 sets / 1×", intensity: "low", regions: ["quads"] },
];

function sameRegions(left: readonly BodyRegionId[], right: readonly BodyRegionId[]) {
  return left.length === right.length && left.every((regionId) => right.includes(regionId));
}

export default function AnatomyHeroV2LabPage() {
  const [mode, setMode] = useState<AnatomyHeroMode>("idle");
  const [heroRun, setHeroRun] = useState(0);
  const [selectedRegions, setSelectedRegions] = useState<BodyRegionId[]>([]);
  const [previewRegions, setPreviewRegions] = useState<BodyRegionId[]>([]);
  const [glowEnabled, setGlowEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [emptyHighlights, setEmptyHighlights] = useState(false);

  const showIdle = () => {
    setMode("idle");
    setSelectedRegions([]);
    setPreviewRegions([]);
  };

  const replayAssembly = () => {
    setMode("idle");
    setSelectedRegions([]);
    setPreviewRegions([]);
    setHeroRun((run) => run + 1);
  };

  const toggleRegions = (regions: BodyRegionId[]) => {
    setSelectedRegions((current) => sameRegions(current, regions) ? [] : regions);
  };

  const highlights = emptyHighlights ? [] : UPPER_WEEKLY;
  const latest = emptyHighlights ? [] : UPPER_LATEST;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Anatomy hero V2</h1>
          <p>Front-view layered artwork and region-state QA.</p>
        </div>
        <Link href="/#today">Return to Today</Link>
      </header>

      <div className={styles.toolbar} aria-label="Hero state controls">
        <button type="button" onClick={showIdle} aria-pressed={mode === "idle" && selectedRegions.length === 0}>Idle assembled</button>
        <button type="button" onClick={replayAssembly}>Replay assembly</button>
        <button type="button" onClick={() => toggleRegions(["chest"])} aria-pressed={sameRegions(selectedRegions, ["chest"])}>Focus chest</button>
        <button type="button" onClick={() => toggleRegions(["frontDelts", "sideDelts"])} aria-pressed={sameRegions(selectedRegions, ["frontDelts", "sideDelts"])}>Focus delts</button>
        <button type="button" onClick={() => setGlowEnabled((enabled) => !enabled)} aria-pressed={!glowEnabled}>Glow off</button>
        <button type="button" onClick={() => setReducedMotion((reduced) => !reduced)} aria-pressed={reducedMotion}>Reduced motion</button>
        <button type="button" onClick={() => setEmptyHighlights((empty) => !empty)} aria-pressed={emptyHighlights}>Empty highlights</button>
      </div>

      <section className={styles.workspace} aria-label="Anatomy hero prototype">
        <div className={styles.visual}>
          <AnatomyHero
            weeklyHighlights={highlights}
            latestHighlights={latest}
            mode={mode}
            targetRegionIds={["chest", "frontDelts", "sideDelts", "biceps", "triceps", "forearms", "lats"]}
            assemblyRun={heroRun}
            previewRegionIds={previewRegions}
            selectedRegionIds={selectedRegions}
            onPreviewChange={setPreviewRegions}
            onSelectionChange={setSelectedRegions}
            glowEnabled={glowEnabled}
            forceReducedMotion={reducedMotion}
          />
        </div>

        <aside className={styles.data} aria-label="Linked muscle volume">
          <div className={styles.dataHeading}>
            <h2>Weekly muscle volume</h2>
            <span>Sets / frequency</span>
          </div>
          <div className={styles.rows}>
            {VOLUME_ROWS.map((row) => {
              const selected = sameRegions(selectedRegions, row.regions);
              const preview = sameRegions(previewRegions, row.regions);
              return (
                <button
                  key={row.label}
                  type="button"
                  className={styles.volumeRow}
                  data-intensity={row.intensity}
                  data-active={selected || preview || undefined}
                  aria-pressed={selected}
                  onPointerEnter={() => setPreviewRegions(row.regions)}
                  onPointerLeave={() => setPreviewRegions([])}
                  onFocus={() => setPreviewRegions(row.regions)}
                  onBlur={() => setPreviewRegions([])}
                  onClick={() => toggleRegions(row.regions)}
                >
                  <span>{row.label}</span>
                  <i aria-hidden="true"><b /></i>
                  <strong>{row.value}</strong>
                </button>
              );
            })}
          </div>
          <button type="button" className={styles.reset} onClick={showIdle} disabled={selectedRegions.length === 0}>Full body</button>
          <p className={styles.stateReadout} aria-live="polite">
            {selectedRegions.length > 0 ? `Selected: ${selectedRegions.join(", ")}` : "Full body selected"}
          </p>
        </aside>
      </section>
    </main>
  );
}
