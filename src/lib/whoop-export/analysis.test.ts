import assert from "node:assert/strict";
import test from "node:test";

import {
  comparisonDirection,
  gapCount,
  journalFindings,
  selectOverviewFinding,
  standardDeviation,
} from "@/lib/whoop-export/analysis";

test("gapCount flags gaps longer than two days", () => {
  assert.equal(
    gapCount([
      { cycle_start: "2026-01-01T12:00:00.000Z" },
      { cycle_start: "2026-01-02T12:00:00.000Z" },
      { cycle_start: "2026-01-05T12:00:00.000Z" },
    ]),
    1,
  );
});

test("standardDeviation measures sleep timing spread", () => {
  assert.equal(Math.round(standardDeviation([1320, 1380, 1440]) ?? 0), 49);
});

test("comparisonDirection handles up, down, flat, and missing values", () => {
  assert.equal(comparisonDirection(50, 55), "up");
  assert.equal(comparisonDirection(50, 45), "down");
  assert.equal(comparisonDirection(50, 50.02), "flat");
  assert.equal(comparisonDirection(null, 50), "missing");
});

test("selectOverviewFinding prioritizes the supported sleep constraint", () => {
  const selected = selectOverviewFinding([
    {
      title: "Recent autonomic direction",
      evidence: "HRV is stable.",
      interpretation: "No adverse shift.",
      confidence: "High",
    },
    {
      title: "Sleep is running below calculated need",
      evidence: "Sleep trails need by 90 minutes.",
      interpretation: "Duration is limiting recovery.",
      confidence: "High",
    },
  ]);

  assert.equal(selected.title, "Sleep is running below calculated need");
});

test("journalFindings requires ten observations in both cohorts", () => {
  const cycles = Array.from({ length: 20 }, (_, index) => ({
    cycle_start: `2026-01-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
    timezone_offset: "UTC-05:00",
    recovery_score: index < 10 ? 80 : 60,
    resting_heart_rate: 50,
    hrv_rmssd_milli: index < 10 ? 80 : 60,
    skin_temp_celsius: 33,
    spo2_percentage: 96,
    day_strain: 10,
    respiratory_rate: 15,
    asleep_minutes: 450,
    sleep_need_minutes: 480,
    sleep_debt_minutes: 20,
    sleep_efficiency: 90,
    sleep_consistency: 85,
    sleep_performance: 90,
    light_minutes: 240,
    deep_minutes: 100,
    rem_minutes: 110,
    awake_minutes: 30,
    sleep_onset: null,
    wake_onset: null,
  }));
  const journals = cycles.map((cycle, index) => ({
    cycle_start: cycle.cycle_start,
    question_text: "Walked after a meal?",
    answered_yes: index < 10 ? 1 : 0,
  }));

  const findings = journalFindings(cycles, journals);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].recoveryDelta, 20);
});
