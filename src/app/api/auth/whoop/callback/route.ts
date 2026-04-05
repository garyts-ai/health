import { NextResponse } from "next/server";

import { handleWhoopCallback, validateWhoopOAuthState } from "@/lib/whoop/provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const settingsUrl = new URL("/settings", url);

  if (error) {
    settingsUrl.searchParams.set("whoop", "oauth-denied");
    return NextResponse.redirect(settingsUrl);
  }

  const stateIsValid = await validateWhoopOAuthState(state);

  if (!stateIsValid) {
    settingsUrl.searchParams.set("whoop", "invalid-state");
    return NextResponse.redirect(settingsUrl);
  }

  if (!code) {
    settingsUrl.searchParams.set("whoop", "missing-code");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    await handleWhoopCallback(code);
    settingsUrl.searchParams.set("whoop", "connected");
    return NextResponse.redirect(settingsUrl);
  } catch {
    settingsUrl.searchParams.set("whoop", "sync-failed");
    return NextResponse.redirect(settingsUrl);
  }
}
