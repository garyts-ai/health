import assert from "node:assert/strict";
import test from "node:test";
import { buildWhoopCycleObservations, buildWhoopSleepObservations, type ExportCycleRecord, type ExportSleepRecord, type LiveCycleRecord, type LiveSleepRecord } from "@/lib/longitudinal/observations";

const NOW = new Date("2026-09-28T16:00:00.000Z");
const CYCLE_START = "2026-09-26T12:00:00.000Z";
const CYCLE_END = "2026-09-27T12:00:00.000Z";
const SLEEP_START = "2026-09-27T02:00:00.000Z";

function liveSleep(overrides: Partial<LiveSleepRecord> = {}): LiveSleepRecord {
  return {
    id: "sleep-1", cycle_id: "cycle-1", start: SLEEP_START, end: CYCLE_END,
    timezone_offset: "-04:00", nap: 0, score_state: "SCORED",
    total_in_bed_time_milli: 28_800_000, total_awake_time_milli: 1_800_000,
    total_light_sleep_time_milli: 14_400_000, total_slow_wave_sleep_time_milli: 7_200_000,
    total_rem_sleep_time_milli: 3_600_000, sleep_needed_baseline_milli: 28_800_000,
    sleep_needed_debt_milli: 1_800_000, sleep_needed_strain_milli: 900_000,
    sleep_needed_nap_milli: -3_600_000, sleep_efficiency: 90, sleep_consistency: 80,
    synced_at: CYCLE_END, ...overrides,
  };
}

function liveCycle(overrides: Partial<LiveCycleRecord> = {}): LiveCycleRecord {
  return {
    id: "cycle-1", start: CYCLE_START, end: CYCLE_END, timezone_offset: "-04:00",
    score_state: "SCORED", strain: 11, synced_at: CYCLE_END,
    recovery_score_state: "SCORED", user_calibrating: 0,
    recovery_raw_json: JSON.stringify({ sleep_id: "sleep-1" }), recovery_synced_at: CYCLE_END,
    recovery_score: 64, resting_heart_rate: 52, hrv_rmssd_milli: 58,
    skin_temp_celsius: 33, spo2_percentage: 97, sleep_id: "sleep-1", sleep_start: SLEEP_START,
    sleep_end: CYCLE_END, sleep_nap: 0, sleep_score_state: "SCORED",
    total_light_sleep_time_milli: 14_400_000, total_slow_wave_sleep_time_milli: 7_200_000,
    total_rem_sleep_time_milli: 3_600_000, sleep_efficiency: 90, sleep_consistency: 80,
    respiratory_rate: 14, sleep_needed_baseline_milli: 28_800_000,
    sleep_needed_debt_milli: 1_800_000, sleep_needed_strain_milli: 900_000,
    sleep_needed_nap_milli: -3_600_000, ...overrides,
  };
}

function exportSleep(overrides: Partial<ExportSleepRecord> = {}): ExportSleepRecord {
  return {
    sleep_onset: SLEEP_START, cycle_start: CYCLE_START, wake_onset: CYCLE_END,
    asleep_minutes: 420, sleep_need_minutes: 465, sleep_efficiency: 88,
    sleep_consistency: 82, nap: 0, ...overrides,
  };
}

function exportCycle(overrides: Partial<ExportCycleRecord> = {}): ExportCycleRecord {
  return {
    cycle_start: CYCLE_START, cycle_end: CYCLE_END, timezone_offset: "-04:00",
    recovery_score: 70, resting_heart_rate: 50, hrv_rmssd_milli: 61,
    skin_temp_celsius: 32.8, spo2_percentage: 98, day_strain: 10,
    sleep_onset: SLEEP_START, wake_onset: CYCLE_END, sleep_performance: 88,
    respiratory_rate: 13, asleep_minutes: 420, sleep_need_minutes: 465,
    sleep_efficiency: 88, sleep_consistency: 82, ...overrides,
  };
}

test("signed nap contribution is included in recorded sleep need", () => {
  const [sleep] = buildWhoopSleepObservations([liveSleep()], []);
  assert.equal(sleep?.sleepNeedMinutes, 465);
  assert.equal(sleep?.provenance.sources[0], "WHOOP live API");
});

test("partial live sleep and recovery records retain confirmed imported values", () => {
  const sleeps = buildWhoopSleepObservations([
    liveSleep({ total_slow_wave_sleep_time_milli: null, sleep_needed_nap_milli: null, sleep_efficiency: null }),
  ], [exportSleep()]);
  assert.equal(sleeps.length, 1);
  assert.equal(sleeps[0]?.sleepMinutes, 420);
  assert.equal(sleeps[0]?.sleepNeedMinutes, 465);
  assert.equal(sleeps[0]?.sleepEfficiency, 88);
  assert.deepEqual(new Set(sleeps[0]?.provenance.sources), new Set(["WHOOP live API", "WHOOP export"]));

  const cycles = buildWhoopCycleObservations(
    [liveCycle({ hrv_rmssd_milli: null, recovery_score: 62 })], [exportCycle()], sleeps, NOW,
  );
  assert.equal(cycles.length, 1);
  assert.equal(cycles[0]?.sleepId, "sleep-1");
  assert.equal(cycles[0]?.recoveryScore, 62);
  assert.equal(cycles[0]?.hrv, 61);
  assert.equal(cycles[0]?.sleepMinutes, 420);
  assert.deepEqual(new Set(cycles[0]?.provenance.sources), new Set(["WHOOP live API", "WHOOP export"]));
});

test("recovery source sleep_id is honored and an unavailable linked sleep is not guessed", () => {
  const observations = buildWhoopCycleObservations([
    liveCycle({ recovery_raw_json: JSON.stringify({ sleep_id: "missing-sleep" }) }),
  ], [], [buildWhoopSleepObservations([liveSleep()], [])[0]!], NOW);
  assert.equal(observations[0]?.sleepId, null);
  assert.ok(observations[0]?.validity.some((item) => /IDs do not match/i.test(item)));
});

test("duplicate exports collapse by source identity and conflicting values are excluded", () => {
  const sleeps = buildWhoopSleepObservations([], [
    exportSleep(),
    exportSleep({ asleep_minutes: 390, sleep_need_minutes: null }),
  ]);
  assert.equal(sleeps.length, 1);
  assert.equal(sleeps[0]?.sleepMinutes, null);
  assert.equal(sleeps[0]?.sleepNeedMinutes, 465);
  assert.ok(sleeps[0]?.validity.some((item) => /Ambiguous duplicate export sleep values.*sleep duration/i.test(item)));

  const cycles = buildWhoopCycleObservations([], [
    exportCycle(),
    exportCycle({ hrv_rmssd_milli: 72 }),
  ], [], NOW);
  assert.equal(cycles.length, 1);
  assert.equal(cycles[0]?.recoveryScore, 70);
  assert.equal(cycles[0]?.hrv, null);
  assert.ok(cycles[0]?.validity.some((item) => /Ambiguous duplicate export cycle value excluded: hrv_rmssd_milli/i.test(item)));
});

test("a cycle with multiple candidate main sleeps is flagged and left unlinked", () => {
  const cycles = buildWhoopCycleObservations([
    liveCycle({ recovery_raw_json: "{}", sleep_id: "sleep-1" }),
    liveCycle({ recovery_raw_json: "{}", sleep_id: "sleep-2" }),
  ], [], buildWhoopSleepObservations([liveSleep(), liveSleep({ id: "sleep-2" })], []), NOW);
  assert.equal(cycles.length, 1);
  assert.equal(cycles[0]?.sleepId, null);
  assert.ok(cycles[0]?.validity.some((item) => /Multiple main sleeps.*ambiguous/i.test(item)));
});
