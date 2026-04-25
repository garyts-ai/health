import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { applySchema } from "@/lib/db";

test("applySchema upgrades existing WHOOP workouts with activity detail columns", () => {
  const db = new DatabaseSync(":memory:");

  db.exec(`
    CREATE TABLE whoop_workouts (
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
    )
  `);

  applySchema(db);

  const columns = db
    .prepare("PRAGMA table_info(whoop_workouts)")
    .all()
    .map((column) => String((column as { name: unknown }).name));

  assert.ok(columns.includes("distance_meter"));
  assert.ok(columns.includes("altitude_gain_meter"));
  assert.ok(columns.includes("altitude_change_meter"));
  assert.ok(columns.includes("zone_zero_milli"));
  assert.ok(columns.includes("zone_five_milli"));

  db.prepare(`
    INSERT INTO whoop_workouts (
      id, sport_name, start, "end", raw_json, synced_at,
      distance_meter, altitude_gain_meter, zone_five_milli
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "walk-1",
    "Walking",
    "2026-04-25T14:00:00.000Z",
    "2026-04-25T14:30:00.000Z",
    "{}",
    "2026-04-25T14:31:00.000Z",
    3200,
    12,
    6000,
  );

  const row = db.prepare("SELECT * FROM whoop_workouts WHERE id = ?").get("walk-1") as {
    distance_meter: number;
    altitude_gain_meter: number;
    zone_five_milli: number;
  };

  assert.equal(row.distance_meter, 3200);
  assert.equal(row.altitude_gain_meter, 12);
  assert.equal(row.zone_five_milli, 6000);

  db.close();
});
