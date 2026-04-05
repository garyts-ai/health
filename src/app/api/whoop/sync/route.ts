import { NextResponse } from "next/server";

import { syncWhoopData } from "@/lib/whoop/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const referer = request.headers.get("referer");
  const redirectUrl = new URL(referer ?? "http://localhost:3000/");

  try {
    await syncWhoopData();
    redirectUrl.searchParams.set("whoop", "sync-success");
  } catch {
    redirectUrl.searchParams.set("whoop", "sync-failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
