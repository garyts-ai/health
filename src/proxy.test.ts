import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { encode } from "next-auth/jwt";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

const secret = "healthmaxer-auth-regression-test-secret";
const environmentKeys = [
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "ALLOWED_GITHUB_USERS",
  "NEXTAUTH_URL",
  "VERCEL",
] as const;
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);

beforeEach(() => {
  process.env.AUTH_SECRET = secret;
  process.env.AUTH_GITHUB_ID = "test-client";
  process.env.AUTH_GITHUB_SECRET = "test-client-secret";
  process.env.ALLOWED_GITHUB_USERS = "owner, second-owner";
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  delete process.env.NEXTAUTH_SECRET;
  delete process.env.VERCEL;
});

afterEach(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      Object.assign(process.env, { [key]: value });
    }
  }
});

async function requestFor(path: string, method: "GET" | "POST", username?: string) {
  const headers = new Headers();
  if (username !== undefined) {
    const token = await encode({
      token: { githubUsername: username, name: username, email: "owner@example.test" },
      secret,
    });
    headers.set("cookie", `next-auth.session-token=${token}`);
  }
  return new NextRequest(`http://localhost:3000${path}`, { method, headers });
}

function assertAllowed(response: Response) {
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("location"), null);
}

function assertLoginRedirect(response: Response, callbackUrl: string) {
  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location")!);
  assert.equal(location.origin, "http://localhost:3000");
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("callbackUrl"), callbackUrl);
  assert.equal(response.headers.get("x-middleware-next"), null);
}

for (const method of ["GET", "POST"] as const) {
  test(`${method} sign-out is reachable without a session`, async () => {
    assertAllowed(await proxy(await requestFor("/api/auth/signout", method)));
  });

  test(`${method} sign-out is reachable with a session whose user was removed`, async () => {
    const request = await requestFor("/api/auth/signout", method, "owner");
    process.env.ALLOWED_GITHUB_USERS = "second-owner";
    assertAllowed(await proxy(request));
  });
}

test("similarly named sign-out endpoints remain protected", async () => {
  for (const path of ["/api/auth/signout-all", "/api/auth/signouts", "/api/auth/signout/extra"]) {
    for (const username of [undefined, "removed-owner"]) {
      assertLoginRedirect(await proxy(await requestFor(path, "POST", username)), path);
    }
  }
});

test("the root remains protected without a session and preserves its callback query", async () => {
  assertLoginRedirect(await proxy(await requestFor("/?view=weekly", "GET")), "/?view=weekly");
});

test("a signed session loses root access when its GitHub username is removed", async () => {
  const request = await requestFor("/", "GET", "owner");
  process.env.ALLOWED_GITHUB_USERS = "second-owner";
  assertLoginRedirect(await proxy(request), "/");
});

test("an allowed GitHub token reaches the protected root", async () => {
  assertAllowed(await proxy(await requestFor("/", "GET", "OWNER")));
});
