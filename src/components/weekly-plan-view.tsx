import type { DailySummary, WeeklyPlanDay } from "@/lib/insights/types";

function dayTone(day: WeeklyPlanDay) {
  if (day.state === "completed") return "border-[#78e08f] bg-[#f1faf3]";
  if (day.state === "today") return "border-[#71fff1] bg-[#171126] text-white";
  if (day.workoutType === "Rest" || day.workoutType === "Recovery") return "border-[#ddd7e8] bg-[#f5f1f8]";
  return "border-[#b5abff] bg-white";
}

function premiumTone(day: WeeklyPlanDay) {
  if (day.state === "today") return "live";
  if (day.state === "completed") return "recovery";
  if (day.workoutType === "Rest" || day.workoutType === "Recovery") return "neutral";
  return "light";
}

function statusLabel(day: WeeklyPlanDay) {
  if (day.state === "completed") return "Done";
  if (day.state === "today") return "Today";
  return day.intent;
}

export function WeeklyPlanView({ summary }: { summary: DailySummary }) {
  const plan = summary.weeklyPlan;
  if (!plan) return null;

  return (
    <div className="grid gap-4">
      <section data-premium-surface data-premium-tone="dark" data-premium-enter className="overflow-hidden rounded-[10px] border border-white/10 bg-[#171126] text-white">
        <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
          {[
            ["Week", `${plan.weekStart} - ${plan.weekEnd}`],
            ["Target", `${plan.targetLifts} lifts`],
            ["Done", `${plan.completedLifts}`],
            ["Left", `${Math.max(0, plan.targetLifts - plan.completedLifts)}`],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#171126] px-4 py-3">
              <div className="text-[11px] text-white/44">{label}</div>
              <div className="mt-1 text-base font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-2 lg:grid-cols-7">
        {plan.days.map((day) => (
          <article
            key={day.date}
            data-premium-surface
            data-premium-tone={premiumTone(day)}
            data-premium-enter
            className={`rounded-[10px] border p-2.5 sm:p-3 ${dayTone(day)}`}
          >
            <div className="flex items-start justify-between gap-2 lg:block">
              <div>
                <div className={`text-[11px] ${day.state === "today" ? "text-white/52" : "text-[#7b7492]"}`}>{day.label}</div>
                <h2 className="mt-0.5 text-base font-semibold leading-5 tracking-[-0.03em] sm:mt-1 sm:text-lg">{day.workoutType}</h2>
              </div>
              <div className={`text-[11px] font-semibold lg:mt-2 ${day.state === "today" ? "text-[#71fff1]" : "text-[#5d54a3]"}`}>
                {statusLabel(day)}
              </div>
            </div>

            <div className={`mt-2 border-t pt-2 text-[12px] leading-4 sm:leading-5 ${day.state === "today" ? "border-white/10 text-white/70" : "border-[#e7e1ec] text-[#514a66]"}`}>
              {day.anchors.length ? (
                <p className="truncate font-medium">{day.anchors.slice(0, 2).join(" · ")}</p>
              ) : (
                <p className="font-medium">{day.recoveryPriority}</p>
              )}
              <p className="mt-1 truncate">{day.calorieTarget ?? "--"} cal · {day.proteinTargetG ?? "--"}g protein</p>
              <details className="mt-1 hidden sm:block">
                <summary className="cursor-pointer text-[11px] font-semibold">Detail</summary>
                <p className="mt-1">{day.rationale}</p>
                <p className="mt-1">Recovery: {day.recoveryPriority}</p>
                {day.guardrail ? <p className="mt-1">{day.guardrail}</p> : null}
              </details>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr]">
        <div data-premium-surface data-premium-tone="light" data-premium-enter className="rounded-[10px] border border-[#d8d2e4] bg-[#fbf9fd] p-4">
          <h2 className="text-[15px] font-semibold text-[#171329]">Muscle volume</h2>
          <div className="mt-3 divide-y divide-[#e7e1ec] text-sm">
            {summary.trainingLoad.weeklyMuscleVolume.slice(0, 8).map((item) => (
              <div key={item.label} className="flex justify-between gap-3 py-1.5">
                <span className="truncate">{item.label}</span>
                <span className="shrink-0 font-medium">{item.effectiveSets} · {item.hits}x</span>
              </div>
            ))}
          </div>
        </div>
        <div data-premium-surface data-premium-tone="light" data-premium-enter className="rounded-[10px] border border-[#d8d2e4] bg-[#fbf9fd] p-4">
          <h2 className="text-[15px] font-semibold text-[#171329]">Scorecard</h2>
          <div className="mt-3 grid gap-2 text-sm">
            {summary.physiqueDecision.weeklyScorecard.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-[12px] text-[#7b7492]">{item.detail}</div>
                </div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div data-premium-surface data-premium-tone="neutral" data-premium-enter className="rounded-[10px] border border-[#d8d2e4] bg-[#fbf9fd] p-4">
          <h2 className="text-[15px] font-semibold text-[#171329]">Activity context</h2>
          <p className="mt-3 text-sm leading-5 text-[#514a66]">{summary.activityContext.summaryLine}</p>
          <details className="mt-2 text-sm text-[#746d87]">
            <summary className="cursor-pointer font-medium text-[#5d54a3]">Interpretation</summary>
            <p className="mt-2 leading-5">{summary.activityContext.interpretation}</p>
          </details>
        </div>
      </section>
    </div>
  );
}
