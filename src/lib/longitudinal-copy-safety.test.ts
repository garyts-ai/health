import assert from "node:assert/strict";
import test from "node:test";

import {
  assertLongitudinalCopySafe,
  assertLongitudinalStatement,
  scanLongitudinalCopy,
} from "@/lib/longitudinal-copy-safety";

test("copy safety rejects causal, coaching, diagnostic, risk, age, and inferred-exposure claims", () => {
  const banned = [
    "Recovery was lower because alcohol caused the change.",
    "You should increase steps.",
    "We recommend more sleep.",
    "This means you have a sleep disorder diagnosis.",
    "Your disease risk is low.",
    "Your biological age is 31.",
    "Lower weekend Recovery suggests alcohol.",
    "You are getting sick.",
    "You are losing muscle.",
    "Your cardiovascular health improved.",
  ];

  for (const copy of banned) {
    assert.ok(scanLongitudinalCopy(copy).length > 0, copy);
    assert.throws(() => assertLongitudinalCopySafe(copy), /Unsafe longitudinal copy/);
  }
});

test("copy safety permits direct observations, calculations, associations, limitations, and unknowns", () => {
  const allowed = [
    "Average sleep duration was 7.1 hours over the last 30 days.",
    "Resting heart rate declined by 3 bpm compared with the previous 90-day period.",
    "HRV has remained above your six-month median for 18 of the last 24 days.",
    "Alcohol-recorded nights were followed by lower Recovery on average.",
    "Post-meal movement cannot be measured; meal timing is not available.",
    "The available data does not establish why these signals changed together.",
    "Describes trends in connected data, not overall health or medical risk.",
    "This is an observational association, not a diagnosis.",
  ];

  assert.deepEqual(scanLongitudinalCopy({ allowed }), []);
  assert.doesNotThrow(() => assertLongitudinalStatement("recorded_association", allowed[3]));
});

test("copy scanner reports the nested path of unsafe generated text", () => {
  const violations = scanLongitudinalCopy({ domains: [{ summary: "You need to exercise more." }] });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].path, "copy.domains[0].summary");
  assert.equal(violations[0].rule, "coaching or recommendation");
});
