"use client";

import { useState } from "react";
import { AnatomyFigure, type AnatomyFigureProps } from "@/components/anatomy-figure";

export function AnatomyProfileSwitcher({
  defaultView = "front",
  figureProps,
}: {
  defaultView?: "front" | "back";
  figureProps: Omit<AnatomyFigureProps, "view">;
}) {
  const [view, setView] = useState<"front" | "back">(defaultView);

  return (
    <div className="training-profile-switcher">
      <div className="training-profile-switcher__controls" aria-label="Anatomy view">
        {(["front", "back"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => setView(option)}
          >
            {option === "front" ? "Front" : "Back"}
          </button>
        ))}
      </div>
      <div className="training-profile-switcher__stage" data-view={view}>
        <div data-anatomy-view={view}>
          <AnatomyFigure {...figureProps} view={view} />
        </div>
      </div>
    </div>
  );
}
