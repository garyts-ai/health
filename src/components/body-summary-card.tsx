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
    return "border-[rgba(77,67,119,0.14)] bg-white/72 text-[#312c49]";
  }

  if (value >= 67) {
    return "border-[rgba(113,160,96,0.18)] bg-[rgba(224,243,216,0.86)] text-[#29461f]";
  }

  if (value >= 34) {
    return "border-[rgba(214,173,106,0.18)] bg-[rgba(255,243,214,0.9)] text-[#6b4a16]";
  }

  return "border-[rgba(214,112,138,0.18)] bg-[rgba(255,232,238,0.9)] text-[#7b2942]";
}

function getSleepTone(value: number | null) {
  if (value === null) {
    return "border-[rgba(77,67,119,0.14)] bg-white/72 text-[#312c49]";
  }

  if (value >= 8) {
    return "border-[rgba(104,137,224,0.16)] bg-[rgba(231,238,255,0.9)] text-[#274182]";
  }

  if (value >= 7) {
    return "border-[rgba(214,173,106,0.18)] bg-[rgba(255,243,214,0.9)] text-[#6b4a16]";
  }

  return "border-[rgba(214,112,138,0.18)] bg-[rgba(255,232,238,0.9)] text-[#7b2942]";
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
      className={`rounded-[10px] border px-3 py-2 shadow-[0_8px_18px_rgba(22,20,35,0.08)] ${toneClass}`}
    >
      <p className="text-[10px] font-semibold opacity-70">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export async function BodySummaryCard({
  summary,
  eyebrow = "Body",
  title = "Training map",
  description = "Weekly exposure, latest-session overlay, and local context in one view.",
}: BodySummaryCardProps) {
  const recoveryClass = getRecoveryTone(summary.bodyCard.recoveryScore);
  const sleepClass = getSleepTone(summary.bodyCard.sleepHours);

  return (
    <article className="relative overflow-hidden rounded-[12px] bg-[linear-gradient(135deg,_rgba(33,24,76,0.98)_0%,_rgba(85,67,148,0.95)_46%,_rgba(248,141,116,0.92)_100%)] p-6 text-white shadow-[0_20px_80px_rgba(31,24,61,0.24)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,_rgba(255,255,255,0.1),_transparent_18%),radial-gradient(circle_at_78%_85%,_rgba(255,146,118,0.14),_transparent_24%),radial-gradient(circle_at_50%_100%,_rgba(67,66,154,0.34),_transparent_42%)]" />
      <div className="relative">
        <div>
          <p className="text-sm font-medium text-white/68">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/72">{description}</p>
        </div>

        <div className="relative mt-6 overflow-hidden rounded-[12px] bg-[rgba(19,13,34,0.18)] px-4 pb-5 pt-6 ring-1 ring-white/10 sm:px-6">
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
                  <div className="rounded-[999px] border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-semibold tracking-[0.04em] text-white shadow-[0_12px_28px_rgba(5,8,7,0.24)] backdrop-blur">
                    {summary.bodyCard.latestWorkoutName}
                  </div>
                </div>
              ) : null}

              <div className="mx-auto flex w-full justify-center">
                <AnatomyFigure
                  weeklyHighlights={summary.bodyCard.weeklyHighlightedRegions}
                  latestHighlights={summary.bodyCard.latestWorkoutOverlayRegions}
                  className="h-[20rem] w-full max-w-[42rem] sm:h-[26rem]"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4 text-center">
            <p className="text-[11px] font-medium text-white/64">
              Body Weight
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {formatPounds(summary.bodyCard.weightLb)}
            </p>
            <p className="mt-3 text-[10px] text-white/42">
              Muscle figure adapted from Luca Wahlen, MIT License
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
