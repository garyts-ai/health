import {
  ActiveSignalsStrip,
  TodayHeroMetrics,
  TopActionsSection,
  WhatChangedCard,
} from "@/components/dashboard-sections";
import { ProductShell } from "@/components/product-shell";
import { getDailySummary } from "@/lib/insights/engine";

export default function Home() {
  const summary = getDailySummary();

  return (
    <ProductShell
      current="today"
      eyebrow="Health OS"
      title="Today"
      description="Open the app, trust the read, and decide your day quickly. This view stays focused on readiness, action, and the handful of signals that actually changed."
    >
      <TodayHeroMetrics summary={summary} />
      <TopActionsSection summary={summary} />
      <WhatChangedCard summary={summary} />
      <ActiveSignalsStrip summary={summary} />
    </ProductShell>
  );
}
