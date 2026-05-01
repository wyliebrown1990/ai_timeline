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

