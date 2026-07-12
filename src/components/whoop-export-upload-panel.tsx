import type { WhoopAnalysisReport } from "@/lib/whoop-export/analysis";

type WhoopExportUploadPanelProps = {
  importState?: string;
  reason?: string;
  report: WhoopAnalysisReport;
};

function formatDate(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(value))
    : "Not available";
}

function formatDateTime(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not available";
}

function importMessage(importState: string | undefined, reason: string | undefined) {
  if (importState === "imported") {
    return {
      tone: "success",
      text: "WHOOP export imported. Historical tables were refreshed from the uploaded ZIP.",
    };
  }

  if (importState === "duplicate") {
    return {
      tone: "neutral",
      text: "That WHOOP export was already imported, so no rows changed.",
    };
  }

  if (importState === "failed") {
    return {
      tone: "error",
      text: reason ?? "WHOOP export import failed.",
    };
  }

  return null;
}

export function WhoopExportUploadPanel({
  importState,
  reason,
  report,
}: WhoopExportUploadPanelProps) {
  const message = importMessage(importState, reason);
  const latest = report.inventory.latestImport;
  const imports = report.inventory.imports;

  return (
    <section
      data-premium-surface
      data-premium-tone="hud"
      data-premium-enter
      className="hud-frame text-white"
    >
      <div className="hud-content grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
            WHOOP export upload
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
            Upload the full WHOOP export ZIP to refresh the historical analysis. The ZIP is parsed
            in memory; overlapping rows are updated and the raw file is not stored.
          </p>

          {message ? (
            <p
              className={`mt-4 border px-3 py-2 text-sm ${
                message.tone === "error"
                  ? "border-[#ff8b72]/30 bg-[#2a1825] text-[#ffd3ca]"
                  : message.tone === "success"
                    ? "border-[#78e08f]/30 bg-[#071b18] text-[#baf6c5]"
                    : "border-white/12 bg-white/[0.045] text-white/70"
              }`}
            >
              {message.text}
            </p>
          ) : null}

          <div className="mt-5 grid gap-px overflow-hidden border border-[#39f8ff]/14 bg-[#39f8ff]/12 text-sm sm:grid-cols-4">
            <div className="bg-[#07101c] p-3">
              <div className="text-white/44">Coverage</div>
              <div className="mt-1 font-semibold text-white">
                {formatDate(report.inventory.start)} – {formatDate(report.inventory.end)}
              </div>
            </div>
            <div className="bg-[#07101c] p-3">
              <div className="text-white/44">Cycles</div>
              <div className="mt-1 font-semibold text-white">
                {report.inventory.counts.cycles ?? 0}
              </div>
            </div>
            <div className="bg-[#07101c] p-3">
              <div className="text-white/44">Sleeps</div>
              <div className="mt-1 font-semibold text-white">
                {report.inventory.counts.sleeps ?? 0}
              </div>
            </div>
            <div className="bg-[#07101c] p-3">
              <div className="text-white/44">Workouts</div>
              <div className="mt-1 font-semibold text-white">
                {report.inventory.counts.workouts ?? 0}
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-white/48">
            Latest import: {latest ? `${latest.sourceName} at ${formatDateTime(latest.importedAt)}` : "none yet"}.
            {imports.length > 1 ? ` ${imports.length} uploads are recorded for provenance.` : ""}
          </p>
        </div>

        <form
          action="/api/whoop/export-import"
          className="border border-white/12 bg-white/[0.04] p-4"
          encType="multipart/form-data"
          method="post"
        >
          <label className="block">
            <span className="text-sm font-medium text-white/82">WHOOP export ZIP</span>
            <input
              accept=".zip,application/zip,application/x-zip-compressed"
              className="mt-2 block w-full border border-white/14 bg-[#07101c] px-3 py-2 text-sm text-white/76 file:mr-3 file:border-0 file:bg-[#39f8ff] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#06121f]"
              name="exportFile"
              required
              type="file"
            />
          </label>
          <button
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[#39f8ff] px-4 text-sm font-semibold text-[#06121f] transition hover:bg-[#8ffff8]"
            type="submit"
          >
            Import WHOOP export
          </button>
          <p className="mt-3 text-xs leading-5 text-white/48">
            Expected files inside the ZIP: physiological cycles, sleeps, workouts, and journal
            entries CSVs.
          </p>
        </form>
      </div>
    </section>
  );
}
