import { NextResponse, type NextRequest } from "next/server";
import { calendarDateKey } from "@/lib/calendar";
import { parseWhoopAnalysisRequest } from "@/lib/longitudinal/analysis-request";
import { getWhoopAnalysisSelection } from "@/lib/longitudinal/selection";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
};
function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CACHE_HEADERS });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const today = calendarDateKey(new Date());
  const selection = parseWhoopAnalysisRequest(params, today);
  if ("error" in selection) return response({ error: selection.error }, 400);

  try {
    const view = await getWhoopAnalysisSelection(selection);
    return response(view);
  } catch {
    return response({ error: "WHOOP analysis could not be loaded." }, 500);
  }
}
