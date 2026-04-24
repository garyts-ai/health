import { DatabaseSync } from "node:sqlite";

import { neon } from "@neondatabase/serverless";

import { initializeDatabase } from "@/lib/db";

const TABLES = [
  "provider_connections",
  "whoop_sync_runs",
  "whoop_sleep_summaries",
  "whoop_recovery_summaries",
  "whoop_cycles",
  "whoop_body_measurements",
  "whoop_workouts",
  "hevy_sync_runs",
  "hevy_workouts",
  "discord_delivery_runs",
  "nutrition_targets",
  "nutrition_intake_entries",
] as const;

type ColumnInfo = {
  name: string;
  pk: number;
};

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function postgresPlaceholders(count: number) {
  return Array.from({ length: count }, (_value, index) => `$${index + 1}`).join(", ");
}

function getColumns(db: DatabaseSync, table: string) {
  return db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() as ColumnInfo[];
}

function getRows(db: DatabaseSync, table: string) {
  return db.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all() as Record<string, unknown>[];
}

async function resetIdentity(table: string, primaryKey: string) {
  if (primaryKey !== "id") {
    return;
  }

  await sql.query(
    `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${quoteIdentifier(
      table,
    )}), 1), true)`,
    [],
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to migrate SQLite data into Postgres.");
}

process.env.HEALTH_DB_DRIVER = "postgres";

const sqlitePath = process.argv[2] ?? "data/health-dashboard.sqlite";
const sqlite = new DatabaseSync(sqlitePath);
const sql = neon(process.env.DATABASE_URL);

await initializeDatabase();

for (const table of TABLES) {
  const columns = getColumns(sqlite, table);
  const rows = getRows(sqlite, table);
  const primaryKey = columns.find((column) => column.pk > 0)?.name;

  if (!primaryKey) {
    throw new Error(`Table ${table} does not have a primary key for idempotent migration.`);
  }

  if (rows.length === 0) {
    console.log(`${table}: 0 rows`);
    continue;
  }

  const columnNames = columns.map((column) => column.name);
  const insertColumns = columnNames.map(quoteIdentifier).join(", ");
  const updates = columnNames
    .filter((column) => column !== primaryKey)
    .map((column) => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`)
    .join(", ");
  const query = `
    INSERT INTO ${quoteIdentifier(table)} (${insertColumns})
    VALUES (${postgresPlaceholders(columnNames.length)})
    ON CONFLICT (${quoteIdentifier(primaryKey)}) DO UPDATE SET ${updates}
  `;

  for (const row of rows) {
    await sql.query(
      query,
      columnNames.map((column) => row[column] as string | number | boolean | null),
    );
  }

  await resetIdentity(table, primaryKey);
  console.log(`${table}: migrated ${rows.length} rows`);
}

console.log("SQLite to Postgres migration complete.");
