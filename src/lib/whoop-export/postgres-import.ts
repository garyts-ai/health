import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import { dbAll, initializeDatabase } from "@/lib/db";
import type { NormalizedWhoopExport } from "@/lib/whoop-export/importer";

type QueryValue = string | number | null;
type ImportQuery = { text: string; params: QueryValue[] };

const TABLES = [
  "whoop_export_imports",
  "whoop_export_cycles",
  "whoop_export_sleeps",
  "whoop_export_workouts",
  "whoop_export_journal_answers",
] as const;

const COLUMNS = {
  whoop_export_cycles: [
    "cycle_start", "cycle_end", "timezone_offset", "recovery_score",
    "resting_heart_rate", "hrv_rmssd_milli", "skin_temp_celsius", "spo2_percentage",
    "day_strain", "energy_burned_cal", "max_heart_rate", "average_heart_rate",
    "sleep_onset", "wake_onset", "sleep_performance", "respiratory_rate",
    "asleep_minutes", "in_bed_minutes", "light_minutes", "deep_minutes",
    "rem_minutes", "awake_minutes", "sleep_need_minutes", "sleep_debt_minutes",
    "sleep_efficiency", "sleep_consistency",
  ],
  whoop_export_sleeps: [
    "sleep_onset", "cycle_start", "cycle_end", "timezone_offset", "wake_onset",
    "sleep_performance", "respiratory_rate", "asleep_minutes", "in_bed_minutes",
    "light_minutes", "deep_minutes", "rem_minutes", "awake_minutes",
    "sleep_need_minutes", "sleep_debt_minutes", "sleep_efficiency",
    "sleep_consistency", "nap",
  ],
  whoop_export_workouts: [
    "workout_start", "cycle_start", "workout_end", "timezone_offset",
    "duration_minutes", "activity_name", "activity_strain", "energy_burned_cal",
    "max_heart_rate", "average_heart_rate", "zone_1_percentage",
    "zone_2_percentage", "zone_3_percentage", "zone_4_percentage",
    "zone_5_percentage", "gps_enabled",
  ],
  whoop_export_journal_answers: [
    "id", "cycle_start", "cycle_end", "timezone_offset", "question_text", "answered_yes",
  ],
} as const;

const PRIMARY_KEYS = {
  whoop_export_cycles: "cycle_start",
  whoop_export_sleeps: "sleep_onset",
  whoop_export_workouts: "workout_start",
  whoop_export_journal_answers: "id",
} as const;

function buildBatchUpsert(
  table: keyof typeof COLUMNS,
  rows: QueryValue[][],
  batchSize = 250,
) {
  const columns = COLUMNS[table];
  const primaryKey = PRIMARY_KEYS[table];
  const queries: ImportQuery[] = [];

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const params = batch.flat();
    const values = batch.map((_row, rowIndex) => {
      const start = rowIndex * columns.length;
      return `(${columns.map((_column, columnIndex) => `$${start + columnIndex + 1}`).join(", ")})`;
    });
    const updates = columns
      .filter((column) => column !== primaryKey)
      .map((column) => `"${column}" = EXCLUDED."${column}"`)
      .join(", ");
    queries.push({
      text: `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(", ")})
        VALUES ${values.join(", ")}
        ON CONFLICT ("${primaryKey}") DO UPDATE SET ${updates}`,
      params,
    });
  }

  return queries;
}

export function buildPostgresImportQueries(data: NormalizedWhoopExport) {
  const queries = [
    ...buildBatchUpsert("whoop_export_cycles", data.cycles),
    ...buildBatchUpsert("whoop_export_sleeps", data.sleeps),
    ...buildBatchUpsert("whoop_export_workouts", data.workouts),
    ...buildBatchUpsert("whoop_export_journal_answers", data.journals),
  ];
  queries.push({
    text: `INSERT INTO whoop_export_imports
      (fingerprint, source_name, imported_at, date_start, date_end, cycle_count, sleep_count, workout_count, journal_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    params: [
      data.fingerprint, data.sourceName, data.importedAt, data.dateStart, data.dateEnd,
      data.cycles.length, data.sleeps.length, data.workouts.length, data.journals.length,
    ],
  });
  return queries;
}

export async function getWhoopExportPreflight() {
  await initializeDatabase();
  const counts = Object.fromEntries(
    await Promise.all(TABLES.map(async (table) => {
      const [row] = await dbAll<{ count: number | string }>(`SELECT COUNT(*) AS count FROM ${table}`);
      return [table, Number(row?.count ?? 0)];
    })),
  ) as Record<(typeof TABLES)[number], number>;
  const imports = await dbAll<{
    fingerprint: string;
    source_name: string;
    imported_at: string;
  }>("SELECT fingerprint, source_name, imported_at FROM whoop_export_imports ORDER BY imported_at DESC");
  return { counts, imports };
}

export function productionTarget(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return `${url.hostname}${url.pathname}`;
}

export function assertProductionConfirmation(confirmProduction: boolean) {
  if (!confirmProduction) {
    throw new Error("Production import refused. Re-run with --confirm-production after reviewing the preflight.");
  }
}

export function assertSafeProductionPreflight(
  preflight: Awaited<ReturnType<typeof getWhoopExportPreflight>>,
) {
  const dataRows =
    preflight.counts.whoop_export_cycles +
    preflight.counts.whoop_export_sleeps +
    preflight.counts.whoop_export_workouts +
    preflight.counts.whoop_export_journal_answers;
  if (dataRows > 0 && preflight.counts.whoop_export_imports === 0) {
    throw new Error(
      "Production import refused: export rows exist without import metadata. Reconcile the database before retrying.",
    );
  }
}

export async function persistPostgresWhoopExport(
  data: NormalizedWhoopExport,
  client?: NeonQueryFunction<false, false>,
) {
  await initializeDatabase();
  const existing = await dbAll<{ fingerprint: string }>(
    "SELECT fingerprint FROM whoop_export_imports WHERE fingerprint = ?",
    data.fingerprint,
  );
  if (existing.length > 0) return false;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for a production WHOOP import.");
  const sql = client ?? neon(databaseUrl);
  const queries = buildPostgresImportQueries(data);
  await sql.transaction((tx) => queries.map((query) => tx.query(query.text, query.params)));
  return true;
}
