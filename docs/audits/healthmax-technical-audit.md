# HealthMaxer Technical Audit

**Audit date:** 2026-07-12  
**Audited snapshot:** `main` at `eed7f68` (`Upgrade anatomy hero interactions`)  
**Mode:** read-only application/repository audit; no production code or dependency changes  
**Severity:** P0 blocks safe operation; P1 can corrupt trust, data, security, or a core flow; P2 creates a material reliability/maintenance risk; P3 is contained debt.  
**Effort:** S = up to 1 day; M = 2–5 days; L = roughly 1–2 weeks for one engineer.

## Executive conclusion

HealthMaxer has a sound deterministic core, a small dependency surface, transactional imports, production-fail-closed authentication, and a passing unit suite. The highest technical risk is not an unstable codebase; it is that several independently reasonable systems do not share one definition of observation validity, calendar time, sync success, or provider history. Those contract seams can produce authoritative-looking output from incomplete or incorrectly sourced data.

The repository also carries three generations of UI styling and several production-routable labs/prototypes. That debt is measurable, but it should follow—not precede—the data-trust, provider-lifecycle, error-isolation, and regression-harness work.

## Scope and verification

- Inspected all tracked application, API, provider, engine, component, style, test, script, asset-manifest, configuration, documentation, and public-asset areas. The TypeScript application contains 111 `.ts`/`.tsx` files, including 21 test files and approximately 13,875 source lines.
- Inspected all 15 App Router entry files: six API routes, the root layout, the canonical dashboard, login, body/lab pages, and four redirect pages.
- Ran the existing test command against the audited commit: **106/106 tests passed**.
- Ran ESLint against the audited commit: **clean**.
- Did not run a production build because the request was a read-only runtime/source audit and lint plus the current tests covered the available non-mutating checks. No coverage command exists.
- Ran the existing development application and inspected `/`, `/body?anatomy=qa`, `/lab/anatomy-hero-v2`, redirect routes, anchor destinations, keyboard interactions, and provider/error query states at desktop and mobile widths.
- Important runtime limitation: mounting `/` invokes the application’s own delayed provider-sync effect. Browser inspection therefore advanced sync timestamps and could refresh local/provider data without a click. No source code was changed and no manual sync, upload, OAuth, disconnect, or destructive control was used. This behavior is itself finding T-01.

### External contract sources checked

- WHOOP’s official [OAuth guide](https://developer.whoop.com/docs/developing/oauth/), [support guidance](https://developer.whoop.com/docs/developing/support/), [rate-limit guidance](https://developer.whoop.com/docs/developing/rate-limiting/), [pagination guide](https://developer.whoop.com/docs/developing/pagination/), and [API reference](https://developer.whoop.com/api/) were used to evaluate token, scope, retry, pagination, and connection-lifecycle behavior.
- Hevy’s official [API documentation](https://api.hevyapp.com/docs/) was used to evaluate pagination and the limits of the current local reconciliation strategy.

## System map

| Area | Primary ownership | Contract boundary |
| --- | --- | --- |
| Daily decision | `src/lib/insights/engine.ts` | normalized WHOOP, Hevy, baselines, weekly-plan, historical context |
| WHOOP live data | `src/lib/whoop/provider.ts`, `src/app/api/whoop/sync/route.ts` | OAuth tokens, WHOOP v2 endpoints, database upserts |
| WHOOP export analysis | `src/lib/whoop-export/analysis.ts`, `src/lib/whoop-export/importer.ts` | uploaded ZIP/CSV, row windows, import metadata |
| Hevy history | `src/lib/hevy/provider.ts`, `src/app/api/hevy/sync/route.ts` | cursor/pagination and local reconciliation |
| Persistence | `src/lib/db.ts` | SQLite/Neon selection, transactions, token storage |
| Application shell | `src/app/layout.tsx`, `src/components/master-dashboard.tsx` | root fetches, section anchors, client/server boundaries |
| Styling | `src/app/globals.css`, `src/app/district.css`, `src/app/training-os-tokens.css`, CSS modules | token ownership, breakpoint behavior, old global systems |
| Anatomy | `src/components/anatomy-hero/`, `src/components/training-os/anatomy-viewer.tsx`, `src/lib/anatomy-hero-manifest.ts` | generated assets, manifest geometry, body-map semantics |

## Findings

### T-01 — Dashboard mount performs unrequested, refresh-heavy provider synchronization

- **Evidence:** `MobilePullSync` schedules `syncAll()` after 850 ms on mount and refreshes the route after completion (`src/components/mobile-pull-sync.tsx:13-21`, `src/components/mobile-pull-sync.tsx:41-74`). Pull-to-refresh is enabled for coarse pointers rather than a documented mobile mode. Live inspection advanced provider timestamps without a user click.
- **Severity:** P1.
- **User impact:** Simply opening the app can consume provider quota, change the decision while it is being read, create network traffic the user did not request, and make “read-only” viewing impossible.
- **Affected files:** `src/components/mobile-pull-sync.tsx`, `src/components/master-dashboard.tsx`, `src/app/api/whoop/sync/route.ts`, `src/app/api/hevy/sync/route.ts`.
- **Root cause:** Manual refresh, mobile pull gesture, initial freshness, and provider orchestration share one client component with no explicit freshness policy or lifecycle owner.
- **Recommended correction:** Make rendering side-effect free. Move freshness decisions to a documented server/provider policy, require an explicit user action for full sync, deduplicate in-flight calls, and update only the affected data instead of globally refreshing the route.
- **Effort:** M.
- **Regression risk:** Medium; dashboards may expose older data if the replacement freshness policy is incomplete.
- **Dependencies:** Define observation freshness and provider status first; coordinate with T-02 and T-04.
- **Measurable acceptance criteria:** Opening or re-focusing `/` issues zero provider-sync POST requests; one user action creates at most one in-flight sync per provider; the UI reports the observation timestamp separately from the last sync attempt; the daily call changes only after a successful, visible refresh.

### T-02 — A partial provider failure is reported as an undifferentiated success

- **Evidence:** WHOOP and Hevy are requested through `Promise.allSettled`; the result is reduced to `hadSuccess`, so one fulfillment produces the success path even when the other provider rejects (`src/components/mobile-pull-sync.tsx:24-30`, `src/components/mobile-pull-sync.tsx:60-65`, `src/components/mobile-pull-sync.tsx:95-101`, `src/components/mobile-pull-sync.tsx:159-166`).
- **Severity:** P1.
- **User impact:** Users can believe all data is current while the failed provider—and the decision fields it supplies—remain stale.
- **Affected files:** `src/components/mobile-pull-sync.tsx`, both provider sync routes, status copy in the dashboard.
- **Root cause:** Sync state is modeled as one boolean rather than a provider-by-provider result with attempt and observation timestamps.
- **Recommended correction:** Return and render typed per-provider outcomes: succeeded, failed, skipped, timed out, and unchanged. Do not collapse partial completion into “updated.”
- **Effort:** S.
- **Regression risk:** Low to medium; existing optimistic copy and tests will change.
- **Dependencies:** T-01 lifecycle decision and a shared sync-result contract.
- **Measurable acceptance criteria:** A forced one-provider failure names that provider, preserves the successful provider result, never displays “all updated,” and exposes a focused retry. Unit tests cover all success/failure permutations.

### T-03 — Server-render failures have no route-level isolation or recovery surface

- **Evidence:** The root page loads summary and provider states with a single `Promise.all` (`src/app/page.tsx:23-27`). WHOOP section loading can reject (`src/components/whoop-district-content.tsx:14`), while `Suspense` in `src/components/master-dashboard.tsx:55` handles latency, not exceptions. There are no `error.tsx` or `loading.tsx` files anywhere under `src/app`.
- **Severity:** P1.
- **User impact:** One transient provider/database failure can replace the whole dashboard with a framework error rather than preserving Today and offering a retry for the failed section.
- **Affected files:** `src/app/page.tsx`, `src/components/master-dashboard.tsx`, `src/components/whoop-district-content.tsx`, new route/section boundaries when implemented.
- **Root cause:** Data dependencies were optimized for a compact page composition without explicit fault domains.
- **Recommended correction:** Isolate independent section loads, add App Router error/loading boundaries, and render typed stale/error states with retry behavior at the smallest recoverable boundary.
- **Effort:** M.
- **Regression risk:** Medium; server/client boundaries and caching behavior can change.
- **Dependencies:** Shared error taxonomy and T-01/T-02 provider status model.
- **Measurable acceptance criteria:** Injected WHOOP failure leaves Today, Weekly, navigation, and Utilities usable; the WHOOP region identifies the failure and retries without a full-page crash; root database failure has a branded recovery page; automated tests exercise both cases.

### T-04 — WHOOP OAuth refresh and rate-limit handling are not concurrency-safe

- **Evidence:** Six WHOOP fetches run concurrently (`src/lib/whoop/provider.ts:762-770`). Each request can independently react to 401 and refresh (`src/lib/whoop/provider.ts:190-192`, `src/lib/whoop/provider.ts:215-217`, `src/lib/whoop/provider.ts:238-240`), although rotated credentials are persisted correctly (`src/lib/whoop/provider.ts:284-288`). There is no 429/`Retry-After` branch in WHOOP or Hevy transport (`src/lib/whoop/provider.ts:185-251`, `src/lib/hevy/provider.ts:31-43`), despite WHOOP’s official [rate-limit guidance](https://developer.whoop.com/docs/developing/rate-limiting/). Refresh requests omit the originally granted scope, and stored scope can fall back to a broader-looking value (`src/lib/whoop/provider.ts:96-109`, `src/lib/whoop/provider.ts:158`, `src/lib/whoop/provider.ts:851`). No revoke/disconnect action exists (`src/components/protected-settings-actions.tsx:39-50`, `src/components/protected-settings-actions.tsx:68-70`); lifecycle expectations were compared with WHOOP’s [OAuth](https://developer.whoop.com/docs/developing/oauth/) and [support](https://developer.whoop.com/docs/developing/support/) guidance.
- **Severity:** P1.
- **User impact:** An expired token can trigger a refresh fan-out and rotation race; bursts can amplify rate limiting; the settings status may overstate granted capabilities; users cannot intentionally revoke the integration.
- **Affected files:** `src/lib/whoop/provider.ts`, `src/lib/hevy/provider.ts`, WHOOP OAuth routes, `src/components/protected-settings-actions.tsx`.
- **Root cause:** Request retry, credential lifecycle, rate limiting, and UI connection state are implemented as local concerns rather than one adapter-level state machine.
- **Recommended correction:** Add single-flight refresh, bounded retries honoring `Retry-After`, explicit granted-scope persistence, and a revoke/disconnect path that clears local credentials after provider revocation.
- **Effort:** M.
- **Regression risk:** High; token rotation and retry mistakes can disconnect the account.
- **Dependencies:** Provider contract tests and a secure token-storage decision from T-06.
- **Measurable acceptance criteria:** Six concurrent 401 responses produce one refresh request; requests retry once with the rotated token; a synthetic 429 waits the advertised interval within a defined cap; displayed scopes equal the provider grant; disconnect revokes and removes credentials with an auditable result.

### T-05 — Hevy synchronization never reconciles remote deletions

- **Evidence:** The adapter paginates and upserts fetched workouts (`src/lib/hevy/provider.ts:150-191`, `src/lib/hevy/provider.ts:194-208`, `src/lib/hevy/provider.ts:242-248`) but has no tombstone, full-snapshot reconciliation, or deletion detection.
- **Severity:** P1.
- **User impact:** A workout deleted or corrected in Hevy can remain indefinitely in local weekly volume, muscle load, and training-history inputs.
- **Affected files:** `src/lib/hevy/provider.ts`, database workout tables/upserts in `src/lib/db.ts`, weekly and training-engine consumers.
- **Root cause:** The sync contract assumes append/update semantics while the source system permits deletion.
- **Recommended correction:** Define a bounded reconciliation strategy: provider deletion markers if available, otherwise periodic full-window comparison with transactional tombstones and recomputation of affected weeks.
- **Effort:** M.
- **Regression risk:** High; an incorrect comparison could delete valid local history.
- **Dependencies:** Provider contract fixtures, stable remote identifiers, and database backup/rollback semantics.
- **Measurable acceptance criteria:** Deleting a fixture workout removes or tombstones exactly that local record on reconciliation; affected weekly totals recalculate; records outside the reconciliation window remain unchanged; retry is idempotent.

### T-06 — WHOOP access and refresh tokens are stored as plaintext application data

- **Evidence:** OAuth credentials are ordinary fields in the provider-account schema and are read/written directly (`src/lib/db.ts:64-82`, `src/lib/db.ts:327-345`, `src/lib/whoop/provider.ts:127-167`). Production authentication fails closed, but database compromise would expose reusable provider credentials.
- **Severity:** P1.
- **User impact:** A database leak can become a WHOOP account/data-access incident rather than only a HealthMaxer data leak.
- **Affected files:** `src/lib/db.ts`, `src/lib/whoop/provider.ts`, deployment secrets and migration tooling.
- **Root cause:** Persistence was designed for functional OAuth rotation without an at-rest credential boundary.
- **Recommended correction:** Envelope-encrypt tokens with a deployment-held key, support key versioning/rotation, redact operational logs, and migrate existing records transactionally.
- **Effort:** M.
- **Regression risk:** High; key loss or migration bugs can make integrations unrecoverable.
- **Dependencies:** Deployment secret-management decision, migration/rollback plan, and T-04 token-lifecycle tests.
- **Measurable acceptance criteria:** Database rows contain no usable plaintext token; decrypt is limited to the provider adapter; logs/tests never emit credentials; old and new key versions can be rotated; a failed migration leaves the original record recoverable.

### T-07 — Live WHOOP history and export confidence are coupled through the wrong metadata gate

- **Evidence:** Historical context returns no WHOOP history without export metadata and can cap fresh API-derived context using old export metadata (`src/lib/insights/historical-context.ts:39-44`, `src/lib/insights/historical-context.ts:47-65`, `src/lib/insights/historical-context.ts:78-88`).
- **Severity:** P1.
- **User impact:** Connected users may receive less historical context than the live API data supports, or an old upload can make current API evidence look stale.
- **Affected files:** `src/lib/insights/historical-context.ts`, `src/lib/whoop/provider.ts`, import metadata in `src/lib/db.ts`, decision copy in `src/lib/insights/engine.ts`.
- **Root cause:** Provenance, coverage, freshness, and confidence are represented by one export-centric path rather than per-source metadata.
- **Recommended correction:** Introduce a source-aware observation envelope and merge policy. Calculate coverage and freshness independently for API and export data; use deterministic precedence/deduplication by stable observation ID and timestamp.
- **Effort:** M.
- **Regression risk:** High; historical context changes can alter recommendations.
- **Dependencies:** Product finding P-01’s validity model and P-07’s calendar-window definition.
- **Measurable acceptance criteria:** API-only fixtures produce historical context; stale export metadata cannot downgrade newer API observations; overlapping records count once; every context statement exposes source, observation range, sample count, and confidence reason.

### T-08 — Upload limits are enforced after buffering and only on compressed size

- **Evidence:** The export route reads the uploaded file before import validation (`src/app/api/whoop/export-import/route.ts:23-28`). The importer enforces a configured compressed/file size but reads ZIP members without a total decompressed-byte, entry-count, or compression-ratio budget (`src/lib/whoop-export/upload.ts:9`, `src/lib/whoop-export/upload.ts:22-25`, `src/lib/whoop-export/upload.ts:32-38`, `src/lib/whoop-export/upload.ts:53-64`, `src/lib/whoop-export/importer.ts:123-143`).
- **Severity:** P2.
- **User impact:** An accidental or malicious high-expansion archive can consume excessive memory/CPU and make the single-user application unavailable.
- **Affected files:** `src/app/api/whoop/export-import/route.ts`, `src/lib/whoop-export/upload.ts`, `src/lib/whoop-export/importer.ts`.
- **Root cause:** Validation treats the archive as a normal user export and constrains transfer size, not processing cost.
- **Recommended correction:** Reject by request content length where trustworthy, stream or bound buffering, cap entry count, per-entry bytes, total expanded bytes, compression ratio, and parse time; keep imports transactional.
- **Effort:** S to M.
- **Regression risk:** Medium; legitimate large exports may need a documented limit or asynchronous flow.
- **Dependencies:** Real export-size samples and an operational memory budget.
- **Measurable acceptance criteria:** Oversized compressed and expanded fixtures fail before high memory allocation; duplicate/invalid archives leave zero partial rows; a representative full export succeeds within documented memory and time limits.

### T-09 — Authentication predicates can disagree and create an allowlist redirect loop

- **Evidence:** Proxy and server authentication normalize/validate configuration differently (`src/proxy.ts:24-30`, `src/lib/auth.ts:28-43`). The login page performs its own decision (`src/app/login/page.tsx:40-43`). Whitespace or malformed allowlist entries can therefore be accepted at one boundary and rejected at another.
- **Severity:** P2.
- **User impact:** A correctly authenticated owner can bounce between login and a protected route or see inconsistent access behavior after deployment configuration changes.
- **Affected files:** `src/proxy.ts`, `src/lib/auth.ts`, `src/app/login/page.tsx`, auth configuration tests.
- **Root cause:** Authorization policy is duplicated across Edge proxy, server helpers, and page rendering.
- **Recommended correction:** Define one normalization contract and shared test corpus; where runtime constraints prevent code sharing, generate both predicates from the same pure specification and fail configuration validation at startup.
- **Effort:** S.
- **Regression risk:** Medium; tightening normalization may lock out an incorrectly configured deployment until corrected.
- **Dependencies:** Documented owner/allowlist policy and deployment validation.
- **Measurable acceptance criteria:** Identical fixtures produce identical allow/deny decisions in proxy, server, and login tests; whitespace is trimmed; empty/malformed production configuration fails closed with a non-looping setup error.

### T-10 — Example environment placeholders pass the “configured” check

- **Evidence:** `.env.example` and `.env.vercel.example` contain placeholder-like values (`.env.example:1-4`, `.env.example:10-12`), while `src/lib/env.ts:8-10` and `src/lib/env.ts:23-40` primarily test presence rather than known sentinel formats.
- **Severity:** P2.
- **User impact:** A deployment can start with a plausible connected/authenticated status and fail only when a provider or database path is exercised.
- **Affected files:** `.env.example`, `.env.vercel.example`, `src/lib/env.ts`, deployment README.
- **Root cause:** Examples double as copyable configuration, but validation has no distinction between a sample sentinel and a real secret/URL.
- **Recommended correction:** Use explicit `REPLACE_ME` sentinels and schema validation for URL, key length, mutually required variables, and production-only constraints.
- **Effort:** S.
- **Regression risk:** Low; stricter startup checks may surface existing bad environments.
- **Dependencies:** Enumerate supported SQLite/Neon and OAuth deployment modes.
- **Measurable acceptance criteria:** Both example files fail validation unchanged; a complete fixture passes; errors name the exact variable and never print secret contents.

### T-11 — The privacy policy is present in source but not an application route

- **Evidence:** The only policy document is repository-root `privacy.html:1-66`; README links to the repository file (`README.md:105-107`). It is not in `public`, has no Next route, and is not included in the unauthenticated proxy allowlist (`src/proxy.ts:4-10`, `src/proxy.ts:40-45`, `src/proxy.ts:83-84`).
- **Severity:** P1.
- **User impact:** An OAuth reviewer or user cannot reliably open the policy at the deployed product origin, especially before authentication.
- **Affected files:** `privacy.html`, `README.md`, `src/proxy.ts`, future privacy route/public document.
- **Root cause:** Compliance content was added as repository documentation rather than a deployed product surface.
- **Recommended correction:** Publish a stable unauthenticated `/privacy` route, link it from login/settings, and keep ownership/contact/data-retention text synchronized with actual provider behavior.
- **Effort:** S.
- **Regression risk:** Low; legal copy still needs owner review.
- **Dependencies:** Confirm public product origin and approved policy wording.
- **Measurable acceptance criteria:** `/privacy` returns 200 without a session in production; OAuth configuration and in-app links use that URL; automated routing tests cover anonymous access; policy statements match storage, deletion, and provider revocation behavior.

### T-12 — Style/token ownership is split across three active systems

- **Evidence:** Root import order is tokens, globals, then district (`src/app/layout.tsx:3-5`). `src/app/globals.css:3-15` and `src/app/globals.css:173-304`, `src/app/training-os-tokens.css:1-42`, and `src/app/district.css:1-18` define overlapping colors, spacing, surfaces, and layout variables; district then overrides shared behavior (`src/app/district.css:54-65`, `src/app/district.css:425-443`). WHOOP views still use legacy premium/HUD classes (`src/components/whoop-analysis-view.tsx:69`, `src/components/whoop-analysis-view.tsx:82`, `src/components/whoop-analysis-view.tsx:123`, `src/components/whoop-analysis-view.tsx:150`).
- **Severity:** P2.
- **User impact:** Small changes can produce breakpoint-only regressions, inconsistent surfaces, or unreadable combinations that are difficult to predict from a component file.
- **Affected files:** the three global stylesheets, CSS modules, WHOOP views, `src/app/layout.tsx`.
- **Root cause:** Successive visual directions were layered into the global cascade without a migration boundary or single token source.
- **Recommended correction:** After foundational trust work, inventory semantic tokens, choose one canonical token layer, migrate active components slice by slice, and delete global legacy selectors only after rendered regression coverage exists.
- **Effort:** L.
- **Regression risk:** High; the cascade has implicit consumers and lab routes.
- **Dependencies:** T-14 route/prototype ownership and T-15 rendered regression harness.
- **Measurable acceptance criteria:** One file/module owns each semantic token; active routes use no legacy premium/HUD/aquarium selectors; token contrast is tested in supported themes; desktop/mobile screenshot diffs stay within approved thresholds.

### T-13 — The full WHOOP report crosses into a large client-rendered boundary

- **Evidence:** `src/components/whoop-trends.tsx` is a client component and carries range controls, charts, formatting, and report composition (`src/components/whoop-trends.tsx:1`, `src/components/whoop-trends.tsx:193-194`, `src/components/whoop-trends.tsx:626-694`). It passes the complete analysis into another broad view (`src/components/whoop-analysis-view.tsx:119`).
- **Severity:** P2.
- **User impact:** Users without export data still download/hydrate client code for a complex report; large datasets increase serialization, hydration, and interaction cost.
- **Affected files:** `src/components/whoop-trends.tsx`, `src/components/whoop-analysis-view.tsx`, WHOOP server component loaders.
- **Root cause:** Interactive range state defines the boundary for the entire report rather than only the controls/chart requiring client state.
- **Recommended correction:** Profile first, then keep report framing and static findings server-rendered; pass a compact, precomputed chart series to a narrowly scoped client island and lazy-load the full export analysis only when data exists.
- **Effort:** M.
- **Regression risk:** Medium; serialization and range semantics can drift during the split.
- **Dependencies:** Correct range/report contract from product finding P-10 and a bundle/runtime baseline.
- **Measurable acceptance criteria:** No-export state ships no full report client module; the interactive island receives only visible-range fields; hydration time and transferred JavaScript improve against a recorded baseline; report output remains identical for fixtures.

### T-14 — Production-routable prototypes and abandoned visual systems remain globally shipped

- **Evidence:** Root product documentation still names older route concepts (`PRODUCT.md:7-16`); `/body` and `/lab/anatomy-hero-v2` are production routes. `src/app/globals.css:152-169`, `src/app/globals.css:334-382`, and `src/app/globals.css:602-1198` contain older Giga/HUD/aquarium systems. Public background assets are 2,641,942 and 2,253,822 bytes. `DESIGN.json`, `DESIGN.md`, old global classes, and orphan components describe overlapping generations.
- **Severity:** P2.
- **User impact:** Direct links can expose unsupported surfaces; dead global CSS increases regression search space and makes active design intent harder to understand.
- **Affected files:** `PRODUCT.md`, `DESIGN.json`, `DESIGN.md`, `src/app/globals.css`, `src/app/body/page.tsx`, `src/app/lab/anatomy-hero-v2/page.tsx`, old components and `public/images/*cockpit*`.
- **Root cause:** Prototypes were preserved in-place without an explicit lab-only routing, archival, or deletion policy.
- **Recommended correction:** Build an ownership matrix before deletion: canonical, protected lab, retained source asset, or removable. Gate labs outside intended environments; remove only assets/selectors proven unreachable by static and rendered checks.
- **Effort:** M.
- **Regression risk:** High if done mechanically; global selectors and visual QA assets can have hidden consumers.
- **Dependencies:** T-12 token consolidation and T-15 rendered coverage; explicit owner approval for deletion.
- **Measurable acceptance criteria:** Every route/component/global selector has an owner and status; unsupported labs are absent or protected in production; unreachable assets are removed with before/after bundle evidence; canonical screenshots are unchanged.

### T-15 — Tests protect pure logic but not rendered behavior, integrations, accessibility, or coverage

- **Evidence:** `package.json:8-16` exposes lint and `node --test src/**/*.test.ts` only. The 21 test files cover pure helpers and deterministic engine behavior (for example `src/components/training-os/training-os.test.ts:35-67` and `src/components/whoop-trends.test.ts:10-42`) but there is no DOM renderer, browser/E2E suite, axe pass, viewport matrix, contract fixture runner, typecheck script, or coverage threshold.
- **Severity:** P1.
- **User impact:** The current mobile header, hidden destination feedback, partial-sync copy, and absent error boundaries can ship while all 106 tests and lint pass.
- **Affected files:** `package.json`, existing tests, future browser/contract/accessibility test configuration.
- **Root cause:** The suite grew around deterministic health logic while the product expanded into provider integration and a complex responsive dashboard.
- **Recommended correction:** Add a small layered harness: explicit `typecheck`; provider adapter fixtures; component/DOM accessibility tests for stateful controls; and 5–8 high-value browser scenarios at desktop/mobile widths. Add coverage only as a diagnostic baseline before setting thresholds.
- **Effort:** M.
- **Regression risk:** Low for product behavior, medium for CI time/flakiness.
- **Dependencies:** Stable seeded test data and state-injection hooks; prioritize T-01–T-03 and visual findings V-01–V-04 as the first scenarios.
- **Measurable acceptance criteria:** CI runs lint, typecheck, 106+ unit tests, provider fixtures, accessibility checks, and desktop/mobile browser scenarios; tests fail on the currently documented header-offset, hidden-banner, and partial-sync defects until corrected; flake rate stays below 1% over 50 runs.

### T-16 — Ignored raw health exports remain in the local workspace without a retention workflow

- **Evidence:** The audit found raw export ZIPs in the ignored `data` workspace. `.gitignore:43-50` correctly prevents them from being committed, and the importer does not persist the uploaded ZIP after parsing, but there is no documented local retention/deletion workflow.
- **Severity:** P2.
- **User impact:** Sensitive health data can outlive its useful import window on developer machines and backups despite never entering Git.
- **Affected files:** `.gitignore`, `data/` operational contents, import/retention documentation.
- **Root cause:** Source-control protection exists, but data lifecycle ownership stops at “ignored.”
- **Recommended correction:** Document a bounded local-retention policy, support an explicit owner-approved cleanup command or UI, and keep backups/logs out of raw-content paths. Do not delete existing exports as part of unrelated engineering work.
- **Effort:** S.
- **Regression risk:** High if automated deletion is careless; low for documentation.
- **Dependencies:** Gary’s retention preference and recovery requirements.
- **Measurable acceptance criteria:** Documentation states where raw exports live, how long they are retained, and how to remove them safely; retention checks never traverse outside the configured data directory; deletion requires explicit confirmation and has a dry-run inventory.

## Positive controls worth preserving

- Production authentication fails closed when required configuration is absent (`src/lib/auth.ts`, `src/proxy.ts`).
- WHOOP OAuth state is random, time-bounded, and single-use; rotated refresh credentials are persisted.
- Database imports/upserts are transactional and idempotent; invalid uploads do not intentionally store raw ZIP contents.
- The runtime remains deterministic and model-free.
- The anatomy asset pipeline has deterministic manifests/reports, accessible alternatives, hidden-state pause behavior, and reduced-motion handling. The newly merged anatomy commit rendered cleanly in a bounded desktop/mobile sanity check; deeper artwork/performance work is intentionally deferred to its own session.

## Performance and asset notes

- The canonical root had no page-level horizontal overflow at 1440×1000 or 390×844.
- Twenty current anatomy WebP layers total approximately 330 KB; six tracked source/audit artifacts total approximately 2.82 MB. The older cockpit PNGs total approximately 4.90 MB and are the larger obvious dead-asset candidates.
- Anatomy currently uses eager, unoptimized layered images and paint-heavy masks/shadows (`src/components/anatomy-hero/anatomy-layer.tsx:81-90`, `src/components/anatomy-hero/anatomy-hero.module.css:98-129`, `src/components/anatomy-hero/anatomy-hero.module.css:181-185`). This is a profiling candidate, not a current ranked intervention, because the user has reserved the figure for a dedicated working session.
- No bundle analyzer, Web Vitals capture, server-timing instrumentation, or reproducible performance budget exists. Measure before restructuring T-13 or the anatomy renderer.

## Technical risk summary

| Risk family | Highest severity | Primary finding | Current protection | Missing protection |
| --- | --- | --- | --- | --- |
| Decision correctness | P1 | Product P-01/P-02/P-03 | Deterministic unit tests | Shared validity/provenance contract |
| Provider lifecycle | P1 | T-01/T-02/T-04/T-05 | Idempotent upserts, token rotation | Explicit sync states, single-flight, reconciliation |
| Security/privacy | P1 | T-06/T-11 | Auth fails closed, ignored raw data | Encrypted tokens, deployed policy, retention workflow |
| Failure recovery | P1 | T-03 | Suspense loading shell | Error boundaries and partial preservation |
| UI architecture | P2 | T-12/T-14 | CSS modules in active areas | Single token owner and route/prototype inventory |
| Regression safety | P1 | T-15 | 106 passing unit tests, clean lint | Browser, DOM/a11y, contract, coverage baselines |
