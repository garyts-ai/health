import assert from "node:assert/strict";
import test from "node:test";

import { buildLongitudinalAnalysis, isAnalysisRange, validAnalysisEndDate } from "@/lib/longitudinal/analysis";
import type { MetricTrend } from "@/lib/longitudinal/types";

function metric(id: string, values: Array<number | null>): MetricTrend {
  const points = values.map((value, index) => ({
    date: new Date(Date.UTC(2026, 0, 1 + index, 12)).toISOString().slice(0, 10), value,
    sources: [index >= values.length - 30 ? "WHOOP live API" as const : "WHOOP export" as const],
  }));
  return {
    id, domainId: "sleep", label: id === "sleep_duration" ? "Sleep duration" : id,
    unit: id === "sleep_duration" ? "h" : "ms", direction: "stable", interpretation: "neutral",
    confidence: "high", statementType: "trend_description", observation: "Measured series",
    windowDays: 90, startDate: points[0]?.date ?? null, endDate: points.at(-1)?.date ?? null,
    currentValue: 8, baselineValue: 7, absoluteChange: 1, relativeChange: 0.1, slopePerWeek: 0,
    persistenceDays: 0, personalPercentile: null, variability: 1, coveredDays: points.length,
    expectedDays: values.length, coverage: 1, points, provenance: {
      sources: ["WHOOP live API"], sourceRecordIds: [], rawTimestamps: [], normalizedDates: [],
      timezone: "America/New_York", syncTimestamps: [],
    }, limitations: [],
  };
}

test("range parsing and historical end dates reject malformed and future values", () => {
  assert.equal(isAnalysisRange("30d"), true);
  assert.equal(isAnalysisRange("week"), false);
  assert.equal(validAnalysisEndDate("2026-02-28", "2026-03-01"), "2026-02-28");
  assert.equal(validAnalysisEndDate("2026-02-30", "2026-03-01"), "2026-03-01");
  assert.equal(validAnalysisEndDate("2026-03-02", "2026-03-01"), "2026-03-01");
});

test("supported findings compare matched equal calendar windows and rank within domains", () => {
  const values = Array.from({ length: 90 }, (_, index) => index < 60 ? 7 : 8);
  const result = buildLongitudinalAnalysis([
    metric("sleep_duration", values), metric("sleep_efficiency", values.map((value) => value * 10)),
  ], "30d", "2026-03-31");
  assert.equal(result.startDate, "2026-03-02");
  assert.equal(result.comparisonStartDate, "2026-01-31");
  assert.equal(result.comparisonEndDate, "2026-03-01");
  assert.equal(result.findings.length, 1);
  assert.ok(["sleep_duration", "sleep_efficiency"].includes(result.findings[0].metricId));
  assert.equal(result.findings[0].currentCount, 30);
  assert.equal(result.findings[0].comparisonCount, 30);
  assert.equal(result.findings[0].evidence, "supported");
  assert.equal(result.findings[0].currentStart, result.startDate);
  assert.equal(result.findings[0].currentEnd, result.endDate);
  assert.match(result.findings[0].summary, /from 2026-03-02 through 2026-03-31 versus 2026-01-31 through 2026-03-01/);
});

test("finding provenance includes the sources from both compared periods", () => {
  const values = Array.from({ length: 90 }, (_, index) => index < 60 ? 7 : 8);
  const result = buildLongitudinalAnalysis([metric("sleep_duration", values)], "30d", "2026-03-31");
  assert.equal(result.findings.length, 1);
  assert.deepEqual(result.findings[0]?.source, ["WHOOP export", "WHOOP live API"]);
});

test("sparse data is excluded instead of described as stable", () => {
  const sparse = Array.from({ length: 30 }, (_, index) => index % 2 ? 7 : null);
  const result = buildLongitudinalAnalysis([metric("sleep_duration", [...Array(30).fill(7), ...sparse])], "30d", "2026-03-01");
  assert.equal(result.findings.length, 0);
  assert.equal(result.eligibleMetricCount, 0);
  assert.ok(result.exclusions.length > 0);
});

test("all-time analysis has no invented prior-period comparison", () => {
  const result = buildLongitudinalAnalysis([metric("sleep_duration", Array(90).fill(7))], "all", "2026-03-31");
  assert.equal(result.comparisonStartDate, null);
  assert.equal(result.comparisonEndDate, null);
  assert.equal(result.findings.length, 0);
});
