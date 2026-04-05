import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeBodyMeasurementRecord,
  normalizeCycleRecord,
  getLatestRecord,
  normalizeRecoveryRecord,
  normalizeSleepRecord,
  normalizeWorkoutRecord,
} from "@/lib/whoop/normalize";

test("normalizeSleepRecord maps stage and need metrics", () => {
  const result = normalizeSleepRecord({
    id: "sleep-1",
    cycle_id: 42,
    start: "2026-04-01T01:00:00.000Z",
    end: "2026-04-01T08:00:00.000Z",
    timezone_offset: "-04:00",
    nap: false,
    score_state: "SCORED",
    score: {
      respiratory_rate: 15.5,
      sleep_performance_percentage: 95,
      sleep_consistency_percentage: 88,
      sleep_efficiency_percentage: 91.2,
      stage_summary: {
        total_in_bed_time_milli: 100,
        total_awake_time_milli: 10,
        total_light_sleep_time_milli: 20,
        total_slow_wave_sleep_time_milli: 30,
        total_rem_sleep_time_milli: 40,
      },
      sleep_needed: {
        baseline_milli: 200,
        need_from_sleep_debt_milli: 15,
        need_from_recent_strain_milli: 9,
        need_from_recent_nap_milli: -5,
      },
    },
  });

  assert.equal(result.id, "sleep-1");
  assert.equal(result.totalRemSleepTimeMilli, 40);
  assert.equal(result.sleepNeededStrainMilli, 9);
});

test("normalizeRecoveryRecord maps score metrics", () => {
  const result = normalizeRecoveryRecord({
    cycle_id: 44,
    created_at: "2026-04-01T10:00:00.000Z",
    updated_at: "2026-04-01T10:01:00.000Z",
    score_state: "SCORED",
    user_calibrating: false,
    score: {
      recovery_score: 72,
      resting_heart_rate: 48,
      hrv_rmssd_milli: 82.5,
      spo2_percentage: 98,
      skin_temp_celsius: 0.1,
    },
  });

  assert.equal(result.cycleId, 44);
  assert.equal(result.recoveryScore, 72);
  assert.equal(result.hrvRmssdMilli, 82.5);
});

test("normalizeBodyMeasurementRecord maps body metrics", () => {
  const result = normalizeBodyMeasurementRecord({
    height_meter: 1.78,
    weight_kilogram: 79.4,
    max_heart_rate: 189,
  });

  assert.equal(result.heightMeter, 1.78);
  assert.equal(result.weightKilogram, 79.4);
  assert.equal(result.maxHeartRate, 189);
});

test("normalizeCycleRecord maps daily strain metrics", () => {
  const result = normalizeCycleRecord({
    id: 55,
    start: "2026-04-03T04:00:00.000Z",
    end: "2026-04-04T03:59:59.000Z",
    timezone_offset: "-04:00",
    score_state: "SCORED",
    score: {
      strain: 11.6,
      kilojoule: 1900.3,
      average_heart_rate: 78,
      max_heart_rate: 161,
    },
  });

  assert.equal(result.id, 55);
  assert.equal(result.strain, 11.6);
  assert.equal(result.kilojoule, 1900.3);
});

test("normalizeWorkoutRecord maps workout score metrics", () => {
  const result = normalizeWorkoutRecord({
    id: "workout-1",
    sport_id: 1,
    sport_name: "Strength Training",
    start: "2026-04-01T18:00:00.000Z",
    end: "2026-04-01T19:00:00.000Z",
    timezone_offset: "-04:00",
    score_state: "SCORED",
    score: {
      strain: 12.4,
      average_heart_rate: 135,
      max_heart_rate: 172,
      kilojoule: 520.2,
      percent_recorded: 98.2,
    },
  });

  assert.equal(result.id, "workout-1");
  assert.equal(result.sportName, "Strength Training");
  assert.equal(result.strain, 12.4);
});

test("getLatestRecord returns most recent item", () => {
  const latest = getLatestRecord([
    { start: "2026-03-31T00:00:00.000Z" },
    { start: "2026-04-02T00:00:00.000Z" },
    { start: "2026-04-01T00:00:00.000Z" },
  ]);

  assert.deepEqual(latest, { start: "2026-04-02T00:00:00.000Z" });
});
