import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/auth",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: { baseURL: "http://127.0.0.1:3113", screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3113",
    url: "http://127.0.0.1:3113/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      AUTH_GITHUB_ID: "healthmaxer-test-client",
      AUTH_GITHUB_SECRET: "healthmaxer-test-client-secret",
      AUTH_SECRET: "healthmaxer-test-session-secret",
      NEXTAUTH_SECRET: "healthmaxer-test-session-secret",
      NEXTAUTH_URL: "http://127.0.0.1:3113",
      ALLOWED_GITHUB_USERS: "allowed-user",
    },
  },
});
