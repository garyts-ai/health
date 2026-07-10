import { AnatomyProfileSwitcher } from "@/components/anatomy-profile-switcher";
import { anatomyRegionView } from "@/lib/anatomy-regions";
import type { BodyHighlight } from "@/lib/insights/types";

type WeeklyVolume = {
  label: string;
  effectiveSets: number;
  hits: number;
};

type TrainingMapProps = {
  weeklyHighlights: BodyHighlight[];
  latestHighlights: BodyHighlight[];
  weeklyVolume: WeeklyVolume[];
  latestWorkout: string;
  latestSessionAge?: string;
  workoutCount?: number;
  emptyMessage?: string;
  note?: string | null;
  variant?: "page" | "dashboard" | "preview" | "profile";
};

function tierLabel(hits: number) {
  if (hits >= 3) return "high";
  if (hits >= 2) return "medium";
  return "low";
}

export async function TrainingMap({
  weeklyHighlights,
  latestHighlights,
  weeklyVolume,
  latestWorkout,
  latestSessionAge,
  workoutCount,
  emptyMessage = "No lifts logged yet this week",
  note,
  variant = "dashboard",
}: TrainingMapProps) {
  const hasWeeklyExposure = weeklyHighlights.length > 0;
  const hasLatestOverlay = latestHighlights.length > 0;
  const hasActiveRegions = hasWeeklyExposure || hasLatestOverlay;
  const visibleVolume = weeklyVolume.slice(0, variant === "preview" ? 4 : 7);
  const backLatestCount = latestHighlights.filter(
    (highlight) => anatomyRegionView(highlight.regionId) === "back",
  ).length;
  const defaultView = backLatestCount > latestHighlights.length / 2 ? "back" : "front";
  const statusLine = hasWeeklyExposure
    ? `${typeof workoutCount === "number" ? `${workoutCount} lifts` : "Monday–Sunday"} · latest ${latestSessionAge ?? "session"}`
    : "Waiting for this week’s first lift";

  const figureProps = {
    weeklyHighlights,
    latestHighlights,
    motionMode: hasActiveRegions ? "charged" as const : "static" as const,
    className: "training-profile-figure",
    preload: variant === "profile",
  };

  return (
    <section
      className="training-profile"
      data-active={hasActiveRegions ? "true" : "false"}
      data-variant={variant}
      aria-labelledby="training-profile-title"
    >
      <header className="training-profile__header">
        <div>
          <h2 id="training-profile-title">Training core / profile</h2>
          <p>{statusLine}</p>
        </div>
        <span className="training-profile__online">
          {hasActiveRegions ? "Online" : "Standby"}
        </span>
      </header>

      <div className="training-profile__visual">
        <div className="training-profile__rings" aria-hidden="true" />
        <AnatomyProfileSwitcher
          defaultView={defaultView}
          figureProps={figureProps}
        />
      </div>

      <div className="training-profile__latest">
        <span>{hasLatestOverlay ? "Latest session" : "Last logged"}</span>
        <strong>{latestWorkout}</strong>
        <p>{note ?? statusLine}</p>
      </div>

      <div className="training-profile__legend" aria-label="Training map legend">
        <span data-tone="low">1×</span>
        <span data-tone="medium">2×</span>
        <span data-tone="high">3×+</span>
        <span data-tone="latest">Latest</span>
      </div>

      <div className="training-profile__volume">
        <div className="training-profile__volume-heading">
          <h3>Weekly muscle volume</h3>
          <span>sets / frequency</span>
        </div>
        {visibleVolume.length ? (
          <dl>
            {visibleVolume.map((item) => (
              <div key={item.label} data-tier={tierLabel(item.hits)}>
                <dt>{item.label}</dt>
                <dd>{item.effectiveSets} / {item.hits}×</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="training-profile__empty">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
