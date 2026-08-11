import { getWhoopExportInventory } from "@/lib/whoop-export/inventory";

type WhoopExportUploadPanelProps = { importState?: string; reason?: string };

function formatDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : "Not available";
}

function formatDateTime(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not available";
}

function importMessage(importState: string | undefined, reason: string | undefined) {
  if (importState === "imported") return { tone: "success", text: "WHOOP history imported." };
  if (importState === "duplicate") return { tone: "neutral", text: "Already imported; no rows changed." };
  if (importState === "failed") return { tone: "error", text: reason ?? "WHOOP import failed." };
  return null;
}

export async function WhoopExportUploadPanel({ importState, reason }: WhoopExportUploadPanelProps) {
  const inventory = await getWhoopExportInventory();
  const message = importMessage(importState, reason);
  const latest = inventory.latestImport;

  return <section data-premium-surface data-premium-tone="hud" className="hud-frame text-white">
    <div className="hud-content grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">WHOOP export history</h2>
        {message ? <p role="status" className={`mt-4 border px-3 py-2 text-sm ${message.tone === "error" ? "border-[#ff8b72]/30 bg-[#2a1825] text-[#ffd3ca]" : message.tone === "success" ? "border-[#78e08f]/30 bg-[#071b18] text-[#baf6c5]" : "border-white/12 bg-white/[0.045] text-white/70"}`}>{message.text}</p> : null}
        <dl className="mt-5 grid gap-px overflow-hidden border border-[#39f8ff]/14 bg-[#39f8ff]/12 text-sm sm:grid-cols-2">
          <div className="bg-[#07101c] p-3"><dt className="text-white/62">Coverage</dt><dd className="mt-1 font-semibold text-white">{formatDate(inventory.start)} – {formatDate(inventory.end)}</dd></div>
          <div className="bg-[#07101c] p-3"><dt className="text-white/62">Latest import</dt><dd className="mt-1 font-semibold text-white">{latest ? formatDateTime(latest.importedAt) : "None"}</dd></div>
        </dl>
        <details className="mt-3 border-t border-white/12 text-sm text-white/70" open={message?.tone === "error"}>
          <summary className="flex min-h-11 cursor-pointer items-center">Import details</summary>
          <dl className="grid gap-2 pb-3 sm:grid-cols-3"><div><dt>Cycles</dt><dd>{inventory.counts.cycles}</dd></div><div><dt>Sleeps</dt><dd>{inventory.counts.sleeps}</dd></div><div><dt>Workouts</dt><dd>{inventory.counts.workouts}</dd></div></dl>
          <p>ZIP contents are parsed in memory; overlapping rows are updated and the raw file is not stored. {inventory.importCount} import{inventory.importCount === 1 ? "" : "s"} recorded.</p>
        </details>
      </div>
      <form action="/api/whoop/export-import" className="border border-white/12 bg-white/[0.04] p-4" encType="multipart/form-data" method="post">
        <label className="block"><span className="text-sm font-medium text-white/82">WHOOP export ZIP</span><input accept=".zip,application/zip,application/x-zip-compressed" className="mt-2 block w-full border border-white/14 bg-[#07101c] px-3 py-2 text-sm text-white/76 file:mr-3 file:border-0 file:bg-[#39f8ff] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#06121f]" name="exportFile" required type="file" /></label>
        <button className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[#39f8ff] px-4 text-sm font-semibold text-[#06121f] transition hover:bg-[#8ffff8]" type="submit">Import WHOOP export</button>
      </form>
    </div>
  </section>;
}
