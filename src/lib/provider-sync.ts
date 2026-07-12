export type SyncProvider = "whoop" | "hevy";
export type ProviderSyncStatus = "updated" | "unchanged" | "failed" | "skipped";

export type ProviderSyncResponse = {
  provider: SyncProvider;
  status: ProviderSyncStatus;
  attemptedAt: string;
  completedAt: string | null;
  latestObservationAt: string | null;
  errorCode: string | null;
};

export function latestObservationAt(values: Array<string | null | undefined>) {
  const valid = values.filter((value): value is string => value !== null && value !== undefined && Number.isFinite(Date.parse(value)));
  return valid.sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}

export function syncStatusFromObservation(previous: string | null, latest: string | null, fetchedCount: number) {
  if (fetchedCount <= 0 || !latest) return "unchanged" as const;
  if (!previous) return "updated" as const;
  return Date.parse(latest) > Date.parse(previous) ? "updated" as const : "unchanged" as const;
}

export function syncErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const status = message.match(/status (\d{3})/i)?.[1];
  return status ? `provider_http_${status}` : "provider_sync_failed";
}
