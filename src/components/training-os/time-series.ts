export type PersonalRangeStatus = "within" | "above" | "below";

export type TimeSeriesPersonalRange = {
  center: number;
  lower: number;
  upper: number;
  sampleCount: number;
  robustZScore: number;
  status: PersonalRangeStatus;
};

export type TimeSeriesPoint = {
  date: string;
  value: number | null;
  personalRange?: TimeSeriesPersonalRange | null;
};

export type TimeSeriesCoordinate = Omit<TimeSeriesPoint, "value"> & {
  value: number;
  originalIndex: number;
  x: number;
  y: number;
  rangeLowerY: number | null;
  rangeUpperY: number | null;
};

export type TimeSeriesGeometry = {
  points: TimeSeriesPoint[];
  coordinates: TimeSeriesCoordinate[];
  segments: TimeSeriesCoordinate[][];
  rangeSegments: TimeSeriesCoordinate[][];
  min: number;
  max: number;
  xForDate: (date: string) => number;
  yForValue: (value: number) => number;
};

const DAY_MS = 86_400_000;
const RANGE_DAYS: Record<string, number> = { week: 7, "30d": 30, "3m": 90, "1y": 365 };

function dateValue(date: string, fallback: number) {
  const parsed = Date.parse(`${date}T12:00:00.000Z`);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function filterTimeSeriesRange(points: TimeSeriesPoint[], range: string, endDate: string) {
  const days = RANGE_DAYS[range];
  if (!days) return points.filter((point) => point.date <= endDate);
  const end = dateValue(endDate, 0);
  const start = new Date(end - (days - 1) * DAY_MS).toISOString().slice(0, 10);
  return points.filter((point) => point.date >= start && point.date <= endDate);
}

function forcedIndices(points: TimeSeriesPoint[]) {
  const present = points
    .map((point, index) => ({ point, index }))
    .filter((item): item is { point: TimeSeriesPoint & { value: number }; index: number } => item.point.value !== null && Number.isFinite(item.point.value));
  const forced = new Set<number>();
  if (!present.length) return forced;
  forced.add(present[0].index);
  forced.add(present.at(-1)!.index);
  forced.add(present.reduce((best, item) => item.point.value < best.point.value ? item : best).index);
  forced.add(present.reduce((best, item) => item.point.value > best.point.value ? item : best).index);
  for (const item of present) {
    if (item.point.personalRange?.status === "above" || item.point.personalRange?.status === "below") forced.add(item.index);
  }
  for (let index = 0; index < points.length; index += 1) {
    if (points[index]?.value === null) {
      forced.add(index);
      if (index > 0) forced.add(index - 1);
      if (index + 1 < points.length) forced.add(index + 1);
    }
  }
  return forced;
}

/**
 * Caps visual complexity while retaining endpoints, null-gap boundaries,
 * extrema, and every personal-range breach. Calculations should keep using the
 * uncapped source series.
 */
export function downsampleTimeSeries(points: TimeSeriesPoint[], limit = 120) {
  if (points.length <= limit || limit < 3) return points.map((point) => ({ ...point }));
  const forced = forcedIndices(points);
  if (forced.size >= limit) {
    const present = points
      .map((point, index) => ({ point, index }))
      .filter((item): item is { point: TimeSeriesPoint & { value: number }; index: number } => item.point.value !== null && Number.isFinite(item.point.value));
    const selected = new Set<number>();
    const add = (index: number | undefined) => { if (index !== undefined && selected.size < limit) selected.add(index); };
    add(present[0]?.index);
    add(present.at(-1)?.index);
    if (present.length) {
      add(present.reduce((best, item) => item.point.value < best.point.value ? item : best).index);
      add(present.reduce((best, item) => item.point.value > best.point.value ? item : best).index);
    }
    const deviations = present.filter((item) => item.point.personalRange?.status === "above" || item.point.personalRange?.status === "below");
    for (const item of [...deviations].reverse()) add(item.index);
    for (const index of [...forced].sort((left, right) => right - left)) add(index);
    return [...selected].sort((left, right) => left - right).map((index) => ({ ...points[index] }));
  }
  const selected = new Set(forced);
  const remaining = limit - selected.size;
  for (let slot = 0; slot < remaining; slot += 1) {
    const index = Math.round((slot / Math.max(1, remaining - 1)) * (points.length - 1));
    selected.add(index);
  }
  if (selected.size < limit) {
    const stride = (points.length - 1) / Math.max(1, limit - 1);
    for (let slot = 0; slot < limit && selected.size < limit; slot += 1) selected.add(Math.round(slot * stride));
  }
  return [...selected].sort((left, right) => left - right).slice(0, limit).map((index) => ({ ...points[index] }));
}

export function buildTimeSeriesGeometry(
  source: TimeSeriesPoint[],
  options: { baseline?: number | null; top?: number; bottom?: number; left?: number; right?: number; limit?: number } = {},
): TimeSeriesGeometry {
  const points = downsampleTimeSeries(source, options.limit ?? 120);
  const top = options.top ?? 12;
  const bottom = options.bottom ?? 88;
  const left = options.left ?? 0;
  const right = options.right ?? 100;
  const values = points.flatMap((point) => {
    if (point.value === null || !Number.isFinite(point.value)) return [];
    const range = point.personalRange;
    return range ? [point.value, range.lower, range.upper] : [point.value];
  });
  if (options.baseline !== null && options.baseline !== undefined && Number.isFinite(options.baseline)) values.push(options.baseline);
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values) : 1;
  const rawSpan = rawMax - rawMin;
  const pad = Math.max(rawSpan * .12, Math.max(Math.abs(rawMax), 1) * .015);
  const min = rawMin - pad;
  const max = rawMax + pad;
  const span = max - min || 1;
  const firstDate = dateValue(points[0]?.date ?? "", 0);
  const lastDate = dateValue(points.at(-1)?.date ?? "", firstDate + Math.max(1, points.length - 1) * DAY_MS);
  const dateSpan = Math.max(DAY_MS, lastDate - firstDate);
  const xForDate = (date: string) => left + ((dateValue(date, firstDate) - firstDate) / dateSpan) * (right - left);
  const yForValue = (value: number) => bottom - ((value - min) / span) * (bottom - top);
  const coordinates = points
    .map((point, originalIndex) => point.value === null || !Number.isFinite(point.value) ? null : {
      ...point,
      originalIndex,
      x: xForDate(point.date),
      y: yForValue(point.value),
      rangeLowerY: point.personalRange ? yForValue(point.personalRange.lower) : null,
      rangeUpperY: point.personalRange ? yForValue(point.personalRange.upper) : null,
    })
    .filter((point): point is TimeSeriesCoordinate => point !== null);
  const byIndex = new Map(coordinates.map((point) => [point.originalIndex, point]));
  const segments: TimeSeriesCoordinate[][] = [];
  const rangeSegments: TimeSeriesCoordinate[][] = [];
  let segment: TimeSeriesCoordinate[] = [];
  let rangeSegment: TimeSeriesCoordinate[] = [];
  points.forEach((point, index) => {
    const coordinate = byIndex.get(index);
    if (!coordinate) {
      if (segment.length) segments.push(segment);
      if (rangeSegment.length) rangeSegments.push(rangeSegment);
      segment = [];
      rangeSegment = [];
      return;
    }
    segment.push(coordinate);
    if (coordinate.personalRange && coordinate.rangeLowerY !== null && coordinate.rangeUpperY !== null) rangeSegment.push(coordinate);
    else if (rangeSegment.length) {
      rangeSegments.push(rangeSegment);
      rangeSegment = [];
    }
  });
  if (segment.length) segments.push(segment);
  if (rangeSegment.length) rangeSegments.push(rangeSegment);
  return { points, coordinates, segments, rangeSegments, min, max, xForDate, yForValue };
}

export function nearestTimeSeriesPoint(coordinates: TimeSeriesCoordinate[], x: number) {
  return coordinates.reduce<TimeSeriesCoordinate | null>((best, point) => !best || Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best, null);
}

export function visiblePointDates(coordinates: TimeSeriesCoordinate[], range: "week" | string, activeDate?: string | null) {
  const visible = new Set<string>();
  if (range === "week") coordinates.forEach((point) => visible.add(point.date));
  const latest = coordinates.at(-1);
  if (latest) visible.add(latest.date);
  if (activeDate) visible.add(activeDate);
  coordinates.forEach((point) => {
    if (point.personalRange?.status === "above" || point.personalRange?.status === "below") visible.add(point.date);
  });
  return visible;
}
