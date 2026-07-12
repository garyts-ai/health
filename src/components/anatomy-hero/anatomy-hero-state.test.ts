import assert from "node:assert/strict";
import test from "node:test";

import {
  INITIAL_ANATOMY_INTERACTION_STATE,
  activeAnatomyRegions,
  anatomyInteractionReducer,
  intensityForRegions,
} from "./anatomy-hero-state";
import type { AnatomyInteractionState } from "./types";

test("assembly enters lock-in and completes without inventing active regions", () => {
  const assembling = anatomyInteractionReducer(INITIAL_ANATOMY_INTERACTION_STATE, { type: "startAssembly" });
  assert.equal(assembling.phase, "assembling");
  assert.deepEqual(activeAnatomyRegions(assembling), []);
  const locked = anatomyInteractionReducer(assembling, { type: "enterLockIn" });
  assert.equal(locked.phase, "lockIn");
  assert.equal(anatomyInteractionReducer(locked, { type: "completeAssembly" }).phase, "idle");
});

test("focus cancels an active assembly before applying preview", () => {
  const assembling = anatomyInteractionReducer(INITIAL_ANATOMY_INTERACTION_STATE, { type: "startAssembly" });
  const cancelled = anatomyInteractionReducer(assembling, { type: "cancelAssembly" });
  const preview = anatomyInteractionReducer(cancelled, { type: "preview", regionIds: ["chest"] });
  assert.equal(preview.phase, "preview");
  assert.deepEqual(preview.previewRegionIds, ["chest"]);
});

test("preview, multi-region pin, second click, and reset share one state model", () => {
  const preview = anatomyInteractionReducer(INITIAL_ANATOMY_INTERACTION_STATE, { type: "preview", regionIds: ["frontDelts", "sideDelts"] });
  assert.equal(preview.phase, "preview");
  assert.deepEqual(activeAnatomyRegions(preview), ["frontDelts", "sideDelts"]);
  const pinned = anatomyInteractionReducer(preview, { type: "toggleSelection", regionIds: ["frontDelts", "sideDelts"] });
  assert.equal(pinned.phase, "pinned");
  assert.deepEqual(pinned.selectedRegionIds, ["frontDelts", "sideDelts"]);
  const cleared = anatomyInteractionReducer(pinned, { type: "toggleSelection", regionIds: ["frontDelts", "sideDelts"] });
  assert.deepEqual(cleared.selectedRegionIds, []);
  assert.equal(cleared.phase, "idle");
});

test("region intensity preserves the strongest real highlight", () => {
  assert.equal(intensityForRegions([
    { regionId: "frontDelts", intensity: "medium", view: "front" },
    { regionId: "sideDelts", intensity: "high", view: "front" },
  ], ["frontDelts", "sideDelts"]), "high");
  assert.equal(intensityForRegions([], ["chest"]), null);
});

test("hidden-document state pauses without clearing pinned regions", () => {
  const pinned = anatomyInteractionReducer(INITIAL_ANATOMY_INTERACTION_STATE, { type: "setSelection", regionIds: ["chest"] });
  const paused = anatomyInteractionReducer(pinned, { type: "setMotionPaused", paused: true });
  assert.equal(paused.motionPaused, true);
  assert.deepEqual(paused.selectedRegionIds, ["chest"]);
  assert.equal(anatomyInteractionReducer(paused, { type: "setMotionPaused", paused: false }).motionPaused, false);
});

test("explicit full-body reset clears preview and pinned state", () => {
  const state: AnatomyInteractionState = {
    ...INITIAL_ANATOMY_INTERACTION_STATE,
    phase: "pinned",
    previewRegionIds: ["biceps"],
    selectedRegionIds: ["chest"],
  };
  const cleared = anatomyInteractionReducer(state, { type: "clearSelection" });
  assert.deepEqual(cleared.previewRegionIds, []);
  assert.deepEqual(cleared.selectedRegionIds, []);
  assert.equal(cleared.phase, "idle");
});
