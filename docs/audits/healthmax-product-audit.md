# HealthMaxer Product Audit

**Audit date:** 2026-07-12  
**Audited snapshot:** `main` at `eed7f68` (`Upgrade anatomy hero interactions`); audit documents and screenshots are the only uncommitted additions  
**Runtime inspected:** `http://localhost:3000` at 1440×1000, 1366×768, and 390×844  
**Severity:** P0 blocks use; P1 can materially mislead or prevent a core task; P2 degrades trust or creates a workaround; P3 is polish.  
**Effort:** S = up to 1 day; M = 2–5 days; L = roughly 1–2 weeks for one engineer.

## Executive conclusion

HealthMaxer already has a useful product core: in one glance it answers “should I train today?”, exposes a complete week, separates current API data from long-range WHOOP export analysis, and preserves full decision context on mobile. The one-page journey is substantially better than a generic health dashboard because it leads with an action and keeps the underlying evidence close.

The current limitation is trust, not usefulness. Several deterministic rules can combine stale, mismatched, unscored, or incorrectly sourced observations; schedule pressure can override poor readiness; week boundaries disagree; and historical/export confidence can sound more certain than the data supports. Until those foundations are corrected, the interface can be persuasive beyond the reliability of its inputs.

## Intended and observed daily journey

1. `/` loads `DailySummary`, WHOOP connection state, and Hevy connection state in parallel (`src/app/page.tsx:21-38`).
2. `#today` leads with the training call, evidence disclosure, anatomy profile, and seven-day telemetry (`src/components/master-dashboard.tsx:37-48`).
3. `#weekly` shows Monday–Sunday completion, volume, scorecard, and activity context (`src/components/master-dashboard.tsx:50-52`).
4. `#whoop` streams independently below Today and currently shows the valid “no export uploaded” state (`src/components/master-dashboard.tsx:54-56`).
5. `#utilities` exposes provider refresh and a compact external-LLM handoff (`src/components/master-dashboard.tsx:58-60`).
6. Legacy `/weekly`, `/whoop`, `/settings`, and `/trends` redirect to the canonical anchors; query preservation was verified live (`src/app/weekly/page.tsx:8-9`, `src/app/whoop/page.tsx:8-9`, `src/app/settings/page.tsx:8-13`, `src/app/trends/page.tsx:3-4`).

## What is already working

- The primary decision appears before secondary analysis, and WHOOP is isolated behind Suspense (`src/components/master-dashboard.tsx:38-56`).
- Runtime recommendations are deterministic and have broad pure-logic coverage (`src/lib/insights/engine.test.ts:295-575`).
- Today telemetry has one pointer/keyboard selection and explicit null readouts (`src/components/training-os/data-rail.tsx:15-50`).
- WHOOP trend paths preserve missing-data gaps and cap visual points while retaining full calculations (`src/components/whoop-trends.tsx:101-164`, `src/components/whoop-trends.tsx:230-355`).
- Journal results are described as associations rather than causal claims (`src/lib/whoop-export/analysis.ts:438-453`).
- Weekly retains all seven days on mobile instead of hiding or horizontally clipping them (`src/app/district.css:354-378`, `src/app/district.css:469-491`).
- The current live decision was internally understandable: low recovery and short sleep produced a conservative “Rest today” call before the weekly ledger.

## Findings

### P-01 — Readiness has no coherent observation-validity gate

- **Evidence:** The engine independently chooses the latest sleep, recovery, and cycle rows without joining their cycle identity, excluding naps, or requiring `SCORED` state (`src/lib/insights/engine.ts:909-966`). Provider staleness is based on sync completion, not observation time (`src/lib/whoop/provider.ts:842-859`). Missing values default away from risk and can produce “readiness is acceptable” (`src/lib/insights/engine.ts:1782-1806`, `src/lib/insights/engine.ts:1864-1866`). WHOOP documents that cycles may be `PENDING_SCORE` or `UNSCORABLE`, and that physiological cycles do not necessarily align with calendar days ([WHOOP Cycle](https://developer.whoop.com/docs/developing/user-data/cycle/)); WHOOP also marks naps separately ([WHOOP Sleep](https://developer.whoop.com/docs/developing/user-data/sleep/)).
- **Severity:** P1.
- **User impact:** A nap, pending row, mismatched cycle, stale observation, or disconnected provider can drive—or fail to constrain—the most important training call.
- **Affected files:** `src/lib/insights/engine.ts`, `src/lib/whoop/provider.ts`, `src/lib/insights/types.ts`, `src/lib/today-view-model.ts`.
- **Root cause:** `DailyReadiness` carries values but not provenance, observation validity, cycle coherence, or per-field age.
- **Recommended correction:** Build one deterministic readiness snapshot from the latest coherent scored cycle, associated recovery, and main sleep. Carry source time, score state, nap state, completeness, and age into the decision. Add an explicit “training-history only / readiness unavailable” mode.
- **Effort:** L.
- **Regression risk:** Medium-high because availability, intent, copy, and tests will change together.
- **Dependencies:** WHOOP schema/query contract; product policy for maximum observation age; fixtures spanning naps and pending cycles.
- **Measurable acceptance criteria:** Disconnected, incomplete, or older-than-policy physiology never produces `Push` or “readiness acceptable”; a later nap cannot replace main sleep; unmatched cycles are marked incomplete; every current metric exposes its observation date.
- **Confidence:** High.

### P-02 — Respiratory rate is read from the wrong record and all daily baselines include the current value

- **Evidence:** Respiratory rate is normalized and stored on sleep rows (`src/lib/whoop/normalize.ts:21-58`, `src/lib/whoop/provider.ts:341-359`), but the engine parses it from recovery raw JSON (`src/lib/insights/engine.ts:546-555`, `src/lib/insights/engine.ts:924-933`). RHR, HRV, strain, respiratory rate, and temperature baselines include the current observation in the seven-row average (`src/lib/insights/engine.ts:978-986`, `src/lib/insights/engine.ts:1013-1034`). A read-only aggregate query found respiratory rate in 89/89 stored sleep rows and 0/88 recovery raw records.
- **Severity:** P1.
- **User impact:** Respiratory drift is silently absent, while other deviations are diluted before they reach fixed illness/recovery thresholds.
- **Affected files:** `src/lib/insights/engine.ts`, `src/lib/whoop/normalize.ts`, `src/lib/whoop/provider.ts`, related engine tests.
- **Root cause:** Metric ownership is inconsistent and there is no shared prior-observation baseline builder.
- **Recommended correction:** Source respiratory rate from the coherent main sleep and compare each current value with prior distinct cycles only, with a minimum sample count.
- **Effort:** M.
- **Regression risk:** Medium.
- **Dependencies:** P-01; aligned WHOOP fixtures.
- **Measurable acceptance criteria:** A prior-seven baseline of 15.0 and current sleep value 15.5 yields +0.5; current is excluded from every baseline; missing current respiratory rate yields `null`; the baseline exposes sample count.
- **Confidence:** High. The existing ±0.3 thresholds remain wearable heuristics, not diagnostic cutoffs.

### P-03 — Weekly goal pressure can override poor systemic readiness

- **Evidence:** Poor readiness produces Rest only when the four-lift target remains reachable after resting; otherwise availability becomes Train (`src/lib/insights/engine.ts:1802-1806`). A test intentionally expects recovery 30%, sleep −1.4h, and overnight disruption to return Train on a schedule-pressure day (`src/lib/insights/engine.test.ts:316-335`).
- **Severity:** P1.
- **User impact:** The same physiology can produce different safety-level availability solely because it is late in the week, making an adherence goal appear more authoritative than recovery.
- **Affected files:** `src/lib/insights/engine.ts`, `src/lib/insights/engine.test.ts`, decision types/copy.
- **Root cause:** Safety/readiness and adherence pressure share one availability predicate.
- **Recommended correction:** Make readiness availability invariant across weekdays. Let schedule pressure alter replanning, target selection, or an explicitly limited technique option—never an ordinary Train result.
- **Effort:** M.
- **Regression risk:** Medium.
- **Dependencies:** Explicit product safety policy; P-01.
- **Measurable acceptance criteria:** Identical poor-readiness inputs yield identical availability Monday through Sunday; schedule pressure changes only future slots or intensity; the cited fixture no longer returns ordinary Train.
- **Confidence:** High on behavior, medium on final policy. CDC guidance also supports symptom-led restraint before normal activity resumes ([CDC respiratory-virus guidance](https://www.cdc.gov/respiratory-viruses/prevention/precautions-when-sick.html)).

### P-04 — Historical context is sign-blind and can leave contradictory advice

- **Evidence:** Historical candidates declare whether lower is unfavorable, but that property is unused (`src/lib/insights/historical-context.ts:68-82`). Any strongest “bottom quartile” metric—including favorably low resting heart rate—can soften Push by patching only `trainingIntent` (`src/lib/insights/historical-context.ts:24-32`). The patch occurs after intensity and reasons are derived (`src/lib/insights/engine.ts:2437-2454`), while recommendation construction can still emit “Train hard” (`src/lib/insights/engine.ts:2071-2102`).
- **Severity:** P1.
- **User impact:** Today can show Maintain beside Push-oriented actions, or turn a favorable low-RHR percentile into a caution.
- **Affected files:** `src/lib/insights/historical-context.ts`, `src/lib/insights/engine.ts`, recommendation tests.
- **Root cause:** Logic is inferred from presentation text and mutates one field after dependent copy is already generated.
- **Recommended correction:** Encode metric direction structurally, apply modifiers before derivation, and regenerate the complete decision/recommendation atomically.
- **Effort:** M.
- **Regression risk:** Medium.
- **Dependencies:** Historical-context type cleanup and fixtures for favorable/unfavorable tails.
- **Measurable acceptance criteria:** Low RHR does not back off; high RHR can; bottom-quartile sleep can; a modified Maintain decision never retains Push intensity or “Train hard” actions.
- **Confidence:** High.

### P-05 — Live WHOOP history is unavailable without export metadata, and old export metadata can cap fresh API confidence

- **Evidence:** Historical context returns before reading API history when no import row exists, then derives confidence from import age even after API rows are merged (`src/lib/insights/historical-context.ts:39-65`, `src/lib/insights/historical-context.ts:78-88`).
- **Severity:** P1.
- **User impact:** Valid live WHOOP history cannot influence deterministic recommendations until a ZIP has been imported; conversely, an old ZIP can make fresh API coverage look stale.
- **Affected files:** `src/lib/insights/historical-context.ts`, historical-context tests, import metadata types.
- **Root cause:** Export provenance is treated as the availability and freshness authority for both export and API sources.
- **Recommended correction:** Merge coverage first, preserve per-source provenance, and derive freshness/confidence from the observations that actually support each conclusion.
- **Effort:** M.
- **Regression risk:** High because recommendation behavior can change for API-only users.
- **Dependencies:** P-01 provenance model; API/export overlap policy.
- **Measurable acceptance criteria:** Fourteen API-only days produce available context; 60 fresh API days can be high confidence without a ZIP; export-only behavior remains deterministic; mixed-source conclusions disclose source coverage.
- **Confidence:** High.

### P-06 — Week boundaries disagree and Weekly starts Monday at noon UTC

- **Evidence:** `monday()` returns `YYYY-MM-DDT12:00:00Z`, and that value is used as the Hevy lower bound (`src/lib/insights/weekly-plan.ts:11-16`, `src/lib/insights/weekly-plan.ts:104-109`). Other weekly counts use server-local `getDay()`/`setHours()` (`src/lib/insights/engine.ts:233-240`, `src/lib/insights/engine.ts:1473-1475`) even though deployment is server-hosted (`README.md:24-32`).
- **Severity:** P1.
- **User impact:** Monday-morning and Sunday-evening sessions can fall into different weeks across plan completion, scorecard, anatomy volume, and deployed runtime.
- **Affected files:** `src/lib/insights/weekly-plan.ts`, `src/lib/insights/engine.ts`, activity/history queries.
- **Root cause:** Multiple ad hoc helpers mix UTC, server local time, and America/New_York semantics.
- **Recommended correction:** Centralize New York calendar intervals and query half-open `[Monday 00:00 ET, next Monday 00:00 ET)` windows everywhere.
- **Effort:** M.
- **Regression risk:** Medium.
- **Dependencies:** Database timestamp conventions and DST test matrix.
- **Measurable acceptance criteria:** Monday 00:01/06:00 ET fixtures are included; Sunday 23:59 stays in the prior week; plan, scorecard, anatomy, and activity counts agree across DST transitions.
- **Confidence:** High.

### P-07 — WHOOP “28-day” findings are row-count windows with overstated confidence

- **Evidence:** Recent cycles are `slice(-28)`, not a 28-calendar-day cutoff (`src/lib/whoop-export/analysis.ts:364-380`); autonomic comparisons use adjacent 28-row slices (`src/lib/whoop-export/analysis.ts:281-285`, `src/lib/whoop-export/analysis.ts:425-437`). Workout averages use the last 28 workouts while frequency uses a four-week date filter (`src/lib/whoop-export/analysis.ts:503-530`). Some findings are labeled High independent of effective observations even when the inventory says “Suggestive only” (`src/lib/whoop-export/analysis.ts:413-437`, `src/lib/whoop-export/analysis.ts:580-582`).
- **Severity:** P1.
- **User impact:** Gaps or unusual workout frequency change the real analysis window and can generate falsely precise, top-ranked conclusions.
- **Affected files:** `src/lib/whoop-export/analysis.ts`, analysis types/tests, WHOOP labels.
- **Root cause:** Record count, calendar coverage, and per-metric sample completeness are conflated.
- **Recommended correction:** Use shared calendar cutoffs, paired samples, minimum-N/coverage rules, and confidence downgrades for gaps.
- **Effort:** L.
- **Regression risk:** Medium-high.
- **Dependencies:** P-06 interval helper; report DTO changes.
- **Measurable acceptance criteria:** Twenty-eight cycles spread across 56 days use only the last 28 calendar days; workouts use the same cutoff; two bedtime observations cannot be High; every autonomic comparison displays N for both windows.
- **Confidence:** High.

### P-08 — “Review today’s evidence” does not expose the evidence needed to audit the call

- **Evidence:** Recommendations contain confidence and supporting metrics (`src/lib/insights/types.ts:25-35`), but Today renders only title, narrative, tags, and change copy (`src/components/training-os/today-prescription.tsx:6-13`). The trigger is explicitly named “Review today’s evidence” (`src/components/training-os/evidence-drawer.tsx:10-15`).
- **Severity:** P2.
- **User impact:** The user cannot inspect the RHR, HRV, temperature, activity load, source age, or thresholds that actually produced Train/Rest and Push/Back off.
- **Affected files:** `src/components/training-os/today-prescription.tsx`, `src/components/training-os/evidence-drawer.tsx`, `src/lib/today-view-model.ts`.
- **Root cause:** Rich decision fields are discarded at the server-to-view boundary.
- **Recommended correction:** Show ranked decision factors with exact value, prior baseline, observation time, source quality, and confidence; keep prose secondary.
- **Effort:** M.
- **Regression risk:** Low.
- **Dependencies:** P-01 and P-02 so the exposed provenance is trustworthy.
- **Measurable acceptance criteria:** Every active decision driver appears with value/source/date; stale or unavailable drivers are explicit; rendered-component tests assert the active driver and confidence state.
- **Confidence:** High.

### P-09 — Weekly is presented as a persisted plan and exact volume ledger, but it is a recomputed forecast

- **Evidence:** Past dates without workouts are rewritten as Recovery, so missed/planned history does not survive (`src/lib/insights/weekly-plan.ts:47-50`, `src/lib/insights/weekly-plan.ts:71-83`). Completed lifts use unique dates while other scorecards count rows; only titles containing “lower” classify Lower (`src/lib/insights/weekly-plan.ts:34-59`, `src/lib/insights/engine.ts:1523-1527`). “Effective sets” combine primary and secondary attribution and force at least one set (`src/lib/insights/body-map.ts:438-499`), yet the UI presents the value without an estimate label (`src/components/weekly-plan-view.tsx:52-64`).
- **Severity:** P2.
- **User impact:** Missed sessions disappear, split workouts can disagree with Done counts, and heuristic muscle stimulus appears more exact than it is.
- **Affected files:** `src/lib/insights/weekly-plan.ts`, `src/lib/insights/body-map.ts`, `src/components/weekly-plan-view.tsx`.
- **Root cause:** There is no canonical planned-versus-actual session model, and a stimulus proxy is named as a measured dose.
- **Recommended correction:** Label the schedule “forecast as of …” now; later persist plan snapshots and missed/replanned states. Use one session-count contract and rename/deduplicate the volume proxy.
- **Effort:** S for honest labels; L for persisted plan semantics.
- **Regression risk:** Low for labels; medium for model changes.
- **Dependencies:** P-06; Hevy exercise classification.
- **Measurable acceptance criteria:** A missed day stays visible or explicitly replanned; same-day split sessions count consistently; Leg/Mixed fixtures classify from exercises; warm-up-only work contributes zero; estimated stimulus is labeled as estimated.
- **Confidence:** High.

### P-10 — WHOOP range controls imply slope and report scope they do not provide

- **Evidence:** Range direction compares selected-range average with the full baseline (`src/lib/whoop-export/chart-ranges.ts:50-69`) but renders “Trending up/down” (`src/components/whoop-trends.tsx:69-73`). The control updates charts while ranked findings, leverage points, and protocol remain the all-export server report (`src/components/whoop-trends.tsx:626-700`, `src/components/whoop-analysis-view.tsx:119-176`).
- **Severity:** P2.
- **User impact:** “Trending up” can be read as temporal slope, and Week/30 days/1 year can be assumed to filter conclusions that actually remain unchanged.
- **Affected files:** `src/lib/whoop-export/chart-ranges.ts`, `src/components/whoop-trends.tsx`, `src/components/whoop-analysis-view.tsx`.
- **Root cause:** Baseline comparison is presented as trend, and filter scope is unstated.
- **Recommended correction:** Use “above/below full-period baseline” unless calculating slope. Label the control “chart range” and stamp each conclusion’s window, or recompute all dependent analysis.
- **Effort:** S for truthful labels; L for full recomputation.
- **Regression risk:** Low/medium.
- **Dependencies:** P-07 if conclusions are made range-aware.
- **Measurable acceptance criteria:** A falling series above baseline is never called “trending up”; changing range either updates all conclusions or visibly states they remain full-export; every finding displays its window.
- **Confidence:** High.

### P-11 — Medical flags overstate denominator and clinical authority

- **Evidence:** Flags inspect up to the last 14/7 cycle rows and trigger on three values, but copy says “of the last 14 measured nights” without reporting actual N (`src/lib/whoop-export/analysis.ts:490-497`). The UI calls them “Flags for medical attention” without a wearable/non-diagnostic boundary (`src/components/whoop-analysis-view.tsx:167-173`).
- **Severity:** P2.
- **User impact:** Three low values in a sparse export can sound like 3/14, and wearable-derived averages can be interpreted as clinician-grade escalation rules.
- **Affected files:** `src/lib/whoop-export/analysis.ts`, `src/components/whoop-analysis-view.tsx`, analysis tests.
- **Root cause:** Denominator, coverage, and missingness are discarded; caution copy is categorical.
- **Recommended correction:** Show `n/N measured nights`, dates, and missingness; state that wearable signals are non-diagnostic; have escalation wording clinically reviewed before expanding it.
- **Effort:** S–M.
- **Regression risk:** Low.
- **Dependencies:** P-07; clinical copy review.
- **Measurable acceptance criteria:** A three-observation fixture says 3/3, never 3/14; each flag shows window and coverage; non-diagnostic language is visible; sparse SpO₂/temperature tests exist.
- **Confidence:** High on the data/UX defect; threshold appropriateness remains unresolved.

### P-12 — Opening the dashboard can refresh both providers and change the decision before the user asks

- **Evidence:** The client posts both sync routes 850ms after mount without checking configuration, staleness, online state, or document visibility (`src/components/mobile-pull-sync.tsx:41-74`). Success triggers `router.refresh()` (`src/components/mobile-pull-sync.tsx:60-64`). During this audit, merely opening/navigating the running app advanced live provider sync timestamps; no sync control was clicked.
- **Severity:** P1.
- **User impact:** The initial decision can silently change after the user starts reading it; every new tab can create external calls, and “read-only” viewing is not actually observational.
- **Affected files:** `src/components/mobile-pull-sync.tsx`, `src/components/training-os/app-shell.tsx`, provider sync routes.
- **Root cause:** Background synchronization is owned by a mount effect rather than an explicit, freshness-aware product lifecycle.
- **Recommended correction:** Make initial viewing side-effect-free. Sync only eligible stale/configured sources through an explicit action or controlled server job, retain per-source results, and explain when evidence changed.
- **Effort:** M.
- **Regression risk:** Medium.
- **Dependencies:** Provider-result contract; stale policy; persistent status UI.
- **Measurable acceptance criteria:** Opening or navigating the dashboard produces zero provider POSTs; a sync has a visible initiator and per-source result; after refresh, the UI names whether the decision changed and why.
- **Confidence:** High.

## Product risk summary

- **Immediate trust blockers:** P-01 through P-07 and P-12.
- **Highest-ROI transparency improvements after correctness:** P-08, P-09, P-10, P-11.
- **Product promise currently met:** deterministic runtime, action-first hierarchy, honest nulls in Today telemetry, complete mobile Weekly, and external-LLM advice kept separate from app-authored recommendations.

The ranked intervention order is in `docs/audits/healthmax-roadmap.md`.
