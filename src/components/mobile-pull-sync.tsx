"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RefreshState = "idle" | "pulling" | "refreshing" | "success";

const PULL_THRESHOLD = 92;
const MAX_PULL = 132;
export function MobilePullSync() {
  const router = useRouter();
  const startYRef = useRef<number | null>(null);
  const pullRef = useRef(0);
  const [pull, setPull] = useState(0);
  const [state, setState] = useState<RefreshState>("idle");

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    const reset = () => {
      startYRef.current = null;
      pullRef.current = 0;
      setPull(0);
      setState((current) => (current === "pulling" ? "idle" : current));
    };

    const onTouchStart = (event: TouchEvent) => {
      if (state === "refreshing" || window.scrollY > 0 || event.touches.length !== 1) {
        return;
      }

      startYRef.current = event.touches[0].clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (startYRef.current === null || state === "refreshing") {
        return;
      }

      const distance = event.touches[0].clientY - startYRef.current;
      if (distance <= 0) {
        reset();
        return;
      }

      const nextPull = Math.min(MAX_PULL, distance * 0.58);
      pullRef.current = nextPull;
      setPull(nextPull);
      setState("pulling");
    };

    const onTouchEnd = () => {
      const shouldRefresh = pullRef.current >= PULL_THRESHOLD;
      reset();

      if (shouldRefresh && state !== "refreshing") {
        setState("refreshing");
        router.refresh();
        window.setTimeout(() => setState("success"), 250);
        window.setTimeout(() => setState("idle"), 1_800);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", reset);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", reset);
    };
  }, [router, state]);

  if (state === "idle" && pull === 0) {
    return null;
  }

  const progress = state === "refreshing" || state === "success" ? 1 : Math.min(1, pull / PULL_THRESHOLD);
  const label =
    state === "refreshing"
      ? "Refreshing dashboard"
      : state === "success"
        ? "Dashboard refreshed"
        : progress >= 1
          ? "Release to refresh dashboard"
          : "Pull to refresh dashboard";

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-0 right-0 z-50 flex justify-center px-4 md:hidden"
      style={{
        top: "calc(var(--district-header-height) + 0.75rem)",
        opacity: state === "pulling" ? 0.64 + progress * 0.36 : 1,
        transform: `translateY(${state === "pulling" ? Math.min(42, pull * 0.28) : 0}px)`,
      }}
    >
      <div className="flex min-w-[218px] items-center gap-3 rounded-[10px] border border-white/12 bg-[#211b3f]/95 px-3.5 py-2.5 text-white shadow-[0_8px_24px_rgba(24,20,46,0.22)]">
        <span className="relative h-5 w-5 shrink-0 rounded-full border border-white/18">
          <span
            className="absolute inset-1 rounded-full bg-[#ff8f75]"
            style={{ transform: `scale(${Math.max(0.24, progress)})` }}
          />
        </span>
        <span className="text-[12px] font-medium">{label}</span>
      </div>
    </div>
  );
}
