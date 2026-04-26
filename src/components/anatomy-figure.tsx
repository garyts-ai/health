import { renderToString } from "@vue/server-renderer";
import { HumanMuscleAnatomy } from "@lucawahlen/vue-human-muscle-anatomy";
import { createSSRApp, h } from "vue";
import type { CSSProperties } from "react";

import type { BodyHighlight, BodyHighlightIntensity, BodyRegionId } from "@/lib/insights/types";

type AnatomyFigureProps = {
  highlights?: BodyHighlight[];
  weeklyHighlights?: BodyHighlight[];
  latestHighlights?: BodyHighlight[];
  className?: string;
  mode?: "svg" | "instrument";
};

export type AnatomyFigureImageLayer = {
  svg: string;
  opacity?: number;
  filter?: string;
};

type MuscleGroup =
  | "chest"
  | "lats"
  | "traps"
  | "rotatorCuffs"
  | "lowerBack"
  | "frontDelts"
  | "sideDelts"
  | "rearDelts"
  | "triceps"
  | "biceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "adductors"
  | "abductors"
  | "calves"
  | "neck";

type RegionLayer = {
  regionId: BodyRegionId;
  intensity: BodyHighlightIntensity;
  svg: string;
  index: number;
  motion: {
    x: number;
    y: number;
    scale: number;
  };
};

type RegionLayerStyle = CSSProperties & Record<`--${string}`, string | number>;

const INTENSITY_WEIGHT: Record<BodyHighlightIntensity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const INTENSITY_COLOR: Record<BodyHighlightIntensity, string> = {
  low: "#b5abff",
  medium: "#ff8e7a",
  high: "#ff5e86",
};

const REGION_TO_MUSCLE_GROUPS: Record<BodyRegionId, MuscleGroup[]> = {
  chest: ["chest"],
  frontDelts: ["frontDelts"],
  sideDelts: ["sideDelts"],
  rearDelts: ["rearDelts"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearms"],
  lats: ["lats"],
  upperBack: ["traps", "rotatorCuffs"],
  traps: ["traps", "neck"],
  abs: ["abs"],
  obliques: ["obliques"],
  glutes: ["glutes"],
  quads: ["quads"],
  adductors: ["adductors"],
  hamstrings: ["hamstrings"],
  calves: ["calves"],
};

const REGION_ASSEMBLY_ORDER: BodyRegionId[] = [
  "chest",
  "glutes",
  "quads",
  "hamstrings",
  "lats",
  "upperBack",
  "traps",
  "frontDelts",
  "sideDelts",
  "rearDelts",
  "triceps",
  "biceps",
  "adductors",
  "abs",
  "obliques",
  "forearms",
  "calves",
];

const REGION_MOTION: Record<BodyRegionId, RegionLayer["motion"]> = {
  chest: { x: 0, y: -28, scale: 1.14 },
  frontDelts: { x: -42, y: -14, scale: 1.11 },
  sideDelts: { x: 42, y: -12, scale: 1.12 },
  rearDelts: { x: 38, y: -16, scale: 1.12 },
  biceps: { x: -54, y: 2, scale: 1.12 },
  triceps: { x: 54, y: 2, scale: 1.12 },
  forearms: { x: -58, y: 22, scale: 1.1 },
  lats: { x: 36, y: -4, scale: 1.12 },
  upperBack: { x: 0, y: -34, scale: 1.13 },
  traps: { x: 0, y: -42, scale: 1.12 },
  abs: { x: 0, y: 18, scale: 1.1 },
  obliques: { x: -28, y: 18, scale: 1.1 },
  glutes: { x: 0, y: 34, scale: 1.13 },
  quads: { x: -18, y: 52, scale: 1.13 },
  adductors: { x: 16, y: 54, scale: 1.12 },
  hamstrings: { x: 22, y: 50, scale: 1.13 },
  calves: { x: 0, y: 68, scale: 1.11 },
};

function resolveRegionHighlights(highlights: BodyHighlight[]) {
  const regions = new Map<BodyRegionId, BodyHighlightIntensity>();

  for (const highlight of highlights) {
    const existing = regions.get(highlight.regionId);
    if (
      existing === undefined ||
      INTENSITY_WEIGHT[highlight.intensity] > INTENSITY_WEIGHT[existing]
    ) {
      regions.set(highlight.regionId, highlight.intensity);
    }
  }

  return [...regions.entries()].sort(
    ([a], [b]) => REGION_ASSEMBLY_ORDER.indexOf(a) - REGION_ASSEMBLY_ORDER.indexOf(b),
  );
}

function assignGroups(highlights: BodyHighlight[]) {
  const priority = new Map<MuscleGroup, BodyHighlightIntensity>();

  for (const highlight of highlights) {
    const groups = REGION_TO_MUSCLE_GROUPS[highlight.regionId] ?? [];

    for (const group of groups) {
      const existing = priority.get(group);
      if (
        existing === undefined ||
        INTENSITY_WEIGHT[highlight.intensity] > INTENSITY_WEIGHT[existing]
      ) {
        priority.set(group, highlight.intensity);
      }
    }
  }

  const low: MuscleGroup[] = [];
  const primary: MuscleGroup[] = [];
  const secondary: MuscleGroup[] = [];

  for (const [group, intensity] of priority.entries()) {
    if (intensity === "high") {
      primary.push(group);
    } else if (intensity === "medium") {
      secondary.push(group);
    } else {
      low.push(group);
    }
  }

  return { primary, secondary, low };
}

function normalizeSvgMarkup(svg: string, className: string) {
  return svg
    .replace(/<!--\[-->|<!--\]-->/g, "")
    .replace(
      /<svg([^>]*)>/,
      `<svg$1 class="${className}" preserveAspectRatio="xMidYMid meet">`,
    );
}

function stripExistingShapeAttributes(svg: string) {
  return svg
    .replace(/\sstroke="[^"]*"/g, "")
    .replace(/\sstroke-width="[^"]*"/g, "")
    .replace(/\sstroke-linejoin="[^"]*"/g, "")
    .replace(/\sstroke-linecap="[^"]*"/g, "")
    .replace(/\sstroke-opacity="[^"]*"/g, "")
    .replace(/\sopacity="[^"]*"/g, "")
    .replace(/\sfill-opacity="[^"]*"/g, "");
}

function replaceInlineStyleWithStroke(style: string, strokeWidth: number, opacity: number) {
  const declarations = style
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const styleMap = new Map<string, string>();
  for (const declaration of declarations) {
    const separatorIndex = declaration.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = declaration.slice(0, separatorIndex).trim();
    const value = declaration.slice(separatorIndex + 1).trim();
    styleMap.set(key, value);
  }

  const fillColor = styleMap.get("fill");
  if (!fillColor) {
    return style;
  }

  if (fillColor === "transparent" || fillColor === "none") {
    return "fill:none;";
  }

  return [
    "fill:none",
    `stroke:${fillColor}`,
    `stroke-width:${strokeWidth}`,
    "stroke-linejoin:round",
    "stroke-linecap:round",
    "vector-effect:non-scaling-stroke",
    "paint-order:stroke",
    `stroke-opacity:${opacity}`,
  ].join(";");
}

function buildStrokeOverlay(
  svg: string,
  { strokeWidth, opacity = 1 }: { strokeWidth: number; opacity?: number },
) {
  return stripExistingShapeAttributes(svg)
    .replace(
      /style="([^"]*)"/g,
      (_match, style: string) =>
        `style="${replaceInlineStyleWithStroke(style, strokeWidth, opacity)}"`,
    )
    .replace(
      /fill="([^"]+)"/g,
      (_match, color: string) =>
        color === "transparent" || color === "none"
          ? `fill="none"`
          : `fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" paint-order="stroke" stroke-opacity="${opacity}"`,
    );
}

async function renderAnatomySvg({
  className,
  defaultMuscleColor,
  backgroundColor,
  primaryHighlightColor,
  selectedPrimaryMuscleGroups,
}: {
  className: string;
  defaultMuscleColor: string;
  backgroundColor: string;
  primaryHighlightColor: string;
  selectedPrimaryMuscleGroups: MuscleGroup[];
}) {
  const app = createSSRApp({
    render() {
      return h(HumanMuscleAnatomy, {
        gender: "male",
        defaultMuscleColor,
        backgroundColor,
        primaryHighlightColor,
        secondaryHighlightColor: primaryHighlightColor,
        primaryOpacity: 1,
        secondaryOpacity: 1,
        selectedPrimaryMuscleGroups,
        selectedSecondaryMuscleGroups: [],
      });
    },
  });

  return normalizeSvgMarkup(await renderToString(app), className);
}

async function buildAnatomyFigureLayers({
  highlights = [],
  weeklyHighlights,
  latestHighlights = [],
  className,
}: AnatomyFigureProps) {
  const effectiveWeeklyHighlights = weeklyHighlights ?? highlights;
  const { primary, secondary, low } = assignGroups(effectiveWeeklyHighlights);
  const latestGroups = assignGroups(latestHighlights);
  const regionHighlights = resolveRegionHighlights(effectiveWeeklyHighlights);
  const resolvedClassName = className ?? "h-full w-full";
  const [baseSvg, lowSvg, secondarySvg, primarySvg, latestGlowSvg, latestSeparatorSvg, latestEdgeSvg] =
    await Promise.all([
      renderAnatomySvg({
        className: `${resolvedClassName} block`,
        defaultMuscleColor: "#d9d7eb",
        backgroundColor: "transparent",
        primaryHighlightColor: "#d9d7eb",
        selectedPrimaryMuscleGroups: [],
      }),
      renderAnatomySvg({
        className: `${resolvedClassName} block`,
        defaultMuscleColor: "transparent",
        backgroundColor: "transparent",
        primaryHighlightColor: "#b5abff",
        selectedPrimaryMuscleGroups: low,
      }),
      renderAnatomySvg({
        className: `${resolvedClassName} block`,
        defaultMuscleColor: "transparent",
        backgroundColor: "transparent",
        primaryHighlightColor: "#ff8e7a",
        selectedPrimaryMuscleGroups: secondary,
      }),
      renderAnatomySvg({
        className: `${resolvedClassName} block`,
        defaultMuscleColor: "transparent",
        backgroundColor: "transparent",
        primaryHighlightColor: "#ff5e86",
        selectedPrimaryMuscleGroups: primary,
      }),
      renderAnatomySvg({
        className: `${resolvedClassName} block`,
        defaultMuscleColor: "transparent",
        backgroundColor: "transparent",
        primaryHighlightColor: "#72fff2",
        selectedPrimaryMuscleGroups: [
          ...latestGroups.primary,
          ...latestGroups.secondary,
          ...latestGroups.low,
        ],
      }),
      renderAnatomySvg({
        className: `${resolvedClassName} block`,
        defaultMuscleColor: "transparent",
        backgroundColor: "transparent",
        primaryHighlightColor: "#69568f",
        selectedPrimaryMuscleGroups: [
          ...latestGroups.primary,
          ...latestGroups.secondary,
          ...latestGroups.low,
        ],
      }),
      renderAnatomySvg({
        className: `${resolvedClassName} block`,
        defaultMuscleColor: "transparent",
        backgroundColor: "transparent",
        primaryHighlightColor: "#e9fffd",
        selectedPrimaryMuscleGroups: [
          ...latestGroups.primary,
          ...latestGroups.secondary,
          ...latestGroups.low,
        ],
      }),
    ]);
  const regionLayers = await Promise.all(
    regionHighlights.map(async ([regionId, intensity], index): Promise<RegionLayer> => {
      const selectedPrimaryMuscleGroups = REGION_TO_MUSCLE_GROUPS[regionId] ?? [];
      const svg = await renderAnatomySvg({
        className: `${resolvedClassName} block`,
        defaultMuscleColor: "transparent",
        backgroundColor: "transparent",
        primaryHighlightColor: INTENSITY_COLOR[intensity],
        selectedPrimaryMuscleGroups,
      });

      return {
        regionId,
        intensity,
        svg,
        index,
        motion: REGION_MOTION[regionId],
      };
    }),
  );

  return {
    baseSvg,
    lowSvg,
    secondarySvg,
    primarySvg,
    regionLayers,
    latestGlowOutlineSvg: buildStrokeOverlay(latestGlowSvg, {
      strokeWidth: 3.15,
      opacity: 0.42,
    }),
    latestSeparatorOutlineSvg: buildStrokeOverlay(latestSeparatorSvg, {
      strokeWidth: 2.2,
      opacity: 0.78,
    }),
    latestEdgeOutlineSvg: buildStrokeOverlay(latestEdgeSvg, {
      strokeWidth: 1.35,
      opacity: 1,
    }),
  };
}

export async function renderAnatomyFigureImageLayers(
  props: AnatomyFigureProps,
): Promise<AnatomyFigureImageLayer[]> {
  const layers = await buildAnatomyFigureLayers(props);

  return [
    { svg: layers.baseSvg },
    { svg: layers.lowSvg, opacity: 0.9 },
    { svg: layers.secondarySvg, opacity: 0.94 },
    { svg: layers.primarySvg, opacity: 0.98 },
    {
      svg: layers.latestGlowOutlineSvg,
      opacity: 0.72,
      filter: "drop-shadow(0 0 3px rgba(114,255,242,0.52)) drop-shadow(0 0 10px rgba(114,255,242,0.24))",
    },
    { svg: layers.latestSeparatorOutlineSvg, opacity: 0.72 },
    {
      svg: layers.latestEdgeOutlineSvg,
      opacity: 1,
      filter: "drop-shadow(0 0 3px rgba(233,255,253,0.3))",
    },
  ];
}

export async function AnatomyFigure({
  highlights = [],
  weeklyHighlights,
  latestHighlights = [],
  className,
  mode = "svg",
}: AnatomyFigureProps) {
  const {
    baseSvg,
    lowSvg,
    secondarySvg,
    primarySvg,
    regionLayers,
    latestGlowOutlineSvg,
    latestSeparatorOutlineSvg,
    latestEdgeOutlineSvg,
  } = await buildAnatomyFigureLayers({
    highlights,
    weeklyHighlights,
    latestHighlights,
    className,
  });

  const isInstrumentMode = mode === "instrument";

  return (
    <div
      aria-hidden="true"
      className={`cinematic-anatomy relative ${isInstrumentMode ? "instrument-muscle-map" : ""}`}
    >
      <div
        className="anatomy-layer anatomy-layer-base"
        dangerouslySetInnerHTML={{ __html: baseSvg }}
      />
      {regionLayers.length > 0 ? (
        <div className="anatomy-layer-region-stack absolute inset-0">
          {regionLayers.map((layer) => {
            const style: RegionLayerStyle = {
              "--region-index": layer.index,
              "--region-delay": `${140 + layer.index * 62}ms`,
              "--region-x": `${layer.motion.x}%`,
              "--region-y": `${layer.motion.y}%`,
              "--region-scale": layer.motion.scale,
            };

            return (
              <div
                key={layer.regionId}
                className={`anatomy-layer anatomy-layer-weekly anatomy-region-plate anatomy-region-${layer.regionId} anatomy-region-${layer.intensity} absolute inset-0`}
                data-region-id={layer.regionId}
                data-intensity={layer.intensity}
                style={style}
                dangerouslySetInnerHTML={{ __html: layer.svg }}
              />
            );
          })}
        </div>
      ) : (
        <>
          <div
            className="anatomy-layer anatomy-layer-weekly anatomy-layer-weekly-low absolute inset-0 opacity-90"
            dangerouslySetInnerHTML={{ __html: lowSvg }}
          />
          <div
            className="anatomy-layer anatomy-layer-weekly anatomy-layer-weekly-mid absolute inset-0 opacity-94"
            dangerouslySetInnerHTML={{ __html: secondarySvg }}
          />
          <div
            className="anatomy-layer anatomy-layer-weekly anatomy-layer-weekly-high absolute inset-0 opacity-98"
            dangerouslySetInnerHTML={{ __html: primarySvg }}
          />
        </>
      )}
      <div
        className="anatomy-layer anatomy-layer-latest anatomy-layer-latest-glow absolute inset-0 opacity-72 drop-shadow-[0_0_3px_rgba(114,255,242,0.52)] drop-shadow-[0_0_10px_rgba(114,255,242,0.24)]"
        dangerouslySetInnerHTML={{ __html: latestGlowOutlineSvg }}
      />
      <div
        className="anatomy-layer anatomy-layer-latest anatomy-layer-latest-separator absolute inset-0 opacity-72"
        dangerouslySetInnerHTML={{ __html: latestSeparatorOutlineSvg }}
      />
      <div
        className="anatomy-layer anatomy-layer-latest anatomy-layer-latest-edge absolute inset-0 opacity-100 drop-shadow-[0_0_3px_rgba(233,255,253,0.3)]"
        dangerouslySetInnerHTML={{ __html: latestEdgeOutlineSvg }}
      />
    </div>
  );
}
