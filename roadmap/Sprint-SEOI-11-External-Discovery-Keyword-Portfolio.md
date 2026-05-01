# Sprint SEOI-11: External Discovery + Keyword Portfolio

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-05-01 by Codex (sprint created — no tasks started)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `frontend.md`, `data-models.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-SEO-Insights-Pilot.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm SEOI-8 through SEOI-10 are stable enough that GSC-driven opportunities and experiments already work.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` or `agent-browser` for UI validation. Never skip browser checks on admin changes.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Search Console is the best source for “Google is already testing us here,” but it is not the whole keyword market. This sprint adds a discovery lane that can propose high-value, lower-competition opportunities before LAEA has meaningful impressions for them.

The default posture in this sprint is **lean and cost-aware**:
- start with GSC clusters, Google Trends, public SERP sampling, and LAEA’s own content graph
- avoid paid keyword APIs or new billable infra unless Wylie approves them

This sprint should create a durable keyword portfolio that the weekly agent can feed gradually into the experiment system without drowning the team in speculative ideas.

**Priority**: MEDIUM-HIGH
**Depends on**: SEOI-8 through SEOI-10
**Estimated Effort**: 2-3 days
**Status**: Not started

---

## Prerequisites

- [ ] SEOI-8 through SEOI-10 are stable in prod
- [ ] GSC cluster mining and experiment ledger are already trusted
- [ ] Wylie has approved the default no-paid-provider approach, or explicitly approved any paid provider if needed
- [ ] Local dev server running: `npm run dev` + `npm run dev:server`

---

## Tasks

### 1. Discovery-source policy

- [ ] Document the source hierarchy for v1:
  - `gsc_cluster`
  - `google_trends`
  - `serp_sample`
  - `editorial_seed`
- [ ] Before provisioning any new AWS resource or adding any paid provider:
  - [ ] Run the relevant `aws [service] list-*` checks first
  - [ ] Estimate costs
  - [ ] Get team approval for billable changes
- [ ] Default v1 must work with zero new paid vendor dependencies

### 2. Data model

- [ ] Add a keyword-portfolio model, for example `KeywordOpportunity`, with fields such as:
  - `sourceType`
  - `seedQuery`
  - `clusterKey`
  - `targetIntent`
  - `demandProxy`
  - `competitionProxy`
  - `pageTypeRecommendation`
  - `targetUrl`
  - `rationale`
  - `status`
  - `linkedExperimentId`
- [ ] Generate Prisma migration(s)

### 3. Discovery services

- [ ] Create `server/src/services/seo/keywordDiscovery.ts`
- [ ] Implement a public-data discovery flow:
  - GSC clusters that imply adjacent unmet demand
  - Google Trends or equivalent lightweight trend input
  - SERP sampling that inspects result mix and crude competition proxies
  - content-graph gap checks so LAEA does not “discover” what it already owns
- [ ] Keep competition scoring lightweight and explainable in v1

### 4. Editorial scoring

- [ ] Add a scoring rubric that balances:
  - demand proxy
  - competition proxy
  - fit with LAEA’s existing graph
  - ability to support internal linking
  - experiment capacity
- [ ] Cap the weekly intake so discovery does not overwhelm the backlog

### 5. Admin portfolio UI

- [ ] Add a keyword portfolio page at `/admin/seo-insights/portfolio`
- [ ] Show:
  - keyword / cluster
  - source
  - demand proxy
  - competition proxy
  - recommended page type
  - current status
  - whether it has an approved experiment
- [ ] Allow operators to promote a discovery into the existing experiment/proposal flow

### 6. Weekly automation

- [ ] Update the weekly agent so it can nominate at most 1-2 new discovery-lane ideas per run
- [ ] Keep the rest in a scored backlog for human review
- [ ] Paused mode remains read-only

### 7. Tests

- [ ] Unit tests for `keywordDiscovery.ts`
- [ ] Integration tests for keyword portfolio endpoints
- [ ] Frontend tests for the portfolio UI
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] Focused tests pass

### 8. Deploy

- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [ ] Run Prisma migration(s) in prod before verification
- [ ] Frontend: `./scripts/deploy-frontend.sh`
- [ ] Rebuild the portfolio after deploy

### 9. Backend Validation

- [ ] Confirm at least 10 keyword portfolio rows exist in prod without paid-provider dependencies
- [ ] Confirm at least 3 opportunities can be promoted into experiment/proposal flows
- [ ] Verify source attribution and rationale are visible and understandable
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 30m` — zero errors

### 10. Browser Validation (agent-browser CLI)

- [ ] Open the portfolio page: `agent-browser open https://letaiexplainai.com/admin/seo-insights/portfolio`
- [ ] Take initial screenshot: `agent-browser screenshot`
- [ ] Get refs: `agent-browser snapshot -i`
- [ ] Verify sorting/filtering by source and score works
- [ ] Promote one discovery into the existing workflow and confirm the UI reflects the new state
- [ ] Take final screenshot: `agent-browser screenshot`
- [ ] Mobile viewport check for the portfolio page

---

## Definition of Done

- [ ] All tasks above checked
- [ ] Keyword portfolio is live in prod
- [ ] Discovery lane works without paid providers by default
- [ ] At least 10 portfolio opportunities exist with usable rationale
- [ ] At least 3 opportunities can feed into the existing proposal/experiment flow
- [ ] Tests, typecheck, and lint are clean
- [ ] CloudWatch and browser validation are clean
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```text
prisma/schema.prisma
prisma/migrations/<ts>_add_keyword_opportunity/
server/src/services/seo/keywordDiscovery.ts
server/src/controllers/seoAdmin.ts
server/src/routes/seoAdmin.ts
src/pages/admin/SeoKeywordPortfolioPage.tsx
src/services/api.ts
tests/unit/seo/keywordDiscovery.test.ts
tests/unit/seoAdmin.test.ts
tests/unit/pages/admin/SeoKeywordPortfolioPage.test.tsx
.claude/schedules/seo-weekly.md
```

---

## Blocked — PM decision needed

1. **Paid provider escalation.** Default is no SEMrush/Ahrefs/DataForSEO dependency. If Wylie wants one, capture cost, API ownership, and exactly which scoring gap it solves before adding it.
2. **Discovery volume.** Default weekly intake should stay small. If Wylie wants a larger backlog generated automatically, set an explicit review budget first so the queue does not become junk.

