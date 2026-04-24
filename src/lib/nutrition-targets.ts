import { dbGet, dbRun } from "@/lib/db";

export type NutritionTargets = {
  calorieTarget: number | null;
  proteinTargetG: number | null;
  updatedAt: string | null;
};

type NutritionTargetRow = {
  calorie_target: number | null;
  protein_target_g: number | null;
  updated_at: string;
};

function cleanPositiveInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function getNutritionTargets(): Promise<NutritionTargets> {
  const row = await dbGet<NutritionTargetRow>(
    `
      SELECT calorie_target, protein_target_g, updated_at
      FROM nutrition_targets
      WHERE id = 1
    `,
  );

  return {
    calorieTarget: row?.calorie_target ?? null,
    proteinTargetG: row?.protein_target_g ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}

export async function saveNutritionTargets(input: {
  calorieTarget: number | null;
  proteinTargetG: number | null;
}) {
  const updatedAt = new Date().toISOString();

  await dbRun(
    `
      INSERT INTO nutrition_targets (id, calorie_target, protein_target_g, updated_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        calorie_target = excluded.calorie_target,
        protein_target_g = excluded.protein_target_g,
        updated_at = excluded.updated_at
    `,
    input.calorieTarget,
    input.proteinTargetG,
    updatedAt,
  );

  return getNutritionTargets();
}

export function nutritionTargetsFromFormData(formData: FormData) {
  return {
    calorieTarget: cleanPositiveInteger(formData.get("calorieTarget")),
    proteinTargetG: cleanPositiveInteger(formData.get("proteinTargetG")),
  };
}
