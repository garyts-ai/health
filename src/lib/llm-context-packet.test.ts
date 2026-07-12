import assert from "node:assert/strict";
import test from "node:test";
import type { DailySummary } from "@/lib/insights/types";
import { buildLlmContextPacket, LLM_QUESTION_PLACEHOLDER } from "@/lib/llm-context-packet";

const summary = {
  date: "2026-07-11T12:00:00.000Z",
  physiologicalDate: "2026-07-11",
  freshness: {
    whoop: { connected: true, isStale: false, lastSyncCompletedAt: "2026-07-11T11:00:00.000Z" },
    hevy: { connected: true, isStale: false, lastSyncCompletedAt: "2026-07-11T10:00:00.000Z" },
  },
  historicalContext: { qualifier: "One year of WHOOP context available" },
  readiness: {
    recoveryScore: 76, sleepHours: 7.7, sleepVsNeedHours: -0.8, sleepPerformance: 84,
    sleepConsistency: 79, sleepEfficiency: 91, hrvRmssd: 64, hrvVs7d: 3,
    restingHeartRate: 52, restingHeartRateVs7d: -1, respiratoryRate: 14.2,
    respiratoryRateVs7d: 0.1, skinTempVs7d: 0.1, bodyWeightKg: 74.4,
    sleepStageSummary: { deepHours: 1.6, remHours: 1.9, lightHours: 4.1, awakeHours: 0.4 },
  },
  strainSummary: { score: 8.1, blurb: "Moderate day strain" },
  overnightRead: { label: "Normal night", detail: "No material overnight disruption." },
  trendSeries: {
    recovery7d: [{ dateKey: "2026-07-11", label: "Sat", value: 76 }],
    sleep7d: [{ dateKey: "2026-07-11", label: "Sat", value: 7.7 }],
    strain7d: [{ dateKey: "2026-07-11", label: "Sat", value: 8.1 }],
    load7d: [{ dateKey: "2026-07-11", label: "Sat", value: 12 }],
  },
  physiqueDecision: {
    trainingAvailability: "Train", trainingTarget: "Upper", trainingIntent: "Maintain",
    primaryDecisionReason: "Recovery supports planned work.", weeklyPaceLabel: "On pace",
    liftsNeededForGoal: 1, daysLeftInWeek: 2,
    weightTrend: { currentLb: 164, average7dLb: 163.8, weeklyDeltaLb: 0.2 },
  },
  trainingLoad: {
    hevyWorkoutCount7d: 4, hevySetCount7d: 48, hevyVolume7d: 12000,
    hevyWorkoutCountThisWeek: 3, hevySetCountThisWeek: 36,
    upperBodyDaysSince: 2, lowerBodyDaysSince: 1, pushDaysSince: 3, pullDaysSince: 2,
    weeklyMuscleVolume: [{ label: "Lats", effectiveSets: 8, hits: 2 }],
    recentWorkoutDetails: [{ startedAt: "2026-07-10", title: "Lower A", setCount: 12, durationMinutes: 55, volumeKg: 4200, exercises: [{ title: "Leg press", setSummary: "3 working sets", topSetLabel: "300 lb × 8" }] }],
  },
  activityContext: {
    displayWindowLabel: "This week", summaryLine: "Three walks logged.",
    latestSession: { sportName: "Walking", durationMinutes: 35, strain: 4.2 },
    totalSessions: 3, totalDurationMinutes: 105, totalStrain: 10.4,
  },
  recommendations: [{ category: "training", title: "Maintain upper day", why: "The week is on pace.", supportingMetrics: ["Recovery 76%"] }],
} as unknown as DailySummary;

test("context packet is bounded, data-led, and includes the minimal recommendation", () => {
  const packet = buildLlmContextPacket(summary).contextPacketText;
  assert.match(packet, /Maintain upper day/);
  assert.match(packet, /Recovery: 76%/);
  assert.match(packet, /Snapshot: 2026-07-11/);
  assert.match(packet, /Lats 8 sets/);
  assert.ok(packet.includes(LLM_QUESTION_PLACEHOLDER));
  assert.doesNotMatch(packet, /2450|meal entr|protein floor|calorie target/i);
  assert.ok(packet.length < 7000);
});
