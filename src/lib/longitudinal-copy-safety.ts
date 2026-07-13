import type { StatementType } from "@/lib/longitudinal/types";

export type LongitudinalCopyViolation = {
  path: string;
  rule: string;
  text: string;
};

const STATEMENT_TYPES = new Set<StatementType>([
  "direct_observation",
  "deterministic_calculation",
  "trend_description",
  "personal_baseline_comparison",
  "recorded_association",
  "data_limitation",
  "unknown",
]);

const UNSAFE_COPY_RULES: ReadonlyArray<{ rule: string; pattern: RegExp }> = [
  {
    rule: "causal claim",
    pattern: /\b(?:because|cause|caused|causes|causing|led to|leads? to|resulted in|results? in|is due to|responsible for)\b/i,
  },
  {
    rule: "coaching or recommendation",
    pattern: /\b(?:you should|you need to|we recommend|recommended (?:action|intervention|next step)|try to|focus this month|action items?|mission prescription|highest-leverage intervention)\b/i,
  },
  {
    rule: "diagnostic or medical conclusion",
    pattern: /\b(?:this means you have|you have been diagnosed|diagnos(?:e|ed|is)|you are getting sick|you may be getting sick|health warning)\b/i,
  },
  {
    rule: "disease-risk or life-expectancy claim",
    pattern: /\b(?:disease risk|cancer risk|risk of (?:cancer|disease|death)|life expectancy|years? (?:added to|removed from) your life)\b/i,
  },
  {
    rule: "biological-age claim",
    pattern: /\b(?:your biological age|biological age is|health age|body age)\b/i,
  },
  {
    rule: "unsupported overall-health judgment",
    pattern: /\b(?:your health is (?:poor|good|excellent|unhealthy|healthy)|overall health is (?:poor|good|excellent|unhealthy|healthy)|cardiovascular health (?:improved|declined|worsened))\b/i,
  },
  {
    rule: "unsupported body-composition claim",
    pattern: /\b(?:you are losing muscle|you are gaining muscle|you gained fat|you lost fat)\b/i,
  },
  {
    rule: "inferred exposure",
    pattern: /\b(?:likely (?:alcohol|nicotine|tobacco|caffeine|illness)|suggests? (?:alcohol|nicotine|tobacco|caffeine|illness)|indicates? (?:alcohol|nicotine|tobacco|caffeine|illness)|you (?:drank|smoked|were ill)|unrecorded (?:alcohol|nicotine|tobacco|caffeine|illness))\b/i,
  },
];

function collectStrings(value: unknown, path: string, output: Array<{ path: string; text: string }>) {
  if (typeof value === "string") {
    output.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, output));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      collectStrings(item, path ? `${path}.${key}` : key, output);
    }
  }
}

function withoutSafetyDisclaimers(value: string) {
  return value
    .replace(/\b(?:not a|no) diagnosis\b/gi, "")
    .replace(/\bdoes not diagnose\b/gi, "");
}

/** Scans any generated copy surface, including nested view models and complete packets. */
export function scanLongitudinalCopy(value: unknown): LongitudinalCopyViolation[] {
  const strings: Array<{ path: string; text: string }> = [];
  collectStrings(value, "copy", strings);

  return strings.flatMap(({ path, text }) =>
    UNSAFE_COPY_RULES.filter(({ pattern }) => pattern.test(withoutSafetyDisclaimers(text))).map(({ rule }) => ({
      path,
      rule,
      text,
    })),
  );
}

export function assertLongitudinalCopySafe(value: unknown): void {
  const violations = scanLongitudinalCopy(value);
  if (violations.length === 0) return;

  const details = violations
    .map((violation) => `${violation.path}: ${violation.rule} (${JSON.stringify(violation.text)})`)
    .join("; ");
  throw new Error(`Unsafe longitudinal copy: ${details}`);
}

export function assertLongitudinalStatement(
  statementType: StatementType,
  text: string,
): void {
  if (!STATEMENT_TYPES.has(statementType)) {
    throw new Error(`Unknown longitudinal statement type: ${String(statementType)}`);
  }
  assertLongitudinalCopySafe(text);
}
