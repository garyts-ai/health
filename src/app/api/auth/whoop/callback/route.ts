import { NextResponse } from "next/server";

import { handleWhoopCallback, validateWhoopOAuthState } from "@/lib/whoop/provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const dashboardUrl = new URL("/", url);
  dashboardUrl.searchParams.set("utilities", "open");

  if (error) {
    dashboardUrl.searchParams.set("whoop", "oauth-denied");
    return NextResponse.redirect(dashboardUrl);
  }

  const stateIsValid = await validateWhoopOAuthState(state);

  if (!stateIsValid) {
    dashboardUrl.searchParams.set("whoop", "invalid-state");
    return NextResponse.redirect(dashboardUrl);
  }

  if (!code) {
    dashboardUrl.searchParams.set("whoop", "missing-code");
    return NextResponse.redirect(dashboardUrl);
  }

  try {
    await handleWhoopCallback(code);
    dashboardUrl.searchParams.set("whoop", "connected");
    return NextResponse.redirect(dashboardUrl);
  } catch {
    dashboardUrl.searchParams.set("whoop", "sync-failed");
    return NextResponse.redirect(dashboardUrl);
  }
}
