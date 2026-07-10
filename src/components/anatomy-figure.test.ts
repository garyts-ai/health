import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AnatomyFigure, renderAnatomyFigureImageLayers } from "@/components/anatomy-figure";
import { ANATOMY_REGION_IDS, anatomyRegionView } from "@/lib/anatomy-regions";
import type { BodyHighlight } from "@/lib/insights/types";

function highlight(regionId: (typeof ANATOMY_REGION_IDS)[number], index: number): BodyHighlight {
  const intensity = (["low", "medium", "high"] as const)[index % 3];

  return {
    regionId,
    intensity,
    view: anatomyRegionView(regionId),
  };
}

test("static anatomy export includes every canonical region in weekly and latest layers", async () => {
  const highlights = ANATOMY_REGION_IDS.map(highlight);
  const layers = await renderAnatomyFigureImageLayers({
    weeklyHighlights: highlights,
    latestHighlights: highlights,
  });

  assert.equal(layers.length, 1);

  const [layer] = layers;
  assert.ok(layer.svg.includes("/images/anatomy-biomech-front.png"));
  assert.ok(layer.svg.includes("/images/anatomy-biomech-back.png"));

  for (const regionId of ANATOMY_REGION_IDS) {
    assert.ok(
      layer.svg.includes(
        `data-anatomy-region="${regionId}" data-anatomy-layer="weekly-core"`,
      ),
      `missing weekly export plate for ${regionId}`,
    );
    assert.ok(
      layer.svg.includes(
        `data-anatomy-region="${regionId}" data-anatomy-layer="latest-core"`,
      ),
      `missing latest export plate for ${regionId}`,
    );
  }
});

test("static anatomy export preserves weekly tier and cyan latest semantics", async () => {
  const [layer] = await renderAnatomyFigureImageLayers({
    weeklyHighlights: [
      { regionId: "biceps", intensity: "low", view: "front" },
      { regionId: "hamstrings", intensity: "medium", view: "back" },
      { regionId: "chest", intensity: "high", view: "front" },
    ],
    latestHighlights: [{ regionId: "chest", intensity: "high", view: "front" }],
  });

  assert.ok(layer.svg.includes("url(#precisionExport-low)"));
  assert.ok(layer.svg.includes("url(#precisionExport-medium)"));
  assert.ok(layer.svg.includes("url(#precisionExport-high)"));
  assert.ok(layer.svg.includes('stroke="#39f8ff"'));
});

test("all 17 canonical anatomy regions have corrected view metadata", () => {
  const expectedViews = {
    chest: "front",
    frontDelts: "front",
    sideDelts: "front",
    rearDelts: "back",
    lats: "back",
    upperBack: "back",
    traps: "back",
    biceps: "front",
    triceps: "back",
    forearms: "front",
    abs: "front",
    obliques: "front",
    glutes: "back",
    quads: "front",
    adductors: "front",
    hamstrings: "back",
    calves: "back",
  } as const;

  assert.equal(ANATOMY_REGION_IDS.length, 17);
  assert.equal(new Set(ANATOMY_REGION_IDS).size, 17);
  for (const regionId of ANATOMY_REGION_IDS) {
    assert.equal(anatomyRegionView(regionId), expectedViews[regionId], regionId);
  }
});

test("anatomy figure exposes explicit front back and both view modes", async () => {
  for (const view of ["front", "back", "both"] as const) {
    const figure = await AnatomyFigure({ view });
    assert.match(String(figure.props.className), new RegExp(`precision-anatomy-view-${view}`));
  }

  const frontMarkup = renderToStaticMarkup(AnatomyFigure({ view: "front" }));
  const backMarkup = renderToStaticMarkup(AnatomyFigure({ view: "back" }));
  assert.match(frontMarkup, /anatomy-biomech-front/);
  assert.doesNotMatch(frontMarkup, /anatomy-biomech-back/);
  assert.match(backMarkup, /anatomy-biomech-back/);
  assert.doesNotMatch(backMarkup, /anatomy-biomech-front/);
});
