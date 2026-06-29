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
    <main className="min-h-screen overflow-x-hidden bg-[#100b1e] px-4 py-4 text-[#171329] sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,_#100b1e_0%,_#171126_42%,_#f3eff8_42%,_#f3eff8_100%)]" />
      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-4 text-white md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-[13px] font-medium text-white/58">{eyebrow}</p>
              <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{title}</h1>
            </div>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-white/62">{description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <ProductNav current={current} dark />
            {utility}
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}
