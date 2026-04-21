import type {
  DailyRecommendation,
  DailySummary,
  DailyStressFlags,
  RecommendationActionIcon,
  RecommendationActionTile,
  TrendPoint,
} from "@/lib/insights/types";
import { formatPounds, kilogramsToPounds } from "@/lib/units";

const whoopMessages: Record<string, string> = {
  connected: "WHOOP connected and initial sync completed.",
  "oauth-denied": "WHOOP authorization was denied before the app could connect.",
  "invalid-state": "WHOOP callback could not be verified. Please try connecting again.",
  "missing-code": "WHOOP returned without an authorization code.",
  "not-configured": "WHOOP credentials are missing. Add them to .env.local before connecting.",
  "sync-failed": "WHOOP connected, but the sync step failed. Try syncing again.",
  "sync-success": "WHOOP sync completed successfully.",
};

const hevyMessages: Record<string, string> = {
  "not-configured": "Hevy sync is disabled until HEVY_API_KEY is added to .env.local.",
  "sync-success": "Hevy sync completed successfully.",
  "sync-failed": "Hevy sync failed. Double-check the API key and try again.",
};

const targetMessages: Record<string, string> = {
  saved: "Nutrition targets saved.",
  failed: "Nutrition targets could not be saved.",
};

export function getSettingsBannerMessage(searchParams: {
  whoop?: string;
  hevy?: string;
  targets?: string;
}) {
  return searchParams.whoop
    ? whoopMessages[searchParams.whoop]
    : searchParams.hevy
      ? hevyMessages[searchParams.hevy]
      : searchParams.targets
        ? targetMessages[searchParams.targets]
      : null;
}

function formatNumber(value: number | null, digits = 0) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return value.toFixed(digits);
}

function formatHours(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${value.toFixed(1)}h`;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function average(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => typeof value === "number");
  if (filtered.length === 0) {
    return null;
  }

  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function getRecommendationAccent(category: DailyRecommendation["category"]) {
  switch (category) {
    case "training":
      return "border-lime-200 bg-[radial-gradient(circle_at_top_right,_rgba(212,244,159,0.45),_rgba(246,250,239,0.95)_55%)]";
    case "nutrition":
      return "border-amber-200 bg-[radial-gradient(circle_at_top_right,_rgba(251,232,181,0.42),_rgba(252,248,239,0.96)_55%)]";
    case "recovery":
      return "border-sky-200 bg-[radial-gradient(circle_at_top_right,_rgba(191,226,255,0.42),_rgba(242,248,253,0.96)_55%)]";
    case "supplement":
      return "border-stone-200 bg-stone-50/90";
    case "caution":
      return "border-rose-200 bg-[radial-gradient(circle_at_top_right,_rgba(255,214,214,0.42),_rgba(253,244,244,0.96)_55%)]";
    default:
      return "border-stone-200 bg-stone-50/85";
  }
}

function shortenRecommendationTitle(title: string) {
  return title
    .replace("Use symptom-matched head and stomach support", "Support head and stomach")
    .replace("Use simple sick-day support, not a normal training day", "Treat it like a sick day")
    .replace("Keep training easy or rest today", "Keep training easy or rest")
    .replace("Prioritize recovery fueling today", "Prioritize recovery fueling");
}

function formatEvidenceLine(metrics: string[]) {
  if (metrics.length === 0) {
    return null;
  }

  return `Driven by ${metrics
    .slice(0, 3)
    .map((metric) => metric.replace(/\s+/g, " ").trim())
    .join(", ")}`;
}

function ActionStepGlyph({ icon }: { icon: RecommendationActionIcon }) {
  const className = "h-4 w-4";
  switch (icon) {
    case "rest":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 12h6l-6 8h10l6-8h-6l6-8H10Z" />
        </svg>
      );
    case "walk":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="5" r="2" />
          <path d="m10 22 1-6-2-3 3-2 2 3 4 2" />
          <path d="m13 9-2 4" />
        </svg>
      );
    case "technique":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 12h16" />
          <path d="M7 9v6" />
          <path d="M17 9v6" />
          <path d="M10 8v8" />
          <path d="M14 8v8" />
        </svg>
      );
    case "electrolytes":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 3h8l1 5v10a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V8Z" />
          <path d="M10 13h4" />
          <path d="M12 11v4" />
        </svg>
      );
    case "food":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 10h16" />
          <path d="M7 10V7a5 5 0 0 1 10 0v3" />
          <path d="M6 14h12l-1 6H7Z" />
        </svg>
      );
    case "ginger":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 20c0-2 1-3 3-4" />
          <path d="M12 16c0-2 1-3 3-4" />
          <path d="M9 12c0-2-1-3-3-4" />
          <path d="M12 8c0-2 1-3 3-4" />
          <path d="M12 20c3 0 5-2 5-5 0-1.8-.8-3.1-2.1-4.2" />
        </svg>
      );
    case "stomach":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M10 3v6c0 1.7-1 2.7-2.4 3.6C5.8 13.7 5 15.1 5 17a4 4 0 0 0 4 4h2a7 7 0 0 0 7-7v-1c0-2.2-1.8-4-4-4h-1V3" />
        </svg>
      );
    case "protein":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m12 3 7 4v10l-7 4-7-4V7Z" />
          <path d="m12 3-7 4 7 4 7-4" />
          <path d="M12 11v10" />
        </svg>
      );
    case "carbs":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 9c0-3.3 2.7-6 6-6s6 2.7 6 6c0 7-6 12-6 12S6 16 6 9Z" />
          <path d="M9 9h6" />
          <path d="M9 12h6" />
        </svg>
      );
    case "fuel":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 7h8v14H6Z" />
          <path d="M14 10h2l2 2v9h-4" />
          <path d="M8 10h4" />
        </svg>
      );
    case "sleep":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M13 3a8.5 8.5 0 1 0 8 11.5A9 9 0 0 1 13 3Z" />
        </svg>
      );
    case "stress":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 4v8" />
          <path d="m8 8 4 4 4-4" />
          <path d="M5 20h14" />
        </svg>
      );
    case "symptoms":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      );
    default:
      return null;
  }
}

function renderActionTile(tile: RecommendationActionTile, tone: "primary" | "conditional") {
  return (
    <div
      key={`${tile.label}-${tile.conditionLabel ?? "always"}`}
      className={
        tone === "primary"
          ? "inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/82 px-3 py-2 text-[13px] font-semibold tracking-[0.01em] text-stone-900 shadow-[0_8px_18px_rgba(0,0,0,0.04)]"
          : "inline-flex items-center gap-2 rounded-2xl border border-stone-200/80 bg-white/62 px-3 py-2 text-[13px] font-medium tracking-[0.01em] text-stone-700"
      }
    >
      <span
        className={
          tone === "primary"
            ? "flex h-7 w-7 items-center justify-center rounded-full bg-stone-950/[0.05] text-stone-700"
            : "flex h-7 w-7 items-center justify-center rounded-full bg-stone-950/[0.04] text-stone-500"
        }
      >
        <ActionStepGlyph icon={tile.icon} />
      </span>
      <span>{tile.label}</span>
      {tile.conditionLabel ? (
        <span className="rounded-full bg-stone-950/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">
          {tile.conditionLabel}
        </span>
      ) : null}
    </div>
  );
}

function MetricGlyph({
  kind,
}: {
  kind: "recovery" | "strain" | "sleep" | "load" | "weight" | "overnight";
}) {
  const className = "h-5 w-5";
  switch (kind) {
    case "recovery":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 21s-6.4-4.2-8.3-8.2c-1.5-2.9-.1-6.6 3.2-7.2C8.8 5.2 10.6 6 12 7.4c1.4-1.4 3.2-2.2 5.1-1.8 3.3.6 4.7 4.3 3.2 7.2C18.4 16.8 12 21 12 21Z" />
        </svg>
      );
    case "strain":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 12h3l2.5-6 4 12 2.5-6H21" />
        </svg>
      );
    case "sleep":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M13 3a8.5 8.5 0 1 0 8 11.5A9 9 0 0 1 13 3Z" />
        </svg>
      );
    case "load":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 10v4" />
          <path d="M20 10v4" />
          <path d="M7 8v8" />
          <path d="M17 8v8" />
          <path d="M10 7v10" />
          <path d="M14 7v10" />
          <path d="M7 12h10" />
        </svg>
      );
    case "weight":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 5h10" />
          <path d="M7 5a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4" />
          <path d="M12 9v3l2 1" />
        </svg>
      );
    case "overnight":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M13 3a8.5 8.5 0 1 0 8 11.5A9 9 0 0 1 13 3Z" />
          <path d="M16.8 7.5 18 8.7l1.2-1.2" />
          <path d="M18 8.7V5.8" />
        </svg>
      );
    default:
      return null;
  }
}

function RecommendationGlyph({ category }: { category: DailyRecommendation["category"] }) {
  switch (category) {
    case "training":
      return <MetricGlyph kind="load" />;
    case "nutrition":
      return (
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 3v8" />
          <path d="M11 3v8" />
          <path d="M9 3v18" />
          <path d="M16 3c2 2 3 4.3 3 6.8V21" />
        </svg>
      );
    case "recovery":
      return <MetricGlyph kind="recovery" />;
    case "supplement":
      return (
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="7" y="4" width="10" height="16" rx="4" />
          <path d="M7 12h10" />
        </svg>
      );
    case "caution":
      return (
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 8v5" />
          <path d="M12 17h.01" />
          <path d="M10.4 4.2 2.8 17.4A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.6L13.6 4.2a2 2 0 0 0-3.2 0Z" />
        </svg>
      );
    default:
      return null;
  }
}

function getRecoveryTone(value: number | null) {
  if (value === null) {
    return {
      iconClass: "bg-stone-200 text-stone-700",
      lineClass: "text-stone-500",
      valueClass: "text-stone-950",
      pointClass: "fill-stone-400 text-stone-500",
    };
  }

  if (value >= 67) {
    return {
      iconClass: "bg-lime-100 text-lime-900",
      lineClass: "text-stone-400",
      valueClass: "text-lime-700",
      pointClass: "fill-lime-500 text-lime-600",
    };
  }

  if (value >= 34) {
    return {
      iconClass: "bg-amber-100 text-amber-900",
      lineClass: "text-stone-400",
      valueClass: "text-amber-700",
      pointClass: "fill-amber-400 text-amber-500",
    };
  }

  return {
    iconClass: "bg-rose-100 text-rose-900",
    lineClass: "text-stone-400",
    valueClass: "text-rose-700",
    pointClass: "fill-rose-500 text-rose-500",
  };
}

function getSleepTone(value: number | null) {
  if (value === null) {
    return {
      iconClass: "bg-stone-200 text-stone-700",
      lineClass: "text-stone-500",
      valueClass: "text-stone-950",
      pointClass: "fill-stone-400 text-stone-500",
    };
  }

  if (value >= 8) {
    return {
      iconClass: "bg-sky-100 text-sky-900",
      lineClass: "text-sky-600",
      valueClass: "text-sky-700",
      pointClass: "fill-lime-500 text-lime-600",
    };
  }

  if (value >= 7) {
    return {
      iconClass: "bg-amber-100 text-amber-900",
      lineClass: "text-amber-500",
      valueClass: "text-amber-700",
      pointClass: "fill-amber-400 text-amber-500",
    };
  }

  return {
    iconClass: "bg-rose-100 text-rose-900",
    lineClass: "text-rose-500",
    valueClass: "text-rose-700",
    pointClass: "fill-rose-500 text-rose-500",
  };
}

function getStrainTone(value: number | null) {
  if (value === null) {
    return {
      iconClass: "bg-stone-200 text-stone-700",
      lineClass: "text-stone-500",
      valueClass: "text-stone-950",
      pointClass: "fill-stone-400 text-stone-500",
    };
  }

  if (value >= 14) {
    return {
      iconClass: "bg-blue-200 text-blue-950",
      lineClass: "text-blue-800",
      valueClass: "text-blue-900",
      pointClass: "fill-blue-800 text-blue-800",
    };
  }

  if (value >= 10) {
    return {
      iconClass: "bg-blue-100 text-blue-900",
      lineClass: "text-blue-600",
      valueClass: "text-blue-700",
      pointClass: "fill-blue-600 text-blue-600",
    };
  }

  return {
    iconClass: "bg-sky-100 text-sky-900",
    lineClass: "text-sky-500",
    valueClass: "text-sky-700",
    pointClass: "fill-sky-500 text-sky-500",
  };
}

function getOvernightTone(tone: DailySummary["overnightRead"]["tone"]) {
  switch (tone) {
    case "normal":
      return {
        iconClass: "bg-lime-100 text-lime-900",
        valueClass: "text-lime-700",
      };
    case "warning":
      return {
        iconClass: "bg-amber-100 text-amber-900",
        valueClass: "text-amber-700",
      };
    case "danger":
      return {
        iconClass: "bg-rose-100 text-rose-900",
        valueClass: "text-rose-700",
      };
    default:
      return {
        iconClass: "bg-stone-200 text-stone-700",
        valueClass: "text-stone-950",
      };
  }
}

function TrendSparkline({
  values,
  formatter,
  lineClass,
  pointClass,
}: {
  values: Array<number | null>;
  formatter: (value: number | null) => string;
  lineClass: string;
  pointClass: (value: number | null) => string;
}) {
  const safeValues = values.map((value) => value ?? 0);
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const coordinates = safeValues.map((value, index) => {
    const x = index * 44 + 6;
    const y = 36 - ((value - min) / range) * 24;
    return { x, y };
  });
  const points = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <svg aria-hidden="true" className="mt-3 h-12 w-full overflow-visible" viewBox="0 0 100 48">
      <path d="M4 33 H96" className="stroke-stone-200" strokeWidth="1" fill="none" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={lineClass}
      />
      {values.map((value, index) => {
        const { x, y } = coordinates[index];
        const pointTone = pointClass(value);
        return (
          <g key={`${value}-${index}`}>
            <circle cx={x} cy={y} r="3" className={pointTone} />
            <text
              x={x}
              y={y < 16 ? y + 14 : y - 8}
              textAnchor="middle"
              className={`text-[9px] font-semibold ${pointTone.replace("fill-", "text-")}`}
            >
              {formatter(value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TrendChart({
  points,
  lineClass,
  gradientId,
}: {
  points: TrendPoint[];
  lineClass: string;
  gradientId: string;
}) {
  const safeValues = points.map((point) => point.value ?? 0);
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const coordinates = points.map((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * 280 + 12;
    const y = 116 - (((point.value ?? 0) - min) / range) * 84;
    return { x, y, label: point.label, value: point.value };
  });
  const line = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const area = `12,120 ${line} 292,120`;

  return (
    <svg aria-hidden="true" className="mt-5 h-36 w-full" viewBox="0 0 304 132">
      <defs>
        <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d="M12 120H292" className="stroke-stone-200" strokeWidth="1" fill="none" />
      <path d="M12 78H292" className="stroke-stone-100" strokeWidth="1" fill="none" />
      <polygon points={area} fill={`url(#${gradientId})`} className={lineClass} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={lineClass}
      />
      {coordinates.map(({ x, y, label, value }, index) => (
        <g key={`${label}-${index}`}>
          <circle cx={x} cy={y} r="3.5" className={lineClass.replace("text-", "fill-")} />
          {shouldShowXAxisLabel(points.length, index) ? (
            <text x={x} y="128" textAnchor="middle" className="fill-stone-500 text-[10px] font-medium">
              {label}
            </text>
          ) : null}
          <text x={x} y={y - 10} textAnchor="middle" className="fill-stone-700 text-[10px] font-semibold">
            {value === null ? "--" : Number.isInteger(value) ? `${value}` : value.toFixed(1)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function shouldShowXAxisLabel(length: number, index: number) {
  if (length <= 8) {
    return true;
  }

  return index === 0 || index === length - 1 || index % 3 === 0;
}

export function SummaryBanner({ message }: { message: string }) {
  return (
    <section className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.88)_0%,_rgba(255,255,255,0.82)_100%)] px-5 py-4 text-sm text-[#312c49] shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)]">
      {message}
    </section>
  );
}

export function TodayHeroMetrics({ summary }: { summary: DailySummary }) {
  const recoveryTone = getRecoveryTone(summary.readiness.recoveryScore);
  const strainTone = getStrainTone(summary.strainSummary.score);
  const sleepTone = getSleepTone(summary.readiness.sleepHours);
  const overnightTone = getOvernightTone(summary.overnightRead.tone);

  const cards: Array<{
    label: string;
    value: string;
    kind: "recovery" | "strain" | "sleep" | "load" | "overnight";
    subtitle: string;
    trend?: Array<number | null>;
    trendFormatter?: (value: number | null) => string;
    iconClass: string;
    lineClass?: string;
    valueClass: string;
    pointClass?: (value: number | null) => string;
  }> = [
    {
      label: "Recovery",
      value:
        summary.readiness.recoveryScore === null
          ? "--"
          : `${formatNumber(summary.readiness.recoveryScore)}%`,
      kind: "recovery",
      subtitle: "WHOOP recovery over the last 3 checks",
      trend: summary.miniTrends.recovery3d,
      trendFormatter: (value) => (value === null ? "--" : `${formatNumber(value, 0)}%`),
      iconClass: recoveryTone.iconClass,
      lineClass: recoveryTone.lineClass,
      valueClass: recoveryTone.valueClass,
      pointClass: (value) => getRecoveryTone(value).pointClass,
    },
    {
      label: "Strain",
      value: formatNumber(summary.strainSummary.score, 1),
      kind: "strain",
      subtitle: "WHOOP day strain over the last 3 days",
      trend: summary.miniTrends.strain3d,
      trendFormatter: (value) => formatNumber(value, 1),
      iconClass: strainTone.iconClass,
      lineClass: strainTone.lineClass,
      valueClass: strainTone.valueClass,
      pointClass: (value) => getStrainTone(value).pointClass,
    },
    {
      label: "Sleep",
      value: formatHours(summary.readiness.sleepHours),
      kind: "sleep",
      subtitle: "Actual sleep over the last 3 nights",
      trend: summary.miniTrends.sleep3d,
      trendFormatter: (value) => formatHours(value),
      iconClass: sleepTone.iconClass,
      lineClass: sleepTone.lineClass,
      valueClass: sleepTone.valueClass,
      pointClass: (value) => getSleepTone(value).pointClass,
    },
    {
      label: "Load",
      value: `${summary.miniTrends.liftsThisWeek} lifts`,
      kind: "load",
      subtitle: "Lifts logged since Monday",
      iconClass: "bg-stone-950 text-white",
      valueClass: "text-stone-950",
    },
    {
      label: "Overnight Read",
      value: summary.overnightRead.label,
      kind: "overnight",
      subtitle: summary.overnightRead.detail,
      iconClass: overnightTone.iconClass,
      valueClass: overnightTone.valueClass,
    },
  ];

  return (
    <section className="rounded-[1.9rem] border border-white/70 bg-white/85 p-6 shadow-[0_24px_80px_rgba(74,93,35,0.12)] backdrop-blur sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lime-700">
            Morning Loop
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
            How ready you are today
          </h2>
        </div>
        <p className="max-w-lg text-sm leading-6 text-stone-600">
          Start with recovery, sleep, strain, lifting demand, and the simplest read on what last night did to you. The rest of the product should simply explain what that means for today.
        </p>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-[1.45rem] border border-stone-200/80 bg-stone-50/80 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ${card.iconClass}`}>
                <MetricGlyph kind={card.kind} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {card.label}
                </p>
                <p className={`text-lg font-semibold ${card.valueClass}`}>{card.value}</p>
              </div>
            </div>
            {card.trend && card.trendFormatter && card.pointClass ? (
              <TrendSparkline
                values={card.trend}
                formatter={card.trendFormatter}
                lineClass={card.lineClass ?? "text-stone-600"}
                pointClass={card.pointClass}
              />
            ) : (
              <p className="mt-4 text-sm text-stone-600">{card.subtitle}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function TopActionsSection({ summary }: { summary: DailySummary }) {
  return (
    <section className="rounded-[1.9rem] border border-stone-200/80 bg-white/85 p-6 shadow-[0_18px_55px_rgba(78,88,61,0.1)] sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
            Today
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
            What to do today
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-stone-600">
          Keep the decision surface small: three actions, clear priority, and enough rationale to trust the call.
        </p>
      </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {summary.recommendations.slice(0, 3).map((item) => (
            <article
              key={item.title}
              className={`rounded-[1.65rem] border px-5 py-5 shadow-[0_16px_42px_rgba(62,75,43,0.08)] ${getRecommendationAccent(item.category)}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-stone-950 shadow-[0_10px_24px_rgba(0,0,0,0.08)] ring-1 ring-white/70">
                  <RecommendationGlyph category={item.category} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">
                      {item.category}
                    </span>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">
                      {item.priority}
                    </span>
                  </div>
                  <h3 className="mt-3 text-[1.65rem] font-semibold leading-tight tracking-tight text-stone-950">
                    {shortenRecommendationTitle(item.title)}
                  </h3>
                  <div className="mt-4 space-y-3.5">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Do now
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2.5">
                        {item.primaryActions.map((tile) => renderActionTile(tile, "primary"))}
                      </div>
                    </div>
                    {item.conditionalActions?.length ? (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          If needed
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2.5">
                          {item.conditionalActions.map((tile) => renderActionTile(tile, "conditional"))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-stone-600">{item.why}</p>
                  {formatEvidenceLine(item.supportingMetrics) ? (
                    <p className="mt-4 border-t border-stone-200/70 pt-3 text-[11px] font-medium tracking-[0.03em] text-stone-500">
                      {formatEvidenceLine(item.supportingMetrics)}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
        ))}
      </div>
    </section>
  );
}

export function WhatChangedCard({ summary }: { summary: DailySummary }) {
  const additionalDeltas = summary.whyChangedToday.deltas
    .filter((delta) => delta !== summary.whyChangedToday.headline)
    .slice(0, 3);

  return (
    <section className="rounded-[1.75rem] border border-stone-200/80 bg-white/85 p-6 shadow-[0_18px_55px_rgba(78,88,61,0.1)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
        Why this changed
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
        {summary.whyChangedToday.headline}
      </h2>
      {additionalDeltas.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {additionalDeltas.map((delta) => (
            <div
              key={delta}
              className="rounded-[1.1rem] border border-stone-200 bg-stone-50/85 px-4 py-3 text-sm leading-6 text-stone-700"
            >
              {delta}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
          No other material shifts stood out versus your recent baseline, so the recommendation is being driven mainly by this change.
        </p>
      )}
    </section>
  );
}

const ACTIVE_SIGNAL_LABELS: Array<{
  key: keyof DailyStressFlags;
  label: string;
}> = [
  { key: "illnessRisk", label: "Physiology looks stressed" },
  { key: "poorSleepTrend", label: "Sleep trend is under baseline" },
  { key: "lowRecovery", label: "Recovery is suppressed" },
  { key: "elevatedRestingHeartRate", label: "Resting heart rate is elevated" },
  { key: "suppressedHrv", label: "HRV is suppressed" },
  { key: "highTrainingLoad", label: "Training load is stacked" },
  { key: "localFatigueUpper", label: "Upper body is still carrying load" },
  { key: "localFatigueLower", label: "Lower body is still carrying load" },
];

export function ActiveSignalsStrip({ summary }: { summary: DailySummary }) {
  const activeSignals = ACTIVE_SIGNAL_LABELS.filter(({ key }) => summary.stressFlags[key]).slice(0, 3);
  const overnightSignal =
    summary.overnightRead.label !== "Normal night"
      ? {
          key: "overnightRead",
          label:
            summary.lateNightDisruption.likelyLane === "illness_like"
              ? "Possible illness-like pattern"
              : summary.lateNightDisruption.active
                ? "Late-night disruption"
                : "Strong overnight recovery hit",
        }
      : null;
  const allSignals = overnightSignal ? [overnightSignal, ...activeSignals] : activeSignals;

  if (allSignals.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[1.6rem] border border-amber-200/80 bg-amber-50/80 px-5 py-4 shadow-[0_16px_45px_rgba(165,111,18,0.08)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Active signals
          </p>
          <p className="mt-2 text-sm text-amber-950">
            Only the flags that meaningfully changed today are surfaced here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {allSignals.slice(0, 4).map((signal) => (
            <span
              key={signal.key}
              className="rounded-full border border-amber-300 bg-white/70 px-3 py-1.5 text-sm font-semibold text-amber-900"
            >
              {signal.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function getTrendNote(kind: "recovery" | "sleep" | "strain" | "load" | "weight", summary: DailySummary) {
  switch (kind) {
    case "recovery":
      return `3d average ${formatNumber(summary.readiness.recoveryTrend3d)}% against a whole-day recovery score of ${formatNumber(summary.readiness.recoveryScore)}%.`;
    case "sleep":
      return `Actual sleep is ${formatHours(summary.readiness.sleepHours)} with a ${formatHours(summary.readiness.sleepVsNeedHours)} gap versus WHOOP need.`;
    case "strain":
      return summary.strainSummary.blurb;
    case "load":
      return `${summary.trainingLoad.hevyWorkoutCount7d} workouts and ${summary.trainingLoad.hevySetCount7d} sets across the last 7 days.`;
    case "weight":
      return `Current weight is ${formatPounds(kilogramsToPounds(summary.readiness.bodyWeightKg))} with a 28d drift of ${
        summary.readiness.bodyWeightDelta28dKg === null
          ? "--"
          : formatPounds(Math.abs(kilogramsToPounds(summary.readiness.bodyWeightDelta28dKg) ?? 0))
      }.`;
    default:
      return "";
  }
}

function TrendStat({
  title,
  value,
  note,
  points,
  lineClass,
  gradientId,
}: {
  title: string;
  value: string;
  note: string;
  points: TrendPoint[];
  lineClass: string;
  gradientId: string;
}) {
  const avg = average(points.map((point) => point.value));
  return (
    <article className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.9)_0%,_rgba(255,255,255,0.8)_100%)] p-5 shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#6d6785]">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#171329]">{value}</p>
        </div>
        <p className="rounded-[8px] bg-[rgba(104,96,153,0.08)] px-2.5 py-1 text-[11px] font-medium text-[#6c6488]">
          {avg === null ? "No baseline" : `Avg ${avg.toFixed(title === "Lifting Load" ? 1 : 0)}`}
        </p>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#645c7d]">{note}</p>
      <TrendChart points={points} lineClass={lineClass} gradientId={gradientId} />
    </article>
  );
}

export function TrendsGrid({ summary }: { summary: DailySummary }) {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <TrendStat
        title="Recovery"
        value={
          summary.readiness.recoveryScore === null
            ? "--"
            : `${formatNumber(summary.readiness.recoveryScore)}%`
        }
        note={getTrendNote("recovery", summary)}
        points={summary.trendSeries.recovery7d}
        lineClass="text-lime-600"
        gradientId="recovery-gradient"
      />
      <TrendStat
        title="Sleep"
        value={formatHours(summary.readiness.sleepHours)}
        note={getTrendNote("sleep", summary)}
        points={summary.trendSeries.sleep7d}
        lineClass="text-sky-600"
        gradientId="sleep-gradient"
      />
      <TrendStat
        title="Strain"
        value={formatNumber(summary.strainSummary.score, 1)}
        note={getTrendNote("strain", summary)}
        points={summary.trendSeries.strain7d}
        lineClass="text-blue-700"
        gradientId="strain-gradient"
      />
      <TrendStat
        title="Lifting Load"
        value={`${summary.trainingLoad.hevyWorkoutCount7d} workouts`}
        note={getTrendNote("load", summary)}
        points={summary.trendSeries.load7d}
        lineClass="text-stone-800"
        gradientId="load-gradient"
      />
      <div className="xl:col-span-2">
        <TrendStat
          title="Body Weight"
          value={formatPounds(kilogramsToPounds(summary.readiness.bodyWeightKg))}
          note={getTrendNote("weight", summary)}
          points={summary.trendSeries.weight14d}
          lineClass="text-amber-700"
          gradientId="weight-gradient"
        />
      </div>
    </section>
  );
}

export function ConnectionsStatusCards({
  whoop,
  hevy,
}: {
  whoop: {
    connected: boolean;
    isStale: boolean;
    lastSyncStatus: string | null;
    lastSyncCompletedAt: string | null;
  };
  hevy: {
    connected: boolean;
    isStale: boolean;
    lastSyncStatus: string | null;
    lastSyncCompletedAt: string | null;
  };
}) {
  const cards = [
    {
      name: "WHOOP",
      connected: whoop.connected,
      isStale: whoop.isStale,
      lastSyncStatus: whoop.lastSyncStatus,
      lastSyncCompletedAt: whoop.lastSyncCompletedAt,
      primaryHref: "/api/auth/whoop",
      primaryLabel: whoop.connected ? "Reconnect WHOOP" : "Connect WHOOP",
      syncFormAction: "/api/whoop/sync",
    },
    {
      name: "Hevy",
      connected: hevy.connected,
      isStale: hevy.isStale,
      lastSyncStatus: hevy.lastSyncStatus,
      lastSyncCompletedAt: hevy.lastSyncCompletedAt,
      primaryHref: null,
      primaryLabel: null,
      syncFormAction: "/api/hevy/sync",
    },
  ];

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {cards.map((card) => {
        const tone = !card.connected
          ? {
              label: "Needs attention",
              badgeClass: "bg-amber-500",
              cardClass: "border-amber-200 bg-amber-50/80",
            }
          : card.lastSyncStatus === "failed"
            ? {
                label: "Sync failed",
                badgeClass: "bg-rose-600",
                cardClass: "border-rose-200 bg-rose-50/80",
              }
            : card.isStale
              ? {
                  label: "Connected, stale",
                  badgeClass: "bg-stone-700",
                  cardClass: "border-stone-200 bg-stone-50/80",
                }
              : {
                  label: "Connected",
                  badgeClass: "bg-lime-600",
                  cardClass: "border-lime-200 bg-lime-50/80",
                };

        return (
          <article
            key={card.name}
            className={`rounded-[1.6rem] border p-5 shadow-[0_18px_55px_rgba(78,88,61,0.08)] ${tone.cardClass}`}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-stone-950">{card.name}</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white ${tone.badgeClass}`}
              >
                {tone.label}
              </span>
            </div>
            <p className="mt-3 text-sm text-stone-700">
              Last sync: {formatTimestamp(card.lastSyncCompletedAt)}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {card.primaryHref ? (
                <a
                  className="inline-flex h-11 items-center justify-center rounded-full bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-stone-800"
                  href={card.primaryHref}
                >
                  {card.primaryLabel}
                </a>
              ) : null}
              <form action={card.syncFormAction} method="post">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full border border-stone-300 px-5 text-sm font-semibold text-stone-800 transition hover:border-stone-950 hover:bg-white"
                  type="submit"
                >
                  Sync {card.name}
                </button>
              </form>
            </div>
          </article>
        );
      })}
    </section>
  );
}
