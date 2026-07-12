# Training-OS foundation

These primitives power the connected Today composition and are the migration target for the rest of HealthMaxer.

- `AppShell` owns brand, date, atmosphere, navigation, content, and footer.
- `GlobalNavigation` preserves anchored scrollspy, query values, history, and `aria-current` behavior.
- `PageHero` composes prescription, anatomy instrument, status, and telemetry without widening the client boundary.
- `GlassPanel` exposes `base`, `raised`, and `overlay`; only overlay may blur.
- `MetricInstrument` and `DataRail` render real values, progress, and null-preserving line/bar series in one continuous surface.
- `AnatomyViewer` links accessible callout and muscle-volume controls to the illustrated, real-layer `aria-hidden` anatomy hero.
- `MuscleVolumeRow` consumes explicit canonical regions from the body-map mapper.
- `EvidenceDrawer` opens a controlled native disclosure and moves focus to the revealed evidence.
- `PageTransition` is visible by default and uses CSS-only entry/target feedback with a static reduced-motion mode.

## Migration map

- Weekly: use `PageHero`, `DataRail`, `GlassPanel`, and `MuscleVolumeRow` for its summary and muscle-volume area. Keep the seven-day ledger and all planning data unchanged.
- WHOOP: use `AppShell`, surface levels, and instruments while retaining the dedicated accessible chart interaction and full-data calculations.
- Utilities: replace legacy premium wrappers with the three surface levels while retaining native forms, feedback, endpoints, and protected actions.

Exact next anatomy step: build the matching premium back-layer pack for rear delts, upper back, traps, glutes, and hamstrings with the same exclusive-mask, hit-path, energy, and assembly contracts. Weekly's broader Training-OS migration remains a separate task.
