---
name: HealthMaxer
description: A dark neon training district for daily decisions, weekly programming, physiological analysis, and utilities.
fonts:
  display: Big Shoulders
  body: Manrope
  data: Geist Mono
colors:
  soot: "#07070b"
  panel: "#0c0d13"
  text: "#f4f0e8"
  muted: "#9b9aa4"
  sodium: "#ffad32"
  cyan: "#45e8ff"
  magenta: "#ff3c9d"
  violet: "#8b63ff"
  live: "#74e69a"
geometry:
  surfaceRadius: "2px–6px"
  border: "1px ruled"
motion:
  standard: "150ms–250ms"
  signature: "300ms–500ms"
---

# Design System: Neon Training District

## North star

The app is one continuous nocturnal training environment. A hard-edged Today landing scene makes the real decision dominant, while Weekly, WHOOP, and Utilities follow as dense ruled ledgers. Lighting and motion establish place; they never compete with the health evidence.

Nightmarket informs the restrained rain, light activation, and visibility-pausing mechanics. Sergiu Vlad informs only the asymmetric editorial composition of the training profile. No Sergiu code, artwork, copy, or assets are used.

## Composition

- A sticky four-tab rail maps directly to `#today`, `#weekly`, `#whoop`, and `#utilities`.
- Today fills at least `100svh` and uses a connected 44/56 prescription-to-anatomy split on desktop.
- Mobile puts the full decision first and begins the anatomy instrument immediately afterward.
- Weekly is seven aligned columns on desktop and a complete vertical timeline on narrow screens.
- WHOOP is a Longitudinal Health Observatory. Its compact Long-term Signals hero leads into six domain snapshot cards, a separate Recorded Events layer, Recorded Relationships, inline domain detail, and the preserved production Visual analysis graph section; Utilities owns export management and the external evidence packet.
- WHOOP and Utilities use ruled sections and field groupings, not floating card grids.
- Today ends with one continuous three-column telemetry rail for Recovery, Sleep, and Strain; no nutrition instruments appear in the product UI.

## Type

Big Shoulders is reserved for large calls, section titles, and compressed display labels. Manrope carries explanatory copy and controls. Geist Mono carries dates, measures, statuses, and technical labels. Fonts are bundled through `next/font`; there are no browser-time font requests.

## Color semantics

- Magenta marks the Today identity and primary district signage.
- Cyan means current, selected, latest session, or navigational focus.
- Violet represents accumulated weekly anatomy volume.
- Sodium amber marks intensity, caution, and environmental light.
- Green is reserved for live/healthy status.
- Large surfaces remain soot black; glow is local and bounded.

## Surfaces and texture

Use 2–6px corners, thin rules, inset plates, a subtle scan texture, and a masked floor reflection. Avoid translucent glass, soft rounded pods, generic shadows, or broad neon halos. The DOM rain layer is small, decorative, pointer-inert, and hidden from assistive technology.

## Anatomy instrument

`TRAINING_CORE / PROFILE` uses an original illustrated front-facing exosuit assembled from cropped alpha artwork layers. The actual chest, delt, arm, lat, core, quad, adductor, and calf assets carry weekly intensity, latest-session, preview, and pinned states; there is no disconnected highlight mask or procedural mannequin underneath. Canonical 17-region data remains unchanged, while back-only artwork is intentionally deferred until it meets the same visual bar. A textual workout and volume summary always accompanies the `aria-hidden` visual.

## Motion and interaction

The visible-by-default hero is fully assembled before hydration. Standard hover, focus, disclosure, and tab feedback completes within 250ms using transform or opacity. The anatomy instrument may run one recurring 10.8-second 2.5D orbit cycle: a calm assembled hold, anatomically directed separation, a shallow depth pass, reseating, and another hold. The loop uses the real cropped region assets, stops immediately during inspection, never claims to show an unauthored back view, and adds no dashboard-wide motion. Replay remains a cancellable 2.2–2.45 second user-triggered assembly followed by a restrained lock-in signal. Weekly frequency controls violet/amber/magenta rims, latest-session regions carry a continuous bounded cyan energy flow, and Today targets receive static pre-emphasis. Pointer-fine depth response stays within 3px. `prefers-reduced-motion: reduce` resolves Replay instantly and produces a fully static interface. Ambient and anatomy motion pause while the document is hidden.

The Today telemetry rail has one shared interaction state. Pointer, touch, and keyboard input scrub the same seven-day index across all three charts, with a visible exact-date readout and explicit null states. Charts never autoplay or interpolate missing observations.

The Observatory uses small multiples for rapid comprehension: each domain card shows a real metric unit, actual variation, confidence, coverage, and an inline drill-down. Recorded journal answers are dated event marks with explicit filters; they are never rendered as a seventh health domain. Recorded relationship cards show samples, lag, robust difference, confidence, and a non-causal limitation. The production Visual analysis section retains its six interactive metric cards and range controls.

Observatory charts share a quiet telemetry treatment: three-tick compact axes, date anchors, baseline guides, pointer/keyboard crosshairs, and exact-value inspection. Domain identity accents stay distinct from trend status (mint physiology, violet sleep, amber cardio, cyan movement, magenta strength, ion-blue body weight). Body weight is displayed in pounds; source storage remains kilograms.

## Accessibility

Every section has a landmark and heading. Anchor targets account for the sticky rail. Current navigation exposes `aria-current="location"`; manual scrolling uses history replacement while deliberate tab clicks create history entries. Focus is visible, touch targets are at least 44px, charts expose one keyboard interaction with a current-point readout, and all detail remains available at 200% zoom.

## Performance

The aquarium background is absent from the rendered experience. Anatomy images have fixed geometry, animations avoid global `will-change`, trend rendering is capped at 120 visual points, and the full data series remains available for calculation. WHOOP analysis streams below a stable section shell so Today is not blocked.

## Training-OS primitives

The reusable foundation lives in `src/components/training-os/`. Global semantic values live in `src/app/training-os-tokens.css`; component layout and states remain in CSS Modules. `AppShell`, `GlobalNavigation`, `PageHero`, `GlassPanel`, `MetricInstrument`, `DataRail`, `AnatomyViewer`, `MuscleVolumeRow`, `EvidenceDrawer`, and `PageTransition` are the shared contracts. Today uses the three semantic surface levels (base, raised, and overlay), with localized blur permitted only on overlay.

Today's anatomy callouts and volume rows share hover, focus, and pinned state; Escape clears inspection. Utilities contains provider connections, WHOOP export management, and the longitudinal context packet. The packet is visually secondary to the dashboard and never presents external-model advice as app-authored evidence.

Observatory copy is deterministic and observation-only. The top surface contains one descriptive aggregate, no more than three traceable observations, and one coverage statement. Recovery remains an acute composite and does not drive the long-term aggregate. Reasons, mechanisms, recommendations, diagnoses, and medical-risk conclusions belong outside the app; the external packet carries evidence and unknowns without prewriting an answer.
