import { renderToString } from "@vue/server-renderer";
import { HumanMuscleAnatomy } from "@lucawahlen/vue-human-muscle-anatomy";
import { createSSRApp, h } from "vue";

import type { BodyHighlight, BodyHighlightIntensity, BodyRegionId } from "@/lib/insights/types";

type AnatomyFigureProps = {
  highlights?: BodyHighlight[];
  weeklyHighlights?: BodyHighlight[];
  latestHighlights?: BodyHighlight[];
  className?: string;
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

function assignGroups(highlights: BodyHighlight[]) {
  const priority = new Map<MuscleGroup, BodyHighlightIntensity>();
  const intensityWeight = { high: 3, medium: 2, low: 1 };

  for (const highlight of highlights) {
    const groups = REGION_TO_MUSCLE_GROUPS[highlight.regionId] ?? [];

    for (const group of groups) {
      const existing = priority.get(group);
      if (
        existing === undefined ||
        intensityWeight[highlight.intensity] > intensityWeight[existing]
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

  return {
    baseSvg,
    lowSvg,
    secondarySvg,
    primarySvg,
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
}: AnatomyFigureProps) {
  const {
    baseSvg,
    lowSvg,
    secondarySvg,
    primarySvg,
    latestGlowOutlineSvg,
    latestSeparatorOutlineSvg,
    latestEdgeOutlineSvg,
  } = await buildAnatomyFigureLayers({
    highlights,
    weeklyHighlights,
    latestHighlights,
    className,
  });

  return (
    <div aria-hidden="true" className="cinematic-anatomy relative">
      <div className="anatomy-layer anatomy-layer-base" dangerouslySetInnerHTML={{ __html: baseSvg }} />
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
