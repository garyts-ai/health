import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";

import {
  normalizeWhoopArchive,
  normalizeWhoopTimestamp,
  parseCsv,
  readWhoopExportBuffer,
  stableJournalAnswerId,
} from "@/lib/whoop-export/importer";

const cycleCsv = [
  "Cycle start time,Cycle end time,Cycle timezone,Recovery score %,Resting heart rate (bpm),Heart rate variability (ms),Skin temp (celsius),Blood oxygen %,Day Strain,Energy burned (cal),Max HR (bpm),Average HR (bpm),Sleep onset,Wake onset,Sleep performance %,Respiratory rate (rpm),Asleep duration (min),In bed duration (min),Light sleep duration (min),Deep (SWS) duration (min),REM duration (min),Awake duration (min),Sleep need (min),Sleep debt (min),Sleep efficiency %,Sleep consistency %",
  "2026-06-23 00:00:00,2026-06-24 00:00:00,UTC-04:00,70,52,88,33.2,96,11.2,2400,180,70,2026-06-23 23:00:00,2026-06-24 07:00:00,85,14.8,420,480,220,90,110,60,480,30,88,75",
].join("\n");

const sleepCsv = [
  "Cycle start time,Cycle end time,Cycle timezone,Sleep onset,Wake onset,Sleep performance %,Respiratory rate (rpm),Asleep duration (min),In bed duration (min),Light sleep duration (min),Deep (SWS) duration (min),REM duration (min),Awake duration (min),Sleep need (min),Sleep debt (min),Sleep efficiency %,Sleep consistency %,Nap",
  "2026-06-23 00:00:00,2026-06-24 00:00:00,UTC-04:00,2026-06-23 23:00:00,2026-06-24 07:00:00,85,14.8,420,480,220,90,110,60,480,30,88,75,false",
].join("\n");

const workoutCsv = [
  "Cycle start time,Cycle timezone,Workout start time,Workout end time,Duration (min),Activity name,Activity Strain,Energy burned (cal),Max HR (bpm),Average HR (bpm),HR Zone 1 %,HR Zone 2 %,HR Zone 3 %,HR Zone 4 %,HR Zone 5 %,GPS enabled",
  "2026-06-23 00:00:00,UTC-04:00,2026-06-23 17:00:00,2026-06-23 18:00:00,60,Weightlifting,8.5,500,165,118,20,30,30,15,5,false",
].join("\n");

const journalCsv = [
  "Cycle start time,Cycle end time,Cycle timezone,Question text,Answered yes,Notes",
  '2026-06-23 00:00:00,2026-06-24 00:00:00,UTC-04:00,"Hydrated, sufficiently?",true,"private free text"',
].join("\n");

async function makeWhoopZip(overrides: Record<string, string | null> = {}) {
  const zip = new JSZip();
  const files = {
    "physiological_cycles.csv": cycleCsv,
    "sleeps.csv": sleepCsv,
    "workouts.csv": workoutCsv,
    "journal_entries.csv": journalCsv,
    ...overrides,
  };
  for (const [name, content] of Object.entries(files)) {
    if (content !== null) zip.file(name, content);
  }
  return Buffer.from(await zip.generateAsync({ type: "uint8array" }));
}

test("parseCsv handles quoted commas, escaped quotes, empty values, and CRLF", () => {
  const rows = parseCsv(
    'name,note,value\r\n"Sleep, late","said ""tired""",\r\nNormal,plain,42\r\n',
  );

  assert.deepEqual(rows, [
    { name: "Sleep, late", note: 'said "tired"', value: "" },
    { name: "Normal", note: "plain", value: "42" },
  ]);
});

test("normalizeWhoopTimestamp applies the export timezone offset", () => {
  assert.equal(
    normalizeWhoopTimestamp("2026-06-23 22:03:35", "UTC-04:00"),
    "2026-06-24T02:03:35.000Z",
  );
  assert.equal(normalizeWhoopTimestamp("", "UTC-04:00"), null);
});

test("readWhoopExportBuffer parses the WHOOP export ZIP and normalization omits journal notes", async () => {
  const archive = await readWhoopExportBuffer(await makeWhoopZip(), "whoop.zip");
  const normalized = normalizeWhoopArchive(archive, "2026-06-24T12:00:00.000Z");

  assert.equal(archive.sourceName, "whoop.zip");
  assert.equal(archive.cycles.length, 1);
  assert.equal(archive.sleeps.length, 1);
  assert.equal(archive.workouts.length, 1);
  assert.equal(archive.journals.length, 1);
  assert.equal(normalized.cycles.length, 1);
  assert.equal(normalized.sleeps.length, 1);
  assert.equal(normalized.workouts.length, 1);
  assert.equal(normalized.journals.length, 1);
  assert.equal(normalized.journals[0][4], "Hydrated, sufficiently?");
  assert.equal(normalized.journals[0].includes("private free text"), false);
});

test("readWhoopExportBuffer fails clearly when a required CSV is missing", async () => {
  await assert.rejects(
    readWhoopExportBuffer(await makeWhoopZip({ "sleeps.csv": null }), "missing.zip"),
    /missing sleeps\.csv/,
  );
});

test("journal IDs are stable across overlapping exports and duplicate answers collapse", () => {
  const row = {
    "Cycle start time": "2026-07-17 00:00:00",
    "Cycle end time": "2026-07-18 00:00:00",
    "Cycle timezone": "UTC-04:00",
    "Question text": "Have any alcoholic drinks?",
    "Answered yes": "true",
  };
  const first = normalizeWhoopArchive({ fingerprint: "first", sourceName: "first.zip", cycles: [], sleeps: [], workouts: [], journals: [row, { ...row, "Question text": " Have any alcoholic   drinks? " }] });
  const second = normalizeWhoopArchive({ fingerprint: "second", sourceName: "second.zip", cycles: [], sleeps: [], workouts: [], journals: [row] });
  assert.equal(first.journals.length, 1);
  assert.equal(first.journals[0][0], second.journals[0][0]);
  assert.equal(first.journals[0][0], stableJournalAnswerId("2026-07-17T04:00:00.000Z", row["Question text"]));
});
