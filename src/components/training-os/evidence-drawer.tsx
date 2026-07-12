"use client";

import { useRef, useState, type ReactNode } from "react";
import styles from "./evidence-drawer.module.css";

export function EvidenceDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reveal = () => { setOpen(true); requestAnimationFrame(() => headingRef.current?.focus()); };
  return <div className={styles.wrap}>
    <button type="button" className={styles.action} onClick={reveal}><span aria-hidden="true">◎</span> Review today&apos;s evidence <span aria-hidden="true">→</span></button>
    <details className={styles.drawer} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Evidence and remaining actions</summary>
      <div className={styles.content}><h2 ref={headingRef} tabIndex={-1}>Today&apos;s evidence</h2>{children}</div>
    </details>
  </div>;
}
