"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import styles from "./evidence-drawer.module.css";

export function EvidenceDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const regionId = useId();
  const reveal = () => {
    setOpen(true);
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return <div className={styles.wrap}>
    <button ref={triggerRef} type="button" className={styles.action} aria-expanded={open} aria-controls={regionId} onClick={open ? close : reveal}>
      <span aria-hidden="true">◉</span> {open ? "Close today&apos;s evidence" : "Review today&apos;s evidence"} <span aria-hidden="true">{open ? "↑" : "→"}</span>
    </button>
    {open ? <section id={regionId} className={styles.drawer} role="region" aria-labelledby={headingId}>
      <div className={styles.content}>
        <div className={styles.contentHeader}><h2 id={headingId} ref={headingRef} tabIndex={-1}>Today&apos;s evidence</h2><button type="button" className={styles.close} onClick={close}>Close</button></div>
        {children}
      </div>
    </section> : null}
  </div>;
}
