import type { DailySummary, WeeklyPlanDay } from "@/lib/insights/types";

function statusLabel(day: WeeklyPlanDay) {
  if (day.state === "completed") return "Done";
  if (day.state === "today") return "Today";
  return day.intent;
}

function dayTone(day: WeeklyPlanDay) {
  if (day.state === "completed") return "complete";
  if (day.state === "today") return "today";
  if (day.workoutType === "Rest" || day.workoutType === "Recovery") return "recovery";
  return "planned";
}

export function WeeklyPlanView({ summary }: { summary: DailySummary }) {
  const plan = summary.weeklyPlan;
  if (!plan) return null;

  return (
    <div className="week-ledger">
      <dl className="week-ledger__summary">
        <div><dt>Week</dt><dd>{plan.weekStart} – {plan.weekEnd}</dd></div>
        <div><dt>Target</dt><dd>{plan.targetLifts} lifts</dd></div>
        <div><dt>Done</dt><dd>{plan.completedLifts}</dd></div>
        <div><dt>Left</dt><dd>{Math.max(0, plan.targetLifts - plan.completedLifts)}</dd></div>
      </dl>

      <ol className="week-ledger__days">
        {plan.days.map((day) => (
          <li key={day.date} data-tone={dayTone(day)}>
            <article>
              <header>
                <time dateTime={day.date}>{day.label}</time>
                <span>{statusLabel(day)}</span>
              </header>
              <h3>{day.workoutType}</h3>
              <p className="week-ledger__anchors">
                {day.anchors.length ? day.anchors.slice(0, 2).join(" · ") : day.recoveryPriority}
              </p>
              <p className="week-ledger__nutrition">
                {day.calorieTarget ?? "--"} cal · {day.proteinTargetG ?? "--"}g protein
              </p>
              <details>
                <summary>Plan detail</summary>
                <p>{day.rationale}</p>
                <p>Recovery: {day.recoveryPriority}</p>
                {day.guardrail ? <p>{day.guardrail}</p> : null}
              </details>
            </article>
          </li>
        ))}
      </ol>

      <div className="week-ledger__evidence">
        <section aria-labelledby="muscle-volume-title">
          <h3 id="muscle-volume-title">Muscle volume</h3>
          {summary.trainingLoad.weeklyMuscleVolume.length ? (
            <dl>
              {summary.trainingLoad.weeklyMuscleVolume.slice(0, 8).map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.effectiveSets} · {item.hits}×</dd>
                </div>
              ))}
            </dl>
          ) : <p>No lifting volume logged this week.</p>}
        </section>

        <section aria-labelledby="scorecard-title">
          <h3 id="scorecard-title">Scorecard</h3>
          <dl>
            {summary.physiqueDecision.weeklyScorecard.map((item) => (
              <div key={item.label}>
                <dt><strong>{item.label}</strong><span>{item.detail}</span></dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="activity-context-title">
          <h3 id="activity-context-title">Activity context</h3>
          <p>{summary.activityContext.summaryLine}</p>
          <details>
            <summary>Read interpretation</summary>
            <p>{summary.activityContext.interpretation}</p>
          </details>
        </section>
      </div>
    </div>
  );
}
