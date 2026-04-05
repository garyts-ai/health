import type {
  WhoopBodyMeasurementSummary,
  WhoopCycleSummary,
  WhoopRecoverySummary,
  WhoopSleepSummary,
  WhoopWorkoutSummary,
} from "@/lib/whoop/types";

function asNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

export function normalizeSleepRecord(record: Record<string, unknown>): WhoopSleepSummary {
  const score =
    typeof record.score === "object" && record.score !== null
      ? (record.score as Record<string, unknown>)
      : {};
  const stageSummary =
    typeof score.stage_summary === "object" && score.stage_summary !== null
      ? (score.stage_summary as Record<string, unknown>)
      : {};
  const sleepNeeded =
    typeof score.sleep_needed === "object" && score.sleep_needed !== null
      ? (score.sleep_needed as Record<string, unknown>)
      : {};

  return {
    id: asString(record.id) ?? crypto.randomUUID(),
    cycleId: asNumber(record.cycle_id),
    start: asString(record.start) ?? new Date(0).toISOString(),
    end: asString(record.end) ?? new Date(0).toISOString(),
    timezoneOffset: asString(record.timezone_offset),
    nap: asBoolean(record.nap),
    scoreState: asString(record.score_state),
    sleepPerformancePercentage: asNumber(score.sleep_performance_percentage),
    sleepConsistencyPercentage: asNumber(score.sleep_consistency_percentage),
    sleepEfficiencyPercentage: asNumber(score.sleep_efficiency_percentage),
    respiratoryRate: asNumber(score.respiratory_rate),
    totalInBedTimeMilli: asNumber(stageSummary.total_in_bed_time_milli),
    totalAwakeTimeMilli: asNumber(stageSummary.total_awake_time_milli),
    totalLightSleepTimeMilli: asNumber(stageSummary.total_light_sleep_time_milli),
    totalSlowWaveSleepTimeMilli: asNumber(
      stageSummary.total_slow_wave_sleep_time_milli,
    ),
    totalRemSleepTimeMilli: asNumber(stageSummary.total_rem_sleep_time_milli),
    sleepNeededBaselineMilli: asNumber(sleepNeeded.baseline_milli),
    sleepNeededDebtMilli: asNumber(sleepNeeded.need_from_sleep_debt_milli),
    sleepNeededStrainMilli: asNumber(sleepNeeded.need_from_recent_strain_milli),
    sleepNeededNapMilli: asNumber(sleepNeeded.need_from_recent_nap_milli),
    rawJson: JSON.stringify(record),
  };
}

export function normalizeRecoveryRecord(
  record: Record<string, unknown>,
): WhoopRecoverySummary {
  const score =
    typeof record.score === "object" && record.score !== null
      ? (record.score as Record<string, unknown>)
      : {};

  return {
    cycleId: asNumber(record.cycle_id) ?? -1,
    createdAt: asString(record.created_at) ?? new Date(0).toISOString(),
    updatedAt: asString(record.updated_at) ?? new Date(0).toISOString(),
    scoreState: asString(record.score_state),
    userCalibrating: asBoolean(record.user_calibrating),
    recoveryScore: asNumber(score.recovery_score),
    restingHeartRate: asNumber(score.resting_heart_rate),
    hrvRmssdMilli: asNumber(score.hrv_rmssd_milli),
    spo2Percentage: asNumber(score.spo2_percentage),
    skinTempCelsius: asNumber(score.skin_temp_celsius),
    rawJson: JSON.stringify(record),
  };
}

export function normalizeBodyMeasurementRecord(
  record: Record<string, unknown>,
): WhoopBodyMeasurementSummary {
  return {
    observedOn: new Date().toISOString().slice(0, 10),
    observedAt: new Date().toISOString(),
    heightMeter: asNumber(record.height_meter),
    weightKilogram: asNumber(record.weight_kilogram),
    maxHeartRate: asNumber(record.max_heart_rate),
    rawJson: JSON.stringify(record),
  };
}

export function normalizeCycleRecord(record: Record<string, unknown>): WhoopCycleSummary {
  const score =
    typeof record.score === "object" && record.score !== null
      ? (record.score as Record<string, unknown>)
      : {};

  return {
    id: asNumber(record.id) ?? -1,
    start: asString(record.start) ?? new Date(0).toISOString(),
    end: asString(record.end) ?? new Date(0).toISOString(),
    timezoneOffset: asString(record.timezone_offset),
    scoreState: asString(record.score_state),
    strain: asNumber(score.strain),
    kilojoule: asNumber(score.kilojoule),
    averageHeartRate: asNumber(score.average_heart_rate),
    maxHeartRate: asNumber(score.max_heart_rate),
    rawJson: JSON.stringify(record),
  };
}

export function normalizeWorkoutRecord(
  record: Record<string, unknown>,
): WhoopWorkoutSummary {
  const score =
    typeof record.score === "object" && record.score !== null
      ? (record.score as Record<string, unknown>)
      : {};
  const sport =
    typeof record.sport === "object" && record.sport !== null
      ? (record.sport as Record<string, unknown>)
      : {};

  return {
    id: asString(record.id) ?? crypto.randomUUID(),
    sportId: asNumber(record.sport_id),
    sportName: asString(record.sport_name) ?? asString(sport.name),
    start: asString(record.start) ?? new Date(0).toISOString(),
    end: asString(record.end) ?? new Date(0).toISOString(),
    timezoneOffset: asString(record.timezone_offset),
    scoreState: asString(record.score_state),
    strain: asNumber(score.strain),
    averageHeartRate: asNumber(score.average_heart_rate),
    maxHeartRate: asNumber(score.max_heart_rate),
    kilojoule: asNumber(score.kilojoule),
    percentRecorded: asNumber(score.percent_recorded),
    rawJson: JSON.stringify(record),
  };
}

export function getLatestRecord<T extends { start?: string; createdAt?: string }>(records: T[]) {
  return [...records].sort((left, right) => {
    const leftValue = left.start ?? left.createdAt ?? "";
    const rightValue = right.start ?? right.createdAt ?? "";

    return rightValue.localeCompare(leftValue);
  })[0] ?? null;
}
