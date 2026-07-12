"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { APP_SECTION_ITEMS, APP_SECTIONS, sectionFromHash, urlForSection, type AppSection } from "@/lib/product-navigation";
import styles from "./global-navigation.module.css";

export type { AppSection } from "@/lib/product-navigation";

const OBSERVER_ROOT_MARGIN = "-30% 0px -55% 0px";

function useObservedSection(fallback: AppSection, isRootPage: boolean) {
  const [active, setActive] = useState(fallback);

  useEffect(() => {
    if (!isRootPage) return;
    const entries = APP_SECTIONS.map((section) => ({ section, element: document.getElementById(section) }))
      .filter((entry): entry is { section: AppSection; element: HTMLElement } => entry.element !== null);
    if (!entries.length || !("IntersectionObserver" in window)) return;
    const byElement = new Map<Element, AppSection>(entries.map(({ section, element }) => [element, section] as const));
    const observer = new IntersectionObserver((observations) => {
      const hit = observations.filter((item) => item.isIntersecting).sort((a, b) =>
        Math.abs(a.boundingClientRect.top - innerHeight * 0.375) - Math.abs(b.boundingClientRect.top - innerHeight * 0.375))[0];
      const section = hit ? byElement.get(hit.target) : undefined;
      if (!section) return;
      setActive(section);
      if (location.hash !== `#${section}`) history.replaceState(history.state, "", urlForSection(location.href, section));
    }, { rootMargin: OBSERVER_ROOT_MARGIN, threshold: 0 });
    entries.forEach(({ element }) => observer.observe(element));
    return () => observer.disconnect();
  }, [isRootPage]);

  useEffect(() => {
    if (!isRootPage) return;
    const sync = () => { const section = sectionFromHash(location.hash); if (section) setActive(section); };
    sync();
    addEventListener("hashchange", sync);
    addEventListener("popstate", sync);
    return () => { removeEventListener("hashchange", sync); removeEventListener("popstate", sync); };
  }, [isRootPage]);

  return [active, setActive] as const;
}

export function GlobalNavigation({ current = "today" }: { current?: AppSection }) {
  const isRootPage = usePathname() === "/";
  const [observed, setObserved] = useObservedSection(current, isRootPage);
  const active = isRootPage ? observed : current;
  return (
    <nav aria-label="Primary navigation" className={styles.nav}>
      {APP_SECTION_ITEMS.map((item) => (
        <a key={item.key} href={item.href} aria-current={item.key === active ? "location" : undefined}
          className={styles.link} data-active={item.key === active} onClick={() => isRootPage && setObserved(item.key)}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
