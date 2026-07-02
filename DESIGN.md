---
name: Health OS
description: A cinematic personal health cockpit for training, recovery, nutrition, and activity context.
colors:
  abyss: "#020712"
  deep-ocean: "#031525"
  cockpit-blue: "#073856"
  electric-cyan: "#39f8ff"
  biolume-aqua: "#72fff2"
  violet-depth: "#7c5cff"
  coral-warmth: "#ff9f1c"
  glass-frost: "rgba(160, 232, 255, 0.14)"
typography:
  display:
    fontFamily: "var(--font-manrope), system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  body:
    fontFamily: "var(--font-manrope), system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-manrope), system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.35
rounded:
  pod: "22px"
  tank: "28px"
  control: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  scene:
    background: "aquarium starship matte"
    textColor: "#e9fbff"
  training-tank:
    background: "transparent glass over scene"
    latestColor: "{colors.electric-cyan}"
  metric-pod:
    background: "dark translucent glass"
    borderColor: "{colors.electric-cyan}"
---

# Design System: Health OS

## 1. Overview

**Creative North Star: “Aquarium Starship Cockpit.”**

Health OS should feel like Gary is standing inside a deep-space aquatic command bridge. The app is not merely placed on a dark background; the interface is embedded into a world of curved cockpit glass, bioluminescent particles, coral forms, luminous tanks, and electric cyan instrumentation.

The data remains real HTML/SVG and the logic stays deterministic. Generated or curated raster imagery is allowed as environmental set design, but never as a replacement for text, data, controls, or anatomy highlight geometry.

## 2. Colors

The palette is drenched in deep ocean-space blues. Electric cyan is the main signal color, violet adds depth, and warm coral/amber is used sparingly for strain, caution, and living environmental accents.

### Rules

- Cyan means live, latest, focus, and containment-field energy.
- Violet means weekly exposure depth and underwater shadow.
- Coral/amber means caution, heat, strain, or biological warmth.
- Large surfaces should feel like translucent cockpit glass, not generic cards.

## 3. Typography

Use Manrope for all UI text. Display typography may be large and dramatic, but letter spacing must not get tighter than `-0.04em`. Data labels stay compact and clear. The app can feel cinematic without making numbers hard to read.

## 4. Surfaces

### Scene

The page background is a full environmental matte. It may include cockpit architecture, aquarium depth, bioluminescence, and foreground floor glow. Use overlays to preserve text contrast.

### Glass Pods

Metrics, recommendations, and utility surfaces are rounded translucent glass pods with inner cyan light, subtle water texture, and no heavy opaque card fill.

### Training Tank

The anatomy map is the hero object. It should read as a floating body scan inside a luminous tank/cylinder. The actual SVG anatomy remains data-aligned; the tank, bubbles, particles, and containment rings are decorative CSS/media layers.

## 5. Motion

Allowed: slow drifting particles, soft shimmer, containment-field pulse, subtle scanlines, gauge fills, and hover light response.

Not allowed: motion that delays reading the decision, layout-shifting animation, or hover-only information.

Reduced motion keeps the static cockpit scene and disables decorative drift/pulse/spin.

## 6. Do’s and Don’ts

### Do

- Do make Today feel scene-first and image-led.
- Do use real environmental imagery when it makes the interface feel less like a skinned dashboard.
- Do preserve anatomy highlight accuracy and numeric readability.
- Do simplify chrome when the scene already carries the atmosphere.

### Don’t

- Don’t return to flat card grids with light decorative HUD borders.
- Don’t rasterize labels, recommendations, metrics, or real anatomy overlays.
- Don’t let the background compete with the call, map, or weekly volume.
- Don’t make mobile a long stack of identical cards; compress the world but keep its identity.
