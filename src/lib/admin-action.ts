import { timingSafeEqual } from "node:crypto";

import { ADMIN_ACTION_FORM_FIELD, ADMIN_ACTION_HEADER } from "@/lib/admin-action-shared";
import { getAdminActionSecret } from "@/lib/env";

export type AdminActionAuthResult =
  | {
      ok: true;
      secret: string;
    }
  | {
      ok: false;
      reason: "missing" | "invalid";
      status: 401 | 403;
      message: string;
    };

function normalizeSecret(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getSecretFromFormData(formData: FormData) {
  const value = formData.get(ADMIN_ACTION_FORM_FIELD);
  return typeof value === "string" ? normalizeSecret(value) : null;
}

function secretsMatch(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function getProvidedAdminSecret(request: Request) {
  const headerSecret = normalizeSecret(request.headers.get(ADMIN_ACTION_HEADER));

  if (headerSecret) {
    return headerSecret;
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();
    return getSecretFromFormData(formData);
  }

  return null;
}

export async function authorizeAdminAction(request: Request): Promise<AdminActionAuthResult> {
  const expectedSecret = getAdminActionSecret();
  const providedSecret = await getProvidedAdminSecret(request);

  if (!providedSecret) {
    return {
      ok: false,
      reason: "missing",
      status: 401,
      message: "Admin secret is required for this action.",
    };
  }

  if (!secretsMatch(expectedSecret, providedSecret)) {
    return {
      ok: false,
      reason: "invalid",
      status: 403,
      message: "Admin secret is invalid.",
    };
  }

  return {
    ok: true,
    secret: providedSecret,
  };
}

export function buildSettingsRedirectUrl(requestUrl: string, key: string, value: string) {
  const redirectUrl = new URL("/settings", requestUrl);
  redirectUrl.searchParams.set(key, value);
  return redirectUrl;
}
