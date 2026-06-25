import type { DailySummary, WeeklyPlanDay } from "@/lib/insights/types";

function stateTone(day: WeeklyPlanDay) {
  if (day.state === "completed") return "border-[#78e08f] bg-[#eff9f1]";
  if (day.state === "today") return "border-[#71fff1] bg-[#171329] text-white";
  if (day.workoutType === "Rest" || day.workoutType === "Recovery") return "border-[#d8d2e4] bg-[#f5f2f8]";
  return "border-[#b5abff] bg-[#fbf9fd]";
}

function premiumTone(day: WeeklyPlanDay) {
  if (day.state === "today") return "live";
  if (day.state === "completed") return "recovery";
  if (day.workoutType === "Rest" || day.workoutType === "Recovery") return "neutral";
  return "light";
}

export function WeeklyPlanView({ summary }: { summary: DailySummary }) {
  const plan = summary.weeklyPlan;
  if (!plan) return null;

  return (
    <div className="space-y-6">
      <section data-premium-surface data-premium-tone="dark" data-premium-enter className="border border-[#d8d2e4] bg-[#171329] text-white">
        <div className="grid gap-px bg-white/10 sm:grid-cols-4">
          {[
            ["Week", `${plan.weekStart} – ${plan.weekEnd}`],
            ["Target", `${plan.targetLifts} lifts`],
            ["Completed", `${plan.completedLifts} lifts`],
            ["Remaining", `${Math.max(0, plan.targetLifts - plan.completedLifts)} lifts`],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#171329] p-5">
              <div className="text-xs text-white/44">{label}</div>
              <div className="mt-2 text-lg font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-7">
        {plan.days.map((day) => (
          <article
            key={day.date}
            data-premium-surface
            data-premium-tone={premiumTone(day)}
            data-premium-enter
            className={`border-t-4 p-4 ${stateTone(day)}`}
          >
            <div className="flex items-start justify-between gap-2 xl:block">
              <div>
                <div className={`text-xs ${day.state === "today" ? "text-white/52" : "text-[#7b7492]"}`}>{day.label}</div>
                <h2 className="mt-2 text-xl font-semibold">{day.workoutType}</h2>
              </div>
              <div className={`text-xs font-medium xl:mt-2 ${day.state === "today" ? "text-[#71fff1]" : "text-[#5d54a3]"}`}>
                {day.state === "completed" ? "Completed" : day.state === "today" ? "Today" : day.intent}
              </div>
            </div>

            {day.anchors.length ? (
              <div className={`mt-4 border-t pt-3 ${day.state === "today" ? "border-white/10" : "border-[#e3ddeb]"}`}>
                <div className={`text-xs ${day.state === "today" ? "text-white/46" : "text-[#847c99]"}`}>Anchors</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {day.anchors.map((anchor) => <li key={anchor}>{anchor}</li>)}
                </ul>
              </div>
            ) : null}

            <div className={`mt-4 border-t pt-3 text-sm leading-5 ${day.state === "today" ? "border-white/10 text-white/72" : "border-[#e3ddeb] text-[#514a66]"}`}>
              <p>{day.rationale}</p>
              <p className="mt-3">
                <strong>Recovery:</strong> {day.recoveryPriority}
              </p>
              <p className="mt-3">
                <strong>Nutrition:</strong>{" "}
                {day.calorieTarget ?? "--"} cal / {day.proteinTargetG ?? "--"}g protein
              </p>
              {day.guardrail ? (
                <p className={`mt-3 border-l-2 pl-3 text-xs ${day.state === "today" ? "border-[#ff8b72] text-white/62" : "border-[#ff8b72] text-[#746d87]"}`}>
                  {day.guardrail}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div data-premium-surface data-premium-tone="light" data-premium-enter className="border border-[#d8d2e4] bg-[#fbf9fd] p-5">
          <h2 className="font-semibold text-[#171329]">Weekly muscle volume</h2>
          <div className="mt-4 space-y-2 text-sm">
            {summary.trainingLoad.weeklyMuscleVolume.slice(0, 8).map((item) => (
              <div key={item.label} className="flex justify-between border-b border-[#e7e1ec] pb-2">
                <span>{item.label}</span><span>{item.effectiveSets} sets / {item.hits}x</span>
              </div>
            ))}
          </div>
        </div>
        <div data-premium-surface data-premium-tone="light" data-premium-enter className="border border-[#d8d2e4] bg-[#fbf9fd] p-5">
          <h2 className="font-semibold text-[#171329]">Weekly scorecard</h2>
          <div className="mt-4 space-y-3 text-sm">
            {summary.physiqueDecision.weeklyScorecard.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between"><span>{item.label}</span><strong>{item.value}</strong></div>
                <div className="mt-1 text-xs text-[#7b7492]">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
        <div data-premium-surface data-premium-tone="neutral" data-premium-enter className="border border-[#d8d2e4] bg-[#fbf9fd] p-5">
          <h2 className="font-semibold text-[#171329]">Activity context</h2>
          <p className="mt-4 text-sm leading-6 text-[#514a66]">{summary.activityContext.summaryLine}</p>
          <p className="mt-3 text-sm leading-6 text-[#746d87]">{summary.activityContext.interpretation}</p>
        </div>
      </section>
    </div>
  );
}
