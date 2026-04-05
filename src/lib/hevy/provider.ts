import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
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
  if (!env.hevyApiKey) {
    throw new Error("Missing HEVY_API_KEY environment variable.");
  }

  return env.hevyApiKey;
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

function markSyncStarted() {
  const db = getDb();
  const timestamp = nowIso();
  const result = db
    .prepare("INSERT INTO hevy_sync_runs (started_at, status) VALUES (?, ?)")
    .run(timestamp, "running");

  const existing = db
    .prepare("SELECT created_at FROM provider_connections WHERE provider = ?")
    .get("hevy") as { created_at?: string } | undefined;

  db.prepare(`
    INSERT INTO provider_connections (
      provider, status, created_at, updated_at, last_sync_started_at, last_sync_status, last_sync_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      last_sync_started_at = excluded.last_sync_started_at,
      last_sync_status = excluded.last_sync_status,
      last_sync_error = excluded.last_sync_error,
      updated_at = excluded.updated_at
  `).run(
    "hevy",
    "connecting",
    existing?.created_at ?? timestamp,
    timestamp,
    timestamp,
    "running",
    null,
  );

  return Number(result.lastInsertRowid);
}

function markSyncFinished(status: "connected" | "failed", errorMessage?: string) {
  const db = getDb();
  const timestamp = nowIso();
  const run = db
    .prepare("SELECT id FROM hevy_sync_runs ORDER BY id DESC LIMIT 1")
    .get() as { id?: number } | undefined;

  if (run?.id) {
    db.prepare(`
      UPDATE hevy_sync_runs
      SET completed_at = ?, status = ?, error_message = ?
      WHERE id = ?
    `).run(timestamp, status === "connected" ? "success" : "failed", errorMessage ?? null, run.id);
  }

  const existing = db
    .prepare("SELECT created_at FROM provider_connections WHERE provider = ?")
    .get("hevy") as { created_at?: string } | undefined;

  db.prepare(`
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
  `).run(
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

function saveUserInfo(user: HevyUserInfoResponse["data"]) {
  const db = getDb();
  if (!user) {
    return;
  }

  db.prepare(`
    UPDATE provider_connections
    SET user_id = ?, email = ?, updated_at = ?
    WHERE provider = ?
  `).run(user.id ?? null, user.name ?? null, nowIso(), "hevy");
}

function saveHevyWorkouts(workouts: HevyWorkoutSummary[]) {
  const db = getDb();
  const syncedAt = nowIso();
  const statement = db.prepare(`
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
  `);

  for (const workout of workouts) {
    statement.run(
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

function readLatestWorkouts() {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM hevy_workouts ORDER BY start_time DESC LIMIT 3")
    .all() as Record<string, unknown>[];

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
  markSyncStarted();

  try {
    const [userInfo, workouts] = await Promise.all([
      hevyFetch<HevyUserInfoResponse>("/v1/user/info"),
      fetchAllHevyWorkouts(),
    ]);

    const normalizedWorkouts = workouts
      .map(normalizeHevyWorkout)
      .filter((workout) => workout.id);

    saveUserInfo(userInfo.data);
    saveHevyWorkouts(normalizedWorkouts);
    markSyncFinished("connected");

    return {
      workoutCount: normalizedWorkouts.length,
      latestWorkout: getLatestHevyWorkouts(normalizedWorkouts, 1)[0] ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Hevy sync error";
    markSyncFinished("failed", message);
    throw error;
  }
}

export function getHevyConnectionStatus(): HevyConnectionStatus {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT status, user_id, email, token_type, last_connected_at, last_sync_started_at,
             last_sync_completed_at, last_sync_status, last_sync_error
      FROM provider_connections
      WHERE provider = ?
    `)
    .get("hevy") as
    | {
        status?: string | null;
        user_id?: string | null;
        email?: string | null;
        token_type?: string | null;
        last_connected_at?: string | null;
        last_sync_started_at?: string | null;
        last_sync_completed_at?: string | null;
        last_sync_status?: string | null;
        last_sync_error?: string | null;
      }
    | undefined;

  const latestWorkouts = readLatestWorkouts();
  const lastSyncCompletedAt = row?.last_sync_completed_at ?? null;
  const isStale =
    !lastSyncCompletedAt ||
    Date.now() - new Date(lastSyncCompletedAt).getTime() > STALE_SYNC_MS;

  return {
    connected: row?.status === "connected",
    status: row?.status ?? "disconnected",
    hasApiKey: Boolean(env.hevyApiKey),
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
