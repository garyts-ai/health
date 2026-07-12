# HealthMaxer Visual and Experience Audit

**Audit date:** 2026-07-12  
**Audited snapshot:** `main` at `eed7f68` (`Upgrade anatomy hero interactions`)  
**Viewports:** 1440×1000, 1366×768, and 390×844  
**Mode:** live browser inspection plus source audit; no implementation changes  
**Severity:** P0 blocks use; P1 hides or misrepresents a core state; P2 creates material friction or inconsistency; P3 is polish.  
**Effort:** S = up to 1 day; M = 2–5 days; L = roughly 1–2 weeks for one engineer.

## Executive conclusion

The canonical dashboard is not generic dashboard slop. Its dark editorial palette, action-first hierarchy, anatomy-led Today section, compact telemetry, and district navigation create a recognizable product. It also holds together at 390 px without page-level horizontal overflow, preserves the full daily prescription on mobile, and provides useful keyboard semantics in the telemetry strip.

The experience weakens at state transitions. Mobile layout uses two conflicting header heights; anchor destinations apply the sticky offset twice; provider feedback can render behind the header or several screens away from the destination; and “Online,” “Connected,” and “Updated” do not consistently mean that the observations driving the recommendation are current. The next visual work should therefore make truth and recovery visible before consolidating tokens or polishing the illustration.

## Representative captures

| Surface | Desktop | Mobile | What the capture establishes |
| --- | --- | --- | --- |
| Today | [desktop Today](screenshots/desktop-today.png) | [mobile Today](screenshots/mobile-today.png) | Action-first hierarchy, anatomy context, telemetry density, responsive stacking |
| Weekly | [desktop Weekly](screenshots/desktop-weekly.png) | [mobile Weekly](screenshots/mobile-weekly.png) | Seven-day rhythm, scorecard hierarchy, compact mobile cards |
| WHOOP | [desktop WHOOP](screenshots/desktop-whoop.png) | [mobile WHOOP](screenshots/mobile-whoop.png) | Honest no-export state but ambiguous live/export relationship |
| Utilities | [desktop Utilities](screenshots/desktop-utilities.png) | [mobile Utilities](screenshots/mobile-utilities.png) | Provider controls and context handoff |
| Error query | [desktop Utilities error](screenshots/desktop-utilities-error.png) | — | Redirect lands at Utilities while the message is rendered in Today, off-screen |
| Anatomy quick check | [desktop lab](screenshots/desktop-anatomy-lab.png) | [mobile lab](screenshots/mobile-anatomy-lab.png) | Newly merged figure renders cleanly at both widths; deeper art review deferred |

## Experience scorecard

This is a heuristic audit score, not an automated compliance claim.

| Dimension | Score | Evidence-backed assessment |
| --- | ---: | --- |
| Accessibility | 3/4 | Semantic main/nav/regions and labeled controls are strong; disclosure focus and small auxiliary type need work |
| Performance discipline | 2/4 | Canonical page is responsive, but no budget exists and WHOOP/anatomy client/paint costs are unmeasured |
| Responsive behavior | 3/4 | No root overflow and good content stacking; header variable and anchor offsets are incorrect |
| Theming/design system | 2/4 | Distinctive direction, but three token/style generations remain active |
| Anti-pattern avoidance | 3/4 | Purposeful composition and restrained motion; old HUD/aquarium systems increase inconsistency risk |
| **Total** | **13/20 — acceptable, not yet hardened** | Trust-state and regression work should precede broad visual polish |

## What is already working

- **Hierarchy:** Today answers the primary question before presenting instrumentation. Weekly, WHOOP, and Utilities follow a coherent “act, plan, analyze, configure” order (`src/components/master-dashboard.tsx:37-60`).
- **Navigation:** Four persistent district links accurately represent the canonical one-page architecture. Legacy pages preserve query parameters and redirect to anchors.
- **Responsive composition:** The audited root had no page-level horizontal overflow at 390×844. Primary visible controls on the canonical root met a 44 px target-size scan.
- **Keyboard structure:** The telemetry date selector responds to arrow keys and exposes “No data” explicitly for missing days (`src/components/training-os/data-rail.tsx:27-43`).
- **Accessibility foundation:** Live DOM inspection found one `main`, one navigation landmark, eight named regions, no duplicate IDs, no unlabeled buttons, and no heading-level jumps.
- **Motion:** The current anatomy stack supports reduced motion and pauses hidden animation; motion is mainly transform/opacity rather than gratuitous page animation.
- **Anatomy merge sanity:** `/lab/anatomy-hero-v2` and `/body?anatomy=qa` rendered successfully after `eed7f68` at desktop and mobile widths. This audit intentionally does not treat illustration refinements as a near-term priority.

## Findings

### V-01 — Mobile uses a 68 px sticky-header token for a 113 px header

- **Evidence:** The root imports `training-os-tokens.css` before `district.css` (`src/app/layout.tsx:3-5`). Tokens set `--app-header-h: 112px` at the mobile breakpoint (`src/app/training-os-tokens.css:41`), but the later district stylesheet resets it to 68 px (`src/app/district.css:17`). The header contains two 56 px rows (`src/components/training-os/app-shell.module.css:9`). Live computed measurement at 390×844 was 68 px token versus 113 px rendered height.
- **Severity:** P1.
- **User impact:** Sticky offsets, anchor positions, scroll padding, and any fixed feedback tied to the variable are wrong on every phone-sized viewport.
- **Affected files:** `src/app/layout.tsx`, `src/app/training-os-tokens.css`, `src/app/district.css`, `src/components/training-os/app-shell.module.css`, `src/components/training-os/page-hero.module.css`, `src/components/training-os/page-transition.module.css`.
- **Root cause:** Header geometry has multiple owners and depends on import order.
- **Recommended correction:** Give the app shell sole ownership of the header block size; expose one semantic variable or derive offsets directly from the shell. Include the safe-area inset and test the two-row layout at supported breakpoints.
- **Effort:** S.
- **Regression risk:** Medium; desktop anchors and route hero spacing share the same variable.
- **Dependencies:** Coordinate with V-02 so offsets are fixed once, not compensated twice.
- **Measurable acceptance criteria:** At 320, 390, 430, 768, and 1440 px, computed header variable and rendered sticky block differ by no more than 1 px; anchored headings remain fully visible; `viewport-fit=cover` and safe-area behavior are explicitly tested where supported.

### V-02 — Anchor destinations apply the sticky offset twice

- **Evidence:** Global `scroll-padding-top` is set in `src/app/district.css:21-24`, while sections also receive `scroll-margin-top` in `src/app/district.css:85-90` and `src/components/training-os/page-transition.module.css:1`. Live anchor navigation left roughly 160–238 px above section content depending on route/load state, exposing a sliver or void from the prior district instead of aligning the destination.
- **Severity:** P1.
- **User impact:** Navigation feels imprecise, especially on mobile, and users can mistake the residual previous section for the selected destination.
- **Affected files:** `src/app/district.css`, `src/components/training-os/page-transition.module.css`, app shell/section markup, redirect pages.
- **Root cause:** Both the scrolling container and each target compensate for the same sticky header.
- **Recommended correction:** Select one offset strategy—prefer container `scroll-padding` for navigation—and remove target compensation unless a specific nested scroller requires it.
- **Effort:** S.
- **Regression risk:** Medium; browser restoration and redirected anchors need retesting after asynchronous content loads.
- **Dependencies:** V-01’s canonical header measurement.
- **Measurable acceptance criteria:** Direct loads and clicks to `#today`, `#weekly`, `#whoop`, and `#utilities` place the target heading 8–24 px below the visible header at all audited widths, before and after WHOOP content resolves.

### V-03 — Utilities failures are rendered in Today, away from the destination that triggered them

- **Evidence:** Query-to-banner copy is generated by `src/lib/settings-banner.ts:1-22`, but `utilityBannerMessage` is passed into the Today `PageHero` (`src/components/master-dashboard.tsx:41`) while the Utilities section renders at `src/components/master-dashboard.tsx:58-60`. Live load of `?whoop=oauth-denied#utilities` positioned the status message about 2,524 px above the viewport; the provider card still appeared “Connected.”
- **Severity:** P1.
- **User impact:** An OAuth or provider action appears to do nothing or contradicts the connection card, leaving no visible recovery guidance.
- **Affected files:** `src/lib/settings-banner.ts`, `src/components/master-dashboard.tsx`, provider settings components, OAuth redirects.
- **Root cause:** Global page-banner placement survived the shift from separate settings pages to a one-page anchored dashboard.
- **Recommended correction:** Render provider-action feedback inside the Utilities region, next to the affected provider. Give it a typed severity, persistent accessible announcement, and focused retry/reconnect action.
- **Effort:** S.
- **Regression risk:** Low to medium; focus and query cleanup behavior must remain predictable.
- **Dependencies:** Technical T-02/T-03 error taxonomy.
- **Measurable acceptance criteria:** Every OAuth/sync query state is visible within the initial Utilities viewport, names the affected provider, uses `role=status` or `role=alert` appropriately, moves focus only when useful, and clears without hiding unresolved failure.

### V-04 — Mobile sync feedback can be obscured by the sticky header and is hidden from desktop

- **Evidence:** The feedback container is `fixed top-3 z-50 ... md:hidden` (`src/components/mobile-pull-sync.tsx:171-180`), while the sticky header uses z-index 70 (`src/components/training-os/app-shell.module.css:2`). The same component automatically syncs at all viewports but renders feedback only below `md`.
- **Severity:** P1.
- **User impact:** A phone user may never see the result because it sits behind the header; a desktop user receives no equivalent visible status for the same background activity.
- **Affected files:** `src/components/mobile-pull-sync.tsx`, `src/components/training-os/app-shell.module.css`, provider status cards.
- **Root cause:** Feedback is positioned as a transient mobile toast rather than part of the provider-sync information architecture.
- **Recommended correction:** After removing mount-time sync, put explicit per-provider progress/result in Utilities and use a global live region only for concise announcements. If a toast remains, anchor it below the measured header and support every viewport.
- **Effort:** S.
- **Regression risk:** Low.
- **Dependencies:** Technical T-01/T-02 and V-01.
- **Measurable acceptance criteria:** Sync result is visually unobscured at 320–1440 px, announced once by assistive technology, remains available until understood for failures, and never reports success for a failed provider.

### V-05 — The evidence disclosure has split semantics and weak visible focus

- **Evidence:** `src/components/training-os/evidence-drawer.tsx:8-15` controls a `<details>` element with a separate button and moves focus to an `h2`. Closed content uses `display:none` and focus outlines are suppressed in `src/components/training-os/evidence-drawer.module.css:5-9`. The disclosure copy itself lists a compact subset rather than exact source/timestamp/value evidence.
- **Severity:** P1.
- **User impact:** Keyboard and screen-reader users can lose their interaction context, and all users encounter an “evidence” affordance that is not sufficient to audit the recommendation.
- **Affected files:** `src/components/training-os/evidence-drawer.tsx`, `src/components/training-os/evidence-drawer.module.css`, `src/components/training-os/today-prescription.tsx`, `src/lib/insights/types.ts`.
- **Root cause:** Native disclosure behavior, custom controlled state, modal-like focus behavior, and recommendation summary were combined without a single interaction contract.
- **Recommended correction:** Use either native `<summary>` semantics or a button with `aria-expanded`/`aria-controls`; keep visible focus; return focus predictably when closing; expose exact observations, provenance, age, baseline window, missing-data assumptions, and rule trace.
- **Effort:** M.
- **Regression risk:** Medium; changing evidence payloads crosses engine and UI boundaries.
- **Dependencies:** Product P-01/P-08 validity and provenance model.
- **Measurable acceptance criteria:** Disclosure passes keyboard open/close/return-focus scenarios, has a visible 3:1 focus indicator, announces expanded state, and shows source plus observation time for every input that materially changed the call.

### V-06 — Essential telemetry and chart text drops below a practical reading size

- **Evidence:** At 1366×768, computed essential labels included approximately 8.32 px range values, 9.28 px day labels, and 9.76 px callout text. Styling originates in compact modules such as `src/components/training-os/metric-instrument.module.css:21-24` and related telemetry/weekly chart rules.
- **Severity:** P2.
- **User impact:** Users must lean in or zoom to read dates, units, and values that determine whether a metric is normal, stale, or missing.
- **Affected files:** telemetry, metric-instrument, weekly scorecard, and WHOOP chart CSS modules.
- **Root cause:** Density and the instrument aesthetic were prioritized without a minimum size/contrast floor for meaningful text.
- **Recommended correction:** Establish 12 px as the minimum for essential auxiliary text and reserve smaller sizes only for decorative, nonessential marks. Prefer fewer labels, progressive detail, or horizontal scroll over illegibility.
- **Effort:** S to M.
- **Regression risk:** Medium; larger labels can collide in narrow cards.
- **Dependencies:** Screenshot coverage and a content-priority pass for each visualization.
- **Measurable acceptance criteria:** All dates, values, units, state labels, and chart legends compute to at least 12 CSS px at 100% zoom; 200% zoom causes no clipping or loss of information; contrast meets WCAG AA for normal text.

### V-07 — “Online,” “Connected,” “Updated,” and “current” do not share one visible freshness meaning

- **Evidence:** The anatomy status is hard-coded as “Online” (`src/components/training-os/anatomy-viewer.tsx:90` and surrounding dashboard composition), provider cards report connection/sync state separately, and sync success is collapsed as described in T-02. Provider staleness is based on sync age, not the newest valid observation (`src/lib/whoop/provider.ts:842-859`). Weekly can return `null` (`src/lib/insights/types.ts:406`, `src/components/weekly-plan-view.tsx:17-18`) and WHOOP can show an empty report frame (`src/components/whoop-trends.tsx:589-596`) without a shared stale/empty language.
- **Severity:** P1.
- **User impact:** The polished status vocabulary encourages users to infer that the training recommendation is based on fresh, complete observations when it may only mean an adapter is connected.
- **Affected files:** anatomy viewer/dashboard labels, provider settings/status, `mobile-pull-sync.tsx`, Weekly/WHOOP empty states, provider freshness logic.
- **Root cause:** Each component names its own technical state; the product lacks a user-facing state model separating connection, last attempt, last success, newest observation, and decision validity.
- **Recommended correction:** Define a shared status vocabulary and visual grammar. Show observation age at the decision, provider connection in Utilities, and sync attempt/result only where an attempt occurs. Replace decorative “Online” with a truthful anatomy/analysis state.
- **Effort:** M.
- **Regression risk:** Medium; copy and status variants span most sections.
- **Dependencies:** Product P-01 and technical T-01/T-02.
- **Measurable acceptance criteria:** Every status label maps to one documented state; fixtures for disconnected, stale, partial, empty, offline, and failed conditions produce distinct copy and styling; no state uses “updated/current/online” without a visible timestamp or definition.

### V-08 — Weekly visually merges forecast, history, completion, and exact-looking volume

- **Evidence:** Weekly is recomputed on read rather than persisted; missed past days can be represented as Recovery, and muscle-volume totals are heuristic (`src/lib/insights/weekly-plan.ts:34-83`, `src/lib/insights/engine.ts:1523-1527`, `src/lib/insights/body-map.ts:438-499`, `src/components/weekly-plan-view.tsx:52-64`). The current cards and scorecard present these values in one coherent visual system without differentiating observed versus planned status.
- **Severity:** P1.
- **User impact:** Users can read a retrospective forecast as a plan they previously received, or interpret heuristic effective sets as a precise training ledger.
- **Affected files:** `src/components/weekly-plan-view.tsx`, `src/app/district.css`, and the weekly-plan/body-map/engine logic.
- **Root cause:** A strong visual summary was built before the data model separated plan version, observed completion, and derived estimate.
- **Recommended correction:** First correct/persist the data contract; then label planned, completed, missed, and regenerated states distinctly, show an “estimated” qualifier for derived volume, and provide the plan generation timestamp.
- **Effort:** M to L.
- **Regression risk:** High; both semantics and visual encodings change.
- **Dependencies:** Product P-06/P-09 and canonical calendar-window work.
- **Measurable acceptance criteria:** A fixture week visually distinguishes planned future days, completed observed sessions, missed days, and regenerated recommendations; historical plan versions do not silently change; every heuristic total is labeled estimated with its source period.

### V-09 — WHOOP controls imply a trend/report scope they do not actually change

- **Evidence:** Range selection filters visible chart rows (`src/components/whoop-trends.tsx:69-73`, `src/components/whoop-trends.tsx:626-700`) but findings/protocol remain based on the full analysis (`src/components/whoop-analysis-view.tsx:119-176`). Range copy describes trending while comparisons are primarily average-versus-baseline (`src/lib/whoop-export/chart-ranges.ts:50-69`). The current empty state says no export is uploaded even while live WHOOP telemetry is connected.
- **Severity:** P1.
- **User impact:** Users can believe changing 7/14/28 days recalculates findings or measures slope; connected users may think WHOOP itself is unavailable rather than only long-range export analysis.
- **Affected files:** `src/components/whoop-trends.tsx`, `src/components/whoop-analysis-view.tsx`, `src/lib/whoop-export/chart-ranges.ts`, WHOOP empty-state copy.
- **Root cause:** One range control visually governs a composite report whose charts and findings use different scopes; API and export products share the WHOOP label.
- **Recommended correction:** Rename the section “Long-range WHOOP analysis” or equivalent, state that daily live sync is unaffected, and either recompute every dependent finding for the chosen calendar range or clearly scope the control to charts only. Use “comparison” unless a slope is calculated.
- **Effort:** M.
- **Regression risk:** Medium; users may rely on current report copy.
- **Dependencies:** Product P-07/P-10/P-11 and source-aware history from T-07.
- **Measurable acceptance criteria:** Changing range updates every element described as range-dependent; chart-only controls are labeled chart-only; empty state distinguishes live API telemetry from export history; slope language appears only when a tested slope statistic exists.

### V-10 — Visual tokens and color roles drift across active and legacy surfaces

- **Evidence:** Active styles are imported in tokens → globals → district order (`src/app/layout.tsx:3-5`) with overlapping variables in `src/app/training-os-tokens.css:1-42`, `src/app/globals.css:3-15`, and `src/app/district.css:1-18`. A static design scan produced 169 raw color/system advisories across four files, 153 in `globals.css`. WHOOP retains legacy premium/HUD classes while the canonical page uses district modules.
- **Severity:** P2.
- **User impact:** Status color, border strength, spacing, and typography vary by section and can regress based on import order rather than semantic intent.
- **Affected files:** all three global stylesheets, WHOOP views, active CSS modules, old HUD/aquarium selectors.
- **Root cause:** Multiple design eras coexist without a canonical semantic-token contract or deprecation map.
- **Recommended correction:** Inventory roles rather than raw colors—canvas, surface, elevated surface, text, muted text, border, focus, success, warning, danger, data series—and migrate one vertical slice at a time after screenshot tests exist.
- **Effort:** L.
- **Regression risk:** High; indiscriminate cleanup can flatten the product’s distinctive hierarchy or break labs.
- **Dependencies:** Technical T-12/T-14/T-15.
- **Measurable acceptance criteria:** Each active semantic role has one owner; raw color count in active components decreases by an agreed baseline; no supported route references legacy HUD/aquarium classes; automated contrast and screenshot checks pass.

### V-11 — Some secondary touch controls fall below the 44 px target floor

- **Evidence:** Root visible controls passed a live target-size scan, but source inspection found compact WHOOP range controls (`src/components/whoop-trends.tsx:662-675`) and `/body` lab controls (`src/app/body/page.tsx:75-86`, `src/app/body/page.tsx:193`) with dimensions/padding below 44 px.
- **Severity:** P2.
- **User impact:** Users with limited dexterity or coarse input can miss range/view controls, particularly when controls are adjacent.
- **Affected files:** WHOOP range control styles/markup and body/lab controls.
- **Root cause:** Compact desktop control styling was reused for touch without an invisible minimum hit area.
- **Recommended correction:** Preserve visual density while increasing interactive boxes to at least 44×44 CSS px; keep 8 px separation or make the whole segmented cell selectable.
- **Effort:** S.
- **Regression risk:** Low; wrapping behavior must be checked on 320–390 px widths.
- **Dependencies:** Browser viewport tests from T-15.
- **Measurable acceptance criteria:** Every interactive element on supported routes measures at least 44×44 CSS px unless an equivalent target is adjacent under WCAG’s exception; no overlap or horizontal page overflow at 320 px.

### V-12 — Loading, empty, offline, stale, and error states are not a complete visual system

- **Evidence:** Suspense provides one WHOOP loading path (`src/components/master-dashboard.tsx:55`), but there are no route error/loading boundaries. Weekly can render nothing when optional data is absent, WHOOP can show an empty frame, provider failure feedback is displaced, and the application has no explicit offline treatment. Current state behavior is distributed across `master-dashboard.tsx`, `weekly-plan-view.tsx`, `whoop-trends.tsx`, provider cards, and `mobile-pull-sync.tsx`.
- **Severity:** P1.
- **User impact:** Under the conditions where trust matters most, sections can disappear, contradict one another, or collapse the page instead of explaining what is known and what the user can do.
- **Affected files:** root page/layout, master dashboard, section views, sync component, provider status/actions, future error/loading boundaries.
- **Root cause:** Happy-path section composition exists, but there is no shared state matrix or component contract for async data.
- **Recommended correction:** Define and render a state matrix per section: initial loading, refreshing with old data, valid empty, stale, offline, partial, recoverable error, and fatal error. Preserve last-known data with timestamp when safe; pair every recoverable state with one clear action.
- **Effort:** M.
- **Regression risk:** Medium; state precedence and caching need careful tests.
- **Dependencies:** Technical T-01–T-03 and shared status vocabulary from V-07.
- **Measurable acceptance criteria:** Story/fixture coverage exists for every state in Today, Weekly, WHOOP, and Utilities; offline mode retains last-known content with an explicit timestamp; no recoverable provider failure blanks an unrelated section; screen readers receive one concise update per transition.

### V-13 — Anatomy interaction and asset ownership still span multiple systems, but this is intentionally deferred

- **Evidence:** Figure selection state and front-art coverage live in `src/components/training-os/anatomy-viewer.tsx:51-61` and `src/components/training-os/anatomy-viewer.tsx:104-109`; related interaction state also exists in the controller (`src/components/anatomy-hero/anatomy-interaction-controller.tsx:40-41`, `src/components/anatomy-hero/anatomy-interaction-controller.tsx:60-66`). Generated bounds/hit paths are owned by `scripts/build-anatomy-hero-assets.py:157-173` and `scripts/build-anatomy-hero-assets.py:231-242`, while the runtime manifest is maintained in `src/lib/anatomy-hero-manifest.ts:20-64`. Mobile hides some figure controls (`src/components/training-os/anatomy-viewer.module.css:240`).
- **Severity:** P3 for the current product audit; dedicate a separate assessment before changes.
- **User impact:** The newly merged front figure works, but posterior-only load can be hard to discover and future asset revisions have multiple geometry/state owners.
- **Affected files:** anatomy viewer/controller/layers/modules, body-map data, manifest, generator script, source and public anatomy assets.
- **Root cause:** The figure evolved through a generated asset pipeline, a semantic body-map, and a client interaction layer without one explicit composition contract.
- **Recommended correction:** Do not fold this into the current foundational work. In a dedicated session, map state ownership, validate front/posterior semantics, profile paint/animation cost, and decide whether the manifest should be generated as the sole runtime geometry source.
- **Effort:** M to L after a separate design/technical brief.
- **Regression risk:** High; visual alignment, hit paths, accessibility, and muscle semantics are tightly coupled.
- **Dependencies:** Dedicated anatomy goals and acceptance references approved by Gary; rendered regression harness.
- **Measurable acceptance criteria:** For this audit, desktop/mobile lab and `/body?anatomy=qa` render without overflow or runtime error and reduced-motion behavior remains intact. Future acceptance criteria should be set in the dedicated anatomy session, not inferred here.

## Accessibility and reduced-motion notes

- Preserve the current landmark/heading structure and anatomy accessible alternatives.
- Add `viewportFit: "cover"` or equivalent only with tested safe-area padding; do not merely increase the header constant (`src/app/layout.tsx:44`).
- Do not suppress focus outlines without an equivalent visible replacement. V-05 is the primary current violation risk.
- Test at 200% zoom, keyboard-only, reduced motion, forced colors, and a representative screen reader after the state-system work. The live DOM scan is not a substitute for assistive-technology testing.
- Motion should continue to use transform/opacity where possible. Anatomy layer masks, filters, and shadows should be profiled in its dedicated session rather than optimized by assumption.

## Information architecture recommendation

Keep the four-district order. It matches the user’s daily decision flow and avoids proliferating routes:

1. **Today — decide:** call, validity, evidence, immediate action.
2. **Weekly — plan:** persisted plan versus observed completion, explicitly distinguished.
3. **WHOOP — analyze:** long-range export/API scope named precisely.
4. **Utilities — maintain:** provider connection, sync, import, privacy, and external handoff.

The architecture needs sharper state ownership, not another navigation redesign. Provider errors belong in Utilities; decision invalidity belongs next to the Today call; and long-range export status belongs in WHOOP.
