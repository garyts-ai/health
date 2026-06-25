"use client";

import { useEffect } from "react";

import {
  getPremiumSurfaceTransform,
  RESET_PREMIUM_SURFACE_TRANSFORM,
  type PremiumSurfaceTransform,
} from "@/lib/premium-surface";

type PremiumElement = HTMLElement & {
  __premiumFrame?: number;
};

function premiumSurface(target: EventTarget | null) {
  return target instanceof Element
    ? (target.closest("[data-premium-surface]") as PremiumElement | null)
    : null;
}

function writeTransform(element: PremiumElement, transform: PremiumSurfaceTransform) {
  element.style.setProperty("--premium-rx", `${transform.rotateX.toFixed(3)}deg`);
  element.style.setProperty("--premium-ry", `${transform.rotateY.toFixed(3)}deg`);
  element.style.setProperty("--premium-x", `${transform.pointerX.toFixed(2)}%`);
  element.style.setProperty("--premium-y", `${transform.pointerY.toFixed(2)}%`);
}

function resetSurface(element: PremiumElement) {
  if (element.__premiumFrame) cancelAnimationFrame(element.__premiumFrame);
  element.__premiumFrame = undefined;
  writeTransform(element, RESET_PREMIUM_SURFACE_TRANSFORM);
  element.removeAttribute("data-premium-active");
  element.removeAttribute("data-premium-pressed");
}

export function PremiumSurfaceController() {
  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activeSurface: PremiumElement | null = null;

    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer.matches || reducedMotion.matches) return;
      const surface = premiumSurface(event.target);
      if (!surface) return;
      if (activeSurface && activeSurface !== surface) resetSurface(activeSurface);
      activeSurface = surface;
      const { left, top, width, height } = surface.getBoundingClientRect();
      if (surface.__premiumFrame) cancelAnimationFrame(surface.__premiumFrame);
      surface.__premiumFrame = requestAnimationFrame(() => {
        writeTransform(
          surface,
          getPremiumSurfaceTransform({
            clientX: event.clientX,
            clientY: event.clientY,
            left,
            top,
            width,
            height,
          }),
        );
        surface.setAttribute("data-premium-active", "");
      });
    };
    const onPointerOut = (event: PointerEvent) => {
      const surface = premiumSurface(event.target);
      if (!surface) return;
      const next = event.relatedTarget;
      if (next instanceof Node && surface.contains(next)) return;
      resetSurface(surface);
      if (activeSurface === surface) activeSurface = null;
    };
    const onPointerDown = (event: PointerEvent) => {
      premiumSurface(event.target)?.setAttribute("data-premium-pressed", "");
    };
    const onPointerUp = (event: PointerEvent) => {
      premiumSurface(event.target)?.removeAttribute("data-premium-pressed");
    };
    const onFocusIn = (event: FocusEvent) => {
      premiumSurface(event.target)?.setAttribute("data-premium-focus", "");
    };
    const onFocusOut = (event: FocusEvent) => {
      const surface = premiumSurface(event.target);
      if (!surface) return;
      const next = event.relatedTarget;
      if (next instanceof Node && surface.contains(next)) return;
      surface.removeAttribute("data-premium-focus");
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("pointercancel", onPointerUp, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      activeSurface = null;
      document.querySelectorAll<PremiumElement>("[data-premium-surface]").forEach(resetSurface);
    };
  }, []);

  return null;
}
