import { renderToString } from "@vue/server-renderer";
import { HumanMuscleAnatomy } from "@lucawahlen/vue-human-muscle-anatomy";
import { createSSRApp, h } from "vue";

import type { BodyHighlight, BodyHighlightIntensity, BodyRegionId } from "@/lib/insights/types";

type AnatomyFigureProps = {
  highlights: BodyHighlight[];
  className?: string;
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
  quads: ["quads", "adductors", "abductors"],
  hamstrings: ["hamstrings"],
  calves: ["calves"],
};

function assignGroups(highlights: BodyHighlight[]) {
  const priority = new Map<MuscleGroup, BodyHighlightIntensity>();

  for (const highlight of highlights) {
    const groups = REGION_TO_MUSCLE_GROUPS[highlight.regionId] ?? [];

    for (const group of groups) {
      const existing = priority.get(group);
      if (highlight.intensity === "high" || existing === undefined) {
        priority.set(group, highlight.intensity);
      }
    }
  }

  const primary: MuscleGroup[] = [];
  const secondary: MuscleGroup[] = [];

  for (const [group, intensity] of priority.entries()) {
    if (intensity === "high") {
      primary.push(group);
    } else {
      secondary.push(group);
    }
  }

  return { primary, secondary };
}

function normalizeSvgMarkup(svg: string, className: string) {
  return svg
    .replace(/<!--\[-->|<!--\]-->/g, "")
    .replace(
      /<svg([^>]*)>/,
      `<svg$1 class="${className}" preserveAspectRatio="xMidYMid meet">`,
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

export async function AnatomyFigure({ highlights, className }: AnatomyFigureProps) {
  const { primary, secondary } = assignGroups(highlights);
  const resolvedClassName = className ?? "h-full w-full";
  const [baseSvg, secondarySvg, primarySvg] = await Promise.all([
    renderAnatomySvg({
      className: `${resolvedClassName} block`,
      defaultMuscleColor: "#c3cfca",
      backgroundColor: "transparent",
      primaryHighlightColor: "#c3cfca",
      selectedPrimaryMuscleGroups: [],
    }),
    renderAnatomySvg({
      className: `${resolvedClassName} block`,
      defaultMuscleColor: "transparent",
      backgroundColor: "transparent",
      primaryHighlightColor: "#74dbf0",
      selectedPrimaryMuscleGroups: secondary,
    }),
    renderAnatomySvg({
      className: `${resolvedClassName} block`,
      defaultMuscleColor: "transparent",
      backgroundColor: "transparent",
      primaryHighlightColor: "#1fb4df",
      selectedPrimaryMuscleGroups: primary,
    }),
  ]);

  return (
    <div aria-hidden="true" className="relative">
      <div dangerouslySetInnerHTML={{ __html: baseSvg }} />
      <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: secondarySvg }} />
      <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: primarySvg }} />
    </div>
  );
}
