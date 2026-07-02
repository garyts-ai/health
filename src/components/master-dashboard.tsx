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
      className={`hud-chip aqua-action-chip inline-flex min-h-7 items-center gap-1.5 px-2 text-[12px] font-medium ${
        subtle ? "hud-chip-coral text-[#ffd0c4]" : "text-white/82"
      }`}
    >
      <span className={subtle ? "text-[#ff9f1c]" : "text-[#39f8ff]"}>
        <ActionStepGlyph icon={tile.icon} />
      </span>
      {tile.label}
    </span>
  );
}

function DecisionCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="aqua-decision-cell border-t border-white/10 px-3 py-2 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <div className="hud-micro-label text-[10px]">{label}</div>
      <div className="mt-1 truncate text-[13px] font-semibold text-white/88">{value}</div>
    </div>
  );
}

function FreshnessNotice({ message }: { message: string }) {
  return (
    <div className="hud-frame hud-content aqua-freshness-notice px-3 py-2 text-[13px] leading-5 text-[#fff0c7]">
      {message}
    </div>
  );
}

function ActionCard({ item, index }: { item: DailyRecommendation; index: number }) {
  const isNutrition = item.category === "nutrition";
  const isRecovery = item.category === "recovery";

  return (
    <article
      data-premium-surface
      data-premium-tone={isNutrition ? "caution" : isRecovery ? "recovery" : "hud"}
      data-premium-enter
      className="hud-frame aqua-recommendation-card text-white"
    >
      <div className="hud-content p-3">
        <div className="flex items-start gap-3">
          <div className={`hud-orb h-9 w-9 shrink-0 ${isNutrition ? "text-[#ff9f1c]" : isRecovery ? "text-[#78e08f]" : "text-[#39f8ff]"}`}>
            <RecommendationGlyph category={item.category} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] text-[#39f8ff] drop-shadow-[0_0_10px_rgba(57,248,255,0.8)]">0{index + 1}</span>
              <span className="hud-micro-label text-[10px]">{item.priority}</span>
            </div>
            <h2 className="mt-1 text-[17px] font-semibold leading-5 tracking-[-0.035em] text-white">
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

        <details className="mt-2 text-[13px] leading-5 text-white/66">
          <summary className="cursor-pointer font-medium text-[#39f8ff]">Evidence</summary>
          <p className="mt-1">{item.why}</p>
        </details>
        {item.supportingMetrics.length ? (
          <p className="mt-2 truncate border-t border-white/10 pt-2 text-[11px] text-white/46">
            {item.supportingMetrics.slice(0, 3).join(" · ")}
          </p>
        ) : null}
      </div>
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
    <main className="hud-cockpit aquarium-cockpit giga-shell premium-cockpit relative min-h-screen overflow-x-clip text-white">
      <MobilePullSync />

      <div className="aquarium-stage relative z-[1] mx-auto flex min-h-screen w-full max-w-[1560px] flex-col gap-4 px-3 py-3 sm:px-5 lg:px-7">
        <header className="flex flex-col gap-3 border-b border-[#2adfff]/20 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <p className="hud-micro-label">{vm.header.productName}</p>
            <span className="h-2 w-2 rounded-full bg-[#39f8ff] shadow-[0_0_16px_#39f8ff]" />
            <p className="text-[13px] text-white/54">{vm.header.dateLabel}</p>
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

        <section className="aquarium-layout-grid grid gap-4">
          <aside className="aqua-left-rail grid content-start gap-3">
            <div className="aqua-identity-lockup relative hidden min-h-[190px] overflow-hidden px-1 pt-2">
              <div className="pointer-events-none absolute left-20 top-0 h-36 w-36 rounded-full border border-[#39f8ff]/32 shadow-[0_0_78px_rgba(57,248,255,0.3)]" />
              <p className="hud-micro-label">Health OS</p>
              <h1 className="mt-2 text-[76px] font-semibold leading-[0.82] tracking-[-0.04em] text-white drop-shadow-[0_0_34px_rgba(126,255,247,0.32)] sm:text-[92px]">
                Today
              </h1>
              <p className="mt-5 text-[15px] text-white/68">{vm.header.dateLabel}</p>
            </div>

            <div
              data-premium-surface
              data-premium-tone="caution"
              data-premium-enter
              className="hud-frame aqua-overnight-pod text-white"
            >
              <div className="hud-content p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="hud-micro-label">Overnight read</div>
                  <span className="text-[#ffb02e] drop-shadow-[0_0_12px_rgba(255,176,46,0.9)]">&rsaquo;</span>
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-[-0.05em]">{vm.hero.overnightRead.label}</div>
                <p className="mt-2 text-[13px] leading-5 text-white/66">{vm.hero.overnightRead.detail}</p>
              </div>
            </div>

            <div className="grid gap-2">
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

            <details className="hud-frame text-white">
              <summary className="hud-content cursor-pointer p-3 text-[13px] font-semibold text-[#39f8ff]">What changed</summary>
              <div className="hud-content grid gap-1.5 border-t border-white/10 px-3 pb-3 pt-1">
                {vm.contextBand.whyChanged.map((item) => (
                  <p key={item} className="text-[13px] leading-5 text-white/62">{item}</p>
                ))}
                {vm.hero.historicalQualifier ? (
                  <p className="border-t border-white/10 pt-2 text-[12px] text-white/48">
                    Personal baseline: {vm.hero.historicalQualifier}
                  </p>
                ) : null}
              </div>
            </details>
          </aside>

          <div className="aquarium-layout-main grid min-w-0 content-start gap-4">
            <section
              data-premium-surface
              data-premium-tone="command"
              data-premium-enter
              className="hud-frame hud-command aqua-command-deck text-white"
            >
              <span className="hud-scanline" />
              <span className="hud-energy-rail" />
              <div className="hud-content p-4 sm:p-5">
                <div className="aquarium-command-grid grid gap-5">
                  <div className="relative min-w-0">
                    <div className="hud-reactor hud-reactor-command aqua-jelly-orb hidden lg:block">
                      <div className="hud-reactor-icon">
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8">
                          <path
                            d="M4.5 9.5v5M7 8.5v7M9.5 11h5M17 8.5v7M19.5 9.5v5"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="hud-micro-label text-[#39f8ff]">Today&apos;s split call</p>
                    <div className="mt-2 text-[52px] font-semibold leading-[0.88] tracking-[-0.04em] text-white drop-shadow-[0_0_42px_rgba(126,255,247,0.4)] sm:text-[72px]">
                      {vm.hero.todayCall}
                    </div>
                    <p className="mt-4 text-[18px] font-semibold leading-6 text-white/90">
                      {vm.hero.decision.intensityIntentLabel}: {vm.hero.decision.intensity}
                    </p>
                    <p className="mt-2 max-w-[44rem] text-[13px] leading-5 text-white/62">
                      {vm.hero.decision.targetReason}
                    </p>

                    <div className="aqua-evidence-grid mt-4 grid gap-2 sm:grid-cols-2">
                      <div className="aqua-console-plate">
                        <div className="hud-micro-label text-[10px]">Schedule flexible</div>
                        <div className="mt-1 text-[12px] text-white/78">{vm.hero.decision.scheduleLabel}</div>
                      </div>
                      <div className="aqua-console-plate">
                        <div className="hud-micro-label text-[10px]">Physiology support</div>
                        <div className="mt-1 text-[12px] text-white/78">{vm.hero.readinessQualifier}</div>
                      </div>
                      <div className="aqua-console-plate aqua-console-plate-coral sm:col-span-2">
                        <div className="hud-micro-label text-[10px]">Session anchors</div>
                        <div className="mt-1 text-[12px] text-white/78">{vm.hero.decision.sessionAnchorsLabel}</div>
                      </div>
                    </div>

                    <div className="aqua-decision-strip mt-4 grid overflow-hidden sm:grid-cols-3">
                      <DecisionCell label="Calories" value={vm.hero.decision.calories} />
                      <DecisionCell label="Protein" value={vm.hero.decision.protein} />
                      <DecisionCell label="Remaining" value={vm.hero.decision.remaining} />
                    </div>

                    {topRecommendation ? (
                      <div className="aqua-best-move mt-4 p-3">
                        <div className="hud-micro-label">Best move now</div>
                        <div className="mt-1 text-[17px] font-semibold text-white">{topRecommendation.title}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {topRecommendation.primaryActions.slice(0, 3).map((tile) => (
                            <ActionTile key={`${topRecommendation.title}-${tile.label}-top`} tile={tile} />
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

                <div className="aqua-decision-strip aqua-decision-strip-bottom mt-4 grid overflow-hidden sm:grid-cols-5">
                  <DecisionCell label="Call" value={vm.hero.decision.train} />
                  <DecisionCell label="Intent" value={vm.hero.decision.intensityIntentLabel} />
                  <DecisionCell label="Pace" value={vm.hero.decision.scheduleLabel} />
                  <DecisionCell label="Next" value={vm.hero.decision.nextTrainingTarget} />
                  <DecisionCell label="Latest" value={`${vm.hero.workoutLabel} / ${vm.hero.latestSessionAgeLabel}`} />
                </div>
              </div>
            </section>

            <section className="aqua-console-row grid gap-3 lg:grid-cols-3">
              {vm.actionCards.map((item, index) => (
                <ActionCard key={item.title} item={item} index={index} />
              ))}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
