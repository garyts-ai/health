import { TrainingMap } from "@/components/training-map";
import { DailyBriefPreviewCard } from "@/components/daily-brief-preview-card";
import { SummaryBanner } from "@/components/dashboard-sections";
import { HeroStatCard } from "@/components/hero-stat-card";
import { MobilePullSync } from "@/components/mobile-pull-sync";
import { ProductNav } from "@/components/product-nav";
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
  if (category === "training") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 12h16" />
        <path d="M7 9v6" />
        <path d="M17 9v6" />
        <path d="M10 8v8" />
        <path d="M14 8v8" />
      </svg>
    );
  }
  if (category === "recovery") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 21s-6.4-4.2-8.3-8.2c-1.5-2.9-.1-6.6 3.2-7.2C8.8 5.2 10.6 6 12 7.4c1.4-1.4 3.2-2.2 5.1-1.8 3.3.6 4.7 4.3 3.2 7.2C18.4 16.8 12 21 12 21Z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3v8" />
      <path d="M11 3v8" />
      <path d="M9 3v18" />
      <path d="M16 3c2 2 3 4.3 3 6.8V21" />
    </svg>
  );
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
        </svg>
      );
    case "sleep":
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M13 3a8.5 8.5 0 1 0 8 11.5A9 9 0 0 1 13 3Z" />
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
    default:
      return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 12h16" />
          <path d="M7 9v6" />
          <path d="M17 9v6" />
        </svg>
      );
  }
}

function ActionTile({
  tile,
  subtle = false,
}: {
  tile: RecommendationActionTile;
  subtle?: boolean;
}) {
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-[7px] border px-2 text-[12px] font-medium ${
        subtle
          ? "border-[#ddd7e9] bg-[#f3eff8] text-[#5f5874]"
          : "border-[#d9d2e6] bg-white text-[#29233d]"
      }`}
    >
      <span className="text-[#5d54a3]">
        <ActionStepGlyph icon={tile.icon} />
      </span>
      {tile.label}
    </span>
  );
}

function DecisionCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-white/10 px-3 py-2 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <div className="text-[10px] text-white/44">{label}</div>
      <div className="mt-0.5 truncate text-[13px] font-semibold text-white/84">{value}</div>
    </div>
  );
}

function FreshnessNotice({ message }: { message: string }) {
  return (
    <div className="rounded-[9px] border border-[#fed7aa] bg-[#fff7ed] px-3 py-2 text-[13px] leading-5 text-[#7c2d12]">
      {message}
    </div>
  );
}

function ActionCard({ item, index }: { item: DailyRecommendation; index: number }) {
  const tone =
    item.category === "training"
      ? "border-[#dcd6ea] bg-[#f8f5ff]"
      : item.category === "recovery"
        ? "border-[#d9dff0] bg-[#f6f7ff]"
        : "border-[#edd8ce] bg-[#fff7f1]";

  return (
    <article
      data-premium-surface
      data-premium-tone={item.category === "recovery" ? "recovery" : item.category === "nutrition" ? "caution" : "light"}
      data-premium-enter
      className={`rounded-[10px] border ${tone} p-3`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[#dcd6ea] bg-white text-[#4f3b93]">
          <RecommendationGlyph category={item.category} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-[#6c6482]">#{index + 1}</span>
            <span className="text-[11px] text-[#817994]">{item.priority}</span>
          </div>
          <h2 className="mt-1 text-[16px] font-semibold leading-5 tracking-[-0.03em] text-[#171329]">
            {item.title}
          </h2>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.primaryActions.slice(0, 2).map((tile) => (
          <ActionTile key={`${item.title}-${tile.label}`} tile={tile} />
        ))}
        {item.conditionalActions?.slice(0, 1).map((tile) => (
          <ActionTile key={`${item.title}-${tile.label}-conditional`} tile={tile} subtle />
        ))}
      </div>

      <details className="mt-2 text-[13px] leading-5 text-[#514a66]">
        <summary className="cursor-pointer font-medium text-[#5d54a3]">Evidence</summary>
        <p className="mt-1">{item.why}</p>
      </details>
      {item.supportingMetrics.length ? (
        <p className="mt-2 truncate border-t border-[#e5dfed] pt-2 text-[11px] text-[#7b7492]">
          {item.supportingMetrics.slice(0, 3).join(" · ")}
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
  const topRecommendation = vm.actionCards[0];

  return (
    <main className="giga-shell premium-cockpit relative min-h-screen overflow-x-clip bg-[#0f0a1c] text-[#171329]">
      <MobilePullSync />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,_#0f0a1c_0%,_#171126_58%,_#f3eff8_58%,_#f3eff8_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1480px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-3 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[13px] font-medium text-white/56">{vm.header.productName}</p>
            <h1 className="text-3xl font-semibold leading-none tracking-[-0.06em] sm:text-4xl">Today</h1>
            <p className="text-[13px] text-white/52">{vm.header.dateLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <ProductNav current="today" dark />
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
        {vm.header.freshnessNotice ? <FreshnessNotice message={vm.header.freshnessNotice} /> : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div
            data-premium-surface
            data-premium-tone="live"
            data-premium-enter
            className="rounded-[12px] border border-white/12 bg-[#171126] p-3 text-white"
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.86fr)_minmax(360px,1.14fr)]">
              <div className="min-w-0">
                <p className="text-[12px] text-white/48">Split call</p>
                <div className="mt-1 text-[38px] font-semibold leading-[0.9] tracking-[-0.07em] sm:text-[48px]">
                  {vm.hero.todayCall}
                </div>
                <p className="mt-3 text-[14px] leading-5 text-white/76">
                  {vm.hero.decision.intensityIntentLabel}: {vm.hero.decision.intensity}
                </p>
                <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-white/58">
                  {vm.hero.decision.targetReason}
                </p>

                <div className="mt-3 grid overflow-hidden rounded-[9px] border border-white/10 bg-white/5 sm:grid-cols-3">
                  <DecisionCell label="Calories" value={vm.hero.decision.calories} />
                  <DecisionCell label="Protein" value={vm.hero.decision.protein} />
                  <DecisionCell label="Remaining" value={vm.hero.decision.remaining} />
                </div>

                {topRecommendation ? (
                  <div className="mt-3 rounded-[9px] border border-white/10 bg-white/[0.06] p-3">
                    <div className="text-[11px] text-white/46">Best move now</div>
                    <div className="mt-1 text-[15px] font-semibold text-white/90">{topRecommendation.title}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {topRecommendation.primaryActions.slice(0, 3).map((tile) => (
                        <span
                          key={`${topRecommendation.title}-${tile.label}-top`}
                          className="rounded-[8px] border border-white/10 bg-white/8 px-2.5 py-1.5 text-[12px] text-white/76"
                        >
                          {tile.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <TrainingMap
                weeklyHighlights={summary.bodyCard.weeklyHighlightedRegions}
                latestHighlights={summary.bodyCard.latestWorkoutOverlayRegions}
                weeklyVolume={vm.hero.weeklyFocus}
                latestWorkout={vm.hero.workoutLabel}
                latestSessionAge={vm.hero.latestSessionAgeLabel}
                workoutCount={summary.trainingLoad.hevyWorkoutCountThisWeek}
                emptyMessage={vm.hero.weeklyFocusEmptyMessage}
                note={vm.hero.weeklyMapNote}
              />
            </div>

            <div className="mt-3 hidden overflow-hidden rounded-[9px] border border-white/10 bg-white/5 sm:grid sm:grid-cols-5">
              <DecisionCell label="Call" value={vm.hero.decision.train} />
              <DecisionCell label="Intent" value={vm.hero.decision.intensityIntentLabel} />
              <DecisionCell label="Pace" value={vm.hero.decision.scheduleLabel} />
              <DecisionCell label="Next" value={vm.hero.decision.nextTrainingTarget} />
              <DecisionCell label="Latest" value={`${vm.hero.workoutLabel} / ${vm.hero.latestSessionAgeLabel}`} />
            </div>
          </div>

          <aside className="hidden content-start gap-3 xl:grid">
            <div
              data-premium-surface
              data-premium-tone="dark"
              data-premium-enter
              className="rounded-[10px] border border-white/10 bg-[#171126] p-3 text-white"
            >
              <div className="text-[12px] text-white/48">Overnight</div>
              <div className="mt-1 text-xl font-semibold tracking-[-0.04em]">{vm.hero.overnightRead.label}</div>
              <p className="mt-1 text-[13px] leading-5 text-white/62">{vm.hero.overnightRead.detail}</p>
            </div>

            <div className="grid gap-2 rounded-[10px] border border-[#d9d2e6] bg-[#eee8f7] p-2">
              {vm.hero.metrics.map((metric) => (
                <HeroStatCard
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

            <details className="rounded-[10px] border border-[#d9d2e6] bg-[#f8f5ff] p-3 text-[#171329]">
              <summary className="cursor-pointer text-[13px] font-semibold">What changed</summary>
              <div className="mt-2 grid gap-1.5">
                {vm.contextBand.whyChanged.map((item) => (
                  <p key={item} className="text-[13px] leading-5 text-[#514a66]">{item}</p>
                ))}
                {vm.hero.historicalQualifier ? (
                  <p className="border-t border-[#e5dfed] pt-2 text-[12px] text-[#746d8e]">
                    Personal baseline: {vm.hero.historicalQualifier}
                  </p>
                ) : null}
              </div>
            </details>
          </aside>
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          {vm.actionCards.map((item, index) => (
            <ActionCard key={item.title} item={item} index={index} />
          ))}
        </section>

        <section className="grid gap-3 xl:hidden">
          <div
            data-premium-surface
            data-premium-tone="dark"
            data-premium-enter
            className="rounded-[10px] border border-white/10 bg-[#171126] p-3 text-white"
          >
            <div className="text-[12px] text-white/48">Overnight</div>
            <div className="mt-1 text-xl font-semibold tracking-[-0.04em]">{vm.hero.overnightRead.label}</div>
            <p className="mt-1 text-[13px] leading-5 text-white/62">{vm.hero.overnightRead.detail}</p>
          </div>

          <div className="grid gap-2 rounded-[10px] border border-[#d9d2e6] bg-[#eee8f7] p-2">
            {vm.hero.metrics.map((metric) => (
              <HeroStatCard
                key={`${metric.label}-mobile`}
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
        </section>
      </div>
    </main>
  );
}
