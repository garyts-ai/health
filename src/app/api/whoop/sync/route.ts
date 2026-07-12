import { NextResponse } from "next/server";

import { buildRequestRedirectUrl } from "@/lib/request-url";
import { getWhoopConnectionStatus, syncWhoopData } from "@/lib/whoop/provider";
import { latestObservationAt, syncErrorCode, syncStatusFromObservation, type ProviderSyncResponse } from "@/lib/provider-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const redirectUrl = buildRequestRedirectUrl(request, "/?utilities=open#utilities");
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const attemptedAt = new Date().toISOString();

  try {
    const connection = await getWhoopConnectionStatus();
    if (!connection.isConfigured || !connection.connected) {
      const skipped: ProviderSyncResponse = {
        provider: "whoop",
        status: "skipped",
        attemptedAt,
        completedAt: null,
        latestObservationAt: null,
        errorCode: connection.isConfigured ? "not_connected" : "not_configured",
      };
      if (wantsJson) return NextResponse.json(skipped);
      redirectUrl.searchParams.set("whoop", "sync-skipped");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    const result = await syncWhoopData();
    const completedAt = new Date().toISOString();
    const latest = latestObservationAt([
      result.latestSleep?.end,
      result.latestRecovery?.updatedAt,
      result.latestCycle?.end,
      result.latestWorkout?.end,
      result.latestBodyMeasurement?.observedAt,
    ]);
    const payload: ProviderSyncResponse = {
      provider: "whoop",
      status: syncStatusFromObservation(
        latestObservationAt([
          connection.latestSleep?.end,
          connection.latestRecovery?.updatedAt,
          connection.latestCycle?.end,
          connection.latestWorkouts[0]?.end,
          connection.latestBodyMeasurement?.observedAt,
        ]),
        latest,
        result.sleepCount + result.recoveryCount + result.cycleCount + result.workoutCount,
      ),
      attemptedAt,
      completedAt,
      latestObservationAt: latest,
      errorCode: null,
    };
    if (wantsJson) {
      return NextResponse.json(payload);
    }
    redirectUrl.searchParams.set("whoop", payload.status === "updated" ? "sync-success" : "sync-unchanged");
  } catch (error) {
    const payload: ProviderSyncResponse = {
      provider: "whoop",
      status: "failed",
      attemptedAt,
      completedAt: null,
      latestObservationAt: null,
      errorCode: syncErrorCode(error),
    };
    if (wantsJson) {
      return NextResponse.json(payload, { status: 500 });
    }
    redirectUrl.searchParams.set("whoop", "sync-failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
