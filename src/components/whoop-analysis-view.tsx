import type {
  WhoopAnalysisReport,
  WhoopMetric,
} from "@/lib/whoop-export/analysis";
import { WhoopVisualAnalysis } from "@/components/whoop-trends";

const tones = {
  green: { line: "#78e08f", fill: "#78e08f", text: "text-[#9af0ac]", bar: "bg-[#78e08f]" },
  violet: { line: "#b5abff", fill: "#b5abff", text: "text-[#d2ccff]", bar: "bg-[#b5abff]" },
  cyan: { line: "#71fff1", fill: "#71fff1", text: "text-[#9afff6]", bar: "bg-[#71fff1]" },
  coral: { line: "#ff8b72", fill: "#ff8b72", text: "text-[#ffb6a6]", bar: "bg-[#ff8b72]" },
  amber: { line: "#f4c96b", fill: "#f4c96b", text: "text-[#f9dc98]", bar: "bg-[#f4c96b]" },
  rose: { line: "#e99aaf", fill: "#e99aaf", text: "text-[#f1bac9]", bar: "bg-[#e99aaf]" },
};

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value))
    : "Not available";
}

function directionLabel(direction: WhoopMetric["direction"], lowerIsBetter = false) {
  if (direction === "missing") return "No comparison";
  if (direction === "flat") return "Near baseline";
  if (direction === "up") return lowerIsBetter ? "Higher than baseline" : "Above baseline";
  return lowerIsBetter ? "Lower than baseline" : "Below baseline";
}

function DeltaComparison({
  item,
}: {
  item: WhoopAnalysisReport["overview"]["comparisons"][number];
}) {
  const tone = tones[item.tone];
  const relative =
    item.baseline === null || item.recent === null || item.baseline === 0
      ? 50
      : Math.max(8, Math.min(92, 50 + ((item.recent - item.baseline) / Math.abs(item.baseline)) * 180));

  return (
    <div className="border-t border-white/10 py-4 first:border-t-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] text-white/58">{item.label}</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-white">{item.recentLabel}</div>
        </div>
        <div className={`text-right text-xs ${tone.text}`}>
          <div>{directionLabel(item.direction, item.lowerIsBetter)}</div>
          <div className="mt-1 text-white/42">baseline {item.baselineLabel}</div>
        </div>
      </div>
      <div className="relative mt-3 h-1.5 bg-white/10">
        <div className="absolute left-1/2 top-[-3px] h-3 w-px bg-white/50" />
        <div
          className={`absolute top-0 h-1.5 ${tone.bar}`}
          style={{
            left: relative < 50 ? `${relative}%` : "50%",
            width: `${Math.max(2, Math.abs(relative - 50))}%`,
          }}
        />
      </div>
    </div>
  );
}

export function WhoopAnalysisView({ report }: { report: WhoopAnalysisReport }) {
  if (report.empty) {
    return (
      <section data-premium-surface data-premium-tone="dark" data-premium-enter className="hud-frame px-6 py-12 text-center text-white">
        <div className="hud-content">
        <h2 className="text-xl font-semibold text-white">No WHOOP export uploaded</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/62">
          Upload the full WHOOP export ZIP above to populate this private long-range report.
        </p>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      <section data-premium-surface data-premium-tone="hud" data-premium-enter className="hud-frame overflow-hidden text-white">
        <div className="hud-content grid xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="border-b border-white/10 p-4 sm:p-5 xl:border-b-0 xl:border-r">
            <div className="hud-micro-label">Recovery system</div>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold leading-tight tracking-[-0.04em] sm:text-3xl">
              {report.overview.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-white/64">{report.overview.detail}</p>
            <div className="mt-4 grid gap-px overflow-hidden bg-[#39f8ff]/12 sm:grid-cols-3">
              <div className="bg-[#07101c] px-3 py-3">
                <div className="text-[11px] text-white/42">Coverage</div>
                <div className="mt-1 text-lg font-semibold">{report.inventory.days} days</div>
              </div>
              <div className="bg-[#07101c] px-3 py-3">
                <div className="text-[11px] text-white/42">Continuity</div>
                <div className="mt-1 text-lg font-semibold">{report.inventory.gaps} gaps</div>
              </div>
              <div className="bg-[#07101c] px-3 py-3">
                <div className="text-[11px] text-white/42">Confidence</div>
                <div className="mt-1 text-lg font-semibold">{report.overview.confidence}</div>
              </div>
            </div>
            <details className="mt-3 border-t border-white/10 pt-3 text-sm text-white/58">
              <summary className="cursor-pointer font-medium text-white/76">Dataset detail</summary>
              <p className="mt-2 leading-5">
                {formatDate(report.inventory.start)} – {formatDate(report.inventory.end)} · {report.inventory.counts.cycles} cycles · {report.inventory.counts.workouts} workouts · {report.inventory.counts.journalAnswers} journal answers.
                {report.inventory.imports.length > 1 ? ` Latest upload: ${report.inventory.latestImport?.sourceName ?? "unknown"}.` : ""}
              </p>
              <p className="mt-2 text-white/42">Unavailable: {report.inventory.missing.join(", ")}.</p>
            </details>
          </div>
          <div className="px-4 py-2 sm:px-5">
            {report.overview.comparisons.map((item) => <DeltaComparison key={item.key} item={item} />)}
          </div>
        </div>
      </section>

      <WhoopVisualAnalysis report={report} />

      <section>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Highest-leverage changes</h2>
        <div data-premium-surface data-premium-tone="dark" data-premium-enter className="hud-frame mt-3 overflow-hidden text-white">
          <div className="hud-content">
          {report.leveragePoints.length ? report.leveragePoints.map((point, index) => (
            <article key={point.title} className="grid gap-3 border-t border-white/10 px-4 py-4 first:border-t-0 lg:grid-cols-[2rem_14rem_1fr]">
              <div className="text-xl font-semibold text-[#39f8ff]">{index + 1}</div>
              <div>
                <h3 className="font-semibold text-white">{point.title}</h3>
                <p className="mt-2 text-xs leading-5 text-white/48">{point.impact}</p>
              </div>
              <div>
                <p className="text-sm leading-5 text-white/66">{point.evidence}</p>
                <ul className="mt-3 grid gap-2 text-sm text-white/78 sm:grid-cols-2">
                  {point.actions.slice(0, 2).map((action) => (
                    <li key={action} className="border-l-2 border-[#ff8b72] pl-3">{action}</li>
                  ))}
                </ul>
                <details className="mt-3 text-sm text-white/54">
                  <summary className="cursor-pointer font-medium text-[#39f8ff]">Why this matters</summary>
                  <p className="mt-2 leading-5">{point.why}</p>
                </details>
              </div>
            </article>
          )) : <p className="px-5 py-8 text-sm text-white/62">No leverage point met the evidence threshold.</p>}
          </div>
        </div>
      </section>

      <section data-premium-surface data-premium-tone="hud" data-premium-enter className="hud-frame overflow-hidden text-white">
        <div className="hud-content">
        <h2 className="border-b border-white/10 px-4 py-3 text-lg font-semibold">Protocol this week</h2>
        <div className="grid gap-px bg-[#39f8ff]/12 md:grid-cols-3">
          {[
            ["Non-negotiables", report.protocol.nonNegotiables, "border-[#ff8b72]"],
            ["Quick wins", report.protocol.quickWins, "border-[#71fff1]"],
            ["Watch closely", report.protocol.watch, "border-[#b5abff]"],
          ].map(([title, items, border]) => (
            <div key={title as string} className="bg-[#07101c] p-4">
              <h3 className={`border-l-2 pl-3 font-semibold ${border as string}`}>{title as string}</h3>
              <ul className="mt-3 space-y-2 text-sm leading-5 text-white/70">
                {(items as string[]).map((item, index) => <li key={`${title}-${index}-${item}`}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        {report.protocol.medicalFlags.length ? (
          <div className="border-t border-[#ff8b72]/30 bg-[#2a1825] px-5 py-5">
            <h3 className="font-semibold text-[#ffd3ca]">Flags for medical attention</h3>
            <ul className="mt-2 space-y-1 text-sm text-white/76">
              {report.protocol.medicalFlags.map((flag) => <li key={flag}>{flag}</li>)}
            </ul>
          </div>
        ) : null}
        </div>
      </section>
    </div>
  );
}
