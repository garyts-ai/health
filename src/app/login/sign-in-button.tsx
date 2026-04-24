"use client";

import { signIn, signOut } from "next-auth/react";

type SignInButtonProps = {
  callbackUrl: string;
  hasError?: boolean;
};

export function SignInButton({ callbackUrl, hasError = false }: SignInButtonProps) {
  return (
    <div className="mt-6 grid gap-3">
      <button
        className="inline-flex w-full items-center justify-center rounded-[10px] bg-[#f8f5ff] px-4 py-3 text-sm font-semibold text-[#21183d] transition-colors hover:bg-white"
        onClick={() => {
          void signIn("github", { callbackUrl });
        }}
        type="button"
      >
        Continue with GitHub
      </button>

      {hasError ? (
        <button
          className="inline-flex w-full items-center justify-center rounded-[10px] border border-white/15 px-4 py-3 text-sm font-semibold text-[#f8f5ff] transition-colors hover:border-white/25 hover:bg-white/6"
          onClick={() => {
            void signOut({ callbackUrl: "/login" });
          }}
          type="button"
        >
          Clear session and retry
        </button>
      ) : null}
    </div>
  );
}
