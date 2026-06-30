import Link from "next/link";

export type ProductRoute = "today" | "weekly" | "whoop";

const items: Array<{ key: ProductRoute; label: string; href: string }> = [
  { key: "today", label: "Today", href: "/" },
  { key: "weekly", label: "Weekly", href: "/weekly" },
  { key: "whoop", label: "WHOOP", href: "/whoop" },
];

export function ProductNav({
  current,
  dark = false,
}: {
  current: ProductRoute;
  dark?: boolean;
}) {
  return (
    <nav aria-label="Primary navigation" className="flex flex-wrap items-center gap-1">
      {items.map((item) => {
        const active = item.key === current;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`group relative inline-flex h-10 items-center border-b-2 px-3.5 text-[12px] font-semibold uppercase tracking-[0.11em] transition-all ${
              active
                ? dark
                  ? "border-[#39f8ff] text-white drop-shadow-[0_0_16px_rgba(57,248,255,0.7)]"
                  : "border-[#4f3b93] text-[#171329]"
                : dark
                  ? "border-transparent text-white/60 hover:border-[#39f8ff]/60 hover:text-white"
                  : "border-transparent text-[#6d6785] hover:text-[#171329]"
            }`}
          >
            {dark && active ? (
              <span className="pointer-events-none absolute inset-x-2 bottom-0 h-px bg-[#39f8ff] shadow-[0_0_18px_rgba(57,248,255,0.96)]" />
            ) : null}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
