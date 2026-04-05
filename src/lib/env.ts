type RequiredEnvKey =
  | "WHOOP_CLIENT_ID"
  | "WHOOP_CLIENT_SECRET"
  | "WHOOP_REDIRECT_URI";

type OptionalEnvKey = "HEVY_API_KEY" | "DISCORD_WEBHOOK_URL";

function getEnv(key: RequiredEnvKey) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getOptionalEnv(key: OptionalEnvKey) {
  return process.env[key] ?? null;
}

export const env = {
  whoopClientId: getEnv("WHOOP_CLIENT_ID"),
  whoopClientSecret: getEnv("WHOOP_CLIENT_SECRET"),
  whoopRedirectUri: getEnv("WHOOP_REDIRECT_URI"),
  hevyApiKey: getOptionalEnv("HEVY_API_KEY"),
  discordWebhookUrl: getOptionalEnv("DISCORD_WEBHOOK_URL"),
};
