import type { DailyRecommendation } from "@/lib/insights/types";
import { EvidenceDrawer } from "./evidence-drawer";
import { GlassPanel } from "./glass-panel";
import styles from "./today-prescription.module.css";

export function TodayPrescription({ date, call, intensityLabel, intensity, reason, recommendation, remaining, changes }:{ date:string; call:string; intensityLabel:string; intensity:string; reason:string; recommendation?:DailyRecommendation; remaining:DailyRecommendation[]; changes:string[] }) {
  return <div className={styles.prescription}>
    <p className={styles.date}>{date}</p>
    <h1 id="today-title" className={styles.title}><span>Today</span><strong>{call}</strong></h1>
    <p className={styles.intensity}>{intensityLabel}: <strong>{intensity}</strong></p>
    <p className={styles.reason}>{reason}</p>
    {recommendation ? <GlassPanel level="raised" className={styles.mission}><span>Mission prescription</span><h2>{recommendation.title}</h2><p>{recommendation.why}</p><div className={styles.tags}>{recommendation.primaryActions.slice(0,3).map((tile)=><span key={tile.label}>{tile.label}</span>)}</div></GlassPanel> : null}
    <EvidenceDrawer><div className={styles.evidence}>{remaining.map((item,index)=><article key={item.title}><span>{String(index+2).padStart(2,"0")}</span><div><h3>{item.title}</h3><p>{item.why}</p><div className={styles.tags}>{item.primaryActions.slice(0,3).map((tile)=><span key={tile.label}>{tile.label}</span>)}</div></div></article>)}{changes.length ? <div className={styles.changes}><h3>What changed</h3>{changes.map((item)=><p key={item}>{item}</p>)}</div> : null}</div></EvidenceDrawer>
  </div>;
}
