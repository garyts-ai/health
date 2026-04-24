import { NextResponse } from "next/server";

import { deleteNutritionIntakeEntry } from "@/lib/nutrition-intake";
import { buildRequestRedirectUrl } from "@/lib/request-url";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const redirectUrl = buildRequestRedirectUrl(request, "/?utilities=open");

  try {
    const formData = await request.formData();
    const id = Number.parseInt(String(formData.get("id") ?? ""), 10);

    if (!Number.isFinite(id) || id <= 0) {
      throw new Error("Missing nutrition intake id.");
    }

    await deleteNutritionIntakeEntry(id);
    redirectUrl.searchParams.set("intake", "deleted");
  } catch {
    redirectUrl.searchParams.set("intake", "failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
