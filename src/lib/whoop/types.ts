export type WhoopSleepSummary = {
  id: string;
  cycleId: number | null;
  start: string;
  end: string;
  timezoneOffset: string | null;
  nap: boolean;
  scoreState: string | null;
  sleepPerformancePercentage: number | null;
  sleepConsistencyPercentage: number | null;
  sleepEfficiencyPercentage: number | null;
  respiratoryRate: number | null;
  totalInBedTimeMilli: number | null;
  totalAwakeTimeMilli: number | null;
  totalLightSleepTimeMilli: number | null;
  totalSlowWaveSleepTimeMilli: number | null;
  totalRemSleepTimeMilli: number | null;
  sleepNeededBaselineMilli: number | null;
  sleepNeededDebtMilli: number | null;
  sleepNeededStrainMilli: number | null;
  sleepNeededNapMilli: number | null;
  rawJson: string;
};

export type WhoopRecoverySummary = {
  cycleId: number;
  createdAt: string;
  updatedAt: string;
  scoreState: string | null;
  userCalibrating: boolean;
  recoveryScore: number | null;
  restingHeartRate: number | null;
  hrvRmssdMilli: number | null;
  spo2Percentage: number | null;
  skinTempCelsius: number | null;
  rawJson: string;
};

export type WhoopBodyMeasurementSummary = {
  observedOn: string;
  observedAt: string;
  heightMeter: number | null;
  weightKilogram: number | null;
  maxHeartRate: number | null;
  rawJson: string;
};

export type WhoopCycleSummary = {
  id: number;
  start: string;
  end: string;
  timezoneOffset: string | null;
  scoreState: string | null;
  strain: number | null;
  kilojoule: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  rawJson: string;
};

export type WhoopWorkoutSummary = {
  id: string;
  sportId: number | null;
  sportName: string | null;
  start: string;
  end: string;
  timezoneOffset: string | null;
  scoreState: string | null;
  strain: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  kilojoule: number | null;
  percentRecorded: number | null;
  rawJson: string;
};

export type WhoopConnectionStatus = {
  connected: boolean;
  isConfigured: boolean;
  status: string;
  hasOfflineAccess: boolean;
  userId: number | null;
  email: string | null;
  lastConnectedAt: string | null;
  lastSyncStartedAt: string | null;
  lastSyncCompletedAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  isStale: boolean;
  latestCycle: WhoopCycleSummary | null;
  latestSleep: WhoopSleepSummary | null;
  latestRecovery: WhoopRecoverySummary | null;
  latestBodyMeasurement: WhoopBodyMeasurementSummary | null;
  latestWorkouts: WhoopWorkoutSummary[];
};
