import assert from "node:assert/strict";
import test from "node:test";

import { getSafeCallbackUrl } from "./auth-navigation";

test("app callback URLs retain their path, query, and section anchor", () => {
  assert.equal(getSafeCallbackUrl("/?utilities=open#whoop"), "/?utilities=open#whoop");
  assert.equal(
    getSafeCallbackUrl("/insights?range=week&tag=coffee%20day#summary"),
    "/insights?range=week&tag=coffee%20day#summary",
  );
});

test("external and backslash callback destinations return to the app root", () => {
  for (const destination of [
    "https://other.example/",
    "//other.example/",
    "///other.example/",
    "/\\other.example/",
    "\\\\other.example/",
    "/insights\\other.example/",
  ]) {
    assert.equal(getSafeCallbackUrl(destination), "/", destination);
  }
});

test("login and auth callback destinations cannot create authentication loops", () => {
  for (const destination of [
    "/login",
    "/login/?callbackUrl=%2Flogin#again",
    "/%6cogin",
    "/insights/../login",
    "/api/auth/signin/github",
    "/api/auth/callback/github?code=example",
    "/api/auth/signout",
  ]) {
    assert.equal(getSafeCallbackUrl(destination), "/", destination);
  }
});

test("missing, malformed, and control-character callback URLs use the root", () => {
  for (const destination of [undefined, "", "insights", "/%ZZ", "/\nother.example", "/\u0000"]) {
    assert.equal(getSafeCallbackUrl(destination), "/", destination);
  }
});
