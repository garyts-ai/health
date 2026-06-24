import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_WHOOP_CHART_RANGE,
  filterWhoopChartValues,
  parseWhoopChartRange,
  summarizeWhoopChartRange,
} from "@/lib/whoop-export/chart-ranges";
import type { WhoopAnalysisReport } from "@/lib/whoop-export/analysis";

const values = Array.from({ length: 400 }, (_, index) => ({
  date: new Date(Date.UTC(2025, 0, 1 + index)).toISOString(),
  value: index % 11 === 0 ? null : index,
}));

function makeSeries(): WhoopAnalysisReport["series"][number] {
  return {
    key: "recovery_score",
    label: "Recovery",
    unit: "%",
    baseline: 50,
    direction: "flat",
    tone: "green",
    values,
  };
}

test("chart ranges use inclusive rolling calendar boundaries from the newest record", () => {
  assert.equal(filterWhoopChartValues(values, "week").length, 7);
  assert.equal(filterWhoopChartValues(values, "30d").length, 30);
  assert.equal(filterWhoopChartValues(values, "3m").length, 90);
  assert.equal(filterWhoopChartValues(values, "1y").length, 365);
  assert.equal(filterWhoopChartValues(values, "all").length, 400);
});

test("chart ranges are anchored to the newest record even when the export is stale", () => {
  const stale = [
    { date: "2020-01-01T00:00:00.000Z", value: 1 },
    { date: "2020-01-07T00:00:00.000Z", value: 2 },
    { date: "2020-01-08T00:00:00.000Z", value: 3 },
  ];
  assert.deepEqual(filterWhoopChartValues(stale, "week"), stale.slice(1));
});

test("range summary ignores null observations and compares its average to full baseline", () => {
  const summary = summarizeWhoopChartRange(makeSeries(), "30d");
  assert.ok(summary.observationCount < 30);
  assert.equal(summary.latest, 399);
  assert.equal(summary.direction, "up");
});

test("short datasets and one-year overlap return all available observations", () => {
  const short = values.slice(0, 5);
  assert.equal(filterWhoopChartValues(short, "week").length, 5);
  assert.equal(filterWhoopChartValues(short, "1y").length, 5);
  assert.equal(filterWhoopChartValues(short, "all").length, 5);
});

test("invalid stored chart range falls back to 30 days", () => {
  assert.equal(parseWhoopChartRange("3m"), "3m");
  assert.equal(parseWhoopChartRange("nonsense"), DEFAULT_WHOOP_CHART_RANGE);
  assert.equal(parseWhoopChartRange(null), DEFAULT_WHOOP_CHART_RANGE);
});
