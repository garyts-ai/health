import assert from "node:assert/strict";
import test from "node:test";

process.env.ADMIN_ACTION_SECRET ??= "test-admin-secret";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { authorizeAdminAction } = require("@/lib/admin-action");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ADMIN_ACTION_FORM_FIELD, ADMIN_ACTION_HEADER } = require("@/lib/admin-action-shared");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST: postDiscordBrief } = require("@/app/api/discord/daily-brief/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST: postHevySync } = require("@/app/api/hevy/sync/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST: postWhoopSync } = require("@/app/api/whoop/sync/route");

test("authorizeAdminAction accepts the shared secret from a request header", async () => {
  const request = new Request("http://localhost/api/test", {
    method: "POST",
    headers: {
      [ADMIN_ACTION_HEADER]: "test-admin-secret",
    },
  });

  const result = await authorizeAdminAction(request);

  assert.equal(result.ok, true);
});

test("authorizeAdminAction accepts the shared secret from form data", async () => {
  const request = new Request("http://localhost/api/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      [ADMIN_ACTION_FORM_FIELD]: "test-admin-secret",
    }),
  });

  const result = await authorizeAdminAction(request);

  assert.equal(result.ok, true);
});

test("authorizeAdminAction rejects an invalid shared secret", async () => {
  const request = new Request("http://localhost/api/test", {
    method: "POST",
    headers: {
      [ADMIN_ACTION_HEADER]: "wrong-secret",
    },
  });

  const result = await authorizeAdminAction(request);

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test("Discord manual send rejects requests without the admin secret", async () => {
  const response = await postDiscordBrief(
    new Request("http://localhost/api/discord/daily-brief", {
      method: "POST",
    }),
  );
  const payload = (await response.json()) as {
    ok: boolean;
    error?: string;
  };

  assert.equal(response.status, 401);
  assert.equal(payload.ok, false);
  assert.match(payload.error ?? "", /Admin secret is required/i);
});

test("WHOOP sync redirects to settings and ignores a forged referer on unauthorized requests", async () => {
  const response = await postWhoopSync(
    new Request("http://localhost/api/whoop/sync", {
      method: "POST",
      headers: {
        referer: "https://evil.example/steal",
      },
    }),
  );

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "http://localhost/settings?whoop=unauthorized");
});

test("Hevy sync redirects to settings and ignores a forged referer on unauthorized requests", async () => {
  const response = await postHevySync(
    new Request("http://localhost/api/hevy/sync", {
      method: "POST",
      headers: {
        referer: "https://evil.example/steal",
      },
    }),
  );

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "http://localhost/settings?hevy=unauthorized");
});
