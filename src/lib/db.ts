import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "health-dashboard.sqlite");

type QueryParam = string | number | boolean | null;
type QueryResult = {
  changes?: number;
  lastInsertRowid?: number | bigint;
};

type GlobalWithDb = typeof globalThis & {
  __healthDashboardDb?: DatabaseSync;
  __healthDashboardPg?: NeonQueryFunction<false, false>;
  __healthDashboardPgSchemaReady?: boolean;
};

const WHOOP_WORKOUT_EXTRA_COLUMNS: Array<{
  name: string;
  sqliteType: string;
  postgresType: string;
}> = [
  { name: "distance_meter", sqliteType: "REAL", postgresType: "DOUBLE PRECISION" },
  { name: "altitude_gain_meter", sqliteType: "REAL", postgresType: "DOUBLE PRECISION" },
  { name: "altitude_change_meter", sqliteType: "REAL", postgresType: "DOUBLE PRECISION" },
  { name: "zone_zero_milli", sqliteType: "INTEGER", postgresType: "INTEGER" },
  { name: "zone_one_milli", sqliteType: "INTEGER", postgresType: "INTEGER" },
  { name: "zone_two_milli", sqliteType: "INTEGER", postgresType: "INTEGER" },
  { name: "zone_three_milli", sqliteType: "INTEGER", postgresType: "INTEGER" },
  { name: "zone_four_milli", sqliteType: "INTEGER", postgresType: "INTEGER" },
  { name: "zone_five_milli", sqliteType: "INTEGER", postgresType: "INTEGER" },
];

function ensureDatabaseDirectory() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function addSqliteColumnIfMissing(db: DatabaseSync, tableName: string, columnName: string, type: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name?: unknown }>;
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${type}`);
  }
}

function applySqliteSchemaUpgrades(db: DatabaseSync) {
  for (const column of WHOOP_WORKOUT_EXTRA_COLUMNS) {
    addSqliteColumnIfMissing(db, "whoop_workouts", column.name, column.sqliteType);
  }
}

export function applySchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS provider_connections (
      provider TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      user_id INTEGER,
      email TEXT,
      scopes TEXT,
      token_type TEXT,
      access_token TEXT,
      refresh_token TEXT,
      access_token_expires_at TEXT,
      refresh_token_expires_at TEXT,
      last_connected_at TEXT,
      last_sync_started_at TEXT,
      last_sync_completed_at TEXT,
      last_sync_status TEXT,
      last_sync_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whoop_sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS whoop_sleep_summaries (
      id TEXT PRIMARY KEY,
      cycle_id INTEGER,
      start TEXT NOT NULL,
      "end" TEXT NOT NULL,
      timezone_offset TEXT,
      nap INTEGER NOT NULL,
      score_state TEXT,
      sleep_performance_percentage INTEGER,
      sleep_consistency_percentage INTEGER,
      sleep_efficiency_percentage REAL,
      respiratory_rate REAL,
      total_in_bed_time_milli INTEGER,
      total_awake_time_milli INTEGER,
      total_light_sleep_time_milli INTEGER,
      total_slow_wave_sleep_time_milli INTEGER,
      total_rem_sleep_time_milli INTEGER,
      sleep_needed_baseline_milli INTEGER,
      sleep_needed_debt_milli INTEGER,
      sleep_needed_strain_milli INTEGER,
      sleep_needed_nap_milli INTEGER,
      raw_json TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whoop_recovery_summaries (
      cycle_id INTEGER PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      score_state TEXT,
      user_calibrating INTEGER NOT NULL,
      recovery_score INTEGER,
      resting_heart_rate INTEGER,
      hrv_rmssd_milli REAL,
      spo2_percentage REAL,
      skin_temp_celsius REAL,
      raw_json TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whoop_cycles (
      id INTEGER PRIMARY KEY,
      start TEXT NOT NULL,
      "end" TEXT NOT NULL,
      timezone_offset TEXT,
      score_state TEXT,
      strain REAL,
      kilojoule REAL,
      average_heart_rate INTEGER,
      max_heart_rate INTEGER,
      raw_json TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whoop_body_measurements (
      observed_on TEXT PRIMARY KEY,
      observed_at TEXT NOT NULL,
      height_meter REAL,
      weight_kilogram REAL,
      max_heart_rate REAL,
      raw_json TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whoop_workouts (
      id TEXT PRIMARY KEY,
      sport_id INTEGER,
      sport_name TEXT,
      start TEXT NOT NULL,
      "end" TEXT NOT NULL,
      timezone_offset TEXT,
      score_state TEXT,
      strain REAL,
      average_heart_rate INTEGER,
      max_heart_rate INTEGER,
      kilojoule REAL,
      percent_recorded REAL,
      distance_meter REAL,
      altitude_gain_meter REAL,
      altitude_change_meter REAL,
      zone_zero_milli INTEGER,
      zone_one_milli INTEGER,
      zone_two_milli INTEGER,
      zone_three_milli INTEGER,
      zone_four_milli INTEGER,
      zone_five_milli INTEGER,
      raw_json TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hevy_sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS hevy_workouts (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      routine_id TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      exercise_count INTEGER NOT NULL,
      set_count INTEGER NOT NULL,
      volume_kg REAL,
      duration_seconds REAL,
      raw_json TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS discord_delivery_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_key TEXT NOT NULL,
      summary_date TEXT NOT NULL,
      trigger_source TEXT NOT NULL,
      status TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nutrition_targets (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      calorie_target INTEGER,
      protein_target_g INTEGER,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nutrition_intake_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_key TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      label TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein_g REAL NOT NULL,
      carbs_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      note TEXT,
      logged_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_nutrition_intake_date
      ON nutrition_intake_entries (date_key, logged_at);
  `);
  applySqliteSchemaUpgrades(db);
}

const POSTGRES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS provider_connections (
    provider TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    user_id TEXT,
    email TEXT,
    scopes TEXT,
    token_type TEXT,
    access_token TEXT,
    refresh_token TEXT,
    access_token_expires_at TEXT,
    refresh_token_expires_at TEXT,
    last_connected_at TEXT,
    last_sync_started_at TEXT,
    last_sync_completed_at TEXT,
    last_sync_status TEXT,
    last_sync_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS whoop_sync_runs (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,
    error_message TEXT
  );

  CREATE TABLE IF NOT EXISTS whoop_sleep_summaries (
    id TEXT PRIMARY KEY,
    cycle_id BIGINT,
    start TEXT NOT NULL,
    "end" TEXT NOT NULL,
    timezone_offset TEXT,
    nap INTEGER NOT NULL,
    score_state TEXT,
    sleep_performance_percentage INTEGER,
    sleep_consistency_percentage INTEGER,
    sleep_efficiency_percentage DOUBLE PRECISION,
    respiratory_rate DOUBLE PRECISION,
    total_in_bed_time_milli INTEGER,
    total_awake_time_milli INTEGER,
    total_light_sleep_time_milli INTEGER,
    total_slow_wave_sleep_time_milli INTEGER,
    total_rem_sleep_time_milli INTEGER,
    sleep_needed_baseline_milli INTEGER,
    sleep_needed_debt_milli INTEGER,
    sleep_needed_strain_milli INTEGER,
    sleep_needed_nap_milli INTEGER,
    raw_json TEXT NOT NULL,
    synced_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS whoop_recovery_summaries (
    cycle_id BIGINT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    score_state TEXT,
    user_calibrating INTEGER NOT NULL,
    recovery_score INTEGER,
    resting_heart_rate INTEGER,
    hrv_rmssd_milli DOUBLE PRECISION,
    spo2_percentage DOUBLE PRECISION,
    skin_temp_celsius DOUBLE PRECISION,
    raw_json TEXT NOT NULL,
    synced_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS whoop_cycles (
    id BIGINT PRIMARY KEY,
    start TEXT NOT NULL,
    "end" TEXT NOT NULL,
    timezone_offset TEXT,
    score_state TEXT,
    strain DOUBLE PRECISION,
    kilojoule DOUBLE PRECISION,
    average_heart_rate INTEGER,
    max_heart_rate INTEGER,
    raw_json TEXT NOT NULL,
    synced_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS whoop_body_measurements (
    observed_on TEXT PRIMARY KEY,
    observed_at TEXT NOT NULL,
    height_meter DOUBLE PRECISION,
    weight_kilogram DOUBLE PRECISION,
    max_heart_rate DOUBLE PRECISION,
    raw_json TEXT NOT NULL,
    synced_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS whoop_workouts (
    id TEXT PRIMARY KEY,
    sport_id INTEGER,
    sport_name TEXT,
    start TEXT NOT NULL,
    "end" TEXT NOT NULL,
    timezone_offset TEXT,
    score_state TEXT,
    strain DOUBLE PRECISION,
    average_heart_rate INTEGER,
    max_heart_rate INTEGER,
    kilojoule DOUBLE PRECISION,
    percent_recorded DOUBLE PRECISION,
    distance_meter DOUBLE PRECISION,
    altitude_gain_meter DOUBLE PRECISION,
    altitude_change_meter DOUBLE PRECISION,
    zone_zero_milli INTEGER,
    zone_one_milli INTEGER,
    zone_two_milli INTEGER,
    zone_three_milli INTEGER,
    zone_four_milli INTEGER,
    zone_five_milli INTEGER,
    raw_json TEXT NOT NULL,
    synced_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS hevy_sync_runs (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,
    error_message TEXT
  );

  CREATE TABLE IF NOT EXISTS hevy_workouts (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    routine_id TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    exercise_count INTEGER NOT NULL,
    set_count INTEGER NOT NULL,
    volume_kg DOUBLE PRECISION,
    duration_seconds DOUBLE PRECISION,
    raw_json TEXT NOT NULL,
    synced_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS discord_delivery_runs (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    date_key TEXT NOT NULL,
    summary_date TEXT NOT NULL,
    trigger_source TEXT NOT NULL,
    status TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS nutrition_targets (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    calorie_target INTEGER,
    protein_target_g INTEGER,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS nutrition_intake_entries (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    date_key TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    label TEXT NOT NULL,
    calories INTEGER NOT NULL,
    protein_g DOUBLE PRECISION NOT NULL,
    carbs_g DOUBLE PRECISION NOT NULL,
    fat_g DOUBLE PRECISION NOT NULL,
    note TEXT,
    logged_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_nutrition_intake_date
    ON nutrition_intake_entries (date_key, logged_at);
`;

function createDatabase() {
  ensureDatabaseDirectory();

  const db = new DatabaseSync(DB_PATH);
  applySchema(db);
  return db;
}

export function getDb() {
  const globalWithDb = globalThis as GlobalWithDb;

  if (!globalWithDb.__healthDashboardDb) {
    globalWithDb.__healthDashboardDb = createDatabase();
  } else {
    applySchema(globalWithDb.__healthDashboardDb);
  }

  return globalWithDb.__healthDashboardDb;
}

export function shouldUsePostgres() {
  return Boolean(process.env.DATABASE_URL && process.env.HEALTH_DB_DRIVER !== "sqlite");
}

function getPostgresClient() {
  const globalWithDb = globalThis as GlobalWithDb;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when using Postgres.");
  }

  globalWithDb.__healthDashboardPg ??= neon(process.env.DATABASE_URL);
  return globalWithDb.__healthDashboardPg;
}

function convertPlaceholders(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function ensurePostgresSchema() {
  const globalWithDb = globalThis as GlobalWithDb;

  if (globalWithDb.__healthDashboardPgSchemaReady) {
    return;
  }

  const sql = getPostgresClient();
  for (const statement of POSTGRES_SCHEMA.split(";").map((part) => part.trim()).filter(Boolean)) {
    await sql.query(statement, []);
  }
  for (const column of WHOOP_WORKOUT_EXTRA_COLUMNS) {
    await sql.query(
      `ALTER TABLE whoop_workouts ADD COLUMN IF NOT EXISTS ${column.name} ${column.postgresType}`,
      [],
    );
  }
  globalWithDb.__healthDashboardPgSchemaReady = true;
}

function toSqliteParams(params: QueryParam[]) {
  return params.map((param) => (typeof param === "boolean" ? (param ? 1 : 0) : param));
}

async function postgresRows<T>(sqlText: string, params: QueryParam[]) {
  await ensurePostgresSchema();
  const sql = getPostgresClient();
  return (await sql.query(convertPlaceholders(sqlText), params)) as T[];
}

export async function dbAll<T = Record<string, unknown>>(sqlText: string, ...params: QueryParam[]) {
  if (shouldUsePostgres()) {
    return postgresRows<T>(sqlText, params);
  }

  return getDb().prepare(sqlText).all(...toSqliteParams(params)) as T[];
}

export async function dbGet<T = Record<string, unknown>>(sqlText: string, ...params: QueryParam[]) {
  const rows = await dbAll<T>(sqlText, ...params);
  return rows[0];
}

export async function dbRun(sqlText: string, ...params: QueryParam[]): Promise<QueryResult> {
  if (shouldUsePostgres()) {
    await postgresRows(sqlText, params);
    return {};
  }

  return getDb().prepare(sqlText).run(...toSqliteParams(params));
}

export async function dbInsert(sqlText: string, ...params: QueryParam[]) {
  if (shouldUsePostgres()) {
    const rows = await postgresRows<{ id: number | string }>(`${sqlText} RETURNING id`, params);
    return Number(rows[0]?.id ?? 0);
  }

  const result = getDb().prepare(sqlText).run(...toSqliteParams(params));
  return Number(result.lastInsertRowid);
}

export async function initializeDatabase() {
  if (shouldUsePostgres()) {
    await ensurePostgresSchema();
    return;
  }

  getDb();
}
