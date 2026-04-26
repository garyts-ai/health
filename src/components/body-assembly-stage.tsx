"use client";

import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

type AssemblyStyle = CSSProperties & Record<`--${string}`, string | number>;

type BodyAssemblyStageProps = {
  children: ReactNode;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeOutQuint(value: number) {
  return 1 - (1 - clamp(value)) ** 5;
}

function phase(progress: number, start: number, end: number) {
  return easeOutQuint((progress - start) / (end - start));
}

function layerTransformVars(name: string, value: number, x: number, y: number, scalePeak: number) {
  const eased = easeOutQuint(value);
  const inverse = 1 - eased;

  return {
    [`--${name}-opacity`]: eased.toFixed(3),
    [`--${name}-x`]: `${(inverse * x).toFixed(2)}%`,
    [`--${name}-y`]: `${(inverse * y).toFixed(2)}%`,
    [`--${name}-scale`]: (1 + inverse * scalePeak).toFixed(4),
    [`--${name}-blur`]: `${(inverse * 5.5).toFixed(2)}px`,
  };
}

function syncRegionPlateProgress(stage: HTMLElement, progress: number) {
  const plates = stage.querySelectorAll<HTMLElement>(".anatomy-region-plate");

  plates.forEach((plate) => {
    const index = Number(plate.style.getPropertyValue("--region-index")) || 0;
    const x = Number.parseFloat(plate.style.getPropertyValue("--region-x")) || 0;
    const y = Number.parseFloat(plate.style.getPropertyValue("--region-y")) || 0;
    const scale = Number.parseFloat(plate.style.getPropertyValue("--region-scale")) || 1;
    const start = Math.min(0.1 + index * 0.034, 0.46);
    const enter = easeOutQuint((progress - start) / 0.24);
    const inverse = 1 - enter;

    plate.style.setProperty("--region-progress", enter.toFixed(3));
    plate.style.setProperty("--region-current-x", `${(x * inverse).toFixed(2)}%`);
    plate.style.setProperty("--region-current-y", `${(y * inverse).toFixed(2)}%`);
    plate.style.setProperty("--region-current-scale", (1 + (scale - 1) * inverse).toFixed(4));
  });
}

export function BodyAssemblyStage({ children }: BodyAssemblyStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => setPrefersReducedMotion(media.matches);
    updateReducedMotion();
    media.addEventListener("change", updateReducedMotion);

    return () => media.removeEventListener("change", updateReducedMotion);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return undefined;
    }

    const stage = stageRef.current;
    if (!stage) {
      return undefined;
    }

    let frame = 0;
    const updateProgress = () => {
      frame = 0;

      if (window.innerWidth < 1024) {
        setProgress(1);
        return;
      }

      const rect = stage.getBoundingClientRect();
      const viewport = window.innerHeight;
      const startLine = viewport * 0.18;
      const travel = Math.max(1, stage.offsetHeight - viewport);
      const nextProgress = clamp((startLine - rect.top) / travel);
      syncRegionPlateProgress(stage, nextProgress);
      setProgress(nextProgress);
    };

    const requestUpdate = () => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      return undefined;
    }

    if (window.innerWidth < 1024) {
      const frame = window.requestAnimationFrame(() => {
        if (stageRef.current) {
          syncRegionPlateProgress(stageRef.current, 1);
        }
        setIsReplaying(true);
        replayTimerRef.current = setTimeout(() => setIsReplaying(false), 2300);
      });

      return () => {
        window.cancelAnimationFrame(frame);
        if (replayTimerRef.current) {
          clearTimeout(replayTimerRef.current);
        }
      };
    }

    return () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
      }
    };
  }, [prefersReducedMotion]);

  const style = useMemo<AssemblyStyle>(() => {
    const effectiveProgress = prefersReducedMotion ? 1 : progress;
    const base = phase(effectiveProgress, 0, 0.1);
    const low = phase(effectiveProgress, 0.08, 0.24);
    const mid = phase(effectiveProgress, 0.2, 0.36);
    const high = phase(effectiveProgress, 0.32, 0.49);
    const latest = phase(effectiveProgress, 0.48, 0.64);
    const rail = phase(effectiveProgress, 0.58, 0.72);

    return {
      "--assembly-progress": effectiveProgress.toFixed(3),
      "--assembly-base": base.toFixed(3),
      "--assembly-latest": latest.toFixed(3),
      "--assembly-rail": rail.toFixed(3),
      "--base-y": `${((1 - base) * 12).toFixed(2)}px`,
      "--base-scale": (0.97 + base * 0.03).toFixed(4),
      "--base-blur": `${((1 - base) * 8).toFixed(2)}px`,
      "--base-brightness": (1 + (1 - base) * 0.28).toFixed(3),
      "--dock-left-x": `${((1 - base) * -14).toFixed(2)}px`,
      "--dock-right-x": `${((1 - base) * 14).toFixed(2)}px`,
      "--scanline-y": `${(20 + effectiveProgress * 54).toFixed(2)}%`,
      "--svg-base-opacity": "1",
      "--latest-scale": (1 + (1 - latest) * 0.035).toFixed(4),
      "--latest-clip-right": `${((1 - latest) * 100).toFixed(2)}%`,
      "--latest-glow-tight": `${(4 + latest * 7).toFixed(2)}px`,
      "--latest-glow-wide": `${(10 + latest * 18).toFixed(2)}px`,
      "--rail-opacity": (0.26 + rail * 0.74).toFixed(3),
      "--rail-x": `${((1 - rail) * 12).toFixed(2)}px`,
      ...layerTransformVars("weekly-low", low, -10, 7, 0.08),
      ...layerTransformVars("weekly-mid", mid, 10, 8, 0.09),
      ...layerTransformVars("weekly-high", high, -7, -7, 0.08),
    };
  }, [prefersReducedMotion, progress]);

  const replayAssembly = () => {
    if (prefersReducedMotion) {
      return;
    }

    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
    }

    setIsReplaying(false);
    window.requestAnimationFrame(() => {
      if (stageRef.current) {
        syncRegionPlateProgress(stageRef.current, 1);
      }
      setIsReplaying(true);
      replayTimerRef.current = setTimeout(() => setIsReplaying(false), 2300);
    });
  };

  return (
    <div
      ref={stageRef}
      className={`body-assembly-stage ${
        isReplaying && !prefersReducedMotion ? "is-replaying" : "is-scroll-scrubbed"
      }`}
      data-assembly-progress={progress.toFixed(2)}
      style={style}
    >
      <div className="body-assembly-sticky">
        <button
          type="button"
          className="body-assembly-replay"
          onClick={replayAssembly}
          disabled={prefersReducedMotion}
          aria-label="Replay body assembly animation"
        >
          Replay assembly
        </button>
        {children}
      </div>
    </div>
  );
}
