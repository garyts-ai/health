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
  const figureHeight = isPreview
    ? "h-[220px] sm:h-[250px]"
    : "h-[240px] sm:h-[290px] lg:h-[320px]";
  const visibleVolume = weeklyVolume.slice(0, 8);

  return (
    <section
      data-premium-surface
      data-premium-tone="live"
      className="training-map-compact overflow-hidden rounded-[12px] border border-white/12 bg-[rgba(16,10,37,0.3)]"
    >
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-white">This week&apos;s training map</h3>
          <p className="mt-0.5 text-[11px] text-white/52">Monday–Sunday exposure</p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-2 text-[12px] text-white/74" aria-label="Training map legend">
          {LEGEND.map((item) => (
            <span key={item.label} className="inline-flex min-h-6 items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 border-b border-white/10 p-3 lg:border-b-0 lg:border-r">
          <div className={`flex ${figureHeight} items-center justify-center overflow-hidden rounded-[10px] bg-[rgba(20,13,45,0.22)] px-2`}>
            <AnatomyFigure
              weeklyHighlights={weeklyHighlights}
              latestHighlights={latestHighlights}
              className="h-full w-full max-w-[34rem]"
            />
          </div>
          <div className="mt-3 flex flex-col gap-1 px-1 text-[12px] sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium text-white/86">Latest: {latestWorkout}</span>
            {latestSessionAge ? <span className="text-white/52">{latestSessionAge}</span> : null}
          </div>
          {note ? <p className="mt-2 px-1 text-[11px] leading-5 text-white/58">{note}</p> : null}
        </div>

        <aside className="min-w-0 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[13px] font-semibold text-white/86">Weekly muscle volume</h3>
            {typeof workoutCount === "number" ? (
              <span className="text-[11px] text-white/48">{workoutCount} lifts</span>
            ) : null}
          </div>
          {visibleVolume.length ? (
            <div className="mt-3 divide-y divide-white/8">
              {visibleVolume.map((item) => (
                <div key={item.label} className="flex min-h-9 items-center justify-between gap-3 py-2">
                  <span className="flex min-w-0 items-center gap-2 text-[13px] text-white/82">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${tierColor(item.hits)}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 text-[12px] font-medium text-white/68">
                    {item.effectiveSets} sets · {item.hits}x
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-[8px] border border-dashed border-white/12 px-3 py-3 text-[12px] leading-5 text-white/62">
              {emptyMessage}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
