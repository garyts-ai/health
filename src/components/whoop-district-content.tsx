import { WhoopAnalysisClient } from "@/components/whoop-analysis-client";
import { getWhoopAnalysisSelection } from "@/lib/longitudinal/selection";

export async function WhoopDistrictContent() {
  const initialData = await getWhoopAnalysisSelection({ range: "30d", view: "overview" });
  return <WhoopAnalysisClient initialData={initialData} />;
}
