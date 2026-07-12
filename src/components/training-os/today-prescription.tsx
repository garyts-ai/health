import type { DailyRecommendation, DecisionEvidence, EvidenceObservation } from "@/lib/insights/types";
import { EvidenceDrawer } from "./evidence-drawer";
import { GlassPanel } from "./glass-panel";
import styles from "./today-prescription.module.css";

function displayObservation(observation: EvidenceObservation) {
  if (observation.value === null) return "Unavailable";
  if (typeof observation.value === "number") return `${observation.value}${observation.unit ? ` ${observation.unit}` : ""}`;
  return observation.value;
}

function displayAge(ageHours: number | null) {
  if (ageHours === null) return "age unknown";
  if (ageHours < 1) return "<1h old";
  return `${ageHours.toFixed(ageHours >= 10 ? 0 : 1)}h old`;
}

function displayObservedAt(observedAt: string | null) {
  if (!observedAt) return "No observation time";
  return `Observed ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(observedAt))}`;
}

function EvidenceObservationRow({ item }: { item: EvidenceObservation }) {
  const baseline = item.baseline;
  return <article className={styles.observation}>
    <div className={styles.observationHeader}><h3>{item.label}</h3><strong>{displayObservation(item)}</strong></div>
    <p className={styles.observationStatus} data-status={item.status}>{item.source} · {displayObservedAt(item.observedAt)} · {displayAge(item.ageHours)} · {item.status}</p>
    {item.reason ? <p className={styles.evidenceMeta}>Reason: {item.reason}</p> : null}
    {baseline ? <p className={styles.evidenceMeta}>Baseline: {baseline.value === null ? "insufficient" : `${baseline.value.toFixed(1)}${item.unit ? ` ${item.unit}` : ""}`} · {baseline.sampleCount}/{baseline.windowSize} prior cycles</p> : null}
  </article>;
}

export function TodayPrescription({ date, call, intensityLabel, intensity, reason, recommendation, remaining, changes, decisionEvidence }:{ date:string; call:string; intensityLabel:string; intensity:string; reason:string; recommendation?:DailyRecommendation; remaining:DailyRecommendation[]; changes:string[]; decisionEvidence: DecisionEvidence }) {
  return <div className={styles.prescription}>
    <p className={styles.date}>{date}</p>
    <h1 id="today-title" className={styles.title}><span>Today</span><strong>{call}</strong></h1>
    <p className={styles.intensity}>{intensityLabel}: <strong>{intensity}</strong></p>
    <p className={styles.reason}>{reason}</p>
    {recommendation ? <GlassPanel level="raised" className={styles.mission}><span>Mission prescription</span><h2>{recommendation.title}</h2><p>{recommendation.why}</p><div className={styles.tags}>{recommendation.primaryActions.slice(0,3).map((tile)=><span key={tile.label}>{tile.label}</span>)}</div></GlassPanel> : null}
    <EvidenceDrawer><div className={styles.evidence}>
      <div className={styles.evidenceSummary}>
        <p><strong>{decisionEvidence.readinessStatus === "available" ? "Readiness available" : "Readiness unavailable"}</strong> · {decisionEvidence.confidence} confidence</p>
        <p className={styles.evidenceMeta}>Decision recorded {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(decisionEvidence.decisionAt))}</p>
      </div>
      <section aria-labelledby="evidence-observations-title"><h3 id="evidence-observations-title" className={styles.sectionLabel}>Observed inputs</h3>{decisionEvidence.observations.map((item)=><EvidenceObservationRow key={item.key} item={item} />)}</section>
      <section aria-labelledby="evidence-rules-title" className={styles.ruleTrace}><h3 id="evidence-rules-title" className={styles.sectionLabel}>Applied rules</h3>{decisionEvidence.ruleTrace.map((rule)=><article key={rule.label}><div><strong>{rule.label}</strong><span data-outcome={rule.outcome}>{rule.outcome.replace("_", " ")}</span></div><p>{rule.detail}</p></article>)}</section>
      {remaining.map((item,index)=><article key={item.title}><span>{String(index+2).padStart(2,"0")}</span><div><h3>{item.title}</h3><p>{item.why}</p><div className={styles.tags}>{item.primaryActions.slice(0,3).map((tile)=><span key={tile.label}>{tile.label}</span>)}</div></div></article>)}
      {changes.length ? <div className={styles.changes}><h3>What changed</h3>{changes.map((item)=><p key={item}>{item}</p>)}</div> : null}
    </div></EvidenceDrawer>
  </div>;
}
