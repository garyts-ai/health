import { Suspense } from "react";
import { ProtectedSettingsActions } from "@/components/protected-settings-actions";
import { WeeklyPlanView } from "@/components/weekly-plan-view";
import { WhoopDistrictContent } from "@/components/whoop-district-content";
import { AnatomyViewer, AppShell, DataRail, PageHero, PageTransition, TodayPrescription } from "@/components/training-os";
import styles from "@/components/training-os/today-composition.module.css";
import { ANATOMY_QA_LATEST_HIGHLIGHTS, ANATOMY_QA_WEEKLY_HIGHLIGHTS, ANATOMY_QA_WEEKLY_VOLUME } from "@/lib/anatomy-qa";
import { regionsForWeeklyMuscleGroup } from "@/lib/insights/body-map";
import { regionsForTrainingTarget } from "@/components/training-os/anatomy-viewer-model";
import { buildTodayViewModel } from "@/lib/today-view-model";
import type { HevyConnectionStatus } from "@/lib/hevy/types";
import type { DailySummary } from "@/lib/insights/types";
import type { WhoopConnectionStatus } from "@/lib/whoop/types";

type MasterDashboardProps = { anatomyDebug?: boolean; hevy: HevyConnectionStatus; summary: DailySummary; utilityBannerMessage?: string | null; whoop: WhoopConnectionStatus; whoopImportReason?: string; whoopImportState?: string; };

function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return <header className="district-section-heading"><h2 id={id}>{title}</h2><p>{description}</p></header>;
}

export async function MasterDashboard({ anatomyDebug = false, hevy, summary, utilityBannerMessage, whoop, whoopImportReason, whoopImportState }: MasterDashboardProps) {
  const vm = buildTodayViewModel(summary);
  const topRecommendation = vm.actionCards[0];
  const weeklyHighlights = anatomyDebug ? ANATOMY_QA_WEEKLY_HIGHLIGHTS : summary.bodyCard.weeklyHighlightedRegions;
  const latestHighlights = anatomyDebug ? ANATOMY_QA_LATEST_HIGHLIGHTS : summary.bodyCard.latestWorkoutOverlayRegions;
  const weeklyVolume = anatomyDebug
    ? ANATOMY_QA_WEEKLY_VOLUME.map((item) => ({ ...item, regions: regionsForWeeklyMuscleGroup(item.label) }))
    : vm.hero.weeklyFocus;
  const workoutCount = anatomyDebug ? 4 : summary.trainingLoad.hevyWorkoutCountThisWeek;
  const latestWorkout = anatomyDebug ? "QA: powered back + arms" : vm.hero.workoutLabel;
  const latestAge = anatomyDebug ? "debug overlay" : vm.hero.latestSessionAgeLabel;
  const targetRegions = anatomyDebug ? ["chest", "frontDelts", "sideDelts"] as const : regionsForTrainingTarget(
    summary.physiqueDecision.trainingTarget,
    summary.physiqueDecision.trainingAvailability,
  );

  return <AppShell date={vm.header.dateLabel}>
    <PageTransition id="today" labelledBy="today-title" initial className={styles.today}>
      <div className={styles.container}>
        <PageHero
          status={utilityBannerMessage || vm.header.freshnessNotice ? <div role="status">{utilityBannerMessage ?? vm.header.freshnessNotice}</div> : undefined}
          prescription={<TodayPrescription date={vm.header.dateLabel} call={vm.hero.todayCall} intensityLabel={vm.hero.decision.intensityIntentLabel} intensity={vm.hero.decision.intensity} reason={vm.hero.decision.targetReason} recommendation={topRecommendation} remaining={vm.actionCards.slice(1)} changes={vm.contextBand.whyChanged} />}
          instrument={<AnatomyViewer weeklyHighlights={weeklyHighlights} latestHighlights={latestHighlights} targetRegionIds={[...targetRegions]} volume={weeklyVolume} latestWorkout={latestWorkout} latestSessionAge={latestAge} workoutCount={workoutCount} emptyMessage={anatomyDebug ? "QA fixture is forcing all major armor regions." : vm.hero.weeklyFocusEmptyMessage} note={anatomyDebug ? "QA fixture" : vm.hero.weeklyMapNote} />}
          rail={<DataRail metrics={vm.hero.telemetry} />}
        />
        <a className={styles.scrollCue} href="#weekly">View weekly plan ↓</a>
      </div>
    </PageTransition>

    <PageTransition id="weekly" className="district-section district-ledger-section" labelledBy="weekly-title">
      <div className="district-container"><SectionHeading id="weekly-title" title="Weekly plan" description="The Monday-to-Sunday plan, completed work, and the training volume still needed this week." /><WeeklyPlanView summary={summary} /></div>
    </PageTransition>

    <PageTransition id="whoop" className="district-section district-whoop-section" labelledBy="whoop-title">
      <div className="district-container"><SectionHeading id="whoop-title" title="WHOOP analysis" description="Long-range baselines and the strongest supported patterns from your private export." /><div className="district-whoop-stack"><Suspense fallback={<div className="district-whoop-loading" role="status"><span>WHOOP / ANALYSIS</span><strong>Loading the latest physiological record…</strong></div>}><WhoopDistrictContent importReason={whoopImportReason} importState={whoopImportState} /></Suspense></div></div>
    </PageTransition>

    <PageTransition id="utilities" className="district-section district-utilities" labelledBy="utilities-title">
      <div className="district-container"><SectionHeading id="utilities-title" title="Utilities" description="Refresh source data and copy a compact dashboard context packet for deeper external analysis." /><div className="district-utilities__body"><ProtectedSettingsActions hevy={hevy} summary={summary} whoop={whoop} /></div></div>
    </PageTransition>
  </AppShell>;
}
