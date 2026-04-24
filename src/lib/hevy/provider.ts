import { dbAll, dbGet, dbInsert, dbRun } from "@/lib/db";
import { getHevyApiKey, hasHevyApiKey } from "@/lib/env";
import { HEVY_API_BASE_URL, HEVY_PAGE_SIZE } from "@/lib/hevy/constants";
import { getLatestHevyWorkouts, normalizeHevyWorkout } from "@/lib/hevy/normalize";
import type { HevyConnectionStatus, HevyWorkoutSummary } from "@/lib/hevy/types";

const STALE_SYNC_MS = 1000 * 60 * 60 * 18;

type HevyPaginatedWorkoutsResponse = {
  page: number;
  page_count: number;
  workouts: Record<string, unknown>[];
};

type HevyUserInfoResponse = {
  data?: {
    id?: string;
    name?: string;
    url?: string;
  };
};

function nowIso() {
  return new Date().toISOString();
}

function getApiKey() {
  return getHevyApiKey();
}

async function hevyFetch<T>(path: string) {
  const response = await fetch(`${HEVY_API_BASE_URL}${path}`, {
    headers: {
      "api-key": getApiKey(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Hevy request failed for ${path} with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function markSyncStarted() {
  const timestamp = nowIso();
  const runId = await dbInsert(
    "INSERT INTO hevy_sync_runs (started_at, status) VALUES (?, ?)",
    timestamp,
    "running",
  );

  const existing = await dbGet<{ created_at?: string }>(
    "SELECT created_at FROM provider_connections WHERE provider = ?",
    "hevy",
  );

  await dbRun(
    `
      INSERT INTO provider_connections (
        provider, status, created_at, updated_at, last_sync_started_at, last_sync_status, last_sync_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider) DO UPDATE SET
        last_sync_started_at = excluded.last_sync_started_at,
        last_sync_status = excluded.last_sync_status,
        last_sync_error = excluded.last_sync_error,
        updated_at = excluded.updated_at
    `,
    "hevy",
    "connecting",
    existing?.created_at ?? timestamp,
    timestamp,
    timestamp,
    "running",
    null,
  );

  return runId;
}

async function markSyncFinished(status: "connected" | "failed", errorMessage?: string) {
  const timestamp = nowIso();
  const run = await dbGet<{ id?: number }>("SELECT id FROM hevy_sync_runs ORDER BY id DESC LIMIT 1");

  if (run?.id) {
    await dbRun(
      `
        UPDATE hevy_sync_runs
        SET completed_at = ?, status = ?, error_message = ?
        WHERE id = ?
      `,
      timestamp,
      status === "connected" ? "success" : "failed",
      errorMessage ?? null,
      run.id,
    );
  }

  const existing = await dbGet<{ created_at?: string }>(
    "SELECT created_at FROM provider_connections WHERE provider = ?",
    "hevy",
  );

  await dbRun(
    `
      INSERT INTO provider_connections (
        provider, status, created_at, updated_at, last_connected_at, last_sync_completed_at,
        last_sync_status, last_sync_error, scopes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at,
        last_connected_at = excluded.last_connected_at,
        last_sync_completed_at = excluded.last_sync_completed_at,
        last_sync_status = excluded.last_sync_status,
        last_sync_error = excluded.last_sync_error,
        scopes = excluded.scopes
    `,
    "hevy",
    status,
    existing?.created_at ?? timestamp,
    timestamp,
    status === "connected" ? timestamp : null,
    timestamp,
    status === "connected" ? "success" : "failed",
    errorMessage ?? null,
    "api-key",
  );
}

async function saveUserInfo(user: HevyUserInfoResponse["data"]) {
  if (!user) {
    return;
  }

  await dbRun(
    `
      UPDATE provider_connections
      SET user_id = ?, email = ?, updated_at = ?
      WHERE provider = ?
    `,
    user.id ?? null,
    user.name ?? null,
    nowIso(),
    "hevy",
  );
}

async function saveHevyWorkouts(workouts: HevyWorkoutSummary[]) {
  const syncedAt = nowIso();
  const statement = `
    INSERT INTO hevy_workouts (
      id, title, description, routine_id, start_time, end_time, created_at, updated_at,
      exercise_count, set_count, volume_kg, duration_seconds, raw_json, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      routine_id = excluded.routine_id,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      exercise_count = excluded.exercise_count,
      set_count = excluded.set_count,
      volume_kg = excluded.volume_kg,
      duration_seconds = excluded.duration_seconds,
      raw_json = excluded.raw_json,
      synced_at = excluded.synced_at
  `;

  for (const workout of workouts) {
    await dbRun(
      statement,
      workout.id,
      workout.title,
      workout.description,
      workout.routineId,
      workout.startTime,
      workout.endTime,
      workout.createdAt,
      workout.updatedAt,
      workout.exerciseCount,
      workout.setCount,
      workout.volumeKg,
      workout.durationSeconds,
      workout.rawJson,
      syncedAt,
    );
  }
}

async function fetchAllHevyWorkouts() {
  const firstPage = await hevyFetch<HevyPaginatedWorkoutsResponse>(
    `/v1/workouts?page=1&pageSize=${HEVY_PAGE_SIZE}`,
  );

  let workouts = firstPage.workouts ?? [];

  for (let page = 2; page <= (firstPage.page_count ?? 1); page += 1) {
    const nextPage = await hevyFetch<HevyPaginatedWorkoutsResponse>(
      `/v1/workouts?page=${page}&pageSize=${HEVY_PAGE_SIZE}`,
    );
    workouts = workouts.concat(nextPage.workouts ?? []);
  }

  return workouts;
}

async function readLatestWorkouts() {
  const rows = await dbAll<Record<string, unknown>>(
    "SELECT * FROM hevy_workouts ORDER BY start_time DESC LIMIT 3",
  );

  return rows.map((row) => ({
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : null,
    description: typeof row.description === "string" ? row.description : null,
    routineId: typeof row.routine_id === "string" ? row.routine_id : null,
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    exerciseCount: Number(row.exercise_count),
    setCount: Number(row.set_count),
    volumeKg: typeof row.volume_kg === "number" ? row.volume_kg : null,
    durationSeconds: typeof row.duration_seconds === "number" ? row.duration_seconds : null,
    rawJson: String(row.raw_json),
  }));
}

export async function syncHevyData() {
  await markSyncStarted();

  try {
    const [userInfo, workouts] = await Promise.all([
      hevyFetch<HevyUserInfoResponse>("/v1/user/info"),
      fetchAllHevyWorkouts(),
    ]);

    const normalizedWorkouts = workouts
      .map(normalizeHevyWorkout)
      .filter((workout) => workout.id);

    await saveUserInfo(userInfo.data);
    await saveHevyWorkouts(normalizedWorkouts);
    await markSyncFinished("connected");

    return {
      workoutCount: normalizedWorkouts.length,
      latestWorkout: getLatestHevyWorkouts(normalizedWorkouts, 1)[0] ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Hevy sync error";
    await markSyncFinished("failed", message);
    throw error;
  }
}

export async function getHevyConnectionStatus(): Promise<HevyConnectionStatus> {
  const isConfigured = hasHevyApiKey();
  const row = await dbGet<{
    status?: string | null;
    user_id?: string | null;
    email?: string | null;
    token_type?: string | null;
    last_connected_at?: string | null;
    last_sync_started_at?: string | null;
    last_sync_completed_at?: string | null;
    last_sync_status?: string | null;
    last_sync_error?: string | null;
  }>(
    `
      SELECT status, user_id, email, token_type, last_connected_at, last_sync_started_at,
             last_sync_completed_at, last_sync_status, last_sync_error
      FROM provider_connections
      WHERE provider = ?
    `,
    "hevy",
  );

  const latestWorkouts = await readLatestWorkouts();
  const lastSyncCompletedAt = row?.last_sync_completed_at ?? null;
  const isStale =
    !lastSyncCompletedAt ||
    Date.now() - new Date(lastSyncCompletedAt).getTime() > STALE_SYNC_MS;

  return {
    connected: isConfigured && row?.status === "connected",
    isConfigured,
    status: isConfigured ? row?.status ?? "disconnected" : "not_configured",
    hasApiKey: isConfigured,
    userId: row?.user_id ?? null,
    userName: row?.email ?? null,
    profileUrl: null,
    lastConnectedAt: row?.last_connected_at ?? null,
    lastSyncStartedAt: row?.last_sync_started_at ?? null,
    lastSyncCompletedAt,
    lastSyncStatus: row?.last_sync_status ?? null,
    lastSyncError: row?.last_sync_error ?? null,
    isStale,
    latestWorkouts,
  };
}
