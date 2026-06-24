import { DailyBriefPreviewCard } from "@/components/daily-brief-preview-card";
import { UtilityDrawer } from "@/components/utility-drawer";
import { getDiscordDeliveryStatus } from "@/lib/discord-delivery";
import { hasDiscordWebhookUrl } from "@/lib/env";
import { getHevyConnectionStatus } from "@/lib/hevy/provider";
import type { DailySummary } from "@/lib/insights/types";
import { getWhoopConnectionStatus } from "@/lib/whoop/provider";

export async function UtilityAccess({ summary }: { summary: DailySummary }) {
  const [whoop, hevy, deliveryStatus] = await Promise.all([
    getWhoopConnectionStatus(),
    getHevyConnectionStatus(),
    getDiscordDeliveryStatus(),
  ]);
  const issues = [whoop, hevy].filter((item) => !item.connected || item.isStale).length;
  const utilityLabel = issues ? `${issues} connection${issues === 1 ? "" : "s"} need attention` : "Connections healthy";

  return (
    <UtilityDrawer
      deliveryStatus={deliveryStatus}
      hevy={hevy}
      isDiscordConfigured={hasDiscordWebhookUrl()}
      preview={<DailyBriefPreviewCard deliveryStatus={deliveryStatus} summary={summary} />}
      summary={summary}
      utilityLabel={utilityLabel}
      whoop={whoop}
    />
  );
}
