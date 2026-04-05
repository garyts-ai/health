"use client";

import { useState } from "react";

import { DailyBriefExport } from "@/components/daily-brief-export";
import type { HevyConnectionStatus } from "@/lib/hevy/types";
import type { DailySummary, DiscordDeliveryStatus } from "@/lib/insights/types";
import type { WhoopConnectionStatus } from "@/lib/whoop/types";

type ProtectedSettingsActionsProps = {
  adminActionsConfigured: boolean;
  deliveryStatus: DiscordDeliveryStatus;
  hevy: HevyConnectionStatus;
  isDiscordConfigured: boolean;
  summary: DailySummary;
  whoop: WhoopConnectionStatus;
};

const SESSION_STORAGE_KEY = "healthmaxer.adminActionSecret";

type ActionCard = {
  name: "WHOOP" | "Hevy";
  connected: boolean;
  isConfigured: boolean;
  isStale: boolean;
  lastSyncCompletedAt: string | null;
  lastSyncStatus: string | null;
  primaryHref: string | null;
  primaryLabel: string | null;
  statusNote: string;
  syncFormAction: string;
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getTone(card: ActionCard) {
  if (!card.isConfigured) {
    return {
      label: "Not configured",
      badgeClass: "bg-stone-700",
      cardClass: "border-stone-200 bg-stone-50/80",
    };
  }

  if (!card.connected) {
    return {
      label: "Needs attention",
      badgeClass: "bg-amber-500",
      cardClass: "border-amber-200 bg-amber-50/80",
    };
  }

  if (card.lastSyncStatus === "failed") {
    return {
      label: "Sync failed",
      badgeClass: "bg-rose-600",
      cardClass: "border-rose-200 bg-rose-50/80",
    };
  }

  if (card.isStale) {
    return {
      label: "Connected, stale",
      badgeClass: "bg-stone-700",
      cardClass: "border-stone-200 bg-stone-50/80",
    };
  }

  return {
    label: "Connected",
    badgeClass: "bg-lime-600",
    cardClass: "border-lime-200 bg-lime-50/80",
  };
}

export function ProtectedSettingsActions({
  adminActionsConfigured,
  deliveryStatus,
  hevy,
  isDiscordConfigured,
  summary,
  whoop,
}: ProtectedSettingsActionsProps) {
  const [adminSecret, setAdminSecret] = useState(() =>
    typeof window === "undefined" ? "" : window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "",
  );

  const updateAdminSecret = (value: string) => {
    setAdminSecret(value);

    if (value.trim()) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, value);
      return;
    }

    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const trimmedAdminSecret = adminSecret.trim();
  const actionsReady = adminActionsConfigured && trimmedAdminSecret.length > 0;

  const cards: ActionCard[] = [
    {
      name: "WHOOP",
      connected: whoop.connected,
      isConfigured: whoop.isConfigured,
      isStale: whoop.isStale,
      lastSyncCompletedAt: whoop.lastSyncCompletedAt,
      lastSyncStatus: whoop.lastSyncStatus,
      primaryHref: whoop.isConfigured ? "/api/auth/whoop" : null,
      primaryLabel: whoop.connected ? "Reconnect WHOOP" : "Connect WHOOP",
      statusNote: whoop.isConfigured
        ? "OAuth and sync stay available once WHOOP credentials are present."
        : "Add WHOOP credentials to enable connect and sync actions.",
      syncFormAction: "/api/whoop/sync",
    },
    {
      name: "Hevy",
      connected: hevy.connected,
      isConfigured: hevy.isConfigured,
      isStale: hevy.isStale,
      lastSyncCompletedAt: hevy.lastSyncCompletedAt,
      lastSyncStatus: hevy.lastSyncStatus,
      primaryHref: null,
      primaryLabel: null,
      statusNote: hevy.isConfigured
        ? "Sync uses the configured Hevy API key and writes fresh workouts locally."
        : "Add HEVY_API_KEY to enable sync.",
      syncFormAction: "/api/hevy/sync",
    },
  ];

  return (
    <>
      <section className="rounded-[1.6rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_55px_rgba(78,88,61,0.1)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Protected actions
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
              Admin secret
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Manual syncs and Discord delivery are gated behind a shared admin secret. The
              value only stays in this browser session and is never written into the app data.
            </p>
          </div>
          <div className="min-w-0 max-w-xl flex-1">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Current session secret
            </label>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 text-sm text-stone-900 outline-none transition focus:border-stone-950 focus:bg-white"
              type="password"
              value={adminSecret}
              onChange={(event) => updateAdminSecret(event.target.value)}
              placeholder="Enter ADMIN_ACTION_SECRET"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
        <p className="mt-4 text-sm text-stone-600">
          {!adminActionsConfigured
            ? "Add ADMIN_ACTION_SECRET to .env.local before using protected actions."
            : trimmedAdminSecret
              ? "Protected actions are armed for this browser session."
              : "Enter the admin secret to unlock manual sync and Discord send actions."}
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {cards.map((card) => {
          const tone = getTone(card);
          const canSync = actionsReady && card.isConfigured;

          return (
            <article
              key={card.name}
              className={`rounded-[1.6rem] border p-5 shadow-[0_18px_55px_rgba(78,88,61,0.08)] ${tone.cardClass}`}
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-stone-950">{card.name}</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white ${tone.badgeClass}`}
                >
                  {tone.label}
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-700">
                Last sync: {formatTimestamp(card.lastSyncCompletedAt)}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">{card.statusNote}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {card.primaryHref ? (
                  <a
                    className="inline-flex h-11 items-center justify-center rounded-full bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-stone-800"
                    href={card.primaryHref}
                  >
                    {card.primaryLabel}
                  </a>
                ) : (
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-full border border-stone-300 px-5 text-sm font-semibold text-stone-500"
                    type="button"
                    disabled
                  >
                    Configure {card.name}
                  </button>
                )}
                <form action={card.syncFormAction} method="post">
                  <input type="hidden" name="adminSecret" value={adminSecret} />
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-full border border-stone-300 px-5 text-sm font-semibold text-stone-800 transition hover:border-stone-950 hover:bg-white disabled:cursor-not-allowed disabled:text-stone-500 disabled:hover:border-stone-300 disabled:hover:bg-transparent"
                    type="submit"
                    disabled={!canSync}
                  >
                    Sync {card.name}
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </section>

      <DailyBriefExport
        adminActionsConfigured={adminActionsConfigured}
        adminSecret={adminSecret}
        deliveryStatus={deliveryStatus}
        isDiscordConfigured={isDiscordConfigured}
        summary={summary}
      />
    </>
  );
}
