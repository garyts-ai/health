import path from "node:path";

import { importWhoopExport } from "@/lib/whoop-export/importer";

async function main() {
  const input = process.argv[2];
  if (!input) {
    throw new Error("Usage: npm run whoop:seed-export -- <path-to-whoop-export.zip>");
  }

  const result = await importWhoopExport(path.resolve(input));
  console.log(
    result.imported
      ? `Imported ${result.cycles.length} cycles, ${result.sleeps.length} sleeps, ${result.workouts.length} workouts, and ${result.journals.length} journal answers.`
      : `Export ${result.sourceName} was already imported; no rows changed.`,
  );
}

void main();
