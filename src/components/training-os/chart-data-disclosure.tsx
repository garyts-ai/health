import type { ReactNode } from "react";
import styles from "./chart-data-disclosure.module.css";

export type ChartDataRow = { label: ReactNode; value: ReactNode };

export function ChartDataDisclosure({ label = "View data", rows, children }: { label?: string; rows?: ChartDataRow[]; children?: ReactNode }) {
  if (!rows?.length && !children) return null;
  return <details className={styles.details}>
    <summary>{label}</summary>
    {rows?.length ? <dl>{rows.map((row, index) => <div key={index}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl> : null}
    {children}
  </details>;
}
