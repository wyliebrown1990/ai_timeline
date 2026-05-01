# Sprint SEOI-10: News-to-Evergreen Routing + SERP Packaging

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-05-01 by Codex (core packaging, evergreen-routing, and agent-integration slices shipped; final cleanup remaining)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `frontend.md`, `data-models.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-SEO-Insights-Pilot.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm SEOI-8 and SEOI-9 are complete enough that clustered opportunities and experiment tracking are already live.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` or `agent-browser` for UI validation. Never skip browser checks on admin changes.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Some LAEA demand is not “write a new post.” It is “stop letting repeated demand die on `/news` or generic pages” and “package existing pages so Google can better understand and present them.” This sprint handles both.

The first half turns repeated search demand on `/news` or other generic destinations into canonical evergreen recommendations. The second half adds a SERP-packaging audit layer that checks title/H1 alignment, metadata quality, breadcrumb structure, supported structured-data coverage, and internal-link support on pages with real impressions.

This sprint should **compose with** the already-shipped SEO foundations in `PLAN-SEO-Improvements.md`, not recreate them.

**Priority**: HIGH
**Depends on**: SEOI-8 and SEOI-9
**Estimated Effort**: 2-3 days
**Status**: In progress

---

## Prerequisites

- [x] SEOI-8 clustered mining is live
- [x] SEOI-9 experiment ledger is live
- [x] Existing sitewide canonicals, sitemap, and baseline structured data from earlier SEO plans are already shipped
- [ ] Local dev server running: `npm run dev` + `npm run dev:server`

---

## Tasks

### 1. News-to-evergreen detector

- [x] Create a detector for repeated demand landing on:
  - `/news`
  - `/news/:id`
  - other generic or transient destinations
- [x] Classify the best next action:
  - route to existing canonical entity page
  - create new evergreen page
  - expand an existing evergreen page
  - keep as news only (if demand is clearly transient)
- [x] Use 28-day and 90-day evidence to avoid overreacting to one-day spikes

### 2. Evergreen routing proposal flow

- [x] Add a proposal type for evergreen routing / canonical promotion
- [x] Proposal payload should include:
  - current landing page(s)
  - repeated query cluster
  - recommended canonical destination
  - whether this is a redirect/routing fix, a linking fix, or a new-content ask
- [x] Keep blog creation as only one option, not the default answer

### 3. SERP packaging audit service

- [x] Create `server/src/services/seo/serpPackagingAudit.ts`
- [x] Audit pages with real impressions for:
  - title link risk (boilerplate, weak differentiation, title/H1 mismatch)
  - metadata quality
  - breadcrumb health
  - supported structured-data coverage relevant to the page type
  - internal-link support from related pages
- [x] Tie the audit rubric to Google guidance:
  - title links can be derived from multiple sources, not just `<title>`
  - breadcrumbs should reflect a typical user path
  - supported structured data should be valid and non-spammy
- [x] Do **not** add unsupported or spammy schema just to “check a box”

### 4. Admin API

- [x] Add endpoints such as:
  - `GET /api/admin/seo/packaging`
  - `GET /api/admin/seo/packaging/:id`
  - `POST /api/admin/seo/packaging/:id/propose-fix`
  - `POST /api/admin/seo/packaging/:id/propose-evergreen`
- [x] Reuse existing action/proposal status patterns where possible

### 5. Admin UI

- [x] Add a packaging surface or sub-view in the SEO Insights admin
- [x] For each audited page, show:
  - page URL
  - target cluster or queries
  - packaging issues found
  - proposed fixes
  - whether the page currently sits in an active experiment
- [x] Add an evergreen-routing detail state showing the current vs recommended canonical destination

### 6. Agent integration

- [x] Allow the weekly agent to surface packaging and evergreen-routing proposals
- [x] Keep human approval required for:
  - H1 changes
  - schema changes
  - canonical/routing changes
  - broad internal-link changes
- [x] Auto-ship remains limited to the already-approved metadata lane unless Wylie explicitly expands it later

### 7. Tests

- [x] Unit tests for `serpPackagingAudit.ts`
- [ ] Unit tests for news-to-evergreen classification
- [ ] Integration tests for packaging and evergreen proposal endpoints
- [x] Frontend tests for packaging admin views
- [x] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [x] Focused tests pass

### 8. Deploy

- [x] Backend: `./scripts/deploy-backend.sh`
- [x] Run any required Prisma migration(s) in prod before verification
- [x] Frontend: `./scripts/deploy-frontend.sh`
- [x] Rebuild packaging audits and evergreen-routing proposals after deploy

### 9. Backend Validation

- [x] Confirm at least one repeated `/news` demand theme becomes an evergreen-routing proposal in prod
- [x] Confirm packaging audits exist for pages with real GSC impressions
- [x] Verify that at least one proposal references an existing evergreen destination rather than defaulting to “write a blog post”
- [x] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 30m` — zero errors

### 10. Browser Validation (agent-browser CLI)

- [ ] Open the packaging surface: `agent-browser open https://letaiexplainai.com/admin/seo-insights`
- [ ] Take initial screenshot: `agent-browser screenshot`
- [ ] Get refs: `agent-browser snapshot -i`
- [ ] Open one packaging audit detail view and verify all issue rows render
- [ ] Open one evergreen-routing proposal and verify current vs target destination is clear
- [ ] Take final screenshot: `agent-browser screenshot`
- [ ] Mobile viewport check for the packaging/evergreen surfaces

---

## Definition of Done

- [ ] All tasks above checked
- [ ] Repeated `/news` demand can be promoted into evergreen-routing proposals in prod
- [ ] SERP-packaging audits are live for impression-bearing pages
- [ ] Human-approval boundaries for packaging/routing changes are explicit
- [ ] Tests, typecheck, and lint are clean
- [ ] CloudWatch and browser validation are clean
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```text
prisma/schema.prisma
prisma/migrations/<ts>_add_packaging_or_evergreen_models/
server/src/services/seo/serpPackagingAudit.ts
server/src/services/seo/briefGenerator.ts
server/src/controllers/seoAdmin.ts
server/src/routes/seoAdmin.ts
src/pages/admin/SeoInsightsPage.tsx
src/pages/admin/SeoPackagingPage.tsx
src/components/admin/SeoProposalDrawer.tsx
src/services/api.ts
tests/unit/seo/serpPackagingAudit.test.ts
tests/unit/seoAdmin.test.ts
tests/unit/pages/admin/SeoPackagingPage.test.tsx
.claude/schedules/seo-weekly.md
```

---

## Blocked — PM decision needed

1. **Approval scope.** Default is human approval for all routing, schema, H1, and internal-link changes. If Wylie wants some of these auto-shipped later, that should require a separate trust review after real measurement.
2. **Timeline-specific routing.** If a repeated cluster clearly belongs to the timeline workstream, default to linking it into `PLAN-SEO-Timeline-Domination.md` outputs instead of forcing it through a generic blog/content flow.

---

## UX Lead Review (2026-05-01)

This sprint adds the **packaging audit** + **news-to-evergreen routing** surfaces. UX bar: audit findings must be scannable (one row = one fix), the canonical-redirection diff must show "current vs target" clearly, and human-approval boundaries (H1 / schema / canonical / internal-link changes) must look distinct from the auto-shippable metadata lane. See `PLAN-SEO-Insights-Pilot.md` "UX Lead Re-Verification (2026-05-01)" for cross-cutting findings.

### User-facing impact
A new `Packaging` tab inside `/admin/seo-insights` (the sixth tab after SEOI-8/SEOI-9 land) showing audit findings per page, plus an evergreen-routing detail state that visualizes current vs recommended canonical destination. Admin-only, desktop-first.

### Surface(s) affected
Admin CMS only.

### UX findings

#### 1. IA — Packaging as the sixth tab

- [ ] **Tab inside `/admin/seo-insights`** at position 6 (after Insights · Actions · Proposals · Clusters · Experiments). Same flat-nav constraint as SEOI-8/9.
- [ ] **Tab label includes count**: `Packaging (12 pages with issues, 3 critical)`. Surface the critical count separately — packaging issues vary widely in severity and the operator should see "this is critical" without opening the tab.
- [ ] **Mobile**: 6 tabs at 375px will scroll heavily. Consider collapsing the tab strip into a `<select>` dropdown on mobile (single-row dropdown with active label) once tabs exceed 5. Alternative: keep horizontal scroll-with-snap and accept that mobile users will scroll. **Decision needed in Task 5** — pick before implementing.

#### 2. Packaging audit findings table (Task 5)

This is a power-user table — operators will scan many rows. Density matters more than whitespace.

- [ ] **Columns**: `Page · Issue Type · Severity · Recommended Fix · Status · Actions`. Desktop full-width; mobile collapses to card layout (per SEOI-9 #5 pattern).
- [ ] **Severity column**: 3 levels (`critical` / `warning` / `info`) with icon + text + color, never color-alone. Use the same severity mapping as SEOI-7's drift-detector tile (red/amber/green semantic).
- [ ] **Issue type pill** uses `<SubjectBadge>`-style chip: `Title link risk` / `Metadata thin` / `Breadcrumb missing` / `Schema invalid` / `Internal-link orphan`. Each type maps to a single specific tripwire from `serpPackagingAudit.ts` so the ops user can grep mental models against code.
- [ ] **Filter chips above the table**: `All` / `Critical only` / by issue type. Reuse the SEOI-2 filter pattern.
- [ ] **Sticky header on desktop** for column labels; sticky-first-column on mobile for `Page` URL identity while horizontally scrolling the rest.

#### 3. Evergreen-routing detail state (Task 5)

The "current vs recommended canonical" comparison is the highest-stakes visual in this sprint. Get the diff treatment right.

- [ ] **Side-by-side diff layout** at desktop:
  ```
  ┌─────────────────────────┐ ┌─────────────────────────┐
  │ Current: /news/12345    │ │ Recommended: /events/87 │
  │ [page card — title,     │ │ [page card — title,     │
  │  meta, structured data] │ │  meta, structured data] │
  └─────────────────────────┘ └─────────────────────────┘
  ```
  Background tints: red for current (`bg-red-50 dark:bg-red-900/20`), green for target (`bg-green-50 dark:bg-green-900/20`). Same pattern SEOI-4's diff panel established.
- [ ] **Mobile**: stack vertically (Current on top, Recommended below) with a clear separator. Don't try side-by-side at 375px.
- [ ] **Reuse the `<SeoDiffPanel>` component from SEOI-4** if shape allows — it already exists in `src/components/admin/SeoDiffPanel.tsx`. If the metadata-rewrite diff shape doesn't generalize to canonical-page diff, extend `SeoDiffPanel` with a variant prop rather than forking a new component.
- [ ] **"Apply routing change" button** uses `<ConfirmDialog>` because canonical changes are high-impact and reversal requires a separate redirect-undo flow.

#### 4. Human-approval boundaries visually distinct (Task 6)

The plan says H1 / schema / canonical / internal-link changes stay human-only. Visually communicate this so operators don't mistake an audit finding for an auto-shippable item.

- [ ] **Action button differentiation**:
  - For metadata-only fixes (SEOI-4 lane): `Ship it` — primary blue.
  - For H1/schema/canonical/internal-link fixes (this sprint): `Send to /AIBlogDraft` (or `Apply manually`) — secondary outline-style. NEVER an auto-ship-styled button on these rows.
  - For routing changes: `Review routing change` — opens the diff panel; explicit two-step.
- [ ] **Lock icon** next to human-only action buttons — small visual signal "this is not an auto-action."

#### 5. Reuse SEOI-2 + SEOI-4 shipped primitives

- [ ] **`<Tabs>`** for outer tab nav (sixth tab).
- [ ] **`<Drawer>`** for packaging audit detail drawer.
- [ ] **`<EmptyState>`** for "No packaging issues this week — your pages are well-optimized." (Real possibility on a healthy site; phrase the empty as positive.)
- [ ] **`<ErrorState onRetry={refetch}>`**.
- [ ] **`<LoadingSkeleton lines={6}>`**.
- [ ] **`<ConfirmDialog>`** for routing-change apply.
- [ ] **`<SeoDiffPanel>`** (existing) — extended for canonical diff if shape allows; otherwise build a sibling.

#### 6. State completeness

- [ ] **Loading**: skeleton matching audit-row height.
- [ ] **Empty (no packaging issues)**: positive empty state — "No packaging issues across audited pages." This is a *good* state for a healthy site, not a failure. Empty copy should celebrate it.
- [ ] **Error**: standard `<ErrorState>` retry.
- [ ] **Degraded**: audit finding for a page that's been deleted — show "Page archived" pill on the row but keep the historical finding; archived pages can't be fixed but the audit history is reference-worthy.
- [ ] **First-time** (no audit run yet): one-time helper banner: "Packaging audits run weekly with the SEO digest. The next run is Monday 13:00 UTC. Force-run from the Operations banner above if you need findings now."

#### 7. Hardcoded URL patterns visible to operator (P3 from Slop review)

- [ ] **Detection scope visible** somewhere in the tab UI: a small muted line near the top says "Auditing: `/news`, `/news/:id`, `/blog/*`, `/explained/*`, …" so operators see what's being audited and what isn't. Helps catch silently-missed surfaces if route patterns ever change.

#### 8. Color-blind safety

- [ ] Severity chips use icon + text + color, never color alone.
- [ ] Diff-panel red/green backgrounds also include "Before"/"After" or "Current"/"Recommended" text labels — the labels carry the meaning, color is supplementary.
- [ ] Issue-type pills use icons matching the issue category.

#### 9. Dark mode decision

- [ ] **Match `AdminLayout` light theme** per UX-X1 cross-cutting decision. Severity-pill and diff-panel `dark:` variants spec'd in #2 + #3.

#### 10. Keyboard + a11y

- [ ] Filter chip strip: arrow keys cycle, Enter activates.
- [ ] Each audit row is focusable; Enter opens the detail drawer.
- [ ] Diff-panel comparison: each side has a heading ("Current" / "Recommended") with `aria-label` so screen readers can compare without sighted reference.
- [ ] Routing-change apply uses `<ConfirmDialog>` (built-in focus trap + Escape).

### Definition of Done additions

- [ ] Packaging tab + audit table render correctly at 375px / 768px / 1280px
- [ ] Severity pills are color-blind safe (icon + text + color, never color alone)
- [ ] Routing-change diff panel reuses or extends `<SeoDiffPanel>` from SEOI-4
- [ ] Human-only action buttons visually distinct from auto-ship buttons (no confusion possible)
- [ ] Mobile fallback for tab strip decided (Task 5 sub-decision before implementing)
- [ ] Lighthouse Accessibility ≥95 with audit table + diff panel rendered
- [ ] Detection scope footer line visible on the tab so operators see what's audited

### What's correct already

- IA: tab inside `/admin/seo-insights` (sixth tab) — correct.
- Composition with shipped SEO foundation (`<SEO />` for canonical/JSON-LD, `sitemap.ts` for URL list) per TLR M1 audit-not-generate boundary — UX-correct: the audit can show a clear "this page is missing structured data" finding because the foundation knows what each page type SHOULD emit.
- Human-approval boundaries explicit per Task 6 — correctly preserves the SEOI-7 expansion discipline.

---

## Tech Lead Review (2026-05-01)

Verification against actual codebase. See `PLAN-SEO-Insights-Pilot.md` "Tech Lead Re-Verification (2026-05-01)" section for cross-cutting findings.

### Critical

(None.)

### Moderate

- **M1. SEO foundation is fully shipped — the audit-vs-generate boundary is enforceable.** Verified the four foundation surfaces SEOI-10 plans to compose with all exist in production:
  - **Canonical tags**: `src/components/SEO.tsx:79` emits `<link rel="canonical" href={canonicalUrl} />` via `react-helmet-async`. Prop-driven per page; defaults to `https://letaiexplainai.com` (line 72).
  - **Sitemap**: `server/src/routes/sitemap.ts` already enumerates every relevant URL pattern — `/explained/{slug}` (line 186+), `/events/{id}`, `/who-invented/{slug}`, `/people/{slug}`, `/organizations/{slug}`, `/news/{id}`, `/blog/{slug}`, plus static pages and timeline variants (lines 47-344). `serpPackagingAudit.ts` should READ this list to know which pages to audit, not invent its own page enumeration.
  - **JSON-LD**: `src/components/SEO.tsx:105-117` emits `<script type="application/ld+json">{JSON.stringify(schema)}</script>` via Helmet. Schema generators in the same file: `Person` (line 125), `Organization` (line 173), `FAQ` (line 230), `Article` (line 453), `BreadcrumbList` (line 513), `ItemList/Timeline` (line 398).
  - **Breadcrumbs**: schema helper `generateBreadcrumbListJsonLd()` at `src/components/SEO.tsx:513`; visual breadcrumbs in `AdminLayout.tsx:146-162` (admin auto-from-path) and per-page in public components.
  
  **Patch:** Add a sub-task in Task 3 explicitly listing each foundation surface and the auditor's read-only contract: "the packaging auditor MUST read from `<SEO />` component props (or the JSON-LD blocks it produces) and `sitemap.ts`'s URL list — it MUST NOT regenerate canonicals, schema, or sitemap entries." This sharpens the AISlopReviewer P1-S1 fix into a concrete checklist.
- **M2. `/news` and `/news/:id` routes verified.** Both exist in `src/App.tsx`: `/news` (line 210), `/news/:id` (line 283 — note: rendered outside the Layout component, at root level). The hardcoded URL pattern in Task 1 is correct against current routes. P3-S1 (read patterns from constants file) remains valid as a hardening recommendation.
- **M3. `serpPackagingAudit.ts` doesn't collide.** Verified `server/src/services/seo/` directory contents — no existing audit service. New file goes in cleanly.
- **M4. `/admin/seo-insights/packaging` route is unclaimed.** Verified `src/App.tsx`: no existing route. Task 5 needs `const SeoPackagingPage = lazy(() => import('./pages/admin/SeoPackagingPage'))` + `<Route path="seo-insights/packaging" element={<SeoPackagingPage />} />`. Cross-references Slop P2-S2.
- **M5. Proposal-type extension on `SeoProposal`.** SEOI-6 introduced `proposalType: blog_post | glossary_term | milestone | person_bio_patch` (per `prisma/schema.prisma:316` area). Adding `evergreen_routing` and `packaging_fix` as new sibling values is the right call (not a separate model). Cross-references Slop P2-S3 — Task 2 should explicitly name the new values and update `briefGenerator.ts` to handle the non-`blog_post` cases.
- **M6. `requireAdmin` import path** — same as SEOI-8 M3 / SEOI-9 Mi3. Use `'../middleware/auth'` for the 4 new endpoints in Task 4.

### Minor

- **Mi1. Existing JSON-LD schema types cover most page types.** SEOI-10 Task 3 audits "supported structured-data coverage relevant to the page type." The existing `<SEO />` already supports Person, Organization, FAQ, Article, BreadcrumbList, ItemList. Page types likely missing structured data: `/explained/:slug`, `/who-invented/:slug`, `/events/:id` (depends on whether they call `<SEO />` with the right schema). Audit categories should specifically check that these page types emit schema, not assume they don't. (Task 3 already says "audit," not "add" — just confirming the audit is meaningful given existing coverage.)
- **Mi2. Test paths use `/tests/unit/` convention from start.** ✓
- **Mi3. AdminLayout flat-nav constraint.** Same as SEOI-8 M2 / SEOI-9 M4. Recommend adding the packaging surface as a tab within the existing `/admin/seo-insights` tab nav rather than a new flat sidebar entry.

### What's verified correct

- All four SEO foundation surfaces (canonical, sitemap, JSON-LD, breadcrumbs) are production-ready and provide a real surface for the auditor to read from ✓
- `/news` and `/news/:id` routes exist (no hallucination) ✓
- `serpPackagingAudit.ts` doesn't collide with existing services ✓
- `/admin/seo-insights/packaging` route is unclaimed ✓
- SEOI-10 correctly composes with `PLAN-SEO-Improvements.md` and `PLAN-SEO-Timeline-Domination.md` foundations rather than recreating ✓
- "Do not add unsupported or spammy schema just to check a box" (Task 3) — correct discipline ✓
- Human-approval boundaries explicit for H1/schema/canonical/internal-link changes (Task 6) ✓
- Test paths correct ✓

### Effort impact

~20-30 min total. M1's read-only contract sub-task is the most leveraged add — it makes the audit-vs-generate boundary code-reviewable rather than just verbal.

---

## Slop Findings (AISlopReviewer — 2026-05-01)

Reviewed against the 17-category vibe-code slop checklist + LAEA's centralized systems map. Cross-references the parent PLAN's post-pilot slop section for cross-cutting findings.

### P0

(None.)

### P1

- **P1-S1. `serpPackagingAudit.ts` must AUDIT the existing canonical/sitemap/structured-data infra, not REGENERATE it.** Plan Overview correctly says "compose with the already-shipped SEO foundations in `PLAN-SEO-Improvements.md`." But Task 3's audit categories — title link, breadcrumb, structured-data coverage, internal-link support — overlap with what the foundation sprints (Sprint-SEO-1 through Sprint-SEO-7) already shipped. **Risk:** the new service re-derives canonical-tag inspection, structured-data validation, and breadcrumb shape rather than reading from existing helpers. **Fix:** add a top-of-file boundary comment on `serpPackagingAudit.ts`: "This service AUDITS, it does not GENERATE. Canonical tags, sitemap inclusion, breadcrumbs, and structured-data emission are owned by the Sprint-SEO-1 through SEO-7 infrastructure. This service reads what those produce and flags drift; if you find yourself adding generation code here, stop and extend the foundation service instead." Add a sub-task in Task 3: "Before implementing each audit category, locate the corresponding generator (e.g., for canonical tags, find where `<link rel='canonical'>` is emitted) and audit its output rather than reimplementing the canonical logic." Category 1.1 (Parallel helpers) + Category 12 (Architectural drift — bypassing existing abstraction).

### P2

- **P2-S1. Per-route `requireAdmin` not specified.** Task 4 adds 4 new admin endpoints. Same per-route convention concern as SEOI-8/9. **Fix:** explicit note in Task 4. Category 2.
- **P2-S2. `SeoPackagingPage` lazy import not addressed.** Task 5 introduces a packaging surface, with Files Touched listing `src/pages/admin/SeoPackagingPage.tsx`. Plan needs `const SeoPackagingPage = lazy(() => import('./pages/admin/SeoPackagingPage'))` in `src/App.tsx` matching SEOI-2/4/6. Category 3 (Hallucination — implicit).
- **P2-S3. Proposal-type fragmentation in `SeoProposal.proposalType`.** SEOI-6 introduced `proposalType: blog_post | glossary_term | milestone | person_bio_patch`. SEOI-10 adds an "evergreen routing / canonical promotion" flow but does not specify whether this is a sibling enum value (`evergreen_routing`) or a new top-level model. Plan implies the former (lighter), but Task 2 "add a proposal type for evergreen routing" should be explicit. **Fix:** in Task 2, name the new value as `evergreen_routing` (and possibly `packaging_fix` as a separate value for SERP-packaging issues), and update `briefGenerator.ts` to handle `proposalType !== 'blog_post'` cases. Category 2 (Inconsistency / drift).
- **P2-S4. New evergreen-routing proposals must respect SEOI-6's slop pre-flight.** SEOI-6 rejects "duplicate-with-existing-entity" content gaps because the recovery is "fix the entity, don't write a duplicate post." Evergreen-routing proposals are *exactly* that fix-the-entity flow surfaced as a first-class action. **Fix:** add a sub-task in Task 2: "When a SEOI-6 content-gap finding would have been rejected as `duplicate-with-existing-entity`, surface it instead as an `evergreen_routing` proposal pointing at the canonical entity URL — closing the loop the SEOI-6 reject opened." Category 17 (Misreading the task — adjacent reject and route-to-canonical were the same intent).

### P3

- **P3-S1. Hardcoded `/news` and `/news/:id` URL patterns in `serpPackagingAudit.ts`.** Task 1's news-to-evergreen detector identifies repeated demand on `/news` and `/news/:id`. If those route patterns ever change (e.g., `/news/[slug]`), the detector silently misses traffic. **Fix:** read the route patterns from a constants file or the React Router config rather than hardcoding strings inside the audit service. Minor — flag for cleanup-when-touched. Category 12 (Architectural drift — decentralized URL knowledge).

### Slop Avoided

- **"Do NOT add unsupported or spammy schema just to check a box."** Task 3 explicitly forbids spammy structured-data emission. Avoids Category 7 (Security pitfalls — schema as cloaking vector) and Category 17 (Misreading the task — checking the box vs delivering value).
- **Human approval boundaries explicit**: H1 changes, schema changes, canonical/routing changes, broad internal-link changes all stay human-only per Task 6. Auto-ship remains metadata-only, preserving the SEOI-7 expansion discipline.
- **Composition with existing SEO foundation work** rather than recreating sitemaps, canonicals, structured-data basics. (P1-S1 sharpens the implementation-time guardrails so this stays true.)
- **28d AND 90d evidence required** to avoid overreacting to one-day spikes (Task 1). Category 17 (Misreading the task — short-window noise treated as signal) avoided.
- **"Keep blog creation as only one option, not the default answer"** (Task 2) — explicitly resists the pattern where every signal becomes a blog post. Avoids Category 17 (Misreading the task — every problem looks like a nail).
- **Test paths use `/tests/unit/` convention** (`tests/unit/seo/serpPackagingAudit.test.ts`, etc.). ✓
- **No `mcp__claude-in-chrome__*`, no `VITE_*` secrets, no manual AWS console steps, no backwards-compat shims.**
