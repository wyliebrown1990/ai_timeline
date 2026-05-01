# Sprint SEOI-8: Clustered Opportunity Mining

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-05-01 by Codex (sprint created — no tasks started)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `frontend.md`, `data-models.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-SEO-Insights-Pilot.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm SEOI-1 through SEOI-7 are complete enough that the pilot is stable in prod. This sprint is a post-pilot expansion, not a substitute for pilot closure.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` or `agent-browser` for UI validation. Never skip browser checks on admin changes.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

The live pilot proved the exact-query weekly buckets are directionally useful but too sparse on a newer site. This sprint widens the signal horizon by mining finalized 28-day and 90-day windows, clustering semantically similar queries, and surfacing broader opportunities that a weekly exact `query + page` row misses.

This is the first post-pilot sprint because it improves the **quality of the input signal** before the later sprints automate more output. It also expands near-win detection beyond `/blog/*` so LAEA can optimize the page types that are actually getting impressions today: `/explained`, `/who-invented`, `/events`, `/people`, and `/timeline`.

**Priority**: HIGH
**Depends on**: SEOI-1 through SEOI-7 stable; 90 days of GSC history available in prod
**Estimated Effort**: 2-3 days
**Status**: Not started

---

## Prerequisites

- [ ] SEOI-1 through SEOI-7 are deployed and stable enough that `/admin/seo-insights` is the source of truth for live SEO findings
- [ ] At least 90 days of finalized GSC data exists in `GscDailyMetric`
- [ ] Current bucket thresholds and findings have been reviewed against live data
- [ ] Local dev server running: `npm run dev` + `npm run dev:server`

---

## Tasks

### 1. Cluster specification

- [ ] Write a deterministic clustering spec before coding:
  - normalize punctuation, quotes, casing, plurals, stop words, and obvious prompt-like noise
  - collapse close variants such as `in context learning` / `in-context learning` / `what is in-context learning`
  - keep entity disambiguation explicit so unlike terms do not collapse into one noisy bucket
- [ ] Use live LAEA examples to validate the spec:
  - `ai timeline` + long-tail timeline variants
  - `mixture of experts` variants
  - `model collapse` variants
  - `gpt` definitional variants
  - `history of ai agents`
- [ ] Keep v1 deterministic. Do **not** add a vector DB or embedding service in this sprint unless the deterministic pass clearly fails on real examples.

### 2. Data model

- [ ] Add a new snapshot model to `prisma/schema.prisma` for clustered windows, for example `GscClusterSnapshot`:
  - `windowStart`, `windowEnd`
  - `horizon` (`28d` | `90d`)
  - `clusterKey`
  - `representativeQuery`
  - `memberQueriesJson`
  - `memberPagesJson`
  - `primaryPage`
  - `totalClicks`, `totalImpressions`, `ctr`, `position`
  - `bucket`, `bucketScore`, `status`, `evidenceJson`
- [ ] Generate a Prisma migration for the new cluster snapshot table
- [ ] Add indexes supporting admin filters by `horizon`, `bucket`, `windowEnd`, and `status`

### 3. Cluster mining service

- [ ] Create `server/src/services/gsc/queryClusterer.ts`
- [ ] Build clustered snapshots from finalized `query_detail` rows only; do **not** destroy the existing exact-row model
- [ ] Support two horizons:
  - `28d` for near-win and packaging opportunities
  - `90d` for fragmented content-gap mining and topic/theme mining
- [ ] Emit at least these opportunity types:
  - `cluster_content_gap`: repeated demand landing on generic or misaligned destinations
  - `cluster_near_win`: repeated demand on an existing page with meaningful impressions, weak CTR, and middling rankings
  - `cluster_topic_theme`: repeated informational demand spanning multiple close variants where LAEA may need a broader content pod
- [ ] Keep cluster evidence legible in plain English so the admin UI can explain why the cluster exists

### 4. Broaden near-win detection

- [ ] Refactor the current `winnable_loss` logic so it can evaluate all public content page types, not just `/blog/*`
- [ ] Introduce an allowlist of public page types to evaluate:
  - `/explained/*`
  - `/who-invented/*`
  - `/events/*`
  - `/people/*`
  - `/organizations/*`
  - `/timeline` and approved timeline subroutes
- [ ] Keep page-type-specific safeguards where needed:
  - do not auto-ship body content here
  - keep the output at the “opportunity surfaced” layer only

### 5. Admin API

- [ ] Add admin endpoints:
  - `GET /api/admin/seo/clusters?horizon=90d&bucket=cluster_content_gap&limit=&page=`
  - `GET /api/admin/seo/clusters/:id`
  - `POST /api/admin/seo/clusters/:id/dismiss`
  - `POST /api/admin/seo/clusters/:id/action`
- [ ] Extend the health endpoint or a sibling endpoint to expose the latest clustered-window rebuild timestamps

### 6. Admin UI

- [ ] Add a clustered-opportunities surface to the existing SEO Insights admin:
  - either a new `Clusters` tab on `/admin/seo-insights`
  - or a dedicated route `/admin/seo-insights/clusters`
- [ ] Add filters for:
  - `28d` vs `90d`
  - cluster bucket
  - status
- [ ] Detail drawer should show:
  - representative query
  - member queries and impression share
  - landing pages involved
  - total impressions / clicks / CTR / position
  - plain-English evidence
  - suggested next step

### 7. Tests

- [ ] Unit tests for query normalization and clustering in `tests/unit/gsc/queryClusterer.test.ts`
- [ ] Unit tests covering broad near-win detection across multiple page types in `tests/unit/gsc/bucketClassifier.test.ts`
- [ ] Integration tests for cluster endpoints in `tests/unit/seoAdmin.test.ts`
- [ ] Frontend tests for the clustered opportunities UI in `tests/unit/pages/admin/SeoInsightsPage.test.tsx` or a new page test file
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] Focused tests for all new SEOI-8 coverage pass

### 8. Deploy

- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [ ] Run Prisma migration in prod before backend verification
- [ ] Frontend: `./scripts/deploy-frontend.sh`
- [ ] Trigger a manual rebuild of cluster snapshots after deploy

### 9. Backend Validation

- [ ] Verify the new cluster endpoints return non-empty results on prod for at least one 90-day cluster bucket
- [ ] Confirm that at least 5 non-noise clustered opportunities exist in production data
- [ ] Verify expanded near-win detection surfaces at least one non-blog page opportunity if the live data supports it
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 30m` — zero errors

### 10. Browser Validation (agent-browser CLI)

- [ ] Open the clustered opportunities surface: `agent-browser open https://letaiexplainai.com/admin/seo-insights`
- [ ] Take initial screenshot: `agent-browser screenshot`
- [ ] Get interactive element refs: `agent-browser snapshot -i`
- [ ] Switch between `28d` and `90d` horizons
- [ ] Open one cluster detail drawer and verify member queries/pages render
- [ ] Dismiss one fixture or low-value cluster and confirm persistence after refresh
- [ ] Take final screenshot: `agent-browser screenshot`
- [ ] Mobile viewport check for the clustered view

---

## Definition of Done

- [ ] All tasks above checked
- [ ] Clustered opportunities are live in prod on a 28d and 90d horizon
- [ ] At least 5 meaningful clustered opportunities are visible in the admin
- [ ] Near-win detection now evaluates the public page types LAEA actually ranks with
- [ ] Tests, typecheck, and lint are clean
- [ ] CloudWatch and browser validation are clean
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```text
prisma/schema.prisma
prisma/migrations/<ts>_add_gsc_cluster_snapshot/
server/src/services/gsc/queryClusterer.ts
server/src/services/gsc/bucketClassifier.ts
server/src/controllers/seoAdmin.ts
server/src/routes/seoAdmin.ts
src/pages/admin/SeoInsightsPage.tsx
src/components/admin/SeoInsightDrawer.tsx
src/services/api.ts
tests/unit/gsc/queryClusterer.test.ts
tests/unit/gsc/bucketClassifier.test.ts
tests/unit/seoAdmin.test.ts
tests/unit/pages/admin/SeoInsightsPage.test.tsx
```

---

## Blocked — PM decision needed

1. **Cluster aggressiveness.** Default v1 should be conservative and deterministic. If Wylie wants a more aggressive semantic merge layer, that likely means an LLM or embeddings assist and should be a deliberate follow-up.
2. **Admin IA.** Default is to keep clustered opportunities inside `/admin/seo-insights` so operators stay in one place. If the UI becomes crowded, split to `/admin/seo-insights/clusters`.

---

## Tech Lead Review (2026-05-01)

Verification against actual codebase. See `PLAN-SEO-Insights-Pilot.md` "Tech Lead Re-Verification (2026-05-01)" section for cross-cutting findings.

### Critical

(None.)

### Moderate

- **M1. Page-type allowlist (Task 4) — all 6 routes verified.** SEOI-8 broadens `winnable_loss` near-win detection beyond `/blog/*` to a 6-route allowlist. Verified each route exists in `src/App.tsx`:
  - `/explained/:slug` (line 242)
  - `/who-invented/:slug` (line 248)
  - `/events/:id` (line 245)
  - `/people/:slug` (line 225)
  - `/organizations/:slug` (line 226)
  - `/timeline` (line 199, with subroutes `/timeline/:slug`, `/timeline/data`, `/timeline/download`)
  
  All real, all live in prod. Implementation in `bucketClassifier.ts` should match GSC `page` URLs against this allowlist with prefix matching (e.g. `page.startsWith('/explained/')`), not exact equality, so subpages still qualify.
- **M2. Admin nav decision needed for clustered-opportunities surface (Task 6).** Current `src/components/admin/AdminLayout.tsx` `navItems` uses **flat top-level entries only** (`Dashboard`, `Review Queue`, `Milestones`, `Blog`, …, `SEO Insights` at line 73, …, `Chrome Extension` at line 138). Sub-routes `/actions` and `/proposals` are NOT advertised in the sidebar — they're only reachable via the in-page tab nav added by SEOI-4. Two valid options for SEOI-8:
  - **(a) Tab inside `/admin/seo-insights`** — adds a fifth tab next to Insights/Actions/Proposals (the SEOI-9 experiments tab will make it six). Keeps `navItems` unchanged. Recommended.
  - **(b) Separate `/admin/seo-insights/clusters` route + new flat sidebar entry** — requires AdminLayout `navItems` addition AND a `lazy` import in `src/App.tsx`.
  
  **Patch:** Pick (a) in Task 6 unless Wylie prefers a deeper IA. Already noted in Slop Findings P2-S2.
- **M3. `requireAdmin` import path settled.** Both `server/src/middleware/auth.ts` (exports `requireAdmin` at line 108) AND `server/src/middleware/authMiddleware.ts` (exports `requireAdmin` at line 70) exist. Shipped admin routes use `'../middleware/auth'` — verified at `server/src/routes/glossary.ts:4`, `server/src/routes/learningPaths.ts:1`, and the existing `server/src/routes/seoAdmin.ts`. The 4 new endpoints in Task 5 must import from `'../middleware/auth'`, NOT `'../middleware/authMiddleware'` (the latter is a parallel/older module that's not wired into the live admin route stack). Some skill docs claim `authMiddleware.ts` is canonical; that's stale — the shipped code says otherwise.
- **M4. New service files don't collide.** Verified `server/src/services/gsc/queryClusterer.ts` does not exist. `server/src/services/gsc/` already contains `gscClient.ts`, `gscIngest.ts`, `oauthSetup.ts`, plus the new `bucketClassifier.ts` (which Task 4 extends, not forks). New file goes in cleanly.

### Minor

- **Mi1. `GscClusterSnapshot` model name doesn't collide.** Existing `Gsc*` models are `GscDailyMetric` (schema.prisma:247) and `GscWeeklySnapshot` (line 268). New name is unambiguous.
- **Mi2. Cluster mining horizon (28d / 90d) — finalized PT window discipline.** SEOI-1's "always pull from finalized PT reporting days" rule applies here too — the 28d/90d windows must end at the most recent finalized PT day, not `now() - 28 days`. Add a sub-task in Task 3: "use the `latestFinalizedDate()` helper from `gscClient.ts` (or equivalent) when computing `windowEnd`." Carries the C-X3 cross-cutting finding from PLAN.
- **Mi3. Test path discipline preserved from start.** `tests/unit/gsc/queryClusterer.test.ts`, `tests/unit/gsc/bucketClassifier.test.ts` (Task 7) match the project's `/tests/unit/` convention. No rename needed (unlike SEOI-1 through SEOI-7 which originally had `__tests__/` paths and were corrected).

### What's verified correct

- Prisma model name `GscClusterSnapshot` doesn't collide with any of the 50+ existing models ✓
- Service file `queryClusterer.ts` doesn't exist yet (collision-free) ✓
- Public page-type routes for the near-win allowlist all exist in production ✓
- The existing `bucketClassifier.ts` (line 4 of `services/gsc/`) is the right service to extend for the page-type expansion — Task 4 correctly says "Refactor the current `winnable_loss` logic," not "create a new classifier." ✓
- v1-deterministic, no embedding service / vector DB introduced — matches `/AISlopReviewer` Slop Avoided guidance ✓
- Reuses existing dismiss/action persistence pattern from SEOI-2 (`status` enum on snapshot) ✓

### Effort impact

~15-30 min total for the patches above (mainly explicit IM3/M2 sub-tasks and the prefix-matching note for the page-type allowlist). No DoD changes.

---

## UX Lead Review (2026-05-01)

This sprint introduces the **clustered opportunities surface** — the first new SEO admin tab beyond the SEOI-2/4/6 trio (Insights · Actions · Proposals). UX bar: cluster information must be legible in plain English, the 28d/90d horizon switch must be obvious, and the surface must inherit the IA + primitives SEOI-2 established. See `PLAN-SEO-Insights-Pilot.md` "UX Lead Re-Verification (2026-05-01)" for cross-cutting findings.

### User-facing impact
A new tab `Clusters` inside `/admin/seo-insights` showing 28d/90d clustered query opportunities with a horizon toggle, bucket filter, and detail drawer. Admin-only, desktop-first.

### Surface(s) affected
Admin CMS only. No public-site impact.

### UX findings

#### 1. Information architecture — tab inside `/admin/seo-insights`, not a flat sidebar entry

Plan Task 6 leaves the choice open ("either a new `Clusters` tab on `/admin/seo-insights` or a dedicated route `/admin/seo-insights/clusters`"). **UX recommendation: tab inside `/admin/seo-insights` — fourth tab after Insights · Actions · Proposals.**

- [ ] Reason: `AdminLayout.tsx` `navItems` is a **flat list** (verified — no submenu support). Adding a sidebar entry requires AdminLayout refactor or accepts the cognitive cost of two parallel nav surfaces (sidebar + tab nav). Stay with the in-page tab nav.
- [ ] Use the shared `<Tabs>` primitive from `src/components/ui/Tabs.tsx` (shipped per SEOI-2 UX). Add `Clusters` as the fourth tab. Tab label includes a count chip: `Clusters (12)`.
- [ ] At `<sm` (375px): horizontal scroll with snap (per SEOI-2 UX-2 mobile spec). With 4-then-eventually-7 tabs, mobile users will scroll the tab strip — make sure the active tab auto-scrolls into view on mount.

#### 2. Reuse SEOI-2 shipped primitives

Verified shipped in `src/components/ui/`: `Drawer`, `Tabs`, `ConfirmDialog`, `ErrorState`, `EmptyState` (exported from `ErrorState.tsx`), `LoadingSkeleton`. Use them; don't create one-offs.

- [ ] **`<Tabs>`** for the outer tab nav (see #1).
- [ ] **`<Drawer>`** for the cluster detail drawer (Task 6). Same right-side slide-in, full-screen at `<sm`, focus trap + Escape dismiss.
- [ ] **`<EmptyState>`** for "No 90-day clustered opportunities yet" / "No 28-day clusters above the noise threshold this week."
- [ ] **`<ErrorState onRetry={refetch}>`** for fetch failures.
- [ ] **`<LoadingSkeleton lines={5}>`** matching cluster row height.
- [ ] **`<ConfirmDialog>`** for the dismiss action on a low-value cluster (small friction prevents accidental dismissals on power-user-dense data).

#### 3. Horizon toggle (Task 5/6)

The 28d vs 90d distinction is the central new mental model in this sprint. Get the affordance right.

- [ ] **Visual treatment**: segmented control at the top of the tab content area, not a `<select>` dropdown. Two options: `28 days` / `90 days`. Active option uses the existing nav-active pattern (`bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400`).
- [ ] **Persists across reloads** via URL query param: `/admin/seo-insights?clustersHorizon=90d`. Bookmarkable + shareable.
- [ ] **Mobile (<`md`)**: full-width segmented control above the cluster table. Don't squeeze it next to the bucket filter on a 375px screen.
- [ ] **Last-rebuild timestamp** muted text under the segmented control: "Clusters rebuilt 4 hours ago". Hover (or long-press on mobile) shows the full timestamp.

#### 4. Cluster detail drawer (Task 6) — progressive disclosure

The drawer shows: representative query, member queries + impression share, landing pages, totals, plain-English evidence, suggested next step. That's a lot — apply the same progressive-disclosure pattern as SEOI-6 proposal drawers.

- [ ] **Top of drawer (always visible)**: representative query (large), bucket badge (color + icon), bucket score, total impressions/clicks/CTR/position summary line.
- [ ] **Middle, collapsible**: member queries list (collapsed by default — "8 member queries with impression share" → expand). Member pages list (collapsed — "3 landing pages involved" → expand).
- [ ] **Bottom (always visible)**: plain-English evidence (1-2 sentences), suggested next step, action buttons (Dismiss · Mark Actioned · Promote to Proposal — last is a SEOI-9 forward link).
- [ ] **Mobile**: drawer becomes full-screen modal sheet (per shared `<Drawer>` primitive's mobile spec).

#### 5. State completeness (Task 6)

For the cluster table:

- [ ] **Loading**: `<LoadingSkeleton lines={6}>` matching cluster row height.
- [ ] **Empty (no clusters this horizon/bucket)**: `<EmptyState>` with horizon-aware copy: "No 28-day clusters above the noise threshold this week — the data is still sparse on this horizon" or "No 90-day clusters surfaced — try the 28-day horizon for shorter-window signal." Empty here is *expected* on a newer site (per the PLAN's "Why A Post-Pilot Track Exists" framing), not a failure.
- [ ] **Error**: `<ErrorState onRetry={refetch}>`.
- [ ] **Degraded**: handle a cluster whose `representativeQuery` is anonymized — show "(redacted query)" muted instead of blank.
- [ ] **First-time state**: before the first cluster rebuild has run, show a one-time helper banner explaining what clusters are and that the next rebuild will populate them. Banner dismissible.

#### 6. Page-type allowlist surfaces visually (Task 4)

SEOI-8 broadens `winnable_loss` detection from `/blog/*` to a 6-page-type allowlist (`/explained`, `/who-invented`, `/events`, `/people`, `/organizations`, `/timeline`). The Insights tab table will now show non-blog rows. UX implication:

- [ ] **Page-type pill** in the Insights table next to the page URL: `Blog`, `Explained`, `Who Invented`, `Event`, `Person`, `Org`, `Timeline`. Use `<SubjectBadge>` styling (rounded-full chips). Helps users at-a-glance see "oh, this is a `who-invented` near-win" rather than parsing URL paths.
- [ ] **Filter**: add a page-type filter chip row above the Insights table so admins can scope to "show me only `/people` near-wins." Reuse the existing filter pattern from SEOI-2 if one exists; otherwise build with `flex flex-wrap gap-2`.

#### 7. Color-blind safety (continued from SEOI-2/7 patterns)

- [ ] **Bucket score column**: render numerically + a tier icon (▲ for top decile, ● for mid, ▼ for bottom). Don't rely on color alone.
- [ ] **Cluster bucket pill** (`cluster_content_gap` / `cluster_near_win` / `cluster_topic_theme`): icon + text label. Color is supplementary.

#### 8. Dark mode decision

- [ ] **Match `AdminLayout` light-theme convention** per UX-X1 in master plan. Page chrome `bg-gray-100`, cards `bg-white shadow-warm-sm rounded-xl`. The shared `ui/` primitives ship dark-mode-ready, so a future admin-dark-mode backfill won't re-touch this surface.

#### 9. Keyboard + a11y

- [ ] **Horizon segmented control**: arrow keys cycle between `28d` / `90d` (per WAI-ARIA radio-group pattern, since they're mutually exclusive). Tab moves focus into the cluster table.
- [ ] **Cluster row buttons (Dismiss · Mark Actioned · View Detail)**: Tab order matches reading order. Action button labels are visible text, not icon-only.
- [ ] **Drawer focus trap** built into the shared `<Drawer>` primitive — verify it works for the cluster drawer.
- [ ] **Member queries list**: when expanded inside the drawer, each query is selectable text (not interactive) — but if a query has its own page, link it. Don't make members look clickable when they're not.

### Definition of Done additions

- [ ] Clusters tab + detail drawer render correctly in light theme at 375px / 768px / 1280px viewports
- [ ] Horizon segmented control persists selection via URL query param
- [ ] Page-type pill column on Insights table renders for all 7 page types
- [ ] All four states (loading / populated / empty / error) verified, plus first-time state for pre-first-rebuild
- [ ] Bucket badges + score tiers use icon + text label, not color alone
- [ ] Lighthouse Accessibility ≥95 with the new tab + drawer rendered
- [ ] Keyboard reach: horizon toggle + tab nav + table row + drawer all reachable via Tab/Arrow/Enter/Escape

### What's correct already

- IA: tab inside the existing `/admin/seo-insights` surface (not a separate sidebar entry) — correct, matches SEOI-2/4/6 pattern.
- Reuses SEOI-2's shipped primitives (Tabs, Drawer, EmptyState) — correct, the primitives DID ship and are exported from `src/components/ui/index.ts`.
- Plain-English cluster evidence (Task 3) — correct UX call; enables the drawer's "explain why this cluster exists" affordance to be readable.
- Page-type allowlist allows admins to action winnable losses on more surfaces — correctly scoped in code, just needs the visual signal in the UI.

---

## Slop Findings (AISlopReviewer — 2026-05-01)

Reviewed against the 17-category vibe-code slop checklist + LAEA's centralized systems map. Cross-references the parent PLAN's post-pilot slop section for cross-cutting findings.

### P0

(None.)

### P1

(None.)

### P2

- **P2-S1. Per-route `requireAdmin` not specified.** Task 5 adds 4 new admin endpoints (`GET /clusters`, `GET /clusters/:id`, `POST /clusters/:id/dismiss`, `POST /clusters/:id/action`). Project convention is per-route middleware, not mount-time (canonical: `server/src/routes/glossary.ts:69-86`; the existing `seoAdmin.ts` from SEOI-1 already follows it). **Fix:** add an explicit note in Task 5 that all 4 new endpoints follow `adminRouter.METHOD('/path', requireAdmin, ctrl)` exactly like the SEOI-1/2/4/5/6 endpoints already in `server/src/routes/seoAdmin.ts`. Category 2 (Inconsistency / drift).
- **P2-S2. Lazy admin page import not committed.** Task 6 says "either a new `Clusters` tab on `/admin/seo-insights` or a dedicated route `/admin/seo-insights/clusters`". If the dedicated route is chosen, `src/App.tsx` needs `const SeoClustersPage = lazy(() => import('./pages/admin/SeoClustersPage'))` matching the SEOI-2/4/6 lazy pattern, plus a `navItems` decision in `AdminLayout.tsx`. **Fix:** decide tab-vs-page in Task 6 before implementing; if page, add an explicit lazy-import sub-task. Category 3 (Hallucination — plan currently waves at the choice without committing).
- **P2-S3. `GscClusterSnapshot` is now the third snapshot-shaped table.** Schema will hold `GscDailyMetric` (raw rows), `GscWeeklySnapshot` (per-week pre-aggregated), and `GscClusterSnapshot` (28d/90d clustered). All three are operational data, not classification — no `Subject`/`ContentSubject` violation — but the relationship between them deserves a Prisma `///` comment so the next dev doesn't merge or fork them. **Fix:** add a top-of-model comment on `GscClusterSnapshot`: "Cluster snapshots are intentionally separate from `GscWeeklySnapshot` because horizons (28d/90d) are operational rather than calendar-week aligned, and because clustering destroys the (query, page) row identity that `GscWeeklySnapshot` preserves. Do not merge." Category 2 (Inconsistency / drift if undocumented).

### P3

(None.)

### Slop Avoided

- **No parallel `Subject` taxonomy.** `GscClusterSnapshot` clusters GSC queries by lexical similarity, not LAEA content by topic. Does not bypass `Subject` + `ContentSubject` per `subject-taxonomy.md` rule.
- **v1 deterministic — no embedding service introduced.** Task 1 explicitly says "do not add a vector DB or embedding service in this sprint unless the deterministic pass clearly fails on real examples." Avoids Category 4 (Over-engineering) + Category 13 (Dependency hygiene — heavy library before earning its keep).
- **Cluster snapshot does not destroy the existing exact-row model.** Task 3 says "do not destroy the existing exact-row model." Additive, not replacement. Avoids Category 11 (Dead code & migration debris).
- **Page-type allowlist for near-win expansion** (Task 4) explicitly includes `/explained`, `/who-invented`, `/events`, `/people`, `/organizations`, `/timeline` and explicitly forbids auto-shipping body content. Preserves the SEOI-4 metadata-only hard cap.
- **Test paths use `/tests/unit/` convention** (`tests/unit/gsc/queryClusterer.test.ts`, `tests/unit/gsc/bucketClassifier.test.ts`, `tests/unit/seoAdmin.test.ts`, `tests/unit/pages/admin/SeoInsightsPage.test.tsx`). ✓ Matches project convention from the start, no test-path-rename needed.
- **`bucketClassifier.ts` extension over fork.** Task 4 refactors the existing `winnable_loss` logic to evaluate more page types; doesn't introduce a sibling classifier. Category 1.1 (Parallel helpers) avoided.
- **No `mcp__claude-in-chrome__*`, no `VITE_*` secrets, no manual AWS console steps, no backwards-compat shims.**

