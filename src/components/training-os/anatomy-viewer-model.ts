import { ANATOMY_REGION_IDS, anatomyRegionView } from "@/lib/anatomy-regions";
import type { BodyHighlight, BodyRegionId } from "@/lib/insights/types";

const WEIGHT = { high: 3, medium: 2, low: 1 } as const;

export function bestRegionForView(view: "front" | "back", weekly: BodyHighlight[], latest: BodyHighlight[]) {
  const inView = (regionId: BodyRegionId) => anatomyRegionView(regionId) === view;
  const latestCandidate = latest.find((item) => inView(item.regionId));
  if (latestCandidate) return latestCandidate.regionId;
  return weekly.filter((item) => inView(item.regionId)).sort((a,b) =>
    WEIGHT[b.intensity] - WEIGHT[a.intensity] || ANATOMY_REGION_IDS.indexOf(a.regionId) - ANATOMY_REGION_IDS.indexOf(b.regionId))[0]?.regionId ?? null;
}

export function defaultAnatomyView(weekly: BodyHighlight[], latest: BodyHighlight[]): "front" | "back" {
  const newest = latest[0]?.regionId;
  if (newest) return anatomyRegionView(newest);
  const front = bestRegionForView("front", weekly, latest);
  const back = bestRegionForView("back", weekly, latest);
  if (!front && back) return "back";
  return "front";
}

export function visibleCalloutRegions(view: "front" | "back", weekly: BodyHighlight[], latest: BodyHighlight[]) {
  const ids: BodyRegionId[] = [];
  for (const item of [...latest, ...weekly]) {
    if (anatomyRegionView(item.regionId) === view && !ids.includes(item.regionId)) ids.push(item.regionId);
  }
  return ids.slice(0, 8);
}
