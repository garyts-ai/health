"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { clearAppSession } from "@/lib/sign-out";

type SignInButtonProps = {
  callbackUrl: string;
  hasSession?: boolean;
};

export function SignInButton({ callbackUrl, hasSession = false }: SignInButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSignIn(clearSession: boolean) {
    setPending(true);
    setError(null);
    try {
      if (clearSession || hasSession) await clearAppSession();
      await signIn("github", { callbackUrl });
    } catch {
      setError("Could not start GitHub sign-in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 grid gap-3">
      <button
        className="inline-flex w-full items-center justify-center rounded-[10px] bg-[#f8f5ff] px-4 py-3 text-sm font-semibold text-[#21183d] transition-colors hover:bg-white disabled:opacity-60"
        disabled={pending}
        onClick={() => void startSignIn(false)}
        type="button"
      >
        {pending ? "Opening GitHub…" : "Continue with GitHub"}
      </button>

      <button
        className="inline-flex w-full items-center justify-center rounded-[10px] border border-white/15 px-4 py-3 text-sm font-semibold text-[#f8f5ff] transition-colors hover:border-white/25 hover:bg-white/6 disabled:opacity-60"
        disabled={pending}
        onClick={() => void startSignIn(true)}
        type="button"
      >
        Use a different GitHub account
      </button>
      {hasSession ? <SignOutButton disabled={pending} /> : null}
      {error ? <p role="alert" className="text-sm text-[#ffe2dc]">{error}</p> : null}
    </div>
  );
}
