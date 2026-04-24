import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/health-os-icon.svg" ||
    pathname === "/manifest.webmanifest"
  );
}

function isNextAuthPath(pathname: string) {
  return (
    pathname.startsWith("/api/auth/signin") ||
    pathname.startsWith("/api/auth/callback") ||
    pathname.startsWith("/api/auth/error") ||
    pathname.startsWith("/api/auth/session") ||
    pathname.startsWith("/api/auth/csrf") ||
    pathname.startsWith("/api/auth/providers")
  );
}

function isAuthEnabled() {
  return Boolean(
    (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET) &&
      process.env.AUTH_GITHUB_ID &&
      process.env.AUTH_GITHUB_SECRET &&
      process.env.ALLOWED_GITHUB_USERS,
  );
}

function shouldFailClosedWithoutAuth() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    isStaticAsset(pathname) ||
    pathname === "/login" ||
    pathname === "/api/auth/whoop/callback" ||
    isNextAuthPath(pathname)
  ) {
    return NextResponse.next();
  }

  if (!isAuthEnabled()) {
    if (shouldFailClosedWithoutAuth()) {
      return new NextResponse("Health OS auth is not configured.", {
        status: 503,
      });
    }

    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });
  const allowedGitHubUsers = new Set(
    (process.env.ALLOWED_GITHUB_USERS ?? "")
      .split(",")
      .map((user) => user.trim().toLowerCase())
      .filter(Boolean),
  );
  const githubUsername =
    typeof token?.githubUsername === "string"
      ? token.githubUsername.toLowerCase()
      : null;

  if (githubUsername && allowedGitHubUsers.has(githubUsername)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
