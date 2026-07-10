# HealthMaxer Product

## Purpose

HealthMaxer is Gary's private, deterministic training command center. It combines WHOOP, Hevy, nutrition targets, weight, activity context, and daily recommendations so the next action is obvious: what to train, how hard to train it, what recovery evidence matters, and what remains this week.

## Information architecture

The product is one continuous page with four canonical anchors:

- `#today` — the immediate training decision and anatomy profile.
- `#weekly` — the complete Monday-to-Sunday plan and muscle-volume ledger.
- `#whoop` — import state, range analysis, ranked findings, trends, and protocol.
- `#utilities` — connections, quick intake, nutrition targets, and daily brief controls.

Legacy `/weekly`, `/whoop`, and `/settings` entry points redirect to the matching root anchor while preserving query parameters.

## Product principles

- The real training call is visible before secondary analysis.
- Runtime recommendations remain model-free and reproducible.
- Missing, stale, sparse, disconnected, and failed states are named honestly; no metric is invented.
- Every mobile surface retains the full decision context available on desktop.
- Anatomy geometry and intensity semantics remain data, not decoration.
- Protected sync, import, nutrition, and delivery actions keep their existing API contracts.

## Brand personality

Focused, nocturnal, athletic, and precise. HealthMaxer should feel like a training district after dark: hard-edged metal, sodium light, electric signals, rain, and a calibrated body instrument. It is cinematic without behaving like a game or obscuring the data.

## Accessibility and performance

Visible focus, semantic landmarks, 44px touch targets, readable contrast, static reduced-motion rendering, and keyboard-operable analysis are required. Ambient motion pauses in hidden documents. Today must render independently of the below-fold WHOOP report.

## Anti-patterns

No glass-card grid, aquarium matte, global pointer tilt, fake metrics, decorative charts, ticker, CRT terminal styling, custom scrollbar, or essential information hidden only on mobile.
