import { AnatomyFigure } from "@/components/anatomy-figure";
import { DailyBriefPreviewCard } from "@/components/daily-brief-preview-card";
import { SummaryBanner } from "@/components/dashboard-sections";
import { UtilityDrawer } from "@/components/utility-drawer";
import { buildTodayViewModel } from "@/lib/today-view-model";
import type { HevyConnectionStatus } from "@/lib/hevy/types";
import type {
  DailyRecommendation,
  DailySummary,
  DiscordDeliveryStatus,
  RecommendationActionIcon,
  RecommendationActionTile,
} from "@/lib/insights/types";
import type { WhoopConnectionStatus } from "@/lib/whoop/types";

type MasterDashboardProps = {
  deliveryStatus: DiscordDeliveryStatus;
  hevy: HevyConnectionStatus;
  isDiscordConfigured: boolean;
  summary: DailySummary;
  utilityBannerMessage?: string | null;
  whoop: WhoopConnectionStatus;
};

function RecommendationGlyph({ category }: { category: DailyRecommendation["category"] }) {
  const className = "h-4 w-4";
  switch (category) {
    case "training":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 12h16" />
          <path d="M7 9v6" />
          <path d="M17 9v6" />
          <path d="M10 8v8" />
          <path d="M14 8v8" />
        </svg>
      );
    case "recovery":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 21s-6.4-4.2-8.3-8.2c-1.5-2.9-.1-6.6 3.2-7.2C8.8 5.2 10.6 6 12 7.4c1.4-1.4 3.2-2.2 5.1-1.8 3.3.6 4.7 4.3 3.2 7.2C18.4 16.8 12 21 12 21Z" />
        </svg>
      );
    case "nutrition":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 3v8" />
          <path d="M11 3v8" />
          <path d="M9 3v18" />
          <path d="M16 3c2 2 3 4.3 3 6.8V21" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      );
  }
}

function ActionStepGlyph({ icon }: { icon: RecommendationActionIcon }) {
  const className = "h-3.5 w-3.5";
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
    case "fuel":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 12h16" />
          <path d="M7 9v6" />
          <path d="M17 9v6" />
        </svg>
      );
    case "electrolytes":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 3h8l1 5v10a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V8Z" />
          <path d="M12 11v4" />
          <path d="M10 13h4" />
        </svg>
      );
    case "food":
    case "protein":
    case "carbs":
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
        </svg>
      );
    case "stomach":
    case "symptoms":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M10 3v6c0 1.7-1 2.7-2.4 3.6C5.8 13.7 5 15.1 5 17a4 4 0 0 0 4 4h2a7 7 0 0 0 7-7v-1c0-2.2-1.8-4-4-4h-1V3" />
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
        </svg>
      );
    default:
      return null;
  }
}

function ActionTile({
  tile,
  conditional = false,
}: {
  tile: RecommendationActionTile;
  conditional?: boolean;
}) {
  return (
    <div
      className={
        conditional
          ? "inline-flex items-center gap-2 rounded-[10px] border border-[#ddd8ec] bg-[#f7f4fb] px-3 py-2 text-[13px] font-medium text-[#4d4767]"
          : "inline-flex items-center gap-2 rounded-[10px] border border-[#e3e0ef] bg-white px-3 py-2 text-[13px] font-medium text-[#25213a]"
      }
    >
      <span className="text-[#5f58a7]">
        <ActionStepGlyph icon={tile.icon} />
      </span>
      <span>{tile.label}</span>
      {tile.conditionLabel ? (
        <span className="text-[11px] text-[#756f8f]">{tile.conditionLabel}</span>
      ) : null}
    </div>
  );
}

function HeroStat({
  label,
  value,
  detail,
  trend,
  trendLabels,
  gaugeValue,
  sleepWindow,
}: {
  label: string;
  value: string;
  detail: string;
  trend: Array<number | null>;
  trendLabels: string[];
  gaugeValue?: number | null;
  sleepWindow?: {
    startLabel: string | null;
    endLabel: string | null;
  };
}) {
  const formatSleepDuration = (rawValue: string) => {
    const parsed = Number.parseFloat(rawValue.replace("h", ""));
    if (!Number.isFinite(parsed)) {
      return rawValue;
    }

    const hours = Math.floor(parsed);
    const minutes = Math.round((parsed - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  const formatTrendValue = (point: number | null) => {
    if (point === null) {
      return "--";
    }

    if (label === "Recovery") {
      return `${Math.round(point)}%`;
    }

    if (label === "Sleep") {
      return `${point.toFixed(1)}h`;
    }

    return point.toFixed(1);
  };

  const numericTrend = trend.filter((point): point is number => typeof point === "number");
  const min = numericTrend.length ? Math.min(...numericTrend) : 0;
  const max = numericTrend.length ? Math.max(...numericTrend) : 0;
  const range = max - min || 1;
  const chartMode =
    label === "Recovery" ? "gauge" : label === "Sleep" ? "timeline" : "bars";

  const bars = trend.map((point) => {
    if (point === null) {
      return { height: 6 };
    }

    const normalized = (point - min) / range;
    const height = 12 + normalized * 20;
    return { height };
  });

  const recoveryGauge = typeof gaugeValue === "number" ? Math.max(0, Math.min(100, gaugeValue)) : 0;

  const sleepStartMinutes = (() => {
    if (!sleepWindow?.startLabel) return null;
    const match = sleepWindow.startLabel.match(/(\d+):(\d+)\s?(AM|PM)/i);
    if (!match) return null;
    let hours = Number(match[1]) % 12;
    const minutes = Number(match[2]);
    const period = match[3].toUpperCase();
    if (period === "PM") hours += 12;
    return hours * 60 + minutes;
  })();
  const sleepEndMinutes = (() => {
    if (!sleepWindow?.endLabel) return null;
    const match = sleepWindow.endLabel.match(/(\d+):(\d+)\s?(AM|PM)/i);
    if (!match) return null;
    let hours = Number(match[1]) % 12;
    const minutes = Number(match[2]);
    const period = match[3].toUpperCase();
    if (period === "PM") hours += 12;
    return hours * 60 + minutes;
  })();
  const timelineStart = 20 * 60;
  const timelineEnd = 12 * 60 + 24 * 60;
  const normalizedSleepStart =
    sleepStartMinutes === null
      ? null
      : (sleepStartMinutes < timelineStart ? sleepStartMinutes + 24 * 60 : sleepStartMinutes);
  const normalizedSleepEnd =
    sleepEndMinutes === null
      ? null
      : (sleepEndMinutes < timelineStart ? sleepEndMinutes + 24 * 60 : sleepEndMinutes);
  const sleepStartX =
    normalizedSleepStart === null
      ? 18
      : 18 + ((normalizedSleepStart - timelineStart) / (timelineEnd - timelineStart)) * 116;
  const sleepEndX =
    normalizedSleepEnd === null
      ? 134
      : 18 + ((normalizedSleepEnd - timelineStart) / (timelineEnd - timelineStart)) * 116;
  const sleepDurationLabel = label === "Sleep" ? formatSleepDuration(value) : value;
  const latestStrainValue =
    trend.length && trend[trend.length - 1] !== null
      ? trend[trend.length - 1]!.toFixed(1)
      : value;
  const historyStrip = (
    <div className="grid grid-cols-3 gap-0 overflow-hidden rounded-[10px] bg-[rgba(104,96,153,0.08)] ring-1 ring-[rgba(116,108,152,0.06)]">
      {trend.map((point, index) => (
        <div
          key={`${label}-trend-${index}`}
          className="border-l border-[rgba(116,108,152,0.08)] px-2 py-2 text-center first:border-l-0"
        >
          <div className="text-[9px] text-[#8a83a4]">{trendLabels[index] ?? ""}</div>
          <div className="mt-0.5 text-[11px] font-semibold text-[#433a72]">
            {formatTrendValue(point)}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="rounded-[10px] bg-[linear-gradient(180deg,_rgba(245,242,252,0.84)_0%,_rgba(250,248,255,0.74)_100%)] px-4 py-3 text-[#171329] ring-1 ring-[rgba(116,108,152,0.08)]">
      <div className="text-[12px] text-[#746d8e]">{label}</div>

      <div className="mt-2.5 flex min-h-[84px] items-center justify-center">
        {chartMode === "gauge" ? (
          <svg aria-hidden="true" viewBox="0 0 110 110" className="h-[88px] w-[88px] overflow-visible">
            <circle cx="55" cy="55" r="34" fill="none" stroke="rgba(112,104,151,0.14)" strokeWidth="9" />
            <circle
              cx="55"
              cy="55"
              r="34"
              fill="none"
              stroke="#6a64b5"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 34}
              strokeDashoffset={(2 * Math.PI * 34) * (1 - recoveryGauge / 100)}
              transform="rotate(-90 55 55)"
            />
            <text x="55" y="54" textAnchor="middle" className="fill-[#332b64] text-[22px] font-semibold">
              {value}
            </text>
            <text x="55" y="70" textAnchor="middle" className="fill-[#8a83a4] text-[9px] font-medium">
              WHOOP score
            </text>
          </svg>
        ) : chartMode === "timeline" ? (
          <svg aria-hidden="true" viewBox="0 0 240 70" className="h-[68px] w-full max-w-[240px] overflow-visible">
            <text x="130" y="18" textAnchor="middle" className="fill-[#332b64] text-[24px] font-semibold">
              {sleepDurationLabel}
            </text>
            <line x1="20" y1="38" x2="220" y2="38" stroke="rgba(112,104,151,0.18)" strokeWidth="6" strokeLinecap="round" />
            <line
              x1={20 + ((sleepStartX - 18) / 116) * 200}
              y1="38"
              x2={20 + ((sleepEndX - 18) / 116) * 200}
              y2="38"
              stroke="#6a64b5"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle cx={20 + ((sleepStartX - 18) / 116) * 200} cy="38" r="4.5" fill="#6a64b5" />
            <circle cx={20 + ((sleepEndX - 18) / 116) * 200} cy="38" r="4.5" fill="#8b84db" />
            <text x="20" y="64" className="fill-[#6d6690] text-[10px] font-medium">
              {sleepWindow?.startLabel ?? "--"}
            </text>
            <text x="220" y="64" textAnchor="end" className="fill-[#6d6690] text-[10px] font-medium">
              {sleepWindow?.endLabel ?? "--"}
            </text>
          </svg>
        ) : chartMode === "bars" ? (
          <svg aria-hidden="true" viewBox="0 0 220 76" className="h-[68px] w-full max-w-[220px] overflow-visible">
            <text x="110" y="22" textAnchor="middle" className="fill-[#332b64] text-[24px] font-semibold">
              {latestStrainValue}
            </text>
            <line x1="56" y1="50" x2="164" y2="50" stroke="rgba(123,115,146,0.16)" strokeWidth="1.5" />
            {bars.map((bar, index) => (
              <rect
                key={`${label}-bar-${index}`}
                x={70 + index * 28}
                y={52 - bar.height}
                width={16}
                height={bar.height}
                rx="3"
                fill={index === bars.length - 1 ? "#ff967e" : "rgba(255, 150, 126, 0.45)"}
              />
            ))}
          </svg>
        ) : (
          <div className="h-px w-20 bg-[#d7d1ea]" />
        )}
      </div>

      <div className="mt-2 text-center text-[13px] leading-5 text-[#6b6484]">{detail}</div>
      <div className="mt-3">{historyStrip}</div>
    </div>
  );
}

function ActionCard({ item }: { item: DailyRecommendation }) {
  const title = item.title
    .replace("Use symptom-matched head and stomach support", "Support head and stomach")
    .replace("Keep training easy or rest today", "Keep training easy or rest")
    .replace("Prioritize recovery fueling today", "Prioritize recovery fueling");

  const theme =
    item.category === "training"
      ? {
          shell:
            "bg-[linear-gradient(180deg,_rgba(247,244,255,0.96)_0%,_rgba(255,255,255,0.94)_68%)] ring-[rgba(115,101,171,0.12)]",
          icon: "bg-[#efe9ff] text-[#4a4390]",
        }
      : item.category === "recovery"
        ? {
            shell:
              "bg-[linear-gradient(180deg,_rgba(245,249,255,0.96)_0%,_rgba(255,255,255,0.94)_68%)] ring-[rgba(109,131,191,0.12)]",
            icon: "bg-[#edf1ff] text-[#4a5f9f]",
          }
        : {
            shell:
              "bg-[linear-gradient(180deg,_rgba(255,246,242,0.96)_0%,_rgba(255,255,255,0.94)_68%)] ring-[rgba(194,118,83,0.12)]",
            icon: "bg-[#fff0e8] text-[#91563a]",
          };

  return (
    <article className={`rounded-[12px] p-5 shadow-[0_10px_28px_rgba(22,20,35,0.08)] ring-1 ${theme.shell}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${theme.icon}`}>
            <RecommendationGlyph category={item.category} />
          </div>
          <div>
            <div className="text-[13px] text-[#6f6887]">{item.category}</div>
            <h2 className="mt-1 text-[26px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#171329]">
              {title}
            </h2>
          </div>
        </div>
        <div className="text-[12px] text-[#796f96]">{item.priority}</div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <div className="mb-2 text-[12px] text-[#726b8c]">Do now</div>
          <div className="flex flex-wrap gap-2">
            {item.primaryActions.map((tile) => (
              <ActionTile key={`${tile.label}-primary`} tile={tile} />
            ))}
          </div>
        </div>

        {item.conditionalActions?.length ? (
          <div>
            <div className="mb-2 text-[12px] text-[#726b8c]">If needed</div>
            <div className="flex flex-wrap gap-2">
              {item.conditionalActions.map((tile) => (
                <ActionTile
                  key={`${tile.label}-${tile.conditionLabel ?? "conditional"}`}
                  tile={tile}
                  conditional
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <p className="mt-5 text-[14px] leading-6 text-[#4f4965]">{item.why}</p>
      {item.supportingMetrics.length ? (
        <p className="mt-4 border-t border-[rgba(128,118,164,0.16)] pt-3 text-[12px] text-[#7b7492]">
          {item.supportingMetrics.slice(0, 3).join(" / ")}
        </p>
      ) : null}
    </article>
  );
}

export async function MasterDashboard({
  deliveryStatus,
  hevy,
  isDiscordConfigured,
  summary,
  utilityBannerMessage,
  whoop,
}: MasterDashboardProps) {
  const vm = buildTodayViewModel(summary, whoop, hevy, deliveryStatus);
  const getTierTone = (hits: number) => {
    if (hits >= 3) {
      return {
        dot: "bg-[#ff5e86]",
        text: "text-white/86",
        hits: "text-[#ffd4df]",
      };
    }

    if (hits === 2) {
      return {
        dot: "bg-[#ff8e7a]",
        text: "text-white/82",
        hits: "text-[#ffd5ca]",
      };
    }

    return {
      dot: "bg-[#b5abff]",
      text: "text-white/78",
      hits: "text-[#d9d4ff]",
    };
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f2fb] text-[#171329]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(253,132,122,0.55),_transparent_23%),radial-gradient(circle_at_top_right,_rgba(93,92,186,0.46),_transparent_26%),linear-gradient(180deg,_#766db9_0%,_#5d54a3_16%,_#f5f2fb_54%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-[26vh] h-[44rem] bg-[radial-gradient(circle_at_center,_rgba(255,164,136,0.18),_transparent_34%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-8 px-6 py-6 lg:px-10 lg:py-8">
        <header className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[15px] font-medium text-white/84">{vm.header.productName}</div>
            <h1 className="mt-2 text-[64px] font-semibold leading-[0.92] tracking-[-0.06em] text-white">
              Today
            </h1>
            <p className="mt-3 text-[15px] text-white/72">{vm.header.dateLabel}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right text-[14px] leading-5 text-white/66 lg:block">
              <div>{vm.header.utilityLabel}</div>
            </div>
            <UtilityDrawer
              deliveryStatus={deliveryStatus}
              hevy={hevy}
              isDiscordConfigured={isDiscordConfigured}
              preview={<DailyBriefPreviewCard deliveryStatus={deliveryStatus} summary={summary} />}
              summary={summary}
              utilityLabel={vm.header.utilityLabel}
              whoop={whoop}
            />
          </div>
        </header>

        {utilityBannerMessage ? <SummaryBanner message={utilityBannerMessage} /> : null}

        <section className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
          <div className="rounded-[12px] bg-[rgba(24,19,42,0.84)] px-5 py-5 text-white shadow-[0_14px_55px_rgba(17,15,31,0.2)] backdrop-blur-sm">
              <div className="text-[13px] text-white/58">Overnight read</div>
              <div className="mt-2 text-[36px] font-semibold leading-[0.98] tracking-[-0.05em]">
                {vm.hero.overnightRead.label}
              </div>
              <div className="mt-3 max-w-[18rem] text-[14px] leading-6 text-white/72">
                {vm.hero.overnightRead.detail}
              </div>
            </div>

            <div className="overflow-hidden rounded-[12px] bg-[linear-gradient(180deg,_rgba(242,238,251,0.9)_0%,_rgba(247,244,255,0.82)_100%)] p-2 shadow-[0_10px_28px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(255,255,255,0.48)] backdrop-blur-[18px]">
              <div className="grid gap-2">
                {vm.hero.metrics.map((metric) => (
                  <HeroStat
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    detail={metric.detail}
                    trend={metric.trend}
                    trendLabels={metric.trendLabels}
                    gaugeValue={metric.gaugeValue}
                    sleepWindow={metric.sleepWindow}
                  />
                ))}
              </div>
            </div>
          </div>

          <section className="overflow-hidden rounded-[12px] bg-[linear-gradient(135deg,_rgba(33,24,76,0.98)_0%,_rgba(85,67,148,0.95)_46%,_rgba(248,141,116,0.92)_100%)] px-6 py-6 text-white shadow-[0_20px_80px_rgba(31,24,61,0.24)]">
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div>
                  <div className="text-[13px] text-white/58">Today&apos;s split call</div>
                  <div className="mt-2 max-w-[21rem] text-[44px] font-semibold leading-[0.92] tracking-[-0.06em]">
                    {vm.hero.todayCall}
                  </div>
                  <div className="mt-4 text-[14px] leading-6 text-white/74">
                    {vm.hero.decision.intensityIntentLabel}: {vm.hero.decision.intensity}
                  </div>
                  <div className="mt-2 max-w-[34rem] text-[13px] leading-6 text-white/66">
                    {vm.hero.decision.targetReason} {vm.hero.decision.bottleneck}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] bg-white/10 ring-1 ring-white/10">
                  {[
                    ["Train", vm.hero.decision.train],
                    ["Intensity", vm.hero.decision.intensityIntentLabel],
                    ["Calories", vm.hero.decision.calories],
                    ["Protein", vm.hero.decision.protein],
                    ["Intake", vm.hero.decision.intake],
                    ["Remaining", vm.hero.decision.remaining],
                    ["Anchors", vm.hero.decision.sessionAnchorsLabel],
                    ["Latest", `${vm.hero.workoutLabel} / ${vm.hero.latestSessionAgeLabel}`],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-[rgba(19,13,34,0.18)] px-3 py-3">
                      <div className="text-[11px] text-white/48">{label}</div>
                      <div className="mt-1 text-[14px] font-semibold leading-5 text-white/88">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-[12px] bg-[radial-gradient(circle_at_50%_20%,_rgba(255,255,255,0.10),_transparent_18%),radial-gradient(circle_at_78%_85%,_rgba(255,146,118,0.16),_transparent_24%),radial-gradient(circle_at_50%_100%,_rgba(67,66,154,0.36),_transparent_42%)] px-4 py-4">
                  <div className="mb-4 flex items-center justify-between gap-4 text-[13px] text-white/68">
                    <span>This week&apos;s training map</span>
                    <div className="flex items-center gap-3.5 text-[12px]">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-[#b5abff]" />
                        1x
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-[#ff8e7a]" />
                        2x
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-[#ff5e86]" />
                        3x+
                      </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-3 w-3 rounded-full bg-[#72fff2] shadow-[0_0_12px_rgba(114,255,242,0.95)]" />
                          Latest
                        </span>
                    </div>
                  </div>

                  <div className="flex min-h-[34rem] items-center justify-center">
                    <div className="w-full max-w-[38rem]">
                      <AnatomyFigure
                        weeklyHighlights={summary.bodyCard.weeklyHighlightedRegions}
                        latestHighlights={summary.bodyCard.latestWorkoutOverlayRegions}
                        className="h-[29rem] w-full lg:h-[36rem]"
                      />
                    </div>
                  </div>

                  {vm.hero.weeklyMapNote ? (
                    <div className="mt-3 rounded-[10px] border border-white/10 bg-[rgba(18,13,35,0.14)] px-3 py-2 text-[12px] leading-5 text-white/72">
                      {vm.hero.weeklyMapNote}
                    </div>
                  ) : null}
                </div>

                <aside className="rounded-[12px] bg-[rgba(19,13,34,0.18)] px-4 py-4 ring-1 ring-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13px] text-white/60">Weekly muscle volume</div>
                    <div className="text-[11px] text-white/44">Mon-Sun</div>
                  </div>
                  {vm.hero.weeklyFocus.length > 0 ? (
                    <div className="mt-4 space-y-2.5">
                      {vm.hero.weeklyFocus.map((item) => {
                        const tone = getTierTone(item.hits);
                        return (
                          <div
                            key={item.label}
                            className="flex items-center justify-between gap-3 border-b border-white/8 pb-2 last:border-b-0 last:pb-0"
                          >
                            <div className={`flex items-center gap-2 text-[14px] ${tone.text}`}>
                              <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                              <span>{item.label}</span>
                            </div>
                            <span className={`text-[13px] ${tone.hits}`}>
                              {item.effectiveSets} sets / {item.hits}x
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-[10px] border border-dashed border-white/12 bg-[rgba(17,13,31,0.1)] px-3 py-3 text-[13px] leading-5 text-white/68">
                        {vm.hero.weeklyFocusEmptyMessage}
                      </div>
                      <div className="rounded-[10px] bg-[rgba(17,13,31,0.14)] px-3 py-3 text-[12px] leading-5 text-white/58">
                        Weekly set volume starts after your first logged lift. The neon outline can still show the most recent weekend session.
                      </div>
                      <div className="rounded-[10px] bg-[rgba(255,255,255,0.06)] px-3 py-3">
                        <div className="text-[11px] text-white/42">Latest outline</div>
                        <div className="mt-1 text-[13px] font-semibold leading-5 text-white/78">
                          {vm.hero.workoutLabel}
                        </div>
                        <div className="mt-1 text-[12px] text-white/50">
                          {vm.hero.latestSessionAgeLabel}
                        </div>
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            </div>
          </section>

          <div className="grid gap-4">
            <div className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.88)_0%,_rgba(255,255,255,0.82)_100%)] px-5 py-5 shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)] backdrop-blur-[18px]">
              <div className="text-[14px] text-[#6d6785]">What changed</div>
              <div className="mt-4 space-y-3">
                {vm.contextBand.whyChanged.map((item) => (
                  <p key={item} className="text-[15px] leading-6 text-[#1f1b30]">
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(247,243,255,0.84)_0%,_rgba(255,255,255,0.8)_100%)] px-5 py-5 shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)] backdrop-blur-[18px]">
              <div className="text-[14px] text-[#6d6785]">Weekly scorecard</div>
              <div className="mt-4 space-y-2">
                {vm.scorecard.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start justify-between gap-3 border-b border-[rgba(121,110,159,0.12)] pb-2 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <div className="text-[14px] text-[#312c49]">{item.label}</div>
                      <div className="mt-0.5 text-[12px] text-[#7b7492]">{item.detail}</div>
                    </div>
                    <div
                      className={
                        item.status === "good"
                          ? "text-[14px] font-semibold text-[#4f4796]"
                          : item.status === "watch"
                            ? "text-[14px] font-semibold text-[#9a5946]"
                            : "text-[14px] font-semibold text-[#7b7492]"
                      }
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {vm.actionCards.map((item) => (
            <ActionCard key={item.title} item={item} />
          ))}
        </section>

        <section className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.84)_0%,_rgba(255,255,255,0.8)_100%)] px-5 py-4 shadow-[0_10px_28px_rgba(22,20,35,0.06)] ring-1 ring-[rgba(77,67,119,0.12)] backdrop-blur-[18px]">
          <div className="grid gap-4 lg:grid-cols-4">
            {vm.trendBand.map((item) => (
              <div
                key={item.label}
                className="min-w-0 border-l border-[rgba(121,110,159,0.12)] pl-4 first:border-l-0 first:pl-0"
              >
                <div className="text-[13px] text-[#726b8c]">{item.label}</div>
                <div className="mt-2 truncate text-[24px] font-semibold tracking-[-0.03em] text-[#171329]">
                  {item.value}
                </div>
                <div className="mt-1 text-[13px] leading-5 text-[#6f6886]">{item.detail}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
