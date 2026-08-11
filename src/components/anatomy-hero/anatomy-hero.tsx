"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { ANATOMY_HERO_FRONT_LAYERS, ANATOMY_HERO_VIEWBOX } from "@/lib/anatomy-hero-manifest";
import { activeAnatomyRegions, regionsIntersect } from "./anatomy-hero-state";
import { AnatomyInteractionController } from "./anatomy-interaction-controller";
import type { AnatomyInteractionControllerValue } from "./anatomy-interaction-controller";
import { AnatomyLayer } from "./anatomy-layer";
import {
  ASSEMBLY_LOCK_AT_MS,
  ASSEMBLY_ENERGIZE_AT_MS,
  ASSEMBLY_TOTAL_MS,
  assemblyScale,
  keyframesForLayer,
  timingForLayer,
} from "./anatomy-assembly";
import { cycleTiming, recurringKeyframesForLayer } from "./anatomy-cycle";
import type { AnatomyHeroProps } from "./types";
import styles from "./anatomy-hero.module.css";

type StageStyle = CSSProperties & { "--parallax-x": string; "--parallax-y": string };

type AnatomyHeroStageProps = Omit<AnatomyHeroProps, "mode" | "assemblyRun"> & {
  controller: AnatomyInteractionControllerValue;
};

function AnatomyHeroStage({
  controller,
  weeklyHighlights,
  latestHighlights,
  targetRegionIds = [],
  autoCycle = false,
  glowEnabled = true,
  className,
}: AnatomyHeroStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const replayAnimationsRef = useRef<Animation[]>([]);
  const cycleAnimationsRef = useRef<Animation[]>([]);
  const motionPausedRef = useRef(controller.state.motionPaused);
  const [stageVisible, setStageVisible] = useState(true);
  const { completeAssembly, enterLockIn, reducedMotion } = controller;
  const assemblyRun = controller.state.assemblyRun;

  useEffect(() => {
    motionPausedRef.current = controller.state.motionPaused;
  }, [controller.state.motionPaused]);

  const cancelReplay = useCallback(() => {
    replayAnimationsRef.current.forEach((animation) => animation.cancel());
    replayAnimationsRef.current = [];
  }, []);

  const cancelCycle = useCallback(() => {
    cycleAnimationsRef.current.forEach((animation) => animation.cancel());
    cycleAnimationsRef.current = [];
    if (stageRef.current) delete stageRef.current.dataset.cycling;
  }, []);

  useEffect(() => () => {
    cancelReplay();
    cancelCycle();
  }, [cancelCycle, cancelReplay]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setStageVisible(entry.isIntersecting && entry.intersectionRatio >= .12),
      { threshold: [0, .12] },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (assemblyRun <= 0) return;
    cancelCycle();
    cancelReplay();
    if (reducedMotion) {
      completeAssembly();
      return;
    }
    const stage = stageRef.current;
    const figure = figureRef.current;
    if (!stage || !figure) return;
    delete stage.dataset.energized;
    const width = window.innerWidth;
    const scale = assemblyScale(width);
    const animations: Animation[] = [];
    for (const asset of ANATOMY_HERO_FRONT_LAYERS) {
      const timing = timingForLayer(asset, width);
      if (!timing) continue;
      const element = figure.querySelector<HTMLElement>(`[data-motion-layer-id="${asset.id}"]`);
      if (!element) continue;
      animations.push(element.animate(keyframesForLayer(asset), {
        delay: timing.delay,
        duration: timing.duration,
        easing: "cubic-bezier(.16, 1, .3, 1)",
        fill: "both",
      }));
      const hitLayer = figure.querySelector<SVGGElement>(`[data-motion-hit-layer="${asset.id}"]`);
      if (hitLayer) {
        animations.push(hitLayer.animate(keyframesForLayer(asset).map(({ transform, offset }) => ({ transform, offset })), {
          delay: timing.delay,
          duration: timing.duration,
          easing: "cubic-bezier(.16, 1, .3, 1)",
          fill: "both",
        }));
      }
    }
    const lockMarker = stage.animate([{ opacity: 1 }, { opacity: 1 }], {
      duration: Math.round(ASSEMBLY_LOCK_AT_MS * scale),
    });
    const energizeMarker = stage.animate([{ opacity: 1 }, { opacity: 1 }], {
      duration: Math.round(ASSEMBLY_ENERGIZE_AT_MS * scale),
    });
    const completeMarker = stage.animate([{ opacity: 1 }, { opacity: 1 }], {
      duration: Math.round(ASSEMBLY_TOTAL_MS * scale),
    });
    energizeMarker.finished.then(() => { stage.dataset.energized = "true"; }).catch(() => undefined);
    lockMarker.finished.then(enterLockIn).catch(() => undefined);
    completeMarker.finished.then(completeAssembly).catch(() => undefined);
    replayAnimationsRef.current = [...animations, energizeMarker, lockMarker, completeMarker];
    if (motionPausedRef.current) replayAnimationsRef.current.forEach((animation) => animation.pause());
  }, [assemblyRun, cancelCycle, cancelReplay, completeAssembly, enterLockIn, reducedMotion]);

  useEffect(() => {
    const stage = stageRef.current;
    const figure = figureRef.current;
    const canCycle = autoCycle
      && !reducedMotion
      && stageVisible
      && controller.state.phase === "idle"
      && controller.state.previewRegionIds.length === 0
      && controller.state.selectedRegionIds.length === 0;
    if (!stage || !figure || !canCycle) {
      cancelCycle();
      return;
    }

    cancelCycle();
    stage.dataset.cycling = "true";
    const timing = cycleTiming();
    const animations: Animation[] = [];
    for (const asset of ANATOMY_HERO_FRONT_LAYERS) {
      const element = figure.querySelector<HTMLElement>(`[data-motion-layer-id="${asset.id}"]`);
      if (element) animations.push(element.animate(recurringKeyframesForLayer(asset), timing));
      const hitLayer = figure.querySelector<SVGGElement>(`[data-motion-hit-layer="${asset.id}"]`);
      if (hitLayer) {
        const hitFrames = recurringKeyframesForLayer(asset).map(({ transform, offset }) => ({ transform, offset }));
        animations.push(hitLayer.animate(hitFrames, timing));
      }
    }
    cycleAnimationsRef.current = animations;
    if (motionPausedRef.current) animations.forEach((animation) => animation.pause());
    return cancelCycle;
  }, [
    autoCycle,
    cancelCycle,
    controller.state.phase,
    controller.state.previewRegionIds.length,
    controller.state.selectedRegionIds.length,
    reducedMotion,
    stageVisible,
  ]);

  useEffect(() => {
    [...replayAnimationsRef.current, ...cycleAnimationsRef.current].forEach((animation) => {
      if (controller.state.motionPaused) animation.pause();
      else if (animation.playState === "paused") animation.play();
    });
  }, [controller.state.motionPaused]);

  useEffect(() => {
    if (controller.state.phase === "assembling" || controller.state.phase === "lockIn") return;
    cancelReplay();
  }, [cancelReplay, controller.state.phase]);

  const setParallax = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (controller.reducedMotion || event.pointerType === "touch" || controller.state.phase === "assembling") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty("--parallax-x", `${(x * 3).toFixed(2)}px`);
    event.currentTarget.style.setProperty("--parallax-y", `${(y * 3).toFixed(2)}px`);
  }, [controller.reducedMotion, controller.state.phase]);

  const clearParallax = useCallback(() => {
    stageRef.current?.style.setProperty("--parallax-x", "0px");
    stageRef.current?.style.setProperty("--parallax-y", "0px");
  }, []);

  const activeRegions = activeAnatomyRegions(controller.state);
  const status = controller.state.selectedRegionIds.length > 0
    ? `${controller.state.selectedRegionIds.join(", ")} selected. Press Escape to show the full body.`
    : controller.state.phase === "assembling"
      ? "Powered anatomy assembling."
      : controller.state.phase === "lockIn"
        ? "Assembly locked. Recent training energy online."
        : controller.state.assemblyRun > 0
          ? "Assembly complete. Recent training energy online."
        : "Full body visible.";
  const stageStyle: StageStyle = { "--parallax-x": "0px", "--parallax-y": "0px" };

  return (
    <div className={`${styles.hero}${className ? ` ${className}` : ""}`} data-phase={controller.state.phase}>
      <div
        ref={stageRef}
        className={styles.stage}
        style={stageStyle}
        data-phase={controller.state.phase}
        data-has-active={activeRegions.length > 0 || undefined}
        data-has-latest={latestHighlights.length > 0 || undefined}
        data-motion-paused={controller.state.motionPaused || undefined}
        data-reduced-motion={controller.reducedMotion || undefined}
        data-glow={glowEnabled || undefined}
        onPointerMove={setParallax}
        onPointerLeave={clearParallax}
        aria-hidden="true"
      >
        <div className={styles.depthField} />
        <div ref={figureRef} className={styles.figure}>
          {ANATOMY_HERO_FRONT_LAYERS.map((asset) => (
            <AnatomyLayer
              key={asset.id}
              asset={asset}
              viewBox={ANATOMY_HERO_VIEWBOX}
              weeklyHighlights={weeklyHighlights}
              latestHighlights={latestHighlights}
              targetRegionIds={targetRegionIds}
              activeRegionIds={activeRegions}
              previewRegionIds={controller.state.previewRegionIds}
              selectedRegionIds={controller.state.selectedRegionIds}
              phase={controller.state.phase}
              glowEnabled={glowEnabled}
            />
          ))}
          <svg className={styles.hitMap} viewBox={`0 0 ${ANATOMY_HERO_VIEWBOX.width} ${ANATOMY_HERO_VIEWBOX.height}`} preserveAspectRatio="none">
            {ANATOMY_HERO_FRONT_LAYERS
              .filter((asset) => asset.hitPath && asset.regionIds.length > 0)
              .sort((left, right) => left.z - right.z)
              .map((asset) => (
                <g data-motion-hit-layer={asset.id} key={asset.id}>
                  <path
                    data-hit-layer={asset.id}
                    data-preview={regionsIntersect(asset.regionIds, controller.state.previewRegionIds) || undefined}
                    data-selected={regionsIntersect(asset.regionIds, controller.state.selectedRegionIds) || undefined}
                    d={asset.hitPath ?? undefined}
                    style={{ "--hit-focus-x": `${asset.focusOffset.x}px`, "--hit-focus-y": `${asset.focusOffset.y}px` } as CSSProperties}
                    onPointerEnter={() => controller.preview(asset.regionIds)}
                    onPointerLeave={() => controller.preview([])}
                    onClick={() => controller.toggleSelection(asset.regionIds)}
                  />
                </g>
              ))}
          </svg>
        </div>
        <div className={styles.floor} />
      </div>
      <span className={styles.srOnly} role="status" aria-live="polite">{status}</span>
    </div>
  );
}

export function AnatomyHero({
  weeklyHighlights,
  latestHighlights,
  mode = "idle",
  targetRegionIds = [],
  assemblyRun = 0,
  autoCycle = false,
  previewRegionIds,
  selectedRegionIds,
  onPreviewChange,
  onSelectionChange,
  glowEnabled = true,
  forceReducedMotion = false,
  className,
}: AnatomyHeroProps) {
  return (
    <AnatomyInteractionController
      mode={mode}
      assemblyRun={assemblyRun}
      previewRegionIds={previewRegionIds}
      selectedRegionIds={selectedRegionIds}
      forceReducedMotion={forceReducedMotion}
      onPreviewChange={onPreviewChange}
      onSelectionChange={onSelectionChange}
    >
      {(controller) => (
        <AnatomyHeroStage
          controller={controller}
          weeklyHighlights={weeklyHighlights}
          latestHighlights={latestHighlights}
          targetRegionIds={targetRegionIds}
          autoCycle={autoCycle}
          previewRegionIds={previewRegionIds}
          selectedRegionIds={selectedRegionIds}
          onPreviewChange={onPreviewChange}
          onSelectionChange={onSelectionChange}
          glowEnabled={glowEnabled}
          forceReducedMotion={forceReducedMotion}
          className={className}
        />
      )}
    </AnatomyInteractionController>
  );
}
