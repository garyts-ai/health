type RequiredEnvKey =
  | "WHOOP_CLIENT_ID"
  | "WHOOP_CLIENT_SECRET"
  | "WHOOP_REDIRECT_URI";

type OptionalEnvKey = "HEVY_API_KEY" | "DISCORD_WEBHOOK_URL";

function readEnv(key: RequiredEnvKey | OptionalEnvKey) {
  const value = process.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getRequiredEnv(key: RequiredEnvKey) {
  const value = readEnv(key);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function hasWhoopEnv() {
  return Boolean(
    readEnv("WHOOP_CLIENT_ID") &&
      readEnv("WHOOP_CLIENT_SECRET") &&
      readEnv("WHOOP_REDIRECT_URI"),
  );
}

export function getWhoopEnv() {
  return {
    clientId: getRequiredEnv("WHOOP_CLIENT_ID"),
    clientSecret: getRequiredEnv("WHOOP_CLIENT_SECRET"),
    redirectUri: getRequiredEnv("WHOOP_REDIRECT_URI"),
  };
}

export function hasHevyApiKey() {
  return Boolean(readEnv("HEVY_API_KEY"));
}

export function getHevyApiKey() {
  const value = readEnv("HEVY_API_KEY");

  if (!value) {
    throw new Error("Missing required environment variable: HEVY_API_KEY");
  }

  return value;
}

export function hasDiscordWebhookUrl() {
  return Boolean(readEnv("DISCORD_WEBHOOK_URL"));
}

export function getDiscordWebhookUrl() {
  const value = readEnv("DISCORD_WEBHOOK_URL");

  if (!value) {
    throw new Error("Missing required environment variable: DISCORD_WEBHOOK_URL");
  }

  return value;
}
