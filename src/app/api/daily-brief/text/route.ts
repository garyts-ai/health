import { NextResponse } from "next/server";

import { buildLlmHandoff } from "@/lib/daily-brief-shared";
import { getDailySummary } from "@/lib/insights/engine";

export const runtime = "nodejs";

export async function GET() {
  const summary = getDailySummary();
  const handoff = buildLlmHandoff(summary);

  return NextResponse.json({
    text: handoff.promptText,
  });
}
