# Sprint SEOI-7: Polish, Drift Detection, Initiative DoD

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-30 by Wylie (sprint created — no tasks started)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `frontend.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-SEO-Insights-Pilot.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm SEOI-1 through SEOI-6 DoDs are fully checked AND the system has been running autonomously for ≥2 consecutive weekly cycles. If not, finish them first / wait for cycles to run.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

The system has been running for ≥2 weeks. This sprint reads the actual operating data and tightens the slop-prevention layer based on real evidence. Builds a drift detector that watches recent auto-shipped changes for slop patterns, calibrates the confidence threshold and blast-radius cap from observed data, expands auto-ship eligibility to additional entity types if drift is clean, and ships the documentation pass that closes the initiative DoD.

This is the sprint that decides whether the system is trusted to run unsupervised long-term or whether it stays in the supervised lane.

**Priority**: HIGH (closes initiative)
**Depends on**: SEOI-1 through SEOI-6 + ≥2 weeks of live operation
**Estimated Effort**: 1-2 days
**Status**: Not started

---

## Prerequisites

- [ ] SEOI-1 through SEOI-6 DoDs fully checked
- [ ] System has run autonomously for ≥2 weekly cycles (i.e., ≥2 run-status updates visible in `/admin/seo-insights`, ≥2 voice file entries appended, ≥2 prior-week measurement passes completed)
- [ ] At least 5 SeoAgentActions exist with measured deltas
- [ ] At least 1 SeoProposal has flowed through to a published blog post
- [ ] Local dev server running

---

## Tasks

### 1. Read the operating data

Spend the first half of Day 1 reading what the system actually did, not building anything yet.

- [ ] Pull all SeoAgentActions from the operating window:
  ```bash
  curl -sS "https://letaiexplainai.com/api/admin/seo/actions?limit=100" \
    -H "Authorization: Bearer $TOKEN" > /tmp/seoi7-actions.json
  ```
- [ ] For each action: was the after-CTR better than before? Was the rationale sane in retrospect? Did Wylie roll any back? Did the `seo_voice.md` entry capture the right learning?
- [ ] Pull all SeoProposals; review which were approved, which were rejected, why.
- [ ] Read every `seo_voice.md` entry produced during the operating window. Note repeated patterns — these are the calibration signals.
- [ ] **Operating-window SEO quality audit**: invoke `/AISEOReview` on a stratified sample of 5 shipped rewrites — ideally 1 from each week of operation, plus 1 high-confidence + 1 borderline-confidence. For each, ask: "Looking at the after-CTR delta and the post-shipment metadata, did the rewrite actually improve SEO outcomes per the technical-SEO bar (keyword placement, length, click-through value)? Or did it improve CTR for the wrong reason (e.g. clickbait drift)?" This is the **outcome-vs-process check** — the agent might be shipping rewrites that improve CTR while drifting from voice or stuffing keywords. Drift detector (Task 2) catches *process* drift; `/AISEOReview` catches *outcome* drift. Capture rejections in the operating-review doc.
- [ ] **Brief-generator quality audit**: invoke `/AISEOReview` on 3 SeoProposals that shipped to publish (status='shipped' — i.e., the brief became a real blog post via `/AIBlogDraft`). Ask: "Did the eventual published post deliver on the brief's thesis? Did it rank for the target keyword within 30 days? Or did the brief misjudge winnability / depth?" Output informs whether SEOI-6's brief-generator confidence threshold should be raised.
- [ ] Capture findings + `/AISEOReview` notes in a one-time `roadmap/notes/seoi-7-operating-review.md` file. This is the input to every later task in this sprint.

### 2. Drift detector service

The detector watches for slop patterns *after* an action ships, on a continuous basis — independent of the `slop_categories.md` pre-flight which runs *before* ship.

- [ ] Create `server/src/services/seo/driftDetector.ts`:
  - `scanRecentActions(windowDays = 14)` — pulls all SeoAgentActions in the window, runs each through these tripwires:
    - **Repetition tripwire**: ≥3 actions in the window using near-identical phrasing (cosine similarity ≥ 0.9 on rewrite text)
    - **Voice-distance tripwire**: an action's rewrite text deviates from the `seo_voice.md` baseline by more than the historical variance (compute via simple n-gram overlap or embedding distance — whichever the existing services have already)
    - **Reverse-correlation tripwire**: ≥2 actions where after-CTR is worse than before-CTR by ≥20% within the same week (suggests a systemic mistake the agent kept making)
    - **Confidence-vs-outcome tripwire**: confidence ≥0.85 actions whose measured delta is materially worse than confidence <0.85 actions (calibration is broken)
  - Returns `{ tripwiresHit: [...], severity: 'green'|'yellow'|'red' }`
- [ ] Add to the agent's weekly digest (SEOI-5 prompt update): drift detector runs first thing; if `severity='red'`, agent automatically flips the pause switch and records the red-severity failure in persisted run status so the admin banner makes the stop condition obvious.

### 3. Calibrate thresholds

- [ ] Based on Task 1 review: are the SEOI-4 defaults right?
  - **Confidence threshold (default 0.8)**: if ≥80% of shipped actions are kept (not rolled back), threshold is calibrated. If many rolled back, raise to 0.85. If too few ship, lower to 0.75.
  - **Blast-radius cap (default 3/week)**: if 3/week is consistently hit AND drift is clean, raise to 5. If drift shows yellow, hold at 3.
  - **Recency rule (default 30 days)**: if any page got two near-identical rewrites within the rule's window (it shouldn't have, but verify), tighten.
- [ ] Update the constants in `metadataRewriter.ts` and document the calibration evidence in `seo_voice.md` (so the next person doesn't undo this without seeing why).

### 4. Expand auto-ship eligibility (conditional)

- [ ] **Only if drift detector reports green for ≥2 consecutive weeks**, expand the `auto_ship` lane to:
  - `glossary_term` seoTitle/seoDescription rewrites (lower volume, higher impact)
  - `milestone` seoTitle/seoDescription rewrites
- [ ] **Do NOT expand to**:
  - `person` bios — voice-sensitive editorial; stays human-only
  - `organization` profiles — stays human-only
  - `BlogPost.bodyMarkdown` — never auto-ships, period
- [ ] Update `bucket_playbooks/winnable-losses.md` to reflect the expanded eligibility list. Annotate with "expanded 2026-MM-DD after green drift for ≥2 weeks" so future devs see the evidence trail.

### 5. Operational dashboard polish

- [ ] On `/admin/seo-insights`, add a "Drift detector" tile in the operational banner: shows current severity, last scan timestamp, list of any tripped tripwires.
- [ ] Add a "Calibration history" sub-page at `/admin/seo-insights/calibration` showing the threshold evolution over time (line chart: confidence threshold, blast cap; date axis).
- [ ] Make the pause toggle more prominent — it's the killswitch, treat it like one.

### 6. Markdown linter (deferred from SEOI-3)

- [ ] Add `markdownlint-cli2` to `devDependencies`:
      `npm install --save-dev markdownlint-cli2`
- [ ] Configure `.markdownlint.json` with sensible defaults (line-length off; HTML on; no-trailing-spaces on)
- [ ] Add an npm script: `"lint:md": "markdownlint-cli2 '.claude/skills/**/*.md' 'roadmap/**/*.md'"`
- [ ] Wire into CI if the project has a CI pipeline; otherwise document in CLAUDE.md as a local-run gate before commits to skill files
- [ ] Run once and fix any actual issues in existing skill files

### 7. Documentation pass

- [ ] Create `.claude/rules/seo-pipeline.md` with:
  - System overview (3 layers: data, skill, automation)
  - Operating cadence (weekly cron, schedule, dashboard-first run status)
  - Pause switch usage
  - Rollback procedure (button vs SQL fallback)
  - Drift detector severity meanings
  - Calibration history (link to dashboard)
  - When NOT to auto-ship (the entity-type allowlist)
  - Composition with `/AIBlogDraft`, `/AISEOReview`, `/AITechLeadReview`, `/AIUXLeadReview`
  - On-call runbook: what to check first if weekly run status stops updating, if drift goes red, if a customer complains about a metadata change
- [ ] Update `.claude/CLAUDE.md` to reference the new rule file
- [ ] Update the project README (if one exists at the repo root) with a one-line mention of the SEO pilot

### 8. Voice file pruning policy

- [ ] `seo_voice.md` will grow indefinitely. Add a pruning policy in the file's header:
  - Rule: never delete entries; archive entries older than 90 days into `seo_voice_archive_<year>.md` if the live file exceeds 200 entries
  - Manual archive task — not automated. Document the procedure in `seo-pipeline.md`.
- [ ] No code change needed this sprint; just document.

### 9. Initiative DoD verification

Run through the PLAN's initiative-level DoD line by line:

- [ ] All sprint DoDs checked (verify each in `/roadmap/Sprint-SEOI-*`)
- [ ] `/admin/seo-insights` live with 4 buckets and ≥4 weeks data — verify
- [ ] At least one auto-shipped metadata rewrite measured and kept (or rolled back with reason) — verify
- [ ] At least one content-gap proposal published via `/AIBlogDraft` and tracked to live URL — verify
- [ ] Weekly cron has run for ≥4 consecutive weeks without manual intervention — verify
- [ ] `seo_voice.md` has ≥4 dated entries — verify
- [ ] Drift detector clean across all auto-shipped changes — verify
- [ ] `.claude/rules/seo-pipeline.md` exists and is referenced from CLAUDE.md — verify
- [ ] Lighthouse on `/admin/seo-insights` ≥90 perf, ≥95 a11y — verify
- [ ] CloudWatch clean across the ingestion Lambda's runs — verify

If any line fails, do NOT close the initiative. Open a punch-list under "Blocked — PM decision needed" and finish them before declaring done.

### 10. Tests

- [ ] Unit tests for `driftDetector.ts` in `server/src/services/seo/__tests__/driftDetector.test.ts` — fixtures for each tripwire condition
- [ ] Verify no existing tests broke after threshold calibration
- [ ] `npm test` (full suite) — all pass
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run lint:md` (if markdown linter wired) — zero errors

### 11. Deploy

- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [ ] Frontend: `./scripts/deploy-frontend.sh`
- [ ] Update the scheduled agent prompt with the drift-detector pre-step

### 12. Backend Validation

- [ ] Hit drift detector manually:
  ```bash
  curl -sS "https://letaiexplainai.com/api/admin/seo/drift-status" \
    -H "Authorization: Bearer $TOKEN"
  ```
  Confirm severity is computed and tripwires array is populated as expected.
- [ ] Trigger a forced drift event in staging (or with a test fixture) to confirm the auto-pause behavior works
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 30m` — zero errors

### 13. Browser Validation (via `/Browser` skill only)

- [ ] `agent-browser open https://letaiexplainai.com/admin/seo-insights`
- [ ] Verify drift tile renders with current severity + tripwire list
- [ ] Click pause toggle, confirm visual treatment is killswitch-grade (red, prominent)
- [ ] Navigate to `/admin/seo-insights/calibration` → verify chart renders
- [ ] Mobile viewport check on all 3 admin pages: `agent-browser resize 375 812 && agent-browser screenshot`
- [ ] Zero console errors, zero 4xx/5xx
- [ ] Lighthouse on each admin page ≥90 perf, ≥95 a11y

---

## Definition of Done

- [ ] All tasks above checked
- [ ] All initiative-level DoD items verified live (Task 9)
- [ ] Drift detector running, severity = green at sprint close
- [ ] Threshold calibration committed with evidence in `seo_voice.md`
- [ ] `/admin/seo-insights/calibration` page live
- [ ] `.claude/rules/seo-pipeline.md` written and linked from CLAUDE.md
- [ ] Markdown linter wired (or explicitly deferred with a follow-up sprint scoped)
- [ ] System has now run for ≥4 weeks autonomously with this sprint's polish in place
- [ ] Zero TypeScript errors, zero lint errors, tests passing
- [ ] CloudWatch + browser console clean
- [ ] Sprint file timestamp updated
- [ ] PLAN file's initiative status updated to "Shipped" with date

---

## Files Touched (expected)

```
roadmap/notes/seoi-7-operating-review.md                     (new — one-time review notes)
server/src/services/seo/driftDetector.ts                     (new)
server/src/services/seo/__tests__/driftDetector.test.ts      (new)
server/src/services/seo/metadataRewriter.ts                  (modify — calibrated thresholds)
server/src/controllers/seoAdmin.ts                           (modify — drift status endpoint)
server/src/routes/seoAdmin.ts                                (modify)
src/pages/admin/SeoInsightsPage.tsx                          (modify — drift tile, killswitch styling)
src/pages/admin/SeoCalibrationPage.tsx                       (new)
src/services/api.ts                                          (modify)
src/App.tsx                                                  (modify — calibration route)
.claude/rules/seo-pipeline.md                                (new)
.claude/CLAUDE.md                                            (modify — link new rule file)
.claude/skills/SEOAuditAgent/seo_voice.md                    (modify — calibration entries)
.claude/skills/SEOAuditAgent/bucket_playbooks/winnable-losses.md  (modify — expanded eligibility list)
.markdownlint.json                                           (new)
package.json                                                 (modify — markdownlint dep + script)
roadmap/PLAN-SEO-Insights-Pilot.md                           (modify — status: Shipped)
```

---

## Blocked — PM decision needed

1. **Auto-pause on red drift severity.** Default plan: agent flips pause switch to `true` and records the red state in persisted run status immediately. Alternative: only flag the state without pausing (leaves judgment to human). **Default conservative.**
2. **Auto-ship expansion to glossary/milestones.** Conditional on green drift for ≥2 weeks. If drift is yellow, hold expansion. **Decision data-driven; no upfront PM call needed unless Wylie wants to override.**
3. **Voice file archive automation.** Default: manual procedure documented. Alternative: scheduled prune at 200 entries. **Default OK; revisit if file gets unwieldy.**
4. **Long-term initiative status.** When does this initiative stop being "active development" and become "operational maintenance"? Default: after this sprint's DoD passes + 4 more weeks clean. **Plan to revisit at month-4.**

---

## Tech Lead Review (2026-04-30)

Verification against actual codebase. See `PLAN-SEO-Insights-Pilot.md` "Tech Lead Review" section for cross-cutting findings.

### Critical

- **C1. Test file paths use the wrong convention.** Task 10 references `server/src/services/seo/__tests__/driftDetector.test.ts`. **Patch:** `tests/unit/seo/driftDetector.test.ts`.
- **C2. Admin route mount + `requireAdmin` per-route.** New `GET /api/admin/seo/drift-status` endpoint must follow the per-route middleware pattern.

### Moderate

- **M1. `roadmap/notes/seoi-7-operating-review.md` is a new convention.** No `roadmap/notes/` subdirectory exists today. Acceptable but inconsistent with the flat `/roadmap/*.md` layout. Recommendation: either flatten as `roadmap/SEOI-7-operating-review.md` (matches existing flat layout) or create `roadmap/notes/` as a deliberate new namespace and document its purpose in `.claude/CLAUDE.md`.
- **M2. Cosine similarity / embedding distance for drift detection (Task 2).** The drift detector's "voice-distance tripwire" needs an embedding or token-overlap metric. Project doesn't currently have an embedding service wired (no Voyage/OpenAI embedding calls in the codebase — verified). Cheaper option: use n-gram overlap (e.g., character trigrams + Jaccard similarity). Add this as a sub-decision under Task 2 — pick the metric explicitly before implementing.
- **M3. Markdown linter (Task 6) deferred from SEOI-3.** Adding `markdownlint-cli2` is straightforward. Recommendation: pin the version in `devDependencies`, add `.markdownlint.json` with sensible defaults (line-length: off, no-trailing-spaces: on, no-duplicate-heading: on). Wire into `npm run lint:md` as the plan specifies.
- **M4. `.claude/rules/seo-pipeline.md` cross-reference.** Plan Task 7 creates this rule file. Update `.claude/CLAUDE.md` "Rules (in `.claude/rules/`)" section (currently lists `data-models.md`, `subject-taxonomy.md`, `news-ingestion.md`, `backend.md`, `build-and-deploy-security.md`, `spam-protection.md`, `frontend.md`) to include `seo-pipeline.md`. Plan already has this in Task 7; emphasizing the exact CLAUDE.md edit location.

### Minor

- **Mi1. Lazy import for SeoCalibrationPage** in `src/App.tsx`.
- **Mi2. Drift detector triggered from cron, not on-demand.** Task 2 says drift detector runs "first thing" in the agent's weekly digest. Good — that's the cheapest place. Make sure it runs *before* any auto-ship attempts so a red severity blocks the same-week shipments, not just future weeks.
- **Mi3. Voice file archive policy (Task 8).** Documenting a manual procedure is fine for now. If automation ever happens, it lives next to `seo_voice.md` as a script — not in the agent's weekly run (separation of concerns).

### What's verified correct

- Sprint correctly waits ≥2 weeks of operating data before tuning ✓
- Initiative DoD verification (Task 9) walks line-by-line through the PLAN's DoD ✓
- Drift detector tripwires (repetition, voice-distance, reverse-correlation, confidence-vs-outcome) cover the slop-emergence patterns most likely to surface ✓
- Auto-ship expansion gated on data, not vibes ✓
- "Never auto-ship blog post bodies" preserved through this sprint ✓
- Calibration evidence committed to `seo_voice.md` (the audit trail) ✓
- Initiative DoD line items map back to specific verifiable artifacts ✓

### Effort impact

~30 min for the test path rename + the route mount fix. M2 (embedding vs n-gram decision) might add 1-2 hours depending on choice. The full sprint stays at the 1-2 day estimate.

---

## Slop Findings (AISlopReviewer — 2026-04-30)

### P0

(None.)

### P1

(None.)

### P2

- **P2-S1. Test path violation.** Cross-referenced from TLR C1. Category 9.
- **P2-S2. `roadmap/notes/` is a new convention** (TLR M1). Existing `/roadmap/` is flat. Pick: either flatten the operating-review note as `roadmap/SEOI-7-operating-review.md` (matches existing layout) or commit to `roadmap/notes/` as a deliberate new namespace and document its purpose in `.claude/CLAUDE.md`. Slop framing: Category 2 (Inconsistency / drift in file organization).
- **P2-S3. Embedding vs n-gram for voice-distance tripwire** (TLR M2). Project has no embedding service wired today (verified — no Voyage/OpenAI embedding calls in the codebase). N-gram + Jaccard similarity is the cheaper path and avoids introducing a dependency for one tripwire. **Recommendation:** start with character-trigram + Jaccard. If false-positive rate is too high after 4 weeks, revisit. Avoids Category 13 (Dependency hygiene — heavy library for a single use case) + Category 4 (Over-engineering — embedding service for one feature).

### P3

- **P3-S1. Drift detector severity colors (`green`/`yellow`/`red`).** Standard convention — fine. Just confirm the digest banner UI uses Tailwind utility classes (`bg-green-100`, `bg-yellow-100`, `bg-red-100`), not hardcoded hex values. Category 12 (Architectural drift — design system bypass).

### Slop Avoided (this is the calibration sprint — call out the disciplined choices)

- **Sprint waits ≥2 weeks of operating data before tuning.** Avoids Category 17 (Misreading the task — calibrating against assumed patterns). Calibration is data-driven, not vibes-driven.
- **Threshold calibration committed to `seo_voice.md` with evidence.** Future devs see *why* the threshold was raised/lowered, not just *that* it was. Avoids Category 6 (Comment & docstring pollution — opaque magic numbers) and Category 11 (Dead code — orphaned constants without rationale).
- **Auto-ship expansion gated on data, not vibes.** Conditional on green drift for ≥2 weeks. Plan correctly delays expansion until evidence supports it.
- **"Never auto-ship blog post bodies" preserved through this sprint.** Even when the auto-ship eligibility list expands to glossary/milestones, blog post bodies stay human-only. Hard refusal in code AND in playbook, not negotiable.
- **Drift detector tripwires are real failure modes, not theoretical concerns.** Repetition (similar phrasing across actions), voice-distance (drift from baseline), reverse-correlation (after-CTR worse than before for ≥2 actions same week), confidence-vs-outcome (calibration broken). Each tripwire maps to a category of slop the system would otherwise ship blind to.
- **Auto-pause on red drift severity** is the right level of paranoia. Plan correctly defaults to flipping the pause switch + `@here` ping rather than just logging a warning. Aligns with the Layer-3 architecture from the master plan.
- **Voice file pruning policy is documented** but not automated. Avoids Category 4 (Over-engineering — auto-prune for a problem that hasn't surfaced yet) and Category 11 (Dead code — orphaned archive scripts). Manual procedure now, automate if it ever matters.
- **Markdown linter wired only at SEOI-7** (deferred from SEOI-3) — sensible. Avoids Category 13 (Dependency hygiene — adding a tool before it's earned its keep).
- **Initiative DoD verification (Task 9)** walks line-by-line through PLAN's DoD. Avoids Category 16 (Process & verification gaps — claiming "done" without checking).
- **No `mcp__claude-in-chrome__*`, no `VITE_*` secrets, no manual AWS console steps.**
- **No backwards-compat shims.**

---

## UX Lead Review (2026-04-30)

This sprint adds the **drift severity tile** + calibration history page + makes the pause toggle "killswitch-grade." UX bar: severity must be readable at a glance, color-blind safe, and the killswitch must visually communicate its weight. See `PLAN-SEO-Insights-Pilot.md` "UX Lead Review" for cross-cutting findings.

### User-facing impact
A severity tile on `/admin/seo-insights` operational banner, more prominent pause toggle styling, and a new sub-page `/admin/seo-insights/calibration` showing threshold evolution.

### UX findings

#### 1. Drift severity tile — color-blind safe (Task 5, addresses Slop P3-S1)

Plan calls for green/yellow/red. **Must include non-color signal:**

- [ ] **Three states with icon + label, not just color:**
  - `green` → ✓ icon + "Healthy" label + `bg-green-50 border-green-200 text-green-700` (light) / `dark:bg-green-900/30 dark:border-green-700 dark:text-green-200`
  - `yellow` → ⚠ icon + "Warning" label + `bg-amber-50 border-amber-200 text-amber-700` (use `amber-*` over `yellow-*` per project's existing chip patterns)
  - `red` → ✗ icon + "Critical — auto-paused" label + `bg-red-50 border-red-300 text-red-800`
- [ ] **Color tokens via Tailwind utilities only** — no hardcoded hex. Confirms Slop P3-S1 fix.
- [ ] **Tile expandable to show the tripped tripwires list**: collapsed by default in green state, expanded by default in yellow/red. Clicking the tile in any state expands the full tripwire list.
- [ ] **Last-scan timestamp**: small muted text under the severity label ("Last scan: 4 hours ago"). On hover, full timestamp tooltip.

#### 2. Killswitch upgrade (cross-ref SEOI-5 UX section)

SEOI-5 introduced the pause toggle. SEOI-7 makes it "killswitch-grade — red, prominent." UX clarification on what that means:

- [ ] **NOT making the active (running) state red** — that would create a "boy who cried wolf" effect. Active state stays calm green.
- [ ] **Paused state visually escalated**: full-width red banner across the operational area (not just a small chip), with "Auto-ship is PAUSED" + the reason (manual / auto-pause from drift / SSM-flipped) + a `Resume` button.
- [ ] **Auto-pause from drift severity = red**: when the drift detector flips the pause switch automatically, the banner explicitly says "Auto-paused due to drift severity" with a link to the tripwires list.
- [ ] **Resume button** uses `<ConfirmDialog>` (per SEOI-5 UX section) with copy explaining why it was paused — friction-up for resuming.

#### 3. Calibration history page (Task 5)

A new sub-page at `/admin/seo-insights/calibration`. Plan says "line chart: confidence threshold, blast cap; date axis."

- [ ] **Reuse the d3 chart pattern from `RetentionChart.tsx`** — same as SEOI-2's sparkline reuse. Don't introduce a new charting library.
- [ ] **Chart accessibility**: include `<title>` and `<desc>` SVG elements summarizing the trend ("Confidence threshold raised from 0.80 to 0.85 on 2026-05-15 after 3 rolled-back actions"). Screen-reader users get the gist without seeing the visual.
- [ ] **Y-axis labels** for both threshold (0.7-1.0) and blast-radius (1-10) — dual Y-axis if needed, or two stacked charts. Two stacked charts is the cleaner UX.
- [ ] **Annotation markers** at each calibration change point: small dots on the line + hover tooltip showing the `seo_voice.md` entry that triggered the change. Power-user feature — admins can audit the calibration evidence trail directly from the chart.
- [ ] **Empty state**: before the first calibration change has occurred, show `<EmptyState>` with copy "No calibration changes yet. Thresholds are at initial defaults: confidence ≥0.8, blast radius ≤3/week. Visit again after the next operating-data review."

#### 4. Calibration page IA

- [ ] **Reached via outer Insights/Actions/Proposals tab nav** + a sub-link in the Actions tab (or a small button on the operational banner). Don't add a 5th top-level tab — that's nav bloat.
- [ ] **Breadcrumb**: `Admin → SEO Insights → Calibration`.
- [ ] **No new sidebar nav entry**.

#### 5. Operational banner final composition (after all sprints)

After SEOI-5 + SEOI-7 land, the operational banner contains: drift severity tile + last-run + counts + pause toggle + view-digest link + view-calibration link. **At desktop width that's still manageable in a single horizontal row IF the items are styled as compact chips.** At mobile it definitely needs vertical stacking + a "more" disclosure for the tertiary links (calibration link especially).

- [ ] **Density discipline**: the banner is one line at desktop, vertical stack at mobile. No more chrome added beyond what SEOI-5 + SEOI-7 specify. Future operational signals go into the tile (drift) or the digest, not bolted onto the banner.

#### 6. Mobile spec for the drift tile

- [ ] At `<sm` (375px): tile is full-width, severity icon + label visible, expanded tripwire list scrolls within the tile. Don't try to fit severity tile + pause toggle + counts in one horizontal row at mobile.

#### 7. Dark mode decision (cross-ref UX-X1)

- [ ] **Match `AdminLayout` styling — single-theme (light) for the calibration page chrome.** Severity tile uses light-mode-appropriate Tailwind classes per #1 above. The shared `ui/` primitives ship dark-mode-ready.

#### 8. Drift detector results need an "investigate" affordance

When severity goes yellow or red, what does the user DO?

- [ ] **Each tripwire (when expanded) shows**: tripwire name + brief description + "View related actions" link → opens a filtered view of `/admin/seo-insights/actions` with the offending actions highlighted.
- [ ] **Recovery path is obvious**: from the tile → tripwire → actions → rollback (one-click using SEOI-4's existing rollback flow). No spelunking required.

### Definition of Done additions

- [ ] Drift severity tile uses Tailwind utility classes only (no hardcoded hex)
- [ ] All three severity states use icon + label, not color alone — color-blind users can distinguish
- [ ] Killswitch (paused state) visually escalated to full-width red banner with reason + Resume button
- [ ] Resume button uses `<ConfirmDialog>` with explanatory copy
- [ ] Calibration chart uses d3 pattern from `RetentionChart.tsx` (no new charting library)
- [ ] Calibration chart includes SVG `<title>` + `<desc>` for screen-reader accessibility
- [ ] All new UI verified at 375px / 768px / 1280px
- [ ] Lighthouse Accessibility ≥95 on `/admin/seo-insights` and `/admin/seo-insights/calibration`
- [ ] Tile expand/collapse + tripwire investigate flow keyboard-reachable

### What's correct already

- Severity colors (green/yellow/red) — correct semantic mapping; just needs non-color signal added.
- Auto-pause on red — correct safety choice (cross-ref SEOI-5 UX).
- Calibration evidence committed to `seo_voice.md` — correct audit-trail discipline.
- "Make the pause toggle prominent" — correct UX intent; SEOI-5 + SEOI-7 jointly deliver the right visual treatment.
- No new sidebar nav entries — correct IA discipline.
