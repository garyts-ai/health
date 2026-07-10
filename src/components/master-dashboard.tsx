import Link from "next/link";
import { Suspense } from "react";
import { DailyBriefPreviewCard } from "@/components/daily-brief-preview-card";
import { MobilePullSync } from "@/components/mobile-pull-sync";
import { NeonAtmosphere } from "@/components/neon-atmosphere";
import { ProductNav } from "@/components/product-nav";
import { ProtectedSettingsActions } from "@/components/protected-settings-actions";
import { TrainingMap } from "@/components/training-map";
import { WeeklyPlanView } from "@/components/weekly-plan-view";
import { WhoopDistrictContent } from "@/components/whoop-district-content";
import {
  ANATOMY_QA_LATEST_HIGHLIGHTS,
  ANATOMY_QA_WEEKLY_HIGHLIGHTS,
  ANATOMY_QA_WEEKLY_VOLUME,
} from "@/lib/anatomy-qa";
import { buildTodayViewModel } from "@/lib/today-view-model";
import type { HevyConnectionStatus } from "@/lib/hevy/types";
import type {
  DailyRecommendation,
  DailySummary,
  DiscordDeliveryStatus,
  RecommendationActionTile,
} from "@/lib/insights/types";
import type { WhoopConnectionStatus } from "@/lib/whoop/types";

type MasterDashboardProps = {
  anatomyDebug?: boolean;
  deliveryStatus: DiscordDeliveryStatus;
  hevy: HevyConnectionStatus;
  isDiscordConfigured: boolean;
  summary: DailySummary;
  utilityBannerMessage?: string | null;
  whoop: WhoopConnectionStatus;
  whoopImportReason?: string;
  whoopImportState?: string;
};

function ActionTag({ tile }: { tile: RecommendationActionTile }) {
  return <span className="district-action-tag">{tile.label}</span>;
}

function RecommendationRow({ item, index }: { item: DailyRecommendation; index: number }) {
  return (
    <article className="district-recommendation-row">
      <span className="district-recommendation-row__index">{String(index + 1).padStart(2, "0")}</span>
      <div>
        <h3>{item.title}</h3>
        <p>{item.why}</p>
        <div className="district-action-list">
          {item.primaryActions.slice(0, 3).map((tile) => (
            <ActionTag key={`${item.title}-${tile.label}`} tile={tile} />
          ))}
        </div>
      </div>
    </article>
  );
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <header className="district-section-heading">
      <h2 id={id}>{title}</h2>
      <p>{description}</p>
    </header>
  );
}

export async function MasterDashboard({
  anatomyDebug = false,
  deliveryStatus,
  hevy,
  isDiscordConfigured,
  summary,
  utilityBannerMessage,
  whoop,
  whoopImportReason,
  whoopImportState,
}: MasterDashboardProps) {
  const vm = buildTodayViewModel(summary, whoop, hevy, deliveryStatus);
  const topRecommendation = vm.actionCards[0];
  const weeklyHighlights = anatomyDebug
    ? ANATOMY_QA_WEEKLY_HIGHLIGHTS
    : summary.bodyCard.weeklyHighlightedRegions;
  const latestHighlights = anatomyDebug
    ? ANATOMY_QA_LATEST_HIGHLIGHTS
    : summary.bodyCard.latestWorkoutOverlayRegions;
  const weeklyVolume = anatomyDebug ? ANATOMY_QA_WEEKLY_VOLUME : vm.hero.weeklyFocus;
  const workoutCount = anatomyDebug ? 4 : summary.trainingLoad.hevyWorkoutCountThisWeek;
  const latestWorkout = anatomyDebug ? "QA: powered back + arms" : vm.hero.workoutLabel;
  const latestAge = anatomyDebug ? "debug overlay" : vm.hero.latestSessionAgeLabel;

  return (
    <main className="district-shell">
      <MobilePullSync />
      <NeonAtmosphere />

      <header className="district-header">
        <div className="district-header__inner">
          <Link className="district-brand" href="#today" aria-label="HealthMaxer today">
            <span>HX</span>
            <strong>HealthMaxer</strong>
          </Link>
          <ProductNav current="today" dark />
          <p className="district-header__date">{vm.header.dateLabel}</p>
        </div>
      </header>

      <section id="today" className="district-section district-today" aria-labelledby="today-title">
        <div className="district-container district-today__inner">
          {utilityBannerMessage || vm.header.freshnessNotice ? (
            <div className="district-source-note" role="status">
              {utilityBannerMessage ?? vm.header.freshnessNotice}
            </div>
          ) : null}

          <div className="district-today__grid">
            <div className="district-today__copy">
              <p className="district-today__date">{vm.header.dateLabel}</p>
              <h1 id="today-title" className="district-hero-title">
                <span>Today</span>
                <strong>{vm.hero.todayCall}</strong>
              </h1>
              <p className="district-intensity">
                {vm.hero.decision.intensityIntentLabel}: {vm.hero.decision.intensity}
              </p>
              <p className="district-reason">{vm.hero.decision.targetReason}</p>

              {topRecommendation ? (
                <div className="district-best-action">
                  <div>
                    <span>Best move</span>
                    <h2>{topRecommendation.title}</h2>
                  </div>
                  <div className="district-action-list">
                    {topRecommendation.primaryActions.slice(0, 3).map((tile) => (
                      <ActionTag key={`${topRecommendation.title}-${tile.label}`} tile={tile} />
                    ))}
                  </div>
                </div>
              ) : null}

              <details className="district-disclosure">
                <summary>Today&apos;s evidence and remaining actions</summary>
                <div className="district-recommendation-list">
                  {vm.actionCards.slice(1).map((item, index) => (
                    <RecommendationRow key={item.title} item={item} index={index + 1} />
                  ))}
                  <div className="district-change-list">
                    {vm.contextBand.whyChanged.map((item) => <p key={item}>{item}</p>)}
                  </div>
                </div>
              </details>
            </div>

            <TrainingMap
              weeklyHighlights={weeklyHighlights}
              latestHighlights={latestHighlights}
              weeklyVolume={weeklyVolume}
              latestWorkout={latestWorkout}
              latestSessionAge={latestAge}
              workoutCount={workoutCount}
              emptyMessage={anatomyDebug ? "QA fixture is forcing all major armor regions." : vm.hero.weeklyFocusEmptyMessage}
              note={anatomyDebug ? "QA fixture" : vm.hero.weeklyMapNote}
              variant="profile"
            />
          </div>

          <dl className="district-vitals" aria-label="Today overview">
            {vm.hero.metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
                <span>{metric.detail}</span>
              </div>
            ))}
            <div>
              <dt>Calories</dt>
              <dd>{vm.hero.decision.calories}</dd>
              <span>{vm.hero.decision.intake}</span>
            </div>
            <div>
              <dt>Protein</dt>
              <dd>{vm.hero.decision.protein}</dd>
              <span>{vm.hero.decision.remaining}</span>
            </div>
          </dl>

          <a className="district-scroll-cue" href="#weekly">
            View weekly plan <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <section id="weekly" className="district-section district-ledger-section" aria-labelledby="weekly-title">
        <div className="district-container">
          <SectionHeading
            id="weekly-title"
            title="Weekly plan"
            description="The Monday-to-Sunday plan, completed work, and the training volume still needed this week."
          />
          <WeeklyPlanView summary={summary} />
        </div>
      </section>

      <section id="whoop" className="district-section district-whoop-section" aria-labelledby="whoop-title">
        <div className="district-container">
          <SectionHeading
            id="whoop-title"
            title="WHOOP analysis"
            description="Long-range baselines and the strongest supported patterns from your private export."
          />
          <div className="district-whoop-stack">
            <Suspense
              fallback={
                <div className="district-whoop-loading" role="status">
                  <span>WHOOP / ANALYSIS</span>
                  <strong>Loading the latest physiological record…</strong>
                </div>
              }
            >
              <WhoopDistrictContent
                importReason={whoopImportReason}
                importState={whoopImportState}
              />
            </Suspense>
          </div>
        </div>
      </section>

      <section id="utilities" className="district-section district-utilities" aria-labelledby="utilities-title">
        <div className="district-container">
          <SectionHeading
            id="utilities-title"
            title="Utilities"
            description="Connections, food logging, nutrition targets, and daily brief delivery in one working surface."
          />
          <div className="district-utilities__body">
            <ProtectedSettingsActions
              deliveryStatus={deliveryStatus}
              hevy={hevy}
              isDiscordConfigured={isDiscordConfigured}
              preview={<DailyBriefPreviewCard deliveryStatus={deliveryStatus} summary={summary} />}
              summary={summary}
              whoop={whoop}
            />
          </div>
        </div>
      </section>

      <footer className="district-footer">
        <span>Health OS</span>
        <a href="#today">Back to today ↑</a>
      </footer>
    </main>
  );
}
