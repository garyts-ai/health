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

function FreshnessNotice({ message }: { message: string }) {
  return (
    <div className="rounded-[10px] border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-[13px] leading-5 text-[#7c2d12] shadow-[0_2px_8px_rgba(22,20,35,0.06)]">
      {message}
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
            "bg-[#f8f5ff] border-[#ddd6ee] ring-[rgba(84,71,136,0.12)]",
          icon: "bg-[#efe9ff] text-[#4a4390]",
        }
      : item.category === "recovery"
        ? {
            shell:
              "bg-[#f6f7ff] border-[#d9dff0] ring-[rgba(74,95,159,0.12)]",
            icon: "bg-[#edf1ff] text-[#4a5f9f]",
          }
        : {
            shell:
              "bg-[#fff6f0] border-[#edd8ce] ring-[rgba(151,80,54,0.12)]",
            icon: "bg-[#fff0e8] text-[#91563a]",
          };

  return (
    <article className={`giga-reveal rounded-[14px] border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_14px_34px_rgba(18,11,42,0.12)] ring-1 ${theme.shell}`}>
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

  return (
    <main className="giga-shell premium-cockpit relative min-h-screen overflow-x-clip bg-[#0d091a] text-[#171329]">
      <MobilePullSync />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,_rgba(255,139,114,0.44),_transparent_20%),radial-gradient(circle_at_74%_6%,_rgba(112,255,241,0.12),_transparent_16%),radial-gradient(circle_at_50%_38%,_rgba(80,58,150,0.72),_transparent_32%),linear-gradient(180deg,_#0d091a_0%,_#1a1033_35%,_#5a4487_68%,_#e88372_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,0.038)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:88px_88px]" />
      <div className="pointer-events-none fixed inset-x-[-12%] top-[20vh] h-[38rem] bg-[radial-gradient(circle_at_center,_rgba(114,255,242,0.12),_transparent_18%),radial-gradient(circle_at_58%_58%,_rgba(255,139,114,0.13),_transparent_32%)] blur-2xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1520px] flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <header className="giga-reveal flex items-start justify-between gap-6">
          <div>
            <div className="text-[13px] font-medium text-white/62">{vm.header.productName}</div>
            <h1 className="mt-2 text-[54px] font-semibold leading-[0.86] tracking-[-0.075em] text-white sm:text-[78px] lg:text-[96px]">
              Today
            </h1>
            <p className="mt-4 text-[15px] text-white/68">{vm.header.dateLabel}</p>
          </div>

          <div className="flex flex-col items-end gap-4">
            <ProductNav current="today" dark />
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
          </div>
        </header>

        {utilityBannerMessage ? <SummaryBanner message={utilityBannerMessage} /> : null}
        {vm.header.freshnessNotice ? <FreshnessNotice message={vm.header.freshnessNotice} /> : null}

        <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="giga-reveal giga-reveal-delay-2 order-2 flex flex-col gap-4 xl:order-none">
          <div className="rounded-[14px] border border-white/10 bg-[#120d24]/92 px-5 py-5 text-white shadow-[0_14px_44px_rgba(8,5,22,0.30)]">
              <div className="text-[13px] text-white/58">Overnight read</div>
              <div className="mt-2 text-[36px] font-semibold leading-[0.98] tracking-[-0.05em]">
                {vm.hero.overnightRead.label}
              </div>
              <div className="mt-3 max-w-[18rem] text-[14px] leading-6 text-white/72">
                {vm.hero.overnightRead.detail}
              </div>
            </div>

            <div className="overflow-hidden rounded-[14px] border border-[#d6d0e4] bg-[#eee8f7] p-2 shadow-[0_18px_44px_rgba(15,9,32,0.18)] ring-1 ring-white/50">
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
            </div>
            {vm.hero.historicalQualifier ? (
              <div className="border-l-2 border-[#71fff1] bg-[#120d24]/86 px-4 py-3 text-[13px] leading-5 text-white/72">
                Personal baseline: {vm.hero.historicalQualifier}
              </div>
            ) : null}
          </div>

          <section className="relative order-1 overflow-hidden rounded-[18px] border border-white/14 bg-[radial-gradient(circle_at_54%_42%,_rgba(114,255,242,0.12),_transparent_18%),radial-gradient(circle_at_30%_18%,_rgba(255,139,114,0.18),_transparent_24%),linear-gradient(135deg,_rgba(16,10,37,0.99)_0%,_rgba(52,36,104,0.98)_48%,_rgba(210,114,101,0.94)_100%)] px-5 py-5 text-white shadow-[0_30px_90px_rgba(6,4,18,0.46)] sm:px-6 sm:py-6 xl:order-none">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,_transparent,_rgba(255,255,255,0.42),_transparent)]" />
            <div className="flex flex-col gap-6">
              <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_21rem]">
                <div>
                  <div className="text-[13px] text-white/58">Today&apos;s split call</div>
                  <div className="mt-2 max-w-[28rem] text-[46px] font-semibold leading-[0.86] tracking-[-0.075em] sm:text-[54px]">
                    {vm.hero.todayCall}
                  </div>
                  <div className="mt-3 text-[15px] leading-6 text-white/78">
                    {vm.hero.decision.intensityIntentLabel}: {vm.hero.decision.intensity}
                  </div>
                  <div className="mt-2 max-w-[42rem] text-[13px] leading-5 text-white/66">
                    {vm.hero.decision.targetReason}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {vm.hero.decision.decisionFactors.slice(0, 3).map((factor) => (
                      <span
                        key={factor.label}
                        className="rounded-[9px] border border-white/12 bg-[rgba(17,10,38,0.20)] px-2.5 py-1 text-[11px] text-white/70"
                      >
                        {factor.label}: {factor.detail}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] bg-white/10 ring-1 ring-white/14 sm:hidden">
                    {[
                      ["Call", vm.hero.decision.train],
                      ["Intent", vm.hero.decision.intensityIntentLabel],
                      ["Next", vm.hero.decision.nextTrainingTarget],
                      ["Pace", vm.hero.decision.scheduleLabel],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-[rgba(17,10,38,0.24)] px-3 py-2.5">
                        <div className="text-[10px] text-white/46">{label}</div>
                        <div className="mt-1 text-[13px] font-semibold leading-4 text-white/88">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

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

              <div className="hidden grid-cols-4 gap-px overflow-hidden rounded-[12px] bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] ring-1 ring-white/14 sm:grid">
                {[
                  ["Call", vm.hero.decision.train],
                  ["Intensity", vm.hero.decision.intensityIntentLabel],
                  ["Pace", vm.hero.decision.scheduleLabel],
                  ["Next split", vm.hero.decision.nextTrainingTarget],
                  ["Calories", vm.hero.decision.calories],
                  ["Protein", vm.hero.decision.protein],
                  ["Intake", vm.hero.decision.intake],
                  ["Remaining", vm.hero.decision.remaining],
                  [vm.hero.decision.availability === "Rest" ? "Next lift" : "Anchors", vm.hero.decision.sessionAnchorsLabel],
                  ["Latest", `${vm.hero.workoutLabel} / ${vm.hero.latestSessionAgeLabel}`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[rgba(14,9,31,0.30)] px-3 py-2">
                    <div className="text-[11px] text-white/48">{label}</div>
                    <div className="mt-1 text-[13px] font-semibold leading-5 text-white/84">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="order-3 grid gap-4 lg:order-none lg:col-start-2">
            <div className="giga-reveal giga-reveal-delay-2 rounded-[14px] border border-[#ded7ee] bg-[#f8f5ff] px-5 py-5 shadow-[0_12px_30px_rgba(18,11,42,0.10)] ring-1 ring-white/55">
              <div className="text-[14px] text-[#6d6785]">What changed</div>
              <div className="mt-4 space-y-3">
                {vm.contextBand.whyChanged.map((item) => (
                  <p key={item} className="text-[15px] leading-6 text-[#1f1b30]">
                    {item}
                  </p>
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

      </div>
    </main>
  );
}
