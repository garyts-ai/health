import assert from "node:assert/strict";
import test from "node:test";

import { normalizeWhoopTimestamp, parseCsv } from "@/lib/whoop-export/importer";

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
