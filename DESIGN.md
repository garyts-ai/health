---
name: Health OS
description: A precise personal performance dashboard for training, recovery, nutrition, and activity context.
colors:
  atmosphere-ink: "#120d24"
  atmosphere-violet: "#4f3b93"
  atmosphere-coral: "#ff8b72"
  signal-neon: "#71fff1"
  surface-editorial: "#f8f5ff"
  text-ink: "#171329"
typography:
  display:
    fontFamily: "var(--font-manrope), system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 0.9
    letterSpacing: "-0.075em"
  body:
    fontFamily: "var(--font-manrope), system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-manrope), system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  sm: "10px"
  md: "16px"
  lg: "20px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-utility:
    backgroundColor: "{colors.atmosphere-violet}"
    textColor: "{colors.surface-editorial}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  body-map:
    backgroundColor: "{colors.atmosphere-ink}"
    textColor: "{colors.surface-editorial}"
    rounded: "{rounded.lg}"
---

# Design System: Health OS

## 1. Overview

**Creative North Star: "The Training Instrument"**

Health OS should feel like a high-end personal performance instrument: compact, calibrated, and responsive. The interface can use atmosphere, but the working surfaces must stay readable and task-first.

The system rejects imagegen realism when it breaks trust. The body map is data geometry first, visual theater second. Motion should feel satisfying because it clarifies state, not because it performs for its own sake.

**Key Characteristics:**
- Dense but legible decision surfaces.
- Indigo-violet atmosphere with restrained coral and neon signals.
- Accurate anatomical overlays with clear weekly and latest-session semantics.
- Crisp motion, short timings, no bounce or elastic effects.

## 2. Colors

The palette is atmospheric but controlled: dark indigo and violet create mood, coral marks training load, and neon cyan is reserved for latest-workout edge state.

### Primary
- **Atmosphere Violet**: The main dashboard field and product identity color.
- **Signal Neon**: Latest workout outline, focus moments, and high-signal interactive feedback only.

### Secondary
- **Atmosphere Coral**: Weekly 2x training exposure, heat accents, and selected high-attention details.

### Neutral
- **Atmosphere Ink**: Deep structural background and dark panels.
- **Surface Editorial**: Light KPI and utility surfaces that keep dense metrics readable.
- **Text Ink**: Primary text on light surfaces.

### Named Rules

**The Neon Is Evidence Rule.** Neon cyan is not decoration. It means latest workout, focus, or live interaction.

## 3. Typography

**Display Font:** Manrope via `var(--font-manrope)` with system fallback.
**Body Font:** Manrope via `var(--font-manrope)` with system fallback.
**Label/Mono Font:** Geist Mono only where code-like or machine metadata is required.

**Character:** Compact, athletic, and modern. Use weight and spacing to clarify hierarchy instead of adding ornamental labels.

### Hierarchy
- **Display** (600, large fixed product headings, tight line-height): Used for Today and the daily split call.
- **Headline** (600, 26px to 58px depending on surface): Used for decision statements and action card titles.
- **Title** (600, 18px to 24px): Used for module titles and key metric values.
- **Body** (400 to 500, 14px to 15px): Used for explanatory copy and recommendation rationale.
- **Label** (500, 11px to 13px): Used for module labels, legends, and compact metadata.

### Named Rules

**The No Decorative Label Rule.** Labels identify data. They do not create fake drama.

## 4. Elevation

Depth comes from tonal layering, borders, and a few ambient shadows. Heavy glow is reserved for the latest-workout outline and interactive focus, not every card.

### Shadow Vocabulary
- **Ambient Product Shadow**: Large diffuse shadow used on the main hero only.
- **Surface Lift**: Small shadow or tonal shift used for hover feedback on KPI and action modules.

### Named Rules

**The Flat Until It Moves Rule.** Static surfaces stay calm. Elevation appears as feedback or hierarchy.

## 5. Components

### Buttons
- **Shape:** Controlled curve (10px to 16px), never oversized pills except compact replay or utility controls.
- **Primary:** Dark-violet or editorial surface depending on surrounding contrast.
- **Hover / Focus:** Short color, border, and shadow transitions with visible focus rings.

### Cards / Containers
- **Corner Style:** Medium curves (16px to 20px) for dashboard modules.
- **Background:** Dark atmospheric surfaces for hero context, editorial light surfaces for metric reading.
- **Shadow Strategy:** Main hero can carry ambient depth. Utility modules should use tonal layering.
- **Border:** One-pixel translucent borders for structure.
- **Internal Padding:** Compact and varied by importance, not identical everywhere.

### Navigation
- **Style:** Minimal top-level utility access. Today remains the flagship surface. Secondary pages should feel related but quieter.

### Signature Component: Body Training Map

The body map is an accurate SVG anatomy layer with weekly fill tiers and latest-workout cyan outline. It can animate in phases, but it must never use a generated image that causes mask drift or anatomical mismatch.

## 6. Do's and Don'ts

### Do:
- **Do** keep the body map anatomically accurate and data-driven.
- **Do** use coral and violet for weekly exposure tiers.
- **Do** reserve neon cyan for latest workout and true focus states.
- **Do** keep motion short, crisp, and reversible.
- **Do** preserve mobile utility and nutrition workflows.

### Don't:
- **Don't** use imagegen realism that compromises highlight alignment.
- **Don't** use glassmorphism as the default surface language.
- **Don't** add decorative charts or panels that do not improve training decisions.
- **Don't** let WHOOP recovery dominate progression and nutrition context.
- **Don't** make users wait through cinematic choreography to read today's decision.
