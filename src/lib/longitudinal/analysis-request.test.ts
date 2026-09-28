import assert from "node:assert/strict";
import test from "node:test";

import { buildWhoopAnalysisRequestQuery, parseWhoopAnalysisRequest } from "@/lib/longitudinal/analysis-request";

const TODAY = "2026-09-28";

test("analysis request identity excludes client-only metric selection", () => {
  const query = buildWhoopAnalysisRequestQuery({ range: "30d", endDate: TODAY, view: "overview" });
  assert.equal(query.toString(), `range=30d&endDate=${TODAY}&view=overview`);
  assert.equal(query.has("metric"), false);
});

test("analysis request applies safe defaults and accepts supported selection values", () => {
  assert.deepEqual(parseWhoopAnalysisRequest(new URLSearchParams(), TODAY), {
    range: "30d", view: "overview", metric: null,
  });
  assert.deepEqual(parseWhoopAnalysisRequest(new URLSearchParams("range=365d&endDate=2026-08-31&view=sleep&metric=hrv"), TODAY), {
    range: "365d", endDate: "2026-08-31", view: "sleep", metric: "hrv",
  });
});

test("analysis request rejects unsupported ranges, views, metrics, and historical dates", () => {
  assert.deepEqual(parseWhoopAnalysisRequest(new URLSearchParams("range=week"), TODAY), { error: "Invalid analysis range." });
  assert.deepEqual(parseWhoopAnalysisRequest(new URLSearchParams("view=combined"), TODAY), { error: "Invalid analysis view." });
  assert.deepEqual(parseWhoopAnalysisRequest(new URLSearchParams("metric=raw_json"), TODAY), { error: "Invalid analysis metric." });
  assert.deepEqual(parseWhoopAnalysisRequest(new URLSearchParams("endDate=2026-02-30"), TODAY), { error: "Invalid analysis end date." });
  assert.deepEqual(parseWhoopAnalysisRequest(new URLSearchParams("endDate=2026-09-29"), TODAY), { error: "Invalid analysis end date." });
});
