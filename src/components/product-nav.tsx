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
    <nav aria-label="Primary navigation" className="flex flex-wrap gap-1">
      {items.map((item) => {
        const active = item.key === current;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-9 items-center border-b-2 px-3 text-sm font-medium transition-colors ${
              active
                ? dark
                  ? "border-[#71fff1] text-white"
                  : "border-[#4f3b93] text-[#171329]"
                : dark
                  ? "border-transparent text-white/62 hover:text-white"
                  : "border-transparent text-[#6d6785] hover:text-[#171329]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
