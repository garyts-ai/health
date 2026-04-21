import { ImageResponse } from "next/og";

import {
  buildLlmHandoff,
  formatHandoffDate,
  handoffMetric,
  truncateHandoff,
} from "@/lib/daily-brief-shared";
import type { DailySummary } from "@/lib/insights/types";
import { formatPounds, kilogramsToPounds } from "@/lib/units";

export { buildLlmHandoff } from "@/lib/daily-brief-shared";

export function buildDiscordSummaryText(summary: DailySummary) {
  const handoff = buildLlmHandoff(summary);
  const weeklyFocusText =
    handoff.weeklyMuscleFocus.length > 0
      ? handoff.weeklyMuscleFocus
          .slice(0, 4)
          .map((group) => `${group.label} ${group.hits}x`)
          .join(", ")
      : "No recent lifting logged";

  return [
    `**Daily Health Brief - ${formatHandoffDate(summary.date)}**`,
    `Decision: Train ${summary.physiqueDecision.trainingTarget} | ${summary.physiqueDecision.trainingIntent === "Push" ? "Progress" : summary.physiqueDecision.trainingIntent} intensity | ${summary.physiqueDecision.intensityLabel}`,
    `Session anchors: ${summary.physiqueDecision.sessionAnchors.length > 0 ? summary.physiqueDecision.sessionAnchors.slice(0, 4).join(", ") : "Use planned main lifts"}`,
    `Nutrition: ${summary.physiqueDecision.calorieTargetLabel} (${summary.physiqueDecision.calorieRecommendation}) | Protein ${summary.physiqueDecision.proteinTargetLabel}`,
    `Recovery ${handoffMetric(summary.readiness.recoveryScore, "%")} | Sleep ${handoffMetric(summary.readiness.sleepHours, "h", 1)} (${handoffMetric(summary.readiness.sleepVsNeedHours, "h", 1)} vs need) | Strain ${handoffMetric(summary.strainSummary.score, "", 1)}`,
    `Overnight read: ${summary.overnightRead.label} | ${summary.overnightRead.detail}`,
    `Weekly muscle focus: ${weeklyFocusText} | ${summary.trainingLoad.hevyWorkoutCountThisWeek} workouts this week`,
    `Weekly effective sets: ${summary.trainingLoad.weeklyMuscleVolume.length > 0 ? summary.trainingLoad.weeklyMuscleVolume.slice(0, 6).map((group) => `${group.label} ${group.effectiveSets}`).join(", ") : "none logged"}`,
    `Strength: ${summary.physiqueDecision.strengthProgression.length > 0 ? summary.physiqueDecision.strengthProgression.slice(0, 3).map((lift) => `${lift.exercise} ${lift.deltaLabel}`).join(", ") : "repeat lift history needed"}`,
    `Latest session: ${summary.trainingLoad.hevyLastWorkoutTitle ?? "None logged"} | ${handoff.latestLiftFocus.length > 0 ? handoff.latestLiftFocus.slice(0, 4).join(", ") : "No recent focus logged"}`,
    `Body weight: ${formatPounds(kilogramsToPounds(summary.readiness.bodyWeightKg))} | ${handoff.bodyWeightTrendLabel}`,
    `Prompt: ${handoff.llmQuestion}`,
    "_Attached image is optimized for quick review and fresh LLM judgment._",
  ].join("\n");
}

function InfoCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "rgba(255,255,255,0.97)",
        borderRadius: 28,
        padding: "28px 30px",
        minWidth: 0,
        flex: 1,
      }}
    >
      <div
        style={{
          fontSize: 22,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#66705f",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 52,
          fontWeight: 800,
          color: "#141912",
          lineHeight: 1.05,
          whiteSpace: "pre-line",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 22, color: "#4f5b4c", lineHeight: 1.4 }}>{detail}</div>
    </div>
  );
}

export function createDailyBriefImage(summary: DailySummary) {
  const handoff = buildLlmHandoff(summary);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "linear-gradient(180deg, #f4f8ef 0%, #eef3e8 34%, #153020 34%, #153020 100%)",
          fontFamily: "Arial, sans-serif",
          color: "#111713",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            padding: "52px",
            gap: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                maxWidth: "940px",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  color: "#688d27",
                  fontWeight: 800,
                }}
              >
                Daily Health Brief
              </div>
              <div style={{ fontSize: 64, lineHeight: 1.02, fontWeight: 800 }}>
                {handoff.headline}
              </div>
              <div style={{ fontSize: 24, lineHeight: 1.45, color: "#51604f" }}>
                {truncateHandoff(handoff.subheadline, 196)}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                alignItems: "flex-end",
                textAlign: "right",
                minWidth: "220px",
              }}
            >
              <div
                style={{
                  background: "#111713",
                  color: "#f4f7ef",
                  padding: "18px 22px",
                  borderRadius: "24px",
                  fontSize: "18px",
                  fontWeight: 700,
                }}
              >
                {formatHandoffDate(summary.date)}
              </div>
              <div style={{ fontSize: 20, color: "#5a6956" }}>WHOOP + Hevy snapshot</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {handoff.metricCards.map((card) => (
              <InfoCard
                key={card.label}
                label={card.label}
                value={card.value}
                detail={card.detail}
              />
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              borderRadius: "34px",
              padding: "34px",
              background: "linear-gradient(160deg, #112518 0%, #203726 100%)",
              color: "#f3f7ee",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: "#bbf451",
                  fontWeight: 700,
                }}
              >
                Training Context
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                Recent load and recency cues for local decision-making
              </div>
            </div>

            <div style={{ display: "flex", gap: "18px" }}>
              {handoff.trainingContextCards.map((card) => (
                <InfoCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  detail={card.detail}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              marginTop: "auto",
              borderRadius: "28px",
              background: "#f4f7ef",
              padding: "24px 28px",
              color: "#2d342d",
            }}
          >
            <div
              style={{
                fontSize: 18,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "#688d27",
                fontWeight: 700,
              }}
            >
              Ask the LLM
            </div>
            <div style={{ fontSize: "24px", lineHeight: 1.45 }}>{handoff.llmQuestion}</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1600,
      height: 1800,
    },
  );
}
