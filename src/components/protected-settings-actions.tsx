"use client";

import { useSyncExternalStore } from "react";
import { GlassPanel } from "@/components/training-os";
import type { HevyConnectionStatus } from "@/lib/hevy/types";
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
  syncNotice: string | null;
  grantedScopes: string[] | null;
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

function providerNotice(provider: "WHOOP" | "Hevy", status?: string) {
  if (!status) return null;
  const label = provider === "WHOOP" ? "WHOOP" : "Hevy";
  if (status === "sync-success") return `${label} sync completed.`;
  if (status === "sync-unchanged") return `${label} sync completed; no newer records were found.`;
  if (status === "sync-skipped") return `${label} sync was skipped because the provider is not connected.`;
  if (status === "sync-failed") return `${label} sync failed. The last known records are still shown.`;
  if (status === "connected") return `${label} connected and the initial sync completed.`;
  if (status === "oauth-denied") return `${label} authorization was denied; existing records remain available.`;
  if (status === "invalid-state") return `${label} authorization could not be verified. Try connecting again.`;
  if (status === "missing-code") return `${label} authorization returned without a code.`;
  if (status === "not-configured") return `${label} is not configured yet.`;
  return null;
}

export function ProtectedSettingsActions({ hevy, syncStatus, whoop }: { hevy: HevyConnectionStatus; syncStatus?: { whoop?: string; hevy?: string }; whoop: WhoopConnectionStatus }) {
  const canUseWhoopOAuth = useSyncExternalStore(subscribeToBrowserHost, getBrowserOAuthSnapshot, getServerOAuthSnapshot);
  const providers: ProviderCard[] = [
    {
      name: "WHOOP", connected: whoop.connected, configured: whoop.isConfigured, stale: whoop.isStale,
      lastSyncCompletedAt: whoop.lastSyncCompletedAt, lastSyncError: whoop.lastSyncError, lastSyncStatus: whoop.lastSyncStatus,
      reconnectHref: whoop.isConfigured && canUseWhoopOAuth ? "/api/auth/whoop" : null,
      reconnectLabel: whoop.isConfigured ? "Reconnect requires HTTPS" : "Configure WHOOP", syncAction: "/api/whoop/sync",
      syncNotice: providerNotice("WHOOP", syncStatus?.whoop),
      grantedScopes: whoop.scopes,
    },
    {
      name: "Hevy", connected: hevy.connected, configured: hevy.isConfigured, stale: hevy.isStale,
      lastSyncCompletedAt: hevy.lastSyncCompletedAt, lastSyncError: null, lastSyncStatus: hevy.lastSyncStatus,
      reconnectHref: null, reconnectLabel: "Configure Hevy", syncAction: "/api/hevy/sync",
      syncNotice: providerNotice("Hevy", syncStatus?.hevy),
      grantedScopes: null,
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
              <div><h4>{provider.name}</h4><p>Last sync {formatTimestamp(provider.lastSyncCompletedAt)}</p>{provider.grantedScopes ? <p>Granted scope: {provider.grantedScopes.length ? provider.grantedScopes.join(", ") : "none returned"}</p> : null}</div>
              <span className={styles.state}>{state}</span>
              {provider.lastSyncStatus === "failed" && provider.lastSyncError ? <p className={styles.error}>Last error: {provider.lastSyncError}</p> : null}
              {provider.syncNotice ? <p className={styles.notice} role="status">{provider.syncNotice}</p> : null}
              <div className={styles.actions}>
                {provider.reconnectHref ? <a href={provider.reconnectHref}>Reconnect</a> : <button type="button" disabled>{provider.reconnectLabel}</button>}
                <form action={provider.syncAction} method="post"><button type="submit" disabled={!provider.configured}>Sync {provider.name}</button></form>
              </div>
            </article>;
          })}
        </div>
      </GlassPanel>
    </fieldset>
  </div>;
}
