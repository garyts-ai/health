import { AnatomyFigure } from "@/components/anatomy-figure";
import { buildTodayViewModel } from "@/lib/today-view-model";
import type { DailySummary, DiscordDeliveryStatus } from "@/lib/insights/types";

type DailyBriefPreviewCardProps = {
  deliveryStatus: DiscordDeliveryStatus;
  summary: DailySummary;
};

export async function DailyBriefPreviewCard({
  deliveryStatus,
  summary,
}: DailyBriefPreviewCardProps) {
  const dashboard = buildTodayViewModel(
    summary,
    { connected: true, isStale: false },
    { connected: true, isStale: false },
    deliveryStatus,
  );
  const imagePrompt =
    "Use only this snapshot to infer today's training, eating, recovery, supplements, and caution priorities. Make a fresh call from the metrics rather than echoing the app's built-in recommendations.";

  return (
    <div className="w-full max-w-[1040px] rounded-[16px] bg-[linear-gradient(155deg,_#2b2353_0%,_#6250a7_44%,_#ff9a82_100%)] p-5 text-[#19162a]">
      <div className="flex flex-col gap-3">
        <div className="rounded-[12px] bg-[rgba(17,13,31,0.34)] px-5 py-3 text-white ring-1 ring-white/8">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-[11px] font-medium text-white/58">External model handoff</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-white/58">{dashboard.header.productName}</p>
              <p className="mt-1 text-sm font-medium text-white/84">{dashboard.header.dateLabel}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="rounded-[12px] bg-[rgba(19,15,34,0.72)] px-4 py-4 text-white shadow-[0_12px_32px_rgba(16,12,33,0.18)] ring-1 ring-white/10">
              <p className="text-[11px] text-white/58">Overnight read</p>
              <p className="mt-2 text-[30px] font-semibold leading-[0.95] tracking-[-0.04em]">
                {dashboard.hero.overnightRead.label}
              </p>
              <p className="mt-2 text-[12px] leading-5 text-white/72">
                {dashboard.hero.overnightRead.detail}
              </p>
            </div>

            <div className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(243,239,251,0.92)_0%,_rgba(255,255,255,0.84)_100%)] p-3 shadow-[0_12px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)]">
              <div className="space-y-2.5">
                {dashboard.hero.metrics.map((metric) => (
                  <MiniExportStat
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

          <div className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(74,56,144,0.46)_0%,_rgba(93,67,145,0.34)_52%,_rgba(252,149,127,0.3)_100%)] p-4 shadow-[0_14px_36px_rgba(22,20,35,0.12)] ring-1 ring-white/10">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_226px]">
              <div>
                <div className="rounded-[10px] bg-[rgba(17,13,31,0.18)] p-4 text-white/92 ring-1 ring-white/8">
                  <p className="text-[11px] text-white/58">Today&apos;s split call</p>
                  <p className="mt-2 text-[34px] font-semibold leading-[0.92] tracking-[-0.05em] text-white">
                    {dashboard.hero.todayCall}
                  </p>
                  <p className="mt-2 text-[12px] leading-5 text-white/76">
                    {dashboard.hero.decision.intensityIntentLabel}: {dashboard.hero.decision.intensity}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-white/72">
                    Anchors: {dashboard.hero.decision.sessionAnchorsLabel}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-white/72">
                    {dashboard.hero.decision.calories} / protein {dashboard.hero.decision.protein}
                  </p>
                  <p className="mt-3 text-[12px] text-white/72">
                    Latest session: {dashboard.hero.workoutLabel} / {dashboard.hero.latestSessionAgeLabel}
                  </p>
                  <p className="mt-2 text-[12px] leading-5 text-white/72">
                    {dashboard.hero.readinessQualifier}
                  </p>
                </div>

                <div className="mt-3 rounded-[10px] bg-[rgba(17,13,31,0.12)] p-4 ring-1 ring-white/8">
                  <div className="mb-3 flex items-center justify-between gap-4 text-white">
                    <p className="text-[12px] text-white/68">This week&apos;s training map</p>
                    <div className="flex items-center gap-3 text-[11px] text-white/74">
                      <LegendDot className="bg-[#bfb7ff]" label="1x" />
                      <LegendDot className="bg-[#ff9b84]" label="2x" />
                      <LegendDot className="bg-[#ff6f93]" label="3x+" />
                      <LegendDot className="bg-[#49fff2]" label="Latest" />
                    </div>
                  </div>

                  <div className="flex min-h-[268px] items-center justify-center rounded-[10px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_36%),linear-gradient(180deg,_rgba(44,34,88,0.4)_0%,_rgba(49,38,98,0.24)_100%)] px-4 py-4">
                    <AnatomyFigure
                      className="max-h-[248px] w-full max-w-[348px]"
                      weeklyHighlights={summary.bodyCard.weeklyHighlightedRegions}
                      latestHighlights={summary.bodyCard.latestWorkoutOverlayRegions}
                    />
                  </div>

                  {dashboard.hero.weeklyMapNote ? (
                    <div className="mt-3 rounded-[10px] border border-white/8 bg-[rgba(17,13,31,0.14)] px-3 py-2 text-[11px] leading-5 text-white/72">
                      {dashboard.hero.weeklyMapNote}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[10px] bg-[rgba(17,13,31,0.16)] p-4 text-white ring-1 ring-white/8">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] text-white/68">Weekly muscle volume</p>
                    <p className="mt-1 text-[11px] text-white/46">Mon-Sun</p>
                  </div>
                  <p className="text-[11px] text-white/56">{summary.trainingLoad.hevyWorkoutCount7d} lifts</p>
                </div>

                {dashboard.hero.weeklyFocus.length > 0 ? (
                  <div className="mt-4 space-y-2.5">
                    {dashboard.hero.weeklyFocus.slice(0, 10).map((item) => (
                      <div
                        key={`${item.label}-${item.hits}`}
                        className="flex items-center justify-between gap-3 border-b border-white/8 pb-2 last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              item.hits >= 3
                                ? "bg-[#ff6f93]"
                                : item.hits >= 2
                                  ? "bg-[#ff9b84]"
                                  : "bg-[#bfb7ff]"
                            }`}
                          />
                          <span className="text-[13px] text-white/88">{item.label}</span>
                        </div>
                        <span className="text-[13px] font-medium text-white/78">
                          {item.effectiveSets} / {item.hits}x
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[10px] border border-dashed border-white/12 bg-[rgba(17,13,31,0.1)] px-3 py-3 text-[12px] leading-5 text-white/62">
                    {dashboard.hero.weeklyFocusEmptyMessage}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-px overflow-hidden rounded-[10px] bg-[rgba(17,13,31,0.12)] ring-1 ring-white/10 md:grid-cols-4">
              {dashboard.trendBand.map((item) => (
                <div key={item.label} className="bg-[rgba(255,255,255,0.86)] px-4 py-3">
                  <p className="text-[11px] text-[#7a7395]">{item.label}</p>
                  <p className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-[#171329]">
                    {item.value}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[#6a6384]">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-[10px] bg-[rgba(17,13,31,0.24)] px-4 py-3 text-white ring-1 ring-white/8">
              <p className="text-[11px] leading-5 text-white/86">{imagePrompt}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      <span>{label}</span>
    </span>
  );
}

function MiniExportStat({
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
    if (point === null) return "--";
    if (label === "Recovery") return `${Math.round(point)}%`;
    if (label === "Sleep") return `${point.toFixed(1)}h`;
    return point.toFixed(1);
  };

  const chartMode = label === "Recovery" ? "gauge" : label === "Sleep" ? "timeline" : "bars";
  const numericTrend = trend.filter((point): point is number => typeof point === "number");
  const min = numericTrend.length ? Math.min(...numericTrend) : 0;
  const max = numericTrend.length ? Math.max(...numericTrend) : 0;
  const range = max - min || 1;
  const recoveryGauge = typeof gaugeValue === "number" ? Math.max(0, Math.min(100, gaugeValue)) : 0;
  const bars = trend.map((point) => {
    if (point === null) return { height: 5 };
    return { height: 8 + ((point - min) / range) * 16 };
  });
  const sleepDurationLabel = label === "Sleep" ? formatSleepDuration(value) : value;

  return (
    <div className="rounded-[10px] bg-white/72 px-3 py-3 ring-1 ring-[rgba(77,67,119,0.08)]">
      <p className="text-[11px] text-[#776f92]">{label}</p>
      <div className="mt-2 flex min-h-[60px] items-center justify-center">
        {chartMode === "gauge" ? (
          <svg aria-hidden="true" viewBox="0 0 86 86" className="h-[68px] w-[68px] overflow-visible">
            <circle cx="43" cy="43" r="23" fill="none" stroke="rgba(112,104,151,0.14)" strokeWidth="7" />
            <circle
              cx="43"
              cy="43"
              r="23"
              fill="none"
              stroke="#6a64b5"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 23}
              strokeDashoffset={(2 * Math.PI * 23) * (1 - recoveryGauge / 100)}
              transform="rotate(-90 43 43)"
            />
            <text x="43" y="43" textAnchor="middle" className="fill-[#332b64] text-[18px] font-semibold">
              {value}
            </text>
          </svg>
        ) : chartMode === "timeline" ? (
          <div className="w-full max-w-[150px]">
            <div className="text-center text-[18px] font-semibold tracking-[-0.03em] text-[#332b64]">
              {sleepDurationLabel}
            </div>
            <div className="mt-2 h-[5px] rounded-full bg-[rgba(112,104,151,0.16)]">
              <div className="relative mx-auto h-[5px] w-[54%] rounded-full bg-[#6a64b5]">
                <span className="absolute -left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#6a64b5]" />
                <span className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#8b84db]" />
              </div>
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-[#6d6690]">
              <span>{sleepWindow?.startLabel ?? "--"}</span>
              <span>{sleepWindow?.endLabel ?? "--"}</span>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[120px]">
            <div className="text-center text-[18px] font-semibold tracking-[-0.03em] text-[#332b64]">
              {value}
            </div>
            <div className="mt-2 flex items-end justify-center gap-2 border-b border-[rgba(123,115,146,0.16)] pb-0.5">
              {bars.map((bar, index) => (
                <div
                  key={`${label}-mini-bar-${index}`}
                  className={`w-3 rounded-t-[3px] ${
                    index === bars.length - 1 ? "bg-[#ff967e]" : "bg-[rgba(255,150,126,0.48)]"
                  }`}
                  style={{ height: `${bar.height}px` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="mt-1 text-center text-[11px] leading-4 text-[#6b6484]">{detail}</p>
      <div className="mt-2 grid grid-cols-3 gap-px overflow-hidden rounded-[8px] bg-[rgba(104,96,153,0.08)]">
        {trend.map((point, index) => (
          <div key={`${label}-mini-trend-${index}`} className="bg-white/45 px-1.5 py-1.5 text-center">
            <div className="text-[8px] text-[#8a83a4]">{trendLabels[index] ?? ""}</div>
            <div className="mt-0.5 text-[9px] font-semibold text-[#433a72]">{formatTrendValue(point)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
