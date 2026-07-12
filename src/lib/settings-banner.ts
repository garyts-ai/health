const whoopMessages: Record<string, string> = {
  connected: "WHOOP connected and initial sync completed.",
  "oauth-denied": "WHOOP authorization was denied before the app could connect.",
  "invalid-state": "WHOOP callback could not be verified. Please try connecting again.",
  "missing-code": "WHOOP returned without an authorization code.",
  "not-configured": "WHOOP credentials are missing. Add them to .env.local before connecting.",
  "sync-failed": "WHOOP connected, but the sync step failed. Try syncing again.",
  "sync-success": "WHOOP sync completed successfully.",
};

const hevyMessages: Record<string, string> = {
  "not-configured": "Hevy sync is disabled until HEVY_API_KEY is added to .env.local.",
  "sync-success": "Hevy sync completed successfully.",
  "sync-failed": "Hevy sync failed. Double-check the API key and try again.",
};

export function getSettingsBannerMessage(searchParams: { whoop?: string; hevy?: string }) {
  return searchParams.whoop
    ? whoopMessages[searchParams.whoop]
    : searchParams.hevy
      ? hevyMessages[searchParams.hevy]
      : null;
}
