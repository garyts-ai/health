import { calendarDateKey, HEALTH_TIME_ZONE } from "@/lib/calendar";
import type {
  SourceProvenance,
  WhoopCycleObservation,
  WhoopSleepObservation,
} from "@/lib/longitudinal/types";

export type LiveCycleRecord = {
  id: string | number;
  start: string;
  end: string | null;
  timezone_offset: string | null;
  score_state: string | null;
  strain: number | null;
  synced_at: string;
  recovery_score_state: string | null;
  user_calibrating: number | boolean | null;
  recovery_raw_json: string | null;
  recovery_synced_at: string | null;
  recovery_score: number | null;
  resting_heart_rate: number | null;
  hrv_rmssd_milli: number | null;
  skin_temp_celsius: number | null;
  spo2_percentage: number | null;
  sleep_id: string | null;
  sleep_start: string | null;
  sleep_end: string | null;
  sleep_nap: number | boolean | null;
  sleep_score_state: string | null;
  total_light_sleep_time_milli: number | null;
  total_slow_wave_sleep_time_milli: number | null;
  total_rem_sleep_time_milli: number | null;
  sleep_efficiency: number | null;
  sleep_consistency: number | null;
  respiratory_rate: number | null;
  sleep_needed_baseline_milli: number | null;
  sleep_needed_debt_milli: number | null;
  sleep_needed_strain_milli: number | null;
  sleep_needed_nap_milli: number | null;
};

export type ExportCycleRecord = {
  cycle_start: string;
  cycle_end: string | null;
  timezone_offset: string | null;
  recovery_score: number | null;
  resting_heart_rate: number | null;
  hrv_rmssd_milli: number | null;
  skin_temp_celsius: number | null;
  spo2_percentage: number | null;
  day_strain: number | null;
  sleep_onset: string | null;
  wake_onset: string | null;
  sleep_performance: number | null;
  respiratory_rate: number | null;
  asleep_minutes: number | null;
  sleep_need_minutes: number | null;
  sleep_efficiency: number | null;
  sleep_consistency: number | null;
};

export type LiveSleepRecord = {
  id: string;
  cycle_id: string | number | null;
  start: string;
  end: string;
  timezone_offset: string | null;
  nap: number | boolean;
  score_state: string | null;
  total_in_bed_time_milli: number | null;
  total_awake_time_milli: number | null;
  total_light_sleep_time_milli: number | null;
  total_slow_wave_sleep_time_milli: number | null;
  total_rem_sleep_time_milli: number | null;
  sleep_needed_baseline_milli: number | null;
  sleep_needed_debt_milli: number | null;
  sleep_needed_strain_milli: number | null;
  sleep_needed_nap_milli: number | null;
  sleep_efficiency: number | null;
  sleep_consistency: number | null;
  synced_at: string;
};

export type ExportSleepRecord = {
  sleep_onset: string;
  cycle_start: string | null;
  wake_onset: string | null;
  asleep_minutes: number | null;
  sleep_need_minutes: number | null;
  sleep_efficiency: number | null;
  sleep_consistency: number | null;
  nap: number | boolean;
};

function identity(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? String(timestamp) : value.trim();
}

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isTrue(value: number | boolean | null | undefined) {
  return value === true || value === 1;
}

function linkedSleepId(value: string | null) {
  if (!value) return null;
  try {
    const payload = JSON.parse(value) as { sleep_id?: unknown; sleepId?: unknown };
    const sleepId = payload.sleep_id ?? payload.sleepId;
    return typeof sleepId === "string" ? sleepId : null;
  } catch {
    return null;
  }
}

function completeNeed(components: Array<number | null>) {
  if (components.some((value) => !finite(value))) return null;
  return (components as number[]).reduce((sum, value) => sum + value, 0) / 60_000;
}

function provenance(source: "WHOOP live API" | "WHOOP export", id: string, at: string, date: string, sync: string | null): SourceProvenance {
  return {
    sources: [source], sourceRecordIds: [id], rawTimestamps: [at], normalizedDates: [date],
    timezone: HEALTH_TIME_ZONE, syncTimestamps: sync ? [sync] : [],
  };
}

function liveSleepRecord(row: LiveSleepRecord): WhoopSleepObservation {
  const date = calendarDateKey(row.end);
  const scored = row.score_state === "SCORED";
  const minutes = scored && [row.total_light_sleep_time_milli, row.total_slow_wave_sleep_time_milli, row.total_rem_sleep_time_milli].every(finite)
    ? (row.total_light_sleep_time_milli! + row.total_slow_wave_sleep_time_milli! + row.total_rem_sleep_time_milli!) / 60_000
    : null;
  const need = scored ? completeNeed([row.sleep_needed_baseline_milli, row.sleep_needed_debt_milli, row.sleep_needed_strain_milli, row.sleep_needed_nap_milli]) : null;
  return {
    id: row.id, cycleId: row.cycle_id === null ? null : String(row.cycle_id), date,
    source: "WHOOP live API", startedAt: row.start, endedAt: row.end, nap: isTrue(row.nap),
    scoreState: row.score_state, sleepMinutes: minutes, sleepNeedMinutes: need,
    sleepEfficiency: scored ? row.sleep_efficiency : null, sleepConsistency: scored ? row.sleep_consistency : null,
    validity: [!scored ? "Sleep score is not complete." : null, !isTrue(row.nap) && !finite(need) ? "Recorded sleep-need components are incomplete." : null].filter((item): item is string => Boolean(item)),
    provenance: provenance("WHOOP live API", row.id, row.end, date, row.synced_at),
  };
}

function exportSleepRecord(row: ExportSleepRecord): WhoopSleepObservation {
  const date = calendarDateKey(row.wake_onset ?? row.sleep_onset);
  return {
    id: `export-sleep:${identity(row.sleep_onset) ?? row.sleep_onset}`,
    cycleId: row.cycle_start ? `export-cycle:${identity(row.cycle_start)}` : null,
    date, source: "WHOOP export", startedAt: row.sleep_onset, endedAt: row.wake_onset ?? row.sleep_onset,
    nap: isTrue(row.nap), scoreState: "SCORED", sleepMinutes: row.asleep_minutes,
    sleepNeedMinutes: row.sleep_need_minutes, sleepEfficiency: row.sleep_efficiency,
    sleepConsistency: row.sleep_consistency,
    validity: finite(row.sleep_need_minutes) ? [] : ["Recorded sleep-need total is unavailable."],
    provenance: {
      sources: ["WHOOP export"], sourceRecordIds: [`export-sleep:${identity(row.sleep_onset) ?? row.sleep_onset}`],
      rawTimestamps: [row.sleep_onset, row.wake_onset ?? row.sleep_onset], normalizedDates: [date],
      timezone: HEALTH_TIME_ZONE, syncTimestamps: [],
    },
  };
}

function uniqueObserved<T extends number | string | boolean>(values: Array<T | null | undefined>) {
  const observed = values.filter((value): value is T => value !== null && value !== undefined);
  const distinct = [...new Set(observed)];
  return { value: distinct.length === 1 ? distinct[0]! : null, conflict: distinct.length > 1 };
}

function mergeExportSleeps(rows: ExportSleepRecord[]) {
  const groups = new Map<string, ExportSleepRecord[]>();
  for (const row of rows) {
    const key = identity(row.sleep_onset);
    if (key) groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()].map((group) => {
    const first = group[0]!;
    const base = exportSleepRecord(first);
    if (group.length === 1) return base;
    const ids = uniqueObserved(group.map((row) => row.cycle_start === null ? null : identity(row.cycle_start) ?? row.cycle_start));
    const naps = uniqueObserved(group.map((row) => isTrue(row.nap)));
    const minutes = uniqueObserved(group.map((row) => row.asleep_minutes));
    const need = uniqueObserved(group.map((row) => row.sleep_need_minutes));
    const efficiency = uniqueObserved(group.map((row) => row.sleep_efficiency));
    const consistency = uniqueObserved(group.map((row) => row.sleep_consistency));
    const endedAt = uniqueObserved(group.map((row) => row.wake_onset));
    const conflictFields = [
      ...(ids.conflict ? ["cycle link"] : []), ...(naps.conflict ? ["sleep type"] : []),
      ...(minutes.conflict ? ["sleep duration"] : []), ...(need.conflict ? ["sleep need"] : []),
      ...(efficiency.conflict ? ["sleep efficiency"] : []), ...(consistency.conflict ? ["sleep consistency"] : []),
      ...(endedAt.conflict ? ["sleep end time"] : []),
    ];
    const nap = naps.conflict ? true : naps.value ?? base.nap;
    return {
      ...base,
      cycleId: ids.conflict ? null : ids.value ? `export-cycle:${ids.value}` : base.cycleId,
      endedAt: endedAt.conflict ? base.endedAt : endedAt.value ?? base.endedAt,
      nap,
      sleepMinutes: minutes.conflict ? null : minutes.value ?? null,
      sleepNeedMinutes: need.conflict ? null : need.value ?? null,
      sleepEfficiency: efficiency.conflict ? null : efficiency.value ?? null,
      sleepConsistency: consistency.conflict ? null : consistency.value ?? null,
      validity: [...base.validity, ...(conflictFields.length ? [`Ambiguous duplicate export sleep values excluded: ${conflictFields.join(", ")}.`] : [])],
      provenance: {
        ...base.provenance,
        rawTimestamps: [...new Set(group.flatMap((row) => [row.sleep_onset, row.wake_onset ?? row.sleep_onset]))],
      },
    } satisfies WhoopSleepObservation;
  });
}

function mergeExportCycles(rows: ExportCycleRecord[]) {
  const groups = new Map<string, ExportCycleRecord[]>();
  for (const row of rows) {
    const key = identity(row.cycle_start);
    if (key) groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()].map((group) => {
    const first = group[0]!;
    const merged: ExportCycleRecord = {
      cycle_start: first.cycle_start,
      cycle_end: null, timezone_offset: null, recovery_score: null, resting_heart_rate: null,
      hrv_rmssd_milli: null, skin_temp_celsius: null, spo2_percentage: null, day_strain: null,
      sleep_onset: null, wake_onset: null, sleep_performance: null, respiratory_rate: null,
      asleep_minutes: null, sleep_need_minutes: null, sleep_efficiency: null, sleep_consistency: null,
    };
    const conflicts: string[] = [];
    const nullableFields = [
      "cycle_end", "timezone_offset", "recovery_score", "resting_heart_rate", "hrv_rmssd_milli",
      "skin_temp_celsius", "spo2_percentage", "day_strain", "sleep_onset", "wake_onset",
      "sleep_performance", "respiratory_rate", "asleep_minutes", "sleep_need_minutes",
      "sleep_efficiency", "sleep_consistency",
    ] as const;
    for (const field of nullableFields) {
      const result = uniqueObserved(group.map((row) => row[field]));
      (merged as unknown as Record<string, unknown>)[field] = result.value;
      if (result.conflict) conflicts.push(field);
    }
    return { row: merged, conflicts };
  });
}

export function buildWhoopSleepObservations(live: LiveSleepRecord[], exported: ExportSleepRecord[]) {
  const exportObservations = mergeExportSleeps(exported);
  const exportsByStart = new Map(exportObservations.map((record) => [identity(record.startedAt), record]));
  const liveStarts = new Set<string>();
  const records: WhoopSleepObservation[] = [];
  for (const row of live) {
    const startIdentity = identity(row.start);
    if (!startIdentity) continue;
    liveStarts.add(startIdentity);
    const api = liveSleepRecord(row);
    const archived = exportsByStart.get(startIdentity);
    if (api.scoreState === "SCORED" && archived) records.push({
      ...api,
      cycleId: api.cycleId ?? archived.cycleId,
      sleepMinutes: finite(api.sleepMinutes) ? api.sleepMinutes : archived.sleepMinutes,
      sleepNeedMinutes: finite(api.sleepNeedMinutes) ? api.sleepNeedMinutes : archived.sleepNeedMinutes,
      sleepEfficiency: finite(api.sleepEfficiency) ? api.sleepEfficiency : archived.sleepEfficiency,
      sleepConsistency: finite(api.sleepConsistency) ? api.sleepConsistency : archived.sleepConsistency,
      validity: [
        ...(finite(api.sleepMinutes) || finite(archived.sleepMinutes) ? [] : ["Recorded sleep duration is incomplete."]),
        ...(finite(api.sleepNeedMinutes) || finite(archived.sleepNeedMinutes) ? [] : ["Recorded sleep-need components are incomplete."]),
      ],
      provenance: {
        sources: [...new Set([...api.provenance.sources, ...archived.provenance.sources])],
        sourceRecordIds: [...new Set([...api.provenance.sourceRecordIds, ...archived.provenance.sourceRecordIds])],
        rawTimestamps: [...new Set([...api.provenance.rawTimestamps, ...archived.provenance.rawTimestamps])],
        normalizedDates: [...new Set([...api.provenance.normalizedDates, ...archived.provenance.normalizedDates])],
        timezone: HEALTH_TIME_ZONE,
        syncTimestamps: [...new Set([...api.provenance.syncTimestamps, ...archived.provenance.syncTimestamps])],
      },
    });
    else if (api.scoreState === "SCORED") records.push(api);
    else if (archived) records.push(archived);
  }
  for (const record of exportObservations) {
    const key = identity(record.startedAt);
    if (key && !liveStarts.has(key)) records.push(record);
  }
  return records.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

function liveCycleRecord(row: LiveCycleRecord, sleep: WhoopSleepObservation | null, now: Date): WhoopCycleObservation {
  const date = calendarDateKey(sleep?.endedAt ?? row.end ?? row.start);
  const cycleScored = row.score_state === "SCORED";
  const recoveryScored = row.recovery_score_state === "SCORED" && !isTrue(row.user_calibrating);
  const sleepScored = sleep?.scoreState === "SCORED";
  const completed = Boolean(row.end && Date.parse(row.end) <= now.getTime());
  const validity = [
    !completed ? "Physiological cycle is incomplete." : null,
    !cycleScored ? "Cycle strain score is not complete." : null,
    !recoveryScored ? "Recovery score is unscorable, pending, or calibrating." : null,
    sleep && !sleepScored ? "Main sleep score is not complete." : null,
    row.sleep_id && sleep?.id !== row.sleep_id ? "Recovery and sleep IDs do not match." : null,
  ].filter((item): item is string => Boolean(item));
  const sources: Array<"WHOOP live API" | "WHOOP export"> = ["WHOOP live API"];
  const sourceRows = [String(row.id)];
  const timestamp = sleep?.endedAt ?? row.end ?? row.start;
  return {
    id: `live-cycle:${row.id}`, date, source: "WHOOP live API", cycleId: String(row.id),
    sleepId: sleep?.id ?? null, startedAt: row.start, endedAt: row.end,
    sleepStartedAt: sleep?.startedAt ?? null, sleepEndedAt: sleep?.endedAt ?? null,
    completed,
    scoreState: !cycleScored ? row.score_state : row.recovery_score_state,
    recoveryValid: recoveryScored,
    sleepValid: sleepScored,
    strainValid: cycleScored && completed,
    recoveryScore: recoveryScored ? row.recovery_score : null,
    restingHeartRate: recoveryScored ? row.resting_heart_rate : null,
    hrv: recoveryScored ? row.hrv_rmssd_milli : null,
    spo2: recoveryScored ? row.spo2_percentage : null,
    skinTemperature: recoveryScored ? row.skin_temp_celsius : null,
    strain: cycleScored && completed ? row.strain : null,
    respiratoryRate: sleepScored ? row.respiratory_rate : null,
    sleepMinutes: sleepScored ? sleep?.sleepMinutes ?? null : null,
    sleepNeedMinutes: sleepScored ? sleep?.sleepNeedMinutes ?? null : null,
    sleepEfficiency: sleepScored ? sleep?.sleepEfficiency ?? null : null,
    sleepConsistency: sleepScored ? sleep?.sleepConsistency ?? null : null,
    calibrating: isTrue(row.user_calibrating), validity,
    provenance: provenance(sources[0], sourceRows[0], timestamp, date, row.recovery_synced_at ?? row.synced_at),
  };
}

function exportCycleRecord(row: ExportCycleRecord, now: Date, sleep: WhoopSleepObservation | null = null, ambiguity: string[] = []): WhoopCycleObservation {
  const date = calendarDateKey(row.wake_onset ?? row.cycle_end ?? row.cycle_start);
  const completed = Boolean(row.cycle_end && Date.parse(row.cycle_end) <= now.getTime());
  const validity = [...[!completed ? "Physiological cycle is incomplete." : null], ...ambiguity.map((item) => `Ambiguous duplicate export cycle value excluded: ${item}.`)].filter((item): item is string => Boolean(item));
  return {
    id: `export-cycle:${identity(row.cycle_start)}`, date, source: "WHOOP export",
    cycleId: `export-cycle:${identity(row.cycle_start)}`, sleepId: sleep?.id ?? null,
    startedAt: row.cycle_start, endedAt: row.cycle_end,
    sleepStartedAt: sleep?.startedAt ?? row.sleep_onset, sleepEndedAt: sleep?.endedAt ?? row.wake_onset, completed,
    scoreState: completed ? "SCORED" : "PENDING_SCORE",
    recoveryValid: completed, sleepValid: completed, strainValid: completed,
    recoveryScore: row.recovery_score, restingHeartRate: row.resting_heart_rate,
    hrv: row.hrv_rmssd_milli, spo2: row.spo2_percentage, skinTemperature: row.skin_temp_celsius,
    strain: completed ? row.day_strain : null, respiratoryRate: row.respiratory_rate,
    sleepMinutes: sleep?.sleepMinutes ?? row.asleep_minutes,
    sleepNeedMinutes: sleep?.sleepNeedMinutes ?? row.sleep_need_minutes,
    sleepEfficiency: sleep?.sleepEfficiency ?? row.sleep_efficiency,
    sleepConsistency: sleep?.sleepConsistency ?? row.sleep_consistency,
    calibrating: false, validity,
    provenance: provenance("WHOOP export", row.cycle_start, row.wake_onset ?? row.cycle_end ?? row.cycle_start, date, null),
  };
}

export function buildWhoopCycleObservations(
  liveCycles: LiveCycleRecord[],
  exportedCycles: ExportCycleRecord[],
  sleeps: WhoopSleepObservation[],
  now: Date,
) {
  const mergedExports = mergeExportCycles(exportedCycles);
  const exportObservation = (row: ExportCycleRecord, conflicts: string[] = []) => {
    const sleep = sleeps.find((item) => !item.nap && identity(item.startedAt) === identity(row.sleep_onset)
      && (!row.wake_onset || identity(item.endedAt) === identity(row.wake_onset))) ?? null;
    return exportCycleRecord(row, now, sleep, conflicts);
  };
  const exportsByCycle = new Map(mergedExports.map(({ row, conflicts }) => [identity(row.cycle_start), exportObservation(row, conflicts)]));
  const liveCycleIds = new Set(liveCycles.map((row) => identity(row.start)).filter((value): value is string => Boolean(value)));
  const observations: WhoopCycleObservation[] = [];
  const cycles = new Map<string, LiveCycleRecord[]>();
  for (const row of liveCycles) cycles.set(String(row.id), [...(cycles.get(String(row.id)) ?? []), row]);
  for (const rows of cycles.values()) {
    const row = rows[0];
    const sleepId = linkedSleepId(row.recovery_raw_json);
    const candidates = rows.filter((candidate) => !isTrue(candidate.sleep_nap) && candidate.sleep_id);
    const candidateSleepIds = new Set(candidates.map((candidate) => candidate.sleep_id));
    const match = sleepId
      ? sleeps.find((sleep) => sleep.id === sleepId)
      : candidateSleepIds.size === 1
        ? sleeps.find((sleep) => sleep.id === candidates[0]?.sleep_id)
        : null;
    const live = liveCycleRecord({ ...row, sleep_id: sleepId }, match ?? null, now);
    if (!sleepId && candidateSleepIds.size > 1) live.validity.push("Multiple main sleeps match this cycle; recovery-to-sleep link is ambiguous.");
    const archived = exportsByCycle.get(identity(row.start));
    if (!archived) {
      observations.push(live);
      continue;
    }
    const latest = live.recoveryValid || live.sleepValid || live.strainValid ? live : archived;
    observations.push({
      ...latest,
      recoveryScore: live.recoveryValid ? live.recoveryScore ?? archived.recoveryScore : archived.recoveryScore,
      restingHeartRate: live.recoveryValid ? live.restingHeartRate ?? archived.restingHeartRate : archived.restingHeartRate,
      hrv: live.recoveryValid ? live.hrv ?? archived.hrv : archived.hrv,
      spo2: live.recoveryValid ? live.spo2 ?? archived.spo2 : archived.spo2,
      skinTemperature: live.recoveryValid ? live.skinTemperature ?? archived.skinTemperature : archived.skinTemperature,
      strain: live.strainValid ? live.strain ?? archived.strain : archived.strain,
      respiratoryRate: live.sleepValid ? live.respiratoryRate ?? archived.respiratoryRate : archived.respiratoryRate,
      sleepMinutes: live.sleepValid ? live.sleepMinutes ?? archived.sleepMinutes : archived.sleepMinutes,
      sleepNeedMinutes: live.sleepValid ? live.sleepNeedMinutes ?? archived.sleepNeedMinutes : archived.sleepNeedMinutes,
      sleepEfficiency: live.sleepValid ? live.sleepEfficiency ?? archived.sleepEfficiency : archived.sleepEfficiency,
      sleepConsistency: live.sleepValid ? live.sleepConsistency ?? archived.sleepConsistency : archived.sleepConsistency,
      recoveryValid: live.recoveryValid || archived.recoveryValid,
      sleepValid: live.sleepValid || archived.sleepValid,
      strainValid: live.strainValid || archived.strainValid,
      provenance: { ...latest.provenance, sources: ["WHOOP live API", "WHOOP export"], sourceRecordIds: [...latest.provenance.sourceRecordIds, archived.id] },
      validity: [...new Set([...live.validity, ...archived.validity])],
    });
  }
  for (const { row, conflicts } of mergedExports) {
    if (!liveCycleIds.has(identity(row.cycle_start) ?? "")) observations.push(exportObservation(row, conflicts));
  }
  return observations
    .filter((item) => Date.parse(item.startedAt) <= now.getTime())
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}
