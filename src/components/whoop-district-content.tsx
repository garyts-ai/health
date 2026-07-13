import { LongitudinalObservatory } from "@/components/longitudinal-observatory";
import { getLongitudinalHealthView } from "@/lib/longitudinal";

export async function WhoopDistrictContent() {
  const view = await getLongitudinalHealthView();
  return <LongitudinalObservatory view={view} />;
}
