import { NextResponse } from "next/server";

import { syncHevyData } from "@/lib/hevy/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const redirectUrl = new URL("/?utilities=open", request.url);

  try {
    await syncHevyData();
    redirectUrl.searchParams.set("hevy", "sync-success");
  } catch {
    redirectUrl.searchParams.set("hevy", "sync-failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
