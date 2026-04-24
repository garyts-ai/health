"use client";

import { signIn } from "next-auth/react";

type SignInButtonProps = {
  callbackUrl: string;
};

export function SignInButton({ callbackUrl }: SignInButtonProps) {
  return (
    <button
      className="mt-6 inline-flex w-full items-center justify-center rounded-[10px] bg-[#f8f5ff] px-4 py-3 text-sm font-semibold text-[#21183d] transition-colors hover:bg-white"
      onClick={() => {
        void signIn("github", { callbackUrl });
      }}
      type="button"
    >
      Continue with GitHub
    </button>
  );
}
