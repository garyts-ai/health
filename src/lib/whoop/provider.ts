import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { dbAll, dbGet, dbInsert, dbRun } from "@/lib/db";
import { getWhoopEnv, hasWhoopEnv } from "@/lib/env";
import {
  WHOOP_API_BASE_URL,
  WHOOP_AUTH_URL,
  WHOOP_SCOPE_STRING,
  WHOOP_TOKEN_URL,
} from "@/lib/whoop/constants";
import {
  normalizeBodyMeasurementRecord,
  normalizeCycleRecord,
  getLatestRecord,
  normalizeRecoveryRecord,
  normalizeSleepRecord,
  normalizeWorkoutRecord,
} from "@/lib/whoop/normalize";
import type {
  WhoopBodyMeasurementSummary,
  WhoopConnectionStatus,
  WhoopCycleSummary,
  WhoopRecoverySummary,
  WhoopSleepSummary,
  WhoopWorkoutSummary,
} from "@/lib/whoop/types";

type WhoopTokenPayload = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  token_type?: string;
  scope?: string;
};

const STATE_COOKIE_NAME = "whoop_oauth_state";
const STALE_SYNC_MS = 1000 * 60 * 60 * 18;

function nowIso() {
  return new Date().toISOString();
}

function getScopesFromString(scopeString: string | null) {
  return scopeString?.split(" ").filter(Boolean) ?? [];
}

function computeExpiry(seconds?: number) {
  if (!seconds) {
    return null;
  }

  return new Date(Date.now() + seconds * 1000).toISOString();
}

function createStateToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`.slice(0, 32);
}

function buildWhoopAuthUrl(state: string) {
  const whoopEnv = getWhoopEnv();
  const url = new URL(WHOOP_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", whoopEnv.clientId);
  url.searchParams.set("redirect_uri", whoopEnv.redirectUri);
  url.searchParams.set("scope", WHOOP_SCOPE_STRING);
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeCodeForToken(code: string) {
  const whoopEnv = getWhoopEnv();
  const response = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: whoopEnv.redirectUri,
      client_id: whoopEnv.clientId,
      client_secret: whoopEnv.clientSecret,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WHOOP token exchange failed with status ${response.status}`);
  }

  return (await response.json()) as WhoopTokenPayload;
}

async function refreshAccessToken(refreshToken: string) {
  const whoopEnv = getWhoopEnv();
  const response = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: whoopEnv.clientId,
      client_secret: whoopEnv.clientSecret,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WHOOP token refresh failed with status ${response.status}`);
  }

  return (await response.json()) as WhoopTokenPayload;
}

async function saveTokenPayload(payload: WhoopTokenPayload) {
  const existing = await dbGet<{
    created_at?: string;
    user_id?: number | null;
    email?: string | null;
  }>("SELECT created_at, user_id, email FROM provider_connections WHERE provider = ?", "whoop");
  const timestamp = nowIso();

  await dbRun(`
    INSERT INTO provider_connections (
      provider,
      status,
      user_id,
      email,
      scopes,
      token_type,
      access_token,
      refresh_token,
      access_token_expires_at,
      refresh_token_expires_at,
      last_connected_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      status = excluded.status,
      scopes = excluded.scopes,
      token_type = excluded.token_type,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      access_token_expires_at = excluded.access_token_expires_at,
      refresh_token_expires_at = excluded.refresh_token_expires_at,
      last_connected_at = excluded.last_connected_at,
      updated_at = excluded.updated_at
  `,
    "whoop",
    "connected",
    existing?.user_id ?? null,
    existing?.email ?? null,
    payload.scope ?? WHOOP_SCOPE_STRING,
    payload.token_type ?? "Bearer",
    payload.access_token,
    payload.refresh_token ?? null,
    computeExpiry(payload.expires_in),
    computeExpiry(payload.refresh_token_expires_in),
    timestamp,
    existing?.created_at ?? timestamp,
    timestamp,
  );
}

async function fetchWhoopCollection<T extends Record<string, unknown>>(
  path: string,
  accessToken: string,
  retryOnUnauthorized = true,
) {
  const url = new URL(`${WHOOP_API_BASE_URL}${path}`);
  url.searchParams.set("limit", "10");
  url.searchParams.set("start", new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString());

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshedToken = await ensureValidAccessToken(true);
    return fetchWhoopCollection<T>(path, refreshedToken, false);
  }

  if (!response.ok) {
    throw new Error(`WHOOP request failed for ${path} with status ${response.status}`);
  }

  const payload = (await response.json()) as { records?: T[] };
  return payload.records ?? [];
}

async function fetchWhoopProfile(accessToken: string, retryOnUnauthorized = true) {
  const response = await fetch(`${WHOOP_API_BASE_URL}/user/profile/basic`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshedToken = await ensureValidAccessToken(true);
    return fetchWhoopProfile(refreshedToken, false);
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as {
    user_id?: number;
    email?: string;
  };
}

async function fetchWhoopBodyMeasurement(accessToken: string, retryOnUnauthorized = true) {
  const response = await fetch(`${WHOOP_API_BASE_URL}/user/measurement/body`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshedToken = await ensureValidAccessToken(true);
    return fetchWhoopBodyMeasurement(refreshedToken, false);
  }

  if (response.status === 403 || response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`WHOOP request failed for body measurement with status ${response.status}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

async function ensureValidAccessToken(forceRefresh = false) {
  const connection = await dbGet<{
    access_token?: string | null;
    refresh_token?: string | null;
    access_token_expires_at?: string | null;
  }>(
    `
      SELECT access_token, refresh_token, access_token_expires_at
      FROM provider_connections
      WHERE provider = ?
    `,
    "whoop",
  );

  if (!connection?.access_token) {
    throw new Error("WHOOP is not connected.");
  }

  const expiresSoon =
    !connection.access_token_expires_at ||
    new Date(connection.access_token_expires_at).getTime() <= Date.now() + 60_000;

  if (!forceRefresh && !expiresSoon) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    return connection.access_token;
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  await saveTokenPayload({
    ...refreshed,
    refresh_token: refreshed.refresh_token ?? connection.refresh_token,
  });

  return refreshed.access_token;
}

async function markSyncStarted() {
  const timestamp = nowIso();
  const runId = await dbInsert(
    "INSERT INTO whoop_sync_runs (started_at, status) VALUES (?, ?)",
    timestamp,
    "running",
  );

  await dbRun(`
    UPDATE provider_connections
    SET last_sync_started_at = ?, last_sync_status = ?, last_sync_error = ?, updated_at = ?
    WHERE provider = ?
  `, timestamp, "running", null, timestamp, "whoop");

  return { runId, startedAt: timestamp };
}

async function markSyncFinished(runId: number, status: "success" | "failed", errorMessage?: string) {
  const completedAt = nowIso();

  await dbRun(`
    UPDATE whoop_sync_runs
    SET completed_at = ?, status = ?, error_message = ?
    WHERE id = ?
  `, completedAt, status, errorMessage ?? null, runId);

  await dbRun(`
    UPDATE provider_connections
    SET last_sync_completed_at = ?, last_sync_status = ?, last_sync_error = ?, updated_at = ?
    WHERE provider = ?
  `, completedAt, status, errorMessage ?? null, completedAt, "whoop");
}

async function upsertWhoopProfile(profile: { user_id?: number; email?: string } | null) {
  if (!profile) {
    return;
  }

  await dbRun(`
    UPDATE provider_connections
    SET user_id = ?, email = ?, updated_at = ?
    WHERE provider = ?
  `, profile.user_id ?? null, profile.email ?? null, nowIso(), "whoop");
}

async function saveSleepSummaries(records: WhoopSleepSummary[]) {
  const syncedAt = nowIso();
  const statement = `
    INSERT INTO whoop_sleep_summaries (
      id, cycle_id, start, "end", timezone_offset, nap, score_state,
      sleep_performance_percentage, sleep_consistency_percentage, sleep_efficiency_percentage,
      respiratory_rate, total_in_bed_time_milli, total_awake_time_milli,
      total_light_sleep_time_milli, total_slow_wave_sleep_time_milli,
      total_rem_sleep_time_milli, sleep_needed_baseline_milli, sleep_needed_debt_milli,
      sleep_needed_strain_milli, sleep_needed_nap_milli, raw_json, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      cycle_id = excluded.cycle_id,
      start = excluded.start,
      "end" = excluded."end",
      timezone_offset = excluded.timezone_offset,
      nap = excluded.nap,
      score_state = excluded.score_state,
      sleep_performance_percentage = excluded.sleep_performance_percentage,
      sleep_consistency_percentage = excluded.sleep_consistency_percentage,
      sleep_efficiency_percentage = excluded.sleep_efficiency_percentage,
      respiratory_rate = excluded.respiratory_rate,
      total_in_bed_time_milli = excluded.total_in_bed_time_milli,
      total_awake_time_milli = excluded.total_awake_time_milli,
      total_light_sleep_time_milli = excluded.total_light_sleep_time_milli,
      total_slow_wave_sleep_time_milli = excluded.total_slow_wave_sleep_time_milli,
      total_rem_sleep_time_milli = excluded.total_rem_sleep_time_milli,
      sleep_needed_baseline_milli = excluded.sleep_needed_baseline_milli,
      sleep_needed_debt_milli = excluded.sleep_needed_debt_milli,
      sleep_needed_strain_milli = excluded.sleep_needed_strain_milli,
      sleep_needed_nap_milli = excluded.sleep_needed_nap_milli,
      raw_json = excluded.raw_json,
      synced_at = excluded.synced_at
  `;

  for (const record of records) {
    await dbRun(
      statement,
      record.id,
      record.cycleId,
      record.start,
      record.end,
      record.timezoneOffset,
      record.nap ? 1 : 0,
      record.scoreState,
      record.sleepPerformancePercentage,
      record.sleepConsistencyPercentage,
      record.sleepEfficiencyPercentage,
      record.respiratoryRate,
      record.totalInBedTimeMilli,
      record.totalAwakeTimeMilli,
      record.totalLightSleepTimeMilli,
      record.totalSlowWaveSleepTimeMilli,
      record.totalRemSleepTimeMilli,
      record.sleepNeededBaselineMilli,
      record.sleepNeededDebtMilli,
      record.sleepNeededStrainMilli,
      record.sleepNeededNapMilli,
      record.rawJson,
      syncedAt,
    );
  }
}

async function saveRecoverySummaries(records: WhoopRecoverySummary[]) {
  const syncedAt = nowIso();
  const statement = `
    INSERT INTO whoop_recovery_summaries (
      cycle_id, created_at, updated_at, score_state, user_calibrating,
      recovery_score, resting_heart_rate, hrv_rmssd_milli, spo2_percentage,
      skin_temp_celsius, raw_json, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(cycle_id) DO UPDATE SET
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      score_state = excluded.score_state,
      user_calibrating = excluded.user_calibrating,
      recovery_score = excluded.recovery_score,
      resting_heart_rate = excluded.resting_heart_rate,
      hrv_rmssd_milli = excluded.hrv_rmssd_milli,
      spo2_percentage = excluded.spo2_percentage,
      skin_temp_celsius = excluded.skin_temp_celsius,
      raw_json = excluded.raw_json,
      synced_at = excluded.synced_at
  `;

  for (const record of records) {
    await dbRun(
      statement,
      record.cycleId,
      record.createdAt,
      record.updatedAt,
      record.scoreState,
      record.userCalibrating ? 1 : 0,
      record.recoveryScore,
      record.restingHeartRate,
      record.hrvRmssdMilli,
      record.spo2Percentage,
      record.skinTempCelsius,
      record.rawJson,
      syncedAt,
    );
  }
}

async function saveCycleSummaries(records: WhoopCycleSummary[]) {
  const syncedAt = nowIso();
  const statement = `
    INSERT INTO whoop_cycles (
      id, start, "end", timezone_offset, score_state, strain,
      kilojoule, average_heart_rate, max_heart_rate, raw_json, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      start = excluded.start,
      "end" = excluded."end",
      timezone_offset = excluded.timezone_offset,
      score_state = excluded.score_state,
      strain = excluded.strain,
      kilojoule = excluded.kilojoule,
      average_heart_rate = excluded.average_heart_rate,
      max_heart_rate = excluded.max_heart_rate,
      raw_json = excluded.raw_json,
      synced_at = excluded.synced_at
  `;

  for (const record of records) {
    await dbRun(
      statement,
      record.id,
      record.start,
      record.end,
      record.timezoneOffset,
      record.scoreState,
      record.strain,
      record.kilojoule,
      record.averageHeartRate,
      record.maxHeartRate,
      record.rawJson,
      syncedAt,
    );
  }
}

async function saveWorkoutSummaries(records: WhoopWorkoutSummary[]) {
  const syncedAt = nowIso();
  const statement = `
    INSERT INTO whoop_workouts (
      id, sport_id, sport_name, start, "end", timezone_offset, score_state,
      strain, average_heart_rate, max_heart_rate, kilojoule, percent_recorded,
      distance_meter, altitude_gain_meter, altitude_change_meter,
      zone_zero_milli, zone_one_milli, zone_two_milli, zone_three_milli,
      zone_four_milli, zone_five_milli, raw_json, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      sport_id = excluded.sport_id,
      sport_name = excluded.sport_name,
      start = excluded.start,
      "end" = excluded."end",
      timezone_offset = excluded.timezone_offset,
      score_state = excluded.score_state,
      strain = excluded.strain,
      average_heart_rate = excluded.average_heart_rate,
      max_heart_rate = excluded.max_heart_rate,
      kilojoule = excluded.kilojoule,
      percent_recorded = excluded.percent_recorded,
      distance_meter = excluded.distance_meter,
      altitude_gain_meter = excluded.altitude_gain_meter,
      altitude_change_meter = excluded.altitude_change_meter,
      zone_zero_milli = excluded.zone_zero_milli,
      zone_one_milli = excluded.zone_one_milli,
      zone_two_milli = excluded.zone_two_milli,
      zone_three_milli = excluded.zone_three_milli,
      zone_four_milli = excluded.zone_four_milli,
      zone_five_milli = excluded.zone_five_milli,
      raw_json = excluded.raw_json,
      synced_at = excluded.synced_at
  `;

  for (const record of records) {
    await dbRun(
      statement,
      record.id,
      record.sportId,
      record.sportName,
      record.start,
      record.end,
      record.timezoneOffset,
      record.scoreState,
      record.strain,
      record.averageHeartRate,
      record.maxHeartRate,
      record.kilojoule,
      record.percentRecorded,
      record.distanceMeter,
      record.altitudeGainMeter,
      record.altitudeChangeMeter,
      record.zoneZeroMilli,
      record.zoneOneMilli,
      record.zoneTwoMilli,
      record.zoneThreeMilli,
      record.zoneFourMilli,
      record.zoneFiveMilli,
      record.rawJson,
      syncedAt,
    );
  }
}

async function saveBodyMeasurement(record: WhoopBodyMeasurementSummary | null) {
  if (!record) {
    return;
  }

  const syncedAt = nowIso();
  await dbRun(`
    INSERT INTO whoop_body_measurements (
      observed_on, observed_at, height_meter, weight_kilogram,
      max_heart_rate, raw_json, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(observed_on) DO UPDATE SET
      observed_at = excluded.observed_at,
      height_meter = excluded.height_meter,
      weight_kilogram = excluded.weight_kilogram,
      max_heart_rate = excluded.max_heart_rate,
      raw_json = excluded.raw_json,
      synced_at = excluded.synced_at
  `,
    record.observedOn,
    record.observedAt,
    record.heightMeter,
    record.weightKilogram,
    record.maxHeartRate,
    record.rawJson,
    syncedAt,
  );
}

async function readLatestSleep(): Promise<WhoopSleepSummary | null> {
  const row = await dbGet<Record<string, unknown>>(
    "SELECT * FROM whoop_sleep_summaries ORDER BY start DESC LIMIT 1",
  );

  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    cycleId: typeof row.cycle_id === "number" ? row.cycle_id : null,
    start: String(row.start),
    end: String(row.end),
    timezoneOffset: typeof row.timezone_offset === "string" ? row.timezone_offset : null,
    nap: Boolean(row.nap),
    scoreState: typeof row.score_state === "string" ? row.score_state : null,
    sleepPerformancePercentage:
      typeof row.sleep_performance_percentage === "number"
        ? row.sleep_performance_percentage
        : null,
    sleepConsistencyPercentage:
      typeof row.sleep_consistency_percentage === "number"
        ? row.sleep_consistency_percentage
        : null,
    sleepEfficiencyPercentage:
      typeof row.sleep_efficiency_percentage === "number"
        ? row.sleep_efficiency_percentage
        : null,
    respiratoryRate: typeof row.respiratory_rate === "number" ? row.respiratory_rate : null,
    totalInBedTimeMilli:
      typeof row.total_in_bed_time_milli === "number" ? row.total_in_bed_time_milli : null,
    totalAwakeTimeMilli:
      typeof row.total_awake_time_milli === "number" ? row.total_awake_time_milli : null,
    totalLightSleepTimeMilli:
      typeof row.total_light_sleep_time_milli === "number"
        ? row.total_light_sleep_time_milli
        : null,
    totalSlowWaveSleepTimeMilli:
      typeof row.total_slow_wave_sleep_time_milli === "number"
        ? row.total_slow_wave_sleep_time_milli
        : null,
    totalRemSleepTimeMilli:
      typeof row.total_rem_sleep_time_milli === "number" ? row.total_rem_sleep_time_milli : null,
    sleepNeededBaselineMilli:
      typeof row.sleep_needed_baseline_milli === "number"
        ? row.sleep_needed_baseline_milli
        : null,
    sleepNeededDebtMilli:
      typeof row.sleep_needed_debt_milli === "number" ? row.sleep_needed_debt_milli : null,
    sleepNeededStrainMilli:
      typeof row.sleep_needed_strain_milli === "number" ? row.sleep_needed_strain_milli : null,
    sleepNeededNapMilli:
      typeof row.sleep_needed_nap_milli === "number" ? row.sleep_needed_nap_milli : null,
    rawJson: String(row.raw_json),
  };
}

async function readLatestRecovery(): Promise<WhoopRecoverySummary | null> {
  const row = await dbGet<Record<string, unknown>>(
    "SELECT * FROM whoop_recovery_summaries ORDER BY created_at DESC LIMIT 1",
  );

  if (!row) {
    return null;
  }

  return {
    cycleId: Number(row.cycle_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    scoreState: typeof row.score_state === "string" ? row.score_state : null,
    userCalibrating: Boolean(row.user_calibrating),
    recoveryScore: typeof row.recovery_score === "number" ? row.recovery_score : null,
    restingHeartRate:
      typeof row.resting_heart_rate === "number" ? row.resting_heart_rate : null,
    hrvRmssdMilli: typeof row.hrv_rmssd_milli === "number" ? row.hrv_rmssd_milli : null,
    spo2Percentage: typeof row.spo2_percentage === "number" ? row.spo2_percentage : null,
    skinTempCelsius:
      typeof row.skin_temp_celsius === "number" ? row.skin_temp_celsius : null,
    rawJson: String(row.raw_json),
  };
}

async function readLatestBodyMeasurement(): Promise<WhoopBodyMeasurementSummary | null> {
  const row = await dbGet<Record<string, unknown>>(
    "SELECT * FROM whoop_body_measurements ORDER BY observed_on DESC LIMIT 1",
  );

  if (!row) {
    return null;
  }

  return {
    observedOn: String(row.observed_on),
    observedAt: String(row.observed_at),
    heightMeter: typeof row.height_meter === "number" ? row.height_meter : null,
    weightKilogram: typeof row.weight_kilogram === "number" ? row.weight_kilogram : null,
    maxHeartRate: typeof row.max_heart_rate === "number" ? row.max_heart_rate : null,
    rawJson: String(row.raw_json),
  };
}

async function readLatestCycle(): Promise<WhoopCycleSummary | null> {
  const row = await dbGet<Record<string, unknown>>(
    "SELECT * FROM whoop_cycles ORDER BY start DESC LIMIT 1",
  );

  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    start: String(row.start),
    end: String(row.end),
    timezoneOffset: typeof row.timezone_offset === "string" ? row.timezone_offset : null,
    scoreState: typeof row.score_state === "string" ? row.score_state : null,
    strain: typeof row.strain === "number" ? row.strain : null,
    kilojoule: typeof row.kilojoule === "number" ? row.kilojoule : null,
    averageHeartRate: typeof row.average_heart_rate === "number" ? row.average_heart_rate : null,
    maxHeartRate: typeof row.max_heart_rate === "number" ? row.max_heart_rate : null,
    rawJson: String(row.raw_json),
  };
}

async function readLatestWorkouts() {
  const rows = await dbAll<Record<string, unknown>>(
    "SELECT * FROM whoop_workouts ORDER BY start DESC LIMIT 3",
  );

  return rows.map((row) => ({
    id: String(row.id),
    sportId: typeof row.sport_id === "number" ? row.sport_id : null,
    sportName: typeof row.sport_name === "string" ? row.sport_name : null,
    start: String(row.start),
    end: String(row.end),
    timezoneOffset: typeof row.timezone_offset === "string" ? row.timezone_offset : null,
    scoreState: typeof row.score_state === "string" ? row.score_state : null,
    strain: typeof row.strain === "number" ? row.strain : null,
    averageHeartRate:
      typeof row.average_heart_rate === "number" ? row.average_heart_rate : null,
    maxHeartRate: typeof row.max_heart_rate === "number" ? row.max_heart_rate : null,
    kilojoule: typeof row.kilojoule === "number" ? row.kilojoule : null,
    percentRecorded:
      typeof row.percent_recorded === "number" ? row.percent_recorded : null,
    distanceMeter: typeof row.distance_meter === "number" ? row.distance_meter : null,
    altitudeGainMeter:
      typeof row.altitude_gain_meter === "number" ? row.altitude_gain_meter : null,
    altitudeChangeMeter:
      typeof row.altitude_change_meter === "number" ? row.altitude_change_meter : null,
    zoneZeroMilli: typeof row.zone_zero_milli === "number" ? row.zone_zero_milli : null,
    zoneOneMilli: typeof row.zone_one_milli === "number" ? row.zone_one_milli : null,
    zoneTwoMilli: typeof row.zone_two_milli === "number" ? row.zone_two_milli : null,
    zoneThreeMilli: typeof row.zone_three_milli === "number" ? row.zone_three_milli : null,
    zoneFourMilli: typeof row.zone_four_milli === "number" ? row.zone_four_milli : null,
    zoneFiveMilli: typeof row.zone_five_milli === "number" ? row.zone_five_milli : null,
    rawJson: String(row.raw_json),
  }));
}

export async function connectWhoop() {
  const state = createStateToken();
  const cookieStore = await cookies();

  cookieStore.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(buildWhoopAuthUrl(state));
}

export async function handleWhoopCallback(code: string) {
  const tokenPayload = await exchangeCodeForToken(code);
  await saveTokenPayload(tokenPayload);
  await syncWhoopData();
}

export async function syncWhoopData() {
  const run = await markSyncStarted();

  try {
    const accessToken = await ensureValidAccessToken();
    const [sleepRecords, recoveryRecords, cycleRecords, workoutRecords, profile, bodyMeasurement] =
      await Promise.all([
      fetchWhoopCollection<Record<string, unknown>>("/activity/sleep", accessToken),
      fetchWhoopCollection<Record<string, unknown>>("/recovery", accessToken),
      fetchWhoopCollection<Record<string, unknown>>("/cycle", accessToken),
      fetchWhoopCollection<Record<string, unknown>>("/activity/workout", accessToken),
      fetchWhoopProfile(accessToken),
      fetchWhoopBodyMeasurement(accessToken),
    ]);

    const normalizedSleep = sleepRecords.map(normalizeSleepRecord).filter((record) => record.id);
    const normalizedRecovery = recoveryRecords
      .map(normalizeRecoveryRecord)
      .filter((record) => record.cycleId > 0);
    const normalizedCycles = cycleRecords
      .map(normalizeCycleRecord)
      .filter((record) => record.id > 0);
    const normalizedWorkouts = workoutRecords
      .map(normalizeWorkoutRecord)
      .filter((record) => record.id);
    const normalizedBodyMeasurement = bodyMeasurement
      ? normalizeBodyMeasurementRecord(bodyMeasurement)
      : null;

    await saveSleepSummaries(normalizedSleep);
    await saveRecoverySummaries(normalizedRecovery);
    await saveCycleSummaries(normalizedCycles);
    await saveWorkoutSummaries(normalizedWorkouts);
    await saveBodyMeasurement(normalizedBodyMeasurement);
    await upsertWhoopProfile(profile);
    await markSyncFinished(run.runId, "success");

    return {
      sleepCount: normalizedSleep.length,
      recoveryCount: normalizedRecovery.length,
      cycleCount: normalizedCycles.length,
      workoutCount: normalizedWorkouts.length,
      latestBodyMeasurement: normalizedBodyMeasurement,
      latestCycle: getLatestRecord(normalizedCycles),
      latestSleep: getLatestRecord(normalizedSleep),
      latestRecovery: getLatestRecord(normalizedRecovery),
      latestWorkout: getLatestRecord(normalizedWorkouts),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown WHOOP sync error";
    await markSyncFinished(run.runId, "failed", message);
    throw error;
  }
}

export async function getWhoopConnectionStatus(): Promise<WhoopConnectionStatus> {
  const isConfigured = hasWhoopEnv();
  const row = await dbGet<{
    status?: string | null;
    user_id?: number | null;
    email?: string | null;
    scopes?: string | null;
    last_connected_at?: string | null;
    last_sync_started_at?: string | null;
    last_sync_completed_at?: string | null;
    last_sync_status?: string | null;
    last_sync_error?: string | null;
  }>(
    `
      SELECT provider, status, user_id, email, scopes, last_connected_at,
             last_sync_started_at, last_sync_completed_at, last_sync_status, last_sync_error
      FROM provider_connections
      WHERE provider = ?
    `,
    "whoop",
  );

  const [latestSleep, latestRecovery, latestCycle, latestBodyMeasurement, latestWorkouts] =
    await Promise.all([
      readLatestSleep(),
      readLatestRecovery(),
      readLatestCycle(),
      readLatestBodyMeasurement(),
      readLatestWorkouts(),
    ]);
  const lastSyncCompletedAt = row?.last_sync_completed_at ?? null;
  const isStale =
    !lastSyncCompletedAt ||
    Date.now() - new Date(lastSyncCompletedAt).getTime() > STALE_SYNC_MS;

  return {
    connected: isConfigured && row?.status === "connected",
    isConfigured,
    status: isConfigured ? row?.status ?? "disconnected" : "not_configured",
    hasOfflineAccess: getScopesFromString(row?.scopes ?? null).includes("offline"),
    userId: row?.user_id === null || row?.user_id === undefined ? null : Number(row.user_id),
    email: row?.email ?? null,
    lastConnectedAt: row?.last_connected_at ?? null,
    lastSyncStartedAt: row?.last_sync_started_at ?? null,
    lastSyncCompletedAt,
    lastSyncStatus: row?.last_sync_status ?? null,
    lastSyncError: row?.last_sync_error ?? null,
    isStale,
    latestCycle,
    latestBodyMeasurement,
    latestSleep,
    latestRecovery,
    latestWorkouts,
  };
}

export async function validateWhoopOAuthState(state: string | null) {
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE_NAME)?.value ?? null;
  cookieStore.delete(STATE_COOKIE_NAME);

  return Boolean(state && savedState && state === savedState);
}
