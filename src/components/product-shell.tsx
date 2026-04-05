import Link from "next/link";

type ProductRoute = "today" | "trends" | "body" | "settings";

type ProductShellProps = {
  current: ProductRoute;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

const NAV_ITEMS: Array<{
  key: ProductRoute;
  label: string;
  href: string;
}> = [
  { key: "today", label: "Today", href: "/" },
  { key: "trends", label: "Trends", href: "/trends" },
  { key: "body", label: "Body", href: "/body" },
  { key: "settings", label: "Settings", href: "/settings" },
];

export function ProductShell({
  current,
  eyebrow,
  title,
  description,
  children,
}: ProductShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(163,230,53,0.15),_transparent_28%),linear-gradient(180deg,_#eff4ed_0%,_#e8efe8_38%,_#dfe8e3_100%)] px-5 py-6 text-stone-950 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(155deg,_rgba(11,18,14,0.96)_0%,_rgba(21,34,27,0.95)_52%,_rgba(31,49,39,0.92)_100%)] px-6 py-6 text-white shadow-[0_24px_80px_rgba(42,58,38,0.18)] sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-lime-300">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300 sm:text-base">
                {description}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-2 backdrop-blur">
              <nav className="flex flex-wrap gap-2">
                {NAV_ITEMS.map((item) => {
                  const active = item.key === current;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                        active
                          ? "bg-white text-stone-950 shadow-[0_10px_28px_rgba(0,0,0,0.18)]"
                          : "text-stone-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}
