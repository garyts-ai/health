export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function mad(values: number[]) {
  const center = median(values);
  return center === null ? null : median(values.map((value) => Math.abs(value - center)));
}

export function percentile(values: number[], value: number | null) {
  if (value === null || !values.length) return null;
  return Math.round((values.filter((candidate) => candidate <= value).length / values.length) * 100);
}

export function theilSen(points: Array<{ x: number; y: number }>) {
  if (points.length < 3) return null;
  const slopes: number[] = [];
  for (let left = 0; left < points.length; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      const distance = points[right].x - points[left].x;
      if (distance !== 0) slopes.push((points[right].y - points[left].y) / distance);
    }
  }
  return median(slopes);
}

export function round(value: number | null, digits = 1) {
  return value === null || !Number.isFinite(value) ? null : Number(value.toFixed(digits));
}

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
