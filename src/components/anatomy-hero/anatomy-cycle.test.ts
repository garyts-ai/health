import assert from "node:assert/strict";
import test from "node:test";

import { ANATOMY_HERO_FRONT_LAYERS } from "@/lib/anatomy-hero-manifest";
import {
  ANATOMY_CYCLE_DELAY_MS,
  ANATOMY_CYCLE_EXPLODE_AT,
  ANATOMY_CYCLE_RESEAT_AT,
  ANATOMY_CYCLE_TOTAL_MS,
  cycleTiming,
  recurringKeyframesForLayer,
} from "./anatomy-cycle";

test("recurring anatomy cycle has a calm hold around one visible orbit", () => {
  assert.equal(ANATOMY_CYCLE_DELAY_MS, 1400);
  assert.equal(ANATOMY_CYCLE_TOTAL_MS, 10800);
  assert.ok(ANATOMY_CYCLE_EXPLODE_AT >= .2);
  assert.ok(ANATOMY_CYCLE_RESEAT_AT > ANATOMY_CYCLE_EXPLODE_AT + .3);
  assert.equal(cycleTiming().iterations, Infinity);
});

test("every trainable layer explodes, orbits, and returns to its assembled transform", () => {
  for (const asset of ANATOMY_HERO_FRONT_LAYERS.filter((item) => item.assembly)) {
    const frames = recurringKeyframesForLayer(asset);
    const offsets = frames.map((frame) => Number(frame.offset));
    assert.deepEqual(offsets, [...offsets].sort((left, right) => left - right), asset.id);
    assert.match(String(frames[2].transform), /translate3d/);
    assert.notEqual(frames[2].transform, frames[0].transform, asset.id);
    assert.equal(frames.at(-1)?.transform, "translate3d(0.00px, 0.00px, 0) rotate(0.00deg) scale(1.000)");
  }
});
