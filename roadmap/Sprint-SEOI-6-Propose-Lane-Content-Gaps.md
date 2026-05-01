# Sprint SEOI-6: Propose Lane — Content Gap Drafts

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-30 by Codex (proposal lane deployed; live quality gate found and fixed quoted-query normalization)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `frontend.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-SEO-Insights-Pilot.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm SEOI-1 through SEOI-5 DoDs are fully checked. If not, finish them first.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Wire the **propose lane** — the path that turns a content-gap or trend-signal finding into a draft blog post (or glossary/milestone proposal) without ever publishing autonomously. The agent generates a content brief, routes it to `/AIBlogDraft` (which already enforces voice + entity-graph + SEO discipline), and queues the result in an admin proposal queue. Humans approve before publish; the existing `/AIBlogDraft` Phase 5 approval gate is the publish lock.

This sprint connects the GSC findings layer to the editorial layer. The two have lived in separate skills until now; SEOI-6 makes them compose.

**Priority**: HIGH (closes the loop on content-gap signals which produced this whole initiative)
**Depends on**: SEOI-1 through SEOI-5
**Estimated Effort**: 2-3 days
**Status**: In progress — backend + frontend shipped, production queue live, positive approve/publish loop still waiting on a stronger live candidate than the rejected Turing Award entity query.

---

## Prerequisites

- [ ] SEOI-1 through SEOI-5 DoDs fully checked
- [x] At least 3 content-gap findings exist in the recent week (verify at `/admin/seo-insights?bucket=content_gap`)
- [ ] `/AIBlogDraft` skill is healthy (last published post via the skill is recent)
- [ ] Local dev server running

---

## Tasks

### 1. Content brief schema

- [x] Add `SeoProposal` model to `prisma/schema.prisma`:
  ```prisma
  model SeoProposal {
    id              String   @id @default(cuid())
    snapshotId      String   // FK to GscWeeklySnapshot
    proposalType    String   // blog_post | glossary_term | milestone | person_bio_patch
    targetKeyword   String
    suggestedAngle  String   @db.Text
    linkInventoryJson Json   // pre-computed entities relevant to this brief
    newsHooksJson   Json?    // recent admin articles relevant if any
    rationale       String   @db.Text  // why this gap, why this angle, why now
    confidence      Float
    status          String   @default("pending") // pending | drafting | approved | rejected | shipped
    draftPostId     String?  // FK to BlogPost.id once /AIBlogDraft creates a draft
    createdAt       DateTime @default(now())
    actedAt         DateTime?
    rejectedReason  String?
  }
  ```
- [x] Migration: `npx prisma migrate dev --name add_seo_proposal`

### 2. Brief generator service

- [x] Create `server/src/services/seo/briefGenerator.ts`:
  - `generateBrief(snapshotId)` — for a content-gap or trend-signal snapshot, builds the brief:
    - **Target keyword**: the visible GSC query when present; otherwise derive the page/topic angle from the `page_aggregate` snapshot because anonymized queries are omitted from query-detail rows
    - **Suggested angle**: passes the bucket evidence + last-14-days news context to Claude Opus 4.7, asks for a thesis-shaped angle (not a recap)
    - **Link inventory**: queries the entity graph for persons/orgs/glossary/milestones related to the keyword (via existing search endpoints — same pattern `/AIBlogDraft` uses in Phase 2)
    - **News hooks**: pulls last 14 days of admin articles matching the keyword
    - **Confidence**: high if the keyword has impressions trending up + 3+ entities in the graph + news hooks present; low otherwise
  - Returns `Omit<SeoProposal, 'id' | 'createdAt' | 'status' | 'draftPostId'>`.
- [x] **Hard refusal**: refuses to generate a brief if a proposal already exists for the same `(targetKeyword, weekStart)` within the last 30 days (prevents duplicate angles).

### 3. Slop pre-flight

- [x] Before persisting a brief, run the same slop checklist defined in `slop_categories.md`:
  - **Generic listicle**: angle starts with "Top N"? → reject
  - **Duplicate with existing entity**: target keyword exactly matches an existing slug at `/glossary/<slug>` or `/events/<id>`? → reject; surface as "fix the entity, don't write a duplicate post"
  - **Voice drift**: angle uses banned phrases from voice file (hyperbolic words list per `seo_voice.md`)? → reject
- [x] Rejected briefs are still persisted with `status='rejected'` and `rejectedReason` so the audit trail captures why.

### 4. Admin proposals queue endpoint

- [x] Add to `server/src/controllers/seoAdmin.ts`:
  - `GET /api/admin/seo/proposals?status=&limit=&page=` — admin only — paginated proposals
  - `POST /api/admin/seo/insights/:id/generate-proposal` — admin only — runs `generateBrief` for one finding, persists, returns the proposal
  - `POST /api/admin/seo/proposals/:id/approve` — admin only — marks the proposal `drafting` and stores a structured `/AIBlogDraft` handoff payload. Returns the handoff payload. It does **not** auto-run `/AIBlogDraft` server-side.
  - `POST /api/admin/seo/proposals/:id/reject` — admin only — body `{ reason }`. Status `rejected`.
  - `PUT /api/admin/seo/proposals/:id/link-draft` — admin only — body `{ draftPostId }`. Sets `draftPostId` once a human-run `/AIBlogDraft` session produces one. (Status stays `drafting` until the post is actually published; then a later flow can mark `shipped`.)
- [x] Wire routes

### 5. Handoff to /AIBlogDraft

- [x] Approve flow: when admin clicks Approve on a proposal, the backend:
  1. Sets `SeoProposal.status='drafting'`
  2. Writes a structured handoff instruction for the next Claude Code session: invoke `/AIBlogDraft topic: <suggestedAngle>` with `keyword: <targetKeyword>` and `news_url: <newsHook>` (if present)
- [x] Since `/AIBlogDraft` runs interactively in Claude Code (it's a skill that requires human review at Phase 5), there is no automated server-side draft generation. The "approve" action emits a structured handoff record that the user picks up in their next Claude Code session.
- [x] **Document this clearly in the admin UI**: approving a proposal does NOT auto-draft. It puts the proposal in a state ready for a human-driven `/AIBlogDraft` session. This is intentional — `/AIBlogDraft` is the publish gate, and we're not bypassing it.

### 6. Admin proposals page

- [x] Create `src/pages/admin/SeoProposalsPage.tsx` at route `/admin/seo-insights/proposals`:
  - Tabs: Pending | Drafting | Approved | Rejected
  - Table: `Created | Bucket | Target Keyword | Suggested Angle | Confidence | Buttons`
  - Buttons per row: View Detail · Approve · Reject
  - Detail drawer: shows full brief (suggested angle, link inventory, news hooks, rationale, confidence)
  - Approve button: confirm modal explaining the handoff (this opens `/AIBlogDraft`, not auto-publish)
  - Reject button: text input for reason → POST reject
- [x] Add tab nav from `SeoInsightsPage` so the three views (Insights, Actions, Proposals) are co-located

### 7. Tie back into the digest

- [x] Update the agent prompt in `seo-weekly.md` (SEOI-5 schedule definition):
  - Step 6 (proposals): the agent now actually creates `SeoProposal` rows for every content-gap and trend-signal finding above the confidence threshold, instead of just including them in the digest as flat text.
  - Digest section "Proposals queued" links to `/admin/seo-insights/proposals?status=pending`
- [x] Voice file boundary: when a proposal ships through `/AIBlogDraft` and gets published, that publish event writes to `/AIBlogDraft`'s `blog_voice.md`. `/SEOAuditAgent` continues to write only to `seo_voice.md` during the weekly SEO run. Both voice files grow together over time, but there is no double-write to the same file.

### 8. Tests

- [x] Unit tests for `briefGenerator.ts` in `tests/unit/briefGenerator.test.ts`:
  - Generic listicle angle → rejected
  - Target keyword matches existing glossary slug → rejected
  - Voice-drift phrase → rejected
  - Healthy keyword + 3 entities + news hook → high confidence, persisted
  - Duplicate-within-30-days → refused
- [x] Integration tests for the 5 proposal endpoints in `tests/unit/seoAdmin.test.ts`
- [x] Frontend tests for `SeoProposalsPage.tsx` (approve modal, reject reason input)
- [ ] `npm test -- seo` — all pass
- [x] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors

### 9. Deploy

- [x] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [ ] Migration:
      `export DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text) && npx prisma migrate deploy`
- [x] Frontend: `./scripts/deploy-frontend.sh`
- [x] Update the scheduled agent prompt to call `/generate-proposal` for qualifying findings

### 10. Backend Validation

- [x] Generate a proposal manually for one real content-gap finding:
  ```bash
  curl -sS -X POST "https://letaiexplainai.com/api/admin/seo/insights/<id>/generate-proposal" \
    -H "Authorization: Bearer $TOKEN"
  ```
  Inspect the brief — does the angle have a thesis? Is the link inventory accurate? Are news hooks recent?
- [ ] **Quality gate on the first 2 generated briefs**: invoke `/AISEOReview` on each. Ask: "Is the target keyword actually winnable on SERP given LAEA's E-E-A-T posture? Does the proposed angle have a thesis (vs a definitional recap that competes with the existing `/glossary/<slug>` page)? Is the entity-graph link inventory deep enough to support first-mention internal linking when this becomes a published post? Would you approve this brief as the input to `/AIBlogDraft topic:` mode?" **If `/AISEOReview` rejects either brief, do NOT approve.** Pause and tighten `briefGenerator.ts` prompt + `bucket_playbooks/content-gaps.md` slop guards. The first live brief surfaced this exact issue: quoted entity queries were being treated as blog candidates, so `briefGenerator.ts` was tightened and the weak pending brief was manually rejected in prod rather than approved.
- [ ] Approve it via the UI (only if `/AISEOReview` approved); confirm the proposal status flips to `drafting` and the `/AIBlogDraft` handoff payload is visible/copyable
- [ ] Run `/AIBlogDraft topic: <angle>` in a Claude Code session; produce a draft; publish via the existing skill flow
- [ ] Confirm `SeoProposal.draftPostId` populates and status flows from `drafting` → `shipped` after publish (the feedback loop in next week's run handles this state transition; verify after one cycle)
- [x] Test reject flow with a fixture proposal
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 30m` — zero errors

### 11. Browser Validation (via `/Browser` skill only)

- [ ] `agent-browser open https://letaiexplainai.com/admin/seo-insights/proposals`
- [ ] Verify all 4 tabs render with correct counts
- [ ] Click View Detail on a pending proposal → drawer opens with full brief, link inventory list, news hooks list
- [ ] Click Approve → confirm the `/AIBlogDraft` handoff is explained clearly and the status flips to `drafting`
- [ ] Click Reject on another proposal → reason input appears → submit → status flips
- [ ] Mobile viewport: `agent-browser resize 375 812 && agent-browser screenshot`
- [ ] Zero console errors, zero 4xx/5xx
- [ ] Lighthouse on `/admin/seo-insights/proposals`: Performance ≥90, Accessibility ≥95

---

## Definition of Done

- [ ] All tasks above checked
- [ ] At least one real content-gap finding has flowed through: `/generate-proposal` → admin approves → `/AIBlogDraft` invoked manually → post published → `SeoProposal.status` reaches `shipped`
- [ ] Slop pre-flight has caught at least one rejection in either testing or real findings (verifies the gate works)
- [ ] Admin proposals page lists all 4 statuses correctly
- [ ] Approve flow emits a usable `/AIBlogDraft` handoff payload with no ambiguity
- [ ] Zero TypeScript errors, zero lint errors, tests passing
- [ ] CloudWatch + browser console clean
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```
prisma/schema.prisma                                          (modify — SeoProposal)
prisma/migrations/<ts>_add_seo_proposal/                      (new)
server/src/services/seo/briefGenerator.ts                     (new)
tests/unit/briefGenerator.test.ts                             (new)
server/src/controllers/seoAdmin.ts                            (modify — 5 new endpoints)
tests/unit/seoAdmin.test.ts                                   (modify)
server/src/routes/seoAdmin.ts                                 (modify)
src/pages/admin/SeoProposalsPage.tsx                          (new)
tests/unit/SeoProposalsPage.test.tsx                          (new)
src/components/admin/SeoProposalDrawer.tsx                    (new)
src/services/api.ts                                           (modify)
src/App.tsx                                                   (modify — proposals route)
.claude/schedules/seo-weekly.md                               (modify — agent prompt creates proposals)
.claude/skills/SEOAuditAgent/SKILL.md                         (modify — handoff to /AIBlogDraft documented)
```

---

## Blocked — PM decision needed

1. **Proposal-type scope.** Default plan: only `blog_post` proposals in this sprint. Other proposal types (`glossary_term`, `milestone`, `person_bio_patch`) are wired into the schema but the brief generator only handles `blog_post`. Expand in a future sprint or SEOI-7 polish. **Default OK.**
2. **Confidence threshold for proposal generation.** Default: ≥0.5 (low bar — humans review anyway). Calibrate after one month. **Default OK.**
3. **`/AIBlogDraft` handoff format.** Default: return a short structured payload plus a copyable command block in the UI. Alternative: persist a richer markdown brief artifact. **Default OK unless the handoff feels too thin in testing.**
4. **`/AIBlogDraft` API surface.** This sprint assumes `/AIBlogDraft topic:` mode accepts `keyword` and `news_url` parameters per its current SKILL.md. If the skill spec drifts, this sprint's Task 5 needs to follow. **Verify before Task 5 ships.**

---

## Tech Lead Review (2026-04-30)

Verification against actual codebase. See `PLAN-SEO-Insights-Pilot.md` "Tech Lead Review" section for cross-cutting findings.

### Critical

- **C1. Test file paths use the wrong convention.** Task 8 references `server/src/services/seo/__tests__/briefGenerator.test.ts`, `server/src/controllers/__tests__/seoAdmin.test.ts`, `src/pages/admin/__tests__/SeoProposalsPage.test.tsx`. **Patch:** `tests/unit/seo/briefGenerator.test.ts`, `tests/unit/seo/seoAdmin.test.ts`, `tests/unit/pages/admin/SeoProposalsPage.test.tsx`.
- **C2. `SeoProposal` Prisma relation declarations missing.** `snapshotId` and `draftPostId` are raw FKs without `@relation`. **Patch:** add to `SeoProposal`:
  ```prisma
  snapshot   GscWeeklySnapshot @relation(fields: [snapshotId], references: [id])
  draftPost  BlogPost?         @relation(fields: [draftPostId], references: [id])
  ```
  And inverses:
  ```prisma
  // GscWeeklySnapshot
  proposals  SeoProposal[]

  // BlogPost
  seoProposals  SeoProposal[]
  ```

### Moderate

- **M1. Brief generator should reuse existing entity-graph search.** Task 2 says "queries the entity graph for persons/orgs/glossary/milestones related to the keyword (via existing search endpoints — same pattern `/AIBlogDraft` uses in Phase 2)". Confirmed: `/api/persons/search`, `/api/organizations/search`, `/api/glossary/search`, `/api/milestones/search` all exist. Internal callers should use the underlying service functions directly (`personsService.searchPersons`, etc.) — see `server/src/services/persons.ts`. Don't HTTP-roundtrip from a service to its sibling service. The plan correctly says "via existing search endpoints" — sharpen to "via existing search service functions".
- **M2. News hook lookup duplicates SEOI-2 work.** Task 2 pulls "last 14 days of admin articles matching the keyword" from `/api/admin/articles`. SEOI-2's content_gap classifier already does fuzzy entity matching. Consider extracting a shared helper (`server/src/services/seo/keywordMatcher.ts` or similar) so SEOI-2 and SEOI-6 share the matching logic. Not a blocker — flag for SEOI-7 refactor pass if the duplication actually causes drift.
- **M3. Admin route mount + `requireAdmin` per-route.** Same pattern as prior sprints. The 5 new endpoints in Task 4 all need `requireAdmin` per-route inside the route file.
- **M4. `/AIBlogDraft topic:` mode parameter compatibility.** Verified at `.claude/skills/AIBlogDraft/SKILL.md`: topic mode accepts `topic`, `news_url`, and `keyword`. SEOI-6 Task 5's handoff passes all three — compatible. Just confirming.
- **M5. Handoff should stay structured and local to the product/admin flow.** Task 5 says "approving a proposal does NOT auto-draft. It puts the proposal in a state ready for a human-driven `/AIBlogDraft` session." This is the right safety call. Keep the handoff as structured payload + UI affordance; do not introduce a chat dependency just to bridge the approval step.

### Minor

- **Mi1. Lazy import for new admin page.** Same as prior sprints — add to `src/App.tsx` lazy-load section.
- **Mi2. `actedAt` field on `SeoProposal`.** Plan defines it but doesn't say when it gets set. Convention: set on approve/reject, leave null on pending. Document this in the controller comments.
- **Mi3. Status state machine.** `pending → drafting → (approved|shipped) | rejected` — make sure the controller enforces the transitions. A proposal in `shipped` status shouldn't be re-approvable. Tests in Task 8 should cover this.

### What's verified correct

- `SeoProposal` model fields don't collide with existing models ✓
- Composition with `/AIBlogDraft` for actual drafting (never auto-publish) ✓
- Admin proposals queue UI follows existing admin page patterns ✓
- Slop pre-flight categories correctly mirror those in SEOI-3 ✓
- Structured `/AIBlogDraft` handoff keeps the approval step explicit and auditable ✓

### Effort impact

~30 min for the Prisma relation patch (C2) and test path renames (C1). M2 (shared keyword matcher) is optional and can defer.

---

## Slop Findings (AISlopReviewer — 2026-04-30)

### P0

(None.)

### P1

- **P1-S1. `briefGenerator.ts` link inventory should compose with `entityLinker.ts`, not just call entity search routes.** Sharpens TLR M1. Verified `server/src/services/entityLinker.ts:12` already imports `matchPerson` and `matchOrganization` from `entityMatcher.ts` and provides keyword → entity resolution for cross-content linking — this is the exact "build a link inventory for a topic" operation `/AIBlogDraft` runs in Phase 2. Plan Task 2's "queries the entity graph for persons/orgs/glossary/milestones related to the keyword" should be a direct compose-with-`entityLinker` step, not a re-implementation. **Fix:** rewrite Task 2 to "use `entityLinker.linkEntitiesToText(keyword)` (or the helpers it composes — `matchPerson`, `matchOrganization`) for the link inventory step. For glossary/milestone (which `entityLinker` doesn't currently handle), use Prisma `contains` queries directly. Do not introduce a parallel `keywordMatcher` helper unless `entityLinker` proves insufficient." Category 1.1 (Parallel helpers) + Category 12 (Architectural drift — bypassing existing abstraction).

### P2

- **P2-S1. Test path violation.** Cross-referenced from TLR C1. Category 9.
- **P2-S2. SEOI-2 + SEOI-6 keyword-to-entity matching duplication risk** (TLR M2). Both sprints do "match a keyword against the entity graph" — SEOI-2 for content-gap detection, SEOI-6 for brief generation. **Both should compose with `entityLinker.ts`** (per P1-S1). If `entityLinker` is insufficient for SEOI-2's bucket-classification scale (it's currently tuned for per-text linking), extract a shared helper module *before* Sprint SEOI-6 ships, not after — preventing future duplication is cheaper than de-duplicating later. Category 1.1.
- **P2-S3. `SeoProposal.proposalType` enum scoped to `blog_post` only in this sprint** (Blocked PM decision #1) — not slop, just scope-bounding. Future expansion to `glossary_term | milestone | person_bio_patch` should be in a follow-on sprint, not bolted onto this one. Plan correctly handles this.

### P3

(None.)

### Slop Avoided

- **No parallel classification table.** Initiative writes proposal status into `SeoProposal.status` (a typed enum string) rather than introducing tagging or grouping. `Subject` + `ContentSubject` not bypassed.
- **Approve flow does NOT auto-draft.** `/AIBlogDraft` is the publish gate; SEOI-6 explicitly hands off rather than bypassing the voice-file + Phase 5 human approval. Plan documents this in the approve modal copy. **This is the single most important slop-avoidance in the propose lane** — if the system ever auto-drafted, the voice file's accumulated learnings would stop compounding (per SEOI-3 skill rule). Plan correctly preserves the gate.
- **Slop pre-flight catches generic listicles, duplicates with existing entities, voice drift** before persisting a brief. Three reject conditions tested in Task 3, with `rejectedReason` stored for audit. Defense in depth.
- **Hard refusal on "duplicate-with-existing-entity"** specifically calls out the case where the gap is at `/glossary/<slug>` or `/events/<id>` — surfaces "fix the entity, don't write a duplicate post" as the recovery action. Avoids re-deriving content already covered by canonical entity pages. Category 1.1 + 12 explicitly addressed.
- **`SeoProposal.draftPostId` foreign-keys back to `BlogPost`** (per TLR C2 patch) — ties the proposal to its eventual publish without inventing a parallel "drafts" table.
- **`/AIBlogDraft topic:` mode parameters compatible** (TLR M4 verifies). Plan composes via documented skill API, not invented parameters.
- **No `mcp__claude-in-chrome__*`, no `VITE_*` secrets, no manual AWS console steps.**
- **No backwards-compat shims.**

---

## UX Lead Review (2026-04-30)

This sprint adds the **proposals queue page** — the third and final admin surface in the initiative. UX bar: clear handoff signal (proposal → `/AIBlogDraft` session), no surprise auto-publish. See `PLAN-SEO-Insights-Pilot.md` "UX Lead Review" for cross-cutting findings.

### User-facing impact
A new admin page at `/admin/seo-insights/proposals` with 4 status tabs (Pending · Drafting · Approved · Rejected) and approve/reject flows.

### UX findings

#### 1. Reuse SEOI-2 primitives + `<ConfirmDialog>`

- [ ] **`<Tabs>` primitive** (added in SEOI-2): use for the inner status tabs (Pending / Drafting / Approved / Rejected). This is a *nested* tab nav under SEOI-4's outer Insights/Actions/Proposals tab nav — that's two levels of tabs on the same page. Justify in implementation: nested tabs only because pending volume + status filtering are independent dimensions. Visually distinguish the two levels (outer = primary tab style, inner = pill-style or underline-style) so users don't get lost.
- [ ] **`<Drawer>` primitive** (added in SEOI-2): use for the proposal detail drawer (Task 6).
- [ ] **`<EmptyState>` primitive** (added in SEOI-2): use for "No pending proposals" / "No drafting in progress" / "No approved proposals yet" / "No rejected proposals". Each tab gets its own copy that signals emptiness as expected, not failure.
- [ ] **`<ConfirmDialog>` from `src/components/ui/ConfirmDialog.tsx`** (already exists): use for the **reject flow only**. The approve flow does NOT need a confirm dialog — see #2 below.

#### 2. Approve modal — replace with clearer button labeling (revises plan Task 6)

Plan currently says: "Approve button: confirm modal explaining the handoff (this opens `/AIBlogDraft`, not auto-publish)". **UX recommendation: skip the confirm modal — clarify at the button label level.**

Reasons: (a) approve is a non-destructive action — adding a confirm step adds friction without preventing a real risk; (b) modal copy explaining "this won't auto-publish" is a sign that the *button label itself is unclear*; (c) clearer button copy + a `react-hot-toast` post-action message communicates the same thing without the modal.

- [ ] **Replace primary button label "Approve"** with `Send to /AIBlogDraft for drafting` (or `Hand off to /AIBlogDraft`). Now the button literally says what it does — no confirm needed.
- [ ] **After click**: instant state change to `Drafting`, `react-hot-toast` says "Sent to /AIBlogDraft. Open a Claude Code session and run `/AIBlogDraft topic:` with the keyword `[X]`."
- [ ] **Drawer content includes a copyable command block** with the exact `/AIBlogDraft` invocation: `<code>/AIBlogDraft topic: [angle]</code>` — user can copy-paste into their terminal/Claude Code session. Reduces friction and prevents typos.
- [ ] **Reject button**: unchanged — uses `<ConfirmDialog>` because rejected proposals are harder to recover (require re-classification) and the `reason` text input needs a structured form.

#### 3. Detail drawer content (Task 6) — progressive disclosure

The drawer shows: full brief (suggested angle, link inventory, news hooks, rationale, confidence). That's a lot. Apply progressive-disclosure principles:

- [ ] **Top of drawer** (always visible): target keyword (large), confidence score (large + colored), suggested angle (1-line summary).
- [ ] **Middle, collapsible**: link inventory list (collapsed by default — "12 entities matched" → expand to see). News hooks list (collapsed by default — "2 recent articles" → expand).
- [ ] **Bottom** (always visible): rationale (1-2 paragraphs), action buttons (Send to /AIBlogDraft / Reject).
- [ ] **Mobile**: drawer becomes full-screen modal sheet at `<sm` (per the shared `<Drawer>` primitive's mobile spec from SEOI-2). All sections stack; collapsibles still work.

#### 4. Status filter chips (4-tab nav inner) and table responsive

- [ ] **Tab labels include count chips**: `Pending (3) · Drafting (1) · Approved (5) · Rejected (12)`.
- [ ] **Mobile**: same horizontal-scroll-with-snap pattern as SEOI-2's bucket tabs.
- [ ] **Table responsive**: `Created · Bucket · Target Keyword · Suggested Angle · Confidence · Buttons`. Sticky-first-column on mobile = Target Keyword. Suggested Angle is the longest column — truncate with `text-overflow: ellipsis` + tooltip on hover (use `Drawer` for full text on mobile tap).

#### 5. State completeness

- [ ] **Loading**: `<LoadingSkeleton lines={5}>`.
- [ ] **Empty (per status)**: `<EmptyState>` with status-specific copy (see #1).
- [ ] **Error**: `<ErrorState onRetry={refetch}>`.
- [ ] **Degraded**: handle a proposal whose target keyword no longer matches any GSC finding (snapshot was deleted) — show "Source GSC finding archived" instead of crashing.
- [ ] **First-run state** (before any proposals exist): show a one-time helper banner explaining what proposals are and how the approve flow hands off to `/AIBlogDraft`. Banner dismissible.

#### 6. Handoff copy format on approve (Task 5 — also addresses Blocked PM #3)

Plan default: return a short structured payload plus a copyable command. **UX-recommended copy**:

```
Ready for `/AIBlogDraft`: "{targetKeyword}"
→ {short angle summary, ≤120 chars}
→ Open the proposal: {URL}
→ Run: /AIBlogDraft topic: {targetKeyword} — {angle}
```

The literal command at the bottom of the handoff reduces context-switching friction — the user can copy it directly from the admin UI and run in Claude Code without guesswork.

#### 7. Dark mode decision (cross-ref UX-X1)

- [ ] **Match `AdminLayout` styling — single-theme (light)** for the proposals page chrome. The shared `ui/` primitives ship dark-mode-ready.

#### 8. Information architecture

- [ ] **No new sidebar nav entry** — reached via SEOI-4's outer Insights/Actions/Proposals tab nav. Correct sub-page IA.
- [ ] **Breadcrumb**: `Admin → SEO Insights → Proposals`. Same breadcrumb pattern as SEOI-4.

### Definition of Done additions

- [ ] Approve flow uses clear button labeling ("Send to /AIBlogDraft for drafting") with no confirm modal — instant action + toast feedback
- [ ] Reject flow uses `<ConfirmDialog>` with a `reason` input
- [ ] Drawer applies progressive disclosure: target/confidence/angle prominent, link inventory + news hooks collapsed by default
- [ ] Copyable `/AIBlogDraft topic:` command in the drawer (one-click copy)
- [ ] All 4 status tabs verified populated/empty/loading/error states
- [ ] Handoff copy reviewed and matches the recommended format above
- [ ] Responsive verified at 375px / 768px / 1280px
- [ ] Lighthouse Accessibility ≥95
- [ ] Keyboard reach: full approve / reject / view detail flow exercisable without a mouse

### What's correct already

- Approve flow does NOT auto-draft — correctly preserves the `/AIBlogDraft` Phase 5 publish gate.
- Status state machine (`pending → drafting → (approved | shipped) | rejected`) — clean, enumerable, easy to render.
- Single nav entry + sub-page IA — correct (no over-promotion).
- Structured handoff replaces any need for a chat-side bridge.
