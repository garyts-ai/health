import { dbAll, dbInsert, dbRun } from "@/lib/db";

const NEW_YORK_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export type NutritionIntakeEntry = {
  id: number;
  dateKey: string;
  mealType: string;
  label: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  note: string | null;
  loggedAt: string;
  createdAt: string;
};

export type NutritionIntakeInput = {
  dateKey?: string;
  mealType: string;
  label: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  note: string | null;
};

type NutritionIntakeRow = {
  id: number;
  date_key: string;
  meal_type: string;
  label: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  note: string | null;
  logged_at: string;
  created_at: string;
};

function currentDateKey() {
  return NEW_YORK_DAY.format(new Date());
}

function cleanText(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : fallback;
}

function cleanNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function mapRow(row: NutritionIntakeRow): NutritionIntakeEntry {
  return {
    id: row.id,
    dateKey: row.date_key,
    mealType: row.meal_type,
    label: row.label,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    note: row.note,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
  };
}

export function nutritionIntakeFromFormData(formData: FormData): NutritionIntakeInput {
  const mealType = cleanText(formData.get("mealType"), "meal").toLowerCase();
  const label = cleanText(formData.get("label"), mealType);

  return {
    dateKey: cleanText(formData.get("dateKey"), currentDateKey()),
    mealType,
    label,
    calories: Math.round(cleanNumber(formData.get("calories"))),
    proteinG: cleanNumber(formData.get("proteinG")),
    carbsG: cleanNumber(formData.get("carbsG")),
    fatG: cleanNumber(formData.get("fatG")),
    note: cleanText(formData.get("note"), ""),
  };
}

export async function createNutritionIntakeEntry(input: NutritionIntakeInput) {
  const now = new Date().toISOString();
  const dateKey = input.dateKey ?? currentDateKey();

  if (input.calories <= 0 && input.proteinG <= 0 && input.carbsG <= 0 && input.fatG <= 0) {
    throw new Error("Nutrition entry needs at least one macro value.");
  }

  return dbInsert(
    `
      INSERT INTO nutrition_intake_entries (
        date_key, meal_type, label, calories, protein_g, carbs_g, fat_g, note, logged_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    dateKey,
    input.mealType,
    input.label,
    input.calories,
    input.proteinG,
    input.carbsG,
    input.fatG,
    input.note && input.note.length > 0 ? input.note : null,
    now,
    now,
  );
}

export async function deleteNutritionIntakeEntry(id: number) {
  await dbRun(
    `
      DELETE FROM nutrition_intake_entries
      WHERE id = ?
    `,
    id,
  );
}

export async function listNutritionIntakeEntries(dateKey = currentDateKey()) {
  return (
    await dbAll<NutritionIntakeRow>(
      `
        SELECT id, date_key, meal_type, label, calories, protein_g, carbs_g, fat_g, note,
               logged_at, created_at
        FROM nutrition_intake_entries
        WHERE date_key = ?
        ORDER BY logged_at DESC, id DESC
      `,
      dateKey,
    )
  ).map(mapRow);
}

export async function getNutritionIntakeSummary(dateKey = currentDateKey()) {
  const entries = await listNutritionIntakeEntries(dateKey);
  const totals = entries.reduce(
    (sum, entry) => ({
      calories: sum.calories + entry.calories,
      proteinG: sum.proteinG + entry.proteinG,
      carbsG: sum.carbsG + entry.carbsG,
      fatG: sum.fatG + entry.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  return {
    dateKey,
    entries,
    calories: Math.round(totals.calories),
    proteinG: Math.round(totals.proteinG),
    carbsG: Math.round(totals.carbsG),
    fatG: Math.round(totals.fatG),
    hasLoggedIntake: entries.length > 0,
  };
}
