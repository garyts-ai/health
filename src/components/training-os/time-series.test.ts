import assert from "node:assert/strict";
import test from "node:test";

import { buildTimeSeriesGeometry, downsampleTimeSeries, filterTimeSeriesRange, visiblePointDates, type TimeSeriesPoint } from "./time-series";

const day = (index: number) => `2026-01-${String(index + 1).padStart(2, "0")}`;

test("time-series geometry uses elapsed dates instead of array spacing", () => {
  const geometry = buildTimeSeriesGeometry([
    { date: "2026-01-01", value: 1 },
    { date: "2026-01-02", value: 2 },
    { date: "2026-01-11", value: 3 },
  ]);
  assert.ok(geometry.coordinates[1].x < 20);
  assert.equal(geometry.coordinates[2].x, 100);
});

test("time-series geometry preserves null gaps", () => {
  const geometry = buildTimeSeriesGeometry([
    { date: "2026-01-01", value: 1 },
    { date: "2026-01-02", value: null },
    { date: "2026-01-03", value: 3 },
  ]);
  assert.equal(geometry.segments.length, 2);
  assert.deepEqual(geometry.segments.map((segment) => segment.length), [1, 1]);
});

test("visual downsampling caps at 120 and preserves extrema and deviations", () => {
  const points: TimeSeriesPoint[] = Array.from({ length: 300 }, (_, index) => ({ date: new Date(Date.UTC(2025, 0, index + 1)).toISOString().slice(0, 10), value: index === 71 ? -50 : index === 211 ? 500 : index }));
  points[173].personalRange = { center: 170, lower: 160, upper: 180, sampleCount: 28, robustZScore: 3.2, status: "above" };
  const sampled = downsampleTimeSeries(points);
  assert.equal(sampled.length, 120);
  assert.ok(sampled.some((point) => point.value === -50));
  assert.ok(sampled.some((point) => point.value === 500));
  assert.ok(sampled.some((point) => point.personalRange?.status === "above"));
  assert.equal(sampled[0].date, points[0].date);
  assert.equal(sampled.at(-1)?.date, points.at(-1)?.date);
});

test("forced-point overflow retains the latest observation and newest breaches", () => {
  const points: TimeSeriesPoint[] = Array.from({ length: 180 }, (_, index) => ({
    date: new Date(Date.UTC(2025, 0, index + 1)).toISOString().slice(0, 10),
    value: index,
    personalRange: { center: 0, lower: -1, upper: 1, sampleCount: 28, robustZScore: 3, status: "above" },
  }));
  const sampled = downsampleTimeSeries(points);
  assert.equal(sampled.length, 120);
  assert.equal(sampled.at(-1)?.date, points.at(-1)?.date);
  assert.ok(sampled.some((point) => point.date === points.at(-2)?.date));
});

test("week markers include all values while longer ranges retain exceptional points", () => {
  const points: TimeSeriesPoint[] = Array.from({ length: 7 }, (_, index) => ({ date: day(index), value: index }));
  points[2].personalRange = { center: 4, lower: 2, upper: 6, sampleCount: 20, robustZScore: -3, status: "below" };
  const geometry = buildTimeSeriesGeometry(points);
  assert.equal(visiblePointDates(geometry.coordinates, "week").size, 7);
  assert.deepEqual([...visiblePointDates(geometry.coordinates, "30d")].sort(), [day(2), day(6)]);
});

test("personal ranges influence the padded y-domain and expose corridor geometry", () => {
  const geometry = buildTimeSeriesGeometry([
    { date: "2026-01-01", value: 10, personalRange: { center: 10, lower: 5, upper: 15, sampleCount: 14, robustZScore: 0, status: "within" } },
    { date: "2026-01-02", value: 22, personalRange: { center: 10, lower: 5, upper: 15, sampleCount: 15, robustZScore: 3, status: "above" } },
  ]);
  assert.equal(geometry.rangeSegments.length, 1);
  assert.ok(geometry.min < 5);
  assert.ok(geometry.max > 22);
});

test("standard range filters honor the selected end date", () => {
  const points: TimeSeriesPoint[] = Array.from({ length: 400 }, (_, index) => ({
    date: new Date(Date.UTC(2025, 5, 17 + index)).toISOString().slice(0, 10),
    value: index,
  }));
  const endDate = points.at(-1)!.date;
  assert.equal(filterTimeSeriesRange(points, "week", endDate).length, 7);
  assert.equal(filterTimeSeriesRange(points, "30d", endDate).length, 30);
  assert.equal(filterTimeSeriesRange(points, "3m", endDate).length, 90);
  assert.equal(filterTimeSeriesRange(points, "1y", endDate).length, 365);
  assert.equal(filterTimeSeriesRange(points, "all", endDate).length, 400);
});
