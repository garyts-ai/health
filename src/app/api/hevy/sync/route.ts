import { NextResponse } from "next/server";

import { authorizeAdminAction, buildSettingsRedirectUrl } from "@/lib/admin-action";
import { syncHevyData } from "@/lib/hevy/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authorizeAdminAction(request);

  if (!auth.ok) {
    return NextResponse.redirect(buildSettingsRedirectUrl(request.url, "hevy", "unauthorized"), {
      status: 303,
    });
  }

  const redirectUrl = new URL("/settings", request.url);

  try {
    await syncHevyData();
    redirectUrl.searchParams.set("hevy", "sync-success");
  } catch {
    redirectUrl.searchParams.set("hevy", "sync-failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
