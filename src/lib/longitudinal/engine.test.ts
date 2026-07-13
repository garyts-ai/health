import assert from "node:assert/strict";
import test from "node:test";

import { buildLongitudinalHealthView, type LongitudinalEngineInput } from "@/lib/longitudinal/engine";

const NOW = new Date("2026-07-12T16:00:00.000Z");

function date(offset: number) {
  return new Date(NOW.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
}

function liveDay(offset: number, values: Partial<LongitudinalEngineInput["liveDays"][number]> = {}): LongitudinalEngineInput["liveDays"][number] {
  const key = date(offset);
  return {
    source_record_id: `cycle-${key}`,
    cycle_start: `${key}T05:00:00.000Z`,
    sleep_end: `${key}T11:00:00.000Z`,
    timezone_offset: "-04:00",
    synced_at: `${key}T12:00:00.000Z`,
    recovery_score: 65,
    resting_heart_rate: 52,
    hrv_rmssd_milli: 60,
    skin_temp_celsius: 33.2,
    spo2_percentage: 96,
    day_strain: 9,
    respiratory_rate: 14,
    asleep_minutes: 430,
    sleep_efficiency: 90,
    sleep_consistency: 85,
    ...values,
  };
}

function input(overrides: Partial<LongitudinalEngineInput> = {}): LongitudinalEngineInput {
  return {
    now: NOW,
    liveDays: Array.from({ length: 120 }, (_, index) => liveDay(index - 119)),
    exportDays: [],
    bodyRows: [],
    hevyRows: [],
    workoutRows: [],
    journalRows: [],
    exportWorkoutRows: [],
    ...overrides,
  };
}

test("acute deviation remains separate from stable long-term direction", () => {
  const liveDays = Array.from({ length: 120 }, (_, index) =>
    liveDay(index - 119, {
      recovery_score: index === 119 ? 10 : 65 + (index % 3),
      asleep_minutes: index === 119 ? 258 : 430 + (index % 4),
    }),
  );
  const view = buildLongitudinalHealthView(input({ liveDays }));
  assert.equal(view.currentDeviation.active, true);
  assert.ok(view.currentDeviation.deviatingMetricIds.includes("recovery"));
  assert.equal(view.currentDeviation.changesLongTermAggregate, false);
  assert.notEqual(view.aggregateTrend.direction, "weakening");
  assert.doesNotMatch(JSON.stringify(view), /you should|diagnos|getting sick/i);
});

test("sustained HRV increase and resting-heart-rate decrease are favorable trends", () => {
  const liveDays = Array.from({ length: 120 }, (_, index) => liveDay(index - 119, {
    hrv_rmssd_milli: 45 + index * 0.25,
    resting_heart_rate: 62 - index * 0.08,
  }));
  const view = buildLongitudinalHealthView(input({ liveDays }));
  const [hrv, rhr] = view.domains.physiology.metrics;
  assert.equal(hrv.direction, "upward");
  assert.equal(hrv.interpretation, "favorable");
  assert.equal(rhr.direction, "downward");
  assert.equal(rhr.interpretation, "favorable");
});

test("conflicting interpretable signals produce a mixed aggregate", () => {
  const liveDays = Array.from({ length: 120 }, (_, index) => liveDay(index - 119, {
    hrv_rmssd_milli: 45 + index * 0.25,
    resting_heart_rate: 48 + index * 0.1,
    asleep_minutes: 480 - index * 1.2,
  }));
  const hevyRows = Array.from({ length: 13 }, (_, index) => index < 5 ? 1 : 3).flatMap((count, index) =>
    Array.from({ length: count }, (_, session) => ({
      id: `lift-${index}-${session}`, start_time: `${date(-84 + index * 7 + session)}T17:00:00.000Z`, set_count: 12,
      volume_kg: 5000, duration_seconds: 3600, raw_json: "{}", synced_at: `${date(-84 + index * 7 + session)}T19:00:00.000Z`,
    })),
  );
  const view = buildLongitudinalHealthView(input({ liveDays, hevyRows }));
  assert.equal(view.aggregateTrend.direction, "mixed", JSON.stringify({
    physiology: view.domains.physiology.metrics.map((metric) => [metric.id, metric.direction, metric.interpretation]),
    sleep: view.domains.sleep.metrics.map((metric) => [metric.id, metric.direction, metric.interpretation]),
    strength: view.domains.strength.metrics.map((metric) => [metric.id, metric.direction, metric.interpretation]),
  }));
});

test("live WHOOP wins export overlap and coverage remains source-aware", () => {
  const overlapDate = date(-10);
  const view = buildLongitudinalHealthView(input({
    liveDays: [liveDay(-10, { hrv_rmssd_milli: 70 })],
    exportDays: [{
      cycle_start: `${overlapDate}T05:00:00.000Z`, wake_onset: `${overlapDate}T11:00:00.000Z`,
      timezone_offset: "UTC-04:00", recovery_score: 50, resting_heart_rate: 60,
      hrv_rmssd_milli: 20, skin_temp_celsius: 33, spo2_percentage: 95, day_strain: 8,
      respiratory_rate: 14, asleep_minutes: 400, sleep_efficiency: 88, sleep_consistency: 80,
    }],
  }));
  const hrv = view.domains.physiology.metrics[0];
  assert.equal(hrv.points[0].value, 70);
  assert.deepEqual(hrv.provenance.sources, ["WHOOP live API"]);
  assert.equal(view.dataCoverage.bySource["WHOOP live API"].covered, 1);
});

function alcoholRows(count: number): LongitudinalEngineInput["journalRows"] {
  return Array.from({ length: count }, (_, index) => ({
    id: `journal-${index}`,
    cycle_start: `${date(-11 * (index + 1))}T05:00:00.000Z`,
    question_text: "Did you consume alcohol?",
    answered_yes: 1,
  }));
}

function alcoholNoRows(count: number): LongitudinalEngineInput["journalRows"] {
  const exposed = new Set(alcoholRows(20).map((row) => row.cycle_start));
  return Array.from({ length: 170 }, (_, index) => `${date(-(index + 1))}T05:00:00.000Z`)
    .filter((cycleStart) => !exposed.has(cycleStart))
    .slice(0, count)
    .map((cycleStart, index) => ({ id: `journal-no-${index}`, cycle_start: cycleStart, question_text: "Did you consume alcohol?", answered_yes: 0 }));
}

test("explicit alcohol records can produce a cautious next-day association", () => {
  const exposedTargets = new Set(alcoholRows(12).map((row) => date(Math.round((Date.parse(row.cycle_start!) - NOW.getTime()) / 86_400_000) + 1)));
  const liveDays = Array.from({ length: 180 }, (_, index) => {
    const offset = index - 179;
    return liveDay(offset, { recovery_score: exposedTargets.has(date(offset)) ? 48 : 68 + (index % 2) });
  });
  const view = buildLongitudinalHealthView(input({ liveDays, journalRows: [...alcoholRows(12), ...alcoholNoRows(40)] }));
  const association = view.recordedAssociations.find((item) => item.outcomeKey === "recovery");
  assert.equal(association?.claim, "association_detected");
  assert.match(association?.observation ?? "", /associated with/i);
  assert.doesNotMatch(association?.observation ?? "", /caused|should/i);
  assert.ok(association?.sensitivityChecksPassed.includes("robust standardized effect ≥0.35"));
  assert.ok(association?.sensitivityChecksPassed.includes("deterministic 95% bootstrap interval excludes zero"));
  assert.ok(association?.sensitivityChecksPassed.includes("trimmed-outlier sign retained"));
});

test("unrecorded alcohol is never inferred and small samples are insufficient", () => {
  const absent = buildLongitudinalHealthView(input());
  assert.equal(absent.recordedAssociations.length, 0);
  assert.equal(absent.alcoholLog?.entries.length, 0);
  assert.equal(absent.alcoholLog?.summary.last90dCount, 0);

  const sparse = buildLongitudinalHealthView(input({ journalRows: alcoholRows(2) }));
  assert.ok(sparse.recordedAssociations.length > 0);
  assert.ok(sparse.recordedAssociations.every((item) => item.claim === "insufficient_data"));
});

test("weight direction remains neutral when intent and composition are unknown", () => {
  const bodyRows = Array.from({ length: 16 }, (_, index) => ({
    observed_on: date(-105 + index * 7), observed_at: `${date(-105 + index * 7)}T12:00:00.000Z`,
    weight_kilogram: 82 - index * 0.2, synced_at: `${date(-105 + index * 7)}T12:00:00.000Z`,
  }));
  const view = buildLongitudinalHealthView(input({ bodyRows }));
  const weight = view.domains.bodyWeight.metrics[0];
  assert.equal(weight.interpretation, "neutral");
  assert.equal(weight.unit, "lb");
  assert.ok(weight.points.some((point) => point.value !== null && Math.abs(point.value - 82 * 2.2046226218) < 0.05));
  assert.match(weight.limitations.join(" "), /intent/i);
});

test("missing data is explicit and never converted to a negative result", () => {
  const view = buildLongitudinalHealthView(input({ liveDays: [] }));
  assert.equal(view.aggregateTrend.direction, "insufficient_data");
  assert.equal(view.domains.physiology.direction, "insufficient_data");
  assert.ok(view.dataCoverage.unavailableInputs.includes("Daily steps"));
});

test("current point, trend endpoint, and selected date use the same New York physiological date", () => {
  const view = buildLongitudinalHealthView(input());
  assert.equal(view.selectedDate, "2026-07-12");
  assert.equal(view.domains.physiology.metrics[0].endDate, view.selectedDate);
  assert.equal(view.domains.physiology.metrics[0].points.at(-1)?.date, view.selectedDate);
});

test("window selection truthfully chooses 180, 90, or 30 days from daily WHOOP coverage", () => {
  const full = buildLongitudinalHealthView(input({ liveDays: Array.from({ length: 180 }, (_, index) => liveDay(index - 179)) }));
  const partial = buildLongitudinalHealthView(input());
  const sparse = buildLongitudinalHealthView(input({ liveDays: Array.from({ length: 50 }, (_, index) => liveDay(index - 49)) }));
  assert.equal(full.windowDays, 180);
  assert.equal(partial.windowDays, 90);
  assert.equal(sparse.windowDays, 30);
  assert.equal(sparse.dataCoverage.windowDays, 30);
});

test("trend gate rejects changes below robust-noise or persistence requirements", () => {
  const noisy = Array.from({ length: 120 }, (_, index) => liveDay(index - 119, {
    hrv_rmssd_milli: index < 90 ? (index % 2 ? 55 : 45) : 53.2,
  }));
  const shortLived = Array.from({ length: 120 }, (_, index) => liveDay(index - 119, {
    resting_heart_rate: index < 90 ? 52 : 58,
  }));
  const noisyView = buildLongitudinalHealthView(input({ liveDays: noisy }));
  const shortView = buildLongitudinalHealthView(input({ liveDays: shortLived }));
  assert.equal(noisyView.domains.physiology.metrics[0].direction, "stable");
  assert.equal(shortView.domains.physiology.metrics[1].direction, "stable");
  assert.match(shortView.domains.physiology.metrics[1].limitations.join(" "), /persist/i);
});

test("association thresholds distinguish boundary-insufficient and no-clear results", () => {
  const boundary = buildLongitudinalHealthView(input({ journalRows: [...alcoholRows(11), ...alcoholNoRows(40)] }));
  assert.ok(boundary.recordedAssociations.every((item) => item.claim === "insufficient_data"));

  const noEffect = buildLongitudinalHealthView(input({
    liveDays: Array.from({ length: 180 }, (_, index) => liveDay(index - 179, { recovery_score: 65 + (index % 2) })),
    journalRows: [...alcoholRows(12), ...alcoholNoRows(40)],
  }));
  assert.equal(noEffect.recordedAssociations.find((item) => item.outcomeKey === "recovery")?.claim, "no_clear_association");
});

test("journal events remain a separate timeline and never become a health domain", () => {
  const view = buildLongitudinalHealthView(input({ journalRows: alcoholRows(2) }));
  assert.equal("recordedBehaviors" in view.domains, false);
  assert.equal(Object.keys(view.domains).length, 6);
  assert.equal(view.domainCards?.length, 6);
  assert.ok(view.domainCards?.every((card) => card.id !== "recordedBehaviors"));
  assert.equal(view.journalEvents?.length, 2);
});

test("event timeline contains explicit positive journal rows only", () => {
  const rows: LongitudinalEngineInput["journalRows"] = [
    { id: "alcohol-yes", cycle_start: `${date(-3)}T05:00:00.000Z`, question_text: "Did you consume alcohol?", answered_yes: 1 },
    { id: "alcohol-no", cycle_start: `${date(-2)}T05:00:00.000Z`, question_text: "Did you consume alcohol?", answered_yes: 0 },
    { id: "water-yes", cycle_start: `${date(-2)}T06:00:00.000Z`, question_text: "Did you drink water?", answered_yes: 1 },
    { id: "travel-yes", cycle_start: `${date(-1)}T05:00:00.000Z`, question_text: "Did you travel?", answered_yes: 1 },
    { id: "missing-date", cycle_start: null, question_text: "Were you ill?", answered_yes: 1 },
    { id: "old-entry", cycle_start: `${date(-200)}T05:00:00.000Z`, question_text: "Did you consume caffeine?", answered_yes: 1 },
  ];
  const view = buildLongitudinalHealthView(input({ journalRows: rows }));
  assert.deepEqual(view.journalEvents?.map((event) => event.id), ["alcohol-yes", "water-yes", "travel-yes"]);
  assert.deepEqual(view.journalEvents?.map((event) => event.type), ["alcohol", "hydration", "travel"]);
  assert.ok(view.journalEvents?.every((event) => event.source === "WHOOP Journal" && event.metadata.answeredYes === true));
  assert.equal(view.journalEvents?.some((event) => event.id === "alcohol-no"), false);
});

test("missing journal data produces an empty event layer with an explicit limitation", () => {
  const view = buildLongitudinalHealthView(input({ journalRows: [] }));
  assert.deepEqual(view.journalEvents, []);
  assert.deepEqual(view.recordedAssociations, []);
  assert.equal(view.dataCoverage.bySource["WHOOP Journal"].covered, 0);
  assert.match(view.dataCoverage.limitations.join(" "), /without explicit journal entries/i);
});

test("relationship output retains aligned dates and robust comparison metadata", () => {
  const exposedTargets = new Set(alcoholRows(12).map((row) => date(Math.round((Date.parse(row.cycle_start!) - NOW.getTime()) / 86_400_000) + 1)));
  const view = buildLongitudinalHealthView(input({
    liveDays: Array.from({ length: 180 }, (_, index) => {
      const offset = index - 179;
      return liveDay(offset, { recovery_score: exposedTargets.has(date(offset)) ? 48 : 68 + (index % 2) });
    }),
    journalRows: [...alcoholRows(12), ...alcoholNoRows(40)],
  }));
  const relationship = view.recordedAssociations.find((item) => item.outcomeKey === "recovery");
  assert.equal(relationship?.exposedDates?.length, relationship?.exposedCount);
  assert.equal(relationship?.comparisonDates?.length, relationship?.comparisonCount);
  assert.equal(typeof relationship?.robustEffectSize, "number");
  assert.equal(relationship?.bootstrapInterval?.length, 2);
});
