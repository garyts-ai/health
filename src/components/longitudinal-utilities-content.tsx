import { LlmContextPacket } from "@/components/llm-context-packet";
import { WhoopExportUploadPanel } from "@/components/whoop-export-upload-panel";
import { getLongitudinalHealthView } from "@/lib/longitudinal";
import { buildLongitudinalContextPacket } from "@/lib/longitudinal-context-packet";

type LongitudinalUtilitiesContentProps = {
  importReason?: string;
  importState?: string;
};

export async function LongitudinalUtilitiesContent({
  importReason,
  importState,
}: LongitudinalUtilitiesContentProps) {
  const view = await getLongitudinalHealthView();
  const handoff = buildLongitudinalContextPacket(view);

  return (
    <div className="district-longitudinal-utilities">
      <WhoopExportUploadPanel importState={importState} reason={importReason} />
      <LlmContextPacket handoff={handoff} />
    </div>
  );
}
