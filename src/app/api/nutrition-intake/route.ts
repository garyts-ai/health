import { NextResponse } from "next/server";

import {
  createNutritionIntakeEntry,
  getNutritionIntakeSummary,
  nutritionIntakeFromFormData,
} from "@/lib/nutrition-intake";
import { buildRequestRedirectUrl } from "@/lib/request-url";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dateKey = url.searchParams.get("date") ?? undefined;

  return NextResponse.json(getNutritionIntakeSummary(dateKey));
}

export async function POST(request: Request) {
  const redirectUrl = buildRequestRedirectUrl(request, "/?utilities=open");

  try {
    const formData = await request.formData();
    createNutritionIntakeEntry(nutritionIntakeFromFormData(formData));
    redirectUrl.searchParams.set("intake", "saved");
  } catch {
    redirectUrl.searchParams.set("intake", "failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
