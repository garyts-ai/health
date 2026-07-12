import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { renderAnatomyFigureImageLayers } from "@/components/anatomy-figure-export";
import { ANATOMY_REGION_IDS, anatomyRegionView } from "@/lib/anatomy-regions";
import {
  ANATOMY_HERO_FRONT_LAYERS,
  ANATOMY_HERO_FRONT_REGION_IDS,
  ANATOMY_HERO_VIEWBOX,
} from "@/lib/anatomy-hero-manifest";
import type { BodyHighlight } from "@/lib/insights/types";

test("front asset manifest is unique, bounded, and production-backed", () => {
  assert.equal(ANATOMY_HERO_FRONT_LAYERS.length, 20);
  assert.equal(new Set(ANATOMY_HERO_FRONT_LAYERS.map((asset) => asset.id)).size, 20);
  for (const asset of ANATOMY_HERO_FRONT_LAYERS) {
    assert.ok(asset.bounds.x >= 0 && asset.bounds.y >= 0, asset.id);
    assert.ok(asset.bounds.x + asset.bounds.width <= ANATOMY_HERO_VIEWBOX.width, asset.id);
    assert.ok(asset.bounds.y + asset.bounds.height <= ANATOMY_HERO_VIEWBOX.height, asset.id);
    assert.ok(Math.abs(asset.focusOffset.x) <= 12 && Math.abs(asset.focusOffset.y) <= 12, asset.id);
    assert.ok(Math.hypot(asset.explodedTransform.x, asset.explodedTransform.y) <= 32, asset.id);
    assert.ok(Math.abs(asset.explodedTransform.rotate) <= 3, asset.id);
    assert.ok(asset.explodedTransform.scale >= .94 && asset.explodedTransform.scale <= 1, asset.id);
    if (asset.regionIds.length > 0) {
      assert.ok(asset.hitPath?.startsWith("M"), asset.id);
      assert.ok(asset.assembly, asset.id);
      assert.ok(asset.assembly.delayMs >= 180 && asset.assembly.delayMs <= 1150, asset.id);
      assert.ok(asset.assembly.durationMs >= 470 && asset.assembly.durationMs <= 800, asset.id);
    }
    assert.ok(asset.calloutAnchor.x >= 0 && asset.calloutAnchor.x <= ANATOMY_HERO_VIEWBOX.width, asset.id);
    assert.ok(asset.calloutAnchor.y >= 0 && asset.calloutAnchor.y <= ANATOMY_HERO_VIEWBOX.height, asset.id);
    assert.ok(existsSync(join(process.cwd(), "public", asset.src)), asset.src);
  }
});

test("front pack covers required canonical regions and bilateral upper layers", () => {
  const required = [
    "chest", "frontDelts", "sideDelts", "biceps", "triceps", "forearms",
    "lats", "abs", "obliques", "quads", "adductors", "calves",
  ] as const;
  for (const regionId of required) assert.ok(ANATOMY_HERO_FRONT_REGION_IDS.includes(regionId), regionId);
  for (const regionId of ["chest", "frontDelts", "sideDelts", "biceps", "triceps", "forearms", "lats"] as const) {
    assert.equal(ANATOMY_HERO_FRONT_LAYERS.filter((asset) => asset.regionIds.includes(regionId)).length, 2, regionId);
  }
});

test("static export uses the same illustrated assets and real layer states", async () => {
  const weekly: BodyHighlight[] = [
    { regionId: "chest", intensity: "high", view: "front" },
    { regionId: "biceps", intensity: "medium", view: "front" },
  ];
  const latest: BodyHighlight[] = [{ regionId: "chest", intensity: "high", view: "front" }];
  const [layer] = await renderAnatomyFigureImageLayers({ weeklyHighlights: weekly, latestHighlights: latest });
  assert.match(layer.svg, /anatomy-hero-v2\/front\/chest-left-v3\.webp/);
  assert.match(layer.svg, /data-anatomy-regions="chest" data-intensity="high" data-latest="true"/);
  assert.doesNotMatch(layer.svg, /anatomy-biomech|powered-suit|precision-plate/);
  assert.deepEqual(await renderAnatomyFigureImageLayers({ view: "back" }), []);
});

test("all 17 canonical regions retain corrected view metadata", () => {
  const expectedBack = new Set(["rearDelts", "triceps", "lats", "upperBack", "traps", "glutes", "hamstrings", "calves"]);
  assert.equal(ANATOMY_REGION_IDS.length, 17);
  for (const regionId of ANATOMY_REGION_IDS) {
    assert.equal(anatomyRegionView(regionId), expectedBack.has(regionId) ? "back" : "front", regionId);
  }
});

test("rejected procedural and raster assets are absent", () => {
  for (const relativePath of [
    "src/components/powered-suit-assets.tsx",
    "src/components/powered-suit.module.css",
    "src/lib/powered-suit-manifest.ts",
    "public/images/anatomy-biomech-front.png",
    "public/images/anatomy-biomech-back.png",
  ]) {
    assert.equal(existsSync(join(process.cwd(), relativePath)), false, relativePath);
  }
  const globalCss = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  assert.doesNotMatch(globalCss, /cinematic-anatomy|biomech-anatomy|instrument-muscle-map|anatomy-region-plate/);
  assert.equal(
    readFileSync(join(process.cwd(), "src/assets/anatomy-hero-v2/source/front-overlap-report.txt"), "utf8").trim(),
    "interactive_overlap_pixels=0",
  );
});
