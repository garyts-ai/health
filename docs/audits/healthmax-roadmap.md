# HealthMaxer Ranked Roadmap

**Audit date:** 2026-07-12  
**Input audits:** [product](healthmax-product-audit.md), [technical](healthmax-technical-audit.md), and [visual](healthmax-visual-audit.md)  
**Constraint:** this document prioritizes future work only; the audit made no production-code changes.

## Ranking model

Each intervention is scored on five dimensions:

- **User impact (I):** 1 = contained polish; 5 = directly changes safety, trust, or daily usefulness.
- **Confidence (C):** 1 = hypothesis needing research; 5 = reproduced live or demonstrated directly in code/data.
- **Effort (E):** 1 = S (up to 1 day); 2 = M (2–5 days); 3 = L (roughly 1–2 weeks). Lower is better.
- **Dependency priority (D):** 1 = independent/later; 5 = prerequisite for several other corrections.
- **Visual/product leverage (V):** 1 = invisible/local; 5 = improves several major surfaces or the core daily journey.

The comparison score is `3I + 2C + 2V + D − 2E`. Final order also respects dependency sequencing: a downstream visual slice cannot outrank the contract it needs to represent truthfully.

## Ranked portfolio

| Rank | Intervention | Category | I | C | E | D | V | Score | Primary evidence |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Coherent readiness observation-validity and provenance gate | A | 5 | 5 | 2 | 5 | 5 | 36 | P-01, P-02, T-07, V-07 |
| 2 | Correct physiology sources and prior-only baselines | A | 5 | 5 | 1 | 4 | 4 | 35 | P-02 |
| 3 | Enforce a readiness safety invariant and recompute all derived copy atomically | A | 5 | 5 | 2 | 4 | 4 | 33 | P-03, P-04 |
| 4 | Make provider synchronization explicit, per-provider, and side-effect free on view | A | 5 | 5 | 2 | 5 | 4 | 34 | P-12, T-01, T-02, V-04 |
| 5 | Establish rendered, accessibility, and provider-contract regression coverage | D | 4 | 5 | 2 | 5 | 4 | 31 | T-15 and live defects |
| 6 | Canonicalize calendar windows and persist/label Weekly semantics | B | 4 | 5 | 3 | 4 | 5 | 30 | P-06, P-09, V-08 |
| 7 | Add section-level error isolation and a complete state vocabulary | B | 4 | 5 | 2 | 3 | 5 | 29 | T-03, V-03, V-07, V-12 |
| 8 | Separate API/export provenance and use real calendar/sample confidence | A | 4 | 5 | 2 | 4 | 4 | 29 | P-05, P-07, P-10, T-07, V-09 |
| 9 | Turn the evidence drawer into an auditable rule/provenance trace | B | 4 | 5 | 2 | 3 | 5 | 29 | P-08, V-05 |
| 10 | Repair mobile shell geometry, anchor alignment, and destination feedback | C | 4 | 5 | 1 | 2 | 5 | 30 | V-01, V-02, V-03, V-04 |
| 11 | Harden provider lifecycle: refresh single-flight, rate limits, revoke, and Hevy deletion reconciliation | A | 4 | 5 | 3 | 3 | 3 | 25 | T-04, T-05 |
| 12 | Encrypt OAuth tokens and publish the privacy/retention surfaces | A | 4 | 5 | 3 | 3 | 2 | 23 | T-06, T-11, T-16 |
| 13 | Correct WHOOP range/report semantics and medical-authority copy | B | 4 | 5 | 2 | 2 | 4 | 27 | P-10, P-11, V-09 |
| 14 | Raise essential microtype and secondary touch-target floors | C | 3 | 5 | 1 | 1 | 4 | 26 | V-06, V-11 |
| 15 | Consolidate tokens and retire proven-dead visual systems | C | 3 | 5 | 3 | 1 | 4 | 22 | T-12, T-14, V-10 |
| 16 | Narrow/profile WHOOP client payload and establish performance budgets | C | 3 | 4 | 2 | 2 | 3 | 21 | T-13 and performance notes |
| 17 | Validate auth/env configuration from one contract | D | 3 | 5 | 1 | 2 | 2 | 23 | T-09, T-10 |
| 18 | Bound archive expansion and formalize import abuse tests | D | 3 | 5 | 1 | 2 | 1 | 21 | T-08 |
| 19 | Dedicated anatomy artwork/interaction/asset-ownership session | E | 2 | 4 | 3 | 1 | 4 | 17 | V-13; newly merged sanity passes |
| 20 | New insights/features only after trust foundations | E | 2 | 3 | 3 | 1 | 3 | 14 | Deferred-feature list below |

The numerical score is a comparison aid, not the sole ordering rule. For example, the mobile shell repair scores highly because it is small and visible, but it stays below the data/state foundations it must display and the regression harness needed to keep it fixed.

## A. Foundational blockers

These establish what data is valid, what the product may claim, and whether external data is handled safely.

### A1. Readiness snapshot contract

- **Scope:** P-01 plus the observation-validity portion of P-02/P-05; define one decision timestamp, required inputs, accepted score states, nap/cycle matching, source, observation age, and missing-data behavior.
- **Why first:** It is the dependency for accurate status copy, evidence, historical context, and error states.
- **Exit criteria:** One typed snapshot object feeds the engine; fixtures prove mismatched/unscored/stale observations cannot silently enter a normal-confidence recommendation; each input exposes provenance and age.

### A2. Physiology and baseline correctness

- **Scope:** Read respiratory rate from normalized sleep data and exclude the current day from every comparison baseline.
- **Dependencies:** A1 contract shape.
- **Exit criteria:** The current seeded data produces respiratory evidence from the correct table; prior-only windows have explicit sample counts; no current value contributes to its own baseline.

### A3. Decision safety and atomic recomputation

- **Scope:** P-03/P-04; prevent weekly goal pressure from escalating intensity under poor readiness, make historical deltas sign-aware, and derive title/rationale/cautions/evidence from the final decision state.
- **Dependencies:** A1/A2.
- **Exit criteria:** Adverse recovery/illness fixtures cannot yield hard training solely to satisfy a weekly target; no output fields contradict the final intent; rule traces identify every override.

### A4. Provider sync lifecycle

- **Scope:** Remove mount-triggered full sync; model provider results individually; deduplicate in-flight work; distinguish attempt, success, observation, unchanged, stale, and failure.
- **Dependencies:** A1 freshness language; coordinate with B2 error states.
- **Exit criteria:** Viewing the app performs zero provider POSTs; partial failure is explicit; one action causes one request per provider; stale content remains readable with timestamp.

### A5. Source-aware history and confidence

- **Scope:** Separate WHOOP API/export metadata, deduplicate overlap, use calendar windows rather than row counts, and base confidence on coverage/sample quality.
- **Dependencies:** A1 and canonical time from B1.
- **Exit criteria:** API-only history works; stale export metadata does not cap fresh API observations; 7/14/28-day reports cover actual dates and disclose sample count/source.

### A6. Provider integrity, privacy, and lifecycle hardening

- **Scope:** Single-flight WHOOP refresh, bounded 429 handling, true scope display, revoke/disconnect, Hevy deletion reconciliation, token encryption, public `/privacy`, and an owner-approved local export retention policy.
- **Dependencies:** Contract fixtures from D1; deployment secret/policy decisions.
- **Exit criteria:** Provider race/deletion fixtures pass; tokens are unusable at rest; anonymous privacy URL works; no automatic raw-data deletion is introduced without explicit approval.

## B. Highest-ROI vertical slices

These convert corrected contracts into user-visible trust and usefulness.

### B1. Honest Weekly plan/history

- **Scope:** One New York calendar model, persisted/versioned plan or explicitly named forecast, and distinct planned/completed/missed/regenerated states; label effective sets as estimated.
- **Dependencies:** A1–A3 and canonical time utilities.
- **Exit criteria:** Week boundaries agree through DST and year rollover; a historical week does not change when reopened; observed and planned states are visually distinct.

### B2. Resilient dashboard state system

- **Scope:** Section error boundaries and loading, refreshing, empty, stale, offline, partial, recoverable-error, and fatal-error variants.
- **Dependencies:** A4 sync results and V-07 vocabulary.
- **Exit criteria:** WHOOP failure cannot blank Today/Weekly; Utilities errors appear at Utilities; last-known valid data remains with a timestamp; each recoverable state has one action.

### B3. Auditable recommendation evidence

- **Scope:** Accessible disclosure plus exact source, observation timestamp, value/unit, baseline window/sample count, confidence/missing assumptions, and deterministic rule trace.
- **Dependencies:** A1–A3.
- **Exit criteria:** A user can explain why the call was made from the drawer alone; keyboard/focus behavior passes automated and manual checks.

### B4. Honest WHOOP analysis

- **Scope:** Distinguish live daily telemetry from long-range export analysis; ensure range controls govern the whole report or charts only; replace trend language without a slope; calibrate medical-authority wording.
- **Dependencies:** A5.
- **Exit criteria:** Range and report scope agree; empty state does not imply live WHOOP is disconnected; findings state their denominator and never imply diagnosis.

## C. Visual polish

Do these after or alongside the first rendered regression scenarios—not as a pre-foundation redesign.

1. **Mobile shell geometry:** one header-height owner, safe-area support, one anchor-offset strategy.
2. **Destination feedback:** place provider/OAuth status in Utilities; keep a visible, accessible persistent error.
3. **Legibility/touch:** essential text at least 12 CSS px; interactive targets at least 44×44 CSS px; verify 200% zoom.
4. **Token consolidation:** migrate active surfaces to semantic roles, one vertical slice at a time.
5. **Dead visual systems:** gate/remove only after static reachability and screenshot evidence; preserve deliberate district identity.
6. **Performance polish:** profile WHOOP hydration and current asset paint cost before refactoring.

## D. Reliability and testing

### D1. High-value regression harness

Start with the defects the existing 106 tests cannot see:

1. Desktop/mobile root render with deterministic seeded data.
2. Header height and all four anchor destination positions.
3. Provider partial success/failure, stale data, and explicit retry.
4. WHOOP section failure while Today/Weekly remain usable.
5. Evidence disclosure keyboard, focus, and accessible state.
6. Weekly DST/year-boundary fixtures and historical stability.
7. WHOOP 401 single-flight, 429 handling, API/export overlap, and Hevy deletion reconciliation.
8. Upload expanded-size/entry-count budgets and transaction rollback.

Add an explicit typecheck command and a diagnostic coverage baseline. Do not set an arbitrary percentage until critical-path gaps are visible.

### D2. Configuration and operational safety

- Unify auth predicate fixtures across proxy/server/login.
- Reject example/sentinel environment values at startup without printing secrets.
- Document raw export inventory/retention and require dry-run plus explicit confirmation for any future cleanup.
- Establish lightweight bundle, hydration, and server-timing baselines before performance restructuring.

## E. Future features

These should begin only after the relevant foundations are accepted:

- Dedicated anatomy art, posterior coverage, interaction, animation, and generated-manifest architecture session.
- WHOOP webhooks or background incremental sync after explicit sync semantics and rate-limit handling exist.
- Offline/PWA mode after the stale/last-known-data contract is complete.
- New recovery insights, trend forecasts, nutrition, symptom tracking, or alerts after source validity and clinical-copy review.
- Additional provider integrations only after adapters share contract fixtures, reconciliation, encrypted credentials, and revoke behavior.
- Runtime AI or model-generated recommendations only if Gary explicitly changes the deterministic, model-free product constraint.

## Top 10 ranked interventions

1. **Build the coherent readiness observation-validity/provenance gate.** This is the trust foundation and the best next task.
2. **Correct respiratory-rate sourcing and prior-only baselines.** Small surface, direct correctness win.
3. **Enforce the readiness safety invariant and atomic decision narrative.** Prevent schedule pressure and patched context from contradicting physiology.
4. **Make provider sync explicit and truthful.** Opening the app must be side-effect free; partial results must remain partial.
5. **Add the rendered/a11y/provider regression spine.** Protects every following vertical slice and catches current live-only defects.
6. **Canonicalize calendar time and Weekly semantics.** Make the week a stable plan/history rather than an exact-looking recomputation.
7. **Isolate section failures and implement the complete state matrix.** Preserve useful content under stale, offline, empty, and failed conditions.
8. **Separate WHOOP API/export provenance and confidence.** Make range, sample, freshness, and source claims true.
9. **Upgrade evidence into an accessible, auditable rule trace.** Turn corrected logic into visible trust.
10. **Repair mobile header/anchors and Utilities feedback.** A bounded, high-leverage shell correction once regression coverage is in place.

## Single best next implementation task

**Implement a typed, coherent readiness observation snapshot and validity gate before the engine chooses training intent.**

This is narrower than “fix all health logic.” It creates the contract that later physiology, safety, evidence, stale-state, and history corrections depend on. It should not redesign the UI, alter provider authorization, change the anatomy asset, or introduce new recommendations.

## Bounded Codex execution prompt

```text
Implement the first HealthMaxer audit intervention: a coherent readiness observation snapshot and validity gate.

Read first:
- docs/audits/healthmax-product-audit.md (P-01 and P-02)
- docs/audits/healthmax-technical-audit.md (T-07)
- src/lib/training-os/engine.ts
- src/lib/training-os/types.ts
- src/lib/whoop/normalize.ts
- src/lib/whoop/provider.ts
- existing training-os and WHOOP tests

Scope:
1. Introduce a typed internal snapshot used before readiness/training intent is derived.
2. Give the snapshot one decision timestamp and explicit per-input metadata: source, observation timestamp, age, score state/validity, cycle/workout association where applicable, and missing reason.
3. Reject or downgrade mismatched sleep/recovery/cycle observations, naps where a main sleep is required, unscored/invalid provider records, and observations outside an explicit freshness policy.
4. Do not silently replace missing recovery with a neutral/acceptable interpretation.
5. Preserve deterministic, model-free runtime behavior and existing public UI shapes unless a minimal optional validity field is required.
6. Add focused fixtures/tests for coherent current data, stale recovery, mismatched cycle, nap-only sleep, unscored record, and missing recovery. Assert both decision eligibility/confidence and the exact missing/invalid reasons.

Constraints:
- Do not redesign the UI or anatomy.
- Do not change OAuth, provider sync scheduling, database schema, Weekly semantics, respiratory-rate source, or baseline math in this task; expose follow-up seams for those items instead.
- Do not install packages.
- Preserve unrelated working-tree changes.
- Run npm test and npm run lint. Add an explicit typecheck only if it uses the existing TypeScript dependency and requires no configuration churn.

Acceptance criteria:
- All recommendation-driving observations pass through one typed validity gate.
- Invalid/mismatched/stale records cannot enter a normal-confidence readiness call.
- Missing recovery cannot produce copy equivalent to “readiness is acceptable.”
- Each rejected/downgraded input has a deterministic machine-readable reason.
- New edge-case tests pass and existing 106 tests remain passing.
- Handoff lists changed files, behavior changes, tests, risks, and deliberately deferred audit items.
```

## Issues that should explicitly not be addressed yet

- **Do not begin a broad anatomy rewrite.** The newly merged figure passes the bounded desktop/mobile sanity check; artwork, posterior coverage, animation, hit paths, and manifest ownership deserve a dedicated session.
- **Do not do a global CSS/token purge before rendered regression coverage.** The cascade contains hidden consumers and purposeful visual character.
- **Do not delete labs, prototypes, cockpit assets, or ignored raw exports without an ownership inventory and Gary’s explicit approval.**
- **Do not add WHOOP webhooks, more providers, or background sync before explicit sync states, rate-limit handling, revoke behavior, and reconciliation exist.**
- **Do not add PWA/offline caching before last-known/stale data semantics are defined.** Caching an unqualified recommendation would deepen the trust problem.
- **Do not add new clinical thresholds or stronger illness language without source validation and clinical copy review.**
- **Do not add runtime AI or model-generated recommendations.** HealthMaxer is currently deterministic and model-free, and this audit found foundational deterministic issues to resolve first.
- **Do not optimize the anatomy/WHOOP renderer by intuition.** Capture bundle, hydration, paint, and interaction baselines before restructuring.
- **Do not merge the entire roadmap into one implementation task.** The acceptance criteria and regression risks are intentionally slice-sized.

