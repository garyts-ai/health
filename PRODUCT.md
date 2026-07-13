# HealthMaxer Product

## Purpose

HealthMaxer is Gary's private, deterministic training and recovery dashboard. It combines WHOOP, Hevy, body-weight trends, activity context, and minimal recommendations so the next training decision and its evidence are obvious.

## Information architecture

The product is one continuous page with four canonical anchors:

- `#today` — the immediate training decision and anatomy profile.
- `#weekly` — the complete Monday-to-Sunday plan and muscle-volume ledger.
- `#whoop` — the Longitudinal Health Observatory: a compact long-term signal summary, six domain snapshots, acute deviations, explicit recorded events, recorded relationships, and detailed Visual analysis graphs.
- `#utilities` — provider connections, WHOOP export management, and a longitudinal evidence packet for deeper analysis in an external LLM.

Legacy `/weekly`, `/whoop`, and `/settings` entry points redirect to the matching root anchor while preserving query parameters.

## Product principles

- The real training call is visible before secondary analysis.
- Runtime recommendations remain model-free and reproducible.
- Missing, stale, sparse, disconnected, and failed states are named honestly; no metric is invented.
- Every mobile surface retains the full decision context available on desktop.
- Anatomy geometry and intensity semantics remain data, not decoration.
- Deterministic app recommendations stay limited to training, recovery, and safety cautions; detailed general or nutrition advice belongs in the external-LLM handoff.
- The Observatory observes and organizes connected data. It never recommends actions, diagnoses, claims causality, infers unrecorded behavior, or presents a medical or longevity score.
- Recorded journal answers are an event layer, not a health domain. They appear only when explicitly recorded and can filter the relationship layer.
- Every Observatory statement is traceable to a typed observation, calculation, trend, baseline comparison, recorded association, limitation, or unknown.
- Observatory compact and detail charts share visible axes, domain-specific identity accents, baseline context, and exact-value pointer/keyboard inspection. Body weight is presented in pounds (lb), with kilograms retained only at the storage boundary.
- Provider sync and import actions keep their existing API contracts.

## Brand personality

Focused, nocturnal, athletic, and precise. HealthMaxer should feel like a training district after dark: hard-edged metal, sodium light, electric signals, rain, and a calibrated body instrument. It is cinematic without behaving like a game or obscuring the data.

## Accessibility and performance

Visible focus, semantic landmarks, 44px touch targets, readable contrast, static reduced-motion rendering, and keyboard-operable analysis are required. Ambient motion pauses in hidden documents. Today must render independently of the below-fold WHOOP report.

## Anti-patterns

No glass-card grid, aquarium matte, global pointer tilt, fake metrics, decorative charts, ticker, CRT terminal styling, custom scrollbar, or essential information hidden only on mobile.
