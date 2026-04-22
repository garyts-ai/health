import { NextResponse } from "next/server";

import { hasWhoopEnv } from "@/lib/env";
import { buildRequestRedirectUrl } from "@/lib/request-url";
import { connectWhoop } from "@/lib/whoop/provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!hasWhoopEnv()) {
    return NextResponse.redirect(
      buildRequestRedirectUrl(request, "/?utilities=open&whoop=not-configured"),
    );
  }

  return connectWhoop();
}
