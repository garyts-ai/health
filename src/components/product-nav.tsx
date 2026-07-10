"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  APP_SECTION_ITEMS,
  APP_SECTIONS,
  sectionFromHash,
  urlForSection,
  type AppSection,
} from "@/lib/product-navigation";

export type { AppSection } from "@/lib/product-navigation";

// Kept as an alias while the legacy route shells migrate to anchored sections.
export type ProductRoute = AppSection;

const OBSERVER_ROOT_MARGIN = "-30% 0px -55% 0px";

function useObservedSection(fallback: AppSection, isRootPage: boolean) {
  const [activeSection, setActiveSection] = useState<AppSection>(fallback);

  useEffect(() => {
    if (!isRootPage) {
      return;
    }

    const sections = APP_SECTIONS.map((section) => ({
      section,
      element: document.getElementById(section),
    })).filter(
      (entry): entry is { section: AppSection; element: HTMLElement } =>
        entry.element !== null,
    );

    if (sections.length === 0 || !("IntersectionObserver" in window)) {
      return;
    }

    const sectionByElement = new Map<Element, AppSection>(
      sections.map(({ section, element }) => [element, section] as const),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top - window.innerHeight * 0.375) -
              Math.abs(b.boundingClientRect.top - window.innerHeight * 0.375),
          );
        const section = intersecting[0]
          ? sectionByElement.get(intersecting[0].target)
          : undefined;

        if (!section) {
          return;
        }

        setActiveSection(section);
        if (window.location.hash !== `#${section}`) {
          window.history.replaceState(
            window.history.state,
            "",
            urlForSection(window.location.href, section),
          );
        }
      },
      { rootMargin: OBSERVER_ROOT_MARGIN, threshold: 0 },
    );

    sections.forEach(({ element }) => observer.observe(element));
    return () => observer.disconnect();
  }, [isRootPage]);

  useEffect(() => {
    if (!isRootPage) return;

    const syncFromLocation = () => {
      const section = sectionFromHash(window.location.hash);
      if (section) setActiveSection(section);
    };

    syncFromLocation();
    window.addEventListener("hashchange", syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      window.removeEventListener("hashchange", syncFromLocation);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [isRootPage]);

  return [activeSection, setActiveSection] as const;
}

export function ProductNav({
  current,
  dark = false,
}: {
  current: ProductRoute;
  dark?: boolean;
}) {
  const pathname = usePathname();
  const isRootPage = pathname === "/";
  const [observedSection, setObservedSection] = useObservedSection(
    current,
    isRootPage,
  );
  const activeSection = isRootPage ? observedSection : current;

  return (
    <nav
      aria-label="Primary navigation"
      className="district-nav"
      data-theme={dark ? "dark" : "light"}
    >
      {APP_SECTION_ITEMS.map((item) => {
        const active = item.key === activeSection;
        return (
          <a
            key={item.key}
            href={item.href}
            aria-current={active ? "location" : undefined}
            className="district-nav__link"
            data-active={active ? "true" : "false"}
            onClick={() => {
              if (isRootPage) {
                setObservedSection(item.key);
              }
            }}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
