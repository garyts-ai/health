"use client";

import { useSyncExternalStore } from "react";

import { DailyBriefExport } from "@/components/daily-brief-export";
import type { HevyConnectionStatus } from "@/lib/hevy/types";
import type { DailySummary, DiscordDeliveryStatus } from "@/lib/insights/types";
import type { WhoopConnectionStatus } from "@/lib/whoop/types";

type ProtectedSettingsActionsProps = {
  deliveryStatus: DiscordDeliveryStatus;
  hevy: HevyConnectionStatus;
  isDiscordConfigured: boolean;
  preview: React.ReactNode;
  summary: DailySummary;
  whoop: WhoopConnectionStatus;
};

type ActionCard = {
  name: "WHOOP" | "Hevy";
  connected: boolean;
  isConfigured: boolean;
  isStale: boolean;
  lastSyncCompletedAt: string | null;
  lastSyncStatus: string | null;
  primaryHref: string | null;
  primaryDisabledLabel: string;
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

function formatMealTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isLocalOAuthHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function subscribeToBrowserHost() {
  return () => {};
}

function getBrowserOAuthSnapshot() {
  return typeof window !== "undefined" && isLocalOAuthHost(window.location.hostname);
}

function getServerOAuthSnapshot() {
  return false;
}

function getTone(card: ActionCard) {
  if (!card.isConfigured) {
    return {
      label: "Not configured",
      badgeClass: "bg-[#756f8f] text-white",
      cardClass:
        "bg-[linear-gradient(180deg,_rgba(248,245,255,0.92)_0%,_rgba(255,255,255,0.84)_100%)] ring-[rgba(77,67,119,0.12)]",
    };
  }

  if (!card.connected) {
    return {
      label: "Needs attention",
      badgeClass: "bg-[#f4b38e] text-[#43251d]",
      cardClass:
        "bg-[linear-gradient(180deg,_rgba(255,244,240,0.94)_0%,_rgba(255,252,250,0.86)_100%)] ring-[rgba(194,118,83,0.14)]",
    };
  }

  if (card.lastSyncStatus === "failed") {
    return {
      label: "Sync failed",
      badgeClass: "bg-[#c85f6e] text-white",
      cardClass:
        "bg-[linear-gradient(180deg,_rgba(255,243,246,0.94)_0%,_rgba(255,252,253,0.88)_100%)] ring-[rgba(191,92,115,0.16)]",
    };
  }

  if (card.isStale) {
    return {
      label: "Connected, stale",
      badgeClass: "bg-[#5e5a74] text-white",
      cardClass:
        "bg-[linear-gradient(180deg,_rgba(245,242,252,0.94)_0%,_rgba(255,255,255,0.84)_100%)] ring-[rgba(112,104,151,0.14)]",
    };
  }

  return {
    label: "Connected",
    badgeClass: "bg-[#5f58a7] text-white",
    cardClass:
      "bg-[linear-gradient(180deg,_rgba(242,239,252,0.94)_0%,_rgba(255,255,255,0.84)_100%)] ring-[rgba(95,88,167,0.14)]",
  };
}

export function ProtectedSettingsActions({
  deliveryStatus,
  hevy,
  isDiscordConfigured,
  preview,
  summary,
  whoop,
}: ProtectedSettingsActionsProps) {
  const canUseWhoopOAuth = useSyncExternalStore(
    subscribeToBrowserHost,
    getBrowserOAuthSnapshot,
    getServerOAuthSnapshot,
  );

  const cards: ActionCard[] = [
    {
      name: "WHOOP",
      connected: whoop.connected,
      isConfigured: whoop.isConfigured,
      isStale: whoop.isStale,
      lastSyncCompletedAt: whoop.lastSyncCompletedAt,
      lastSyncStatus: whoop.lastSyncStatus,
      primaryHref: whoop.isConfigured && canUseWhoopOAuth ? "/api/auth/whoop" : null,
      primaryDisabledLabel: whoop.isConfigured ? "Reconnect on desktop" : "Configure WHOOP",
      primaryLabel: whoop.connected ? "Reconnect WHOOP" : "Connect WHOOP",
      statusNote: whoop.isConfigured
        ? canUseWhoopOAuth
          ? "OAuth reconnect is available from the local desktop URL. Mobile sync uses the stored token."
          : "Mobile sync uses the stored WHOOP token. Reconnect from localhost on the PC if OAuth needs renewal."
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
      primaryDisabledLabel: "Configure Hevy",
      primaryLabel: null,
      statusNote: hevy.isConfigured
        ? "Sync uses the configured Hevy API key and writes fresh workouts locally."
        : "Add HEVY_API_KEY to enable sync.",
      syncFormAction: "/api/hevy/sync",
    },
  ];

  return (
    <>
      <section className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.88)_0%,_rgba(255,255,255,0.82)_100%)] p-6 shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)]">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#19162a]">Manual controls</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#645c7d]">
              This install is running as a single-user local workspace, so manual sync and
              Discord delivery are available without an extra browser-only key step.
            </p>
          </div>

          <div className="min-w-0 rounded-[10px] border border-[rgba(77,67,119,0.12)] bg-white/70 p-4">
            <p className="text-sm font-medium text-[#4d4764]">Action state</p>
            <p className="mt-2 text-sm leading-6 text-[#645c7d]">
              Protected actions are live in this browser. Provider credentials still determine
              whether each sync or delivery endpoint is actually ready.
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-[#645c7d]">
          Sync buttons depend on provider configuration, and Discord send depends on the webhook
          being configured.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {cards.map((card) => {
          const tone = getTone(card);
          const canSync = card.isConfigured;

          return (
            <article
              key={card.name}
              className={`rounded-[12px] p-5 shadow-[0_10px_28px_rgba(22,20,35,0.08)] ring-1 ${tone.cardClass}`}
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#19162a]">{card.name}</h2>
                <span className={`rounded-[8px] px-3 py-1 text-xs font-semibold ${tone.badgeClass}`}>
                  {tone.label}
                </span>
              </div>
              <p className="mt-3 text-sm text-[#413b56]">
                Last sync: {formatTimestamp(card.lastSyncCompletedAt)}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#645c7d]">{card.statusNote}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {card.primaryHref ? (
                  <a
                    className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#19162a] px-4 text-sm font-semibold text-white transition hover:bg-[#2b2443]"
                    href={card.primaryHref}
                  >
                    {card.primaryLabel}
                  </a>
                ) : (
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[rgba(77,67,119,0.12)] bg-white/58 px-4 text-sm font-semibold text-[#8a84a4]"
                    type="button"
                    disabled
                  >
                    {card.primaryDisabledLabel}
                  </button>
                )}
                <form action={card.syncFormAction} method="post">
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[rgba(77,67,119,0.14)] bg-white/76 px-4 text-sm font-semibold text-[#312c49] transition hover:border-[#8f84c7] hover:bg-white disabled:cursor-not-allowed disabled:text-[#8a84a4] disabled:hover:border-[rgba(77,67,119,0.14)] disabled:hover:bg-white/76"
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

      <section className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.88)_0%,_rgba(255,255,255,0.82)_100%)] p-5 shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#19162a]">
              Quick intake
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#645c7d]">
              Log a meal from your phone. Targets stay separate from actual intake.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] bg-[rgba(77,67,119,0.12)] text-sm">
            <div className="bg-white/72 px-4 py-3">
              <div className="text-xs text-[#7b7492]">Calories</div>
              <div className="mt-1 font-semibold text-[#312c49]">
                {summary.nutritionActuals.calories}
                {summary.nutritionActuals.calorieTarget
                  ? ` / ${summary.nutritionActuals.calorieTarget}`
                  : ""}
              </div>
            </div>
            <div className="bg-white/72 px-4 py-3">
              <div className="text-xs text-[#7b7492]">Protein</div>
              <div className="mt-1 font-semibold text-[#312c49]">
                {summary.nutritionActuals.proteinG}g
                {summary.nutritionActuals.proteinTargetG
                  ? ` / ${summary.nutritionActuals.proteinTargetG}g`
                  : ""}
              </div>
            </div>
          </div>
        </div>

        <form
          action="/api/nutrition-intake"
          method="post"
          className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
        >
          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-[#4d4764]">Meal</span>
            <select
              className="mt-2 h-12 w-full rounded-[10px] border border-[#d8d1ec] bg-white px-3 text-base text-[#19162a] outline-none transition focus:border-[#8f84c7]"
              name="mealType"
              defaultValue="restaurant"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
              <option value="restaurant">Restaurant</option>
            </select>
          </label>
          <label className="block lg:col-span-4">
            <span className="text-sm font-medium text-[#4d4764]">Label</span>
            <input
              className="mt-2 h-12 w-full rounded-[10px] border border-[#d8d1ec] bg-white px-3 text-base text-[#19162a] outline-none transition focus:border-[#8f84c7]"
              name="label"
              placeholder="Chipotle bowl, sushi, burger..."
              type="text"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#4d4764]">Calories</span>
            <input
              className="mt-2 h-12 w-full rounded-[10px] border border-[#d8d1ec] bg-white px-3 text-base text-[#19162a] outline-none transition focus:border-[#8f84c7]"
              inputMode="numeric"
              min="0"
              name="calories"
              placeholder="650"
              required
              type="number"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#4d4764]">Protein</span>
            <input
              className="mt-2 h-12 w-full rounded-[10px] border border-[#d8d1ec] bg-white px-3 text-base text-[#19162a] outline-none transition focus:border-[#8f84c7]"
              inputMode="decimal"
              min="0"
              name="proteinG"
              placeholder="45"
              step="0.1"
              type="number"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#4d4764]">Carbs</span>
            <input
              className="mt-2 h-12 w-full rounded-[10px] border border-[#d8d1ec] bg-white px-3 text-base text-[#19162a] outline-none transition focus:border-[#8f84c7]"
              inputMode="decimal"
              min="0"
              name="carbsG"
              placeholder="70"
              step="0.1"
              type="number"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#4d4764]">Fat</span>
            <input
              className="mt-2 h-12 w-full rounded-[10px] border border-[#d8d1ec] bg-white px-3 text-base text-[#19162a] outline-none transition focus:border-[#8f84c7]"
              inputMode="decimal"
              min="0"
              name="fatG"
              placeholder="20"
              step="0.1"
              type="number"
            />
          </label>
          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-[#4d4764]">Note</span>
            <input
              className="mt-2 h-12 w-full rounded-[10px] border border-[#d8d1ec] bg-white px-3 text-base text-[#19162a] outline-none transition focus:border-[#8f84c7]"
              name="note"
              placeholder="optional"
              type="text"
            />
          </label>
          <div className="flex items-end">
            <button
              className="inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-[#19162a] px-4 text-sm font-semibold text-white transition hover:bg-[#2b2443]"
              type="submit"
            >
              Log meal
            </button>
          </div>
        </form>

        <div className="mt-5">
          {summary.nutritionActuals.entries.length > 0 ? (
            <div className="divide-y divide-[rgba(121,110,159,0.12)] overflow-hidden rounded-[10px] border border-[rgba(77,67,119,0.12)] bg-white/62">
              {summary.nutritionActuals.entries.slice(0, 6).map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-[#312c49]">{entry.label}</span>
                      <span className="text-xs text-[#7b7492]">
                        {entry.mealType} at {formatMealTime(entry.loggedAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[#645c7d]">
                      {entry.calories} cal / {entry.proteinG}g protein / {entry.carbsG}g carbs / {entry.fatG}g fat
                    </div>
                  </div>
                  <form action="/api/nutrition-intake/delete" method="post">
                    <input name="id" type="hidden" value={entry.id} />
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-[8px] border border-[#d8d1ec] bg-white px-3 text-xs font-semibold text-[#5f5874] transition hover:border-[#bdb2e0] hover:bg-[#faf8ff]"
                      type="submit"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-[rgba(77,67,119,0.18)] bg-white/46 px-4 py-4 text-sm leading-6 text-[#645c7d]">
              No meals logged today. Targets are active, but intake is intentionally empty until you log something.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.88)_0%,_rgba(255,255,255,0.82)_100%)] p-6 shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)]">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#19162a]">
              Nutrition targets
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#645c7d]">
              Smart targets come from body weight, weekly lifting, set volume, and short-term
              weight trend. You can save them as your manual baseline or override them.
            </p>
          </div>

          <div className="rounded-[10px] border border-[rgba(77,67,119,0.12)] bg-white/70 p-4 text-sm text-[#4d4764]">
            <div className="font-medium text-[#312c49]">Active target</div>
            <div className="mt-2">
              Calories:{" "}
              <span className="font-semibold">
                {summary.nutritionTargets.effectiveCalorieTarget ?? "not set"}
              </span>
            </div>
            <div className="mt-1">
              Protein:{" "}
              <span className="font-semibold">
                {summary.nutritionTargets.effectiveProteinTargetG
                  ? `${summary.nutritionTargets.effectiveProteinTargetG}g`
                  : "not set"}
              </span>
            </div>
            <div className="mt-2 text-xs text-[#7b7492]">
              Source: {summary.nutritionTargets.targetSource}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[10px] border border-[rgba(77,67,119,0.12)] bg-white/58 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-[#312c49]">Smart suggestion</div>
              <div className="mt-1 text-sm text-[#645c7d]">
                {summary.nutritionTargets.smartCalorieTarget
                  ? `${summary.nutritionTargets.smartCalorieTarget} calories / ${summary.nutritionTargets.smartProteinTargetG}g protein`
                  : "Not available yet"}
              </div>
              <div className="mt-1 text-xs leading-5 text-[#7b7492]">
                {summary.nutritionTargets.smartReason}
              </div>
            </div>
            <form action="/api/nutrition-targets" method="post">
              <input
                name="calorieTarget"
                type="hidden"
                value={summary.nutritionTargets.smartCalorieTarget ?? ""}
              />
              <input
                name="proteinTargetG"
                type="hidden"
                value={summary.nutritionTargets.smartProteinTargetG ?? ""}
              />
              <button
                className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#d8d1ec] bg-white px-4 text-sm font-semibold text-[#312c49] transition hover:border-[#8f84c7] hover:bg-[#faf8ff] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  summary.nutritionTargets.smartCalorieTarget === null ||
                  summary.nutritionTargets.smartProteinTargetG === null
                }
                type="submit"
              >
                Use smart targets
              </button>
            </form>
          </div>
        </div>

        <form action="/api/nutrition-targets" method="post" className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="text-sm font-medium text-[#4d4764]">Calories</span>
            <input
              className="mt-2 h-11 w-full rounded-[10px] border border-[#d8d1ec] bg-white px-3 text-sm text-[#19162a] outline-none transition focus:border-[#8f84c7]"
              defaultValue={summary.nutritionTargets.calorieTarget ?? ""}
              inputMode="numeric"
              min="1"
              name="calorieTarget"
              placeholder={summary.nutritionTargets.smartCalorieTarget?.toString() ?? "2500"}
              type="number"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#4d4764]">Protein grams</span>
            <input
              className="mt-2 h-11 w-full rounded-[10px] border border-[#d8d1ec] bg-white px-3 text-sm text-[#19162a] outline-none transition focus:border-[#8f84c7]"
              defaultValue={summary.nutritionTargets.proteinTargetG ?? ""}
              inputMode="numeric"
              min="1"
              name="proteinTargetG"
              placeholder={summary.nutritionTargets.smartProteinTargetG?.toString() ?? "150"}
              type="number"
            />
          </label>
          <button
            className="inline-flex h-11 items-center justify-center rounded-[10px] bg-[#19162a] px-4 text-sm font-semibold text-white transition hover:bg-[#2b2443]"
            type="submit"
          >
            Save targets
          </button>
        </form>
      </section>

      <DailyBriefExport
        deliveryStatus={deliveryStatus}
        isDiscordConfigured={isDiscordConfigured}
        preview={preview}
        summary={summary}
      />
    </>
  );
}
