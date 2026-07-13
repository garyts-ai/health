import assert from "node:assert/strict";
import test from "node:test";

import { scanLongitudinalCopy } from "@/lib/longitudinal-copy-safety";
import {
  buildLongitudinalContextPacket,
  LONGITUDINAL_QUESTION_PLACEHOLDER,
} from "@/lib/longitudinal-context-packet";
import type {
  HealthDomainTrend,
  LongitudinalHealthView,
  MetricTrend,
  SourceProvenance,
} from "@/lib/longitudinal/types";

const provenance: SourceProvenance = {
  sources: ["WHOOP export"],
  sourceRecordIds: ["cycle-1", "cycle-2"],
  rawTimestamps: ["2026-04-14T04:00:00Z", "2026-07-12T04:00:00Z"],
  normalizedDates: ["2026-04-14", "2026-07-12"],
  timezone: "America/New_York",
  syncTimestamps: ["2026-07-12T13:55:00Z"],
};

function metric(overrides: Partial<MetricTrend> = {}): MetricTrend {
  return {
    id: "hrv",
    domainId: "physiology",
    label: "HRV",
    unit: " ms",
    direction: "improving",
    interpretation: "favorable",
    confidence: "high",
    statementType: "trend_description",
    observation: "HRV trended upward over 90 days.",
    windowDays: 90,
    startDate: "2026-04-14",
    endDate: "2026-07-12",
    currentValue: 72,
    baselineValue: 64,
    absoluteChange: 8,
    relativeChange: 12.5,
    slopePerWeek: 0.6,
    persistenceDays: 76,
    personalPercentile: 78,
    variability: 7.2,
    coveredDays: 87,
    expectedDays: 90,
    coverage: 87 / 90,
    points: [],
    provenance,
    limitations: [],
    ...overrides,
  };
}

function domain(id: string, label: string, overrides: Partial<HealthDomainTrend> = {}): HealthDomainTrend {
  return {
    id,
    label,
    direction: "stable",
    confidence: "high",
    metrics: [],
    largestShiftMetricId: null,
    mostPersistentMetricId: null,
    summary: `${label} remained stable over 180 days.`,
    limitations: [],
    ...overrides,
  };
}

function fixture(overrides: Partial<LongitudinalHealthView> = {}): LongitudinalHealthView {
  return {
    generatedAt: "2026-07-12T14:00:00.000Z",
    selectedDate: "2026-07-12",
    timezone: "America/New_York",
    windowDays: 180,
    aggregateTrend: {
      direction: "mixed",
      confidence: "high",
      improvingCount: 2,
      stableCount: 4,
      weakeningCount: 1,
      evaluatedMetricCount: 7,
      summary: "Tracked signals show mixed direction.",
      subtitle: "Describes trends in connected data, not overall health or medical risk.",
      excludedMetricIds: ["recovery"],
    },
    domains: {
      physiology: domain("physiology", "Physiology", {
        direction: "improving",
        metrics: [metric()],
        largestShiftMetricId: "hrv",
        mostPersistentMetricId: "hrv",
        summary: "HRV trended upward while resting heart rate trended downward over 90 days.",
      }),
      sleep: domain("sleep", "Sleep", { direction: "weakening", confidence: "moderate", summary: "Sleep timing became more variable over 30 days." }),
      cardiovascularActivity: domain("cardio", "Cardiovascular activity"),
      dailyMovement: domain("movement", "Daily movement", { direction: "insufficient_data", confidence: "low", summary: "Steps are not available.", limitations: ["Post-meal movement cannot be measured; meal timing is not available."] }),
      strength: domain("strength", "Strength training"),
      bodyWeight: domain("weight", "Body weight", { confidence: "moderate", summary: "Weight declined by 2.1 lb over 90 days; intent is unknown.", limitations: ["The app does not know whether this weight change was intentional."] }),
      recordedBehaviors: domain("behaviors", "Recorded behaviors", { direction: "mixed", confidence: "moderate", summary: "Eight alcohol entries were recorded." }),
    },
    currentDeviation: { active: true, date: "2026-07-12", deviatingMetricIds: ["recovery", "sleep_duration"], metrics: [], summary: "Recovery and sleep duration are unusually low today.", changesLongTermAggregate: false },
    notableTrends: [{ id: "hrv-rhr", metricIds: ["hrv", "rhr"], title: "Largest long-term shift", observation: "HRV trended upward while resting heart rate trended downward over 90 days.", startDate: "2026-04-14", endDate: "2026-07-12", magnitude: "HRV +8 ms; RHR -3 bpm", persistenceDays: 76, confidence: "high", statementType: "trend_description", provenance, limitations: [] }],
    recordedAssociations: [{ id: "alcohol-recovery", exposureKey: "alcohol", exposureLabel: "Alcohol recorded", outcomeKey: "recovery", outcomeLabel: "Next-day Recovery", analysisWindowDays: 90, lagHours: 24, exposedCount: 8, comparisonCount: 52, exposedMedian: 58, comparisonMedian: 67, absoluteDifference: -9, relativeDifference: -13.4, confidence: "moderate", matchingMethod: "local physiological date + 1 day", sensitivityChecksPassed: ["weekday-balanced"], claim: "association_detected", observation: "Alcohol-recorded nights were followed by lower next-day Recovery.", statementType: "recorded_association", provenance, limitations: ["Observational association may be confounded."] }],
    dataCoverage: {
      overall: 174 / 180,
      windowDays: 180,
      bySource: { WHOOP: { covered: 174, expected: 180, ratio: 174 / 180, startDate: "2026-01-14", endDate: "2026-07-12" } },
      byDomain: { physiology: { covered: 174, expected: 180, ratio: 174 / 180, startDate: "2026-01-14", endDate: "2026-07-12" } },
      availableInputs: ["HRV", "resting heart rate", "sleep", "Hevy workouts"],
      unavailableInputs: ["Meal timing", "Daily steps"],
      limitations: ["Body-weight intent is unknown."],
    },
    ...overrides,
  };
}

test("context packet includes bounded observational evidence and no recommendations", () => {
  const packet = buildLongitudinalContextPacket(fixture());

  assert.match(packet.contextPacketText, /^HEALTHMAXER LONGITUDINAL CONTEXT/);
  assert.match(packet.contextPacketText, /Selected physiological date: 2026-07-12/);
  assert.match(packet.contextPacketText, /7 \/ 30 \/ 90 \/ 180-day windows/);
  assert.match(packet.contextPacketText, /Alcohol-recorded nights were followed by lower next-day Recovery/);
  assert.match(packet.contextPacketText, /exposed=8/);
  assert.match(packet.contextPacketText, /records=2/);
  assert.match(packet.contextPacketText, /Meal timing/);
  assert.ok(packet.contextPacketText.includes(LONGITUDINAL_QUESTION_PLACEHOLDER));
  assert.ok(packet.promptText.includes(packet.contextPacketText));
  assert.deepEqual(scanLongitudinalCopy(packet), []);
  assert.doesNotMatch(packet.contextPacketText, /Minimal app recommendation|action items|focus this month/i);
  assert.ok(packet.contextPacketText.length < 30_000);
});

test("full packet generation rejects unsafe copy embedded in a view section", () => {
  const unsafe = fixture({
    aggregateTrend: { ...fixture().aggregateTrend, summary: "You should sleep more because this means you have a disorder." },
  });
  assert.throws(() => buildLongitudinalContextPacket(unsafe), /Unsafe longitudinal copy/);
});

test("packet represents absent associations as unsupported", () => {
  const { contextPacketText } = buildLongitudinalContextPacket(fixture({ recordedAssociations: [] }));
  assert.match(contextPacketText, /No supported recorded associations/);
  assert.doesNotMatch(contextPacketText, /likely alcohol|suggests alcohol/i);
});

test("365 daily points and provenance timestamps are summarized rather than dumped", () => {
  const points = Array.from({ length: 365 }, (_, index) => ({
    date: new Date(Date.UTC(2025, 6, 13 + index)).toISOString().slice(0, 10),
    value: 50 + (index % 20),
  }));
  const largeProvenance: SourceProvenance = {
    ...provenance,
    sourceRecordIds: points.map((_, index) => `raw-record-${index}`),
    rawTimestamps: points.map((point) => `${point.date}T04:00:00.000Z`),
    normalizedDates: points.map((point) => point.date),
    syncTimestamps: points.map((point) => `${point.date}T12:00:00.000Z`),
  };
  const largeMetric = metric({ windowDays: 365, points, provenance: largeProvenance });
  const base = fixture();
  const view = fixture({
    domains: {
      ...base.domains,
      physiology: { ...base.domains.physiology, metrics: [largeMetric] },
    },
  });

  const { contextPacketText } = buildLongitudinalContextPacket(view);
  assert.ok(contextPacketText.length < 30_000);
  assert.match(contextPacketText, /records=365/);
  assert.match(contextPacketText, /dates=2025-07-13 through 2026-07-12/);
  assert.doesNotMatch(contextPacketText, /raw-record-364|2025-07-14T04:00:00\.000Z/);
  assert.doesNotMatch(contextPacketText, /value=5[0-9].*value=5[0-9]/);
});
