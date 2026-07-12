"use client";

import { useSyncExternalStore } from "react";
import { LlmContextPacket } from "@/components/llm-context-packet";
import { GlassPanel } from "@/components/training-os";
import type { HevyConnectionStatus } from "@/lib/hevy/types";
import type { DailySummary } from "@/lib/insights/types";
import type { WhoopConnectionStatus } from "@/lib/whoop/types";
import styles from "./utilities-panel.module.css";

type ProviderCard = {
  name: "WHOOP" | "Hevy";
  connected: boolean;
  configured: boolean;
  stale: boolean;
  lastSyncCompletedAt: string | null;
  lastSyncError: string | null;
  lastSyncStatus: string | null;
  reconnectHref: string | null;
  reconnectLabel: string;
  syncAction: string;
};

function formatTimestamp(value: string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function isSafeOAuthLocation(location: Location) {
  return location.protocol === "https:" || ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
}

function subscribeToBrowserHost() { return () => {}; }
function getBrowserOAuthSnapshot() { return typeof window !== "undefined" && isSafeOAuthLocation(window.location); }
function getServerOAuthSnapshot() { return false; }

export function ProtectedSettingsActions({ hevy, summary, whoop }: { hevy: HevyConnectionStatus; summary: DailySummary; whoop: WhoopConnectionStatus }) {
  const canUseWhoopOAuth = useSyncExternalStore(subscribeToBrowserHost, getBrowserOAuthSnapshot, getServerOAuthSnapshot);
  const providers: ProviderCard[] = [
    {
      name: "WHOOP", connected: whoop.connected, configured: whoop.isConfigured, stale: whoop.isStale,
      lastSyncCompletedAt: whoop.lastSyncCompletedAt, lastSyncError: whoop.lastSyncError, lastSyncStatus: whoop.lastSyncStatus,
      reconnectHref: whoop.isConfigured && canUseWhoopOAuth ? "/api/auth/whoop" : null,
      reconnectLabel: whoop.isConfigured ? "Reconnect requires HTTPS" : "Configure WHOOP", syncAction: "/api/whoop/sync",
    },
    {
      name: "Hevy", connected: hevy.connected, configured: hevy.isConfigured, stale: hevy.isStale,
      lastSyncCompletedAt: hevy.lastSyncCompletedAt, lastSyncError: null, lastSyncStatus: hevy.lastSyncStatus,
      reconnectHref: null, reconnectLabel: "Configure Hevy", syncAction: "/api/hevy/sync",
    },
  ];

  return <div className={styles.stack}>
    <fieldset className={styles.fieldset}>
      <legend>Connections</legend>
      <GlassPanel level="base" className={styles.connectionSurface}>
        <div className={styles.connectionIntro}>
          <h3>Data sources</h3>
          <p>Refresh the physiological and lifting records used by the dashboard and context packet.</p>
        </div>
        <div className={styles.providerList}>
          {providers.map((provider) => {
            const state = !provider.configured ? "Not configured" : !provider.connected ? "Needs attention" : provider.lastSyncStatus === "failed" ? "Sync failed" : provider.stale ? "Connected, stale" : "Connected";
            return <article className={styles.provider} key={provider.name} data-state={state.toLowerCase().replaceAll(",", "").replaceAll(" ", "-")}>
              <div><h4>{provider.name}</h4><p>Last sync {formatTimestamp(provider.lastSyncCompletedAt)}</p></div>
              <span className={styles.state}>{state}</span>
              {provider.lastSyncStatus === "failed" && provider.lastSyncError ? <p className={styles.error}>Last error: {provider.lastSyncError}</p> : null}
              <div className={styles.actions}>
                {provider.reconnectHref ? <a href={provider.reconnectHref}>Reconnect</a> : <button type="button" disabled>{provider.reconnectLabel}</button>}
                <form action={provider.syncAction} method="post"><button type="submit" disabled={!provider.configured}>Sync {provider.name}</button></form>
              </div>
            </article>;
          })}
        </div>
      </GlassPanel>
    </fieldset>

    <fieldset className={styles.fieldset}>
      <legend>LLM Context Packet</legend>
      <LlmContextPacket summary={summary} />
    </fieldset>
  </div>;
}
