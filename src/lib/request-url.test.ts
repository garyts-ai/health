import assert from "node:assert/strict";
import test from "node:test";

import { buildRequestRedirectUrl } from "@/lib/request-url";

test("redirect URLs use the browser origin instead of the 0.0.0.0 bind address", () => {
  const redirectUrl = buildRequestRedirectUrl(
    new Request("http://0.0.0.0:3000/api/hevy/sync", {
      headers: {
        origin: "https://healthmax-two.vercel.app",
      },
      method: "POST",
    }),
    "/?utilities=open",
  );

  assert.equal(redirectUrl.toString(), "https://healthmax-two.vercel.app/?utilities=open");
});

test("redirect URLs fall back to the host header when no origin is present", () => {
  const redirectUrl = buildRequestRedirectUrl(
    new Request("http://0.0.0.0:3000/api/auth/whoop", {
      headers: {
        host: "localhost:3000",
      },
      method: "GET",
    }),
    "/?utilities=open&whoop=not-configured",
  );

  assert.equal(
    redirectUrl.toString(),
    "http://localhost:3000/?utilities=open&whoop=not-configured",
  );
});
