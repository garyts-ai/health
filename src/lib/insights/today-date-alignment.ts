export type TodayDateAlignmentInput = {
  selectedDate: string;
  snapshotDate: string | null;
  chartDates: {
    recovery: string | null;
    sleep: string | null;
    strain: string | null;
  };
  recommendationDate: string | null;
  llmDate: string | null;
};

export function getTodayDateAlignmentIssues(input: TodayDateAlignmentInput) {
  const issues: string[] = [];

  if (input.snapshotDate !== input.selectedDate) {
    issues.push(`snapshot date ${input.snapshotDate ?? "missing"} != selected date ${input.selectedDate}`);
  }

  for (const [series, date] of Object.entries(input.chartDates)) {
    if (date !== null && date !== input.selectedDate) {
      issues.push(`${series} chart date ${date} != selected date ${input.selectedDate}`);
    }
  }

  if (input.recommendationDate !== null && input.recommendationDate !== input.selectedDate) {
    issues.push(
      `recommendation date ${input.recommendationDate} != selected date ${input.selectedDate}`,
    );
  }

  if (input.llmDate !== null && input.llmDate !== input.selectedDate) {
    issues.push(`LLM date ${input.llmDate} != selected date ${input.selectedDate}`);
  }

  return issues;
}

/** Development-only guard for Today consumers that should share one physiological date. */
export function warnTodayDateAlignment(input: TodayDateAlignmentInput) {
  if (process.env.NODE_ENV === "production") return;

  const issues = getTodayDateAlignmentIssues(input);
  if (issues.length > 0) {
    console.warn("[healthmaxer:date-alignment]", issues);
  }
}
