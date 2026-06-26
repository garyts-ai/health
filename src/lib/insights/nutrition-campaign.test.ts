import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCancunCampaign,
  detectBloatContext,
  proteinCoachingStatus,
} from "@/lib/insights/nutrition-campaign";

function observations(current: number[], previous: number[], today = "2026-06-25") {
  const anchor = new Date(`${today}T12:00:00.000Z`);
  return [
    ...current.map((weightLb, index) => ({
      date: new Date(anchor.getTime() - index * 86_400_000).toISOString(),
      weightLb,
    })),
    ...previous.map((weightLb, index) => ({
      date: new Date(anchor.getTime() - (7 + index) * 86_400_000).toISOString(),
      weightLb,
    })),
  ];
}

test("uses weight-band training and rest targets with a qualified steady loss rate", () => {
  const campaign = buildCancunCampaign({
    now: new Date("2026-06-25T14:00:00.000Z"),
    observations: observations([164, 164.2, 164.1, 164.3], [164.7, 164.8, 164.6, 164.7]),
    isTrainingDay: true,
  });
  assert.equal(campaign.phase, "cut");
  assert.equal(campaign.trainingDayCalorieTarget, 2450);
  assert.equal(campaign.restDayCalorieTarget, 2250);
  assert.equal(campaign.proteinTargetG, 160);
  assert.equal(campaign.proteinMinimumG, 140);
});

test("adds 150 calories when qualified loss exceeds 1.25 lb per week", () => {
  const campaign = buildCancunCampaign({
    now: new Date("2026-06-25T14:00:00.000Z"),
    observations: observations([163, 163.1, 163.2, 163.1], [164.8, 164.9, 164.7, 164.8]),
    isTrainingDay: false,
  });
  assert.equal(campaign.calorieAdjustment, 150);
  assert.equal(campaign.restDayCalorieTarget, 2400);
});

test("does not lower calories for an unverified plateau", () => {
  const campaign = buildCancunCampaign({
    now: new Date("2026-06-25T14:00:00.000Z"),
    observations: observations([164, 164, 164, 164], [164.1, 164, 164.1, 164]),
    isTrainingDay: false,
  });
  assert.equal(campaign.calorieAdjustment, 0);
  assert.match(campaign.plateauCue ?? "", /Audit oils/);
});

test("requires four observations in both windows before qualifying loss rate", () => {
  const campaign = buildCancunCampaign({
    now: new Date("2026-06-25T14:00:00.000Z"),
    observations: observations([164, 164.1, 164.2], [165, 165.1, 165.2, 165.3]),
    isTrainingDay: false,
  });
  assert.equal(campaign.qualifiedLossRateLbPerWeek, null);
});

test("enters sharpening after three stable rolling averages in goal range", () => {
  const campaign = buildCancunCampaign({
    now: new Date("2026-07-05T14:00:00.000Z"),
    observations: observations(
      [161.8, 161.9, 161.7, 161.8, 161.9, 161.8, 161.7],
      [162.3, 162.4, 162.2, 162.3],
      "2026-07-05",
    ),
    isTrainingDay: true,
  });
  assert.equal(campaign.goalRangeStableDays, 3);
  assert.equal(campaign.phase, "sharpening");
  assert.equal(campaign.trainingDayCalorieTarget, 2500);
});

test("protects sub-160 weight with sharpening calories", () => {
  const campaign = buildCancunCampaign({
    now: new Date("2026-07-06T14:00:00.000Z"),
    observations: observations([159.8, 159.9, 160, 159.7], [160.5, 160.6, 160.4, 160.5], "2026-07-06"),
    isTrainingDay: false,
  });
  assert.equal(campaign.phase, "sharpening");
  assert.equal(campaign.restDayCalorieTarget, 2300);
});

test("final week prevents the low weight band from dropping below standard calories", () => {
  const campaign = buildCancunCampaign({
    now: new Date("2026-07-12T14:00:00.000Z"),
    observations: observations([160.5, 160.5, 160.5, 164], [165, 165, 157, 161], "2026-07-12"),
    isTrainingDay: false,
  });
  assert.equal(campaign.phase, "final_week");
  assert.equal(campaign.restDayCalorieTarget, 2250);
});

test("campaign expires after July 17", () => {
  const campaign = buildCancunCampaign({
    now: new Date("2026-07-18T14:00:00.000Z"),
    observations: [],
    isTrainingDay: false,
  });
  assert.equal(campaign.active, false);
  assert.equal(campaign.phase, "complete");
});

test("protein coaching distinguishes minimum, target gap, and completion", () => {
  assert.equal(proteinCoachingStatus(139), "below_minimum");
  assert.equal(proteinCoachingStatus(150), "below_target");
  assert.equal(proteinCoachingStatus(160), "complete");
});

test("bloat context detects large, late, trigger-food, dairy-stack, and final-week cases", () => {
  const base = {
    note: null,
    calories: 400,
    fatG: 10,
    loggedAt: "2026-06-25T16:00:00.000Z",
  };
  assert.equal(detectBloatContext([{ ...base, label: "garlic broccoli" }], false).triggerFood, true);
  assert.equal(detectBloatContext([{ ...base, label: "steak", calories: 900 }], false).largeOrFatMeal, true);
  assert.equal(
    detectBloatContext(
      [{ ...base, label: "Greek yogurt" }, { ...base, label: "kefir" }],
      false,
    ).dairyStack,
    true,
  );
  assert.equal(
    detectBloatContext(
      [{ ...base, label: "rice", loggedAt: "2026-06-26T01:30:00.000Z" }],
      false,
    ).lateMeal,
    true,
  );
  assert.equal(detectBloatContext([], true).active, true);
});
