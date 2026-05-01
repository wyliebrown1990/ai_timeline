# Sprint SEOI-5: Scheduled Agent + Feedback Loop

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-30 by Codex (feedback loop + live automation prompt updated for proposal-row creation)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-SEO-Insights-Pilot.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm SEOI-1, SEOI-2, SEOI-3, SEOI-4 DoDs are fully checked. If not, finish them first.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Replace manual triggering with a scheduled agent that runs every Monday morning. It reads the prior week's freshly-ingested GSC data + classified buckets, runs `/SEOAuditAgent` in `digest` mode, ships qualifying auto-ship actions, and persists a dashboard-first run summary of everything actioned + everything proposed for human review. The feedback loop measures the **prior** week's shipped actions (CTR before vs after) and appends one entry per action to `seo_voice.md` — keep what worked, document what didn't.

This sprint is where the system stops being a tool and becomes a routine.

**Priority**: HIGH (operational cadence)
**Depends on**: SEOI-1 through SEOI-4
**Estimated Effort**: 2 days
**Status**: Not started

---

## Prerequisites

- [ ] SEOI-1 through SEOI-4 DoDs fully checked
- [ ] At least one auto-shipped action exists from SEOI-4 so the feedback loop has something to measure
- [ ] Local dev server running

---

## Tasks

### 1. Schedule the agent (Claude Code `/schedule`)

- [x] Use the `/schedule` skill to create a remote agent on cron `0 13 * * 1` (every Monday 13:00 UTC, comfortably after the GSC weekly cron from SEOI-1 which fires at 06:00 UTC).
- [x] Agent prompt template (lives in the schedule definition; iterate on this for several runs before considering it final):
  ```
  Run the /SEOAuditAgent skill in digest mode for the most recent finalized 7-day GSC window.

  Steps:
  1. Read .claude/skills/SEOAuditAgent/SKILL.md and seo_voice.md.
  2. Run the feedback loop: pull all pending measurements via
     /api/admin/seo/feedback/pending, then POST /api/admin/seo/actions/:id/measure
     for each eligible action. Measurement must use finalized PT reporting days
     only. Append a seo_voice.md entry per action. If any auto-shipped action's
     after-CTR is worse than before by ≥20%, propose rollback to a human
     (do NOT auto-rollback).
  3. Pull this week's findings via /api/admin/seo/insights. Up to 50 per bucket.
  4. For each finding, classify into auto_ship / propose / human_only per skill.
  5. For auto_ship: hit /api/admin/seo/insights/:id/ship-rewrite. Respect the
     ≤3/week cap; if cap hit, downgrade remaining to propose.
  6. For propose: when the agent is active, the bucket is `content_gap` or
     `trend_signal`, and confidence is ≥0.60, call
     `/api/admin/seo/insights/:id/generate-proposal`. If the endpoint returns
     `409`, treat that as "already queued recently" and keep going.
  7. For human_only: include in the digest with the "why this needs you" note.
  8. Compose a digest message (markdown, ≤4000 chars) covering:
     - Last week's shipped actions + measured deltas
     - This week's auto-shipped actions
     - This week's proposals queued
     - This week's human-only items
  9. Do not rely on Discord or email for MVP delivery. Treat persisted run
     status plus the admin surfaces (`/admin/seo-insights`, `/actions`,
     `/proposals`) as the operator interface for the weekly run.
  10. Append to seo_voice.md: one entry per action (shipped or rejected) with
      the same template the file uses today.
  ```
- [x] Save the schedule definition somewhere referenceable (`.claude/schedules/seo-weekly.md` or wherever `/schedule` persists definitions — verify how the skill stores them and add it to git if not already).

### 2. Feedback loop endpoint

- [x] Add `POST /api/admin/seo/actions/:id/measure` to `server/src/controllers/seoAdmin.ts`:
  - Loads the `SeoAgentAction`
  - Computes 7-day-before vs 7-day-after metrics for the target page from `GscDailyMetric`
  - Uses **finalized PT reporting days only**. The "after" window is measurable only once all 7 post-ship PT days are finalized; never compare incomplete days.
  - Persists `clicksBefore, clicksAfter, impressionsBefore, impressionsAfter, ctrBefore, ctrAfter, avgPositionBefore, avgPositionAfter` into `SeoAgentAction.measuredDelta` and sets `measuredAt`
  - Returns the stored delta
- [x] Add `GET /api/admin/seo/feedback/pending` — returns all `SeoAgentAction` rows whose 7-day after-window is now fully finalized, `measuredAt IS NULL`, and which are eligible to be measured this week.

### 3. Dashboard-first digest visibility

- [ ] In the agent's digest step (Task 1, step 8-9), the agent treats `PUT /api/admin/seo/run-status` as the MVP delivery mechanism. The admin pages are the operator surface; no external notification sink is required.
- [ ] Keep the digest format reference below as the operator summary shape. It may later be rendered in a richer admin surface or sent to an optional external channel, but neither is required for SEOI-5.
- [ ] Digest format reference (the agent fills this in):
  ```
  # SEO Weekly Digest — week of YYYY-MM-DD

  ## Last week's measurements (N actions reviewed)
  - <action> on <target>: CTR went +X.X pp / impressions +N% — keeping
  - <action> on <target>: CTR went -X.X pp / impressions -N% — proposing rollback @human

  ## This week's shipped (N auto-ship)
  - <bucket> on <target>: <one-line rationale> [confidence 0.XX]

  ## Proposals queued (N — review at /admin/seo-insights/proposals)
  - <bucket> on <target>: <one-line angle>

  ## Human-only (N — needs decision)
  - <reason>: <one-paragraph context>

  Digest produced by /SEOAuditAgent — visible via `/admin/seo-insights` run status and pauseable anytime via SSM /ai-timeline/prod/seo-agent-paused.
  ```

### 4. Voice file appender

- [ ] In `/SEOAuditAgent` skill (already exists from SEOI-3), document the exact append protocol the scheduled agent uses each Monday — one block per action per week, dated. Mirror `blog_voice.md` format.
- [ ] After Task 1 schedule fires once successfully and produces a real entry, capture the entry shape in `dry-run-2026-04-30.md` (or new dry-run doc) so future devs can see what good output looks like.

### 5. Operational dashboard tile

- [x] Add to `src/pages/admin/SeoInsightsPage.tsx` a top banner showing:
  - Last digest run timestamp
  - Last digest's auto-ship count + proposal count
  - Pause switch toggle (admin can flip the SSM param via a PUT endpoint added below)
  - Optional link to a persisted digest artifact if one exists later; not required for MVP
- [x] Add `PUT /api/admin/seo/pause` (admin only) to flip the SSM param. Body: `{ paused: boolean }`. Returns the new state.

### 6. Failure modes

- [ ] If the schedule fires but `/SEOAuditAgent` errors out (e.g., GSC data missing, voice file unreadable, Anthropic API throttled): the agent must still persist a failed run status with `errorMessage` so the banner shows "agent run failed: <reason>". Silent failures are unacceptable for an autonomous system.
- [ ] If the agent runs but the GSC weekly cron failed earlier in the day: digest is empty + flags the upstream failure. Agent does NOT auto-ship anything when the data window is incomplete.

### 7. Tests

- [x] Unit tests for the feedback endpoint in `tests/unit/seoAdmin.test.ts`:
  - Action shipped 8 days ago, never measured → returned by `/feedback/pending`
  - Action shipped 5 days ago → not yet measured-eligible
  - Action already measured → not returned
  - CTR-delta math correct against fixture data
- [x] Unit tests for the pause endpoint
- [ ] Manual integration test: trigger one schedule run early via `/schedule run-now`, verify run status updates, verify voice file appended, verify any auto-shipped action audit-logged
- [x] `npm test -- seo` — all pass
- [x] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors

### 8. Deploy

- [x] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [x] Frontend: `./scripts/deploy-frontend.sh`
- [x] Confirm the `/schedule` cron is registered:
      `(via the /schedule skill's list command — verify exact incantation)`
- [ ] Set the schedule's first fire to be early-Monday-morning of the week post-deploy

### 9. Backend Validation

- [ ] Force one early run:
      `(via the /schedule skill's run-now command — verify exact incantation)`
- [ ] Verify the run status record is updated and visible from `GET /api/admin/seo/health`
- [ ] Verify any auto-shipped action exists in `/api/admin/seo/actions`
- [ ] Verify `seo_voice.md` has a new dated entry
- [ ] Verify the feedback measurements ran for actions shipped 7-14 days ago
- [x] Test the pause switch via UI: flip to paused, force a run, expect no auto-ship — only digest. Flip back to active.
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 1h` — zero errors

### 10. Browser Validation (via `/Browser` skill only)

- [x] `agent-browser open https://letaiexplainai.com/admin/seo-insights`
- [ ] Verify the operational banner renders with last-run timestamp + counts
- [x] Click pause toggle → confirm state change persists across reload
- [ ] If a digest artifact link is implemented later, click it and confirm it opens correctly; otherwise verify the banner still communicates run state without it
- [x] Mobile viewport: `agent-browser set viewport 375 812 && agent-browser screenshot`
- [x] Zero console errors, zero 4xx/5xx

---

## Definition of Done

- [ ] All tasks above checked
- [ ] `/schedule` cron is registered and has fired at least one full successful run end-to-end
- [ ] Run summary persisted for that run and visible in `/admin/seo-insights`
- [ ] Feedback loop has measured at least one prior-week action
- [ ] `seo_voice.md` has at least one new dated entry from a real run
- [ ] Pause switch verified live (toggle on → no auto-ship; toggle off → auto-ship resumes)
- [ ] Failure-mode handling tested at least once (force a transient error, confirm the banner surfaces the failed run)
- [ ] Zero TypeScript errors, zero lint errors, tests passing
- [ ] CloudWatch + browser console clean
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```
.claude/schedules/seo-weekly.md                            (new — schedule definition)
.claude/skills/SEOAuditAgent/seo_voice.md                  (modify — first real entry appended)
server/src/services/seo/feedbackMeasurement.ts             (new)
tests/unit/feedbackMeasurement.test.ts                     (new)
server/src/services/seo/agentControl.ts                    (modify — setPaused helper)
server/src/controllers/seoAdmin.ts                         (modify — feedback + pause endpoints)
tests/unit/seoAdmin.test.ts                                (modify)
server/src/routes/seoAdmin.ts                              (modify)
src/pages/admin/SeoInsightsPage.tsx                        (modify — operational banner)
src/services/api.ts                                        (modify)
.claude/rules/backend.md                                   (modify — schedule cadence + pause)
```

---

## Blocked — PM decision needed

1. **Schedule timing.** Default plan: Monday 13:00 UTC (after the 06:00 UTC GSC pull, comfortably so). Alternative: Tuesday or Wednesday so the week's data is more settled. **Default OK unless Wylie wants different.**
2. **Failure-mode rollback policy.** Default plan: agent surfaces "propose rollback @human" for actions where after-CTR is ≥20% worse than before-CTR. Alternative: agent auto-rolls-back below some hard threshold (e.g., -50% CTR). **Default conservative; revisit if rollback queue grows.**
3. **Voice file growth budget.** No upper bound on `seo_voice.md` size. Eventually we'll prune. Not blocking yet. **Flag for SEOI-7 polish.**
4. **Optional notification sink.** Current MVP is dashboard-first. If Wylie later wants email/chat delivery, scope it as a post-MVP enhancement rather than a prerequisite for weekly runs.

---

## Tech Lead Review (2026-04-30)

Verification against actual codebase. See `PLAN-SEO-Insights-Pilot.md` "Tech Lead Review" section for cross-cutting findings.

### Critical

- **C1. External notification sink is no longer part of the MVP.** Task 1 step 9 now correctly treats persisted run status plus the admin pages as the operator surface. Any future chat/email sink should be scoped as a follow-on, not a prerequisite for weekly runs.
- **C2. Test file paths use the wrong convention.** Task 7 references `server/src/services/seo/__tests__/feedbackMeasurement.test.ts` and `server/src/controllers/__tests__/seoAdmin.test.ts`. **Patch:** `tests/unit/seo/feedbackMeasurement.test.ts`, `tests/unit/seo/seoAdmin.test.ts`.
- **C3. `/schedule` skill availability.** Verified the skill is referenced in this session's available-skills list (system-reminder), but it does NOT exist at `~/.claude/skills/schedule/` on disk — it's plugin- or runtime-loaded. Plan Task 1 commits a `.claude/schedules/seo-weekly.md` file in the repo. **The /schedule skill's actual storage path for schedule definitions is not yet verified.** Before implementing, confirm via the skill's documentation: does `/schedule` persist definitions in the repo, in `~/.claude/`, or in a remote cloud location? If remote, the `.claude/schedules/seo-weekly.md` is documentation-only, not the source of truth. **Patch Task 1:** add a sub-task to verify `/schedule` skill's persistence model before committing the schedule-definition file path.

### Moderate

- **M1. Admin route mount + `requireAdmin` per-route.** `/api/admin/seo/feedback`, `/feedback/pending`, `/pause` (Tasks 2, 5) must use the per-route pattern (`adminRouter.METHOD('/path', requireAdmin, ctrl)`) — see `server/src/routes/glossary.ts:69-86` for canonical.
- **M2. Failure-mode digest fallback.** Task 6's "agent must still persist a failed run status" requires the agent's failure path to capture exceptions and write failure metadata anyway. This is hard to enforce purely in markdown. Recommendation: add a post-script wrapper at the OS/agent layer that catches non-zero exits and persists a fallback failed status if the inner agent aborts early.
- **M3. Voice file appender concurrency.** Task 4 has the agent append to `seo_voice.md`. The blog_voice.md pattern is single-writer (only `/AIBlogDraft` appends). Now both `/AIBlogDraft` (after blog publish, per its Phase 5.5) AND `/SEOAuditAgent` (after each weekly run) will append to *different* voice files (`blog_voice.md` and `seo_voice.md` respectively). No concurrency issue — flagging only because the plan's Task 7 in SEOI-6 says voice files "grow together — no double-write". Verify the boundary holds: `/AIBlogDraft` writes only to `blog_voice.md`, `/SEOAuditAgent` writes only to `seo_voice.md`.

### Minor

- **Mi1. EventBridge cron `cron(0 13 * * 1)`.** Task 1 uses 5-field cron syntax. Verify `/schedule` skill's cron format (it may use 5-field standard cron, 6-field EventBridge, or 7-field Quartz). The system reminder description says "cron schedule" without specifying. Confirm before scheduling.
- **Mi2. Operational dashboard tile (Task 5).** Adding to `SeoInsightsPage` is the right surface; just remember the SeoInsightsPage from SEOI-2 already has the 4-bucket tabs — the operational banner sits above them.
- **Mi3. SSM-backed pause switch already exists from SEOI-4.** Task 5 adds a UI toggle. The endpoint `PUT /api/admin/seo/pause` flips the SSM param. Cache TTL (60s, SEOI-4) means UI feedback may lag slightly — acceptable.

### What's verified correct

- Weekly cadence after the GSC ingestion run finishes ✓
- Dashboard-first operator surface via `/admin/seo-insights` + persisted run status ✓
- Feedback loop window (7-14 day measurement after ship) is the standard SEO-measurement convention ✓
- Failure mode visibility (no silent fails) is correctly prioritized ✓
- voice file append discipline matches the existing pattern ✓

### Effort impact

~45-60 min including the `/schedule` skill verification (which is mostly reading the skill's docs). No DoD changes.

---

## Slop Findings (AISlopReviewer — 2026-04-30)

### P0

- **P0-S1. External-delivery requirement was over-specified.** Cross-referenced from TLR C1. Treating Discord as required for MVP created an unnecessary integration dependency on the critical path. The corrected plan keeps the weekly run self-contained: run status, admin surfaces, and voice-file append are sufficient for operator visibility.

### P1

(None — assuming P0-S1 is resolved.)

### P2

- **P2-S1. Test path violation.** Cross-referenced from TLR C2. Category 9.
- **P2-S2. `feedbackMeasurement.ts` is net-new — confirm no overlap with future SEO services.** Verified no existing service does GSC delta math. **NOT slop**, but the plan should add a top-of-file comment in `feedbackMeasurement.ts` calling out "first dedicated SEO measurement service in this codebase; future before/after metric measurement should extend this rather than fork" so a future sprint doesn't reinvent it. Category 1.1 (Parallel helpers — pre-emptive prevention).
- **P2-S3. Failure-mode wrapper for the digest** (TLR M2). Without an outer try/catch + failed-run-status fallback, the agent can fail silently mid-run on a non-zero exception. Slop framing: Category 8.5 (Silent failures). Plan correctly flags this as a sub-task; just emphasizing the priority.

### P3

(None.)

### Slop Avoided

- **Voice file appender uses single-writer pattern per file.** `/AIBlogDraft` writes only to `blog_voice.md`; `/SEOAuditAgent` writes only to `seo_voice.md`. No concurrency issue. No shared mutable state between skills. Category 14 (Concurrency / data correctness) avoided.
- **Pause switch is the killswitch — flipping SSM `seo-agent-paused=true` halts auto-ship within 60s** (cache TTL from SEOI-4). One source of truth, no UI/cache divergence beyond the documented bound.
- **Schedule definition committed (`/schedule` storage path TBD per TLR C3)** — keeps the cron source under version control. No "manual one-time `/schedule` invocation" approach (which would be unauditable).
- **Feedback loop measures the *prior* week's actions, not the same week** — gives ≥7 days for CTR signal to settle. Sound timing window for SEO measurement; not a hand-wave.
- **Failure-mode digest fallback** (Task 6) explicitly required so silent failures aren't possible. Plan correctly anticipates the Category 8.5 risk.
- **No external delivery channel required for MVP** — removes the "default channel" slop where the agent would otherwise post to the wrong place by assumption.
- **No `mcp__claude-in-chrome__*`, no `VITE_*` secrets, no manual AWS console steps.**
- **No backwards-compat shims.**

---

## UX Lead Review (2026-04-30)

This sprint adds the **operational dashboard banner** + pause toggle on `/admin/seo-insights`. It's a thin UI sprint by line-count but high-stakes by operational impact — the pause toggle is the killswitch for the auto-ship lane. See `PLAN-SEO-Insights-Pilot.md` "UX Lead Review" for cross-cutting findings.

### User-facing impact
A new operational status banner above the bucket tabs on `/admin/seo-insights`, showing last digest run + counts + a prominent pause toggle.

### UX findings

#### 1. Operational banner information density (Task 5)

The banner stacks above the existing 4-tab nav. Current spec lists: last run timestamp, last digest's auto-ship + proposal count, pause toggle, and optionally a digest artifact link if one is later persisted. **At desktop width that's manageable, but at mobile it gets crowded.**

- [ ] **Desktop (≥`md`)**: single horizontal row — `Last run: 2 hours ago · 2 shipped · 5 proposals queued · [⏸ Pause toggle] · [↗ View digest]`. Use `flex items-center justify-between gap-4`.
- [ ] **Mobile (<`md`)**: stack vertically — pause toggle + status pills wrap, link to digest goes on its own row. Don't squeeze 5 items into a 375px width.
- [ ] **Status pills use `<SubjectBadge>` styling pattern** (`rounded-full` chips) for consistency with existing admin-page chip patterns. Reuse colors: blue for "shipped", amber for "queued".

#### 2. Pause toggle UX — this is the killswitch

This is the most important interactive element added in the sprint. Get it right.

- [ ] **Visual treatment when active (running)**: green dot + label `Active` + a small `Pause` icon button. Matches the "things are fine" mental model.
- [ ] **Visual treatment when paused**: red border + label `Paused` + warning icon + a `Resume` button. Should look distinctly *abnormal* — the user should know at a glance that auto-ship is off. SEOI-7 will further escalate this with drift-detector severity tying into the same banner.
- [ ] **Confirmation on toggle**: pause action should NOT require confirmation (lowering risk is fast); resume action SHOULD use `<ConfirmDialog>` (raising risk → "Are you sure you want to resume auto-ship? Last paused 2 days ago because of [reason]."). Pattern: friction-down for safer actions, friction-up for riskier actions.
- [ ] **Toast confirmation** (`react-hot-toast`): "Auto-ship paused" / "Auto-ship resumed" with a 3-second auto-dismiss.
- [ ] **Accessibility**: button is icon + text label (not icon-only). `aria-pressed={paused}`. Tab-reachable. Color is NOT the only signal — text label always visible.

#### 3. Killswitch is correctly scoped to the SEO insights page (cross-ref UX-X4)

- [ ] **No global killswitch in AdminLayout sidebar** — correct IA. The pause is operationally bound to the SEO insights surface; users go there to monitor and flip it. Don't over-promote to global chrome.

#### 4. Last-digest link UX

- [ ] **Digest artifact URL** if one is later persisted — open in new tab (`target="_blank" rel="noopener"`). If no artifact URL exists, fall back to the latest digest's persisted text rendered inline in a drawer (use the `<Drawer>` primitive from SEOI-2). Decide which approach in Task 1 step 9.

#### 5. State completeness for the operational banner

- [ ] **First-run state (before any digest has fired)**: banner shows "First digest will arrive {next Monday 13:00 UTC}" + pause toggle in disabled state with tooltip "Schedule has not yet run". Don't show stale "0 shipped, 0 queued" implying an empty result — it's a not-yet state, not a clean state.
- [ ] **Digest-failed state**: if the last scheduled run failed, banner shows red severity with "Last run failed: {reason}" + a "Retry" button (manually triggers the agent). Critical: silent failures are unacceptable per Task 6's spec.
- [ ] **Stale state (>7 days since last successful run)**: banner shows yellow warning "Last successful digest was 9 days ago" — schedule may be broken, prompt user to investigate.

#### 6. Dark mode decision (cross-ref UX-X1)

- [ ] **Banner content area: light theme matching AdminLayout convention.** Pause-toggle visual treatments (green active / red paused) use light-mode-appropriate Tailwind classes: `bg-green-50 border-green-200 text-green-700` (active), `bg-red-50 border-red-300 text-red-800` (paused). The `<ConfirmDialog>` primitive used for resume confirmation is dark-mode-ready from `ui/`.

#### 7. Schedule definition file UX (`/schedule` integration, Task 1)

This isn't a user-visible UI, but the operational ergonomics matter:

- [ ] **Schedule definition file** (TBD path per TLR C3) is committed under version control — good. Future devs can see the agent prompt evolution via git log.
- [ ] **Manual run-now affordance**: provide a button on the operational banner to force-fire the schedule (admin only). Useful for debugging and recovery from a missed run. Use the same MCP `/schedule` tooling.

### Definition of Done additions

- [ ] Operational banner renders correctly in light theme at 375px / 768px / 1280px
- [ ] Pause toggle keyboard-reachable (Tab + Enter activates), `aria-pressed` correctly reflects state
- [ ] Resume action gated by `<ConfirmDialog>`; pause action is one-click
- [ ] First-run / digest-failed / stale states all designed (not blank/zero defaults)
- [ ] `react-hot-toast` used for pause/resume feedback
- [ ] Lighthouse Accessibility ≥95 with banner + tabs + table all on the page

### What's correct already

- Banner placement above tabs on `/admin/seo-insights` — correct surface (admins go there to monitor SEO actions, killswitch lives there).
- Dashboard-first operator surface avoids UX-by-default-channel slop.
- Optional external notification sinks are explicitly post-MVP.
