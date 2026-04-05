import { BodySummaryCard } from "@/components/body-summary-card";
import { ProductShell } from "@/components/product-shell";
import { getDailySummary } from "@/lib/insights/engine";

export default function BodyPage() {
  const summary = getDailySummary();

  return (
    <ProductShell
      current="body"
      eyebrow="Health OS"
      title="Body"
      description="This view is for local muscular context. Recovery and sleep stay visible, but the real point is seeing what your latest lifting session likely loaded so you can train around it intelligently."
    >
      <BodySummaryCard
        summary={summary}
        eyebrow="Body"
        title="Muscle readiness"
        description="Highlighted regions reflect the latest Hevy workout. Use this as a visual reminder of what is probably carrying the most local demand."
      />

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-[1.6rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_55px_rgba(78,88,61,0.1)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Latest lift
          </p>
          <p className="mt-3 text-2xl font-semibold text-stone-950">
            {summary.trainingLoad.hevyLastWorkoutTitle ?? "No workout logged"}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            The body highlight map is based on this session, not on a soreness survey or a multi-day fatigue model.
          </p>
        </article>

        <article className="rounded-[1.6rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_55px_rgba(78,88,61,0.1)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Upper body recency
          </p>
          <p className="mt-3 text-2xl font-semibold text-stone-950">
            {summary.trainingLoad.upperBodyDaysSince === null
              ? "--"
              : `${summary.trainingLoad.upperBodyDaysSince} day${summary.trainingLoad.upperBodyDaysSince === 1 ? "" : "s"}`}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Days since a clearly upper-body-focused session appeared in the recent Hevy history.
          </p>
        </article>

        <article className="rounded-[1.6rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_55px_rgba(78,88,61,0.1)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Lower body recency
          </p>
          <p className="mt-3 text-2xl font-semibold text-stone-950">
            {summary.trainingLoad.lowerBodyDaysSince === null
              ? "--"
              : `${summary.trainingLoad.lowerBodyDaysSince} day${summary.trainingLoad.lowerBodyDaysSince === 1 ? "" : "s"}`}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Useful for deciding whether a good global recovery score should translate into a harder lower-body day.
          </p>
        </article>
      </section>
    </ProductShell>
  );
}
