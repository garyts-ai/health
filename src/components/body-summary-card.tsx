import { AnatomyFigure } from "@/components/anatomy-figure";
import type { DailySummary } from "@/lib/insights/types";
import { formatPounds } from "@/lib/units";

type BodySummaryCardProps = {
  summary: DailySummary;
  eyebrow?: string;
  title?: string;
  description?: string;
};

function getRecoveryTone(value: number | null) {
  if (value === null) {
    return "border-stone-300 bg-white/70 text-stone-800";
  }

  if (value >= 67) {
    return "border-lime-300 bg-lime-100/90 text-lime-900";
  }

  if (value >= 34) {
    return "border-amber-300 bg-amber-100/90 text-amber-900";
  }

  return "border-rose-300 bg-rose-100/90 text-rose-900";
}

function getSleepTone(value: number | null) {
  if (value === null) {
    return "border-stone-300 bg-white/70 text-stone-800";
  }

  if (value >= 8) {
    return "border-sky-300 bg-sky-100/90 text-sky-900";
  }

  if (value >= 7) {
    return "border-amber-300 bg-amber-100/90 text-amber-900";
  }

  return "border-rose-300 bg-rose-100/90 text-rose-900";
}

function MetricChip({
  label,
  value,
  toneClass,
}: {
  label: string;
  value: string;
  toneClass: string;
}) {
  return (
    <div
      className={`rounded-[1.15rem] border px-3 py-2 shadow-[0_14px_30px_rgba(9,14,12,0.18)] backdrop-blur ${toneClass}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export async function BodySummaryCard({
  summary,
  eyebrow = "Body Readiness",
  title = "One-glance body summary",
  description = "Recovery, sleep, recent muscular demand, and body weight in one visual read.",
}: BodySummaryCardProps) {
  const recoveryClass = getRecoveryTone(summary.bodyCard.recoveryScore);
  const sleepClass = getSleepTone(summary.bodyCard.sleepHours);

  return (
    <article className="relative overflow-hidden rounded-[1.95rem] border border-stone-200/80 bg-[linear-gradient(160deg,_#131d17_0%,_#1a2a22_55%,_#21362b_100%)] p-6 text-stone-50 shadow-[0_20px_60px_rgba(20,32,27,0.26)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_18%,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_50%_58%,rgba(56,189,248,0.10),transparent_22%)]" />
      <div className="relative">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-300">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300">{description}</p>
        </div>

        <div className="relative mt-6 overflow-hidden rounded-[1.7rem] border border-white/8 bg-white/6 px-4 pb-5 pt-6 sm:px-6">
          <div className="pointer-events-none absolute left-4 top-3 z-10 sm:left-8">
            <MetricChip
              label="Recovery"
              value={
                summary.bodyCard.recoveryScore === null ? "--" : `${summary.bodyCard.recoveryScore}%`
              }
              toneClass={recoveryClass}
            />
          </div>
          <div className="pointer-events-none absolute right-4 top-3 z-10 sm:right-8">
            <MetricChip
              label="Sleep"
              value={
                summary.bodyCard.sleepHours === null
                  ? "--"
                  : `${summary.bodyCard.sleepHours.toFixed(1)}h`
              }
              toneClass={sleepClass}
            />
          </div>

          <div className="mx-auto mt-12 flex max-w-[860px] flex-col items-center gap-4">
            <div className="relative w-full">
              {summary.bodyCard.latestWorkoutName ? (
                <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
                  <div className="rounded-full border border-white/10 bg-[#506158]/75 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-50 shadow-[0_12px_28px_rgba(5,8,7,0.24)] backdrop-blur">
                    {summary.bodyCard.latestWorkoutName}
                  </div>
                </div>
              ) : null}

              <div className="mx-auto flex w-full justify-center">
                <AnatomyFigure
                  highlights={summary.bodyCard.highlightedRegions}
                  className="h-[20rem] w-full max-w-[42rem] sm:h-[26rem]"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-300">
              Body Weight
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {formatPounds(summary.bodyCard.weightLb)}
            </p>
            <p className="mt-3 text-[10px] text-stone-400">
              Muscle figure adapted from Luca Wahlen, MIT License
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
