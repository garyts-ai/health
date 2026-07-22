import type { JournalEventType } from "@/lib/longitudinal/types";

export type JournalAnswerRow = {
  id: string;
  cycle_start: string | null;
  question_text: string;
  answered_yes: number;
};

export type JournalClassification = {
  type: JournalEventType;
  icon: string;
  label: string;
};

const JOURNAL_EVENT_RULES: Array<JournalClassification & { pattern: RegExp }> = [
  { type: "alcohol", icon: "circle", pattern: /\balcohol(?:ic)?\b/i, label: "Alcohol" },
  { type: "caffeine", icon: "diamond", pattern: /caffeine|coffee/i, label: "Caffeine" },
  { type: "late_meal", icon: "square", pattern: /late.?meal|late.?food|eat.*late/i, label: "Late meal" },
  { type: "travel", icon: "plane", pattern: /travel|flight|jet.?lag/i, label: "Travel" },
  { type: "illness", icon: "triangle", pattern: /ill|sick|symptom/i, label: "Illness" },
  { type: "stress", icon: "pulse", pattern: /stress/i, label: "Stress" },
  { type: "medication", icon: "capsule", pattern: /medication|medicine|drug/i, label: "Medication" },
  { type: "hydration", icon: "drop", pattern: /hydrat|water/i, label: "Hydration" },
  { type: "menstrual_cycle", icon: "ring", pattern: /menstrual|period|cycle/i, label: "Menstrual cycle" },
];

export function normalizeJournalQuestion(question: string) {
  return question.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function journalAnswerKey(row: Pick<JournalAnswerRow, "cycle_start" | "question_text">) {
  return row.cycle_start
    ? `${new Date(row.cycle_start).toISOString()}\u0000${normalizeJournalQuestion(row.question_text)}`
    : null;
}

export function classifyJournalQuestion(question: string): JournalClassification {
  const rule = JOURNAL_EVENT_RULES.find((candidate) => candidate.pattern.test(question));
  return rule
    ? { type: rule.type, icon: rule.icon, label: rule.label }
    : { type: "other", icon: "tag", label: question.replace(/\?$/, "") };
}

export function isAlcoholJournalQuestion(question: string) {
  return classifyJournalQuestion(question).type === "alcohol";
}

/**
 * Old exports generated IDs from the archive fingerprint and row index, so an
 * overlapping export could leave multiple copies of one answer. Collapse them
 * by the source identity before any log, event, coverage, or association work.
 * Rows without a cycle start cannot be aligned safely and remain distinct.
 */
export function deduplicateJournalRows<T extends JournalAnswerRow>(rows: T[]) {
  const deduplicated = new Map<string, T>();
  for (const row of rows) {
    const key = journalAnswerKey(row) ?? `missing-cycle\u0000${row.id}`;
    deduplicated.set(key, row);
  }
  return [...deduplicated.values()];
}
