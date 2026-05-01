# Sprint SEOI-10: News-to-Evergreen Routing + SERP Packaging

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-05-01 by Codex (sprint created — no tasks started)

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
**Status**: Not started

---

## Prerequisites

- [ ] SEOI-8 clustered mining is live
- [ ] SEOI-9 experiment ledger is live
- [ ] Existing sitewide canonicals, sitemap, and baseline structured data from earlier SEO plans are already shipped
- [ ] Local dev server running: `npm run dev` + `npm run dev:server`

---

## Tasks

### 1. News-to-evergreen detector

- [ ] Create a detector for repeated demand landing on:
  - `/news`
  - `/news/:id`
  - other generic or transient destinations
- [ ] Classify the best next action:
  - route to existing canonical entity page
  - create new evergreen page
  - expand an existing evergreen page
  - keep as news only (if demand is clearly transient)
- [ ] Use 28-day and 90-day evidence to avoid overreacting to one-day spikes

### 2. Evergreen routing proposal flow

- [ ] Add a proposal type for evergreen routing / canonical promotion
- [ ] Proposal payload should include:
  - current landing page(s)
  - repeated query cluster
  - recommended canonical destination
  - whether this is a redirect/routing fix, a linking fix, or a new-content ask
- [ ] Keep blog creation as only one option, not the default answer

### 3. SERP packaging audit service

- [ ] Create `server/src/services/seo/serpPackagingAudit.ts`
- [ ] Audit pages with real impressions for:
  - title link risk (boilerplate, weak differentiation, title/H1 mismatch)
  - metadata quality
  - breadcrumb health
  - supported structured-data coverage relevant to the page type
  - internal-link support from related pages
- [ ] Tie the audit rubric to Google guidance:
  - title links can be derived from multiple sources, not just `<title>`
  - breadcrumbs should reflect a typical user path
  - supported structured data should be valid and non-spammy
- [ ] Do **not** add unsupported or spammy schema just to “check a box”

### 4. Admin API

- [ ] Add endpoints such as:
  - `GET /api/admin/seo/packaging`
  - `GET /api/admin/seo/packaging/:id`
  - `POST /api/admin/seo/packaging/:id/propose-fix`
  - `POST /api/admin/seo/clusters/:id/propose-evergreen`
- [ ] Reuse existing action/proposal status patterns where possible

### 5. Admin UI

- [ ] Add a packaging surface or sub-view in the SEO Insights admin
- [ ] For each audited page, show:
  - page URL
  - target cluster or queries
  - packaging issues found
  - proposed fixes
  - whether the page currently sits in an active experiment
- [ ] Add an evergreen-routing detail state showing the current vs recommended canonical destination

### 6. Agent integration

- [ ] Allow the weekly agent to surface packaging and evergreen-routing proposals
- [ ] Keep human approval required for:
  - H1 changes
  - schema changes
  - canonical/routing changes
  - broad internal-link changes
- [ ] Auto-ship remains limited to the already-approved metadata lane unless Wylie explicitly expands it later

### 7. Tests

- [ ] Unit tests for `serpPackagingAudit.ts`
- [ ] Unit tests for news-to-evergreen classification
- [ ] Integration tests for packaging and evergreen proposal endpoints
- [ ] Frontend tests for packaging admin views
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] Focused tests pass

### 8. Deploy

- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [ ] Run any required Prisma migration(s) in prod before verification
- [ ] Frontend: `./scripts/deploy-frontend.sh`
- [ ] Rebuild packaging audits and evergreen-routing proposals after deploy

### 9. Backend Validation

- [ ] Confirm at least one repeated `/news` demand theme becomes an evergreen-routing proposal in prod
- [ ] Confirm packaging audits exist for pages with real GSC impressions
- [ ] Verify that at least one proposal references an existing evergreen destination rather than defaulting to “write a blog post”
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 30m` — zero errors

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

