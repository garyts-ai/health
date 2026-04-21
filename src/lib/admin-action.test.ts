import assert from "node:assert/strict";
import test from "node:test";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST: postDiscordBrief } = require("@/app/api/discord/daily-brief/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST: postHevySync } = require("@/app/api/hevy/sync/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST: postWhoopSync } = require("@/app/api/whoop/sync/route");

test("Discord manual send no longer requires an admin secret", async () => {
  const response = await postDiscordBrief(
    new Request("http://localhost/api/discord/daily-brief", {
      method: "POST",
    }),
  );
  const payload = (await response.json()) as {
    ok: boolean;
    error?: string;
  };

  assert.notEqual(response.status, 401);
  assert.notEqual(response.status, 403);
  assert.equal(typeof payload.ok, "boolean");
});

test("WHOOP sync redirects back to local settings without an unauthorized state", async () => {
  const response = await postWhoopSync(
    new Request("http://localhost/api/whoop/sync", {
      method: "POST",
      headers: {
        referer: "https://evil.example/steal",
      },
    }),
  );

  assert.equal(response.status, 303);
  assert.match(
    response.headers.get("location") ?? "",
    /^http:\/\/localhost\/\?utilities=open&whoop=/,
  );
  assert.doesNotMatch(response.headers.get("location") ?? "", /unauthorized/);
});

test("Hevy sync redirects back to local settings without an unauthorized state", async () => {
  const response = await postHevySync(
    new Request("http://localhost/api/hevy/sync", {
      method: "POST",
      headers: {
        referer: "https://evil.example/steal",
      },
    }),
  );

  assert.equal(response.status, 303);
  assert.match(
    response.headers.get("location") ?? "",
    /^http:\/\/localhost\/\?utilities=open&hevy=/,
  );
  assert.doesNotMatch(response.headers.get("location") ?? "", /unauthorized/);
});
