import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBodyHighlightsFromWorkout,
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

  assert.deepEqual(groups, ["Shoulders", "Chest", "Triceps"]);
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
    { label: "Back", hits: 2 },
    { label: "Shoulders", hits: 2 },
    { label: "Biceps", hits: 1 },
    { label: "Calves", hits: 1 },
    { label: "Chest", hits: 1 },
    { label: "Hamstrings/Glutes", hits: 1 },
    { label: "Quads", hits: 1 },
    { label: "Triceps", hits: 1 },
  ]);
});
