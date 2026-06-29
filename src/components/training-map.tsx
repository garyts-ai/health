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
  { label: "1x", color: "bg-[#b5abff]" },
  { label: "2x", color: "bg-[#ff8e7a]" },
  { label: "3x+", color: "bg-[#ff5e86]" },
  { label: "Latest", color: "bg-[#72fff2]" },
];

function tierColor(hits: number) {
  if (hits >= 3) return "bg-[#ff5e86]";
  if (hits >= 2) return "bg-[#ff8e7a]";
  return "bg-[#b5abff]";
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
  const visibleVolume = weeklyVolume.slice(0, isPreview ? 4 : 6);
  const figureHeight = isPreview
    ? "h-[170px] sm:h-[210px]"
    : "h-[180px] sm:h-[240px] lg:h-[300px]";

  return (
    <section
      data-premium-surface
      data-premium-tone="live"
      className="training-map-compact overflow-hidden rounded-[10px] border border-white/10 bg-[#171126]/78"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-white">Weekly map</h3>
          <p className="truncate text-[11px] text-white/48">
            {typeof workoutCount === "number" ? `${workoutCount} lifts` : "Monday-Sunday"} · Latest {latestSessionAge ?? "session"}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-2.5 gap-y-1.5 text-[11px] text-white/70" aria-label="Training map legend">
          {LEGEND.map((item) => (
            <span key={item.label} className="inline-flex min-h-6 items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_245px]">
        <div className="min-w-0 border-b border-white/10 p-2.5 lg:border-b-0 lg:border-r lg:border-white/10">
          <div className={`flex ${figureHeight} items-center justify-center overflow-hidden rounded-[8px] bg-[#120d24] px-1`}>
            <AnatomyFigure
              weeklyHighlights={weeklyHighlights}
              latestHighlights={latestHighlights}
              className="h-full w-full max-w-[32rem]"
            />
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2 px-1 text-[12px]">
            <span className="min-w-0 truncate font-medium text-white/84">Latest: {latestWorkout}</span>
            {note ? <span className="text-white/48">{note}</span> : null}
          </div>
        </div>

        <aside className="min-w-0 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[12px] font-semibold text-white/82">Muscle volume</h3>
            <span className="text-[11px] text-white/42">sets / freq</span>
          </div>
          {visibleVolume.length ? (
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 lg:block lg:divide-y lg:divide-white/8">
              {visibleVolume.map((item) => (
                <div key={item.label} className="flex min-h-7 items-center justify-between gap-3 py-1 lg:min-h-8 lg:py-1.5">
                  <span className="flex min-w-0 items-center gap-2 text-[12px] text-white/80">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${tierColor(item.hits)}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 text-[12px] font-medium text-white/66">
                    {item.effectiveSets} · {item.hits}x
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 rounded-[8px] border border-dashed border-white/12 px-3 py-2.5 text-[12px] leading-5 text-white/62">
              {emptyMessage}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
