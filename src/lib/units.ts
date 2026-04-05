const KG_TO_LB = 2.2046226218;

export function kilogramsToPounds(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return value * KG_TO_LB;
}

export function formatPounds(value: number | null, digits = 1) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${value.toFixed(digits)} lb`;
}

export function formatSignedPounds(value: number | null, digits = 1) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)} lb`;
}
