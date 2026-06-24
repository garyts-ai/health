import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import { getDb } from "@/lib/db";

export type CsvRow = Record<string, string>;

export type WhoopExportArchive = {
  fingerprint: string;
  sourceName: string;
  cycles: CsvRow[];
  sleeps: CsvRow[];
  workouts: CsvRow[];
  journals: CsvRow[];
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

export async function readWhoopExport(zipPath: string): Promise<WhoopExportArchive> {
  const buffer = await fs.readFile(zipPath);
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
    sourceName: path.basename(zipPath),
    cycles: await read("physiological_cycles.csv"),
    sleeps: await read("sleeps.csv"),
    workouts: await read("workouts.csv"),
    journals: await read("journal_entries.csv"),
  };
}

export async function importWhoopExport(zipPath: string) {
  const archive = await readWhoopExport(zipPath);
  const db = getDb();
  const existing = db
    .prepare("SELECT fingerprint FROM whoop_export_imports WHERE fingerprint = ?")
    .get(archive.fingerprint);

  if (existing) {
    return { imported: false, ...archive };
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

  db.exec("BEGIN");
  try {
    for (const row of archive.cycles) {
      const timezone = row["Cycle timezone"];
      const cycleStart = normalizeWhoopTimestamp(row["Cycle start time"], timezone);
      if (!cycleStart) continue;
      insertCycle.run(
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
      );
    }

    for (const row of archive.sleeps) {
      const timezone = row["Cycle timezone"];
      const sleepOnset = normalizeWhoopTimestamp(row["Sleep onset"], timezone);
      if (!sleepOnset) continue;
      insertSleep.run(
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
      );
    }

    for (const row of archive.workouts) {
      const timezone = row["Cycle timezone"];
      const workoutStart = normalizeWhoopTimestamp(row["Workout start time"], timezone);
      if (!workoutStart) continue;
      insertWorkout.run(
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
      );
    }

    archive.journals.forEach((row, index) => {
      const timezone = row["Cycle timezone"];
      insertJournal.run(
        createHash("sha256")
          .update(`${archive.fingerprint}:${index}:${row["Question text"]}`)
          .digest("hex"),
        normalizeWhoopTimestamp(row["Cycle start time"], timezone),
        normalizeWhoopTimestamp(row["Cycle end time"], timezone),
        timezone || null,
        row["Question text"],
        booleanValue(row, "Answered yes"),
      );
    });

    const starts = archive.cycles
      .map((row) => normalizeWhoopTimestamp(row["Cycle start time"], row["Cycle timezone"]))
      .filter((value): value is string => Boolean(value))
      .sort();
    db.prepare(`
      INSERT INTO whoop_export_imports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      archive.fingerprint,
      archive.sourceName,
      new Date().toISOString(),
      starts[0] ?? null,
      starts.at(-1) ?? null,
      archive.cycles.length,
      archive.sleeps.length,
      archive.workouts.length,
      archive.journals.length,
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return { imported: true, ...archive };
}
