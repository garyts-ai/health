import { NextResponse } from "next/server";

import { nutritionTargetsFromFormData, saveNutritionTargets } from "@/lib/nutrition-targets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const redirectUrl = new URL("/?utilities=open", request.url);

  try {
    const formData = await request.formData();
    saveNutritionTargets(nutritionTargetsFromFormData(formData));
    redirectUrl.searchParams.set("targets", "saved");
  } catch {
    redirectUrl.searchParams.set("targets", "failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
