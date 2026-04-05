import { NextResponse } from "next/server";

import { syncHevyData } from "@/lib/hevy/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const referer = request.headers.get("referer");
  const redirectUrl = new URL(referer ?? "http://localhost:3000/");

  try {
    await syncHevyData();
    redirectUrl.searchParams.set("hevy", "sync-success");
  } catch {
    redirectUrl.searchParams.set("hevy", "sync-failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
