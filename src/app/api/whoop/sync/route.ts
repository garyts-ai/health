import { NextResponse } from "next/server";

import { buildRequestRedirectUrl } from "@/lib/request-url";
import { syncWhoopData } from "@/lib/whoop/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const redirectUrl = buildRequestRedirectUrl(request, "/?utilities=open");
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;

  try {
    await syncWhoopData();
    if (wantsJson) {
      return NextResponse.json({ status: "success" });
    }
    redirectUrl.searchParams.set("whoop", "sync-success");
  } catch {
    if (wantsJson) {
      return NextResponse.json({ status: "failed" }, { status: 500 });
    }
    redirectUrl.searchParams.set("whoop", "sync-failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
