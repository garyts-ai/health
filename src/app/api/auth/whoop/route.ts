import { NextResponse } from "next/server";

import { hasWhoopEnv } from "@/lib/env";
import { connectWhoop } from "@/lib/whoop/provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!hasWhoopEnv()) {
    return NextResponse.redirect(new URL("/settings?whoop=not-configured", request.url));
  }

  return connectWhoop();
}
