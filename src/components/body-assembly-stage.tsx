"use client";

import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

type AssemblyStyle = CSSProperties & Record<`--${string}`, string | number>;

type BodyAssemblyStageProps = {
  children: ReactNode;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smooth(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function phase(progress: number, start: number, end: number) {
  return smooth((progress - start) / (end - start));
}

function layerTransformVars(name: string, value: number, x: number, y: number, scalePeak: number) {
  const eased = smooth(value);
  const inverse = 1 - eased;

  return {
    [`--${name}-opacity`]: eased.toFixed(3),
    [`--${name}-x`]: `${(inverse * x).toFixed(2)}%`,
    [`--${name}-y`]: `${(inverse * y).toFixed(2)}%`,
    [`--${name}-scale`]: (1 + inverse * scalePeak).toFixed(4),
    [`--${name}-blur`]: `${(inverse * 10).toFixed(2)}px`,
  };
}

export function BodyAssemblyStage({ children }: BodyAssemblyStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState(0);
  const [isReplaying, setIsReplaying] = useState(true);
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
      const startLine = window.innerHeight * 0.72;
      const travel = Math.max(1, rect.height - window.innerHeight * 0.5);
      setProgress(clamp((startLine - rect.top) / travel));
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

    replayTimerRef.current = setTimeout(() => setIsReplaying(false), 2900);
    return () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
      }
    };
  }, [prefersReducedMotion]);

  const style = useMemo<AssemblyStyle>(() => {
    const effectiveProgress = prefersReducedMotion ? 1 : progress;
    const base = phase(effectiveProgress, 0, 0.14);
    const low = phase(effectiveProgress, 0.12, 0.34);
    const mid = phase(effectiveProgress, 0.28, 0.52);
    const high = phase(effectiveProgress, 0.46, 0.68);
    const latest = phase(effectiveProgress, 0.64, 0.88);
    const rail = phase(effectiveProgress, 0.78, 1);

    return {
      "--assembly-progress": effectiveProgress.toFixed(3),
      "--assembly-base": base.toFixed(3),
      "--assembly-latest": latest.toFixed(3),
      "--assembly-rail": rail.toFixed(3),
      "--base-y": `${((1 - base) * 18).toFixed(2)}px`,
      "--base-scale": (0.94 + base * 0.06).toFixed(4),
      "--base-blur": `${((1 - base) * 14).toFixed(2)}px`,
      "--base-brightness": (1 + (1 - base) * 0.5).toFixed(3),
      "--latest-scale": (1 + (1 - latest) * 0.08).toFixed(4),
      "--latest-clip-right": `${((1 - latest) * 100).toFixed(2)}%`,
      "--latest-glow-tight": `${(3 + latest * 5).toFixed(2)}px`,
      "--latest-glow-wide": `${(8 + latest * 16).toFixed(2)}px`,
      "--rail-opacity": (0.26 + rail * 0.74).toFixed(3),
      "--rail-x": `${((1 - rail) * 18).toFixed(2)}px`,
      ...layerTransformVars("weekly-low", low, -8, 5, 0.08),
      ...layerTransformVars("weekly-mid", mid, 8, 6, 0.1),
      ...layerTransformVars("weekly-high", high, -5, -4, 0.07),
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
      setIsReplaying(true);
      replayTimerRef.current = setTimeout(() => setIsReplaying(false), 2900);
    });
  };

  return (
    <div
      ref={stageRef}
      className={`body-assembly-stage ${
        isReplaying && !prefersReducedMotion ? "is-replaying" : "is-scroll-scrubbed"
      }`}
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
