import assert from "node:assert/strict";
import test from "node:test";

import {
  chartGeometry,
  chartPointIndexForKey,
  sampleChartValues,
} from "@/components/whoop-trends";

test("WHOOP chart rendering is capped at 120 visual observations", () => {
  const fullSeries = Array.from({ length: 365 }, (_, index) => index);
  const sampled = sampleChartValues(fullSeries);

  assert.equal(sampled.length, 120);
  assert.equal(sampled[0], 0);
  assert.equal(sampled.at(-1), 364);
});

test("WHOOP chart geometry preserves explicit null gaps", () => {
  const geometry = chartGeometry(
    [
      { date: "2026-01-01", value: 60 },
      { date: "2026-01-02", value: 62 },
      { date: "2026-01-03", value: null },
      { date: "2026-01-04", value: 58 },
      { date: "2026-01-05", value: 61 },
    ],
    60,
  );

  assert.equal(geometry.segments.length, 2);
  assert.deepEqual(geometry.segments.map((segment) => segment.length), [2, 2]);
});

test("WHOOP chart keyboard navigation clamps and supports range endpoints", () => {
  assert.equal(chartPointIndexForKey("ArrowLeft", 5, null), 3);
  assert.equal(chartPointIndexForKey("ArrowLeft", 5, 0), 0);
  assert.equal(chartPointIndexForKey("ArrowRight", 5, 4), 4);
  assert.equal(chartPointIndexForKey("Home", 5, 3), 0);
  assert.equal(chartPointIndexForKey("End", 5, 1), 4);
  assert.equal(chartPointIndexForKey("End", 0, null), null);
});
