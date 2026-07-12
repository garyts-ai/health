import Link from "next/link";

import { renderAnatomyFigureImageLayers } from "@/components/anatomy-figure-export";
import { TrainingMap } from "@/components/training-map";
import {
  ANATOMY_QA_REGIONS,
  ANATOMY_QA_LATEST_HIGHLIGHTS,
  ANATOMY_QA_REGION_CHECKS,
  ANATOMY_QA_WEEKLY_HIGHLIGHTS,
  ANATOMY_QA_WEEKLY_VOLUME,
  anatomyQaHighlight,
  isAnatomyQaRegion,
} from "@/lib/anatomy-qa";
import { getDailySummary } from "@/lib/insights/engine";
import { anatomyRegionView } from "@/lib/anatomy-regions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BodyPageProps = {
  searchParams?: Promise<{
    anatomy?: string;
    region?: string;
    scan?: string;
    render?: string;
  }>;
};

export default async function BodyPage({ searchParams }: BodyPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const summary = await getDailySummary();
  const anatomyDebug = resolvedSearchParams.anatomy === "qa";
  const isolatedRegion = isAnatomyQaRegion(resolvedSearchParams.region)
    ? resolvedSearchParams.region
    : null;
  const showIsolatedScan = isolatedRegion !== null && resolvedSearchParams.scan === "1";
  const staticPreview = resolvedSearchParams.render === "static";
  const backArtworkPending = isolatedRegion !== null && anatomyRegionView(isolatedRegion) === "back";

  const weeklyHighlights = isolatedRegion
    ? [anatomyQaHighlight(isolatedRegion)]
    : anatomyDebug
      ? ANATOMY_QA_WEEKLY_HIGHLIGHTS
    : summary.bodyCard.weeklyHighlightedRegions;
  const latestHighlights = isolatedRegion
    ? showIsolatedScan
      ? [anatomyQaHighlight(isolatedRegion)]
      : []
    : anatomyDebug
      ? ANATOMY_QA_LATEST_HIGHLIGHTS
    : summary.bodyCard.latestWorkoutOverlayRegions;
  const weeklyVolume = anatomyDebug
    ? ANATOMY_QA_WEEKLY_VOLUME
    : summary.trainingLoad.weeklyMuscleVolume;
  const staticLayers = staticPreview
    ? await renderAnatomyFigureImageLayers({
        weeklyHighlights,
        latestHighlights,
        className: "precision-static-export",
        view: backArtworkPending ? "back" : "front",
      })
    : [];

  return (
    <main className="district-root relative min-h-screen overflow-x-clip text-white">
      <div className="relative z-[1] mx-auto flex min-h-screen w-full max-w-[1360px] flex-col gap-4 px-3 py-3 sm:px-5 lg:px-7">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2adfff]/20 pb-3">
          <div>
            <p className="hud-micro-label text-[#39f8ff]">Health OS anatomy lab</p>
            <h1 className="mt-1 text-[42px] font-semibold leading-none tracking-[-0.04em] sm:text-[58px]">
              Body map
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link className="hud-chip px-3 py-2 text-[13px] font-semibold text-white/88" href="/">
              Today
            </Link>
            <Link
              className="hud-chip px-3 py-2 text-[13px] font-semibold text-white/88"
              href={anatomyDebug ? "/body" : "/body?anatomy=qa"}
            >
              {anatomyDebug ? "Live data" : "QA highlights"}
            </Link>
            {anatomyDebug ? (
              <Link
                className="hud-chip px-3 py-2 text-[13px] font-semibold text-white/88"
                href={staticPreview ? "/body?anatomy=qa" : "/body?anatomy=qa&render=static"}
              >
                {staticPreview ? "Interactive" : "Static export"}
              </Link>
            ) : null}
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          {staticPreview ? (
            <section className="hud-frame overflow-hidden text-white">
              <div className="hud-content flex items-center justify-between gap-3 border-b border-[#39f8ff]/18 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">Static export renderer</h2>
                  <p className="mt-1 text-[12px] text-white/58">
                    Same region registry and plate geometry, without motion.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#72fff2]">
                  {ANATOMY_QA_REGIONS.length} regions
                </span>
              </div>
              <div className="hud-content p-3">
                <div className="aqua-tank-stage relative flex h-[330px] items-center justify-center overflow-hidden border border-[#39f8ff]/45 bg-[#010711] sm:h-[460px] lg:h-[500px]">
                  <div className="aqua-tank-lid pointer-events-none absolute inset-x-4 top-8 h-10 rounded-[50%] border border-[#8ffcff]/45" />
                  <div className="aqua-tank-floor pointer-events-none absolute inset-x-4 bottom-1 h-20 rounded-[50%] border border-[#39f8ff]/48" />
                  {backArtworkPending ? (
                    <p className="relative z-[2] max-w-xs text-center text-sm text-white/70">
                      Premium back artwork is the next anatomy asset pass. Canonical region data remains available for QA.
                    </p>
                  ) : staticLayers.map((layer, index) => (
                    <div
                      key={`static-anatomy-layer-${index}`}
                      className="relative z-[1] h-full w-auto max-w-full aspect-[2/3]"
                      style={{ filter: layer.filter, opacity: layer.opacity }}
                      dangerouslySetInnerHTML={{ __html: layer.svg }}
                    />
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <TrainingMap
              weeklyHighlights={weeklyHighlights}
              latestHighlights={latestHighlights}
              weeklyVolume={weeklyVolume}
              latestWorkout={
                isolatedRegion
                  ? `${backArtworkPending ? "Back artwork pending" : "Isolated layer"}: ${isolatedRegion}`
                  : anatomyDebug
                    ? "QA: powered back + arms"
                    : summary.bodyCard.latestWorkoutName ?? "No latest workout"
              }
              latestSessionAge={anatomyDebug ? "debug overlay" : "session"}
              workoutCount={anatomyDebug ? 4 : summary.trainingLoad.hevyWorkoutCountThisWeek}
              emptyMessage={
                anatomyDebug
                  ? "QA fixture is forcing all major armor regions."
                  : "No lifts logged yet this week"
              }
              note={anatomyDebug ? "QA fixture" : "Live training data"}
              variant="page"
            />
          )}

          <aside className="hud-frame h-fit text-white">
            <div className="hud-content p-4">
              <p className="hud-micro-label text-[#39f8ff]">Inspection contract</p>
              <div className="mt-3 grid gap-3 text-[13px] leading-5 text-white/72">
                <p>
                  This surface exists to judge the body asset directly. Use QA highlights when
                  the real week has no logged exposure.
                </p>
                <p>
                  The data contract is unchanged: weekly exposure drives violet, amber, and
                  magenta panels; latest session drives the cyan scan layer.
                </p>
              </div>
              {anatomyDebug ? (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="hud-micro-label text-[#39f8ff]">Isolate a plate</p>
                    <div className="flex items-center gap-3">
                      {isolatedRegion ? (
                        <Link
                          className="text-[11px] font-semibold text-[#72fff2] underline decoration-[#72fff2]/40 underline-offset-4"
                          href={`/body?anatomy=qa&region=${isolatedRegion}${showIsolatedScan ? "" : "&scan=1"}`}
                        >
                          {showIsolatedScan ? "Weekly only" : "Show scan"}
                        </Link>
                      ) : null}
                      {isolatedRegion ? (
                        <Link
                          className="text-[11px] font-semibold text-white/62 underline decoration-white/20 underline-offset-4"
                          href="/body?anatomy=qa"
                        >
                          Show all
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {ANATOMY_QA_REGIONS.map((regionId) => (
                      <Link
                        key={regionId}
                        aria-current={isolatedRegion === regionId ? "true" : undefined}
                        className={`truncate rounded-[8px] border px-2.5 py-2 text-[11px] font-semibold transition-colors ${
                          isolatedRegion === regionId
                            ? "border-[#72fff2]/75 bg-[#39f8ff]/16 text-[#eaffff]"
                            : "border-white/10 bg-[#021629]/36 text-white/66 hover:border-[#72fff2]/40 hover:text-white"
                        }`}
                        href={`/body?anatomy=qa&region=${regionId}`}
                      >
                        {regionId}
                      </Link>
                    ))}
                  </div>
                  <p className="hud-micro-label mt-5 text-[#39f8ff]">QA region targets</p>
                  <div className="mt-3 grid gap-2">
                    {ANATOMY_QA_REGION_CHECKS.map((item) => (
                      <div
                        key={item.label}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-[10px] border border-[#8ffcff]/18 bg-[#021629]/48 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-semibold text-white/90">
                            {item.label}
                          </div>
                          <div className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-white/45">
                            {item.view}
                          </div>
                        </div>
                        <div className="max-w-[7.5rem] text-right text-[11px] font-semibold leading-4 text-[#eaffff]/78">
                          {item.exposure}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
