import { ProductShell } from "@/components/product-shell";
import { WhoopExportUploadPanel } from "@/components/whoop-export-upload-panel";
import { WhoopAnalysisView } from "@/components/whoop-analysis-view";
import { UtilityAccess } from "@/components/utility-access";
import { getDailySummary } from "@/lib/insights/engine";
import { getWhoopAnalysisReport } from "@/lib/whoop-export/analysis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WhoopPageProps = {
  searchParams?: Promise<{
    import?: string;
    reason?: string;
  }>;
};

export default async function WhoopPage({ searchParams }: WhoopPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const [report, summary] = await Promise.all([getWhoopAnalysisReport(), getDailySummary()]);

  return (
    <ProductShell
      current="whoop"
      eyebrow="Health OS"
      title="WHOOP analysis"
      description="Long-range baselines, personal behavior patterns, and a focused weekly protocol from the full WHOOP export."
      utility={<UtilityAccess summary={summary} />}
    >
      <div className="mb-7">
        <WhoopExportUploadPanel
          importState={resolvedSearchParams.import}
          reason={resolvedSearchParams.reason}
          report={report}
        />
      </div>
      <WhoopAnalysisView report={report} />
    </ProductShell>
  );
}
