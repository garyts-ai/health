import path from "node:path";

import { shouldUsePostgres } from "@/lib/db";
import { importWhoopExport, readWhoopExport } from "@/lib/whoop-export/importer";
import {
  assertProductionConfirmation,
  assertSafeProductionPreflight,
  getWhoopExportPreflight,
  productionTarget,
} from "@/lib/whoop-export/postgres-import";

async function main() {
  const args = process.argv.slice(2);
  const input = args.find((arg) => !arg.startsWith("--"));
  if (!input) {
    throw new Error(
      "Usage: npm run whoop:seed-export -- <path-to-whoop-export.zip> [--confirm-production]",
    );
  }

  if (shouldUsePostgres()) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for a production WHOOP import.");
    const archive = await readWhoopExport(path.resolve(input));
    const preflight = await getWhoopExportPreflight();
    console.log(`Target: Postgres ${productionTarget(databaseUrl)}`);
    console.log(`Candidate: ${archive.sourceName} (${archive.fingerprint})`);
    console.log(`Existing imports: ${preflight.counts.whoop_export_imports}`);
    console.log(
      `Existing rows: ${preflight.counts.whoop_export_cycles} cycles, ` +
        `${preflight.counts.whoop_export_sleeps} sleeps, ` +
        `${preflight.counts.whoop_export_workouts} workouts, ` +
        `${preflight.counts.whoop_export_journal_answers} journal answers.`,
    );
    for (const existing of preflight.imports) {
      console.log(`- ${existing.source_name}: ${existing.fingerprint} (${existing.imported_at})`);
    }
    assertSafeProductionPreflight(preflight);
    assertProductionConfirmation(args.includes("--confirm-production"));
  }

  const result = await importWhoopExport(path.resolve(input));
  console.log(
    result.status === "imported"
      ? `Imported ${result.counts.cycles} cycles, ${result.counts.sleeps} sleeps, ${result.counts.workouts} workouts, and ${result.counts.journals} journal answers.`
      : `Export ${result.sourceName} was already imported; no rows changed.`,
  );
}

void main();
