import { signOut } from "next-auth/react";

export async function clearAppSession() {
  const result = await signOut({ callbackUrl: "/login", redirect: false });
  const target = new URL(result.url, window.location.origin);
  // NextAuth can return a CSRF error URL without rejecting the request.
  if (target.origin !== window.location.origin || target.pathname !== "/login" || target.search || target.hash) {
    throw new Error("HealthMaxer session was not cleared.");
  }
}
