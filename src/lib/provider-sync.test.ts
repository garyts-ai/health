import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { latestObservationAt, syncErrorCode, syncStatusFromObservation } from "@/lib/provider-sync";

test("provider sync status distinguishes new observations from unchanged history", () => {
  assert.equal(syncStatusFromObservation("2026-07-10T10:00:00.000Z", "2026-07-10T10:00:00.000Z", 20), "unchanged");
  assert.equal(syncStatusFromObservation("2026-07-10T10:00:00.000Z", "2026-07-11T10:00:00.000Z", 20), "updated");
  assert.equal(syncStatusFromObservation(null, "2026-07-11T10:00:00.000Z", 20), "updated");
  assert.equal(syncStatusFromObservation(null, null, 0), "unchanged");
});

test("provider sync response helpers bound timestamps and error codes", () => {
  assert.equal(latestObservationAt(["2026-07-10T10:00:00.000Z", "2026-07-11T10:00:00.000Z"]), "2026-07-11T10:00:00.000Z");
  assert.equal(latestObservationAt(["not-a-date", null]), null);
  assert.equal(syncErrorCode(new Error("provider request failed with status 429")), "provider_http_429");
  assert.equal(syncErrorCode(new Error("not configured")), "provider_sync_failed");
});

test("mobile pull refresh does not post to provider sync routes", () => {
  const source = readFileSync(join(process.cwd(), "src/components/mobile-pull-sync.tsx"), "utf8");
  assert.doesNotMatch(source, /\/api\/(whoop|hevy)\/sync/);
  assert.doesNotMatch(source, /method:\s*["']POST["']/);
});
