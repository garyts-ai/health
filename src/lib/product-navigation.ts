export const APP_SECTIONS = ["today", "weekly", "whoop", "utilities"] as const;

export type AppSection = (typeof APP_SECTIONS)[number];

export const APP_SECTION_ITEMS: ReadonlyArray<{
  key: AppSection;
  label: string;
  href: `#${AppSection}`;
}> = [
  { key: "today", label: "Today", href: "#today" },
  { key: "weekly", label: "Weekly", href: "#weekly" },
  { key: "whoop", label: "WHOOP", href: "#whoop" },
  { key: "utilities", label: "Utilities", href: "#utilities" },
];

export function isAppSection(value: string): value is AppSection {
  return (APP_SECTIONS as readonly string[]).includes(value);
}

export function sectionFromHash(hash: string): AppSection | null {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  return isAppSection(value) ? value : null;
}

export function urlForSection(currentUrl: string, section: AppSection): string {
  const url = new URL(currentUrl);
  url.hash = section;
  return `${url.pathname}${url.search}${url.hash}`;
}

export type LegacySearchParamValue = string | string[] | undefined;

export function legacySectionUrl(
  section: AppSection,
  searchParams: Record<string, LegacySearchParamValue> = {},
  defaults: Record<string, string> = {},
): string {
  const params = new URLSearchParams(defaults);

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      params.delete(key);
      value.forEach((entry) => params.append(key, entry));
    } else {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return `/${query ? `?${query}` : ""}#${section}`;
}
