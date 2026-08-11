import type { DailySummary, WeeklyPlanDay } from "@/lib/insights/types";

function statusLabel(day: WeeklyPlanDay) {
  if (day.state === "completed") return "Done";
  if (day.state === "today") return "Today";
  if (day.state === "unobserved") return "Unobserved";
  return day.intent;
}

function dayTone(day: WeeklyPlanDay) {
  if (day.state === "completed") return "complete";
  if (day.state === "today") return "today";
  if (day.state === "unobserved") return "unobserved";
  if (day.workoutType === "Rest" || day.workoutType === "Recovery") return "recovery";
  return "planned";
}

export function WeeklyPlanView({ summary }: { summary: DailySummary }) {
  const plan = summary.weeklyPlan;
  if (!plan) return null;

  return <div className="week-ledger">
    <header className="week-ledger__summary">
      <div><strong>{plan.completedLifts} / {plan.targetLifts}</strong><span>lifts complete</span></div>
      <span>{plan.weekStart} – {plan.weekEnd}</span>
      <details><summary>Plan provenance</summary><p>Forecast generated {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(plan.generatedAt))}</p></details>
    </header>

    <ol className="week-ledger__days">
      {plan.days.map((day) => <li key={day.date} data-tone={dayTone(day)}><article>
        <header><time dateTime={day.date}>{day.label}</time><span>{statusLabel(day)}</span></header>
        <h3>{day.workoutType}</h3>
        <p className="week-ledger__anchors">{day.anchors.length ? day.anchors.slice(0, 2).join(" · ") : day.recoveryPriority}</p>
        <details><summary>Plan detail</summary><p>{day.rationale}</p><p>Recovery: {day.recoveryPriority}</p>{day.guardrail ? <p>{day.guardrail}</p> : null}</details>
      </article></li>)}
    </ol>

    <div className="week-ledger__evidence">
      <section aria-labelledby="muscle-volume-title">
        <h3 id="muscle-volume-title">Estimated muscle volume</h3>
        {summary.trainingLoad.weeklyMuscleVolume.length ? <dl>{summary.trainingLoad.weeklyMuscleVolume.slice(0, 8).map((item) => <div key={item.label}><dt>{item.label} (estimated)</dt><dd>{item.effectiveSets} · {item.hits}×</dd></div>)}</dl> : <p>No lifting volume logged this week.</p>}
      </section>
      <section aria-labelledby="scorecard-title">
        <h3 id="scorecard-title">Scorecard</h3>
        <dl>{summary.physiqueDecision.weeklyScorecard.map((item) => <div key={item.label}><dt><strong>{item.label}</strong></dt><dd>{item.value}</dd></div>)}</dl>
        <details><summary>Score detail</summary>{summary.physiqueDecision.weeklyScorecard.map((item) => <p key={item.label}><strong>{item.label}:</strong> {item.detail}</p>)}</details>
      </section>
      <section aria-labelledby="activity-context-title">
        <h3 id="activity-context-title">Activity context</h3>
        <details><summary>{summary.activityContext.summaryLine}</summary><p>{summary.activityContext.interpretation}</p></details>
      </section>
    </div>
  </div>;
}
