import {
  SummaryBanner,
  getSettingsBannerMessage,
} from "@/components/dashboard-sections";
import { ProtectedSettingsActions } from "@/components/protected-settings-actions";
import { ProductShell } from "@/components/product-shell";
import { getDiscordDeliveryStatus } from "@/lib/discord-delivery";
import { hasAdminActionSecret, hasDiscordWebhookUrl } from "@/lib/env";
import { getHevyConnectionStatus } from "@/lib/hevy/provider";
import { getDailySummary } from "@/lib/insights/engine";
import { getWhoopConnectionStatus } from "@/lib/whoop/provider";

type SettingsPageProps = {
  searchParams?: Promise<{
    whoop?: string;
    hevy?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const summary = getDailySummary();
  const whoopStatus = getWhoopConnectionStatus();
  const hevyStatus = getHevyConnectionStatus();
  const deliveryStatus = getDiscordDeliveryStatus();
  const adminActionsConfigured = hasAdminActionSecret();
  const discordConfigured = hasDiscordWebhookUrl();
  const bannerMessage = getSettingsBannerMessage(resolvedSearchParams);

  return (
    <ProductShell
      current="settings"
      eyebrow="Health OS"
      title="Settings"
      description="This is the maintenance layer: provider health, sync controls, Discord delivery, and export tools. It stays out of the way until you need it."
    >
      {bannerMessage ? <SummaryBanner message={bannerMessage} /> : null}

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[1.6rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_55px_rgba(78,88,61,0.1)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Connection overview
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
            Provider health
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            WHOOP and Hevy are the two live inputs that shape the daily summary. If this page is green, the rest of the product is working from recent data.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm font-semibold text-stone-700">
              WHOOP {whoopStatus.connected ? "connected" : "disconnected"}
            </span>
            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm font-semibold text-stone-700">
              Hevy {hevyStatus.connected ? "connected" : "disconnected"}
            </span>
            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm font-semibold text-stone-700">
              Discord {deliveryStatus.today.hasSuccessfulSend ? "delivering" : "ready"}
            </span>
          </div>
        </article>

        <article className="rounded-[1.6rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_55px_rgba(78,88,61,0.1)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Delivery system
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
            Discord brief
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Manual send remains the most reliable mode right now. The export panel below uses the same structured daily summary that powers the product itself.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.1rem] border border-stone-200 bg-stone-50/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Today
              </p>
              <p className="mt-2 text-lg font-semibold text-stone-950">
                {deliveryStatus.today.lastStatus
                  ? `${deliveryStatus.today.lastStatus} via ${deliveryStatus.today.lastTrigger}`
                  : "Not sent yet"}
              </p>
            </div>
            <div className="rounded-[1.1rem] border border-stone-200 bg-stone-50/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Latest success
              </p>
              <p className="mt-2 text-lg font-semibold text-stone-950">
                {deliveryStatus.latestSuccessfulSendAt
                  ? new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(deliveryStatus.latestSuccessfulSendAt))
                  : "Not yet"}
              </p>
            </div>
          </div>
        </article>
      </section>

      <ProtectedSettingsActions
        adminActionsConfigured={adminActionsConfigured}
        deliveryStatus={deliveryStatus}
        hevy={hevyStatus}
        isDiscordConfigured={discordConfigured}
        summary={summary}
        whoop={whoopStatus}
      />
    </ProductShell>
  );
}
