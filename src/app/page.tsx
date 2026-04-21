import { MasterDashboard } from "@/components/master-dashboard";
import { getSettingsBannerMessage } from "@/components/dashboard-sections";
import { hasDiscordWebhookUrl } from "@/lib/env";
import { getHevyConnectionStatus } from "@/lib/hevy/provider";
import { getDailySummary } from "@/lib/insights/engine";
import { getDiscordDeliveryStatus } from "@/lib/discord-delivery";
import { getWhoopConnectionStatus } from "@/lib/whoop/provider";

type HomePageProps = {
  searchParams?: Promise<{
    hevy?: string;
    targets?: string;
    utilities?: string;
    whoop?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const summary = getDailySummary();
  const whoopStatus = getWhoopConnectionStatus();
  const hevyStatus = getHevyConnectionStatus();
  const deliveryStatus = getDiscordDeliveryStatus();

  return (
    <MasterDashboard
      deliveryStatus={deliveryStatus}
      hevy={hevyStatus}
      isDiscordConfigured={hasDiscordWebhookUrl()}
      summary={summary}
      utilityBannerMessage={getSettingsBannerMessage(resolvedSearchParams)}
      whoop={whoopStatus}
    />
  );
}
