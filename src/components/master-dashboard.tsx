import { AnatomyFigure } from "@/components/anatomy-figure";
import { DailyBriefPreviewCard } from "@/components/daily-brief-preview-card";
import { SummaryBanner } from "@/components/dashboard-sections";
import { HeroStatCard } from "@/components/hero-stat-card";
import { MobilePullSync } from "@/components/mobile-pull-sync";
import { UtilityDrawer } from "@/components/utility-drawer";
import { buildTodayViewModel } from "@/lib/today-view-model";
import type { HevyConnectionStatus } from "@/lib/hevy/types";
import type {
  DailyActivityKind,
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

function getActivityDotClass(kind: DailyActivityKind) {
  if (kind === "walking") {
    return "bg-[#beb2ff] shadow-[0_0_0_1px_rgba(64,54,116,0.1)]";
  }

  if (kind === "tennis") {
    return "bg-[#ff8d73] shadow-[0_0_0_1px_rgba(143,76,63,0.12)]";
  }

  return "bg-[#d8d1df] shadow-[0_0_0_1px_rgba(68,61,80,0.1)]";
}

function getActivityTextClass(kind: DailyActivityKind) {
  if (kind === "tennis") {
    return "text-[#874838]";
  }

  if (kind === "walking") {
    return "text-[#4f4796]";
  }

  return "text-[#665f78]";
}

function getActivityMarkHeight(strain: number) {
  return `${Math.min(36, Math.max(10, 8 + strain * 3))}px`;
}

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
            "bg-[linear-gradient(180deg,_rgba(250,247,255,0.98)_0%,_rgba(238,232,255,0.94)_100%)] ring-[rgba(115,101,171,0.18)]",
          icon: "bg-[#efe9ff] text-[#4a4390]",
        }
      : item.category === "recovery"
        ? {
            shell:
              "bg-[linear-gradient(180deg,_rgba(246,251,255,0.98)_0%,_rgba(237,243,255,0.94)_100%)] ring-[rgba(109,131,191,0.18)]",
            icon: "bg-[#edf1ff] text-[#4a5f9f]",
          }
        : {
            shell:
              "bg-[linear-gradient(180deg,_rgba(255,248,244,0.98)_0%,_rgba(255,238,230,0.94)_100%)] ring-[rgba(194,118,83,0.18)]",
            icon: "bg-[#fff0e8] text-[#91563a]",
          };

  return (
    <article className={`giga-reveal rounded-[20px] p-5 shadow-[0_24px_80px_rgba(18,11,42,0.18)] ring-1 ${theme.shell}`}>
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
    <main className="giga-shell relative min-h-screen overflow-x-hidden bg-[#120d24] text-[#171329]">
      <MobilePullSync />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_4%,_rgba(255,139,114,0.56),_transparent_22%),radial-gradient(circle_at_76%_5%,_rgba(112,255,241,0.18),_transparent_18%),radial-gradient(circle_at_50%_36%,_rgba(88,65,168,0.82),_transparent_32%),linear-gradient(180deg,_#100b22_0%,_#28194d_28%,_#6c569f_58%,_#f08a76_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none fixed inset-x-[-10%] top-[18vh] h-[42rem] bg-[radial-gradient(circle_at_center,_rgba(114,255,242,0.18),_transparent_18%),radial-gradient(circle_at_58%_58%,_rgba(255,139,114,0.18),_transparent_32%)] blur-2xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1520px] flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <header className="giga-reveal flex items-start justify-between gap-6">
          <div>
            <div className="text-[13px] font-medium text-white/62">{vm.header.productName}</div>
            <h1 className="mt-2 text-[54px] font-semibold leading-[0.86] tracking-[-0.075em] text-white sm:text-[78px] lg:text-[96px]">
              Today
            </h1>
            <p className="mt-4 text-[15px] text-white/68">{vm.header.dateLabel}</p>
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
        {vm.header.freshnessNotice ? <FreshnessNotice message={vm.header.freshnessNotice} /> : null}

        <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="giga-reveal giga-reveal-delay-2 order-2 flex flex-col gap-4 xl:order-none">
          <div className="rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,_rgba(15,10,31,0.92),_rgba(33,22,62,0.84))] px-5 py-5 text-white shadow-[0_24px_80px_rgba(8,5,22,0.34)] backdrop-blur-xl">
              <div className="text-[13px] text-white/58">Overnight read</div>
              <div className="mt-2 text-[36px] font-semibold leading-[0.98] tracking-[-0.05em]">
                {vm.hero.overnightRead.label}
              </div>
              <div className="mt-3 max-w-[18rem] text-[14px] leading-6 text-white/72">
                {vm.hero.overnightRead.detail}
              </div>
            </div>

            <div className="overflow-hidden rounded-[18px] border border-white/20 bg-[linear-gradient(180deg,_rgba(250,247,255,0.96)_0%,_rgba(239,234,255,0.88)_100%)] p-2 shadow-[0_22px_70px_rgba(15,9,32,0.22)] ring-1 ring-[rgba(255,255,255,0.35)] backdrop-blur-[18px]">
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
          </div>

          <section className="giga-reveal giga-reveal-delay-1 order-1 overflow-hidden rounded-[28px] border border-white/14 bg-[radial-gradient(circle_at_54%_42%,_rgba(114,255,242,0.16),_transparent_18%),radial-gradient(circle_at_30%_18%,_rgba(255,139,114,0.22),_transparent_24%),linear-gradient(135deg,_rgba(20,12,48,0.98)_0%,_rgba(61,43,119,0.96)_46%,_rgba(244,137,115,0.94)_100%)] px-5 py-5 text-white shadow-[0_30px_110px_rgba(11,6,29,0.44)] sm:px-7 sm:py-7 xl:order-none">
            <div className="flex flex-col gap-6">
              <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_21rem]">
                <div>
                  <div className="text-[13px] text-white/58">Today&apos;s split call</div>
                  <div className="mt-2 max-w-[28rem] text-[46px] font-semibold leading-[0.86] tracking-[-0.075em] sm:text-[58px]">
                    {vm.hero.todayCall}
                  </div>
                  <div className="mt-4 text-[15px] leading-6 text-white/78">
                    {vm.hero.decision.intensityIntentLabel}: {vm.hero.decision.intensity}
                  </div>
                  <div className="mt-2 max-w-[42rem] text-[13px] leading-5 text-white/66">
                    {vm.hero.decision.targetReason} {vm.hero.decision.bottleneck}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[16px] bg-white/10 ring-1 ring-white/14 sm:hidden">
                    {[
                      ["Train", vm.hero.decision.train],
                      ["Intent", vm.hero.decision.intensityIntentLabel],
                      ["Calories", vm.hero.decision.calories],
                      ["Protein", vm.hero.decision.protein],
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

                <div className="hidden grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/14 sm:grid">
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
                    <div key={label} className="bg-[rgba(17,10,38,0.24)] px-3 py-2.5 backdrop-blur-md">
                      <div className="text-[11px] text-white/48">{label}</div>
                      <div className="mt-1 text-[13px] font-semibold leading-5 text-white/88">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-[radial-gradient(circle_at_50%_16%,_rgba(255,255,255,0.13),_transparent_16%),radial-gradient(circle_at_78%_84%,_rgba(255,146,118,0.20),_transparent_26%),radial-gradient(circle_at_50%_100%,_rgba(67,66,154,0.44),_transparent_42%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                  <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:42px_42px]" />
                  <div className="relative z-10 mb-4 flex items-center justify-between gap-4 text-[13px] text-white/68">
                    <div>
                      <span>This week&apos;s training map</span>
                      <div className="mt-1 text-[11px] text-white/42">assembly sequence: base / weekly panels / latest edge</div>
                    </div>
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

                  <div className="relative z-10 flex min-h-[35rem] items-center justify-center xl:min-h-[40rem]">
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#72fff2]/18 bg-[radial-gradient(circle,_rgba(114,255,242,0.11),_transparent_58%)] shadow-[0_0_80px_rgba(114,255,242,0.12)]" />
                    <div className="pointer-events-none absolute left-[12%] top-[18%] hidden w-28 border-t border-[#72fff2]/30 text-[10px] text-[#c8fffb]/70 md:block">
                      neural edge
                    </div>
                    <div className="pointer-events-none absolute bottom-[17%] right-[9%] hidden w-32 border-t border-[#ffb19d]/30 pt-1 text-right text-[10px] text-[#ffe0d7]/70 md:block">
                      weekly load panels
                    </div>
                    <div className="relative w-full max-w-[48rem]">
                      <AnatomyFigure
                        weeklyHighlights={summary.bodyCard.weeklyHighlightedRegions}
                        latestHighlights={summary.bodyCard.latestWorkoutOverlayRegions}
                        className="h-[31rem] w-full lg:h-[39rem] xl:h-[44rem]"
                      />
                    </div>
                  </div>

                  {vm.hero.weeklyMapNote ? (
                    <div className="mt-3 rounded-[10px] border border-white/10 bg-[rgba(18,13,35,0.14)] px-3 py-2 text-[12px] leading-5 text-white/72">
                      {vm.hero.weeklyMapNote}
                    </div>
                  ) : null}
                </div>

                <aside className="rounded-[20px] border border-white/12 bg-[linear-gradient(180deg,_rgba(18,11,39,0.32),_rgba(18,11,39,0.14))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] ring-1 ring-white/8 backdrop-blur-md">
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
                            className="flex items-center justify-between gap-3 border-b border-white/8 pb-2 transition-colors hover:border-white/16 hover:bg-white/[0.025] last:border-b-0 last:pb-0"
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

          <div className="order-3 grid gap-4 lg:order-none lg:col-start-2">
            <div className="giga-reveal giga-reveal-delay-2 rounded-[20px] border border-white/24 bg-[linear-gradient(180deg,_rgba(248,245,255,0.9)_0%,_rgba(255,255,255,0.78)_100%)] px-5 py-5 shadow-[0_22px_70px_rgba(18,11,42,0.16)] ring-1 ring-[rgba(77,67,119,0.12)] backdrop-blur-[22px]">
              <div className="text-[14px] text-[#6d6785]">What changed</div>
              <div className="mt-4 space-y-3">
                {vm.contextBand.whyChanged.map((item) => (
                  <p key={item} className="text-[15px] leading-6 text-[#1f1b30]">
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div className="giga-reveal giga-reveal-delay-3 rounded-[20px] border border-white/24 bg-[linear-gradient(180deg,_rgba(245,241,255,0.9)_0%,_rgba(255,249,246,0.78)_100%)] px-5 py-5 shadow-[0_22px_70px_rgba(18,11,42,0.16)] ring-1 ring-[rgba(77,67,119,0.12)] backdrop-blur-[22px]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[14px] text-[#6d6785]">Activity context</div>
                  <div className="mt-1 text-[13px] leading-5 text-[#847c9b]">
                    {vm.activityContext.windowLabel}
                    {vm.activityContext.fallbackUsed ? " reference" : ""}
                  </div>
                </div>
                <div className="text-right text-[13px] font-semibold text-[#312c49]">
                  {vm.activityContext.totalLine}
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_180px]">
                <div className="rounded-[10px] bg-[rgba(255,255,255,0.42)] p-3 ring-1 ring-[rgba(77,67,119,0.1)]">
                  <div className="grid grid-cols-7 gap-1.5">
                    {vm.activityContext.days.map((day) => (
                      <div key={day.label} className="min-w-0">
                        <div className="mb-2 text-center text-[11px] text-[#8a82a1]">
                          {day.label}
                        </div>
                        <div className="flex h-12 items-end justify-center gap-0.5 rounded-[8px] bg-[rgba(54,45,91,0.06)] px-1 pb-1">
                          {day.hasActivity ? (
                            day.buckets.slice(0, 3).map((bucket) => (
                              <span
                                key={`${day.label}-${bucket.kind}`}
                                className={`w-1.5 rounded-full ${getActivityDotClass(bucket.kind)}`}
                                style={{ height: getActivityMarkHeight(bucket.strain) }}
                                title={`${bucket.count} ${bucket.kind}, strain ${bucket.strain.toFixed(1)}`}
                              />
                            ))
                          ) : (
                            <span className="mb-1 h-1 w-1 rounded-full bg-[#cac2d8]" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#726b8c]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#beb2ff]" />
                      Walk
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#ff8d73]" />
                      Tennis
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#d8d1df]" />
                      Other
                    </span>
                  </div>
                </div>

                <div className="rounded-[10px] bg-[rgba(255,255,255,0.36)] p-3 ring-1 ring-[rgba(77,67,119,0.1)]">
                  <div className="text-[12px] text-[#857d99]">Latest non-lift</div>
                  {vm.activityContext.latest ? (
                    <>
                      <div
                        className={`mt-2 text-[20px] font-semibold leading-6 tracking-[-0.03em] ${getActivityTextClass(vm.activityContext.latest.kind)}`}
                      >
                        {vm.activityContext.latest.label}
                      </div>
                      <div className="mt-2 text-[13px] leading-5 text-[#6f6886]">
                        {vm.activityContext.latest.detail}
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 text-[14px] leading-5 text-[#6f6886]">
                      No walks, tennis, or conditioning in this window.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px]">
                <p className="text-[14px] leading-5 text-[#312c49]">
                  {vm.activityContext.summaryLine}
                </p>
                <div className="space-y-1">
                  {vm.activityContext.buckets.slice(0, 3).map((bucket) => (
                    <div
                      key={bucket.kind}
                      className="flex items-center justify-between gap-3 border-b border-[rgba(121,110,159,0.12)] pb-1 text-[12px] last:border-b-0"
                    >
                      <span className="flex items-center gap-2 text-[#6f6886]">
                        <span className={`h-2 w-2 rounded-full ${getActivityDotClass(bucket.kind)}`} />
                        {bucket.label}
                      </span>
                      <span className="font-semibold text-[#312c49]">{bucket.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-3 text-[13px] leading-5 text-[#6f6886]">
                {vm.activityContext.interpretation}
              </p>
            </div>

            <div className="giga-reveal giga-reveal-delay-3 rounded-[20px] border border-white/24 bg-[linear-gradient(180deg,_rgba(247,243,255,0.84)_0%,_rgba(255,255,255,0.78)_100%)] px-5 py-5 shadow-[0_22px_70px_rgba(18,11,42,0.16)] ring-1 ring-[rgba(77,67,119,0.12)] backdrop-blur-[22px]">
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

        <section className="giga-reveal rounded-[20px] border border-white/24 bg-[linear-gradient(180deg,_rgba(248,245,255,0.84)_0%,_rgba(255,255,255,0.76)_100%)] px-5 py-4 shadow-[0_22px_70px_rgba(18,11,42,0.14)] ring-1 ring-[rgba(77,67,119,0.12)] backdrop-blur-[22px]">
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
