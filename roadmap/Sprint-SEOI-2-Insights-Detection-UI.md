# Sprint SEOI-2: Insights Detection + Admin UI

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-30 by Codex (local classifier, APIs, UI, tests, and local browser validation complete)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `frontend.md`, `data-models.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-SEO-Insights-Pilot.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm SEOI-1 DoD is fully checked. If not, finish it first.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Turn raw GSC rows into a ranked, browseable findings list. Build the four-bucket classifier (winnable losses, content gaps, trend signals, decay) as a deterministic SQL/service layer — no LLM yet — and render it at `/admin/seo-insights` with paginated tabs, dismiss/action controls, and per-finding detail. This is still pure-data: the agent layer (SEOI-3 onward) reads from these buckets but is not built yet.

**Priority**: HIGH
**Depends on**: SEOI-1 (data pipeline must be live with backfill complete)
**Estimated Effort**: 2 days
**Status**: In progress — local implementation complete. Remaining work is deploy plus validation against real prod GSC data.

---

## Prerequisites

- [ ] SEOI-1 DoD fully checked
- [ ] `GscDailyMetric` has ≥30 days of data in prod
- [ ] At least 2 weekly cron runs have completed (gives us week-over-week deltas)
- [ ] Local dev server running: `npm run dev` + `npm run dev:server`

---

## Tasks

### 1. Bucket classifier service

- [ ] Create `server/src/services/gsc/bucketClassifier.ts` with one function per bucket:
  - `classifyWinnableLosses({ weekStart })` — query: impressions ≥ 50, position ≤ 10, ctr < (median ctr at that position − 30%). Return ranked list.
  - `classifyContentGaps({ weekStart })` — query: impressions ≥ 20, page is `/news`, `/`, or anything that doesn't match the canonical entity URL for the query (uses fuzzy match against `Person.canonicalName`, `Organization.name`, `GlossaryTerm.term`, `Milestone.title`).
  - `classifyTrendSignals({ weekStart })` — query: impressions this week ≥ 2× the trailing 4-week average AND impressions ≥ 30. Surface query+page pairs.
  - `classifyDecay({ weekStart })` — page: was top-3 for at least one query in any of the trailing 4 weeks, dropped to position > 6 this week, and lost ≥30% impressions.
- [ ] Each function returns `Array<{ query, page, currentMetrics, baselineMetrics, score, evidence }>`.
- [ ] Add a single orchestrator `classifyAllBuckets({ weekStart })` that runs all four in parallel and writes results to `GscWeeklySnapshot.bucket` + `bucketScore` (existing rows updated, no inserts beyond what SEOI-1 created).

### 2. Wire classifier into ingest

- [ ] In `server/src/services/gsc/gscIngest.ts` (`runWeeklyIngest`), after the snapshot rebuild call `classifyAllBuckets({ weekStart })` so every cron run produces fresh bucket assignments.
- [ ] Keep classifier idempotent — re-running on the same `weekStart` should overwrite, not duplicate.

### 3. Insights API

- [ ] Add to `server/src/controllers/seoAdmin.ts`:
  - `GET /api/admin/seo/insights?bucket=winnable_loss&weekStart=2026-04-27&limit=50&page=1`
  - `POST /api/admin/seo/insights/:id/dismiss` — sets `status='dismissed'`
  - `POST /api/admin/seo/insights/:id/action` — sets `status='actioned'` (manual; SEOI-4+ will add the auto path)
- [ ] Each insight response includes the GSC metrics, the bucket score, evidence (e.g., "median ctr at position 3 is 18%, this page is at 4%"), and a suggested action category (no AI text yet — just the bucket name and a static string per bucket).
- [ ] Pagination via standard `?limit=&page=` query params; default `limit=50`, max `limit=200`.

### 4. Admin sidebar link

- [ ] Add to `src/components/admin/AdminSidebar.tsx` (or wherever admin nav lives — verify file path first):
  ```tsx
  { label: 'SEO Insights', path: '/admin/seo-insights', icon: SearchIcon }
  ```
- [ ] Place under existing analytics/SEO grouping if one exists; otherwise its own section.

### 5. Admin page — list view

- [ ] Create `src/pages/admin/SeoInsightsPage.tsx`:
  - 4 tab nav: Winnable Losses · Content Gaps · Trend Signals · Decay
  - Each tab: paginated table with columns `Query | Page | Impressions | Clicks | CTR | Position | Score | Actions`
  - Header chip showing total count + week selector (default: most recent week with data)
  - Row actions: `Dismiss`, `Mark Actioned`, `Open detail`
- [ ] Use existing admin styles from `src/pages/admin/*` for consistency
- [ ] Add API client to `src/services/api.ts`: `seoInsightsApi.list({ bucket, weekStart, limit, page })`, `.dismiss(id)`, `.markActioned(id)`

### 6. Admin page — detail drawer

- [ ] When user clicks `Open detail` on a row, slide a side drawer showing:
  - Query (or `(redacted)` if null), page URL (clickable, opens in new tab)
  - 4-week sparkline of impressions, clicks, ctr, position for this `(query, page)` pair
  - Bucket evidence text (e.g., "CTR is 4% at position 3; median for that position is 18%")
  - Suggested action (string per bucket — no LLM yet)
  - Buttons: `Dismiss`, `Mark Actioned`
- [ ] Drawer pattern: match `src/components/admin/EntityPreviewDrawer.tsx` if it exists; otherwise build a minimal portal-rendered drawer

### 7. Routing

- [ ] Add to `src/App.tsx`:
  ```tsx
  <Route path="seo-insights" element={<SeoInsightsPage />} />
  ```
  (under the existing `/admin/*` route group)

### 8. Tests

- [ ] Unit tests for each classifier in `server/src/services/gsc/__tests__/bucketClassifier.test.ts` — fixture rows representative of each bucket condition
- [ ] Integration tests for the insights endpoints in `server/src/controllers/__tests__/seoAdmin.test.ts`
- [ ] Frontend component tests for `SeoInsightsPage.tsx` in `src/pages/admin/__tests__/SeoInsightsPage.test.tsx` (mock the API; assert tab switching + dismiss flow)
- [ ] `npm test -- seo` — all pass
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors

### 9. Deploy

- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [ ] Frontend: `./scripts/deploy-frontend.sh`
- [ ] Manually trigger one ingest run so this week's `bucket` columns get populated:
      `curl -X POST https://letaiexplainai.com/api/admin/seo/ingest -H "Authorization: Bearer $TOKEN"`

### 10. Backend Validation

- [ ] Get JWT, hit each bucket:
  ```bash
  for b in winnable_loss content_gap trend_signal decay; do
    curl -sS "https://letaiexplainai.com/api/admin/seo/insights?bucket=$b&limit=5" \
      -H "Authorization: Bearer $TOKEN" | jq '.data | length'
  done
  ```
  Each should return ≥0; at least one bucket should have ≥1 finding.
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 10m` — zero errors
- [ ] Spot-check one finding in each bucket: does the evidence text actually correspond to the bucket criteria?

### 11. Browser Validation (via `/Browser` skill only)

- [ ] `agent-browser open https://letaiexplainai.com/admin/seo-insights` (login first if needed)
- [ ] `agent-browser screenshot` — initial state, Winnable Losses tab loaded
- [ ] `agent-browser snapshot -i` — capture interactive elements
- [ ] Click each tab, screenshot each: confirm rows render, count chips update
- [ ] Click `Open detail` on one row → drawer opens, sparkline renders
- [ ] Click `Dismiss` → row disappears (or shows dismissed state); refresh page, confirm persistence
- [ ] Verify dark mode: toggle theme, screenshot
- [ ] Mobile viewport: `agent-browser resize 375 812 && agent-browser screenshot` — table scrolls horizontally without breaking layout
- [ ] Zero console errors, zero 4xx/5xx in network tab
- [ ] Lighthouse on `/admin/seo-insights`: Performance ≥90, Accessibility ≥95

---

## Definition of Done

- [ ] All tasks above checked
- [ ] `/admin/seo-insights` live in prod with all 4 tabs populated
- [ ] At least one finding visible in at least 2 of the 4 buckets (real data; not test fixtures)
- [ ] Dismiss + Mark Actioned both persist correctly
- [ ] Detail drawer renders sparkline for at least one example finding
- [ ] Zero TypeScript errors, zero lint errors, tests passing
- [ ] CloudWatch + browser console clean
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```
server/src/services/gsc/bucketClassifier.ts                (new)
server/src/services/gsc/__tests__/bucketClassifier.test.ts (new)
server/src/services/gsc/gscIngest.ts                       (modify — call classifier)
server/src/controllers/seoAdmin.ts                         (modify — insights endpoints)
server/src/controllers/__tests__/seoAdmin.test.ts          (modify — insights tests)
server/src/routes/seoAdmin.ts                              (modify — new routes)
src/services/api.ts                                        (modify — seoInsightsApi)
src/pages/admin/SeoInsightsPage.tsx                        (new)
src/pages/admin/__tests__/SeoInsightsPage.test.tsx         (new)
src/components/admin/SeoInsightDrawer.tsx                  (new)
src/components/admin/AdminSidebar.tsx                      (modify — nav link)
src/App.tsx                                                (modify — route)
```

---

## Blocked — PM decision needed

1. **Bucket thresholds.** The thresholds in Task 1 (impressions ≥ 50, position ≤ 10, etc.) are starting heuristics. Tune after one week of real findings — flag for SEOI-7 polish pass. **No upfront decision needed.**
2. **Default week selector.** Should the page show the most recent complete week, or aggregate the last 4 weeks? Default plan: most recent complete week with a 4-week toggle. **Default is fine unless Wylie wants different.**
3. **Real-data calibration still pending.** Local QA currently exercises the empty state because local/prod GSC data is not backfilled yet. Threshold tuning and evidence sanity-checks still need live rows.

---

## Tech Lead Review (2026-04-30)

Verification against actual codebase. See `PLAN-SEO-Insights-Pilot.md` "Tech Lead Review" section for cross-cutting findings.

### Critical

- **C1. `AdminSidebar.tsx` doesn't exist.** Task 4 says "Add to `src/components/admin/AdminSidebar.tsx` (or wherever admin nav lives — verify file path first)". The actual nav lives in **`src/components/admin/AdminLayout.tsx`** in a `navItems` constant starting at line 34 (verified). **Patch:** rewrite Task 4 to add an entry to the `navItems` array in `AdminLayout.tsx`. Existing entries follow this shape:
  ```tsx
  { label: 'SEO Insights', href: '/admin/seo-insights', icon: <Search className="h-5 w-5" /> }
  ```
  Use lucide-react icons matching the rest of the file's imports.
- **C2. Test file paths use the wrong convention.** Task 8 references `server/src/services/gsc/__tests__/bucketClassifier.test.ts`, `server/src/controllers/__tests__/seoAdmin.test.ts`, `src/pages/admin/__tests__/SeoInsightsPage.test.tsx`. Project convention: `/tests/unit/*.test.ts(x)` at repo root. **Patch:** rewrite as `tests/unit/gsc/bucketClassifier.test.ts`, `tests/unit/seo/seoAdmin.test.ts`, `tests/unit/pages/admin/SeoInsightsPage.test.tsx`.
- **C3. Admin route mount style.** New routes added in Task 3 must follow the per-route `requireAdmin` pattern (see canonical `server/src/routes/glossary.ts:69-86`). The existing route file from SEOI-1 (`seoAdmin.ts`) should already be set up correctly — just continue adding routes via `adminRouter.METHOD('/path', requireAdmin, controller)`.

### Moderate

- **M1. Content-gap classifier should use existing entity-graph search routes.** Task 1 says the content-gap classifier uses "fuzzy match against `Person.canonicalName`, `Organization.name`, `GlossaryTerm.term`, `Milestone.title`." These already have public search endpoints — `/api/persons/search`, `/api/organizations/search`, `/api/glossary/search`, `/api/milestones/search` (verified). For an internal classifier, prefer calling the underlying service functions (`personsService.searchPersons`, etc. — see `server/src/services/persons.ts`) rather than re-implementing fuzzy match. Don't reinvent the matching logic. (Note: the classifier may benefit from a normalized name index — but build only after verifying the existing search functions are too slow at classifier scale.)
- **M2. AdminLayout `data-testid` convention.** New nav item should follow the existing `data-testid={\`nav-${item.label.toLowerCase()}\`}` pattern (`AdminLayout.tsx:219`) so admin E2E tests find it.
- **M3. `lazy()` import for new admin page.** `src/App.tsx` lazy-loads every admin page (line 105+ pattern). Add `const SeoInsightsPage = lazy(() => import('./pages/admin/SeoInsightsPage'))` before the route definition. Plan Task 7 doesn't show this — flag it.

### Minor

- **Mi1. Existing API client `src/services/api.ts` should grow, not fork.** Task 5 says "Add API client to `src/services/api.ts`" — confirmed correct, just emphasizing no parallel client file.
- **Mi2. Sparkline component.** Task 6 says "4-week sparkline of impressions, clicks, ctr, position". Project doesn't have a sparkline component yet. Either pick a tiny library (e.g. `react-sparklines` ~5KB) or build a 30-line SVG component. Consider this a sub-decision under Task 6.
- **Mi3. Browser Validation Lighthouse on admin pages.** Project rule says ≥95 a11y. Admin pages have historically gotten less a11y attention than public pages — verify the existing admin pages also hit that bar before deploying.

### What's verified correct

- 4-bucket classifier as deterministic SQL/service is the right primitive for this layer ✓
- Pagination via `?limit=&page=` matches existing API conventions ✓
- Detail drawer pattern + portal rendering matches existing patterns ✓
- `./scripts/deploy-frontend.sh` deploy command is fully compliant with build-and-deploy-security rules ✓

### Effort impact

~20 min total to apply the patches.

---

## Slop Findings (AISlopReviewer — 2026-04-30)

Cross-references the Tech Lead Review section above where the same issue applies under both lenses.

### P0

(None.)

### P1

- **P1-S1. Content-gap classifier should compose with `entityMatcher.ts`, not roll its own fuzzy match.** Sharpens TLR M1. Verified `server/src/services/entityMatcher.ts` exports `matchPerson(name)` and `matchOrganization(name)` with the exact-canonical → exact-alias → fuzzy (Jaro-Winkler ≥0.85) chain. Plan Task 1 says "fuzzy match against `Person.canonicalName`, `Organization.name`, `GlossaryTerm.term`, `Milestone.title`" — for Person and Organization, that's a direct call to the existing functions. **Fix:** rewrite the content-gap classifier to use `matchPerson()` and `matchOrganization()` directly. For `GlossaryTerm` and `Milestone` (which lack alias columns), use raw Prisma `contains`/`mode: 'insensitive'` queries — don't introduce a sibling fuzzy-matcher. Category 1.1 (Parallel helpers) + Category 12 (Architectural drift).

### P2

- **P2-S1. Test path violation.** Cross-referenced from TLR C2. Category 9.
- **P2-S2. `AdminSidebar.tsx` hallucination.** Cross-referenced from TLR C1. Category 3 (Hallucination / fabrication).

### P3

(None.)

### Slop Avoided

- **No parallel classification table.** Initiative reuses GSC findings as transient bucket assignments on `GscWeeklySnapshot.bucket` — does NOT introduce a new tagging table or bypass `Subject` + `ContentSubject`. (`subject-taxonomy.md` rule respected.)
- **Reuses existing entity search routes** at the *concept* level (Tasks 1, 6 reference them). Just sharpen to direct service-function calls per P1-S1 above.
- **`./scripts/deploy-frontend.sh` for frontend deploy.** Compliant with `build-and-deploy-security.md`.
- **Detail drawer follows existing modal pattern** (fixed overlay + backdrop blur + escape, portal rendering for stacking-context escape) per `frontend.md`. No reinvention.
- **No `mcp__claude-in-chrome__*` references.** Browser Validation correctly uses `/Browser` (agent-browser) commands.
- **Lazy-loaded admin page pattern** — TLR M3 already flags adding the lazy import to `src/App.tsx`; that's correct convention.
- **Sparkline component decision deferred (TLR Mi2)** — sensible, since it's a minor sub-decision not core to the sprint thesis. Avoids over-engineering pre-decision.

---

## UX Lead Review (2026-04-30)

This is the **primary UX surface** of the initiative — the page introduces 4-bucket browse, detail drawer, and the patterns that SEOI-4 and SEOI-6 will reuse. Per the master PLAN's UX section, three new shared `ui/` primitives should land here so SEOI-4 and SEOI-6 inherit them. See `PLAN-SEO-Insights-Pilot.md` "UX Lead Review" for cross-cutting findings.

### User-facing impact
A new admin page at `/admin/seo-insights` with 4 paginated bucket tabs + detail drawer. Admin-only, desktop-first.

### Surface(s) affected
Admin CMS only. No public-site impact.

### UX findings

#### 1. Add three new shared `ui/` primitives in this sprint

This sprint is the **right place** to land all three primitives that SEOI-4 and SEOI-6 will reuse — building them once vs three times saves slop and produces a more consistent product. **Add to `src/components/ui/`:**

- [ ] **`<Tabs>` primitive** — props: `tabs: { id, label, count? }[]`, `activeId`, `onChange`. Must support keyboard arrow navigation, ARIA `role="tablist"` / `role="tab"` / `aria-selected`. Light theme: active tab `bg-blue-50 text-blue-700 border-blue-600` (matches AdminLayout's `bg-blue-600` accent). Add `dark:` variants from the start so the primitive itself is theme-ready even if the surrounding admin page isn't.
- [ ] **`<Drawer>` primitive** — right-side slide-in panel. Props: `open`, `onClose`, `title`, `children`. Behavior: `w-full sm:w-[480px]` (full-screen on mobile, fixed-width side panel on desktop), backdrop click + Escape key dismiss, focus trap on open + return focus on close, `prefers-reduced-motion` respects opt-out (no slide animation). z-index above page content but below toasts.
- [ ] **`<EmptyState>` primitive** — props: `icon`, `title`, `description`, `cta?`. Mirror `<ErrorState>` shape (matching neutral background, centered, light + dark coverage). Used in this sprint for "no findings in this bucket"; reused in SEOI-4 actions audit + SEOI-6 proposals queue.

#### 2. Bucket tabs UX (Task 5)

- [ ] **Tab labels include count chips** showing finding count per bucket: e.g. `Winnable Losses (12) · Content Gaps (3) · Trend Signals (5) · Decay (1)`. Empty buckets show `(0)` muted. Density-friendly for power users scanning at a glance.
- [ ] **Active tab uses non-color indicator** — bottom border + bold text, not just color, so color-blind users can see active state.
- [ ] **At `<sm` (375px)**: 4 tabs at full width will overflow. Either (a) horizontal scroll with `overflow-x-auto` and snap, or (b) icon-only labels at mobile. **Recommendation: (a) horizontal scroll with snap** — labels are short enough that they're still readable at mobile widths.

#### 3. Paginated table responsive behavior (Task 5)

- [ ] **Desktop (≥`md`)**: full table layout (current spec).
- [ ] **Mobile (<`md`)**: table either scrolls horizontally inside the page (preferred — preserves the data shape) OR stacks each row as a card (verbose). **Recommendation: horizontal scroll with sticky first column (Query) so the user always sees the row's identity while scrolling.** Add an explicit overflow indicator (right-edge gradient fade or a chevron) so users know they can scroll.
- [ ] **Tap targets ≥48×48px** for row action buttons (Dismiss, Mark Actioned, Open detail) on mobile. The existing icon-only patterns in admin pages tend to be ~32px — too small for touch.

#### 4. Detail drawer (Task 6) — see UX-X3 in master plan

- [ ] **Use the new `<Drawer>` primitive** (added in Task 1 above), not a one-off implementation.
- [ ] **Sparkline reuse: pull the d3 pattern from `src/components/Flashcards/RetentionChart.tsx`** rather than introducing a new sparkline library. Project already depends on `d3 ^7.9.0`. ~50 lines of d3-via-React per chart, fully Tailwind-themed. Don't add `react-sparklines` or similar.
- [ ] **Sparkline accessibility**: include an `<title>` SVG element with the trend summary (e.g. "Impressions: 320 → 410 over 4 weeks, trending up"). Screen-reader users should get the gist without seeing the visual.

#### 5. State completeness (mandatory per UX skill)

For the bucket-tab table:
- [ ] **Loading state**: Use `<LoadingSkeleton variant="rectangular" lines={5}>` matching row height. Don't show a spinner.
- [ ] **Empty state**: Use `<EmptyState>` (added in Task 1) with copy that signals emptiness here is *expected*, not failure: e.g. "No winnable-loss findings this week" / "Content gaps queue is clear — well done." CTA could be a link to the slop-ledger or the broader insights digest.
- [ ] **Error state**: Use `<ErrorState onRetry={refetch}>` from `src/components/ui/ErrorState.tsx` (already exists, dark-mode-ready).
- [ ] **Degraded state**: handle `query: null` (GSC privacy redaction) — show "(redacted query)" muted instead of blank.
- [ ] **First-time state** (before any GSC data backfilled): show a one-time helper banner explaining what GSC findings are and linking to the SEOI-1 backfill status. After first ingest run completes, banner doesn't reappear.

#### 6. Dark mode decision (cross-ref UX-X1)

- [ ] **Match existing `AdminLayout` styling — single-theme (light) for content area.** Page chrome: `bg-gray-100`, cards: `bg-white shadow-warm-sm rounded-xl`. The shared `<Tabs>`, `<Drawer>`, `<EmptyState>` primitives still ship with full `dark:` coverage so they're future-ready.

#### 7. Information architecture

- [ ] **AdminLayout `navItems` entry** (TLR C1 already flags): label `'SEO Insights'`, href `/admin/seo-insights`, icon `<Search className="h-5 w-5" />` (lucide-react, matches existing entries). `data-testid="nav-seo insights"`. Position: after "API Monitoring" or near "Comments" — group with operational/observability tools, not content authoring.
- [ ] **Breadcrumb support**: `getBreadcrumbs(location.pathname)` in `AdminLayout` already handles sub-routes. New page paths `/admin/seo-insights`, `/admin/seo-insights/actions` (SEOI-4), `/admin/seo-insights/proposals` (SEOI-6) all need entries. Verify after Task 4.

#### 8. Keyboard + a11y

- [ ] **Tab nav arrow keys** — left/right cycles tabs (per WAI-ARIA tabs pattern).
- [ ] **Drawer focus trap + Escape dismiss** built into the new `<Drawer>` primitive.
- [ ] **Row actions reachable via keyboard** — Tab order: row → Dismiss button → Mark Actioned button → Open detail. Don't lock keyboard users out of any flow.
- [ ] **Color-blind safety**: bucket scores currently a plain numeric. Confidence ranges (low/med/high) if added must include text label, not just color.

### Definition of Done additions

- [ ] Three shared `ui/` primitives (`<Tabs>`, `<Drawer>`, `<EmptyState>`) shipped with dark-mode coverage and tests
- [ ] Page renders correctly at 375px / 768px / 1280px viewports
- [ ] Lighthouse Accessibility ≥95
- [ ] All four bucket tabs verified populated/empty/loading/error states
- [ ] Sparkline reuses d3 pattern from `RetentionChart.tsx` (no new charting library)
- [ ] Keyboard reach: Tab order + arrow keys on tabs + Escape on drawer all work

### What's correct already

- Single nav entry + internal tabs IA — correct (avoids over-promoting a 3-page admin feature).
- Detail drawer pattern — correct intent; just needs to be a shared primitive, not one-off.
- Table column choice (`Query | Page | Impressions | Clicks | CTR | Position | Score | Actions`) — power-user-dense, matches admin page patterns.
- Lazy import for new admin page — TLR M3 captures.
- React Portal for drawer — matches `frontend.md` rule.
