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
  const [goalNote, setGoalNote] = useState("");
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
    const trimmedGoal = goalNote.trim();
    const promptToCopy = trimmedGoal
      ? handoff.promptText.replace(
          "[Add your goal, constraint, or follow-up question here before sending.]",
          trimmedGoal,
        )
      : handoff.promptText;

    await navigator.clipboard.writeText(promptToCopy);
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
    <section data-premium-surface data-premium-tone="light" data-premium-enter className="rounded-[10px] border border-[rgba(77,67,119,0.12)] bg-[#fbf9fd] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#19162a]">LLM context packet</h2>
        </div>
        <p className="max-w-xl text-[13px] leading-5 text-[#645c7d]">
          Copy a data-only HealthMax packet, then ask your own question in the other model. It does not include
          HealthMax recommendations or planned actions.
        </p>
      </div>

      <div className="mt-4 rounded-[9px] border border-[rgba(77,67,119,0.12)] bg-white/72 p-3">
        <label htmlFor="handoff-goal" className="text-sm font-medium text-[#312c49]">
          Add your goal or follow-up
        </label>
        <textarea
          id="handoff-goal"
          className="mt-2 min-h-20 w-full resize-y rounded-[8px] border border-[#d9d2e8] bg-white/86 px-3 py-2 text-sm leading-5 text-[#241f3c] outline-none transition focus:border-[#7c70bd] focus:ring-2 focus:ring-[#7c70bd]/18"
          placeholder="Example: Make this stricter for fat loss, but avoid compromising sleep."
          value={goalNote}
          onChange={(event) => setGoalNote(event.target.value)}
        />

        <div className="mt-2 grid gap-2 text-sm text-[#4d4764] sm:grid-cols-3">
          <PromptInclude label="Today actions" />
          <PromptInclude label="Metric drivers" />
          <PromptInclude label="Next-week plan" />
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#19162a] px-4 text-sm font-semibold text-white transition hover:bg-[#2b2443]"
          type="button"
          onClick={handleCopyText}
        >
          {copied ? "Copied" : "Copy ChatGPT prompt"}
        </button>
        <button
          className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#d7d0e7] px-4 text-sm font-semibold text-[#312c49] transition hover:border-[#8f84c7] hover:bg-[#faf8ff] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={handleDownload}
          disabled={isPending}
        >
          {isPending ? "Rendering image..." : "Download image"}
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

      <details className="mt-3 rounded-[9px] border border-[rgba(77,67,119,0.12)] bg-white/54 p-3 text-sm text-[#4d4764]">
        <summary className="cursor-pointer text-sm font-medium text-[#312c49]">
          Delivery status
        </summary>
        <div className="mt-3 grid gap-2">
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
      </details>

      <div ref={visibleCardRef} className="mt-4 overflow-x-auto">
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

function PromptInclude({ label }: { label: string }) {
  return (
    <div className="rounded-[7px] border border-[rgba(77,67,119,0.1)] bg-[#f7f4fc] px-3 py-1.5 text-center text-xs font-medium text-[#4d4764]">
      {label}
    </div>
  );
}
