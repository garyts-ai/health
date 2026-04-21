import { NextResponse } from "next/server";

import { syncHevyData } from "@/lib/hevy/provider";
import { buildRequestRedirectUrl } from "@/lib/request-url";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const redirectUrl = buildRequestRedirectUrl(request, "/?utilities=open");

  try {
    await syncHevyData();
    redirectUrl.searchParams.set("hevy", "sync-success");
  } catch {
    redirectUrl.searchParams.set("hevy", "sync-failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
