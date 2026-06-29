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
      data-premium-tone="light"
      data-premium-enter
      className="border border-[#d8d2e4] bg-[#fbf9fd] p-5"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171329]">
            WHOOP export upload
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#645c7d]">
            Upload the full WHOOP export ZIP to refresh the historical analysis. The ZIP is parsed
            in memory; overlapping rows are updated and the raw file is not stored.
          </p>

          {message ? (
            <p
              className={`mt-4 border px-3 py-2 text-sm ${
                message.tone === "error"
                  ? "border-[#e4adb8] bg-[#fff4f6] text-[#8b3850]"
                  : message.tone === "success"
                    ? "border-[#b9d8bd] bg-[#f4fbf4] text-[#355d3b]"
                    : "border-[#d8d2e4] bg-white/72 text-[#4d4764]"
              }`}
            >
              {message.text}
            </p>
          ) : null}

          <div className="mt-5 grid gap-px overflow-hidden border border-[#e1dceb] bg-[#e1dceb] text-sm sm:grid-cols-4">
            <div className="bg-white/76 p-3">
              <div className="text-[#7b7492]">Coverage</div>
              <div className="mt-1 font-semibold text-[#312c49]">
                {formatDate(report.inventory.start)} – {formatDate(report.inventory.end)}
              </div>
            </div>
            <div className="bg-white/76 p-3">
              <div className="text-[#7b7492]">Cycles</div>
              <div className="mt-1 font-semibold text-[#312c49]">
                {report.inventory.counts.cycles ?? 0}
              </div>
            </div>
            <div className="bg-white/76 p-3">
              <div className="text-[#7b7492]">Sleeps</div>
              <div className="mt-1 font-semibold text-[#312c49]">
                {report.inventory.counts.sleeps ?? 0}
              </div>
            </div>
            <div className="bg-white/76 p-3">
              <div className="text-[#7b7492]">Workouts</div>
              <div className="mt-1 font-semibold text-[#312c49]">
                {report.inventory.counts.workouts ?? 0}
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-[#7b7492]">
            Latest import: {latest ? `${latest.sourceName} at ${formatDateTime(latest.importedAt)}` : "none yet"}.
            {imports.length > 1 ? ` ${imports.length} uploads are recorded for provenance.` : ""}
          </p>
        </div>

        <form
          action="/api/whoop/export-import"
          className="border border-[#ded7ea] bg-white/74 p-4"
          encType="multipart/form-data"
          method="post"
        >
          <label className="block">
            <span className="text-sm font-medium text-[#312c49]">WHOOP export ZIP</span>
            <input
              accept=".zip,application/zip,application/x-zip-compressed"
              className="mt-2 block w-full border border-[#d8d1ec] bg-white px-3 py-2 text-sm text-[#312c49] file:mr-3 file:border-0 file:bg-[#19162a] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
              name="exportFile"
              required
              type="file"
            />
          </label>
          <button
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-[#19162a] px-4 text-sm font-semibold text-white transition hover:bg-[#2b2443]"
            type="submit"
          >
            Import WHOOP export
          </button>
          <p className="mt-3 text-xs leading-5 text-[#7b7492]">
            Expected files inside the ZIP: physiological cycles, sleeps, workouts, and journal
            entries CSVs.
          </p>
        </form>
      </div>
    </section>
  );
}
