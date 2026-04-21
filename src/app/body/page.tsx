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
      description="Local muscular context stays separate from systemic recovery. This page helps you read recent training demand by region and by recency."
    >
      <BodySummaryCard
        summary={summary}
        eyebrow="Body"
        title="Training map"
        description="Fill shows Monday-through-Sunday exposure. The neon outline marks the latest session so weekly load and recency stay separate."
      />

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.88)_0%,_rgba(255,255,255,0.82)_100%)] px-5 py-5 shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)]">
          <p className="text-sm text-[#6d6785]">
            Latest lift
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#171329]">
            {summary.trainingLoad.hevyLastWorkoutTitle ?? "No workout logged"}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#645c7d]">
            Weekly fill accumulates across the current week. This session is the outline overlay, not the whole map.
          </p>
        </article>

        <article className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.88)_0%,_rgba(255,255,255,0.82)_100%)] px-5 py-5 shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)]">
          <p className="text-sm text-[#6d6785]">
            Upper body recency
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#171329]">
            {summary.trainingLoad.upperBodyDaysSince === null
              ? "--"
              : `${summary.trainingLoad.upperBodyDaysSince} day${summary.trainingLoad.upperBodyDaysSince === 1 ? "" : "s"}`}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#645c7d]">
            Days since a clearly upper-body-focused session appeared in the recent Hevy history.
          </p>
        </article>

        <article className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.88)_0%,_rgba(255,255,255,0.82)_100%)] px-5 py-5 shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)]">
          <p className="text-sm text-[#6d6785]">
            Lower body recency
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#171329]">
            {summary.trainingLoad.lowerBodyDaysSince === null
              ? "--"
              : `${summary.trainingLoad.lowerBodyDaysSince} day${summary.trainingLoad.lowerBodyDaysSince === 1 ? "" : "s"}`}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#645c7d]">
            Useful for deciding whether a good global recovery score should translate into a harder lower-body day.
          </p>
        </article>
      </section>
    </ProductShell>
  );
}
