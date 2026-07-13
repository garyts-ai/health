import { calendarDateKey, shiftCalendarDateKey } from "@/lib/calendar";
import type { AlcoholCalendarDay, AlcoholLogEntry, AlcoholLogSummary, AlcoholLogViewModel } from "@/lib/longitudinal/types";

export type AlcoholJournalRow = {
  id: string;
  cycle_start: string | null;
  question_text: string;
  answered_yes: number;
};

const ALCOHOL_PATTERN = /\balcohol\b/i;

function daysBetween(start: string, end: string) {
  return Math.max(0, Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86_400_000));
}

function dayEntries(entries: AlcoholLogEntry[]) {
  const grouped = new Map<string, AlcoholLogEntry[]>();
  for (const entry of entries) grouped.set(entry.physiologicalDate, [...(grouped.get(entry.physiologicalDate) ?? []), entry]);
  return grouped;
}

function calendarDay(date: string, month: string, today: string, grouped: Map<string, AlcoholLogEntry[]>): AlcoholCalendarDay {
  const matches = grouped.get(date) ?? [];
  return { date, isCurrentMonth: date.startsWith(month), isToday: date === today, hasAlcoholEntry: matches.length > 0, entryCount: matches.length, entryIds: matches.map((entry) => entry.id) };
}

export function alcoholCalendarDays(month: string, entries: AlcoholLogEntry[], today: string) {
  const monthStart = `${month}-01`;
  const monthWeekday = new Date(`${monthStart}T12:00:00Z`).getUTCDay();
  const mondayOffset = (monthWeekday + 6) % 7;
  const calendarStart = shiftCalendarDateKey(monthStart, -mondayOffset);
  const grouped = dayEntries(entries);
  return Array.from({ length: 42 }, (_, index) => calendarDay(shiftCalendarDateKey(calendarStart, index), month, today, grouped));
}

export function alcoholHeatmapDays(selectedDate: string, entries: AlcoholLogEntry[]) {
  const grouped = dayEntries(entries);
  const start = shiftCalendarDateKey(selectedDate, -89);
  return Array.from({ length: 90 }, (_, index) => calendarDay(shiftCalendarDateKey(start, index), selectedDate.slice(0, 7), selectedDate, grouped));
}

export function alcoholLogSummary(entries: AlcoholLogEntry[], selectedDate: string): AlcoholLogSummary {
  const selectedMonth = selectedDate.slice(0, 7);
  const windowStart = shiftCalendarDateKey(selectedDate, -89);
  const latestEntryDate = entries[0]?.physiologicalDate ?? null;
  return {
    thisMonthCount: entries.filter((entry) => entry.physiologicalDate.startsWith(selectedMonth)).length,
    last30dCount: entries.filter((entry) => entry.physiologicalDate >= shiftCalendarDateKey(selectedDate, -29)).length,
    last90dCount: entries.filter((entry) => entry.physiologicalDate >= windowStart).length,
    latestEntryDate,
    currentAlcoholFreeStreakDays: latestEntryDate === null ? null : daysBetween(latestEntryDate, selectedDate),
    longestAlcoholFreeStreakDays: longestAlcoholFreeStreak(entries.filter((entry) => entry.physiologicalDate >= windowStart), selectedDate, windowStart),
  };
}

export function normalizeAlcoholEntries(rows: AlcoholJournalRow[], selectedDate: string): AlcoholLogEntry[] {
  return rows.filter((row) => row.answered_yes === 1 && Boolean(row.cycle_start) && ALCOHOL_PATTERN.test(row.question_text)).map((row) => {
    const occurredAt = row.cycle_start!;
    return {
      id: row.id,
      occurredAt,
      physiologicalDate: calendarDateKey(occurredAt),
      source: "WHOOP Journal" as const,
      notes: null,
      quantity: null,
      metadata: { answeredYes: true, questionText: row.question_text },
    };
  }).filter((entry) => entry.physiologicalDate <= selectedDate).sort((left, right) => right.physiologicalDate.localeCompare(left.physiologicalDate) || right.occurredAt.localeCompare(left.occurredAt));
}

function longestAlcoholFreeStreak(entries: AlcoholLogEntry[], selectedDate: string, windowStart: string) {
  if (!entries.length) return null;
  const dates = [...new Set(entries.map((entry) => entry.physiologicalDate))].sort();
  let longest = daysBetween(windowStart, dates[0]);
  let previous = dates[0];
  let run = 0;
  for (let index = 1; index < dates.length; index += 1) {
    const gap = daysBetween(previous, dates[index]) - 1;
    if (gap > run) run = gap;
    longest = Math.max(longest, run);
    previous = dates[index];
    run = 0;
  }
  longest = Math.max(longest, daysBetween(previous, selectedDate));
  return longest;
}

export function buildAlcoholLogView(rows: AlcoholJournalRow[], selectedDate: string): AlcoholLogViewModel {
  const entries = normalizeAlcoholEntries(rows, selectedDate);
  const grouped = dayEntries(entries);
  const selectedMonth = selectedDate.slice(0, 7);
  const calendarDays = alcoholCalendarDays(selectedMonth, entries, selectedDate);
  const earliestDate = entries.at(-1)?.physiologicalDate ?? selectedDate;
  const heatmapLength = Math.max(365, daysBetween(earliestDate, selectedDate) + 1);
  const heatmapStart = shiftCalendarDateKey(selectedDate, -(heatmapLength - 1));
  const heatmapDays = Array.from({ length: heatmapLength }, (_, index) => calendarDay(shiftCalendarDateKey(heatmapStart, index), selectedMonth, selectedDate, grouped));
  const summary = alcoholLogSummary(entries, selectedDate);
  return { summary, selectedMonth, calendarDays, heatmapDays, entries };
}
