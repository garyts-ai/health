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

`TRAINING_CORE / PROFILE` preserves the canonical 17-region geometry, low/medium/high weekly tiers, and cyan latest-session layer. Front and Back are explicit controls with no automatic rotation. The newest highlighted view is the default. Scan, plate activation, bounded lighting, and view crossfade are the only permitted anatomy motion. A textual workout and volume summary always accompanies the `aria-hidden` visual.

## Motion and interaction

The visible-by-default hero ignition and anatomy activation finish within 500ms and never flash. Standard hover, focus, disclosure, and tab feedback completes within 250ms using transform or opacity. `prefers-reduced-motion: reduce` produces a fully static interface. Ambient rain pauses while the document is hidden.

The Today telemetry rail has one shared interaction state. Pointer, touch, and keyboard input scrub the same seven-day index across all three charts, with a visible exact-date readout and explicit null states. Charts never autoplay or interpolate missing observations.

## Accessibility

Every section has a landmark and heading. Anchor targets account for the sticky rail. Current navigation exposes `aria-current="location"`; manual scrolling uses history replacement while deliberate tab clicks create history entries. Focus is visible, touch targets are at least 44px, charts expose one keyboard interaction with a current-point readout, and all detail remains available at 200% zoom.

## Performance

The aquarium background is absent from the rendered experience. Anatomy images have fixed geometry, animations avoid global `will-change`, trend rendering is capped at 120 visual points, and the full data series remains available for calculation. WHOOP analysis streams below a stable section shell so Today is not blocked.

## Training-OS primitives

The reusable foundation lives in `src/components/training-os/`. Global semantic values live in `src/app/training-os-tokens.css`; component layout and states remain in CSS Modules. `AppShell`, `GlobalNavigation`, `PageHero`, `GlassPanel`, `MetricInstrument`, `DataRail`, `AnatomyViewer`, `MuscleVolumeRow`, `EvidenceDrawer`, and `PageTransition` are the shared contracts. Today uses the three semantic surface levels (base, raised, and overlay), with localized blur permitted only on overlay.

Today's anatomy callouts and volume rows share hover, focus, and pinned state; Escape clears inspection. Utilities contains only provider connections and the compact LLM context packet. The packet is visually secondary to the dashboard and never presents external-model advice as app-authored evidence.

The next implementation step is to migrate Weekly's summary and muscle-volume area to `DataRail` and `MuscleVolumeRow`, leaving the day-ledger logic and data unchanged.
