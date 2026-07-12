import { NextResponse } from "next/server";

import { syncHevyData } from "@/lib/hevy/provider";
import { getHevyConnectionStatus } from "@/lib/hevy/provider";
import { buildRequestRedirectUrl } from "@/lib/request-url";
import { latestObservationAt, syncErrorCode, syncStatusFromObservation, type ProviderSyncResponse } from "@/lib/provider-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const redirectUrl = buildRequestRedirectUrl(request, "/?utilities=open#utilities");
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const attemptedAt = new Date().toISOString();

  try {
    const connection = await getHevyConnectionStatus();
    if (!connection.isConfigured || !connection.connected) {
      const skipped: ProviderSyncResponse = {
        provider: "hevy",
        status: "skipped",
        attemptedAt,
        completedAt: null,
        latestObservationAt: null,
        errorCode: connection.isConfigured ? "not_connected" : "not_configured",
      };
      if (wantsJson) return NextResponse.json(skipped);
      redirectUrl.searchParams.set("hevy", "sync-skipped");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    const result = await syncHevyData();
    const completedAt = new Date().toISOString();
    const latest = latestObservationAt([result.latestWorkout?.startTime]);
    const payload: ProviderSyncResponse = {
      provider: "hevy",
      status: syncStatusFromObservation(
        latestObservationAt([connection.latestWorkouts[0]?.startTime]),
        latest,
        result.workoutCount,
      ),
      attemptedAt,
      completedAt,
      latestObservationAt: latest,
      errorCode: null,
    };
    if (wantsJson) {
      return NextResponse.json(payload);
    }
    redirectUrl.searchParams.set("hevy", payload.status === "updated" ? "sync-success" : "sync-unchanged");
  } catch (error) {
    const payload: ProviderSyncResponse = {
      provider: "hevy",
      status: "failed",
      attemptedAt,
      completedAt: null,
      latestObservationAt: null,
      errorCode: syncErrorCode(error),
    };
    if (wantsJson) {
      return NextResponse.json(payload, { status: 500 });
    }
    redirectUrl.searchParams.set("hevy", "sync-failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
