import { createDailyBriefImage } from "@/lib/daily-brief";
import { getDailySummary } from "@/lib/insights/engine";

export const runtime = "nodejs";

export async function GET() {
  const summary = getDailySummary();
  return await createDailyBriefImage(summary);
}
