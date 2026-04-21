import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "health-dashboard.sqlite");

type GlobalWithDb = typeof globalThis & {
  __healthDashboardDb?: DatabaseSync;
};

function ensureDatabaseDirectory() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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
  `);
}

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
