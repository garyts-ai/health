import { NextResponse } from "next/server";

import { nutritionTargetsFromFormData, saveNutritionTargets } from "@/lib/nutrition-targets";
import { buildRequestRedirectUrl } from "@/lib/request-url";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const redirectUrl = buildRequestRedirectUrl(request, "/?utilities=open");

  try {
    const formData = await request.formData();
    saveNutritionTargets(nutritionTargetsFromFormData(formData));
    redirectUrl.searchParams.set("targets", "saved");
  } catch {
    redirectUrl.searchParams.set("targets", "failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
