"use client";

import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { AnatomyFigure } from "@/components/anatomy-figure";
import { ANATOMY_REGION_META } from "@/lib/anatomy-regions";
import type { BodyHighlight, BodyHighlightIntensity, BodyRegionId } from "@/lib/insights/types";
import { bestRegionForView, defaultAnatomyView, visibleCalloutRegions } from "./anatomy-viewer-model";
import { MuscleVolumeRow } from "./muscle-volume-row";
import styles from "./anatomy-viewer.module.css";

export type AnatomyVolumeItem = { label: string; effectiveSets: number; hits: number; regions: BodyRegionId[] };

function intensityFor(hits: number): BodyHighlightIntensity { return hits >= 3 ? "high" : hits >= 2 ? "medium" : "low"; }

export function AnatomyViewer({ weeklyHighlights, latestHighlights, volume, latestWorkout, latestSessionAge, workoutCount, emptyMessage, note }:{
  weeklyHighlights: BodyHighlight[]; latestHighlights: BodyHighlight[]; volume: AnatomyVolumeItem[]; latestWorkout: string; latestSessionAge: string; workoutCount: number; emptyMessage: string; note?: string | null;
}) {
  const [selectedView,setSelectedView] = useState<"front"|"back"|null>(null);
  const [selectedRegion,setSelectedRegion] = useState<{ explicit: boolean; value: BodyRegionId | null }>({ explicit: false, value: null });
  const [preview,setPreview] = useState<BodyRegionId|null>(null);
  const view = selectedView ?? defaultAnatomyView(weeklyHighlights,latestHighlights);
  const pinned = selectedRegion.explicit ? selectedRegion.value : bestRegionForView(view,weeklyHighlights,latestHighlights);
  const active = preview ?? pinned;
  const callouts = useMemo(() => visibleCalloutRegions(view,weeklyHighlights,latestHighlights),[view,weeklyHighlights,latestHighlights]);
  const changeView = (next: "front"|"back") => { setSelectedView(next); setPreview(null); };
  const inspect = (region: BodyRegionId) => setSelectedRegion({ explicit: true, value: pinned === region ? null : region });
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => { if (event.key === "Escape") { setSelectedRegion({ explicit: true, value: null }); setPreview(null); } };
  const visibleVolume = volume.filter((item) => item.regions.some((region) => ANATOMY_REGION_META[region].view === view)).slice(0,6);

  return <section className={styles.viewer} aria-labelledby="training-core-title" onKeyDown={onKeyDown}>
    <header className={styles.header}><div><span className={styles.kicker}>Training core / profile</span><h2 id="training-core-title">Anatomy instrument</h2><p>{workoutCount} lifts · latest {latestSessionAge}</p></div><span className={styles.online}>Online <i /></span></header>
    <div className={styles.stage} data-view={view}>
      <div className={styles.rings} aria-hidden="true" />
      <div className={styles.figure}><AnatomyFigure key={view} weeklyHighlights={weeklyHighlights} latestHighlights={latestHighlights} view={view} activeRegionId={active} className={styles.figureInner} mode="instrument" motionMode="static" preload /></div>
      <div className={styles.callouts} aria-label={`${view} anatomy regions`}>
        {callouts.map((region) => { const meta=ANATOMY_REGION_META[region]; return <button key={region} type="button" className={styles.callout} data-side={meta.calloutSide} data-active={active===region}
          aria-pressed={pinned===region} style={{"--callout-y":`${meta.calloutY}%`} as CSSProperties} onMouseEnter={()=>setPreview(region)} onMouseLeave={()=>setPreview(null)} onFocus={()=>setPreview(region)} onBlur={()=>setPreview(null)} onClick={()=>inspect(region)}>{meta.label}<i aria-hidden="true" /></button>; })}
      </div>
      <div className={styles.viewControls} aria-label="Anatomy view">{(["front","back"] as const).map((option)=><button type="button" key={option} aria-pressed={view===option} onClick={()=>changeView(option)}>{option}</button>)}</div>
    </div>
    <div className={styles.session}><span>Latest session</span><strong>{latestWorkout}</strong><p>{note ?? `${workoutCount} lifts · latest ${latestSessionAge}`}</p></div>
    <div className={styles.legend} aria-label="Training map legend"><span data-tone="low">1×</span><span data-tone="medium">2×</span><span data-tone="high">3×+</span><span data-tone="latest">Latest</span></div>
    <div className={styles.volume}><div className={styles.volumeHeading}><h3>Weekly muscle volume</h3><span>sets / freq</span></div>{visibleVolume.length ? visibleVolume.map((item)=><MuscleVolumeRow key={item.label} {...item} intensity={intensityFor(item.hits)} active={item.regions.includes(active as BodyRegionId)} selected={item.regions.includes(pinned as BodyRegionId)} onInspect={inspect} onPreview={setPreview} />) : <p className={styles.empty}>{emptyMessage}</p>}</div>
  </section>;
}
