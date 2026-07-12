import type { ReactNode } from "react";
import styles from "./page-transition.module.css";

export function PageTransition({ id, labelledBy, className, initial = false, children }: { id: string; labelledBy: string; className?: string; initial?: boolean; children: ReactNode }) {
  return <section id={id} aria-labelledby={labelledBy} className={[styles.section, className].filter(Boolean).join(" ")} data-initial={initial}>{children}</section>;
}
