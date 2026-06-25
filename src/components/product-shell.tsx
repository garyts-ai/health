import { ProductNav, type ProductRoute } from "@/components/product-nav";

type ProductShellProps = {
  current: ProductRoute;
  eyebrow: string;
  title: string;
  description: string;
  utility?: React.ReactNode;
  children: React.ReactNode;
};

export function ProductShell({
  current,
  eyebrow,
  title,
  description,
  utility,
  children,
}: ProductShellProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f2fb] px-5 py-6 text-[#171329] sm:px-8 lg:px-12">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(253,132,122,0.42),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(93,92,186,0.4),_transparent_28%),linear-gradient(180deg,_#766db9_0%,_#5d54a3_14%,_#f5f2fb_52%)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-5 rounded-[12px] bg-[rgba(247,244,255,0.18)] px-1 py-1 sm:px-2">
          <div
            data-premium-surface
            data-premium-tone="dark"
            data-premium-enter
            className="flex flex-col gap-5 rounded-[12px] bg-[linear-gradient(180deg,_rgba(32,24,71,0.96)_0%,_rgba(70,60,133,0.9)_100%)] px-6 py-6 text-white shadow-[0_20px_60px_rgba(31,24,61,0.18)] ring-1 ring-white/10 sm:px-8"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-medium text-white/68">{eyebrow}</p>
                <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/72 sm:text-base">
                  {description}
                </p>
              </div>

              <div className="flex flex-col items-end gap-3">
                <ProductNav current={current} dark />
                {utility}
              </div>
            </div>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}
