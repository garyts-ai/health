"use client";

import { useMemo, useState } from "react";
import { GlassPanel } from "@/components/training-os";
import { buildLlmContextPacket, LLM_QUESTION_PLACEHOLDER } from "@/lib/llm-context-packet";
import type { DailySummary } from "@/lib/insights/types";
import styles from "./llm-context-packet.module.css";

export function LlmContextPacket({ summary }: { summary: DailySummary }) {
  const handoff = useMemo(() => buildLlmContextPacket(summary), [summary]);
  const [goal, setGoal] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const prompt = goal.trim() ? handoff.promptText.replace(LLM_QUESTION_PLACEHOLDER, goal.trim()) : handoff.promptText;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch { setCopyState("error"); }
  };

  return <GlassPanel level="raised" className={styles.packet}>
    <div className={styles.heading}>
      <div><h3>Copy dashboard context</h3><p>Paste the packet into your preferred LLM for detailed training, recovery, nutrition-target, or general advice. Missing inputs must be requested, never invented.</p></div>
      <span>{handoff.contextPacketText.length.toLocaleString()} chars</span>
    </div>
    <label className={styles.goal} htmlFor="llm-packet-goal"><span>Goal or follow-up</span><textarea id="llm-packet-goal" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Example: Set nutrition targets for gradual fat loss without compromising sleep or lifting performance." /></label>
    <div className={styles.toolbar}>
      <button type="button" onClick={copy}>{copyState === "copied" ? "Copied" : "Copy context packet"}</button>
      <p role="status">{copyState === "copied" ? "Packet copied to clipboard." : copyState === "error" ? "Clipboard access failed. Open the preview and copy manually." : "Raw dashboard data plus the current minimal recommendation."}</p>
    </div>
    <details className={styles.preview}><summary>Preview packet</summary><pre>{prompt}</pre></details>
  </GlassPanel>;
}
