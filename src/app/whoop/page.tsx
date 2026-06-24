import { ProductShell } from "@/components/product-shell";
import { WhoopAnalysisView } from "@/components/whoop-analysis-view";
import { UtilityAccess } from "@/components/utility-access";
import { getDailySummary } from "@/lib/insights/engine";
import { getWhoopAnalysisReport } from "@/lib/whoop-export/analysis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WhoopPage() {
  const [report, summary] = await Promise.all([getWhoopAnalysisReport(), getDailySummary()]);

  return (
    <ProductShell
      current="whoop"
      eyebrow="Health OS"
      title="WHOOP analysis"
      description="Long-range baselines, personal behavior patterns, and a focused weekly protocol from the full WHOOP export."
      utility={<UtilityAccess summary={summary} />}
    >
      <WhoopAnalysisView report={report} />
    </ProductShell>
  );
}
