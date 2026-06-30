"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ProtectedSettingsActions } from "@/components/protected-settings-actions";
import type { HevyConnectionStatus } from "@/lib/hevy/types";
import type { DailySummary, DiscordDeliveryStatus } from "@/lib/insights/types";
import type { WhoopConnectionStatus } from "@/lib/whoop/types";

type UtilityDrawerProps = {
  deliveryStatus: DiscordDeliveryStatus;
  hevy: HevyConnectionStatus;
  isDiscordConfigured: boolean;
  preview: React.ReactNode;
  summary: DailySummary;
  utilityLabel: string;
  whoop: WhoopConnectionStatus;
};

export function UtilityDrawer({
  deliveryStatus,
  hevy,
  isDiscordConfigured,
  preview,
  summary,
  utilityLabel,
  whoop,
}: UtilityDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlOpen = searchParams.get("utilities") === "open";
  const [open, setOpen] = useState(urlOpen);
  const openParams = new URLSearchParams(searchParams.toString());
  openParams.set("utilities", "open");
  const openHref = `${pathname}?${openParams.toString()}`;
  const closeParams = new URLSearchParams(searchParams.toString());
  closeParams.delete("utilities");
  const closeQuery = closeParams.toString();
  const closeHref = closeQuery ? `${pathname}?${closeQuery}` : pathname;

  useEffect(() => {
    setOpen(urlOpen);
  }, [urlOpen]);

  const setDrawerState = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextOpen) {
      nextParams.set("utilities", "open");
    } else {
      nextParams.delete("utilities");
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerState(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setDrawerState]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Link
        href={openHref}
        className="hud-chip hud-chip-coral inline-flex h-10 items-center gap-2 px-3.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white shadow-[0_0_24px_rgba(255,159,28,0.18)] transition hover:translate-y-[-1px] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39f8ff]"
      >
        <span className="grid h-4 w-4 place-items-center text-[#39f8ff]" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-[#ff9f1c] shadow-[0_0_16px_rgba(255,159,28,1)]" />
        </span>
        <span>Utilities</span>
      </Link>

      {open ? (
            <div className="fixed inset-0 z-50 min-h-dvh">
              <Link
                href={closeHref}
                aria-label="Close utilities"
                className="absolute inset-0 bg-[#020711]/78"
              />

              <aside className="absolute right-0 top-0 h-dvh w-full overflow-y-auto border-l border-[#39f8ff]/26 bg-[#06101c] text-white shadow-[-24px_0_80px_rgba(0,190,255,0.16)] sm:max-w-[40rem]">
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#39f8ff]/18 bg-[#06101c]/96 px-4 py-3 backdrop-blur sm:px-5">
                  <div>
                    <p className="hud-micro-label text-[#39f8ff]">Command drawer</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">Utilities</h2>
                    <p className="mt-0.5 text-[13px] text-white/62">{utilityLabel}</p>
                  </div>
                  <Link
                    href={closeHref}
                    className="inline-flex h-9 items-center justify-center border border-[#39f8ff]/24 bg-white/[0.04] px-3 text-sm font-medium text-white transition hover:border-[#39f8ff]/60 hover:bg-white/[0.08]"
                  >
                    Close
                  </Link>
                </div>

                <div className="px-4 py-4 sm:px-5">
                  <ProtectedSettingsActions
                    deliveryStatus={deliveryStatus}
                    hevy={hevy}
                    isDiscordConfigured={isDiscordConfigured}
                    preview={preview}
                    summary={summary}
                    whoop={whoop}
                  />
                </div>
              </aside>
            </div>
          ) : null}
    </>
  );
}
