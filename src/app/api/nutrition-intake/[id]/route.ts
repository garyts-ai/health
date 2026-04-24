import { NextResponse } from "next/server";

import { deleteNutritionIntakeEntry } from "@/lib/nutrition-intake";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsedId = Number.parseInt(id, 10);

  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid intake id." }, { status: 400 });
  }

  await deleteNutritionIntakeEntry(parsedId);
  return NextResponse.json({ ok: true });
}
