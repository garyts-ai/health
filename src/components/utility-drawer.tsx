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
        className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-white/14 bg-white/5 px-3 text-sm font-medium text-white transition hover:border-white/28 hover:bg-white/10"
      >
        <span className="block h-1.5 w-1.5 rounded-full bg-[#ff8d72]" />
        <span>Utilities</span>
      </Link>

      {open ? (
            <div className="fixed inset-0 z-50 min-h-dvh">
              <Link
                href={closeHref}
                aria-label="Close utilities"
                className="absolute inset-0 bg-[rgba(18,14,31,0.56)]"
              />

              <aside className="absolute right-0 top-0 h-dvh w-full overflow-y-auto border-l border-[#dad4eb] bg-[#f6f3fb] shadow-[-8px_0_28px_rgba(18,14,30,0.18)] sm:max-w-[40rem]">
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e7e2f2] bg-[#f6f3fb]/96 px-4 py-3 backdrop-blur sm:px-5">
                  <div>
                    <h2 className="text-lg font-semibold text-[#19162a]">Utilities</h2>
                    <p className="mt-0.5 text-[13px] text-[#645c7d]">{utilityLabel}</p>
                  </div>
                  <Link
                    href={closeHref}
                    className="inline-flex h-9 items-center justify-center rounded-[8px] border border-[#d8d1ec] bg-white px-3 text-sm font-medium text-[#2a2540] transition hover:border-[#bdb2e0] hover:bg-[#faf8ff]"
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
