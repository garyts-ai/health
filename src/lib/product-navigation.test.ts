import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_SECTION_ITEMS,
  APP_SECTIONS,
  isAppSection,
  legacySectionUrl,
  sectionFromHash,
  urlForSection,
} from "./product-navigation";

test("district navigation exposes every anchored app section", () => {
  assert.deepEqual(APP_SECTIONS, ["today", "weekly", "whoop", "utilities"]);
  assert.deepEqual(
    APP_SECTION_ITEMS.map(({ href }) => href),
    ["#today", "#weekly", "#whoop", "#utilities"],
  );
});

test("legacy anchor redirects preserve all query values and defaults", () => {
  assert.equal(
    legacySectionUrl("whoop", { import: "success", reason: "ready" }),
    "/?import=success&reason=ready#whoop",
  );
  assert.equal(
    legacySectionUrl("utilities", { targets: "saved", utilities: "closed" }, { utilities: "open" }),
    "/?utilities=closed&targets=saved#utilities",
  );
  assert.equal(
    legacySectionUrl("weekly", { status: ["fresh", "synced"] }),
    "/?status=fresh&status=synced#weekly",
  );
});

test("sectionFromHash accepts only canonical app section hashes", () => {
  assert.equal(sectionFromHash("#weekly"), "weekly");
  assert.equal(sectionFromHash("utilities"), "utilities");
  assert.equal(sectionFromHash("#settings"), null);
  assert.equal(sectionFromHash(""), null);
  assert.equal(isAppSection("whoop"), true);
  assert.equal(isAppSection("body"), false);
});

test("urlForSection retains the root query and replaces only the hash", () => {
  assert.equal(
    urlForSection("https://health.test/?status=connected#today", "whoop"),
    "/?status=connected#whoop",
  );
});
