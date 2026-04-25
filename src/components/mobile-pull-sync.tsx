"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SyncState = "idle" | "pulling" | "syncing" | "success" | "failed";

const PULL_THRESHOLD = 92;
const MAX_PULL = 132;

async function syncSource(path: string) {
  const response = await fetch(path, {
    method: "POST",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Sync failed for ${path}`);
  }
}

export function MobilePullSync() {
  const router = useRouter();
  const startYRef = useRef<number | null>(null);
  const pullRef = useRef(0);
  const [pull, setPull] = useState(0);
  const [state, setState] = useState<SyncState>("idle");

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

    const runSync = async () => {
      setState("syncing");

      try {
        await Promise.all([syncSource("/api/whoop/sync"), syncSource("/api/hevy/sync")]);
        setState("success");
        router.refresh();
        window.setTimeout(() => setState("idle"), 1800);
      } catch {
        setState("failed");
        window.setTimeout(() => setState("idle"), 2400);
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (state === "syncing" || window.scrollY > 0 || event.touches.length !== 1) {
        return;
      }

      startYRef.current = event.touches[0].clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (startYRef.current === null || state === "syncing") {
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
      const shouldSync = pullRef.current >= PULL_THRESHOLD;
      reset();

      if (shouldSync && state !== "syncing") {
        void runSync();
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

  const progress = state === "syncing" || state === "success" ? 1 : Math.min(1, pull / PULL_THRESHOLD);
  const label =
    state === "syncing"
      ? "Syncing WHOOP + Hevy"
      : state === "success"
        ? "Sources updated"
        : state === "failed"
          ? "Sync failed"
          : progress >= 1
            ? "Release to sync sources"
            : "Pull to sync sources";

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-0 right-0 top-3 z-50 flex justify-center px-4 md:hidden"
      style={{
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
