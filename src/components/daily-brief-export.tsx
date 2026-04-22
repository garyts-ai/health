"use client";

import { toPng } from "html-to-image";
import { useRef, useState, useTransition } from "react";

import { buildLlmHandoff } from "@/lib/daily-brief-shared";
import type { DailySummary, DiscordDeliveryStatus } from "@/lib/insights/types";

type DailyBriefExportProps = {
  deliveryStatus: DiscordDeliveryStatus;
  isDiscordConfigured: boolean;
  preview: React.ReactNode;
  summary: DailySummary;
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

export function DailyBriefExport({
  deliveryStatus,
  isDiscordConfigured,
  preview,
  summary,
}: DailyBriefExportProps) {
  const visibleCardRef = useRef<HTMLDivElement>(null);
  const captureCardRef = useRef<HTMLDivElement>(null);
  const handoff = buildLlmHandoff(summary);
  const [copied, setCopied] = useState(false);
  const [sendState, setSendState] = useState<{
    kind: "idle" | "success" | "error";
    message: string | null;
  }>({
    kind: "idle",
    message: null,
  });
  const [isPending, startTransition] = useTransition();
  const canSendToDiscord = isDiscordConfigured;

  const renderPreviewPng = async () => {
    const target = captureCardRef.current ?? visibleCardRef.current;
    if (!target) {
      return null;
    }

    return toPng(target, {
      cacheBust: true,
      pixelRatio: 2,
    });
  };

  const handleDownload = () => {
    startTransition(async () => {
      const dataUrl = await renderPreviewPng();
      if (!dataUrl) {
        return;
      }
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `daily-health-brief-${summary.date.slice(0, 10)}.png`;
      link.click();
    });
  };

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(handoff.promptText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleSendToDiscord = () => {
    if (!canSendToDiscord) {
      setSendState({
        kind: "error",
        message: "Add DISCORD_WEBHOOK_URL to enable Discord sends.",
      });
      return;
    }

    startTransition(async () => {
      setSendState({ kind: "idle", message: null });

      try {
        const dataUrl = await renderPreviewPng();
        if (!dataUrl) {
          setSendState({
            kind: "error",
            message: "Preview is not ready yet. Try again in a moment.",
          });
          return;
        }
        const imageBlob = await fetch(dataUrl).then((response) => response.blob());
        const formData = new FormData();
        formData.append("image", imageBlob, `daily-health-brief-${summary.date.slice(0, 10)}.png`);

        const response = await fetch("/api/discord/daily-brief", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as {
          ok: boolean;
          message?: string;
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          setSendState({
            kind: "error",
            message: payload.error ?? "Discord send failed.",
          });
          return;
        }

        setSendState({
          kind: "success",
          message: payload.message ?? "Daily brief sent to Discord.",
        });
      } catch {
        setSendState({
          kind: "error",
          message: "Discord send failed. Check the webhook and try again.",
        });
      }
    });
  };

  return (
    <section className="rounded-[12px] bg-[linear-gradient(180deg,_rgba(248,245,255,0.88)_0%,_rgba(255,255,255,0.82)_100%)] p-6 shadow-[0_10px_30px_rgba(22,20,35,0.08)] ring-1 ring-[rgba(77,67,119,0.12)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#19162a]">External LLM handoff</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-[#645c7d]">
          The export stays terse and metrics-led so an external model can make a fresh call without inheriting the app&apos;s recommendations.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#19162a] px-4 text-sm font-semibold text-white transition hover:bg-[#2b2443] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={handleDownload}
          disabled={isPending}
        >
          {isPending ? "Rendering image..." : "Download image"}
        </button>
        <button
          className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#d7d0e7] px-4 text-sm font-semibold text-[#312c49] transition hover:border-[#8f84c7] hover:bg-[#faf8ff]"
          type="button"
          onClick={handleCopyText}
        >
          {copied ? "Prompt copied" : "Copy prompt text"}
        </button>
        <button
          className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#efc8cf] bg-[#fff5f6] px-4 text-sm font-semibold text-[#8b3850] transition hover:border-[#d993a3] hover:bg-[#fff0f2] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={handleSendToDiscord}
          disabled={isPending || !canSendToDiscord}
        >
          {isPending ? "Sending..." : "Send to Discord"}
        </button>
      </div>

      {sendState.message ? (
        <p
          className={`mt-3 text-sm ${
            sendState.kind === "error" ? "text-[#b24861]" : "text-[#4b7450]"
          }`}
        >
          {sendState.message}
        </p>
      ) : null}

      <div className="mt-4 rounded-[10px] border border-[rgba(77,67,119,0.12)] bg-white/72 p-4 text-sm text-[#4d4764]">
        <p className="text-sm font-medium text-[#312c49]">Discord delivery status</p>
        <div className="mt-2 grid gap-2">
          <p>
            Today:{" "}
            <span className="font-semibold text-[#19162a]">
              {deliveryStatus.today.lastStatus
                ? `${deliveryStatus.today.lastStatus} via ${deliveryStatus.today.lastTrigger}`
                : "not sent yet"}
            </span>
          </p>
          <p>
            Last attempt:{" "}
            <span className="font-semibold text-[#19162a]">
              {formatTimestamp(deliveryStatus.today.lastSentAt)}
            </span>
          </p>
          <p>
            Scheduled send today:{" "}
            <span className="font-semibold text-[#19162a]">
              {deliveryStatus.today.scheduledSentAt
                ? formatTimestamp(deliveryStatus.today.scheduledSentAt)
                : "not sent"}
            </span>
          </p>
          <p>
            Latest successful delivery:{" "}
            <span className="font-semibold text-[#19162a]">
              {formatTimestamp(deliveryStatus.latestSuccessfulSendAt)}
            </span>
          </p>
          {deliveryStatus.today.lastErrorMessage ? (
            <p className="text-[#b24861]">{deliveryStatus.today.lastErrorMessage}</p>
          ) : null}
        </div>
      </div>

      <div ref={visibleCardRef} className="mt-6 overflow-x-auto">
        <div className="mx-auto min-w-[1040px]">{preview}</div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-[-200vw] top-0 z-[-1] overflow-hidden opacity-0"
      >
        <div
          ref={captureCardRef}
          className="w-[1080px] bg-[#f5f2fb] px-5 py-5"
        >
          {preview}
        </div>
      </div>
    </section>
  );
}
