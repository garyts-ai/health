import assert from "node:assert/strict";
import test from "node:test";

import { ANATOMY_HERO_FRONT_LAYERS } from "@/lib/anatomy-hero-manifest";
import {
  ASSEMBLY_LOCK_AT_MS,
  ASSEMBLY_MOBILE_TOTAL_MS,
  ASSEMBLY_TOTAL_MS,
  keyframesForLayer,
  timingForLayer,
} from "./anatomy-assembly";

test("assembly timeline stays cinematic, bounded, and shorter on mobile", () => {
  assert.equal(ASSEMBLY_LOCK_AT_MS, 2250);
  assert.equal(ASSEMBLY_TOTAL_MS, 2450);
  assert.equal(ASSEMBLY_MOBILE_TOTAL_MS, 2200);
  assert.ok(ASSEMBLY_TOTAL_MS >= 2000 && ASSEMBLY_TOTAL_MS <= 3000);
  for (const asset of ANATOMY_HERO_FRONT_LAYERS.filter((item) => item.assembly)) {
    const desktop = timingForLayer(asset, 1440);
    const mobile = timingForLayer(asset, 390);
    assert.ok(desktop && mobile, asset.id);
    assert.ok(desktop.delay + desktop.duration <= ASSEMBLY_LOCK_AT_MS, asset.id);
    assert.ok(mobile.delay < desktop.delay && mobile.duration < desktop.duration, asset.id);
  }
});

test("each region animates from its manifest explosion into an assembled transform", () => {
  for (const asset of ANATOMY_HERO_FRONT_LAYERS.filter((item) => item.assembly)) {
    const frames = keyframesForLayer(asset);
    assert.match(String(frames[0].transform), /translate3d/);
    assert.equal(frames.at(-1)?.transform, "translate3d(0, 0, 0) rotate(0deg) scale(1)");
    assert.equal(frames.at(-1)?.opacity, 1);
  }
});
