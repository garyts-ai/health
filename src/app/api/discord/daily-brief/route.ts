import { NextResponse } from "next/server";

import { sendDailyBriefToDiscord } from "@/lib/discord-delivery";

export const runtime = "nodejs";

export async function POST() {
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
