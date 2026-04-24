import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions, isAppAuthEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
};

function getSafeCallbackUrl(callbackUrl?: string) {
  if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/";
  }

  return callbackUrl;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!isAppAuthEnabled()) {
    redirect("/");
  }

  const session = await getServerSession(authOptions);
  const resolvedSearchParams = (await searchParams) ?? {};

  if (session?.user?.email) {
    redirect(getSafeCallbackUrl(resolvedSearchParams.callbackUrl));
  }

  const callbackUrl = getSafeCallbackUrl(resolvedSearchParams.callbackUrl);
  const signInUrl = `/api/auth/signin/github?callbackUrl=${encodeURIComponent(callbackUrl)}`;

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

          {resolvedSearchParams.error ? (
            <p className="mt-5 rounded-[10px] border border-[#ff8d75]/30 bg-[#ff8d75]/12 px-4 py-3 text-sm text-[#ffe2dc]">
              That GitHub account is not allowed for this Health OS instance.
            </p>
          ) : null}

          <a
            className="mt-6 inline-flex w-full items-center justify-center rounded-[10px] bg-[#f8f5ff] px-4 py-3 text-sm font-semibold text-[#21183d] transition-colors hover:bg-white"
            href={signInUrl}
          >
            Continue with GitHub
          </a>
        </div>
      </section>
    </main>
  );
}
