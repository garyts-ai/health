import { dbAll } from "@/lib/db";

export type WhoopExportInventory = {
  start: string | null;
  end: string | null;
  counts: { cycles: number; sleeps: number; workouts: number; journalAnswers: number };
  latestImport: { sourceName: string; importedAt: string } | null;
  importCount: number;
};

function countValue(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export async function getWhoopExportInventory(): Promise<WhoopExportInventory> {
  const [imports, cycleRange, cycleCount, sleepCount, workoutCount, journalCount] = await Promise.all([
    dbAll<{ source_name: string; imported_at: string }>(
      "SELECT source_name, imported_at FROM whoop_export_imports ORDER BY imported_at DESC",
    ),
    dbAll<{ start: string | null; end: string | null }>(
      "SELECT MIN(cycle_start) AS start, MAX(cycle_start) AS end FROM whoop_export_cycles",
    ),
    dbAll<{ count: number | string }>("SELECT COUNT(*) AS count FROM whoop_export_cycles"),
    dbAll<{ count: number | string }>("SELECT COUNT(*) AS count FROM whoop_export_sleeps"),
    dbAll<{ count: number | string }>("SELECT COUNT(*) AS count FROM whoop_export_workouts"),
    dbAll<{ count: number | string }>("SELECT COUNT(*) AS count FROM whoop_export_journal_answers"),
  ]);

  return {
    start: cycleRange[0]?.start ?? null,
    end: cycleRange[0]?.end ?? null,
    counts: {
      cycles: countValue(cycleCount[0]?.count),
      sleeps: countValue(sleepCount[0]?.count),
      workouts: countValue(workoutCount[0]?.count),
      journalAnswers: countValue(journalCount[0]?.count),
    },
    latestImport: imports[0]
      ? { sourceName: imports[0].source_name, importedAt: imports[0].imported_at }
      : null,
    importCount: imports.length,
  };
}
