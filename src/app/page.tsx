import { MasterDashboard } from "@/components/master-dashboard";
import { getSettingsBannerMessage } from "@/lib/settings-banner";
import { getHevyConnectionStatus } from "@/lib/hevy/provider";
import { getDailySummary } from "@/lib/insights/engine";
import { getWhoopConnectionStatus } from "@/lib/whoop/provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomePageProps = {
  searchParams?: Promise<{
    anatomy?: string;
    hevy?: string;
    import?: string;
    reason?: string;
    utilities?: string;
    whoop?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const hasProviderStatus = Boolean(resolvedSearchParams.whoop || resolvedSearchParams.hevy);
  const [summary, whoopStatus, hevyStatus] = await Promise.all([
    getDailySummary(),
    getWhoopConnectionStatus(),
    getHevyConnectionStatus(),
  ]);

  return (
    <MasterDashboard
      hevy={hevyStatus}
      summary={summary}
      anatomyDebug={resolvedSearchParams.anatomy === "qa"}
      utilityBannerMessage={hasProviderStatus ? null : getSettingsBannerMessage(resolvedSearchParams)}
      syncStatus={{ whoop: resolvedSearchParams.whoop, hevy: resolvedSearchParams.hevy }}
      whoop={whoopStatus}
      whoopImportReason={resolvedSearchParams.reason}
      whoopImportState={resolvedSearchParams.import}
    />
  );
}
