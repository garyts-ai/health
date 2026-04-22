import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBodyHighlightsFromWorkout,
  buildWeeklyBodyHighlights,
  summarizeWeeklyMuscleVolume,
  summarizeWeeklyMuscleHits,
  summarizeWorkoutMuscleGroups,
} from "@/lib/insights/body-map";

test("chest and arms workout highlights front upper body regions", () => {
  const highlights = buildBodyHighlightsFromWorkout(
    JSON.stringify({
      exercises: [
        {
          title: "Bench Press",
          sets: [{}, {}, {}, {}],
        },
        {
          title: "Cable Fly",
          sets: [{}, {}, {}],
        },
        {
          title: "Tricep Pushdown",
          sets: [{}, {}, {}],
        },
        {
          title: "Hammer Curl",
          sets: [{}, {}, {}],
        },
      ],
    }),
  );

  const regions = highlights.map((highlight) => highlight.regionId);
  assert.equal(regions.includes("chest"), true);
  assert.equal(regions.includes("triceps"), true);
  assert.equal(regions.includes("biceps"), true);
});

test("back-focused workout highlights back regions", () => {
  const highlights = buildBodyHighlightsFromWorkout(
    JSON.stringify({
      exercises: [
        {
          title: "Lat Pulldown",
          sets: [{}, {}, {}, {}],
        },
        {
          title: "Seated Row",
          sets: [{}, {}, {}, {}],
        },
        {
          title: "Face Pull",
          sets: [{}, {}, {}],
        },
      ],
    }),
  );

  const regions = highlights.map((highlight) => highlight.regionId);
  assert.equal(regions.includes("lats"), true);
  assert.equal(regions.includes("upperBack"), true);
  assert.equal(regions.includes("rearDelts"), true);
});

test("leg workout highlights lower-body regions", () => {
  const highlights = buildBodyHighlightsFromWorkout(
    JSON.stringify({
      exercises: [
        {
          title: "Back Squat",
          sets: [{}, {}, {}, {}],
        },
        {
          title: "Romanian Deadlift",
          sets: [{}, {}, {}, {}],
        },
        {
          title: "Standing Calf Raise",
          sets: [{}, {}, {}],
        },
      ],
    }),
  );

  const regions = highlights.map((highlight) => highlight.regionId);
  assert.equal(regions.includes("quads"), true);
  assert.equal(regions.includes("glutes"), true);
  assert.equal(regions.includes("hamstrings"), true);
  assert.equal(regions.includes("calves"), true);
});

test("broad fallback still highlights useful regions for unmapped exercises", () => {
  const highlights = buildBodyHighlightsFromWorkout(
    JSON.stringify({
      exercises: [
        {
          title: "Machine Push",
          sets: [{}, {}, {}],
        },
      ],
    }),
  );

  const regions = highlights.map((highlight) => highlight.regionId);
  assert.equal(regions.includes("chest"), true);
  assert.equal(regions.includes("frontDelts"), true);
});

test("summarizeWorkoutMuscleGroups rolls fine-grained regions into main weekly groups", () => {
  const groups = summarizeWorkoutMuscleGroups(
    JSON.stringify({
      exercises: [
        { title: "Lateral Raise Machine", sets: [{}, {}, {}] },
        { title: "Chest Press", sets: [{}, {}, {}] },
        { title: "Tricep Pushdown", sets: [{}, {}, {}] },
      ],
    }),
  );

  assert.deepEqual(groups, ["Side delts", "Front delts", "Rear delts", "Chest", "Triceps"]);
});

test("summarizeWeeklyMuscleHits counts each muscle group once per workout", () => {
  const weekly = summarizeWeeklyMuscleHits([
    JSON.stringify({
      exercises: [
        { title: "Chest Press", sets: [{}, {}, {}] },
        { title: "Cable Fly", sets: [{}, {}, {}] },
        { title: "Lateral Raise Machine", sets: [{}, {}, {}] },
        { title: "Tricep Pushdown", sets: [{}, {}, {}] },
      ],
    }),
    JSON.stringify({
      exercises: [
        { title: "Lat Pulldown", sets: [{}, {}, {}] },
        { title: "Seated Row", sets: [{}, {}, {}] },
        { title: "Standing Lateral Raise Machine", sets: [{}, {}, {}] },
        { title: "Curl", sets: [{}, {}, {}] },
      ],
    }),
    JSON.stringify({
      exercises: [
        { title: "Back Squat", sets: [{}, {}, {}] },
        { title: "Romanian Deadlift", sets: [{}, {}, {}] },
        { title: "Standing Calf Raise", sets: [{}, {}, {}] },
      ],
    }),
  ]);

  assert.deepEqual(weekly, [
    { label: "Front delts", hits: 2 },
    { label: "Rear delts", hits: 2 },
    { label: "Side delts", hits: 2 },
    { label: "Upper back / traps", hits: 2 },
    { label: "Biceps", hits: 1 },
    { label: "Calves", hits: 1 },
    { label: "Chest", hits: 1 },
    { label: "Hamstrings / glutes", hits: 1 },
    { label: "Lats", hits: 1 },
    { label: "Quads", hits: 1 },
    { label: "Triceps", hits: 1 },
  ]);
});

test("leg curl does not count as biceps work in weekly summaries", () => {
  const weekly = summarizeWeeklyMuscleHits([
    JSON.stringify({
      exercises: [
        { title: "Single Leg Press (Machine)", sets: [{}, {}, {}] },
        { title: "Seated Leg Curl (Machine)", sets: [{}, {}, {}] },
        { title: "Leg Extension (Machine)", sets: [{}, {}, {}] },
      ],
    }),
  ]);

  assert.deepEqual(weekly, [
    { label: "Calves", hits: 1 },
    { label: "Hamstrings / glutes", hits: 1 },
    { label: "Quads", hits: 1 },
  ]);
});

test("weekly muscle volume counts effective sets without leg curl biceps leakage", () => {
  const volume = summarizeWeeklyMuscleVolume([
    JSON.stringify({
      exercises: [
        {
          title: "Seated Leg Curl (Machine)",
          sets: [
            { type: "warmup" },
            { type: "normal" },
            { type: "normal" },
            { type: "normal" },
          ],
        },
        {
          title: "Hammer Curl",
          sets: [{ type: "normal" }, { type: "normal" }],
        },
      ],
    }),
  ]);

  const hamstrings = volume.find((group) => group.label === "Hamstrings / glutes");
  const biceps = volume.find((group) => group.label === "Biceps");

  assert.equal(hamstrings?.effectiveSets, 4.5);
  assert.equal(biceps?.effectiveSets, 2);
});

test("buildWeeklyBodyHighlights maps weekly hit counts to low medium and high tiers", () => {
  const highlights = buildWeeklyBodyHighlights([
    JSON.stringify({
      exercises: [
        { title: "Chest Press", sets: [{}, {}, {}] },
        { title: "Lat Pulldown", sets: [{}, {}, {}] },
      ],
    }),
    JSON.stringify({
      exercises: [
        { title: "Chest Press", sets: [{}, {}, {}] },
        { title: "Lat Pulldown", sets: [{}, {}, {}] },
        { title: "Lateral Raise Machine", sets: [{}, {}, {}] },
      ],
    }),
    JSON.stringify({
      exercises: [
        { title: "Lat Pulldown", sets: [{}, {}, {}] },
      ],
    }),
  ]);

  const chest = highlights.find((highlight) => highlight.regionId === "chest");
  const lats = highlights.find((highlight) => highlight.regionId === "lats");
  const shoulder = highlights.find((highlight) => highlight.regionId === "sideDelts");

  assert.equal(chest?.intensity, "medium");
  assert.equal(lats?.intensity, "high");
  assert.equal(shoulder?.intensity, "low");
});
