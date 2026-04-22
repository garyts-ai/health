import type { DatabaseSync } from "node:sqlite";

import { applySchema, getDb } from "@/lib/db";
import { buildDiscordSummaryText, createDailyBriefImage } from "@/lib/daily-brief";
import { getDiscordWebhookUrl } from "@/lib/env";
import { getDailySummary } from "@/lib/insights/engine";
import type {
  DiscordDeliveryStatus,
  DiscordDeliveryTrigger,
  DiscordDeliveryRunStatus,
} from "@/lib/insights/types";

type DeliveryRow = {
  id: number;
  date_key: string;
  summary_date: string;
  trigger_source: DiscordDeliveryTrigger;
  status: DiscordDeliveryRunStatus;
  sent_at: string;
  error_message: string | null;
  created_at: string;
};

type SendDailyBriefOptions = {
  db?: DatabaseSync;
  webhookUrl?: string;
  contentOverride?: string;
  imageBuffer?: Buffer;
  imageFilename?: string;
};

const NEW_YORK_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getDiscordDateKey(isoDate = new Date().toISOString()) {
  return NEW_YORK_DATE.format(new Date(isoDate));
}

function getDeliveryDb(db?: DatabaseSync) {
  const resolvedDb = db ?? getDb();
  applySchema(resolvedDb);
  return resolvedDb;
}

function getWebhookUrl(webhookUrlOverride?: string) {
  const webhookUrl = webhookUrlOverride ?? getDiscordWebhookUrl();

  if (!/^https:\/\/(canary\.|ptb\.)?discord\.com\/api\/webhooks\//.test(webhookUrl)) {
    throw new Error("DISCORD_WEBHOOK_URL does not look like a valid Discord webhook URL.");
  }

  return webhookUrl;
}

export function recordDiscordDeliveryRun(
  input: {
    dateKey: string;
    summaryDate: string;
    triggerSource: DiscordDeliveryTrigger;
    status: DiscordDeliveryRunStatus;
    sentAt?: string;
    errorMessage?: string | null;
  },
  db?: DatabaseSync,
) {
  const resolvedDb = getDeliveryDb(db);
  const sentAt = input.sentAt ?? new Date().toISOString();

  resolvedDb
    .prepare(
      `
        INSERT INTO discord_delivery_runs (
          date_key,
          summary_date,
          trigger_source,
          status,
          sent_at,
          error_message,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      input.dateKey,
      input.summaryDate,
      input.triggerSource,
      input.status,
      sentAt,
      input.errorMessage ?? null,
      sentAt,
    );
}

export function hasSuccessfulDiscordDeliveryForDate(dateKey: string, db?: DatabaseSync) {
  const resolvedDb = getDeliveryDb(db);
  const row = resolvedDb
    .prepare(
      `
        SELECT 1
        FROM discord_delivery_runs
        WHERE date_key = ? AND status = 'success'
        LIMIT 1
      `,
    )
    .get(dateKey) as { 1: number } | undefined;

  return Boolean(row);
}

export function getDiscordDeliveryStatus(
  db?: DatabaseSync,
  todayDateKey = getDiscordDateKey(),
): DiscordDeliveryStatus {
  const resolvedDb = getDeliveryDb(db);

  const latestToday = resolvedDb
    .prepare(
      `
        SELECT *
        FROM discord_delivery_runs
        WHERE date_key = ?
        ORDER BY sent_at DESC, id DESC
        LIMIT 1
      `,
    )
    .get(todayDateKey) as DeliveryRow | undefined;

  const latestSuccess = resolvedDb
    .prepare(
      `
        SELECT *
        FROM discord_delivery_runs
        WHERE status = 'success'
        ORDER BY sent_at DESC, id DESC
        LIMIT 1
      `,
    )
    .get() as DeliveryRow | undefined;

  const scheduledSuccessToday = resolvedDb
    .prepare(
      `
        SELECT *
        FROM discord_delivery_runs
        WHERE date_key = ? AND trigger_source = 'scheduled' AND status = 'success'
        ORDER BY sent_at DESC, id DESC
        LIMIT 1
      `,
    )
    .get(todayDateKey) as DeliveryRow | undefined;

  return {
    today: {
      dateKey: todayDateKey,
      lastStatus: latestToday?.status ?? null,
      lastTrigger: latestToday?.trigger_source ?? null,
      lastSentAt: latestToday?.sent_at ?? null,
      lastErrorMessage: latestToday?.error_message ?? null,
      hasSuccessfulSend: hasSuccessfulDiscordDeliveryForDate(todayDateKey, resolvedDb),
      scheduledSentAt: scheduledSuccessToday?.sent_at ?? null,
    },
    latestSuccessfulSendAt: latestSuccess?.sent_at ?? null,
  };
}

export async function sendDailyBriefToDiscord(
  trigger: DiscordDeliveryTrigger,
  options: SendDailyBriefOptions = {},
) {
  const db = getDeliveryDb(options.db);
  const summary = getDailySummary();
  const dateKey = getDiscordDateKey(summary.date);

  if (trigger === "scheduled" && hasSuccessfulDiscordDeliveryForDate(dateKey, db)) {
    recordDiscordDeliveryRun(
      {
        dateKey,
        summaryDate: summary.date,
        triggerSource: trigger,
        status: "skipped",
        errorMessage: "Skipped because today's brief was already sent successfully.",
      },
      db,
    );

    return {
      ok: true,
      status: "skipped" as const,
      message: "Skipped scheduled send because today's brief was already sent.",
    };
  }

  try {
    const webhookUrl = getWebhookUrl(options.webhookUrl);
    const imageBuffer =
      options.imageBuffer ??
      Buffer.from(await (await createDailyBriefImage(summary)).arrayBuffer());
    const formData = new FormData();

    formData.append(
      "payload_json",
      JSON.stringify({
        content: options.contentOverride ?? buildDiscordSummaryText(summary),
        username: "Health Dashboard",
        allowed_mentions: { parse: [] },
      }),
    );
    formData.append(
      "files[0]",
      new Blob([new Uint8Array(imageBuffer)], { type: "image/png" }),
      options.imageFilename ?? `daily-health-brief-${dateKey}.png`,
    );

    const response = await fetch(webhookUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const message = `Discord rejected the message (${response.status}). ${errorText || "Please try again."}`;

      recordDiscordDeliveryRun(
        {
          dateKey,
          summaryDate: summary.date,
          triggerSource: trigger,
          status: "failed",
          errorMessage: message,
        },
        db,
      );

      return {
        ok: false,
        status: "failed" as const,
        message,
      };
    }

    recordDiscordDeliveryRun(
      {
        dateKey,
        summaryDate: summary.date,
        triggerSource: trigger,
        status: "success",
      },
      db,
    );

    return {
      ok: true,
      status: "success" as const,
      message:
        trigger === "scheduled"
          ? "Scheduled daily brief sent to Discord."
          : "Daily brief sent to Discord.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send the daily brief to Discord.";

    recordDiscordDeliveryRun(
      {
        dateKey,
        summaryDate: summary.date,
        triggerSource: trigger,
        status: "failed",
        errorMessage: message,
      },
      db,
    );

    return {
      ok: false,
      status: "failed" as const,
      message,
    };
  }
}
