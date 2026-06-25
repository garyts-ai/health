import assert from "node:assert/strict";
import test from "node:test";

import {
  getPremiumSurfaceTransform,
  RESET_PREMIUM_SURFACE_TRANSFORM,
} from "@/lib/premium-surface";

test("premium surface center produces no tilt", () => {
  assert.deepEqual(
    getPremiumSurfaceTransform({
      clientX: 50,
      clientY: 50,
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    }),
    { rotateX: 0, rotateY: 0, pointerX: 50, pointerY: 50 },
  );
});

test("premium surface corners clamp to restrained tilt", () => {
  assert.deepEqual(
    getPremiumSurfaceTransform({
      clientX: 100,
      clientY: 0,
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    }),
    { rotateX: 1.5, rotateY: 1.5, pointerX: 100, pointerY: 0 },
  );
  assert.deepEqual(
    getPremiumSurfaceTransform({
      clientX: -50,
      clientY: 200,
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    }),
    { rotateX: -1.5, rotateY: -1.5, pointerX: 0, pointerY: 100 },
  );
});

test("premium surface handles invalid geometry and exposes a stable reset", () => {
  assert.deepEqual(
    getPremiumSurfaceTransform({
      clientX: 20,
      clientY: 20,
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    }),
    RESET_PREMIUM_SURFACE_TRANSFORM,
  );
});
