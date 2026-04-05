import { TrendsGrid } from "@/components/dashboard-sections";
import { ProductShell } from "@/components/product-shell";
import { getDailySummary } from "@/lib/insights/engine";
import { formatPounds, kilogramsToPounds } from "@/lib/units";

export default function TrendsPage() {
  const summary = getDailySummary();

  return (
    <ProductShell
      current="trends"
      eyebrow="Health OS"
      title="Trends"
      description="Use this page when you want more than a morning recommendation. The goal here is context: what is moving, what is stable, and what matters relative to your own recent baseline."
    >
      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-[1.6rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_55px_rgba(78,88,61,0.1)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Recovery context
          </p>
          <p className="mt-3 text-3xl font-semibold text-stone-950">
            {summary.readiness.recoveryTrend3d === null
              ? "--"
              : `${summary.readiness.recoveryTrend3d}%`}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            3-day recovery average, which is the simplest read on whether today is part of a trend or just a blip.
          </p>
        </article>

        <article className="rounded-[1.6rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_55px_rgba(78,88,61,0.1)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Load baseline
          </p>
          <p className="mt-3 text-3xl font-semibold text-stone-950">
            {formatPounds(kilogramsToPounds(summary.trainingLoad.hevyVolume28dAvg), 0)}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Rolling 28-day weekly lifting average. Use it to spot when recent work is meaningfully above or below normal.
          </p>
        </article>

        <article className="rounded-[1.6rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_55px_rgba(78,88,61,0.1)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Weight drift
          </p>
          <p className="mt-3 text-3xl font-semibold text-stone-950">
            {formatPounds(kilogramsToPounds(summary.readiness.bodyWeightDelta28dKg))}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            28-day body-weight movement gives better context than any single weigh-in, especially when recent training demand is high.
          </p>
        </article>
      </section>

      <TrendsGrid summary={summary} />
    </ProductShell>
  );
}
