import assert from "node:assert/strict";
import test from "node:test";
import { getTodayDateAlignmentIssues } from "@/lib/insights/today-date-alignment";

test("Today date alignment accepts a shared physiological date across the snapshot and consumers", () => {
  assert.deepEqual(
    getTodayDateAlignmentIssues({
      selectedDate: "2026-07-12",
      snapshotDate: "2026-07-12",
      chartDates: {
        recovery: "2026-07-12",
        sleep: "2026-07-12",
        strain: "2026-07-12",
      },
      recommendationDate: "2026-07-12",
      llmDate: "2026-07-12",
    }),
    [],
  );
});

test("Today date alignment reports every consumer that drifts from the selected date", () => {
  const issues = getTodayDateAlignmentIssues({
    selectedDate: "2026-07-12",
    snapshotDate: "2026-07-11",
    chartDates: {
      recovery: "2026-07-12",
      sleep: "2026-07-11",
      strain: "2026-07-12",
    },
    recommendationDate: "2026-07-11",
    llmDate: "2026-07-11",
  });

  assert.deepEqual(issues, [
    "snapshot date 2026-07-11 != selected date 2026-07-12",
    "sleep chart date 2026-07-11 != selected date 2026-07-12",
    "recommendation date 2026-07-11 != selected date 2026-07-12",
    "LLM date 2026-07-11 != selected date 2026-07-12",
  ]);
});
