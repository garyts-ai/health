export function getSafeCallbackUrl(callbackUrl?: string) {
  if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//") || /[\\\u0000-\u0020]/.test(callbackUrl)) {
    return "/";
  }

  try {
    const url = new URL(callbackUrl, "https://healthmaxer.invalid");
    const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, "");
    if (url.origin !== "https://healthmaxer.invalid" || pathname === "/login" || pathname.startsWith("/api/auth/")) {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
