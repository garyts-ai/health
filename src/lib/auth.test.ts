import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { Session } from "next-auth";

import { authOptions, isAllowedGitHubSession } from "./auth";

const originalAllowlist = process.env.ALLOWED_GITHUB_USERS;

beforeEach(() => {
  process.env.ALLOWED_GITHUB_USERS = "owner, second-owner";
});

afterEach(() => {
  if (originalAllowlist === undefined) {
    delete process.env.ALLOWED_GITHUB_USERS;
  } else {
    process.env.ALLOWED_GITHUB_USERS = originalAllowlist;
  }
});

function sessionFor(githubUsername?: string, email: string | null = null) {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: { name: "owner", email },
    ...(githubUsername === undefined ? {} : { githubUsername }),
  } satisfies Session & { githubUsername?: string };
}

test("an allowed GitHub session is admitted when GitHub provides no email", () => {
  assert.equal(isAllowedGitHubSession(sessionFor(" Owner ")), true);
});

test("a different GitHub username is denied even with the allowed user's name and email", () => {
  assert.equal(
    isAllowedGitHubSession(sessionFor("different-account", "owner@example.test")),
    false,
  );
});

test("missing or empty GitHub identity cannot use the session name or email for admission", () => {
  assert.equal(isAllowedGitHubSession(null), false);
  assert.equal(isAllowedGitHubSession(sessionFor(undefined, "owner@example.test")), false);
  assert.equal(isAllowedGitHubSession(sessionFor(" ", "owner@example.test")), false);
});

test("removing a GitHub username from the allowlist revokes an existing session", () => {
  const session = sessionFor("owner");
  assert.equal(isAllowedGitHubSession(session), true);

  process.env.ALLOWED_GITHUB_USERS = "second-owner";
  assert.equal(isAllowedGitHubSession(session), false);
});

test("the JWT and session callbacks retain GitHub identity independently of email", async () => {
  const callbacks = authOptions.callbacks!;
  const profile = { login: " Owner ", email: undefined };
  const token = await callbacks.jwt!({
    token: {},
    user: { id: "1", name: "Owner", email: null },
    account: { provider: "github", type: "oauth", providerAccountId: "1" },
    profile,
  });

  assert.equal(token.githubUsername, "owner");

  const session = await callbacks.session!({
    session: sessionFor(),
    token,
    user: { id: "1", email: "", emailVerified: null },
    newSession: undefined,
    trigger: "update",
  });

  assert.equal("githubUsername" in session && session.githubUsername, "owner");
  assert.equal(session.user?.email, null);
  assert.equal(isAllowedGitHubSession(session), true);
});

test("GitHub sign-in permits an allowlisted profile with no email", async () => {
  const signIn = authOptions.callbacks!.signIn!;
  const profile = { login: "OWNER", email: undefined };

  assert.equal(await signIn({
    user: { id: "1", name: "owner", email: null },
    account: { provider: "github", type: "oauth", providerAccountId: "1" },
    profile,
  }), true);
});

test("the sign-in allowlist denies another GitHub profile with a populated email", async () => {
  const signIn = authOptions.callbacks!.signIn!;
  const profile = { login: "different-account", email: "different@example.test" };

  assert.equal(await signIn({
    user: { id: "2", name: "different-account", email: "different@example.test" },
    account: { provider: "github", type: "oauth", providerAccountId: "2" },
    profile,
  }), false);
});
