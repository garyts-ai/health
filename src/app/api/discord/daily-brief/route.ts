import { NextResponse } from "next/server";

import { authorizeAdminAction } from "@/lib/admin-action";
import { sendDailyBriefToDiscord } from "@/lib/discord-delivery";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authorizeAdminAction(request);

  if (!auth.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: "failed",
        error: auth.message,
      },
      { status: auth.status },
    );
  }

  const result = await sendDailyBriefToDiscord("manual");

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      status: result.status,
      message: result.message,
    });
  }

  return NextResponse.json(
    {
      ok: false,
      status: result.status,
      error: result.message,
    },
    { status: 500 },
  );
}
