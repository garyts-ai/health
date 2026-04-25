import { NextResponse } from "next/server";

import { syncHevyData } from "@/lib/hevy/provider";
import { buildRequestRedirectUrl } from "@/lib/request-url";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const redirectUrl = buildRequestRedirectUrl(request, "/?utilities=open");
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;

  try {
    await syncHevyData();
    if (wantsJson) {
      return NextResponse.json({ status: "success" });
    }
    redirectUrl.searchParams.set("hevy", "sync-success");
  } catch {
    if (wantsJson) {
      return NextResponse.json({ status: "failed" }, { status: 500 });
    }
    redirectUrl.searchParams.set("hevy", "sync-failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
