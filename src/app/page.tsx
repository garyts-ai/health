import { MasterDashboard } from "@/components/master-dashboard";
import { getSettingsBannerMessage } from "@/components/dashboard-sections";
import { hasDiscordWebhookUrl } from "@/lib/env";
import { getHevyConnectionStatus } from "@/lib/hevy/provider";
import { getDailySummary } from "@/lib/insights/engine";
import { getDiscordDeliveryStatus } from "@/lib/discord-delivery";
import { getWhoopConnectionStatus } from "@/lib/whoop/provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomePageProps = {
  searchParams?: Promise<{
    anatomy?: string;
    hevy?: string;
    intake?: string;
    import?: string;
    reason?: string;
    targets?: string;
    utilities?: string;
    whoop?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const [summary, whoopStatus, hevyStatus, deliveryStatus] = await Promise.all([
    getDailySummary(),
    getWhoopConnectionStatus(),
    getHevyConnectionStatus(),
    getDiscordDeliveryStatus(),
  ]);

  return (
    <MasterDashboard
      deliveryStatus={deliveryStatus}
      hevy={hevyStatus}
      isDiscordConfigured={hasDiscordWebhookUrl()}
      summary={summary}
      anatomyDebug={resolvedSearchParams.anatomy === "qa"}
      utilityBannerMessage={getSettingsBannerMessage(resolvedSearchParams)}
      whoop={whoopStatus}
      whoopImportReason={resolvedSearchParams.reason}
      whoopImportState={resolvedSearchParams.import}
    />
  );
}
