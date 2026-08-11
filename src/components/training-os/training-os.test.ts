import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { regionsForWeeklyMuscleGroup } from "@/lib/insights/body-map";
import type { BodyHighlight } from "@/lib/insights/types";
import { bestFrontRegion, defaultAnatomyView, projectedHeroCallout, regionsForTrainingTarget, visibleCalloutRegions } from "./anatomy-viewer-model";
import { bestTelemetryIndex, chartSummary, formatInstrumentValue, indexFromPointer, nextTelemetryIndex, resolveTelemetryIndex } from "./telemetry-model";
import { mapTodayTelemetry } from "./today-telemetry";

test("declares every semantic signal and surface level", () => {
  const tokens = readFileSync(new URL("../../app/training-os-tokens.css", import.meta.url), "utf8");
  for (const tone of ["current", "emphasis", "caution", "positive", "danger"]) {
    assert.match(tokens, new RegExp(`--os-signal-${tone}:`));
  }
  for (const level of ["base", "raised", "overlay"]) {
    assert.match(tokens, new RegExp(`--os-surface-${level}:`));
  }
});

test("maps seven-day telemetry without removing null gaps", () => {
  const recovery = Array.from({ length: 7 }, (_, index) => ({ label: `${index}`, value: index === 3 ? null : index + 60 }));
  const sleep = recovery.map((point) => ({ ...point, value: point.value === null ? null : 7 }));
  const strain = recovery.map((point) => ({ ...point, value: point.value === null ? null : 5 }));
  const metrics = mapTodayTelemetry({ recoveryScore: 76, sleepHours: 7.7, sleepVsNeedHours: -0.8, sleepStageContext: "Deep 1.4h / REM 1.8h", strainScore: 4, recovery7d: recovery, sleep7d: sleep, strain7d: strain });
  assert.equal(metrics[0].visual?.points.length, 7);
  assert.equal(metrics[0].visual?.points[3].value, null);
  assert.equal(metrics[1].visual?.points[3].value, null);
  assert.equal(metrics[2].visual?.points[3].value, null);
  assert.match(metrics[1].detail, /Deep 1.4h/);
  assert.equal(metrics.length, 3);
  assert.equal(metrics[0].visual && formatInstrumentValue(metrics[0].visual, 76), "76%");
  assert.equal(metrics[1].visual && formatInstrumentValue(metrics[1].visual, 7.25), "7.3h");
});

test("telemetry never fabricates points when data is unavailable", () => {
  const metrics = mapTodayTelemetry({ recoveryScore: null, sleepHours: null, sleepVsNeedHours: null, strainScore: null, recovery7d: [], sleep7d: [], strain7d: [] });
  assert.equal(metrics.length, 3);
  assert.deepEqual(metrics.map((metric) => metric.visual?.points), [[], [], []]);
});

test("telemetry pointer and keyboard selection remains bounded", () => {
  assert.equal(indexFromPointer(150, 100, 300, 7), 1);
  assert.equal(indexFromPointer(900, 100, 300, 7), 6);
  assert.equal(nextTelemetryIndex("ArrowLeft", 0, 7), 0);
  assert.equal(nextTelemetryIndex("ArrowRight", 6, 7), 6);
  assert.equal(nextTelemetryIndex("Home", 4, 7), 0);
  assert.equal(nextTelemetryIndex("End", 2, 7), 6);
  assert.equal(nextTelemetryIndex("Escape", 2, 7), 6);
});

test("telemetry summaries exclude null observations", () => {
  const summary = chartSummary({ kind: "line", points: [{ label: "M", value: 4 }, { label: "T", value: null }, { label: "W", value: 10 }], unit: "", valueFormat: "decimal" });
  assert.deepEqual(summary, { min: 4, max: 10, average: 7 });
});

test("telemetry defaults to the newest day with the strongest data coverage", () => {
  const visual = (values: Array<number | null>) => ({ kind: "line" as const, points: values.map((value, index) => ({ label: `${index}`, value })), unit: "", valueFormat: "decimal" as const });
  assert.equal(bestTelemetryIndex([visual([1, 2, 3]), visual([1, 2, null]), visual([1, 2, null])]), 1);
});

test("telemetry selection falls back when refreshed data no longer contains the selected date", () => {
  const refreshed = [
    { label: "M", dateKey: "2026-07-06", value: 70 },
    { label: "T", dateKey: "2026-07-07", value: 80 },
  ];
  assert.equal(resolveTelemetryIndex(refreshed, "2026-07-05", 1), 1);
  assert.equal(resolveTelemetryIndex(refreshed, "2026-07-06", 1), 0);
});

test("maps weekly muscle groups to canonical regions", () => {
  assert.deepEqual(regionsForWeeklyMuscleGroup("Upper back / traps"), ["upperBack", "traps"]);
  assert.deepEqual(regionsForWeeklyMuscleGroup("Hamstrings / glutes"), ["hamstrings", "glutes"]);
  assert.deepEqual(regionsForWeeklyMuscleGroup("Unknown"), []);
});

test("chooses anatomy defaults and active regions deterministically", () => {
  const weekly: BodyHighlight[] = [
    { regionId: "chest", intensity: "medium", view: "front" },
    { regionId: "lats", intensity: "high", view: "back" },
  ];
  const latest: BodyHighlight[] = [
    { regionId: "triceps", intensity: "high", view: "back" },
  ];
  assert.equal(defaultAnatomyView(), "front");
  assert.equal(bestFrontRegion(weekly, latest), "triceps");
  assert.deepEqual(visibleCalloutRegions(weekly, latest), ["triceps", "chest", "lats"]);
});

test("maps deterministic Today targets without changing health contracts", () => {
  assert.deepEqual(regionsForTrainingTarget("Upper", "Train"), ["chest", "frontDelts", "sideDelts", "biceps", "triceps", "forearms", "lats"]);
  assert.deepEqual(regionsForTrainingTarget("Lower", "Train"), ["quads", "adductors", "calves"]);
  assert.deepEqual(regionsForTrainingTarget("Either", "Train"), []);
  assert.deepEqual(regionsForTrainingTarget("Upper", "Rest"), []);
});

test("projects callouts from the illustrated asset geometry", () => {
  const fullBody = projectedHeroCallout("chest");
  assert.ok(fullBody.xPercent > 0 && fullBody.xPercent < 100);
  assert.ok(fullBody.yPercent > 0 && fullBody.yPercent < 100);
});

test("expert-density charts keep one closed KPI and disclose supporting data", () => {
  const chartHeader = readFileSync(new URL("./chart-header.tsx", import.meta.url), "utf8");
  const disclosure = readFileSync(new URL("./chart-data-disclosure.tsx", import.meta.url), "utf8");
  const instrument = readFileSync(new URL("./metric-instrument.tsx", import.meta.url), "utf8");
  const observatory = readFileSync(new URL("../longitudinal-observatory.tsx", import.meta.url), "utf8");

  assert.match(chartHeader, /<h3>\{title\}<\/h3>/);
  assert.match(chartHeader, /<strong>\{value\}<\/strong>/);
  assert.match(disclosure, /<details/);
  assert.match(disclosure, /<dl>/);
  assert.match(instrument, /ChartDataDisclosure rows=\{rows\}/);
  assert.doesNotMatch(instrument, /styles\.range/);
  assert.doesNotMatch(instrument, /styles\.srOnly/);
  assert.doesNotMatch(observatory, /styles\.metricGraphStats/);
  assert.doesNotMatch(observatory, /styles\.metricGraphDates/);
  assert.doesNotMatch(observatory, /styles\.cardObservation/);
  assert.doesNotMatch(observatory, /styles\.cardMetrics/);
});

test("expert workflow metadata remains available through native disclosures", () => {
  const weekly = readFileSync(new URL("../weekly-plan-view.tsx", import.meta.url), "utf8");
  const utilities = readFileSync(new URL("../protected-settings-actions.tsx", import.meta.url), "utf8");
  const packet = readFileSync(new URL("../llm-context-packet.tsx", import.meta.url), "utf8");

  assert.match(weekly, /Plan provenance/);
  assert.match(weekly, /Score detail/);
  assert.match(utilities, /<details/);
  assert.match(packet, /Preview packet/);
  assert.doesNotMatch(packet, /contextPacketText\.length/);
});
