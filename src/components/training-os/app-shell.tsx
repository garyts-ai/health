import Link from "next/link";
import type { ReactNode } from "react";
import { MobilePullSync } from "@/components/mobile-pull-sync";
import { NeonAtmosphere } from "@/components/neon-atmosphere";
import { GlobalNavigation } from "./global-navigation";
import styles from "./app-shell.module.css";

export function AppShell({ date, children }: { date: string; children: ReactNode }) {
  return (
    <main className={`district-shell ${styles.shell}`}>
      <MobilePullSync />
      <NeonAtmosphere />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="#today" aria-label="HealthMaxer today"><span>HX</span><strong>HealthMaxer</strong></Link>
          <GlobalNavigation current="today" />
          <p className={styles.date}>{date}</p>
        </div>
      </header>
      {children}
      <footer className="district-footer"><span>Health OS</span><a href="#today">Back to today ↑</a></footer>
    </main>
  );
}
