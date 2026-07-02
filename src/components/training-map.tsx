import { AnatomyFigure } from "@/components/anatomy-figure";
import type { BodyHighlight } from "@/lib/insights/types";

type WeeklyVolume = {
  label: string;
  effectiveSets: number;
  hits: number;
};

type TrainingMapProps = {
  weeklyHighlights: BodyHighlight[];
  latestHighlights: BodyHighlight[];
  weeklyVolume: WeeklyVolume[];
  latestWorkout: string;
  latestSessionAge?: string;
  workoutCount?: number;
  emptyMessage?: string;
  note?: string | null;
  variant?: "page" | "dashboard" | "preview";
};

const LEGEND = [
  { label: "1x", color: "bg-[#8a5cff]" },
  { label: "2x", color: "bg-[#ffb02e]" },
  { label: "3x+", color: "bg-[#f04cff]" },
  { label: "Latest", color: "bg-[#32fff4]" },
];

function tierColor(hits: number) {
  if (hits >= 3) return "bg-[#f04cff]";
  if (hits >= 2) return "bg-[#ffb02e]";
  return "bg-[#8a5cff]";
}

export async function TrainingMap({
  weeklyHighlights,
  latestHighlights,
  weeklyVolume,
  latestWorkout,
  latestSessionAge,
  workoutCount,
  emptyMessage = "No lifts logged yet this week",
  note,
  variant = "dashboard",
}: TrainingMapProps) {
  const isPreview = variant === "preview";
  const visibleVolume = weeklyVolume.slice(0, isPreview ? 4 : 7);
  const figureHeight = isPreview
    ? "h-[190px] sm:h-[230px]"
    : "h-[245px] sm:h-[330px] lg:h-[390px]";

  return (
    <section
      data-premium-surface
      data-premium-tone="command"
      className="hud-frame aqua-training-map training-map-compact text-white"
    >
      <div className="hud-content aqua-training-header flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <h3 className="hud-micro-label text-[#39f8ff]">This week&apos;s training map</h3>
          <p className="mt-0.5 truncate text-[12px] text-white/70">
            {typeof workoutCount === "number" ? `${workoutCount} lifts` : "Monday-Sunday"} - Latest{" "}
            {latestSessionAge ?? "session"}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-white/86" aria-label="Training map legend">
          {LEGEND.map((item) => (
            <span key={item.label} className="inline-flex min-h-6 items-center gap-1.5">
              <span className={`aqua-legend-dot h-2.5 w-2.5 rounded-full ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="hud-content aqua-training-grid grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="aqua-map-shell min-w-0 p-3">
          <div className={`aqua-tank-stage relative flex ${figureHeight} items-center justify-center overflow-hidden border border-[#39f8ff]/58 bg-[#010711] px-1 shadow-[inset_0_0_96px_rgba(0,140,255,0.32),0_0_54px_rgba(57,248,255,0.18)]`}>
            <div className="aqua-tank-lid pointer-events-none absolute inset-x-4 top-8 h-10 rounded-[50%] border border-[#8ffcff]/60 bg-[radial-gradient(ellipse_at_center,_rgba(57,248,255,0.26),_transparent_68%)] shadow-[0_0_70px_rgba(57,248,255,0.46)]" />
            <div className="aqua-tank-floor pointer-events-none absolute inset-x-4 bottom-1 h-20 rounded-[50%] border border-[#39f8ff]/62 bg-[radial-gradient(ellipse_at_center,_rgba(57,248,255,0.32),_rgba(124,92,255,0.13)_38%,_transparent_68%)] shadow-[0_0_76px_rgba(57,248,255,0.42)]" />
            <div className="aqua-tank-grid pointer-events-none absolute inset-0" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#39f8ff]/56 to-transparent shadow-[0_0_30px_rgba(57,248,255,0.9)]" />
            <div className="pointer-events-none absolute inset-x-[18%] top-6 h-px bg-gradient-to-r from-transparent via-[#8c4dff]/76 to-transparent shadow-[0_0_28px_rgba(140,77,255,0.72)]" />
            <AnatomyFigure
              weeklyHighlights={weeklyHighlights}
              latestHighlights={latestHighlights}
              className="relative z-[1] h-full w-full max-w-[43rem] drop-shadow-[0_0_46px_rgba(57,248,255,0.56)]"
            />
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2 px-1 text-[12px]">
            <span className="min-w-0 truncate font-semibold text-[#39f8ff] drop-shadow-[0_0_12px_rgba(57,248,255,0.78)]">
              Latest: {latestWorkout}
            </span>
            {note ? <span className="text-white/64">{note}</span> : null}
          </div>
        </div>

        <aside className="aqua-volume-panel min-w-0 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="hud-micro-label text-[#39f8ff]">Weekly muscle volume</h3>
            <span className="text-[11px] text-white/56">sets / freq</span>
          </div>
          {visibleVolume.length ? (
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 lg:block lg:divide-y lg:divide-[#39f8ff]/18">
              {visibleVolume.map((item) => (
                <div key={item.label} className="flex min-h-8 items-center justify-between gap-3 py-1 lg:min-h-9 lg:py-1.5">
                  <span className="flex min-w-0 items-center gap-2 text-[12px] text-white/88">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tierColor(item.hits)} shadow-[0_0_18px_currentColor]`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 text-[12px] font-semibold text-white/80">
                    {item.effectiveSets} - {item.hits}x
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="aqua-empty-volume mt-3 px-3 py-2.5 text-[12px] leading-5 text-white/72">
              {emptyMessage}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
