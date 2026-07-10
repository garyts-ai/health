import { NextResponse } from "next/server";

import { buildRequestRedirectUrl } from "@/lib/request-url";
import {
  importWhoopExportFormData,
  WhoopExportUploadError,
} from "@/lib/whoop-export/upload";

export const runtime = "nodejs";

function failureMessage(error: unknown) {
  if (error instanceof WhoopExportUploadError) {
    return error.message;
  }

  if (error instanceof Error && /WHOOP export is missing/.test(error.message)) {
    return error.message;
  }

  return "WHOOP export import failed.";
}

export async function POST(request: Request) {
  const redirectUrl = buildRequestRedirectUrl(request, "/#whoop");
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;

  try {
    const result = await importWhoopExportFormData(await request.formData());
    if (wantsJson) {
      return NextResponse.json(result);
    }

    redirectUrl.searchParams.set("import", result.status);
    redirectUrl.searchParams.set("cycles", String(result.counts.cycles));
    redirectUrl.searchParams.set("sleeps", String(result.counts.sleeps));
    redirectUrl.searchParams.set("workouts", String(result.counts.workouts));
    redirectUrl.searchParams.set("journals", String(result.counts.journals));
  } catch (error) {
    const message = failureMessage(error);
    if (wantsJson) {
      return NextResponse.json({ status: "failed", error: message }, { status: 400 });
    }

    redirectUrl.searchParams.set("import", "failed");
    redirectUrl.searchParams.set("reason", message);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
