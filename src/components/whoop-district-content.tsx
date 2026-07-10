import { WhoopAnalysisView } from "@/components/whoop-analysis-view";
import { WhoopExportUploadPanel } from "@/components/whoop-export-upload-panel";
import { getWhoopAnalysisReport } from "@/lib/whoop-export/analysis";

type WhoopDistrictContentProps = {
  importReason?: string;
  importState?: string;
};

export async function WhoopDistrictContent({
  importReason,
  importState,
}: WhoopDistrictContentProps) {
  const report = await getWhoopAnalysisReport();

  return (
    <>
      <WhoopExportUploadPanel importState={importState} reason={importReason} report={report} />
      <WhoopAnalysisView report={report} />
    </>
  );
}
