"use client";

import { useState } from "react";
import { clearAppSession } from "@/lib/sign-out";
import styles from "./sign-out-button.module.css";

export function SignOutButton({ disabled = false }: { disabled?: boolean }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSignOut() {
    setPending(true);
    setFailed(false);
    try {
      await clearAppSession();
      window.location.assign("/login");
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return <div>
    <button className={styles.button} type="button" disabled={disabled || pending} onClick={() => void handleSignOut()}>
      {pending ? "Signing out…" : "Sign out of HealthMaxer"}
    </button>
    {failed ? <p role="alert">Sign-out failed. Please try again.</p> : null}
  </div>;
}
