import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

const origin = "http://127.0.0.1:3113";
const secret = "healthmaxer-test-session-secret";

async function setSession(context: BrowserContext, username: string, email: string | null = null) {
  const value = await encode({ secret, token: { sub: username, name: username, email, githubUsername: username } });
  await context.addCookies([{ name: "next-auth.session-token", value, url: origin, httpOnly: true, sameSite: "Lax" }]);
}

async function mockGitHubPicker(page: Page) {
  await page.route("https://github.com/login/oauth/authorize**", (route) => route.fulfill({
    contentType: "text/html",
    body: "<h1>Choose a GitHub account</h1>",
  }));
}

test("a rejected GitHub sign-in reaches recovery and asks GitHub to choose an account", async ({ page }) => {
  await mockGitHubPicker(page);
  await page.goto("/api/auth/error?error=AccessDenied");
  await expect(page).toHaveURL(/\/login\?error=AccessDenied$/);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("does not have access");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expect(page.getByRole("heading", { name: "Choose a GitHub account" })).toBeVisible();
  const url = new URL(page.url());
  expect(url.searchParams.get("prompt")).toBe("select_account");
  expect(url.searchParams.get("state")).toBeTruthy();
  expect(url.searchParams.get("scope")).toBe("read:user user:email");
});

test("account switching is available on a fresh login and preserves the dashboard destination", async ({ page, context }) => {
  const requests: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST") requests.push(new URL(request.url()).pathname); });
  await mockGitHubPicker(page);
  await page.goto("/login?callbackUrl=%2F%3Futilities%3Dopen%23utilities");
  await page.getByRole("button", { name: "Use a different GitHub account" }).click();
  await expect(page.getByRole("heading", { name: "Choose a GitHub account" })).toBeVisible();
  expect(requests).toEqual(["/api/auth/signout", "/api/auth/signin/github"]);
  expect(new URL(page.url()).searchParams.get("prompt")).toBe("select_account");
  const cookies = await context.cookies(origin);
  expect(decodeURIComponent(cookies.find((cookie) => cookie.name === "next-auth.callback-url")!.value)).toBe(`${origin}/?utilities=open#utilities`);
});

test("a remembered disallowed session can be cleared before switching accounts", async ({ page, context }) => {
  await setSession(context, "wrong-user", "wrong@example.test");
  await mockGitHubPicker(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  await expect(page.getByText("HealthMaxer session: wrong-user")).toBeVisible();
  await page.getByRole("button", { name: "Use a different GitHub account" }).click();
  await expect(page.getByRole("heading", { name: "Choose a GitHub account" })).toBeVisible();
  expect((await context.cookies(origin)).some((cookie) => cookie.name.startsWith("next-auth.session-token"))).toBe(false);
});

test("an allowed account with no email reaches the dashboard and can sign out", async ({ page, context }) => {
  await setSession(context, "allowed-user");
  await page.goto("/login");
  await expect(page).toHaveURL(`${origin}/`);
  const signOut = page.getByRole("button", { name: "Sign out of HealthMaxer" });
  await signOut.scrollIntoViewIfNeeded();
  await signOut.click();
  await expect(page).toHaveURL(`${origin}/login`);
  await expect(page.getByRole("button", { name: "Use a different GitHub account" })).toBeVisible();
  expect((await context.cookies(origin)).some((cookie) => cookie.name.startsWith("next-auth.session-token"))).toBe(false);
  const protectedResponse = await page.request.get("/api/whoop/sync", { maxRedirects: 0 });
  expect(protectedResponse.status()).toBe(307);
  expect(protectedResponse.headers().location).toContain("/login?callbackUrl=");
});

test("an existing allowed session can open account recovery without being redirected away", async ({ page, context }) => {
  await setSession(context, "allowed-user");
  await page.goto("/login?switchAccount=1");
  await expect(page).toHaveURL(/\/login\?switchAccount=1$/);
  await expect(page.getByRole("button", { name: "Sign out of HealthMaxer" })).toBeVisible();
  await page.goto("/login?error=AccessDenied");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("does not have access");
});

test("mobile recovery controls remain visible and do not overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login?error=AccessDenied");
  await expect(page.getByRole("button", { name: "Use a different GitHub account" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile-login-recovery.png"), fullPage: true });
});

test("a logout CSRF failure stops switching and lets the user retry", async ({ page, context }) => {
  await setSession(context, "wrong-user", "wrong@example.test");
  await mockGitHubPicker(page);
  await page.goto("/login");
  const failedLogout = "**/api/auth/signout";
  await page.route(failedLogout, (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ url: `${origin}/api/auth/signout?csrf=true` }),
  }));
  const switchAccount = page.getByRole("button", { name: "Use a different GitHub account" });
  await switchAccount.click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Could not start GitHub sign-in");
  await expect(switchAccount).toBeEnabled();
  await expect(page).toHaveURL(`${origin}/login`);
  expect((await context.cookies(origin)).some((cookie) => cookie.name === "next-auth.session-token")).toBe(true);
  await page.unroute(failedLogout);
  await switchAccount.click();
  await expect(page.getByRole("heading", { name: "Choose a GitHub account" })).toBeVisible();
});

test("failed standalone sign-out stays on recovery and re-enables logout", async ({ page, context }) => {
  await setSession(context, "allowed-user");
  await page.goto("/login?switchAccount=1");
  await page.route("**/api/auth/signout", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ url: `${origin}/api/auth/signout?csrf=true` }),
  }));
  const button = page.getByRole("button", { name: "Sign out of HealthMaxer" });
  await button.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Sign-out failed. Please try again.");
  await expect(button).toBeEnabled();
  await expect(page).toHaveURL(/switchAccount=1$/);
});
