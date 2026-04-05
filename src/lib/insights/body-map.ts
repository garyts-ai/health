import type {
  BodyHighlight,
  BodyHighlightIntensity,
  BodyRegionId,
} from "@/lib/insights/types";

type ExerciseRecord = {
  title?: string | null;
  sets?: unknown[];
};

type HevyWorkoutShape = {
  exercises?: ExerciseRecord[];
};

type RegionMatch = {
  primary: BodyRegionId[];
  secondary: BodyRegionId[];
};

type RegionScore = {
  view: "front" | "back";
  score: number;
};

export type WeeklyMuscleGroup =
  | "Chest"
  | "Shoulders"
  | "Back"
  | "Biceps"
  | "Triceps"
  | "Quads"
  | "Hamstrings/Glutes"
  | "Calves"
  | "Core";

const REGION_VIEW: Record<BodyRegionId, "front" | "back"> = {
  chest: "front",
  frontDelts: "front",
  sideDelts: "front",
  rearDelts: "back",
  biceps: "front",
  triceps: "back",
  forearms: "front",
  lats: "back",
  upperBack: "back",
  traps: "back",
  abs: "front",
  obliques: "front",
  glutes: "back",
  quads: "front",
  hamstrings: "back",
  calves: "back",
};

const EXERCISE_REGION_RULES: Array<{ pattern: RegExp; match: RegionMatch }> = [
  {
    pattern: /(bench|chest press|machine press|push[- ]?up|pec deck|fly|cable fly|dip)/,
    match: {
      primary: ["chest"],
      secondary: ["frontDelts", "triceps"],
    },
  },
  {
    pattern: /(incline press|incline bench|incline dumbbell press)/,
    match: {
      primary: ["chest", "frontDelts"],
      secondary: ["triceps"],
    },
  },
  {
    pattern: /(shoulder press|overhead press|military press|arnold press)/,
    match: {
      primary: ["frontDelts", "sideDelts"],
      secondary: ["triceps"],
    },
  },
  {
    pattern: /(lateral raise|side raise|upright row)/,
    match: {
      primary: ["sideDelts"],
      secondary: ["frontDelts", "rearDelts"],
    },
  },
  {
    pattern: /(rear delt|reverse fly|face pull)/,
    match: {
      primary: ["rearDelts", "upperBack"],
      secondary: ["traps"],
    },
  },
  {
    pattern: /(row|seated row|barbell row|dumbbell row|t-bar row)/,
    match: {
      primary: ["lats", "upperBack"],
      secondary: ["rearDelts", "biceps"],
    },
  },
  {
    pattern: /(pull[- ]?up|chin[- ]?up|lat pulldown|pulldown)/,
    match: {
      primary: ["lats"],
      secondary: ["biceps", "upperBack"],
    },
  },
  {
    pattern: /(shrug)/,
    match: {
      primary: ["traps"],
      secondary: ["upperBack"],
    },
  },
  {
    pattern: /(curl|hammer curl|preacher curl)/,
    match: {
      primary: ["biceps"],
      secondary: ["forearms"],
    },
  },
  {
    pattern: /(tricep|pushdown|skull crusher|overhead extension)/,
    match: {
      primary: ["triceps"],
      secondary: ["frontDelts"],
    },
  },
  {
    pattern: /(wrist curl|reverse curl|farmer)/,
    match: {
      primary: ["forearms"],
      secondary: ["biceps"],
    },
  },
  {
    pattern: /(squat|hack squat|leg press|split squat|lunge|step[- ]?up)/,
    match: {
      primary: ["quads", "glutes"],
      secondary: ["hamstrings", "calves"],
    },
  },
  {
    pattern: /(deadlift|romanian deadlift|rdl|good morning)/,
    match: {
      primary: ["hamstrings", "glutes"],
      secondary: ["upperBack", "traps"],
    },
  },
  {
    pattern: /(hip thrust|glute bridge|kickback)/,
    match: {
      primary: ["glutes"],
      secondary: ["hamstrings"],
    },
  },
  {
    pattern: /(leg curl|hamstring curl|nordic)/,
    match: {
      primary: ["hamstrings"],
      secondary: ["glutes"],
    },
  },
  {
    pattern: /(leg extension)/,
    match: {
      primary: ["quads"],
      secondary: [],
    },
  },
  {
    pattern: /(calf raise|seated calf|standing calf)/,
    match: {
      primary: ["calves"],
      secondary: [],
    },
  },
  {
    pattern: /(ab|crunch|sit[- ]?up|leg raise|hollow|plank)/,
    match: {
      primary: ["abs"],
      secondary: ["obliques"],
    },
  },
  {
    pattern: /(oblique|woodchop|russian twist|side bend|pallof)/,
    match: {
      primary: ["obliques"],
      secondary: ["abs"],
    },
  },
];

const REGION_GROUP_MAP: Partial<Record<BodyRegionId, WeeklyMuscleGroup>> = {
  chest: "Chest",
  frontDelts: "Shoulders",
  sideDelts: "Shoulders",
  rearDelts: "Shoulders",
  lats: "Back",
  upperBack: "Back",
  traps: "Back",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings/Glutes",
  glutes: "Hamstrings/Glutes",
  calves: "Calves",
  abs: "Core",
  obliques: "Core",
};

function getExerciseEntries(rawJson: string) {
  try {
    const parsed = JSON.parse(rawJson) as HevyWorkoutShape;
    const exercises = Array.isArray(parsed.exercises) ? parsed.exercises : [];
    return exercises.map((exercise) => ({
      title: exercise.title?.toLowerCase() ?? "",
      setCount: Array.isArray(exercise.sets) ? exercise.sets.length : 0,
    }));
  } catch {
    return [];
  }
}

function inferRegionMatch(title: string): RegionMatch | null {
  for (const rule of EXERCISE_REGION_RULES) {
    if (rule.pattern.test(title)) {
      return rule.match;
    }
  }

  if (/(press|dip|push)/.test(title)) {
    return {
      primary: ["chest", "frontDelts"],
      secondary: ["triceps"],
    };
  }

  if (/(row|pull|chin|lat|rear delt)/.test(title)) {
    return {
      primary: ["lats", "upperBack"],
      secondary: ["biceps", "rearDelts"],
    };
  }

  if (/(squat|deadlift|lunge|leg|glute|hamstring|calf|quad)/.test(title)) {
    return {
      primary: ["quads", "glutes"],
      secondary: ["hamstrings", "calves"],
    };
  }

  return null;
}

function getUniqueWorkoutGroups(rawJson: string) {
  const groups = new Set<WeeklyMuscleGroup>();

  for (const exercise of getExerciseEntries(rawJson)) {
    if (!exercise.title) {
      continue;
    }

    const match = inferRegionMatch(exercise.title);
    if (!match) {
      continue;
    }

    for (const region of [...match.primary, ...match.secondary]) {
      const group = REGION_GROUP_MAP[region];
      if (group) {
        groups.add(group);
      }
    }
  }

  return groups;
}

function classifyIntensity(score: number, maxScore: number): BodyHighlightIntensity | null {
  if (maxScore <= 0 || score <= 0) {
    return null;
  }

  const ratio = score / maxScore;
  if (ratio >= 0.78) {
    return "high";
  }

  return "medium";
}

export function buildBodyHighlightsFromWorkout(rawJson: string): BodyHighlight[] {
  const scores = new Map<BodyRegionId, RegionScore>();

  for (const exercise of getExerciseEntries(rawJson)) {
    if (!exercise.title) {
      continue;
    }

    const match = inferRegionMatch(exercise.title);
    if (!match) {
      continue;
    }

    const setWeight = Math.max(1, exercise.setCount || 1);

    for (const region of match.primary) {
      const current = scores.get(region) ?? { score: 0, view: REGION_VIEW[region] };
      scores.set(region, {
        view: REGION_VIEW[region],
        score: current.score + setWeight,
      });
    }

    for (const region of match.secondary) {
      const current = scores.get(region) ?? { score: 0, view: REGION_VIEW[region] };
      scores.set(region, {
        view: REGION_VIEW[region],
        score: current.score + setWeight * 0.55,
      });
    }
  }

  const maxScore = Math.max(0, ...[...scores.values()].map((entry) => entry.score));

  return [...scores.entries()]
    .map(([regionId, entry]) => {
      const intensity = classifyIntensity(entry.score, maxScore);
      if (!intensity) {
        return null;
      }

      return {
        regionId,
        intensity,
        view: entry.view,
      } satisfies BodyHighlight;
    })
    .filter((entry): entry is BodyHighlight => entry !== null)
    .sort((left, right) => {
      const intensityWeight = { high: 2, medium: 1 };
      return intensityWeight[right.intensity] - intensityWeight[left.intensity];
    });
}

export function summarizeWorkoutMuscleGroups(rawJson: string) {
  return [...getUniqueWorkoutGroups(rawJson)];
}

export function summarizeWeeklyMuscleHits(rawJsonWorkouts: string[]) {
  const counts = new Map<WeeklyMuscleGroup, number>();

  for (const rawJson of rawJsonWorkouts) {
    for (const group of getUniqueWorkoutGroups(rawJson)) {
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([label, hits]) => ({ label, hits }))
    .sort((left, right) => {
      if (right.hits !== left.hits) {
        return right.hits - left.hits;
      }

      return left.label.localeCompare(right.label);
    });
}
