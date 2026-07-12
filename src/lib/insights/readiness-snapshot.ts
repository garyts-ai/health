import type {
  WhoopCycleSummary,
  WhoopRecoverySummary,
  WhoopSleepSummary,
} from "@/lib/whoop/types";

export const READINESS_MAX_AGE_MS = 36 * 60 * 60 * 1_000;
export const READINESS_BASELINE_MAX_SAMPLES = 7;
export const READINESS_BASELINE_MIN_SAMPLES = 4;

export type ObservationSource = "whoop_api" | "whoop_export" | "hevy" | "derived";

export type ObservationStatus = "valid" | "stale" | "missing" | "invalid";

export type ReadinessValidityReason =
  | "missing"
  | "mismatched_cycle"
  | "nap_only"
  | "unscored"
  | "stale"
  | "invalid"
  | "future_observation"
  | "insufficient_samples";

export type ObservationEnvelope<T> = {
  value: T | null;
  source: ObservationSource;
  observedAt: string | null;
  recordId: string | null;
  cycleId: string | null;
  status: ObservationStatus;
  reason: ReadinessValidityReason | null;
};

export type ReadinessBaseline = {
  value: number | null;
  sampleCount: number;
  windowSize: number;
  status: "available" | "insufficient" | "missing";
};

export type ReadinessSnapshot = {
  decisionAt: string;
  status: "available" | "unavailable";
  reasons: ReadinessValidityReason[];
  cycleId: number | null;
  sleep: ObservationEnvelope<WhoopSleepSummary>;
  recovery: ObservationEnvelope<WhoopRecoverySummary>;
  cycle: ObservationEnvelope<WhoopCycleSummary>;
  baselines: {
    recoveryScore: ReadinessBaseline;
    restingHeartRate: ReadinessBaseline;
    hrvRmssd: ReadinessBaseline;
    spo2Percentage: ReadinessBaseline;
    respiratoryRate: ReadinessBaseline;
    skinTempCelsius: ReadinessBaseline;
    strain: ReadinessBaseline;
  };
};

export type ReadinessSnapshotInput = {
  decisionAt: Date;
  sleepRows: WhoopSleepSummary[];
  recoveryRows: WhoopRecoverySummary[];
  cycleRows: WhoopCycleSummary[];
};

function average(values: Array<number | null>) {
  const present = values.filter((value): value is number => typeof value === "number");
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
}

function hasMainSleepDuration(sleep: WhoopSleepSummary) {
  return [
    sleep.totalLightSleepTimeMilli,
    sleep.totalSlowWaveSleepTimeMilli,
    sleep.totalRemSleepTimeMilli,
  ].some((value) => typeof value === "number" && value > 0);
}

function scoreIsValid(scoreState: string | null) {
  return scoreState?.toUpperCase() === "SCORED";
}

function parseTime(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function ageReason(observedAt: string | null, decisionAt: number): ReadinessValidityReason | null {
  const observedTime = parseTime(observedAt);
  if (observedTime === null) return "invalid";
  if (observedTime > decisionAt) return "future_observation";
  if (decisionAt - observedTime > READINESS_MAX_AGE_MS) return "stale";
  return null;
}

function envelope<T>({
  value,
  observedAt,
  recordId,
  cycleId,
  status,
  reason = null,
}: {
  value: T | null;
  observedAt: string | null;
  recordId: string | null;
  cycleId: number | null;
  status: ObservationStatus;
  reason?: ReadinessValidityReason | null;
}): ObservationEnvelope<T> {
  return {
    value,
    source: "whoop_api",
    observedAt,
    recordId,
    cycleId: cycleId === null ? null : String(cycleId),
    status,
    reason,
  };
}

function baseline(values: number[], windowSize = READINESS_BASELINE_MAX_SAMPLES): ReadinessBaseline {
  const sampleCount = values.length;
  return {
    value: sampleCount >= READINESS_BASELINE_MIN_SAMPLES ? average(values) : null,
    sampleCount,
    windowSize,
    status:
      sampleCount >= READINESS_BASELINE_MIN_SAMPLES
        ? "available"
        : sampleCount === 0
          ? "missing"
          : "insufficient",
  };
}

function validPriorCycleRows(
  input: ReadinessSnapshotInput,
  selectedCycleId: number | null,
) {
  const cycles = [...input.cycleRows]
    .filter((cycle) => cycle.id !== selectedCycleId && scoreIsValid(cycle.scoreState))
    .sort((left, right) => Date.parse(right.end) - Date.parse(left.end));
  const seen = new Set<number>();
  const rows: Array<{
    cycle: WhoopCycleSummary;
    sleep: WhoopSleepSummary;
    recovery: WhoopRecoverySummary;
  }> = [];

  for (const cycle of cycles) {
    if (seen.has(cycle.id)) continue;
    const sleep = input.sleepRows.find(
      (row) => row.cycleId === cycle.id && !row.nap && scoreIsValid(row.scoreState),
    );
    const recovery = input.recoveryRows.find(
      (row) => row.cycleId === cycle.id && scoreIsValid(row.scoreState),
    );
    if (!sleep || !recovery) continue;
    if (ageReason(sleep.end, input.decisionAt.getTime()) === "invalid") continue;
    seen.add(cycle.id);
    rows.push({ cycle, sleep, recovery });
    if (rows.length >= READINESS_BASELINE_MAX_SAMPLES) break;
  }

  return rows;
}

function buildBaselines(input: ReadinessSnapshotInput, selectedCycleId: number | null) {
  const prior = validPriorCycleRows(input, selectedCycleId);
  return {
    recoveryScore: baseline(prior.map((row) => row.recovery.recoveryScore).filter((value): value is number => value !== null)),
    restingHeartRate: baseline(prior.map((row) => row.recovery.restingHeartRate).filter((value): value is number => value !== null)),
    hrvRmssd: baseline(prior.map((row) => row.recovery.hrvRmssdMilli).filter((value): value is number => value !== null)),
    spo2Percentage: baseline(prior.map((row) => row.recovery.spo2Percentage).filter((value): value is number => value !== null)),
    respiratoryRate: baseline(prior.map((row) => row.sleep.respiratoryRate).filter((value): value is number => value !== null)),
    skinTempCelsius: baseline(prior.map((row) => row.recovery.skinTempCelsius).filter((value): value is number => value !== null)),
    strain: baseline(prior.map((row) => row.cycle.strain).filter((value): value is number => value !== null)),
  };
}

function invalidEnvelope<T>(reason: ReadinessValidityReason): ObservationEnvelope<T> {
  return envelope({
    value: null as T | null,
    observedAt: null,
    recordId: null,
    cycleId: null,
    status: reason === "stale" ? "stale" : reason === "missing" ? "missing" : "invalid",
    reason,
  });
}

export function buildReadinessSnapshot(input: ReadinessSnapshotInput): ReadinessSnapshot {
  const decisionAt = input.decisionAt.getTime();
  const sleeps = [...input.sleepRows].sort((left, right) => Date.parse(right.end) - Date.parse(left.end));
  const cycles = new Map(input.cycleRows.map((row) => [row.id, row]));
  const recoveries = new Map(input.recoveryRows.map((row) => [row.cycleId, row]));
  const reasons = new Set<ReadinessValidityReason>();

  for (const sleep of sleeps) {
    if (sleep.nap) {
      reasons.add("nap_only");
      continue;
    }
    if (sleep.cycleId === null) {
      reasons.add("missing");
      continue;
    }

    const cycle = cycles.get(sleep.cycleId);
    const recovery = recoveries.get(sleep.cycleId);
    if (!cycle || !recovery) {
      const hasOtherCycle = input.recoveryRows.some((row) => row.cycleId !== sleep.cycleId);
      reasons.add(hasOtherCycle || !cycle ? "mismatched_cycle" : "missing");
      continue;
    }
    if (!scoreIsValid(sleep.scoreState) || !scoreIsValid(cycle.scoreState) || !scoreIsValid(recovery.scoreState)) {
      reasons.add("unscored");
      continue;
    }

    const sleepAgeReason = ageReason(sleep.end, decisionAt);
    const cycleAgeReason = ageReason(cycle.end, decisionAt);
    const recoveryAgeReason = ageReason(recovery.updatedAt || recovery.createdAt, decisionAt);
    if (sleepAgeReason || cycleAgeReason || recoveryAgeReason) {
      reasons.add(sleepAgeReason ?? cycleAgeReason ?? recoveryAgeReason ?? "invalid");
      continue;
    }
    if (recovery.recoveryScore === null || !hasMainSleepDuration(sleep)) {
      reasons.add("missing");
      continue;
    }

    return {
      decisionAt: input.decisionAt.toISOString(),
      status: "available",
      reasons: [],
      cycleId: cycle.id,
      sleep: envelope({
        value: sleep,
        observedAt: sleep.end,
        recordId: sleep.id,
        cycleId: cycle.id,
        status: "valid",
      }),
      recovery: envelope({
        value: recovery,
        observedAt: recovery.updatedAt || recovery.createdAt,
        recordId: String(recovery.cycleId),
        cycleId: cycle.id,
        status: "valid",
      }),
      cycle: envelope({
        value: cycle,
        observedAt: cycle.end,
        recordId: String(cycle.id),
        cycleId: cycle.id,
        status: "valid",
      }),
      baselines: buildBaselines(input, cycle.id),
    };
  }

  const reason = [...reasons][0] ?? "missing";
  const latestSleep = sleeps[0] ?? null;
  const latestRecovery = [...input.recoveryRows].sort(
    (left, right) => Date.parse(right.updatedAt || right.createdAt) - Date.parse(left.updatedAt || left.createdAt),
  )[0] ?? null;
  const latestCycle = [...input.cycleRows].sort(
    (left, right) => Date.parse(right.end) - Date.parse(left.end),
  )[0] ?? null;
  return {
    decisionAt: input.decisionAt.toISOString(),
    status: "unavailable",
    reasons: [...reasons].length ? [...reasons] : ["missing"],
    cycleId: null,
    sleep: latestSleep
      ? envelope<WhoopSleepSummary>({
          value: null,
          observedAt: latestSleep.end,
          recordId: latestSleep.id,
          cycleId: latestSleep.cycleId,
          status: reason === "stale" ? "stale" : "invalid",
          reason,
        })
      : invalidEnvelope<WhoopSleepSummary>("missing"),
    recovery: latestRecovery
      ? envelope<WhoopRecoverySummary>({
          value: null,
          observedAt: latestRecovery.updatedAt || latestRecovery.createdAt,
          recordId: String(latestRecovery.cycleId),
          cycleId: latestRecovery.cycleId,
          status: reason === "stale" ? "stale" : "invalid",
          reason,
        })
      : invalidEnvelope<WhoopRecoverySummary>("missing"),
    cycle: latestCycle
      ? envelope<WhoopCycleSummary>({
          value: null,
          observedAt: latestCycle.end,
          recordId: String(latestCycle.id),
          cycleId: latestCycle.id,
          status: reason === "stale" ? "stale" : "invalid",
          reason,
        })
      : invalidEnvelope<WhoopCycleSummary>("missing"),
    baselines: buildBaselines(input, null),
  };
}
