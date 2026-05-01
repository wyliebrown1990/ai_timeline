# Sprint SEOI-4: Auto-Ship Lane — Metadata Rewrites

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-30 by Wylie (sprint created — no tasks started)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `frontend.md`, `data-models.md`, `build-and-deploy-security.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-SEO-Insights-Pilot.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm SEOI-1, SEOI-2, SEOI-3 DoDs are fully checked. If not, finish them first.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Wire the **only** auto-ship lane the system has: rewriting `seoTitle` and `seoDescription` on `BlogPost` records that fall in the `winnable_loss` bucket. Restricted to one entity type initially (blog posts), bounded by the confidence threshold and slop checks defined in `/SEOAuditAgent`, and gated by the `seo-agent-paused` SSM switch. Every shipped change writes to the `SeoAgentAction` audit log with a one-click rollback. No cron yet — this sprint exposes manual-trigger endpoints; SEOI-5 wires the schedule.

The blast radius is deliberately tiny: blog posts only, metadata only, max 3 entities per run. SEOI-7 expands to other entity types after the drift detector has verified safe operation.

**Priority**: HIGH (first sprint where the agent actually changes prod data)
**Depends on**: SEOI-1, SEOI-2, SEOI-3
**Estimated Effort**: 2 days
**Status**: Not started

---

## Prerequisites

- [ ] SEOI-1, SEOI-2, SEOI-3 DoDs fully checked
- [ ] `/SEOAuditAgent` skill produces high-quality output on dry-runs (verified in SEOI-3 Task 8)
- [ ] Anthropic API key in SSM (`/ai-timeline/prod/anthropic-api-key`) — already exists
- [ ] Local dev server running

---

## Tasks

### 1. Audit log schema

- [ ] Add `SeoAgentAction` model to `prisma/schema.prisma` per the PLAN's Data Model Summary
- [ ] Migration:
  ```bash
  npx prisma migrate dev --name add_seo_agent_action
  ```
- [ ] Verify indexes: `@@index([targetType, targetId])`, `@@index([shippedAt])`, `@@index([rolledBackAt])`

### 2. Pause switch

- [ ] Create SSM param `/ai-timeline/prod/seo-agent-paused` (String, default `"false"`)
- [ ] Add to `server/src/services/seo/agentControl.ts` a single function `isPaused(): Promise<boolean>` that reads the SSM param (cached for 60s)
- [ ] Document in `.claude/rules/backend.md` SSM Parameters section

### 3. Metadata rewriter service

- [ ] Create `server/src/services/seo/metadataRewriter.ts`:
  - `proposeRewrite(snapshotId)` — reads the GSC snapshot, looks up the target entity (must be a blog post), reads the current seoTitle/seoDescription, sends a focused prompt to Claude Sonnet 4.6 asking for a rewrite given the bucket evidence and `seo_voice.md` excerpts. Returns `{ proposedTitle, proposedDescription, rationale, confidence }`.
  - `shipRewrite(snapshotId, dryRun)` — calls `proposeRewrite`, runs the slop pre-flight (mirrors `slop_categories.md`), checks confidence ≥ 0.8 + impressions ≥ 100 + recency rule (no rewrite within 30 days for the same post), checks `isPaused()`, then if all pass: writes a `SeoAgentAction` row, updates `BlogPost.seoTitle/seoDescription`, marks the snapshot `status='shipped'`. If `dryRun=true`, only returns the proposal without writing.
- [ ] Hard cap: `shipRewrite` refuses if ≥3 SeoAgentActions exist with `shippedAt > now() - 7 days` AND `actionType='metadata_rewrite'` AND `rolledBackAt IS NULL` (the per-week blast-radius cap).
- [ ] Always pass `seo_voice.md` content as part of the prompt. If the file is empty/unreadable, abort and emit a warning (per skill spec).

### 4. Composition with /SEOAuditAgent

- [ ] The `metadataRewriter` is the executor; the skill is the brain. The skill produces the proposal artifact and confidence score; the service enforces the server-side guardrails (pause switch, blast radius cap, audit log, recency rule).
- [ ] Document the boundary in a comment at the top of `metadataRewriter.ts`:
  ```ts
  // The /SEOAuditAgent skill drives reasoning (what to rewrite and why).
  // This service drives execution (writes, audit, rollback, blast-radius caps).
  // Guardrails are enforced HERE even if the skill misbehaves — never trust the skill alone.
  ```

### 5. Admin endpoints

- [ ] Add to `server/src/controllers/seoAdmin.ts`:
  - `POST /api/admin/seo/insights/:id/propose-rewrite` — admin only — returns `{ proposedTitle, proposedDescription, rationale, confidence }`. No write.
  - `POST /api/admin/seo/insights/:id/ship-rewrite` — admin only — calls `shipRewrite` (dryRun=false). Returns the new `SeoAgentAction` row.
  - `GET /api/admin/seo/actions?targetType=&limit=&page=&status=` — admin only — paginated audit log.
  - `POST /api/admin/seo/actions/:id/rollback` — admin only — restores `beforeJson` to the target entity, sets `rolledBackAt`, leaves the row otherwise intact.
- [ ] Wire routes in `server/src/routes/seoAdmin.ts`

### 6. Admin actions audit page

- [ ] Create `src/pages/admin/SeoActionsPage.tsx` at route `/admin/seo-insights/actions`:
  - Table: `Shipped At | Action Type | Target | Confidence | Status | Buttons (View Diff, Rollback)`
  - Status filters: All, Shipped, Rolled Back, Measured
  - "View Diff" opens a side panel showing the before/after seoTitle and seoDescription side-by-side with diff highlighting.
  - "Rollback" prompts a confirm modal, then calls the rollback endpoint.
- [ ] Add tab nav at the top of `SeoInsightsPage` so users can switch between Insights and Actions views

### 7. Wire into insights page

- [ ] On the Insights detail drawer (built in SEOI-2), add a "Propose rewrite" button visible when `bucket='winnable_loss'` AND target is a blog post.
- [ ] Clicking it calls `POST /propose-rewrite`, displays the proposed title/description + confidence + rationale in the drawer.
- [ ] If confidence ≥ 0.8: show a "Ship it" button (calls `/ship-rewrite`).
- [ ] If confidence < 0.8: show a "Send to /AIBlogDraft for human review" button (just opens the existing `/AIBlogDraft` skill workflow with the rationale prefilled — no auto-action).
- [ ] After ship, show a success toast linking to the audit log entry; mark the row `actioned` in the parent table.

### 8. Tests

- [ ] Unit tests for `metadataRewriter.ts` in `server/src/services/seo/__tests__/metadataRewriter.test.ts`:
  - Pause switch ON → refuses to ship
  - Confidence < 0.8 → refuses to ship
  - Recency rule → refuses if same post had a rewrite within 30 days
  - Blast radius cap → refuses if 3 already shipped this week
  - Slop pre-flight → refuses on each slop category trigger (build a fixture per category)
  - Happy path → writes SeoAgentAction + updates BlogPost
- [ ] Integration tests for the 4 new admin endpoints in `server/src/controllers/__tests__/seoAdmin.test.ts`
- [ ] Frontend tests for `SeoActionsPage.tsx` (rollback modal, diff panel)
- [ ] `npm test -- seo` — all pass
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors

### 9. Deploy

- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [ ] Migration:
      `export DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text) && npx prisma migrate deploy`
- [ ] Frontend: `./scripts/deploy-frontend.sh`
- [ ] Verify pause switch is set to `"false"` (default-active) in prod SSM:
  ```bash
  aws ssm get-parameter --name /ai-timeline/prod/seo-agent-paused
  ```

### 10. Backend Validation

- [ ] Get JWT, propose a rewrite for a real winnable-loss finding:
  ```bash
  curl -sS -X POST "https://letaiexplainai.com/api/admin/seo/insights/<id>/propose-rewrite" \
    -H "Authorization: Bearer $TOKEN"
  ```
  Inspect the rationale — is it sane? Does it match `seo_voice.md` voice?
- [ ] **Calibration gate before first auto-ship**: invoke `/AISEOReview` on the FIRST 3 proposed rewrites generated by the live `metadataRewriter.proposeRewrite()` (not the dry-run from SEOI-3 — these are the production-pipeline outputs). For each rewrite ask: "Does this proposed seoTitle (≤60 chars) + seoDescription (140-160 chars) pass the technical-SEO bar — keyword placement, click-through value, no stuffing, structured-data compatibility? Compare to the existing metadata: would Google's algorithm prefer the new version on the target query?" **If `/AISEOReview` rejects ≥1 of 3, do NOT proceed to ship.** Pause the flow, identify the prompt drift in `metadataRewriter.ts`, fix, re-test. The first 3 ships set the calibration benchmark for SEOI-7's drift detector — if they're noisy, drift detection is noisy too.
- [ ] Ship it (only if `/AISEOReview` approved AND you'd actually approve the rewrite):
  ```bash
  curl -sS -X POST "https://letaiexplainai.com/api/admin/seo/insights/<id>/ship-rewrite" \
    -H "Authorization: Bearer $TOKEN"
  ```
- [ ] Confirm the BlogPost record updated:
  ```bash
  curl -sS "https://letaiexplainai.com/api/blog/<slug>" | jq '.seoTitle, .seoDescription'
  ```
- [ ] Confirm the audit log entry exists:
  ```bash
  curl -sS "https://letaiexplainai.com/api/admin/seo/actions?limit=5" \
    -H "Authorization: Bearer $TOKEN"
  ```
- [ ] Test rollback: hit `/rollback`, confirm the BlogPost reverted, confirm `rolledBackAt` populated.
- [ ] Test pause switch: set to `"true"`, retry ship → expect refusal. Reset to `"false"`.
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 15m` — zero errors

### 11. Browser Validation (via `/Browser` skill only)

- [ ] `agent-browser open https://letaiexplainai.com/admin/seo-insights`
- [ ] Open a winnable-loss finding's detail drawer
- [ ] Click "Propose rewrite" → verify proposal renders with title, description, confidence, rationale
- [ ] Click "Ship it" (only on a finding you'd actually approve) → verify success toast, audit log entry created
- [ ] Navigate to `/admin/seo-insights/actions` — confirm new row appears
- [ ] Click "View Diff" → confirm before/after side-by-side renders correctly
- [ ] Click "Rollback" → confirm modal, click confirm → confirm row updates to "Rolled Back" state
- [ ] Take screenshots at each step for the sprint commit
- [ ] Mobile viewport: `agent-browser resize 375 812 && agent-browser screenshot` — confirm tables don't break
- [ ] Zero console errors, zero 4xx/5xx
- [ ] Lighthouse on `/admin/seo-insights/actions`: Performance ≥90, Accessibility ≥95

---

## Definition of Done

- [ ] All tasks above checked
- [ ] At least one real winnable-loss finding has been auto-shipped end-to-end (proposal → ship → audit log → BlogPost updated → public-facing seoTitle/Description reflects the change)
- [ ] Rollback exercised at least once with no data loss
- [ ] Pause switch verified working
- [ ] Audit log page lists shipped actions correctly with diff view + rollback buttons
- [ ] All slop pre-flight categories tested (one fixture per category, verified rejection)
- [ ] Zero TypeScript errors, zero lint errors, tests passing
- [ ] CloudWatch + browser console clean
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```
prisma/schema.prisma                                          (modify — SeoAgentAction)
prisma/migrations/<ts>_add_seo_agent_action/                  (new)
server/src/services/seo/agentControl.ts                       (new — pause switch)
server/src/services/seo/metadataRewriter.ts                   (new)
server/src/services/seo/__tests__/metadataRewriter.test.ts    (new)
server/src/controllers/seoAdmin.ts                            (modify — 4 new endpoints)
server/src/controllers/__tests__/seoAdmin.test.ts             (modify)
server/src/routes/seoAdmin.ts                                 (modify)
src/pages/admin/SeoInsightsPage.tsx                           (modify — add tab nav, propose/ship buttons)
src/pages/admin/SeoActionsPage.tsx                            (new)
src/pages/admin/__tests__/SeoActionsPage.test.tsx             (new)
src/components/admin/SeoInsightDrawer.tsx                     (modify — propose/ship UI)
src/components/admin/SeoDiffPanel.tsx                         (new)
src/services/api.ts                                           (modify — new endpoints)
src/App.tsx                                                   (modify — actions route)
.claude/rules/backend.md                                      (modify — pause switch param)
```

---

## Blocked — PM decision needed

1. **Confidence threshold (default 0.8).** Calibrate after a few real shipments. **Default OK; revisit in SEOI-7.**
2. **Blast-radius cap (default 3/week).** Could be conservative. **Default OK; revisit after one month of operation.**
3. **Recency rule (default 30 days).** Should this be per-page or per-entity-type? Default plan: per-page. **Default OK unless Wylie wants different.**
4. **Borderline confidence (0.7-0.8) handoff to `/AIBlogDraft`.** SEOI-3 spec says these route via `/AIBlogDraft` with prefilled rationale. Confirm `/AIBlogDraft` accepts a rationale param, or amend its skill spec. **Decision needed before Task 7 ships.**

---

## Tech Lead Review (2026-04-30)

Verification against actual codebase. See `PLAN-SEO-Insights-Pilot.md` "Tech Lead Review" section for cross-cutting findings.

### Critical

- **C1. Test file paths use the wrong convention.** Task 8 references `server/src/services/seo/__tests__/metadataRewriter.test.ts`, `server/src/controllers/__tests__/seoAdmin.test.ts`, `src/pages/admin/__tests__/SeoActionsPage.test.tsx`. **Patch:** `tests/unit/seo/metadataRewriter.test.ts`, `tests/unit/seo/seoAdmin.test.ts`, `tests/unit/pages/admin/SeoActionsPage.test.tsx`.
- **C2. `SeoAgentAction` Prisma relation declarations missing.** Plan defines `snapshotId String?` as a raw FK without a Prisma `@relation`. Existing models declare both (e.g. `BlogPost.author` line 19 + `Author.posts` line 11 of the BlogPost section). **Patch:** add to `SeoAgentAction`:
  ```prisma
  snapshot   GscWeeklySnapshot? @relation(fields: [snapshotId], references: [id])
  ```
  And add the inverse on `GscWeeklySnapshot`:
  ```prisma
  agentActions  SeoAgentAction[]
  ```
  Without these, `prisma.seoAgentAction.findMany({ include: { snapshot: true } })` won't typecheck.

### Moderate

- **M1. `BlogPost.seoTitle` and `BlogPost.seoDescription` already exist** (`prisma/schema.prisma:179-181`, verified). No schema change to BlogPost is needed for the rewrite path. The plan correctly assumes this; just confirming.
- **M2. Admin route mount + `requireAdmin` per-route.** New endpoints in Task 5 (`POST /propose-rewrite`, `POST /ship-rewrite`, `GET /actions`, `POST /rollback`) must follow the per-route pattern (`adminRouter.post('/path', requireAdmin, ctrl)`). Don't apply middleware at mount.
- **M3. `/AIBlogDraft` borderline-confidence handoff.** Task 7's "Send to `/AIBlogDraft` for human review" button needs `/AIBlogDraft` to accept a `rationale` parameter. Verified: `/AIBlogDraft` SKILL.md accepts `topic`, `news_url`, `keyword`, `body` (verbatim mode). It does **not** explicitly take a `rationale` param. **Patch:** when invoking `/AIBlogDraft`, pass the rationale as part of the `topic` string (e.g. `topic: "<keyword>: <rationale>"`) — the skill will preserve it in Phase 1 SERP research context. Or amend `/AIBlogDraft` SKILL.md to accept `rationale`. Pick the cheaper option (the topic-string trick).
- **M4. Pause switch SSM cache.** Task 2 mentions a 60s cache for the SSM read. The existing project pattern resolves SSM at deploy time via `{{resolve:ssm:...}}` in env vars (`infra/template.yaml:228-233`). For a pause switch that flips at runtime, you must use the SSM SDK at request time (which is what the plan does). 60s cache is sensible; just be explicit it's an in-memory Lambda cache that resets on cold start — meaning a "pause" can take up to 60s to propagate after an admin flip.
- **M5. Front-end Diff component.** Task 6's "View Diff" requires a side-by-side diff renderer. Project has none today. Either pick a tiny lib (`react-diff-viewer-continued`, ~10KB) or build a minimal split-pane component. Sub-decision under Task 6.

### Minor

- **Mi1. Sourcemap rule for the new admin pages.** `./scripts/deploy-frontend.sh` already strips sourcemaps and applies `--exclude "*.map"` on every sync (verified). Task 9 references the script — fully compliant.
- **Mi2. Lazy import.** Add `const SeoActionsPage = lazy(() => import('./pages/admin/SeoActionsPage'))` to `src/App.tsx` matching the existing admin lazy-load pattern.
- **Mi3. Metadata-only auto-ship is correctly bounded.** SeoAgentAction's `actionType: 'metadata_rewrite'` and the hard refusal on body changes (Task 4 comment block) preserve the safety promise.

### What's verified correct

- `SeoAgentAction` model fields don't collide with existing models ✓
- Audit log + rollback pattern matches the project's `ModerationLog` precedent (`prisma/schema.prisma:1207`) — that service even has a `moderationLogger.ts` you could glance at for "log every action" semantics ✓
- Pause switch via SSM is idiomatic for this project ✓
- Anthropic SDK already in use; `ANTHROPIC_API_KEY` already in SSM ✓
- The 3-layer slop guard (skill pre-flight + server guardrails + drift detector) is correctly enforced server-side regardless of skill output ✓

### Effort impact

~30-45 min total. The Prisma relation patch (C2) is trivial; the test path rename (C1) is mechanical; the diff component decision (M5) might add 1-2 hours depending on choice.

---

## Slop Findings (AISlopReviewer — 2026-04-30)

This is the highest-stakes sprint in the initiative — first place where the agent writes to prod data. Slop concerns concentrate on the audit log shape and the LLM call pattern.

### P0

(None — every load-bearing safety rule is explicit and gated server-side.)

### P1

(None.)

### P2

- **P2-S1. `SeoAgentAction` audit-log relationship to `ModerationLog` not documented in code.** The project's existing audit-trail pattern is `ModerationLog` (`prisma/schema.prisma:1207`, `server/src/services/moderationLogger.ts`) — polymorphic `targetType`+`targetId`, `automated` flag, `metadata: Json?`, full filter API. SeoAgentAction is a *sibling* table with similar shape but SEO-specific typed columns (`confidence`, `measuredDelta`, `rolledBackAt`). **Sibling table is the right call** — SEO agent actions are conceptually distinct from user-content moderation, and the typed columns are query-cheap. **But the relationship must be explicit** so future devs don't either re-merge them by accident or fork yet a third audit pattern. **Fix:** add a top-of-file comment to `metadataRewriter.ts` AND a `///` Prisma schema comment on `SeoAgentAction` model: "ModerationLog is the precedent for polymorphic audit logs in this codebase. SeoAgentAction is intentionally separate because (1) typed `confidence` and `measuredDelta` columns are needed for SEO-specific queries, (2) lifecycle differs (rollback + measurement). Do not merge with ModerationLog without explicit decision." Category 2 (Inconsistency / drift if undocumented).
- **P2-S2. Test path violation.** Cross-referenced from TLR C1. Category 9.
- **P2-S3. Diff component selection** (TLR M5) — recommend `react-diff-viewer-continued` if going with a library to avoid hand-rolling a diff renderer. Hand-rolled diffs tend to under-deliver (Category 5 — Under-engineering). 10KB lib is justified for an editorial-critical UI. Not slop yet — just a sub-decision.

### P3

(None.)

### Slop Avoided (call out — these are the right calls)

- **Direct `new Anthropic({ apiKey })` use matches existing pattern.** Verified 16+ services in `server/src/services/` use this exact instantiation: `seoContentGenerator.ts`, `newsQuizGenerator.ts`, `articleAnalyzer.ts`, `keyFigures.ts`, `glossary.ts`, etc. `metadataRewriter.ts` correctly follows the codebase's per-service SDK pattern. No over-engineered wrapper introduced. (See `roadmap/slop-ledger.md` row LEDGER-001 for the broader codebase observation about this pattern's lack of unification — not introduced by this plan, just inherited.)
- **Pause switch implementation is correct.** Runtime SSM SDK read with 60s in-memory cache is the right pattern for a hot-flippable kill switch (vs `{{resolve:ssm:...}}` env var which only resolves at deploy). Plan correctly distinguishes this from the static-secret pattern.
- **Server-side guardrails enforce safety regardless of skill output.** `metadataRewriter.shipRewrite()` checks confidence threshold, blast-radius cap, recency rule, and pause switch in code — not in the skill prompt. Defense in depth: the skill can misbehave and the service still refuses to ship. This is the *opposite* of slop (it's belt-and-suspenders engineering).
- **Hard cap "never auto-ships blog post bodies"** is enforced by the service constraint `actionType: 'metadata_rewrite'`. The audit-log type system itself prevents the wrong shipment shape.
- **Composition with `/AIBlogDraft` for borderline-confidence rewrites** preserves the existing publish gate. SEOI-4 doesn't bypass `/AIBlogDraft`'s Phase 5 human approval — it routes there.
- **Composition with `/AISEOReview` (optional) for the 0.7-0.8 borderline confidence band.** Plan correctly delegates the technical-SEO lens rather than reinventing it.
- **Rollback is a one-click operation with full state preservation.** `beforeJson` + `afterJson` columns make rollback deterministic; `rolledBackAt` preserves the audit trail. No "delete and recreate" pattern.
- **No `mcp__claude-in-chrome__*`, no `VITE_*` secrets, no manual AWS console steps.**
- **No backwards-compat shims** — agent ships fresh changes; rolled-back actions are explicitly tagged `rolledBackAt`, not silently reverted.

---

## UX Lead Review (2026-04-30)

This sprint introduces the **propose / ship / rollback flow** — three high-stakes interactions on top of SEOI-2's primitives. UX bar: every agent-shipped change must be inspectable, reversible, and visually confirmable before and after the action. See `PLAN-SEO-Insights-Pilot.md` "UX Lead Review" for cross-cutting findings.

### User-facing impact
Two new admin surfaces: (a) propose/ship buttons inside SEOI-2's detail drawer, (b) `/admin/seo-insights/actions` audit log page with diff view + rollback.

### UX findings

#### 1. Reuse SEOI-2's shared primitives — don't reinvent

- [ ] **`<Tabs>` primitive** (added in SEOI-2): use for the outer Insights / Actions tab nav added at the top of `SeoInsightsPage` (Task 6). Same primitive — no second tab implementation.
- [ ] **`<EmptyState>` primitive** (added in SEOI-2): use for "No actions shipped yet" empty state on the audit log table.
- [ ] **`<Drawer>` primitive** (added in SEOI-2): use for the diff view side panel (Task 6 — "View Diff opens a side panel"). Same drawer pattern as SEOI-2 detail drawer.
- [ ] **`<ConfirmDialog>` from `src/components/ui/ConfirmDialog.tsx`** (already exists, used in 3 admin pages today): use for the rollback confirm modal (Task 6 — "Rollback prompts a confirm modal, then calls the rollback endpoint"). DO NOT roll a new confirm.

#### 2. Diff renderer — hand-roll, don't use a library (revises TLR M5)

TLR M5 suggested `react-diff-viewer-continued`. **UX recommendation: hand-roll instead.**

Reasons: (a) seoTitle is ≤60 chars and seoDescription ≤160 chars — a unified-diff library is overkill for short strings; (b) the lib ships with its own theme that doesn't match Tailwind tokens; (c) hand-rolled is ~50 lines, fully Tailwind-themed, accessible by default.

- [ ] **Implementation pattern**: side-by-side two-column layout with red-tinted "before" (`bg-red-50 dark:bg-red-900/20`) and green-tinted "after" (`bg-green-50 dark:bg-green-900/20`). Optional: word-level highlight of changed tokens using a small diff utility (`diff-match-patch` from npm if needed, ~20KB), but plain side-by-side is sufficient for the vast majority of metadata rewrites.
- [ ] **Accessibility**: each column has a heading ("Before" / "After") visible AND `aria-label`'d. Screen-reader users should understand the comparison without color cues.
- [ ] **Mobile (<`sm`)**: stack the two columns vertically (Before on top, After below) with a clear separator. Don't try to do side-by-side at 375px.

#### 3. Propose / ship / rollback button states (Task 7)

For the `Propose rewrite` → `Ship it` → `Send to /AIBlogDraft` flow, every button needs full state coverage:

- [ ] **`Propose rewrite` button**: idle / hovered / loading (during Anthropic API call, ~3-5s) / disabled (when bucket isn't `winnable_loss` or target isn't a blog post). Loading state shows `<LoadingSkeleton variant="rectangular" />` next to the button OR replaces the button with a "Generating proposal..." indicator.
- [ ] **`Ship it` button** (only visible when confidence ≥0.8): idle / hovered / loading (during write) / success (briefly shows a check before `react-hot-toast` confirms). Use `react-hot-toast` for the success/failure notification, not a static banner.
- [ ] **`Send to /AIBlogDraft for human review` button** (visible when 0.7 ≤ confidence < 0.8): primary visual treatment matching the borderline-confidence framing — slightly muted compared to `Ship it`, but not destructive-looking.
- [ ] **Rollback button** on the audit log: destructive-styled (red border or red text, NOT a red-filled button — keeps it clearly distinct from primary action). Wraps `<ConfirmDialog>` for confirmation.

#### 4. Audit log table responsive

- [ ] **Desktop**: full table with columns `Shipped At · Action Type · Target · Confidence · Status · Buttons`.
- [ ] **Mobile (<`md`)**: same horizontal-scroll-with-sticky-first-column pattern as SEOI-2's table. First sticky column should be `Target` (the entity) so users can identify the row while scrolling actions.
- [ ] **Status filter chips** (All · Shipped · Rolled Back · Measured) wrap to multi-row at narrow widths via `flex-wrap`.

#### 5. State completeness (audit log)

- [ ] **Loading**: `<LoadingSkeleton lines={5}>` matching row height.
- [ ] **Empty**: `<EmptyState>` with copy "No agent actions shipped yet" + secondary text "When the SEO agent ships a metadata rewrite, you'll see it here with a diff view and rollback button."
- [ ] **Error**: `<ErrorState onRetry={refetch}>`.
- [ ] **Degraded**: handle a SeoAgentAction whose target entity has been deleted (orphan record) — show "Target deleted" instead of crashing.

#### 6. Confidence + Status visual treatment

Both confidence and status are color-sensitive — ensure non-color alternatives:

- [ ] **Confidence column**: render as `0.87` numeric + a small icon indicating tier (e.g. ✓ for ≥0.8, ⚠ for 0.7-0.8, ✗ for <0.7). Don't rely on color alone.
- [ ] **Status chip**: text label always visible (`Shipped`, `Rolled Back`, `Measured`). Color is supplementary, not primary signal.

#### 7. Dark mode decision (cross-ref UX-X1)

- [ ] **Match `AdminLayout` styling — single-theme (light)** for the actions page chrome and table. The new shared `ui/` primitives (Drawer, ConfirmDialog reuse) ship with dark-mode coverage from SEOI-2; the page itself doesn't need dark variants until admin dark mode is backfilled separately.

#### 8. Information architecture

- [ ] **No new sidebar nav entry** — actions page lives at `/admin/seo-insights/actions`, reached via the outer Insights/Actions/Proposals tab nav added in Task 6. Correct sub-page IA.
- [ ] **Breadcrumb**: `Admin → SEO Insights → Actions`. Verify `getBreadcrumbs()` in AdminLayout handles the sub-route.

### Definition of Done additions

- [ ] Diff view renders correctly for short (5-char) and long (155-char) metadata strings, both at desktop and mobile viewports
- [ ] Rollback flow uses `<ConfirmDialog>` (no custom confirm)
- [ ] All button states (idle / hover / loading / disabled / success) verified
- [ ] `react-hot-toast` used for every success/failure notification (no static banners)
- [ ] Responsive verified at 375px / 768px / 1280px
- [ ] Lighthouse Accessibility ≥95 on the actions page
- [ ] Keyboard reach: full propose → ship → rollback flow exercisable without a mouse

### What's correct already

- Reuse of SEOI-2's tab nav for the outer Insights/Actions/Proposals navigation — correct IA, not a parallel nav surface.
- Confidence threshold UI that distinguishes ≥0.8 (Ship it) from 0.7-0.8 (handoff to /AIBlogDraft) — clear UX signal that the system is being honest about its certainty.
- Detail drawer for the proposal preview before shipping — correct progressive-disclosure pattern (don't ship without preview).
