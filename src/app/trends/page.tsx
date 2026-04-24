import { TrendsGrid } from "@/components/dashboard-sections";
import { ProductShell } from "@/components/product-shell";
import { getDailySummary } from "@/lib/insights/engine";
import { formatPounds, kilogramsToPounds } from "@/lib/units";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrendsPage() {
  const summary = await getDailySummary();

  return (
    <ProductShell
      current="trends"
      eyebrow="Health OS"
      title="Trends"
      description="This is the slower read. Use it when you want to understand whether today is noise, drift, or part of a real pattern."
    >
      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.88)_0%,_rgba(255,255,255,0.82)_100%)] px-5 py-5 shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)]">
          <p className="text-sm text-[#6d6785]">
            Recovery context
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#171329]">
            {summary.readiness.recoveryTrend3d === null
              ? "--"
              : `${summary.readiness.recoveryTrend3d}%`}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#645c7d]">
            3-day recovery average, which is the simplest read on whether today is part of a trend or just a blip.
          </p>
        </article>

        <article className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.88)_0%,_rgba(255,255,255,0.82)_100%)] px-5 py-5 shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)]">
          <p className="text-sm text-[#6d6785]">
            Load baseline
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#171329]">
            {formatPounds(kilogramsToPounds(summary.trainingLoad.hevyVolume28dAvg), 0)}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#645c7d]">
            Rolling 28-day weekly lifting average. Use it to spot when recent work is meaningfully above or below normal.
          </p>
        </article>

        <article className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.88)_0%,_rgba(255,255,255,0.82)_100%)] px-5 py-5 shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)]">
          <p className="text-sm text-[#6d6785]">
            Weight drift
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#171329]">
            {formatPounds(kilogramsToPounds(summary.readiness.bodyWeightDelta28dKg))}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#645c7d]">
            28-day body-weight movement gives better context than any single weigh-in, especially when recent training demand is high.
          </p>
        </article>
      </section>

      <TrendsGrid summary={summary} />
    </ProductShell>
  );
}
