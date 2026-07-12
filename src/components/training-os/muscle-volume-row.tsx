import type { BodyHighlightIntensity, BodyRegionId } from "@/lib/insights/types";
import styles from "./muscle-volume-row.module.css";

export type MuscleVolumeRowProps = {
  label: string;
  effectiveSets: number;
  hits: number;
  regions: BodyRegionId[];
  intensity: BodyHighlightIntensity;
  active?: boolean;
  selected?: boolean;
  onInspect: (region: BodyRegionId) => void;
  onPreview: (region: BodyRegionId | null) => void;
};

export function MuscleVolumeRow({ label, effectiveSets, hits, regions, intensity, active, selected, onInspect, onPreview }: MuscleVolumeRowProps) {
  const region = regions[0];
  const filled = Math.min(12, Math.max(1, Math.round(effectiveSets)));
  return <button type="button" className={styles.row} data-active={active} data-intensity={intensity} aria-pressed={selected}
    onMouseEnter={() => onPreview(region)} onMouseLeave={() => onPreview(null)} onFocus={() => onPreview(region)} onBlur={() => onPreview(null)} onClick={() => onInspect(region)}>
    <span className={styles.label}>{label}</span>
    <span className={styles.segments} aria-hidden="true">{Array.from({ length: 12 }, (_,index) => <i key={index} data-filled={index < filled} />)}</span>
    <span className={styles.value}>{effectiveSets} / {hits}×</span>
  </button>;
}
