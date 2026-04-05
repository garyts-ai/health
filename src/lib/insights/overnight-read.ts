import type {
  DailyLateNightDisruption,
  DailyOvernightRead,
  DailyReadiness,
  DailyStressFlags,
  RecommendationConfidence,
} from "@/lib/insights/types";

function maxNumber(...values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === "number");
  if (filtered.length === 0) {
    return null;
  }
  return Math.max(...filtered);
}

const NEW_YORK_TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function getLateSleepSignal(startIso: string | null) {
  if (!startIso) {
    return { isLate: false, formatted: null };
  }

  const start = new Date(startIso);
  const newYorkHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(start),
  );

  return {
    isLate: newYorkHour >= 1 && newYorkHour <= 7,
    formatted: NEW_YORK_TIME.format(start),
  };
}

export function deriveLateNightDisruption(
  readiness: DailyReadiness,
  stressFlags: DailyStressFlags,
): DailyLateNightDisruption {
  let signalScore = 0;
  const supportingMetrics: string[] = [];

  if ((readiness.sleepPerformance ?? 100) <= 55) {
    signalScore += 2;
    supportingMetrics.push(`Sleep performance ${readiness.sleepPerformance}%`);
  } else if ((readiness.sleepPerformance ?? 100) <= 72) {
    signalScore += 1;
    supportingMetrics.push(`Sleep performance ${readiness.sleepPerformance}%`);
  }

  if ((readiness.sleepConsistency ?? 100) <= 55) {
    signalScore += 2;
    supportingMetrics.push(`Sleep consistency ${readiness.sleepConsistency}%`);
  } else if ((readiness.sleepConsistency ?? 100) <= 70) {
    signalScore += 1;
    supportingMetrics.push(`Sleep consistency ${readiness.sleepConsistency}%`);
  }

  if ((readiness.sleepEfficiency ?? 100) <= 78) {
    signalScore += 1;
    supportingMetrics.push(`Sleep efficiency ${readiness.sleepEfficiency}%`);
  }

  if ((readiness.awakeHours ?? 0) >= 1.1) {
    signalScore += 1;
    supportingMetrics.push(`Awake ${readiness.awakeHours?.toFixed(1)}h overnight`);
  }

  if ((readiness.recoveryScore ?? 100) <= 25) {
    signalScore += 3;
    supportingMetrics.push(`Recovery ${readiness.recoveryScore}%`);
  } else if ((readiness.recoveryScore ?? 100) <= 45) {
    signalScore += 2;
    supportingMetrics.push(`Recovery ${readiness.recoveryScore}%`);
  }

  if ((readiness.restingHeartRateVs7d ?? 0) >= 8) {
    signalScore += 2;
    supportingMetrics.push(`RHR +${readiness.restingHeartRateVs7d}`);
  } else if ((readiness.restingHeartRateVs7d ?? 0) >= 4) {
    signalScore += 1;
    supportingMetrics.push(`RHR +${readiness.restingHeartRateVs7d}`);
  }

  if ((readiness.hrvVs7d ?? 0) <= -20) {
    signalScore += 2;
    supportingMetrics.push(`HRV ${readiness.hrvVs7d}`);
  } else if ((readiness.hrvVs7d ?? 0) <= -8) {
    signalScore += 1;
    supportingMetrics.push(`HRV ${readiness.hrvVs7d}`);
  }

  const illnessPressure = maxNumber(
    readiness.respiratoryRateVs7d,
    readiness.skinTempVs7d,
  );
  const illnessMarkers =
    Number((readiness.respiratoryRateVs7d ?? 0) >= 0.3) +
    Number((readiness.skinTempVs7d ?? 0) >= 0.3);
  const illnessLike =
    illnessMarkers >= 2 ||
    ((readiness.respiratoryRateVs7d ?? 0) >= 0.35 && (readiness.recoveryScore ?? 100) <= 35) ||
    ((readiness.skinTempVs7d ?? 0) >= 0.35 && (readiness.recoveryScore ?? 100) <= 35);
  const hangoverLike =
    signalScore >= 5 &&
    !illnessLike &&
    (readiness.sleepConsistency ?? 100) <= 70 &&
    (readiness.restingHeartRateVs7d ?? 0) >= 4;

  const active = signalScore >= 5 || ((readiness.recoveryScore ?? 100) <= 20 && signalScore >= 4);
  const severity: DailyLateNightDisruption["severity"] =
    signalScore >= 7 ? "high" : signalScore >= 5 ? "medium" : "low";
  const confidence: RecommendationConfidence =
    signalScore >= 7 ? "high" : signalScore >= 5 ? "medium" : "low";

  if (!active) {
    return {
      active: false,
      severity: "low",
      confidence: "low",
      likelyLane: "normal",
      headline: "Normal night",
      blurb: "Overnight sleep and recovery do not show a strong disruption pattern.",
      supportingMetrics: [],
    };
  }

  const likelyLane: DailyLateNightDisruption["likelyLane"] = illnessLike
    ? "illness_like"
    : hangoverLike
      ? "hangover_like"
      : "unclear";

  const headline =
    likelyLane === "illness_like"
      ? "Likely sick"
      : likelyLane === "hangover_like"
        ? "Likely went out"
        : "Disrupted night";

  const blurb =
    likelyLane === "illness_like"
      ? "Recovery took a clear overnight hit and the physiology leans more illness-like than just a rough night."
      : likelyLane === "hangover_like"
        ? "Sleep and recovery took a sharp overnight hit that looks more like a late-night / going-out pattern than a clean illness signature."
        : "Sleep and recovery took a clear overnight hit, but the cause is not cleanly separable from WHOOP data alone.";

  if (illnessPressure !== null && illnessLike) {
    supportingMetrics.push(`Illness markers +${illnessPressure.toFixed(1)}`);
  }
  if (stressFlags.illnessRisk && likelyLane !== "illness_like") {
    supportingMetrics.push("Some illness-like drift is present too");
  }

  return {
    active,
    severity,
    confidence,
    likelyLane,
    headline,
    blurb,
    supportingMetrics: supportingMetrics.slice(0, 5),
  };
}

export function buildOvernightRead(
  disruption: DailyLateNightDisruption,
  readiness: DailyReadiness,
): DailyOvernightRead {
  const lateSleep = getLateSleepSignal(readiness.latestSleepStart);
  const shortSleep = (readiness.sleepHours ?? 0) < 7;

  if (!disruption.active) {
    const label =
      (readiness.sleepPerformance ?? 100) < 78 || (readiness.recoveryScore ?? 100) < 55
        ? "Recovery hit"
        : "Normal night";
    return {
      label,
      tone: label === "Normal night" ? "normal" : "caution",
      detail:
        label === "Normal night"
          ? "Sleep and recovery stayed close to baseline overnight"
          : "Last night landed below baseline, but not enough to call it a major disruption",
      lane: "normal",
    };
  }

  if (disruption.likelyLane === "hangover_like") {
    return {
      label: shortSleep
        ? `Alcohol + ${readiness.sleepHours?.toFixed(1) ?? "--"}h sleep`
        : lateSleep.isLate
          ? "Alcohol + late sleep"
          : "Alcohol disruption",
      tone: "warning",
      detail: shortSleep
        ? `Slept ${readiness.sleepHours?.toFixed(1) ?? "--"}h and recovery took a clear hit`
        : lateSleep.isLate && lateSleep.formatted
          ? `Sleep started around ${lateSleep.formatted} and recovery took a clear hit`
          : "Sleep and recovery took a clear hit overnight",
      lane: disruption.likelyLane,
    };
  }

  if (disruption.likelyLane === "illness_like") {
    return {
      label: "Possible illness disruption",
      tone: "danger",
      detail: "Respiratory and recovery markers look off today",
      lane: disruption.likelyLane,
    };
  }

  return {
    label: lateSleep.isLate ? "Late sleep disruption" : "Disrupted night",
    tone: disruption.severity === "high" ? "warning" : "caution",
    detail:
      lateSleep.isLate && lateSleep.formatted
        ? `Sleep started around ${lateSleep.formatted} and recovery looks off today`
        : "Sleep timing and recovery suggest a rough night",
    lane: disruption.likelyLane,
  };
}
