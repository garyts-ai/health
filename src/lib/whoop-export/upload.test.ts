import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";

import {
  validateWhoopExportZip,
  WHOOP_EXPORT_UPLOAD_MAX_BYTES,
  WHOOP_EXPORT_MAX_ENTRIES,
  WhoopExportUploadError,
} from "@/lib/whoop-export/upload";

async function zipWithRequiredFiles(overrides: Record<string, string | null> = {}) {
  const zip = new JSZip();
  const files = {
    "physiological_cycles.csv": "Cycle start time,Cycle timezone\n2026-06-23 00:00:00,UTC-04:00\n",
    "sleeps.csv": "Sleep onset,Cycle timezone,Nap\n2026-06-23 23:00:00,UTC-04:00,false\n",
    "workouts.csv": "Workout start time,Cycle timezone,GPS enabled\n2026-06-23 17:00:00,UTC-04:00,false\n",
    "journal_entries.csv": "Question text,Answered yes\nHydrated?,true\n",
    ...overrides,
  };
  for (const [name, content] of Object.entries(files)) {
    if (content !== null) zip.file(name, content);
  }
  return Buffer.from(await zip.generateAsync({ type: "uint8array" }));
}

test("validateWhoopExportZip accepts a full WHOOP export ZIP", async () => {
  await assert.doesNotReject(validateWhoopExportZip(await zipWithRequiredFiles(), "export.zip"));
});

test("validateWhoopExportZip rejects non-zip names and malformed archives", async () => {
  await assert.rejects(
    validateWhoopExportZip(Buffer.from("not a zip"), "export.csv"),
    (error) => error instanceof WhoopExportUploadError && /full WHOOP export ZIP/.test(error.message),
  );
  await assert.rejects(
    validateWhoopExportZip(Buffer.from("not a zip"), "export.zip"),
    /not a readable ZIP/,
  );
});

test("validateWhoopExportZip rejects missing required CSVs and oversized files", async () => {
  await assert.rejects(
    validateWhoopExportZip(await zipWithRequiredFiles({ "journal_entries.csv": null }), "export.zip"),
    /missing journal_entries\.csv/,
  );
  await assert.rejects(
    validateWhoopExportZip(Buffer.alloc(WHOOP_EXPORT_UPLOAD_MAX_BYTES + 1), "export.zip"),
    /larger than the app upload limit/,
  );
});

test("validateWhoopExportZip rejects archives with excessive entry counts", async () => {
  const zip = new JSZip();
  for (let index = 0; index <= WHOOP_EXPORT_MAX_ENTRIES; index += 1) {
    zip.file(`extra-${index}.txt`, "x");
  }
  await assert.rejects(
    validateWhoopExportZip(Buffer.from(await zip.generateAsync({ type: "uint8array" })), "export.zip"),
    /too many archive entries/,
  );
});
