import assert from "node:assert/strict";
import test from "node:test";

import type { NormalizedWhoopExport } from "@/lib/whoop-export/importer";
import {
  assertProductionConfirmation,
  assertSafeProductionPreflight,
  buildPostgresImportQueries,
  productionTarget,
} from "@/lib/whoop-export/postgres-import";

function fixture(): NormalizedWhoopExport {
  return {
    fingerprint: "fingerprint",
    sourceName: "export.zip",
    importedAt: "2026-06-24T12:00:00.000Z",
    dateStart: "2025-07-10T16:56:54.000Z",
    dateEnd: "2026-06-24T02:03:35.000Z",
    cycles: [
      [
        "2025-07-10T16:56:54.000Z", null, "UTC-04:00", 70, 55, 60, null, null,
        10, 2000, 180, 70, null, null, 80, 15, 420, 480, 200, 90, 100, 60, 480,
        20, 90, 75,
      ],
    ],
    sleeps: [
      [
        "2025-07-11T03:00:00.000Z", "2025-07-10T16:56:54.000Z", null, "UTC-04:00",
        "2025-07-11T11:00:00.000Z", 80, 15, 420, 480, 200, 90, 100, 60, 480, 20,
        90, 75, 0,
      ],
    ],
    workouts: [
      [
        "2025-07-10T20:00:00.000Z", "2025-07-10T16:56:54.000Z", null, "UTC-04:00",
        60, "Weightlifting", 10, 500, 180, 120, 20, 30, 30, 15, 5, 0,
      ],
    ],
    journals: [
      [
        "journal-id", "2025-07-10T16:56:54.000Z", null, "UTC-04:00",
        "Had caffeine?", 1,
      ],
    ],
  };
}

test("Postgres import batches all datasets and records metadata last", () => {
  const queries = buildPostgresImportQueries(fixture());
  assert.equal(queries.length, 5);
  assert.match(queries[0].text, /ON CONFLICT \("cycle_start"\) DO UPDATE/);
  assert.match(queries[3].text, /whoop_export_journal_answers/);
  assert.match(queries.at(-1)?.text ?? "", /INSERT INTO whoop_export_imports/);
  assert.deepEqual(queries.at(-1)?.params.slice(0, 2), ["fingerprint", "export.zip"]);
});

test("Postgres import splits large journal cohorts into bounded batches", () => {
  const data = fixture();
  data.journals = Array.from({ length: 501 }, (_value, index) => [
    `journal-${index}`, null, null, null, "Question?", index % 2,
  ]);
  const queries = buildPostgresImportQueries(data);
  assert.equal(queries.filter((query) => query.text.includes("whoop_export_journal_answers")).length, 3);
  assert.match(queries.at(-1)?.text ?? "", /whoop_export_imports/);
});

test("production confirmation and inconsistent preflight are rejected", () => {
  assert.throws(() => assertProductionConfirmation(false), /--confirm-production/);
  assert.doesNotThrow(() => assertProductionConfirmation(true));
  assert.throws(
    () =>
      assertSafeProductionPreflight({
        counts: {
          whoop_export_imports: 0,
          whoop_export_cycles: 1,
          whoop_export_sleeps: 0,
          whoop_export_workouts: 0,
          whoop_export_journal_answers: 0,
        },
        imports: [],
      }),
    /without import metadata/,
  );
});

test("production target never includes credentials", () => {
  assert.equal(
    productionTarget("postgres://user:secret@example.neon.tech/health?sslmode=require"),
    "example.neon.tech/health",
  );
});
