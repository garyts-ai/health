import assert from "node:assert/strict";
import test from "node:test";

import { parseRetryAfterMilliseconds } from "@/lib/whoop/provider";

test("WHOOP Retry-After delays are bounded", () => {
  assert.equal(parseRetryAfterMilliseconds("2"), 2_000);
  assert.equal(parseRetryAfterMilliseconds("999"), 5_000);
  assert.equal(parseRetryAfterMilliseconds("not-a-delay"), 0);
});
