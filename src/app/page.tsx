export default function Home() {
  const integrationStatus = [
    { name: "WHOOP", detail: "OAuth app configured and local secrets saved." },
    { name: "Hevy", detail: "API key ready for ingest and workout sync." },
  ];

  const todayActions = [
    "Check recovery, sleep debt, and yesterday's training load together before choosing intensity.",
    "Flag stale provider syncs before trusting a recommendation.",
    "Keep recommendations explainable so every action shows the data behind it.",
  ];

  const roadmap = [
    "Provider adapters for WHOOP and Hevy with sync timestamps and source provenance.",
    "A normalized daily health model that merges readiness and lifting context into one timeline.",
    "A Today view that surfaces the top 3-5 actions with rationale and trend context.",
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(163,230,53,0.18),_transparent_32%),linear-gradient(180deg,_#f5f9ef_0%,_#edf4eb_42%,_#e6ede9_100%)] px-5 py-8 text-stone-900 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-7 shadow-[0_24px_80px_rgba(74,93,35,0.12)] backdrop-blur sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-700">
                Private Health Intelligence
              </p>
              <h1 className="font-sans text-4xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
                Merge WHOOP recovery with Hevy training and turn it into a daily plan.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
                This foundation keeps your data local-first, syncs WHOOP and Hevy into one
                timeline, and sets up a Today view built around actionable health and
                training recommendations.
              </p>
            </div>

            <div className="grid min-w-[280px] gap-3 rounded-[1.5rem] bg-stone-950 p-5 text-stone-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">
                Initial Focus
              </p>
              <p className="text-3xl font-semibold">Data Foundation First</p>
              <p className="text-sm leading-6 text-stone-300">
                Deterministic recommendations, no paid LLM calls, and a private dashboard
                you can run locally before hosting anywhere else.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[1.75rem] border border-stone-200/80 bg-white/85 p-6 shadow-[0_18px_55px_rgba(78,88,61,0.1)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              Provider Status
            </p>
            <div className="mt-5 grid gap-4">
              {integrationStatus.map((item) => (
                <div
                  key={item.name}
                  className="rounded-[1.25rem] border border-lime-200 bg-lime-50/70 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-stone-950">{item.name}</h2>
                    <span className="rounded-full bg-lime-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                      Ready
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-stone-200/80 bg-[linear-gradient(160deg,_#17212a_0%,_#1f2e23_100%)] p-6 text-stone-50 shadow-[0_18px_55px_rgba(28,38,35,0.25)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-300">
              Today View Goal
            </p>
            <ol className="mt-5 grid gap-3">
              {todayActions.map((action, index) => (
                <li
                  key={action}
                  className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime-200">
                    Action {index + 1}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-100">{action}</p>
                </li>
              ))}
            </ol>
          </article>
        </section>

        <section className="rounded-[1.75rem] border border-stone-200/80 bg-white/85 p-6 shadow-[0_18px_55px_rgba(78,88,61,0.1)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                Build Sequence
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                What comes next in the app
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-stone-600">
              This scaffold is ready for OAuth routes, API clients, a normalized local
              database, and a dashboard that explains every recommendation.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {roadmap.map((item, index) => (
              <div
                key={item}
                className="rounded-[1.25rem] border border-stone-200 bg-stone-50/80 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-700">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
