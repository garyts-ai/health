import type {
  WhoopCycleSummary,
  WhoopRecoverySummary,
  WhoopSleepSummary,
} from "@/lib/whoop/types";

export const WHOOP_FIXTURE_DECISION_AT = "2026-05-02T14:00:00.000Z";

export type WhoopReadinessRecords = {
  decisionAt: string;
  cycle: WhoopCycleSummary | null;
  sleep: WhoopSleepSummary | null;
  recovery: WhoopRecoverySummary | null;
};

export function makeWhoopCycle(
  overrides: Partial<WhoopCycleSummary> = {},
): WhoopCycleSummary {
  const value: WhoopCycleSummary = {
    id: 1001,
    start: "2026-05-01T08:00:00.000Z",
    end: "2026-05-02T08:00:00.000Z",
    timezoneOffset: "-04:00",
    scoreState: "SCORED",
    strain: 10.2,
    kilojoule: 1_850,
    averageHeartRate: 76,
    maxHeartRate: 158,
    rawJson: "{}",
    ...overrides,
  };

  return {
    ...value,
    rawJson: overrides.rawJson ?? JSON.stringify({
      id: value.id,
      start: value.start,
      end: value.end,
      timezone_offset: value.timezoneOffset,
      score_state: value.scoreState,
      score: {
        strain: value.strain,
        kilojoule: value.kilojoule,
        average_heart_rate: value.averageHeartRate,
        max_heart_rate: value.maxHeartRate,
      },
    }),
  };
}

export function makeWhoopSleep(
  overrides: Partial<WhoopSleepSummary> = {},
): WhoopSleepSummary {
  const value: WhoopSleepSummary = {
    id: "sleep-1001",
    cycleId: 1001,
    start: "2026-05-02T03:00:00.000Z",
    end: "2026-05-02T11:00:00.000Z",
    timezoneOffset: "-04:00",
    nap: false,
    scoreState: "SCORED",
    sleepPerformancePercentage: 88,
    sleepConsistencyPercentage: 85,
    sleepEfficiencyPercentage: 90,
    respiratoryRate: 15,
    totalInBedTimeMilli: 30_240_000,
    totalAwakeTimeMilli: 1_440_000,
    totalLightSleepTimeMilli: 15_120_000,
    totalSlowWaveSleepTimeMilli: 5_040_000,
    totalRemSleepTimeMilli: 8_640_000,
    sleepNeededBaselineMilli: 28_800_000,
    sleepNeededDebtMilli: 0,
    sleepNeededStrainMilli: 0,
    sleepNeededNapMilli: 0,
    rawJson: "{}",
    ...overrides,
  };

  return {
    ...value,
    rawJson: overrides.rawJson ?? JSON.stringify({
      id: value.id,
      cycle_id: value.cycleId,
      start: value.start,
      end: value.end,
      timezone_offset: value.timezoneOffset,
      nap: value.nap,
      score_state: value.scoreState,
      score: {
        sleep_performance_percentage: value.sleepPerformancePercentage,
        sleep_consistency_percentage: value.sleepConsistencyPercentage,
        sleep_efficiency_percentage: value.sleepEfficiencyPercentage,
        respiratory_rate: value.respiratoryRate,
        stage_summary: {
          total_in_bed_time_milli: value.totalInBedTimeMilli,
          total_awake_time_milli: value.totalAwakeTimeMilli,
          total_light_sleep_time_milli: value.totalLightSleepTimeMilli,
          total_slow_wave_sleep_time_milli: value.totalSlowWaveSleepTimeMilli,
          total_rem_sleep_time_milli: value.totalRemSleepTimeMilli,
        },
        sleep_needed: {
          baseline_milli: value.sleepNeededBaselineMilli,
          need_from_sleep_debt_milli: value.sleepNeededDebtMilli,
          need_from_recent_strain_milli: value.sleepNeededStrainMilli,
          need_from_recent_nap_milli: value.sleepNeededNapMilli,
        },
      },
    }),
  };
}

export function makeWhoopRecovery(
  overrides: Partial<WhoopRecoverySummary> = {},
): WhoopRecoverySummary {
  const value: WhoopRecoverySummary = {
    cycleId: 1001,
    createdAt: "2026-05-02T11:01:00.000Z",
    updatedAt: "2026-05-02T11:02:00.000Z",
    scoreState: "SCORED",
    userCalibrating: false,
    recoveryScore: 70,
    restingHeartRate: 50,
    hrvRmssdMilli: 70,
    spo2Percentage: 98,
    skinTempCelsius: 0,
    rawJson: "{}",
    ...overrides,
  };

  return {
    ...value,
    rawJson: overrides.rawJson ?? JSON.stringify({
      cycle_id: value.cycleId,
      created_at: value.createdAt,
      updated_at: value.updatedAt,
      score_state: value.scoreState,
      user_calibrating: value.userCalibrating,
      score: {
        recovery_score: value.recoveryScore,
        resting_heart_rate: value.restingHeartRate,
        hrv_rmssd_milli: value.hrvRmssdMilli,
        spo2_percentage: value.spo2Percentage,
        skin_temp_celsius: value.skinTempCelsius,
      },
    }),
  };
}

export function makeScoredWhoopReadiness(
  overrides: Partial<WhoopReadinessRecords> = {},
): WhoopReadinessRecords {
  return {
    decisionAt: WHOOP_FIXTURE_DECISION_AT,
    cycle: makeWhoopCycle(),
    sleep: makeWhoopSleep(),
    recovery: makeWhoopRecovery(),
    ...overrides,
  };
}

export function makeStaleWhoopReadiness(): WhoopReadinessRecords {
  return makeScoredWhoopReadiness({
    cycle: makeWhoopCycle({
      start: "2026-04-29T08:00:00.000Z",
      end: "2026-04-30T08:00:00.000Z",
    }),
    sleep: makeWhoopSleep({
      start: "2026-04-30T03:00:00.000Z",
      end: "2026-04-30T11:00:00.000Z",
    }),
    recovery: makeWhoopRecovery({
      createdAt: "2026-04-30T11:01:00.000Z",
      updatedAt: "2026-04-30T11:02:00.000Z",
    }),
  });
}

export function makeMismatchedWhoopReadiness(): WhoopReadinessRecords {
  return makeScoredWhoopReadiness({
    recovery: makeWhoopRecovery({ cycleId: 2002 }),
  });
}

export function makeNapOnlyWhoopReadiness(): WhoopReadinessRecords {
  return makeScoredWhoopReadiness({
    sleep: makeWhoopSleep({ id: "nap-1001", nap: true }),
  });
}

export function makeUnscoredWhoopReadiness(): WhoopReadinessRecords {
  return makeScoredWhoopReadiness({
    cycle: makeWhoopCycle({ scoreState: "PENDING_SCORE" }),
    sleep: makeWhoopSleep({ scoreState: "PENDING_SCORE" }),
    recovery: makeWhoopRecovery({ scoreState: "PENDING_SCORE", recoveryScore: null }),
  });
}

export function makeMissingWhoopReadiness(): WhoopReadinessRecords {
  return makeScoredWhoopReadiness({
    cycle: null,
    sleep: null,
    recovery: null,
  });
}

export function makePartialWhoopReadiness(): WhoopReadinessRecords {
  return makeScoredWhoopReadiness({ recovery: null });
}
