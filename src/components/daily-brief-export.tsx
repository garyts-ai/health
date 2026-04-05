"use client";

import { toPng } from "html-to-image";
import { useRef, useState, useTransition } from "react";

import { buildLlmHandoff } from "@/lib/daily-brief-shared";
import type { DailySummary, DiscordDeliveryStatus } from "@/lib/insights/types";

type DailyBriefExportProps = {
  summary: DailySummary;
  deliveryStatus: DiscordDeliveryStatus;
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

export function DailyBriefExport({ summary, deliveryStatus }: DailyBriefExportProps) {
  const cardRef = useRef<HTMLDivElement>(null);
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

  const handleDownload = () => {
    const target = cardRef.current;

    if (!target) {
      return;
    }

    startTransition(async () => {
      const dataUrl = await toPng(target, {
        cacheBust: true,
        pixelRatio: 2,
      });
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
    startTransition(async () => {
      setSendState({ kind: "idle", message: null });

      try {
        const response = await fetch("/api/discord/daily-brief", {
          method: "POST",
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
    <section className="rounded-[1.75rem] border border-stone-200/80 bg-white/85 p-6 shadow-[0_18px_55px_rgba(78,88,61,0.1)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
            Daily Brief Export
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-950">
            LLM-ready summary card
          </h2>
        </div>
        <p className="max-w-lg text-sm leading-6 text-stone-600">
          This handoff is designed to give an external LLM the raw signals and recent
          training context without feeding it the app&apos;s built-in action cards first.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex h-11 items-center justify-center rounded-full bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={handleDownload}
          disabled={isPending}
        >
          {isPending ? "Rendering image..." : "Download image"}
        </button>
        <button
          className="inline-flex h-11 items-center justify-center rounded-full border border-stone-300 px-5 text-sm font-semibold text-stone-800 transition hover:border-stone-950 hover:bg-white"
          type="button"
          onClick={handleCopyText}
        >
          {copied ? "Prompt copied" : "Copy prompt text"}
        </button>
        <button
          className="inline-flex h-11 items-center justify-center rounded-full border border-sky-300 bg-sky-50 px-5 text-sm font-semibold text-sky-900 transition hover:border-sky-500 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={handleSendToDiscord}
          disabled={isPending}
        >
          {isPending ? "Sending..." : "Send to Discord"}
        </button>
      </div>

      {sendState.message ? (
        <p
          className={`mt-3 text-sm ${
            sendState.kind === "error" ? "text-rose-700" : "text-lime-700"
          }`}
        >
          {sendState.message}
        </p>
      ) : null}

      <div className="mt-4 rounded-[1.25rem] border border-stone-200/80 bg-stone-50/80 p-4 text-sm text-stone-700">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
          Discord delivery status
        </p>
        <div className="mt-2 grid gap-2">
          <p>
            Today:{" "}
            <span className="font-semibold text-stone-950">
              {deliveryStatus.today.lastStatus
                ? `${deliveryStatus.today.lastStatus} via ${deliveryStatus.today.lastTrigger}`
                : "not sent yet"}
            </span>
          </p>
          <p>
            Last attempt:{" "}
            <span className="font-semibold text-stone-950">
              {formatTimestamp(deliveryStatus.today.lastSentAt)}
            </span>
          </p>
          <p>
            Scheduled send today:{" "}
            <span className="font-semibold text-stone-950">
              {deliveryStatus.today.scheduledSentAt
                ? formatTimestamp(deliveryStatus.today.scheduledSentAt)
                : "not sent"}
            </span>
          </p>
          <p>
            Latest successful delivery:{" "}
            <span className="font-semibold text-stone-950">
              {formatTimestamp(deliveryStatus.latestSuccessfulSendAt)}
            </span>
          </p>
          {deliveryStatus.today.lastErrorMessage ? (
            <p className="text-rose-700">{deliveryStatus.today.lastErrorMessage}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex justify-center overflow-x-auto">
        <div
          ref={cardRef}
          className="w-full max-w-3xl rounded-[2rem] bg-[linear-gradient(160deg,_#132018_0%,_#203524_55%,_#f3f6ee_55%,_#f3f6ee_100%)] p-8 text-stone-900"
        >
          <div className="flex flex-col gap-5">
            <div className="rounded-[1.5rem] bg-white/10 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-200">
                Daily Health Brief
              </p>
              <h3 className="mt-3 text-3xl font-semibold">
                {handoff.headline}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-200">
                {handoff.subheadline}
              </p>
            </div>

          <div className="grid gap-4 md:grid-cols-4">
            {handoff.metricCards.map((card) => (
              <div key={card.label} className="rounded-[1.25rem] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {card.label}
                </p>
                <p className="mt-2 whitespace-pre-line text-3xl font-semibold">{card.value}</p>
                <p className="mt-2 text-sm text-stone-600">{card.detail}</p>
              </div>
            ))}
          </div>

            <div className="grid gap-4 md:grid-cols-3">
            {handoff.trainingContextCards.map((card) => (
              <div key={card.label} className="rounded-[1.25rem] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {card.label}
                </p>
                <p className="mt-2 whitespace-pre-line text-3xl font-semibold">{card.value}</p>
                <p className="mt-2 text-sm text-stone-600">{card.detail}</p>
              </div>
            ))}
            </div>

            <div className="rounded-[1.5rem] bg-stone-950 p-5 text-stone-100">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-200">
                Ask an LLM
              </p>
              <p className="mt-3 text-sm leading-6">
                {handoff.llmQuestion}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
