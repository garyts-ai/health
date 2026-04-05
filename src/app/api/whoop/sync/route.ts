import { NextResponse } from "next/server";

import { authorizeAdminAction, buildSettingsRedirectUrl } from "@/lib/admin-action";
import { syncWhoopData } from "@/lib/whoop/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authorizeAdminAction(request);

  if (!auth.ok) {
    return NextResponse.redirect(buildSettingsRedirectUrl(request.url, "whoop", "unauthorized"), {
      status: 303,
    });
  }

  const redirectUrl = new URL("/settings", request.url);

  try {
    await syncWhoopData();
    redirectUrl.searchParams.set("whoop", "sync-success");
  } catch {
    redirectUrl.searchParams.set("whoop", "sync-failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
