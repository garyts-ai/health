import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import { getDb, shouldUsePostgres } from "@/lib/db";
import { normalizeJournalQuestion } from "@/lib/longitudinal/journal";
import { persistPostgresWhoopExport } from "@/lib/whoop-export/postgres-import";

export type CsvRow = Record<string, string>;

export const REQUIRED_WHOOP_EXPORT_FILES = [
  "physiological_cycles.csv",
  "sleeps.csv",
  "workouts.csv",
  "journal_entries.csv",
] as const;

export type WhoopExportArchive = {
  fingerprint: string;
  sourceName: string;
  cycles: CsvRow[];
  sleeps: CsvRow[];
  workouts: CsvRow[];
  journals: CsvRow[];
};

export type NormalizedWhoopExport = {
  fingerprint: string;
  sourceName: string;
  importedAt: string;
  dateStart: string | null;
  dateEnd: string | null;
  cycles: Array<Array<string | number | null>>;
  sleeps: Array<Array<string | number | null>>;
  workouts: Array<Array<string | number | null>>;
  journals: Array<Array<string | number | null>>;
};

export type WhoopExportImportResult = {
  status: "imported" | "duplicate";
  sourceName: string;
  fingerprint: string;
  importedAt: string;
  dateStart: string | null;
  dateEnd: string | null;
  counts: {
    cycles: number;
    sleeps: number;
    workouts: number;
    journals: number;
  };
};

export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const [headers = [], ...dataRows] = rows;
  return dataRows
    .filter((values) => values.some((value) => value.length > 0))
    .map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
    );
}

export function normalizeWhoopTimestamp(value: string, timezoneOffset: string) {
  if (!value) {
    return null;
  }

  const offset = timezoneOffset?.replace("UTC", "") || "Z";
  const parsed = new Date(`${value.replace(" ", "T")}${offset}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function numberValue(row: CsvRow, key: string) {
  const raw = row[key];
  if (raw === undefined || raw.trim() === "") {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function booleanValue(row: CsvRow, key: string) {
  return row[key]?.trim().toLowerCase() === "true" ? 1 : 0;
}

export function stableJournalAnswerId(cycleStart: string, question: string) {
  return createHash("sha256")
    .update(`${new Date(cycleStart).toISOString()}\u0000${normalizeJournalQuestion(question)}`)
    .digest("hex");
}

export async function readWhoopExportBuffer(
  buffer: Buffer,
  sourceName: string,
): Promise<WhoopExportArchive> {
  const zip = await JSZip.loadAsync(buffer);
  const read = async (name: string) => {
    const entry = zip.file(name);
    if (!entry) {
      throw new Error(`WHOOP export is missing ${name}.`);
    }
    return parseCsv(await entry.async("string"));
  };

  return {
    fingerprint: createHash("sha256").update(buffer).digest("hex"),
    sourceName,
    cycles: await read("physiological_cycles.csv"),
    sleeps: await read("sleeps.csv"),
    workouts: await read("workouts.csv"),
    journals: await read("journal_entries.csv"),
  };
}

export async function readWhoopExport(zipPath: string): Promise<WhoopExportArchive> {
  const buffer = await fs.readFile(zipPath);
  return readWhoopExportBuffer(buffer, path.basename(zipPath));
}

export function normalizeWhoopArchive(
  archive: WhoopExportArchive,
  importedAt = new Date().toISOString(),
): NormalizedWhoopExport {
  const cycles = archive.cycles.flatMap((row) => {
    const timezone = row["Cycle timezone"];
    const cycleStart = normalizeWhoopTimestamp(row["Cycle start time"], timezone);
    if (!cycleStart) return [];
    return [[
      cycleStart,
      normalizeWhoopTimestamp(row["Cycle end time"], timezone),
      timezone || null,
      numberValue(row, "Recovery score %"),
      numberValue(row, "Resting heart rate (bpm)"),
      numberValue(row, "Heart rate variability (ms)"),
      numberValue(row, "Skin temp (celsius)"),
      numberValue(row, "Blood oxygen %"),
      numberValue(row, "Day Strain"),
      numberValue(row, "Energy burned (cal)"),
      numberValue(row, "Max HR (bpm)"),
      numberValue(row, "Average HR (bpm)"),
      normalizeWhoopTimestamp(row["Sleep onset"], timezone),
      normalizeWhoopTimestamp(row["Wake onset"], timezone),
      numberValue(row, "Sleep performance %"),
      numberValue(row, "Respiratory rate (rpm)"),
      numberValue(row, "Asleep duration (min)"),
      numberValue(row, "In bed duration (min)"),
      numberValue(row, "Light sleep duration (min)"),
      numberValue(row, "Deep (SWS) duration (min)"),
      numberValue(row, "REM duration (min)"),
      numberValue(row, "Awake duration (min)"),
      numberValue(row, "Sleep need (min)"),
      numberValue(row, "Sleep debt (min)"),
      numberValue(row, "Sleep efficiency %"),
      numberValue(row, "Sleep consistency %"),
    ]];
  });

  const sleeps = archive.sleeps.flatMap((row) => {
    const timezone = row["Cycle timezone"];
    const sleepOnset = normalizeWhoopTimestamp(row["Sleep onset"], timezone);
    if (!sleepOnset) return [];
    return [[
      sleepOnset,
      normalizeWhoopTimestamp(row["Cycle start time"], timezone),
      normalizeWhoopTimestamp(row["Cycle end time"], timezone),
      timezone || null,
      normalizeWhoopTimestamp(row["Wake onset"], timezone),
      numberValue(row, "Sleep performance %"),
      numberValue(row, "Respiratory rate (rpm)"),
      numberValue(row, "Asleep duration (min)"),
      numberValue(row, "In bed duration (min)"),
      numberValue(row, "Light sleep duration (min)"),
      numberValue(row, "Deep (SWS) duration (min)"),
      numberValue(row, "REM duration (min)"),
      numberValue(row, "Awake duration (min)"),
      numberValue(row, "Sleep need (min)"),
      numberValue(row, "Sleep debt (min)"),
      numberValue(row, "Sleep efficiency %"),
      numberValue(row, "Sleep consistency %"),
      booleanValue(row, "Nap"),
    ]];
  });

  const workouts = archive.workouts.flatMap((row) => {
    const timezone = row["Cycle timezone"];
    const workoutStart = normalizeWhoopTimestamp(row["Workout start time"], timezone);
    if (!workoutStart) return [];
    return [[
      workoutStart,
      normalizeWhoopTimestamp(row["Cycle start time"], timezone),
      normalizeWhoopTimestamp(row["Workout end time"], timezone),
      timezone || null,
      numberValue(row, "Duration (min)"),
      row["Activity name"] || null,
      numberValue(row, "Activity Strain"),
      numberValue(row, "Energy burned (cal)"),
      numberValue(row, "Max HR (bpm)"),
      numberValue(row, "Average HR (bpm)"),
      numberValue(row, "HR Zone 1 %"),
      numberValue(row, "HR Zone 2 %"),
      numberValue(row, "HR Zone 3 %"),
      numberValue(row, "HR Zone 4 %"),
      numberValue(row, "HR Zone 5 %"),
      booleanValue(row, "GPS enabled"),
    ]];
  });

  const journalsByKey = new Map<string, Array<string | number | null>>();
  archive.journals.forEach((row, index) => {
    const timezone = row["Cycle timezone"];
    const cycleStart = normalizeWhoopTimestamp(row["Cycle start time"], timezone);
    const question = row["Question text"] ?? "";
    const id = cycleStart
      ? stableJournalAnswerId(cycleStart, question)
      : createHash("sha256").update(`${archive.fingerprint}:missing-cycle:${index}:${normalizeJournalQuestion(question)}`).digest("hex");
    const normalized = [
      id,
      cycleStart,
      normalizeWhoopTimestamp(row["Cycle end time"], timezone),
      timezone || null,
      question,
      booleanValue(row, "Answered yes"),
    ];
    const key = cycleStart ? `${cycleStart}\u0000${normalizeJournalQuestion(question)}` : `missing-cycle\u0000${id}`;
    journalsByKey.set(key, normalized);
  });
  const journals = [...journalsByKey.values()];

  const starts = cycles.map((row) => String(row[0])).sort();
  return {
    fingerprint: archive.fingerprint,
    sourceName: archive.sourceName,
    importedAt,
    dateStart: starts[0] ?? null,
    dateEnd: starts.at(-1) ?? null,
    cycles,
    sleeps,
    workouts,
    journals,
  };
}

function resultFromNormalized(
  normalized: NormalizedWhoopExport,
  status: WhoopExportImportResult["status"],
): WhoopExportImportResult {
  return {
    status,
    sourceName: normalized.sourceName,
    fingerprint: normalized.fingerprint,
    importedAt: normalized.importedAt,
    dateStart: normalized.dateStart,
    dateEnd: normalized.dateEnd,
    counts: {
      cycles: normalized.cycles.length,
      sleeps: normalized.sleeps.length,
      workouts: normalized.workouts.length,
      journals: normalized.journals.length,
    },
  };
}

function persistSqliteWhoopExport(normalized: NormalizedWhoopExport) {
  const db = getDb();
  const existing = db
    .prepare("SELECT fingerprint FROM whoop_export_imports WHERE fingerprint = ?")
    .get(normalized.fingerprint);

  if (existing) {
    return false;
  }

  const insertCycle = db.prepare(`
    INSERT OR REPLACE INTO whoop_export_cycles VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  const insertSleep = db.prepare(`
    INSERT OR REPLACE INTO whoop_export_sleeps VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  const insertWorkout = db.prepare(`
    INSERT OR REPLACE INTO whoop_export_workouts VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  const insertJournal = db.prepare(`
    INSERT OR REPLACE INTO whoop_export_journal_answers VALUES (?, ?, ?, ?, ?, ?)
  `);
  const selectLegacyJournals = db.prepare(`
    SELECT id, question_text FROM whoop_export_journal_answers WHERE cycle_start = ?
  `);
  const deleteLegacyJournal = db.prepare(`DELETE FROM whoop_export_journal_answers WHERE id = ?`);

  db.exec("BEGIN");
  try {
    normalized.cycles.forEach((row) => insertCycle.run(...row));
    normalized.sleeps.forEach((row) => insertSleep.run(...row));
    normalized.workouts.forEach((row) => insertWorkout.run(...row));
    normalized.journals.forEach((row) => {
      if (row[1]) {
        const questionKey = normalizeJournalQuestion(String(row[4] ?? ""));
        const legacyRows = selectLegacyJournals.all(row[1]) as Array<{ id: string; question_text: string }>;
        legacyRows
          .filter((legacy) => legacy.id !== row[0] && normalizeJournalQuestion(legacy.question_text) === questionKey)
          .forEach((legacy) => deleteLegacyJournal.run(legacy.id));
      }
      insertJournal.run(...row);
    });
    db.prepare(`
      INSERT INTO whoop_export_imports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      normalized.fingerprint,
      normalized.sourceName,
      normalized.importedAt,
      normalized.dateStart,
      normalized.dateEnd,
      normalized.cycles.length,
      normalized.sleeps.length,
      normalized.workouts.length,
      normalized.journals.length,
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return true;
}

export async function importWhoopExportArchive(
  archive: WhoopExportArchive,
): Promise<WhoopExportImportResult> {
  const normalized = normalizeWhoopArchive(archive);

  if (shouldUsePostgres()) {
    const imported = await persistPostgresWhoopExport(normalized);
    return resultFromNormalized(normalized, imported ? "imported" : "duplicate");
  }

  return resultFromNormalized(
    normalized,
    persistSqliteWhoopExport(normalized) ? "imported" : "duplicate",
  );
}

export async function importWhoopExportBuffer(buffer: Buffer, sourceName: string) {
  return importWhoopExportArchive(await readWhoopExportBuffer(buffer, sourceName));
}

export async function importWhoopExport(zipPath: string) {
  return importWhoopExportArchive(await readWhoopExport(zipPath));
}
