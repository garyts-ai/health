import type { ReadinessBaseline, ReadinessSnapshot, ObservationEnvelope } from "./readiness-snapshot";
import type {
  DailyHistoricalContext,
  DailyPhysiqueDecision,
  DecisionEvidence,
  DecisionRuleTrace,
  EvidenceObservation,
} from "./types";

function ageHours(decisionAt: string, observedAt: string | null) {
  if (!observedAt) return null;
  const decisionTime = Date.parse(decisionAt);
  const observedTime = Date.parse(observedAt);
  if (!Number.isFinite(decisionTime) || !Number.isFinite(observedTime)) return null;
  return Math.max(0, Math.round(((decisionTime - observedTime) / 3_600_000) * 10) / 10);
}

function sourceLabel(source: ObservationEnvelope<unknown>["source"]): EvidenceObservation["source"] {
  switch (source) {
    case "whoop_export":
      return "WHOOP export";
    case "hevy":
      return "Hevy";
    case "derived":
      return "Derived";
    default:
      return "WHOOP live API";
  }
}

function baselineCopy(baseline: ReadinessBaseline | null) {
  if (!baseline) return null;
  return {
    value: baseline.value,
    sampleCount: baseline.sampleCount,
    windowSize: baseline.windowSize,
    status: baseline.status,
  };
}

function observation<T>(
  snapshot: ReadinessSnapshot,
  key: string,
  label: string,
  envelope: ObservationEnvelope<T>,
  value: number | string | null,
  unit: string | null,
  baseline: ReadinessBaseline | null = null,
): EvidenceObservation {
  const missingValue = value === null;
  return {
    key,
    label,
    value,
    unit,
    source: sourceLabel(envelope.source),
    observedAt: envelope.observedAt,
    ageHours: ageHours(snapshot.decisionAt, envelope.observedAt),
    status: missingValue && envelope.status === "valid" ? "missing" : envelope.status,
    reason:
      envelope.reason ?? (missingValue ? "missing" : null),
    baseline: baselineCopy(baseline),
  };
}

function sleepHours(snapshot: ReadinessSnapshot) {
  const sleep = snapshot.sleep.value;
  if (!sleep) return null;
  const millis = [
    sleep.totalLightSleepTimeMilli,
    sleep.totalSlowWaveSleepTimeMilli,
    sleep.totalRemSleepTimeMilli,
  ].filter((value): value is number => typeof value === "number");
  return millis.length ? Math.round((millis.reduce((sum, value) => sum + value, 0) / 3_600_000) * 10) / 10 : null;
}

function ruleTrace(
  snapshot: ReadinessSnapshot,
  decision: DailyPhysiqueDecision,
  historicalContext?: DailyHistoricalContext,
  historicalApplied = false,
): DecisionRuleTrace[] {
  const traces: DecisionRuleTrace[] = [
    snapshot.status === "available"
      ? {
          label: "Coherent scored observation",
          outcome: "applied",
          detail: `Sleep, recovery, and cycle ${snapshot.cycleId ?? "--"} are current and scored.`,
        }
      : {
          label: "Coherent scored observation",
          outcome: "unavailable",
          detail: `Readiness was withheld: ${snapshot.reasons.join(", ") || "missing"}.`,
        },
  ];

  const weeklyPressure = decision.decisionFactors.find((factor) => factor.label === "Weekly lift goal");
  traces.push(
    snapshot.status === "unavailable"
      ? {
          label: "Readiness safety guard",
          outcome: "applied",
          detail: "Unavailable physiology caps the recommendation at Maintain and Rest.",
        }
      : {
          label: "Readiness safety guard",
          outcome: "not_applied",
          detail: "Current physiology was available for the normal decision rules.",
        },
  );

  traces.push(
    weeklyPressure
      ? {
          label: "Weekly pressure",
          outcome: snapshot.status === "unavailable" || decision.trainingAvailability === "Rest" ? "not_applied" : "applied",
          detail: weeklyPressure.detail,
        }
      : {
          label: "Weekly pressure",
          outcome: "unavailable",
          detail: "No weekly pressure factor was recorded.",
        },
  );

  traces.push(
    historicalApplied
      ? {
          label: "Historical direction",
          outcome: "applied",
          detail: historicalContext?.strongestDeviation ?? "An unfavorable historical deviation moderated the decision.",
        }
      : historicalContext?.available
        ? {
            label: "Historical direction",
            outcome: "not_applied",
            detail: historicalContext.strongestDeviation ?? "No unfavorable historical deviation was applied.",
          }
        : {
            label: "Historical direction",
            outcome: "unavailable",
            detail: "No usable historical context was available.",
          },
  );

  return traces;
}

export function buildDecisionEvidence(
  snapshot: ReadinessSnapshot,
  decision: DailyPhysiqueDecision,
  historicalContext?: DailyHistoricalContext,
  historicalApplied = false,
): DecisionEvidence {
  const sleep = snapshot.sleep.value;
  const recovery = snapshot.recovery.value;
  const cycle = snapshot.cycle.value;
  const observations: EvidenceObservation[] = [
    observation(snapshot, "recoveryScore", "Recovery score", snapshot.recovery, recovery?.recoveryScore ?? null, "%", snapshot.baselines.recoveryScore),
    observation(snapshot, "sleepPerformance", "Sleep performance", snapshot.sleep, sleep?.sleepPerformancePercentage ?? null, "%", null),
    observation(snapshot, "sleepHours", "Actual sleep", snapshot.sleep, sleepHours(snapshot), "hours", null),
    observation(snapshot, "respiratoryRate", "Respiratory rate", snapshot.sleep, sleep?.respiratoryRate ?? null, "brpm", snapshot.baselines.respiratoryRate),
    observation(snapshot, "restingHeartRate", "Resting heart rate", snapshot.recovery, recovery?.restingHeartRate ?? null, "bpm", snapshot.baselines.restingHeartRate),
    observation(snapshot, "hrvRmssd", "HRV (rMSSD)", snapshot.recovery, recovery?.hrvRmssdMilli ?? null, "ms", snapshot.baselines.hrvRmssd),
    observation(snapshot, "spo2Percentage", "Blood oxygen", snapshot.recovery, recovery?.spo2Percentage ?? null, "%", snapshot.baselines.spo2Percentage),
    observation(snapshot, "skinTempCelsius", "Skin temperature", snapshot.recovery, recovery?.skinTempCelsius ?? null, "°C", snapshot.baselines.skinTempCelsius),
    observation(snapshot, "strain", "Cycle strain", snapshot.cycle, cycle?.strain ?? null, "strain", snapshot.baselines.strain),
  ];

  const availableBaselines = Object.values(snapshot.baselines).filter((item) => item.status === "available").length;
  const confidence = snapshot.status === "unavailable" ? "low" : availableBaselines >= 4 ? "high" : availableBaselines >= 1 ? "medium" : "low";

  return {
    decisionAt: snapshot.decisionAt,
    readinessStatus: snapshot.status,
    confidence,
    observations,
    ruleTrace: ruleTrace(snapshot, decision, historicalContext, historicalApplied),
  };
}
