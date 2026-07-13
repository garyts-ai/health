import assert from "node:assert/strict";
import test from "node:test";

import { buildAlcoholLogView, normalizeAlcoholEntries } from "@/lib/longitudinal/alcohol-log";

const selectedDate = "2026-07-12";

test("normalizes alcohol-only journal rows to local physiological dates", () => {
  const entries = normalizeAlcoholEntries([
    { id: "late", cycle_start: "2026-07-12T03:30:00.000Z", question_text: "Did you drink alcohol?", answered_yes: 1 },
    { id: "coffee", cycle_start: "2026-07-11T15:00:00.000Z", question_text: "Did you consume caffeine?", answered_yes: 1 },
    { id: "no", cycle_start: "2026-07-10T15:00:00.000Z", question_text: "Did you consume alcohol?", answered_yes: 0 },
  ], selectedDate);
  assert.deepEqual(entries.map((entry) => [entry.id, entry.physiologicalDate]), [["late", "2026-07-11"]]);
});

test("builds counts, calendar highlights, and streaks from explicit entries", () => {
  const rows = [
    { id: "jul-11-a", cycle_start: "2026-07-11T23:00:00.000Z", question_text: "Alcohol", answered_yes: 1 },
    { id: "jul-11-b", cycle_start: "2026-07-12T01:00:00.000Z", question_text: "Alcohol", answered_yes: 1 },
    { id: "jul-04", cycle_start: "2026-07-04T20:00:00.000Z", question_text: "Alcohol", answered_yes: 1 },
    { id: "jun-20", cycle_start: "2026-06-20T20:00:00.000Z", question_text: "Alcohol", answered_yes: 1 },
    { id: "old", cycle_start: "2025-01-01T20:00:00.000Z", question_text: "Alcohol", answered_yes: 1 },
    { id: "travel", cycle_start: "2026-07-03T20:00:00.000Z", question_text: "Travel", answered_yes: 1 },
  ];
  const view = buildAlcoholLogView(rows, selectedDate);
  assert.equal(view.summary.thisMonthCount, 3);
  assert.equal(view.summary.last30dCount, 4);
  assert.equal(view.summary.last90dCount, 4);
  assert.equal(view.summary.latestEntryDate, "2026-07-11");
  assert.equal(view.summary.currentAlcoholFreeStreakDays, 1);
  assert.equal(view.summary.longestAlcoholFreeStreakDays, 13);
  assert.equal(view.entries.length, 5);
  const day = view.calendarDays.find((item) => item.date === "2026-07-11");
  assert.deepEqual(day && { hasAlcoholEntry: day.hasAlcoholEntry, entryCount: day.entryCount, entryIds: day.entryIds }, { hasAlcoholEntry: true, entryCount: 2, entryIds: ["jul-11-b", "jul-11-a"] });
  assert.equal(view.calendarDays.find((item) => item.date === "2026-07-12")?.isToday, true);
});

test("empty alcohol history stays explicit and renderable", () => {
  const view = buildAlcoholLogView([{ id: "caffeine", cycle_start: selectedDate, question_text: "Caffeine", answered_yes: 1 }], selectedDate);
  assert.equal(view.entries.length, 0);
  assert.deepEqual(view.summary, { thisMonthCount: 0, last30dCount: 0, last90dCount: 0, latestEntryDate: null, currentAlcoholFreeStreakDays: null, longestAlcoholFreeStreakDays: null });
  assert.equal(view.calendarDays.length, 42);
  assert.equal(view.heatmapDays.length, 365);
});
