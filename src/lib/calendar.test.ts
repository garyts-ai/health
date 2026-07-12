import assert from "node:assert/strict";
import test from "node:test";

import { calendarDaysIntervalEnding, calendarDateKey, calendarWeekInterval, isInCalendarInterval } from "@/lib/calendar";

test("calendar week uses Monday-to-Monday half-open intervals in New York", () => {
  const interval = calendarWeekInterval("2026-03-08T18:00:00.000Z");
  assert.equal(interval.startKey, "2026-03-02");
  assert.equal(interval.endKey, "2026-03-09");
  assert.equal(interval.start.toISOString(), "2026-03-02T05:00:00.000Z");
  assert.equal(interval.end.toISOString(), "2026-03-09T04:00:00.000Z");
  assert.equal(isInCalendarInterval("2026-03-09T03:59:59.999Z", interval), true);
  assert.equal(isInCalendarInterval("2026-03-09T04:00:00.000Z", interval), false);
});

test("calendar keys and rolling windows survive year boundaries", () => {
  assert.equal(calendarDateKey("2026-01-01T04:30:00.000Z"), "2025-12-31");
  const interval = calendarDaysIntervalEnding("2026-01-01T17:00:00.000Z", 7);
  assert.equal(interval.startKey, "2025-12-26");
  assert.equal(interval.endKey, "2026-01-02");
});
