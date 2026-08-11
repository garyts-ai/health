"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/training-os";
import { LONGITUDINAL_QUESTION_PLACEHOLDER } from "@/lib/longitudinal-context-packet";
import styles from "./llm-context-packet.module.css";

type LlmContextPacketProps = {
  handoff: { contextPacketText: string; promptText: string };
};

export function LlmContextPacket({ handoff }: LlmContextPacketProps) {
  const [goal, setGoal] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const prompt = goal.trim()
    ? handoff.promptText.replace(LONGITUDINAL_QUESTION_PLACEHOLDER, goal.trim())
    : handoff.promptText;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch { setCopyState("error"); }
  };

  return <GlassPanel level="raised" className={styles.packet}>
    <div className={styles.heading}>
      <h3>Copy longitudinal context</h3>
    </div>
    <label className={styles.goal} htmlFor="llm-packet-goal"><span>Question for external analysis</span><textarea id="llm-packet-goal" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Example: What additional data would help distinguish plausible explanations for these trends?" /></label>
    <div className={styles.toolbar}>
      <button type="button" onClick={copy}>{copyState === "copied" ? "Copied" : "Copy context packet"}</button>
      {copyState !== "idle" ? <p role="status">{copyState === "copied" ? "Packet copied." : "Clipboard failed. Open the preview to copy manually."}</p> : null}
    </div>
    <details className={styles.preview}><summary>Preview packet</summary><p>Evidence and limitations only; no app-authored explanation.</p><pre>{prompt}</pre></details>
  </GlassPanel>;
}
