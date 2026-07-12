import type { ReactNode } from "react";
import styles from "./page-hero.module.css";

export function PageHero({ status, prescription, instrument, rail }: { status?: ReactNode; prescription: ReactNode; instrument: ReactNode; rail: ReactNode }) {
  return <div className={styles.hero}>{status ? <div className={styles.status}>{status}</div> : null}<div className={styles.grid}><div className={styles.prescription}>{prescription}</div><div className={styles.instrument}>{instrument}</div></div><div className={styles.rail}>{rail}</div></div>;
}
