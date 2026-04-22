import { NextResponse } from "next/server";

import { buildRequestRedirectUrl } from "@/lib/request-url";
import { syncWhoopData } from "@/lib/whoop/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const redirectUrl = buildRequestRedirectUrl(request, "/?utilities=open");

  try {
    await syncWhoopData();
    redirectUrl.searchParams.set("whoop", "sync-success");
  } catch {
    redirectUrl.searchParams.set("whoop", "sync-failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
