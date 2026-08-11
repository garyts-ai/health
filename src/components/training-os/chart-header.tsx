import type { ReactNode } from "react";
import styles from "./chart-header.module.css";

export type ChartHeaderProps = {
  title: string;
  value: ReactNode;
  metric?: string;
  status?: ReactNode;
};

export function ChartHeader({ title, value, metric, status }: ChartHeaderProps) {
  return <header className={styles.header}>
    <h3>{title}</h3>
    <div className={styles.figure} data-metric={metric}>
      <strong>{value}</strong>
      {status ? <span>{status}</span> : null}
    </div>
  </header>;
}
