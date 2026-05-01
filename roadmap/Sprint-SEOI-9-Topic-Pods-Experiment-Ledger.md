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

---

## UX Lead Review (2026-05-01)

This sprint adds the **experiment ledger** (`/admin/seo-insights/experiments`) — the surface where every approved SEO action's measurement schedule is visible. UX bar: the D+14/D+28/D+56 cadence must be readable at a glance, outcome state (`won`/`flat`/`lost`) must be color-blind-safe, and the topic-pod expansion in proposal drawers must layer cleanly on SEOI-6's existing proposal UX. See `PLAN-SEO-Insights-Pilot.md` "UX Lead Re-Verification (2026-05-01)" for cross-cutting findings.

### User-facing impact
A new `Experiments` tab inside `/admin/seo-insights` (the fifth tab after SEOI-8 lands), and an extended proposal drawer that surfaces the topic-pod plan when a proposal is cluster-backed. Admin-only, desktop-first.

### Surface(s) affected
Admin CMS only.

### UX findings

#### 1. IA — Experiments as the fifth tab

- [ ] **Tab inside `/admin/seo-insights`**, not a sidebar entry. Same constraint as SEOI-8 #1 (AdminLayout flat nav). After SEOI-9 lands, tab nav is: `Insights · Actions · Proposals · Clusters · Experiments`.
- [ ] **Tab label includes count**: `Experiments (7 running, 2 due for review)`. The "due for review" count is the most actionable signal — surface it in the tab label, not buried in the table.
- [ ] **Mobile horizontal scroll**: 5 tabs at 375px definitely scroll. Snap behavior + auto-scroll-active per SEOI-2 UX-2 spec.

#### 2. Experiment status visualization (Task 6)

The status enum is `planned | running | won | flat | lost | archived`. This is the most signal-dense UX in the sprint — get the visual treatment right.

- [ ] **Status pill** with icon + text + color (each pillar required, no color-alone):
  - `planned` → ⏳ icon, "Planned", `bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200`
  - `running` → ● animated pulse, "Running", `bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`
  - `won` → ✓ icon, "Won", `bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300`
  - `flat` → ➖ icon, "Flat", `bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`
  - `lost` → ✗ icon, "Lost", `bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300`
  - `archived` → 🗄 icon, "Archived", `bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-500`
- [ ] **Animated pulse** on `running` state respects `prefers-reduced-motion` — fall back to a static dot.

#### 3. Checkpoint timeline visualization (Task 4)

The D+14 / D+28 / D+56 cadence is the experimental-discipline core of this sprint. The UI must communicate: "what's been measured, what's pending, when's the next review."

- [ ] **Inline timeline chip** on each experiment row: 3 dots representing D+14 / D+28 / D+56, each with state:
  - empty (gray outline) = not yet due
  - filled with check (green) = measured + outcome captured
  - filled with warning (amber) = due now, awaiting agent review
  - filled with X (red) = missed (overdue >7d)
- [ ] **Hover tooltip** (per `frontend.md` Portal-tooltip pattern) shows the actual checkpoint date and outcome metrics if measured: `D+14 (2026-05-14): CTR +1.2pp, impressions +18%`.
- [ ] **Mobile**: timeline chip stays inline (it's a 3-dot row, ~60px wide). Don't stack vertically.

#### 4. Topic-pod expansion in proposal drawer (Task 3)

SEOI-6 introduced a proposal drawer with target keyword / suggested angle / link inventory / news hooks / rationale. SEOI-9 extends it to show the topic-pod plan when the proposal is cluster-backed.

- [ ] **Don't replace the existing drawer — add a "Topic Pod" section** above the existing rationale. Use a collapsible (collapsed by default for non-cluster proposals, expanded by default for cluster-backed proposals). Section header: "Topic Pod Plan" with a small chip indicating cluster-source.
- [ ] **Topic-pod plan content** (per Task 2 plan):
  - Recommended canonical destination (link to the existing or new page)
  - Move type: `optimize current` / `create new` / `expand existing` / `internal-link only` — pill with icon
  - Companion assets: bulleted list with checkboxes (each can be promoted to its own proposal in a follow-up)
  - Internal-link opportunities: bulleted list of source-pages
- [ ] **Reuse `<SubjectBadge>` styling** for the move-type pill — keeps chip language consistent with the rest of admin CMS.
- [ ] **Don't render topic-pod section for non-cluster proposals** — leave the drawer at SEOI-6's shape for those. Avoids visual noise on simpler proposals.

#### 5. Experiments table responsive (Task 6)

- [ ] **Desktop**: full table with columns `Hypothesis · Source · Checkpoint Timeline · Status · Measured Delta · Actions`.
- [ ] **Mobile (<`md`)**: collapse to card layout (one card per experiment) — table scrolling horizontally hides the checkpoint timeline which is the most signal-dense column. Card layout keeps it visible:
  ```
  ┌─────────────────────────────────────┐
  │ [Hypothesis truncated to 2 lines]   │
  │ [Source page link] · [Status pill]  │
  │ [● ● ○]  D+14 ✓  D+28 ✓  D+56 …  │
  │ Measured: CTR +1.2pp, imp +18%      │
  │ [Review] [Archive]                  │
  └─────────────────────────────────────┘
  ```
- [ ] **Sticky header** on desktop table so column labels stay visible while scrolling long lists.

#### 6. Cluster-backed proposal flow visual signal (Task 3)

A proposal can come from `GscWeeklySnapshot` (existing) or `GscClusterSnapshot` (new). UX needs a clear signal which.

- [ ] **Source chip** on each proposal row: `From weekly snapshot` (default) vs `From 90d cluster` / `From 28d cluster` (cluster-backed). Chip icon: a simple line-graph icon for snapshot, a cluster-of-dots icon for cluster.
- [ ] **Drawer header includes source**: above the target keyword, small muted text says "Sourced from 90-day cluster: `mixture of experts`" — links to the cluster detail in the Clusters tab.

#### 7. State completeness

- [ ] **Loading**: `<LoadingSkeleton lines={5}>` matching experiment card height.
- [ ] **Empty (per status filter)**: `<EmptyState>` with status-specific copy. For "Planned" empty: "No planned experiments — approve a proposal to schedule one." For "Won" empty (could be normal for a young system): "No won experiments yet. Outcomes appear here after D+14 measurement runs."
- [ ] **Error**: `<ErrorState onRetry={refetch}>`.
- [ ] **Degraded**: experiment whose source proposal/cluster was archived → show "Source archived" pill but keep the measurement data.
- [ ] **First-time** (no experiments ever created): one-time helper banner: "Experiments get created automatically when you approve a proposal or auto-ship an action. Ship something from the Insights or Proposals tab to populate this view."

#### 8. Outcome celebration (when an experiment lands `won`)

This is a small but real motivation moment for the operator — when an SEO experiment wins, give it a beat.

- [ ] **`react-hot-toast` success toast** when the agent's review run flips an experiment to `won`: "Experiment won: `mixture of experts` — CTR +2.1pp, impressions +34%". Auto-dismiss after 6s.
- [ ] **Optional**: brief confetti animation (framer-motion's `<motion.div>` with a stagger) on the experiment row when its status flips to `won` from `running`. Respect `prefers-reduced-motion` — skip the animation entirely if reduced-motion is set.

#### 9. Color-blind safety

- [ ] All status pills use icon + text label, never color alone (per #2).
- [ ] Checkpoint timeline dots use shape variation (empty/filled-check/filled-warning/filled-X) — color is supplementary.

#### 10. Dark mode decision

- [ ] **Match `AdminLayout` light theme** per UX-X1. Status pill `dark:` variants ARE specified in #2 above (so the pills themselves remain readable if the operator-side dark-mode backfill ever happens), but the page chrome stays single-theme.

#### 11. Keyboard + a11y

- [ ] **Tab order**: status filter chips → table rows → row action buttons. Standard.
- [ ] **Each experiment row** is keyboard-focusable; Enter opens the experiment detail drawer.
- [ ] **Drawer focus trap** built into the shared `<Drawer>` primitive.
- [ ] **Manual review-now button** (Task 7) is keyboard-reachable; uses `<ConfirmDialog>` for the "are you sure you want to force-fire the schedule?" prompt (high-friction, low-frequency action).

### Definition of Done additions

- [ ] Experiments tab + status pills + checkpoint timeline render correctly at 375px / 768px / 1280px
- [ ] All 6 status states render with icon + text + color (color-blind safe)
- [ ] Mobile card layout for experiment list (no horizontal table scroll on mobile)
- [ ] Topic-pod section in proposal drawer renders only for cluster-backed proposals
- [ ] Won-experiment celebration: toast + (optional) confetti, both respect reduced-motion
- [ ] Lighthouse Accessibility ≥95 with banner + tabs + table + drawer all rendered
- [ ] Keyboard reach: filter chips → table rows → action buttons → drawer all reachable

### What's correct already

- Reuse of SEOI-6 proposal drawer + extension via collapsible topic-pod section — correct, doesn't fork.
- D+14/D+28/D+56 cadence as a measurable rhythm — correct UX framing for "experiment, don't ship-and-forget."
- Read-only paused mode on experiments tab (Task 7) — correctly preserves the killswitch boundary.
- Source attribution from cluster vs snapshot — correctly surfaced (just needs the visual chip per #6).

---

## Tech Lead Review (2026-05-01)

Verification against actual codebase. See `PLAN-SEO-Insights-Pilot.md` "Tech Lead Re-Verification (2026-05-01)" section for cross-cutting findings.

### Critical

- **C1. `SeoExperiment.metricsBeforeJson`/`metricsAfterJson` overlap with shipped `SeoAgentAction.measuredDelta` — must be reconciled before schema lands.** Verified `prisma/schema.prisma`: `SeoAgentAction.measuredDelta: Json?` already exists (line ~302) and stores the 7-day post-ship before/after delta computed by `feedbackMeasurement.ts`. SEOI-9's `SeoExperiment` introduces parallel storage for the same conceptual data. The two ARE genuinely distinct (single-shot 7d vs scheduled multi-checkpoint), but the schema alone doesn't communicate this. **Patch:** before generating the migration, finalize the boundary: `SeoExperiment` is the planned-checkpoint layer (D+14/D+28/D+56 schedule, can wrap proposals/clusters/auto-shipped actions); `SeoAgentAction.measuredDelta` is the single 7-day post-auto-ship measurement. Add Prisma `///` comments on both models stating this. Cross-references `/AISlopReviewer` P1-S1 in the same plan.

### Moderate

- **M1. `SeoProposal.draftPostId` `@relation` shipped correctly per SEOI-6 TLR C2.** Verified `prisma/schema.prisma`: `SeoProposal.draftPost BlogPost? @relation(fields: [draftPostId], references: [id])` is declared (line 327). Same for `SeoAgentAction.snapshot` (line ~295). The pattern SEOI-9's new `SeoExperiment` should follow:
  ```prisma
  proposal     SeoProposal?       @relation(fields: [proposalId], references: [id])
  agentAction  SeoAgentAction?    @relation(fields: [agentActionId], references: [id])
  cluster      GscClusterSnapshot? @relation(fields: [clusterId], references: [id])  // depends on SEOI-8
  ```
  And the inverse relations on each linked model. Don't ship FK strings without `@relation` declarations.
- **M2. `SeoExperiment` source polymorphism shape.** Task 1 lists `sourceType`, `sourceId` as the source pointer. Without typed FKs, Prisma can't `include` the source — every read becomes a switch on `sourceType` + a separate query. This matches the existing `ContentSubject.contentType`/`contentId` polymorphism convention (per `subject-taxonomy.md`), so it's not slop, but document the trade-off. **Alternative:** typed nullable FKs (`proposalId`, `agentActionId`, `clusterId`) — denser schema, cheaper joins. Pick one and stay consistent. If polymorphic, add a `getSource(experiment)` helper to `experimentLedger.ts` so the switch lives in one place.
- **M3. `/admin/seo-insights/experiments` route is unclaimed.** Verified `src/App.tsx`: no existing route at `/admin/seo-insights/experiments`. Task 6 needs:
  - `const SeoExperimentsPage = lazy(() => import('./pages/admin/SeoExperimentsPage'))` (matches lines 130-132 pattern)
  - `<Route path="seo-insights/experiments" element={<SeoExperimentsPage />} />` (matches lines 326-328 pattern)
  
  Already noted in Slop Findings P2-S2; this confirms the codebase state.
- **M4. Admin nav decision (cross-cutting M2 from SEOI-8).** Same decision: tab inside `/admin/seo-insights` (recommended) vs flat sidebar entry. Will be the **fourth or fifth** tab depending on SEOI-8's choice. Verified `AdminLayout.tsx` `navItems` (lines 35-141) uses flat top-level entries with no submenu support — adding a submenu would require AdminLayout refactor. Stay with the in-page tab nav.
- **M5. Weekly agent integration (Task 7) — schedule definition path.** SEOI-5's TLR C3 flagged that `/schedule` skill's persistence path is unverified. SEOI-9 Task 7 says "Update the weekly agent workflow." Verify the schedule definition is at `.claude/schedules/seo-weekly.md` (which the shipped commit committed) or at the runtime `/schedule` skill's actual storage path. If the latter, the file in repo is documentation-only.

### Minor

- **Mi1. `topicPodPlanner.ts` and `experimentLedger.ts` don't collide.** Verified `server/src/services/seo/` directory exists with `agentControl.ts`, `agentRunStatus.ts`, `briefGenerator.ts`, `feedbackMeasurement.ts`, `metadataRewriter.ts`. New files go in cleanly.
- **Mi2. `briefGenerator.ts` extension over fork (Task 3).** Plan correctly extends the existing `briefGenerator.ts` to handle cluster-sourced proposals rather than introducing a sibling brief generator. Verified the existing service exports `generateBrief(snapshotId)` — extending it to accept either a `GscWeeklySnapshot` or `GscClusterSnapshot` is the right call.
- **Mi3. `requireAdmin` import path** — same as SEOI-8 M3. Use `'../middleware/auth'`.
- **Mi4. Status state machine for `SeoExperiment.status`.** Plan lists `planned | running | won | flat | lost | archived`. Document the transition rules in the controller (e.g., `won/flat/lost` are terminal except for `archived`); add a test in Task 8 covering invalid transitions. Mirrors SEOI-6 TLR Mi3.

### What's verified correct

- `SeoExperiment` model name doesn't collide with any of the 50+ existing models ✓
- `topicPodPlanner.ts`, `experimentLedger.ts` files don't exist yet (collision-free) ✓
- `/admin/seo-insights/experiments` route is unclaimed ✓
- `SeoProposal.draftPostId @relation` and `SeoAgentAction.snapshot @relation` from SEOI-4/SEOI-6 TLR C2 actually shipped — pattern is set ✓
- D+14 / D+28 / D+56 cadence matches the 7-day-post-ship discipline already in `feedbackMeasurement.ts` (extends, doesn't fork) ✓
- Paused mode read-only honored on the new experiment surface ✓
- Test paths use `/tests/unit/` convention from start ✓

### Effort impact

~30-45 min for the C1 boundary documentation + the M1-M3 patches. The C1 finding is the structurally important one — fix before the migration lands.

---

## Slop Findings (AISlopReviewer — 2026-05-01)

Reviewed against the 17-category vibe-code slop checklist + LAEA's centralized systems map. Cross-references the parent PLAN's post-pilot slop section for cross-cutting findings.

### P0

(None.)

### P1

- **P1-S1. `SeoExperiment.metricsBeforeJson` / `metricsAfterJson` overlaps with `SeoAgentAction.measuredDelta` shape.** `SeoAgentAction` (SEOI-4) already stores `measuredDelta: Json?` for shipped-action measurements. `SeoExperiment` introduces parallel storage for the same conceptual data: before/after CTR, impressions, position. **The shapes are similar enough that future devs will be tempted to merge them or fork yet a third measurement table.** The justification IS sound — `SeoExperiment` is the *planned-checkpoint* layer (D+14/D+28/D+56 schedule for proposals, clusters, AND shipped actions), while `SeoAgentAction.measuredDelta` is a single one-shot 7-day post-ship measurement specific to auto-shipped actions. But that distinction is invisible from the schema alone. **Fix:** add a Prisma `///` comment on both models AND a top-of-file comment on `experimentLedger.ts` explicitly stating: "`SeoExperiment` is the planned-measurement layer (multi-checkpoint schedule for any approved action — proposal, cluster, or auto-shipped action). `SeoAgentAction.measuredDelta` is the single 7-day post-ship measurement for auto-shipped metadata rewrites and is computed by `feedbackMeasurement.ts`. The two are intentionally separate because the cardinality differs (one-to-many checkpoints vs single delta) and the lifecycle differs (scheduled review vs one-shot). Do not merge them." Category 1.1 (Parallel helpers risk) + Category 2 (Inconsistency / drift if undocumented).

### P2

- **P2-S1. Per-route `requireAdmin` not specified.** Task 5's 4 new endpoints (`GET /experiments`, `GET /experiments/:id`, `POST /experiments/:id/review`, `POST /clusters/:id/generate-proposal`) need explicit per-route middleware per project convention. Same as SEOI-8 P2-S1. **Fix:** note in Task 5 that all 4 endpoints follow the canonical pattern. Category 2.
- **P2-S2. `SeoExperimentsPage` lazy import + admin nav decision not addressed.** Task 6 adds a new `/admin/seo-insights/experiments` route. Files Touched lists `src/pages/admin/SeoExperimentsPage.tsx` but the plan does not call out: (a) `const SeoExperimentsPage = lazy(() => import('./pages/admin/SeoExperimentsPage'))` in `src/App.tsx` (matching SEOI-2/4/6 pattern), (b) whether to add a fourth tab to the existing SEO Insights tab nav (Insights · Actions · Proposals · **Experiments**) or a separate sidebar entry. **Fix:** add a sub-task in Task 6: "Add lazy import to `src/App.tsx` and extend the existing tab nav rather than the AdminLayout sidebar — keeps the SEO surfaces co-located." Category 3 (Hallucination — implicit choice not committed).
- **P2-S3. Brief generator extension boundary.** Task 3 extends `briefGenerator.ts` to handle `GscClusterSnapshot` in addition to `GscWeeklySnapshot`. Good — extension over fork. **But** the extension must not break the SEOI-6 slop pre-flight (generic listicle reject, duplicate-with-existing-entity reject, voice-drift reject). **Fix:** add a sub-task explicitly: "Run the cluster-backed proposal through the same SEOI-6 slop pre-flight checklist; ensure cluster proposals can also be rejected with `rejectedReason` for the same three categories." Category 16 (Process & verification gaps — extension shipped without verifying the existing safety bar still applies).

### P3

(None.)

### Slop Avoided

- **`briefGenerator.ts` is extended, not forked, to handle cluster-backed proposals.** Task 3 explicitly says "Extend proposal generation so a proposal can be created from a `GscClusterSnapshot`." No new brief-generator service introduced. Category 1.1 (Parallel helpers) avoided.
- **`topicPodPlanner.ts` reuses the entity graph and `/AIBlogDraft` assumptions.** Task 2 explicitly says "Reuse existing graph primitives and `/AIBlogDraft` assumptions. Do not invent a second editorial planning system in parallel." Category 1.1 + Category 12 (Architectural drift) avoided by design.
- **Duplication-safe planner**: Task 2 says "if LAEA already has the obvious canonical page, do not propose it again. If a companion asset already exists, suggest optimizing/linking it instead." Defends against Category 1.1 explicitly.
- **D+14 / D+28 / D+56 checkpoint cadence with finalized PT-window semantics** matches SEOI-1's date discipline. No drift on the "anonymized queries omitted, finalized days only" constraint.
- **Conservative success thresholds** (PM decision #2 — `won` only when measured delta is directionally meaningful, not just numerically positive). Avoids Category 17 (Misreading the task — declaring premature wins).
- **Paused mode remains read-only** for the experiment ledger. Killswitch boundary preserved across the new surface.
- **`SeoProposal` extension** rather than introducing yet a fourth proposal-shaped table for cluster-sourced proposals. Adds `sourceType` discrimination. Category 1.1 avoided.
- **Test paths use `/tests/unit/` convention** (`tests/unit/seo/topicPodPlanner.test.ts`, `tests/unit/seo/experimentLedger.test.ts`, `tests/unit/seoAdmin.test.ts`, `tests/unit/pages/admin/SeoExperimentsPage.test.tsx`). ✓
- **No `mcp__claude-in-chrome__*`, no `VITE_*` secrets, no manual AWS console steps, no backwards-compat shims.**

