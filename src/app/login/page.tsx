import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions, isAllowedGitHubSession, isAppAuthEnabled } from "@/lib/auth";
import { getSafeCallbackUrl } from "@/lib/auth-navigation";
import { SignInButton } from "@/app/login/sign-in-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    error?: string;
    switchAccount?: string;
  }>;
};

function getLoginErrorMessage(error?: string) {
  switch (error) {
    case "AccessDenied":
      return "This GitHub account does not have access to HealthMaxer. Choose a different account to try again.";
    case "github":
      return "GitHub sign-in did not complete. Try again or choose a different account.";
    case "Configuration":
      return "Health OS auth is misconfigured. Check the GitHub OAuth env values in Vercel, then redeploy.";
    default:
      return error
        ? "Sign-in did not complete. Try again or choose a different GitHub account."
        : null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!isAppAuthEnabled()) {
    redirect("/");
  }

  const session = await getServerSession(authOptions);
  const resolvedSearchParams = (await searchParams) ?? {};

  if (isAllowedGitHubSession(session) && !resolvedSearchParams.error && resolvedSearchParams.switchAccount !== "1") {
    redirect(getSafeCallbackUrl(resolvedSearchParams.callbackUrl));
  }

  const callbackUrl = getSafeCallbackUrl(resolvedSearchParams.callbackUrl);
  const errorMessage = getLoginErrorMessage(resolvedSearchParams.error);

  return (
    <main className="min-h-screen bg-[#1f1840] px-5 py-8 text-[#f8f5ff]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[520px] flex-col justify-center">
        <div className="rounded-[12px] border border-white/12 bg-[#2a2251] p-6 shadow-[0_8px_24px_rgba(18,12,42,0.22)]">
          <p className="text-sm font-medium text-[#c9c1e8]">Health OS</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">
            Sign in to your dashboard
          </h1>
          <p className="mt-4 text-base leading-7 text-[#d8d0ec]">
            GitHub SSO keeps the public Vercel app private while still working cleanly from
            your iPhone Home Screen.
          </p>

          {errorMessage ? (
            <p role="alert" className="mt-5 rounded-[10px] border border-[#ff8d75]/30 bg-[#ff8d75]/12 px-4 py-3 text-sm text-[#ffe2dc]">
              {errorMessage}
            </p>
          ) : null}

          {session?.user?.name ? <p className="mt-5 text-sm text-[#d8d0ec]">HealthMaxer session: {session.user.name}</p> : null}
          <SignInButton callbackUrl={callbackUrl} hasSession={Boolean(session)} />
        </div>
      </section>
    </main>
  );
}
