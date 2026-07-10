"use client";

import { type CSSProperties, useEffect, useState } from "react";

const DROPS = [
  [4, 0, 1.7, 0.42], [9, -0.8, 2.3, 0.28], [15, -1.5, 1.9, 0.38],
  [21, -0.4, 2.6, 0.22], [27, -1.9, 1.8, 0.34], [33, -1.1, 2.2, 0.26],
  [39, -0.2, 1.6, 0.4], [46, -1.4, 2.5, 0.2], [52, -0.7, 1.9, 0.36],
  [58, -2.1, 2.4, 0.24], [64, -0.9, 1.7, 0.4], [70, -1.6, 2.1, 0.3],
  [76, -0.3, 2.7, 0.2], [82, -1.2, 1.8, 0.38], [88, -2.2, 2.3, 0.25],
  [94, -0.6, 1.65, 0.42],
] as const;

type RainStyle = CSSProperties & {
  "--rain-x": string;
  "--rain-delay": string;
  "--rain-duration": string;
  "--rain-opacity": number;
};

export function NeonAtmosphere() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const update = () => {
      const isPaused = document.hidden;
      setPaused(isPaused);
      document.documentElement.dataset.motionPaused = isPaused ? "true" : "false";
    };
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      document.removeEventListener("visibilitychange", update);
      delete document.documentElement.dataset.motionPaused;
    };
  }, []);

  return (
    <div className="district-atmosphere" data-paused={paused ? "true" : "false"} aria-hidden="true">
      <div className="district-atmosphere__wash" />
      <div className="district-rain">
        {DROPS.map(([x, delay, duration, opacity]) => (
          <i
            key={`${x}-${delay}`}
            style={{
              "--rain-x": `${x}%`,
              "--rain-delay": `${delay}s`,
              "--rain-duration": `${duration}s`,
              "--rain-opacity": opacity,
            } as RainStyle}
          />
        ))}
      </div>
    </div>
  );
}
