# Sprint SEOI-9: Topic Pods + Experiment Ledger

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-05-01 by Codex (sprint created — no tasks started)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `frontend.md`, `data-models.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-SEO-Insights-Pilot.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm SEOI-8 is complete enough that clustered opportunities are trustworthy in prod.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` or `agent-browser` for UI validation. Never skip browser checks on admin changes.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Once clustered opportunities exist, LAEA needs a disciplined way to turn them into sequenced bets instead of one-off drafts. This sprint introduces **topic pods** and an **experiment ledger**.

A topic pod is the planned set of pages or actions around a theme: canonical explainer, history page, inventor page, comparison page, FAQ expansion, internal-link updates, and so on. The experiment ledger makes every approved action measurable by scheduling GSC review checkpoints and storing before/after expectations.

This sprint is the bridge from “we found an opportunity” to “we ran a deliberate growth experiment and know whether it worked.”

**Priority**: HIGH
**Depends on**: SEOI-8
**Estimated Effort**: 2-3 days
**Status**: Not started

---

## Prerequisites

- [ ] SEOI-8 cluster mining is live in prod
- [ ] There are enough cluster findings in prod to test at least one topic pod end to end
- [ ] Existing `SeoProposal` and scheduled-agent run status plumbing are stable
- [ ] Local dev server running: `npm run dev` + `npm run dev:server`

---

## Tasks

### 1. Data model

- [ ] Extend `SeoProposal` so proposals can originate from either an exact weekly snapshot or a clustered opportunity
- [ ] Add a new experiment model, for example `SeoExperiment`, with fields such as:
  - `sourceType`, `sourceId`
  - `targetKeyword`
  - `targetUrl`
  - `hypothesis`
  - `variantType`
  - `scheduledReviewAt`
  - `reviewWindowDays`
  - `status`
  - `metricsBeforeJson`, `metricsAfterJson`
  - `notes`
- [ ] Add a `topicPodJson` field or sibling model describing companion assets and supporting actions for the cluster
- [ ] Generate Prisma migration(s)

### 2. Topic pod planner

- [ ] Create `server/src/services/seo/topicPodPlanner.ts`
- [ ] For a clustered opportunity, generate:
  - the recommended canonical destination
  - whether the next move is optimize existing page vs create new content
  - companion assets that would deepen authority around the same theme
  - internal-link opportunities using the existing entity graph
- [ ] Reuse existing graph primitives and `/AIBlogDraft` assumptions. Do **not** invent a second editorial planning system in parallel.
- [ ] Keep the planner duplication-safe:
  - if LAEA already has the obvious canonical page, do not propose it again
  - if a companion asset already exists, suggest optimizing/linking it instead

### 3. Cluster-backed proposal generation

- [ ] Extend proposal generation so a proposal can be created from a `GscClusterSnapshot`, not just `GscWeeklySnapshot`
- [ ] Proposal drawer should show the cluster rationale and topic-pod context
- [ ] Support multi-step recommendations, for example:
  - `optimize current page`
  - `create supporting explainer`
  - `expand FAQ / glossary coverage`
  - `create timeline-specific landing page`

### 4. Experiment ledger service

- [ ] Create `server/src/services/seo/experimentLedger.ts`
- [ ] When an action or proposal is approved, create experiment checkpoints at:
  - `D+14`
  - `D+28`
  - `D+56`
- [ ] Use finalized PT-window semantics for review timing
- [ ] Weekly agent should read open experiments, measure what is due, and persist outcome summaries instead of requiring manual spreadsheet tracking

### 5. Admin API

- [ ] Add endpoints such as:
  - `GET /api/admin/seo/experiments`
  - `GET /api/admin/seo/experiments/:id`
  - `POST /api/admin/seo/experiments/:id/review`
  - `POST /api/admin/seo/clusters/:id/generate-proposal`
- [ ] Keep the existing proposal routes as the human-approval boundary

### 6. Admin UI

- [ ] Add an experiments surface at `/admin/seo-insights/experiments`
- [ ] Show:
  - hypothesis
  - source cluster or page
  - checkpoint schedule
  - status (`planned`, `running`, `won`, `flat`, `lost`, `archived`)
  - measured deltas when available
- [ ] Proposal drawer should show the topic pod, not just a single angle

### 7. Scheduled-agent integration

- [ ] Update the weekly agent workflow so it:
  - checks due experiments first
  - writes review outcomes
  - only then considers new proposals
- [ ] Keep paused mode read-only

### 8. Tests

- [ ] Unit tests for `topicPodPlanner.ts`
- [ ] Unit tests for `experimentLedger.ts`
- [ ] Integration tests for experiment endpoints
- [ ] Frontend tests for the experiments page and cluster-backed proposal flow
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] Focused tests pass

### 9. Deploy

- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [ ] Run Prisma migration(s) in prod before verification
- [ ] Frontend: `./scripts/deploy-frontend.sh`
- [ ] Update the weekly automation prompt if new experiment review steps are required

### 10. Backend Validation

- [ ] Generate at least one proposal from a cluster-backed opportunity
- [ ] Approve one experiment-backed action and verify experiment rows are created with all three checkpoints
- [ ] Force one manual review run and confirm outcome metrics persist
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 30m` — zero errors

### 11. Browser Validation (agent-browser CLI)

- [ ] Open experiments page: `agent-browser open https://letaiexplainai.com/admin/seo-insights/experiments`
- [ ] Take initial screenshot: `agent-browser screenshot`
- [ ] Get refs: `agent-browser snapshot -i`
- [ ] Open one cluster-backed proposal and verify topic-pod sections render
- [ ] Verify experiment schedule chips or timeline render clearly
- [ ] Confirm a reviewed experiment shows outcome state without needing a refresh hack
- [ ] Take final screenshot: `agent-browser screenshot`
- [ ] Mobile viewport check for experiments page

---

## Definition of Done

- [ ] All tasks above checked
- [ ] Cluster-backed proposals can be generated in prod
- [ ] Every approved SEO action/proposal now produces an experiment ledger row with scheduled checkpoints
- [ ] Weekly automation can review due experiments and persist outcomes
- [ ] Admin experiments page is live and usable
- [ ] Tests, typecheck, and lint are clean
- [ ] CloudWatch and browser validation are clean
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```text
prisma/schema.prisma
prisma/migrations/<ts>_add_seo_experiment/
server/src/services/seo/topicPodPlanner.ts
server/src/services/seo/experimentLedger.ts
server/src/services/seo/briefGenerator.ts
server/src/controllers/seoAdmin.ts
server/src/routes/seoAdmin.ts
src/pages/admin/SeoProposalsPage.tsx
src/pages/admin/SeoExperimentsPage.tsx
src/components/admin/SeoProposalDrawer.tsx
src/services/api.ts
.claude/schedules/seo-weekly.md
tests/unit/seo/topicPodPlanner.test.ts
tests/unit/seo/experimentLedger.test.ts
tests/unit/seoAdmin.test.ts
tests/unit/pages/admin/SeoExperimentsPage.test.tsx
```

---

## Blocked — PM decision needed

1. **Topic-pod breadth.** Default v1 should keep the pod planner advisory, not automatically spawn multiple proposals at once. If Wylie wants automatic multi-asset pod creation, that should be a later escalation after the ledger proves reliable.
2. **Success thresholds.** Default outcome labels should be conservative: `won` only when the measured delta and volume are directionally meaningful, not just numerically positive.

