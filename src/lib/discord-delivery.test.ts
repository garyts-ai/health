import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { applySchema } from "@/lib/db";

process.env.WHOOP_CLIENT_ID ??= "test-client-id";
process.env.WHOOP_CLIENT_SECRET ??= "test-client-secret";
process.env.WHOOP_REDIRECT_URI ??= "http://localhost:3000/api/auth/whoop/callback";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const deliveryModule = require("@/lib/discord-delivery");
const {
  getDiscordDateKey,
  getDiscordDeliveryStatus,
  hasSuccessfulDiscordDeliveryForDate,
  recordDiscordDeliveryRun,
} = deliveryModule;

function createTestDb() {
  const db = new DatabaseSync(":memory:");
  applySchema(db);
  return db;
}

test("scheduled dedupe checks successful sends for the day", () => {
  const db = createTestDb();
  const dateKey = "2026-04-04";

  assert.equal(hasSuccessfulDiscordDeliveryForDate(dateKey, db), false);

  recordDiscordDeliveryRun(
    {
      dateKey,
      summaryDate: "2026-04-04T12:00:00.000Z",
      triggerSource: "manual",
      status: "success",
    },
    db,
  );

  assert.equal(hasSuccessfulDiscordDeliveryForDate(dateKey, db), true);
});

test("delivery status surfaces today's latest attempt and latest success", () => {
  const db = createTestDb();
  const dateKey = "2026-04-04";

  recordDiscordDeliveryRun(
    {
      dateKey,
      summaryDate: "2026-04-04T11:00:00.000Z",
      triggerSource: "scheduled",
      status: "success",
      sentAt: "2026-04-04T12:00:00.000Z",
    },
    db,
  );
  recordDiscordDeliveryRun(
    {
      dateKey,
      summaryDate: "2026-04-04T13:00:00.000Z",
      triggerSource: "manual",
      status: "failed",
      sentAt: "2026-04-04T13:30:00.000Z",
      errorMessage: "Webhook rejected request.",
    },
    db,
  );

  const status = getDiscordDeliveryStatus(db, dateKey);

  assert.equal(status.today.lastStatus, "failed");
  assert.equal(status.today.lastTrigger, "manual");
  assert.equal(status.today.lastErrorMessage, "Webhook rejected request.");
  assert.equal(status.today.hasSuccessfulSend, true);
  assert.equal(status.today.scheduledSentAt, "2026-04-04T12:00:00.000Z");
  assert.equal(status.latestSuccessfulSendAt, "2026-04-04T12:00:00.000Z");
});

test("New York date key stays anchored to the schedule day", () => {
  assert.equal(getDiscordDateKey("2026-04-04T03:30:00.000Z"), "2026-04-03");
  assert.equal(getDiscordDateKey("2026-04-04T12:00:00.000Z"), "2026-04-04");
});
