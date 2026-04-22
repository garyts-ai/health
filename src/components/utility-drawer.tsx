"use client";

import { useCallback, useEffect } from "react";
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
  const open = searchParams.get("utilities") === "open";

  const setDrawerState = useCallback((nextOpen: boolean) => {
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
        <button
          type="button"
          onClick={() => setDrawerState(true)}
          className="inline-flex h-11 items-center gap-3 rounded-[10px] border border-white/14 bg-[rgba(20,14,38,0.18)] px-4 text-sm font-medium text-white transition hover:border-white/28 hover:bg-[rgba(20,14,38,0.28)]"
        >
        <span className="block h-2 w-2 rounded-full bg-[#ff8d72]" />
        <span>Utilities</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close utilities"
            className="absolute inset-0 bg-[rgba(18,14,31,0.56)]"
            onClick={() => setDrawerState(false)}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-[42rem] overflow-y-auto border-l border-[#dad4eb] bg-[#f6f3fb] shadow-[-18px_0_72px_rgba(18,14,30,0.22)]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e7e2f2] bg-[#f6f3fb]/96 px-6 py-5 backdrop-blur">
              <div>
                <h2 className="text-xl font-semibold text-[#19162a]">Utilities</h2>
                <p className="mt-1 text-sm text-[#645c7d]">{utilityLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerState(false)}
                className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#d8d1ec] bg-white px-3 text-sm font-medium text-[#2a2540] transition hover:border-[#bdb2e0] hover:bg-[#faf8ff]"
              >
                Close
              </button>
            </div>

            <div className="px-6 py-6">
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
