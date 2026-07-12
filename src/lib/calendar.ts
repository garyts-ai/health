export const HEALTH_TIME_ZONE = "America/New_York";
const DAY_MS = 86_400_000;

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: HEALTH_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: HEALTH_TIME_ZONE,
  weekday: "short",
});
const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: HEALTH_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

function parts(date: Date) {
  return Object.fromEntries(partsFormatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

function offsetAt(instant: Date) {
  const value = parts(instant);
  return Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second) - instant.getTime();
}

export function calendarDateKey(value: Date | string) {
  return dateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function calendarDateFromKey(key: string) {
  return new Date(`${key}T12:00:00.000Z`);
}

export function shiftCalendarDateKey(key: string, days: number) {
  return new Date(calendarDateFromKey(key).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function zonedMidnight(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  const firstGuess = new Date(localAsUtc);
  const corrected = new Date(localAsUtc - offsetAt(firstGuess));
  return new Date(localAsUtc - offsetAt(corrected));
}

export type CalendarInterval = {
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
};

export function calendarWeekInterval(value: Date | string): CalendarInterval {
  const date = typeof value === "string" ? new Date(value) : value;
  const key = calendarDateKey(date);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayFormatter.format(date));
  const startKey = shiftCalendarDateKey(key, -((weekday + 6) % 7));
  const endKey = shiftCalendarDateKey(startKey, 7);
  return { start: zonedMidnight(startKey), end: zonedMidnight(endKey), startKey, endKey };
}

export function calendarDaysIntervalEnding(value: Date | string, days: number): CalendarInterval {
  const endDate = typeof value === "string" ? new Date(value) : value;
  const endKey = shiftCalendarDateKey(calendarDateKey(endDate), 1);
  const startKey = shiftCalendarDateKey(endKey, -days);
  return { start: zonedMidnight(startKey), end: zonedMidnight(endKey), startKey, endKey };
}

export function isInCalendarInterval(value: Date | string, interval: CalendarInterval) {
  const instant = typeof value === "string" ? new Date(value) : value;
  return instant >= interval.start && instant < interval.end;
}
