import assert from "node:assert/strict";
import test from "node:test";

import { createSingleFlight } from "@/lib/single-flight";

test("single-flight shares one concurrent operation and resets after completion", async () => {
  const singleFlight = createSingleFlight<number>();
  let calls = 0;
  const operation = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return calls;
  };
  const [first, second] = await Promise.all([singleFlight(operation), singleFlight(operation)]);
  assert.equal(first, 1);
  assert.equal(second, 1);
  assert.equal(await singleFlight(operation), 2);
});
