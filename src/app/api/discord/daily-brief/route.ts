import { NextResponse } from "next/server";

import { sendDailyBriefToDiscord } from "@/lib/discord-delivery";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let imageBuffer: Buffer | undefined;
  let imageFilename: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const image = formData.get("image");

    if (image instanceof File) {
      imageBuffer = Buffer.from(await image.arrayBuffer());
      imageFilename = image.name || undefined;
    }
  }

  const result = await sendDailyBriefToDiscord("manual", {
    imageBuffer,
    imageFilename,
  });

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
