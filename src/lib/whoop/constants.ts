export const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
export const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
export const WHOOP_API_BASE_URL = "https://api.prod.whoop.com/developer/v2";

export const WHOOP_SCOPES = [
  "offline",
  "read:recovery",
  "read:body_measurement",
  "read:cycles",
  "read:workout",
  "read:sleep",
  "read:profile",
] as const;

export const WHOOP_SCOPE_STRING = WHOOP_SCOPES.join(" ");
