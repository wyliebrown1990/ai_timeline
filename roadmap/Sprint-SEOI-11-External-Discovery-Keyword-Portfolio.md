# Sprint SEOI-11: External Discovery + Keyword Portfolio

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-05-01 by Codex (GSC-cluster discovery + portfolio UI shipped)

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
**Status**: In progress

---

## Prerequisites

- [x] SEOI-8 through SEOI-10 are stable in prod
- [x] GSC cluster mining and experiment ledger are already trusted
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

- [x] Add a keyword-portfolio model, for example `KeywordOpportunity`, with fields such as:
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
- [x] Generate Prisma migration(s)

### 3. Discovery services

- [x] Create `server/src/services/seo/keywordDiscovery.ts`
- [ ] Implement a public-data discovery flow:
  - [x] GSC clusters that imply adjacent unmet demand
  - [ ] Google Trends or equivalent lightweight trend input
  - [ ] SERP sampling that inspects result mix and crude competition proxies
  - [ ] content-graph gap checks so LAEA does not “discover” what it already owns
- [x] Keep competition scoring lightweight and explainable in v1

### 4. Editorial scoring

- [x] Add a scoring rubric that balances:
  - [x] demand proxy
  - [x] competition proxy
  - [x] fit with LAEA’s existing graph
  - [x] ability to support internal linking
  - [ ] experiment capacity
- [ ] Cap the weekly intake so discovery does not overwhelm the backlog

### 5. Admin portfolio UI

- [x] Add a keyword portfolio page at `/admin/seo-insights/portfolio`
- [x] Show:
  - [x] keyword / cluster
  - [x] source
  - [x] demand proxy
  - [x] competition proxy
  - [x] recommended page type
  - [x] current status
  - [x] whether it has an approved experiment
- [ ] Allow operators to promote a discovery into the existing experiment/proposal flow

### 6. Weekly automation

- [ ] Update the weekly agent so it can nominate at most 1-2 new discovery-lane ideas per run
- [ ] Keep the rest in a scored backlog for human review
- [ ] Paused mode remains read-only

### 7. Tests

- [x] Unit tests for `keywordDiscovery.ts`
- [x] Integration tests for keyword portfolio endpoints
- [x] Frontend tests for the portfolio UI
- [x] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [x] Focused tests pass

### 8. Deploy

- [x] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [x] Run Prisma migration(s) in prod before verification
- [x] Frontend: `./scripts/deploy-frontend.sh`
- [x] Rebuild the portfolio after deploy

### 9. Backend Validation

- [x] Confirm at least 10 keyword portfolio rows exist in prod without paid-provider dependencies
- [ ] Confirm at least 3 opportunities can be promoted into experiment/proposal flows
- [x] Verify source attribution and rationale are visible and understandable
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 30m` — zero errors

### 10. Browser Validation (agent-browser CLI)

- [x] Open the portfolio page: `agent-browser open https://letaiexplainai.com/admin/seo-insights/portfolio`
- [x] Take initial screenshot: `agent-browser screenshot`
- [x] Get refs: `agent-browser snapshot -i`
- [x] Verify sorting/filtering by source and score works
- [ ] Promote one discovery into the existing workflow and confirm the UI reflects the new state
- [ ] Take final screenshot: `agent-browser screenshot`
- [ ] Mobile viewport check for the portfolio page

---

## Definition of Done

- [ ] All tasks above checked
- [x] Keyword portfolio is live in prod
- [ ] Discovery lane works without paid providers by default
- [x] At least 10 portfolio opportunities exist with usable rationale
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

---

## UX Lead Review (2026-05-01)

This sprint adds the **keyword portfolio** surface — the seventh tab in `/admin/seo-insights`, and the most data-dense one. UX bar: rows are sortable on demand × competition × LAEA-fit, source attribution is always visible (so operators can trust the signal), and the "promote to experiment" affordance hands off cleanly to SEOI-9 without re-deriving the proposal flow. See `PLAN-SEO-Insights-Pilot.md` "UX Lead Re-Verification (2026-05-01)" for cross-cutting findings.

### User-facing impact
A new `Portfolio` tab inside `/admin/seo-insights` showing keyword opportunities scored on demand/competition with promote-to-experiment affordance. Admin-only, desktop-first.

### Surface(s) affected
Admin CMS only.

### UX findings

#### 1. IA — Portfolio as the seventh tab (decision point)

After SEOI-11 lands the tab nav holds **7 tabs**: Insights · Actions · Proposals · Clusters · Experiments · Packaging · Portfolio. This crosses a usability threshold.

- [ ] **Mobile (<`md`)**: 7 tabs in a horizontal scroll strip is borderline usable. **Recommendation: collapse to a `<select>` dropdown on mobile** (cross-references SEOI-10 #1 — same decision, ideally made together in SEOI-8 implementation so all later sprints inherit). Alternative: 2-row tab grid at mobile, but that fights vertical real estate.
- [ ] **Desktop**: 7 tabs at full viewport (1280px+) fit on a single row. At `md` (768px) the labels start truncating. Use shorter labels with count chips: `Portfolio (10)` rather than `Keyword Portfolio (10 keywords)`.
- [ ] **Tab content lazy-loads** via React.lazy so 7 tab components don't all bundle on the initial admin shell load.

#### 2. Portfolio table — sortable, filterable, dense (Task 5)

This is the most table-density-friendly surface in the initiative. Operators will scan many rows.

- [ ] **Columns**: `Keyword · Source · Demand · Competition · Page Type · LAEA Fit · Status · Actions`. Demand and competition are the two scoring dimensions — both must be sortable.
- [ ] **Sort indicators**: visible `▲` / `▼` icons in column headers. Active sort column gets bolder weight + the orange-600 active-state color.
- [ ] **Default sort**: by `LAEA Fit` descending — show operators their best-fit opportunities first, not raw demand (which would surface huge unwinnable terms).
- [ ] **Filter chip row above table**: `All sources` / `gsc_cluster` / `google_trends` / `serp_sample` / `editorial_seed` (per the source-type taxonomy from Task 1). Reuse SEOI-2 filter pattern.
- [ ] **Status filter chips** (separate row or right-aligned inline): `discovered` / `scored` / `promoted` / `archived`. Two filter dimensions = two filter rows; don't squash them into one.

#### 3. Source-attribution chips (Task 5)

Operators MUST see "where did this signal come from" because trust in keyword discovery scales with source clarity.

- [ ] **Source pill** in the Source column with icon + text + color:
  - `gsc_cluster` → 📊 chart icon, "GSC cluster", `bg-blue-50 text-blue-700`
  - `google_trends` → 📈 trend icon, "Google Trends", `bg-purple-50 text-purple-700`
  - `serp_sample` → 🔍 search icon, "SERP sample", `bg-amber-50 text-amber-700`
  - `editorial_seed` → ✍️ pen icon, "Editorial seed", `bg-gray-50 text-gray-700`
- [ ] **Source provenance link**: hovering the pill shows a tooltip with the actual source URL or query that triggered the discovery (per `frontend.md` Portal-tooltip pattern). For `gsc_cluster`, the tooltip links to the cluster detail in the Clusters tab (SEOI-8 cross-link).
- [ ] **Dark-mode variants** for each color spec'd above.

#### 4. Demand × competition visualization (Task 4 scoring rubric)

Two scoring dimensions, both numeric. Operators want to see the relationship at a glance.

- [ ] **Inline mini-bar in each column**: render demand as a horizontal bar filling 0-100% of column width, color-tinted by tier (green = high, amber = mid, gray = low). Same for competition (but competition is *inverse*-good — low competition = green, high = red). Side-by-side bars give the "high demand + low competition" pairing instant visibility.
- [ ] **Numeric value next to bar** (e.g. `78`, not just the bar) — so power users can sort and reason about exact scores.
- [ ] **Color blindness**: tier chips next to bars — `H` / `M` / `L` text labels. Bar length carries the visual signal; color is supplementary.

#### 5. Promote-to-experiment affordance (Task 5)

The promotion flow hands off to SEOI-9. UX must communicate "this becomes an experiment" without re-deriving the proposal-drawer pattern.

- [ ] **Promote button** on each portfolio row: primary outline button, label `Promote to experiment`. Click opens a confirmation dialog (`<ConfirmDialog>`) showing:
  - The keyword + scoring summary
  - The recommended page type + URL (from `pageTypeRecommendation` field)
  - "This will create a `SeoExperiment` with the standard D+14/D+28/D+56 review schedule. Continue?"
- [ ] **After promotion**: `react-hot-toast` success toast: "Promoted: `mixture of experts` — experiment scheduled. Open in [Experiments tab]." Toast contains a clickable link to the new experiment.
- [ ] **Status flips to `promoted`** instantly on the portfolio row + the row gets a muted treatment so operators don't double-promote. After 7 days, archived candidates can be filtered out by default.

#### 6. Detail drawer — keyword scoring rationale (Task 5)

Each portfolio row opens a drawer showing the rationale for its scoring. Operators need to understand WHY a keyword scored high/low so they can trust and tune the signal.

- [ ] **Reuse `<Drawer>` primitive**.
- [ ] **Drawer content**:
  - Top: keyword (large), source pill, demand/competition bars (large), LAEA Fit (large)
  - Middle, collapsible: "Why these scores" — plain English explanation, e.g. "Demand: 78. Source `google_trends` shows steady 30-day uplift. Competition: 42. Top SERP results are 3 articles, 1 video, 2 forum posts (mixed quality). LAEA Fit: 84. The atlas already has `mixture of experts` glossary entry + 2 milestones — strong internal-link foundation."
  - Middle, collapsible: linked entities from LAEA's content graph (which persons/orgs/glossary/milestones are most relevant)
  - Bottom: rationale (1-2 paragraphs from the LLM) + action buttons (Promote · Archive)
- [ ] **Mobile**: full-screen modal sheet per the shared `<Drawer>` mobile spec.

#### 7. Reuse pilot primitives

- [ ] **`<Tabs>`** for outer tab nav (seventh tab).
- [ ] **`<Drawer>`** for portfolio detail.
- [ ] **`<EmptyState>`** for "No portfolio entries yet" / "No `editorial_seed` entries — add via the Add Keyword button".
- [ ] **`<ErrorState onRetry={refetch}>`**.
- [ ] **`<LoadingSkeleton lines={8}>`** matching portfolio-row height (taller than other tables due to the inline bars).
- [ ] **`<ConfirmDialog>`** for promote-to-experiment confirmation.

#### 8. State completeness

- [ ] **Loading**: skeleton matching portfolio-row height.
- [ ] **Empty (no portfolio entries)**: `<EmptyState>` with copy and a CTA: "Discovery hasn't run yet — the next weekly agent run will populate the portfolio. Or add an editorial seed manually." CTA button: `Add editorial seed` (opens a form in a drawer for manual entry).
- [ ] **Empty (per-source filter)**: source-aware copy: "No `serp_sample` entries — the SERP sampling source may have failed or returned no qualifying signals."
- [ ] **Error**: `<ErrorState onRetry={refetch}>`.
- [ ] **Degraded**: portfolio entry whose source no longer exists (cluster archived, trend data expired) — show "Source unavailable" muted but keep the entry.
- [ ] **First-time** (no entries ever): one-time helper banner: "Discovery runs weekly. The next run is Monday 13:00 UTC. Force-run via Operations banner if needed."

#### 9. Add-editorial-seed flow

The `editorial_seed` source type is human input — Wylie typing in keywords he wants the system to track.

- [ ] **`Add seed` button** in the page header (top-right, near the filter chips).
- [ ] Click opens a `<Drawer>` (right-side, same as detail) with a small form:
  - Keyword (text input, 1-100 chars)
  - Target intent (select: `informational` / `commercial` / `navigational` — match the typed intent enum if Task 2's spec includes one)
  - Notes (textarea, optional)
  - Submit → POST creates the row with `sourceType: editorial_seed`, `status: scored` (skip discovery, go straight to scoring queue).
- [ ] Form uses controlled inputs + inline validation. Submit disabled while pending.

#### 10. Color-blind safety

- [ ] All status pills use icon + text + color (never color alone).
- [ ] Demand/competition bars include numeric values + tier labels (not bar-color-only signal).
- [ ] Source pills include both icon + text label.

#### 11. Dark mode decision

- [ ] **Match `AdminLayout` light theme** per UX-X1. Source pill `dark:` variants spec'd in #3.

#### 12. Keyboard + a11y

- [ ] Sortable column headers: each is a `<button>` with `aria-sort` attribute reflecting current sort state.
- [ ] Filter chip rows: arrow keys cycle, Enter activates (per WAI-ARIA toggle-button-group pattern).
- [ ] Promote button: keyboard-reachable; `<ConfirmDialog>` traps focus.
- [ ] Add-seed form: full keyboard flow with Tab; Escape dismisses the drawer.
- [ ] Inline demand/competition bars include `aria-label` summarizing the value (e.g. `aria-label="Demand: 78 of 100, high"`).

### Definition of Done additions

- [ ] Portfolio tab + table render correctly at 375px / 768px / 1280px
- [ ] Sortable columns with visible sort indicators
- [ ] All 4 source types have icon + text + color pills (color-blind safe)
- [ ] Promote-to-experiment confirmation flow works end-to-end with toast feedback
- [ ] Add-editorial-seed drawer-form works; new entries appear in the portfolio at status `scored`
- [ ] Mobile tab strip fallback decision (dropdown vs scroll) consistent with SEOI-10's call
- [ ] Lighthouse Accessibility ≥95 with table + drawer + form rendered
- [ ] Inline bars communicate via length + numeric value + tier label, not color alone

### What's correct already

- IA: tab inside `/admin/seo-insights` (seventh tab) — correct, matches established pattern.
- Cap on weekly automated intake (1-2 ideas per run, Task 6) — UX-correct: prevents the portfolio from becoming an unmanageable backlog.
- Linked-experiment relationship via `linkedExperimentId` — correctly hands off to SEOI-9 without re-deriving experiment state.
- Default-no-paid-providers (Task 1) — UX implication: the "source" pill is operationally meaningful (operators can see signal-quality variation by source) rather than vendor-locked.

---

## Tech Lead Review (2026-05-01)

Verification against actual codebase. See `PLAN-SEO-Insights-Pilot.md` "Tech Lead Re-Verification (2026-05-01)" section for cross-cutting findings.

### Critical

(None.)

### Moderate

- **M1. `KeywordOpportunity` model name doesn't collide.** Verified `prisma/schema.prisma`: no existing `Keyword*` models. New name is unambiguous. Adjacent SEO models at this point in the schema: `GscDailyMetric` (247), `GscWeeklySnapshot` (268), `SeoAgentAction` (~292), `SeoProposal` (~314), and (after SEOI-8/9) `GscClusterSnapshot`, `SeoExperiment`. Place `KeywordOpportunity` adjacent to those for grep-ability.
- **M2. `linkedExperimentId` Prisma relation declaration.** Per the SEOI-4 / SEOI-6 / SEOI-9 pattern (and the project rule M-X5 from PLAN), declare:
  ```prisma
  experiment   SeoExperiment? @relation(fields: [linkedExperimentId], references: [id])
  ```
  And the inverse on `SeoExperiment`:
  ```prisma
  keywordOpportunities  KeywordOpportunity[]
  ```
  Cross-references Slop P2-S5. Without these, `prisma.keywordOpportunity.findMany({ include: { experiment: true } })` won't typecheck.
- **M3. `keywordDiscovery.ts` doesn't collide.** Verified `server/src/services/seo/` — no existing discovery service. New file goes in cleanly.
- **M4. `/admin/seo-insights/portfolio` route is unclaimed.** Verified `src/App.tsx`: no existing route. Task 5 needs `const SeoKeywordPortfolioPage = lazy(() => import('./pages/admin/SeoKeywordPortfolioPage'))` + `<Route path="seo-insights/portfolio" element={<SeoKeywordPortfolioPage />} />`. Cross-references Slop P2-S3.
- **M5. "No paid provider" gate (Task 1) — verify before implementing.** Cross-references Slop P2-S4. Two specific concerns:
  - **Google Trends**: no public API. Common libraries (`pytrends`, `google-trends-api`) scrape the Trends UI; Google rate-limits and serves CAPTCHAs to non-browser clients, especially from Lambda IP ranges. Confirm a working headless path before Task 3 ships.
  - **SERP sampling without auth**: Google's public results page often blocks/captchas Lambda traffic. DuckDuckGo HTML or Bing public results may work but provide weaker competition signals. Document the chosen path AND the fallback (e.g., "if SERP sampling fails for >20% of seeds, downgrade to LAEA's own content-graph competition proxy and flag for paid-provider escalation").
  
  If either source fails the headless test, escalate to PM for the "paid provider" decision in `Blocked` #1 — don't quietly add a residential-proxy dependency to make scraping work.
- **M6. IAM update task missing for any new AWS resources.** Task 1 says "Run the relevant `aws [service] list-*` checks first" before provisioning new resources. If the discovery service writes to a new SSM param (e.g., `/ai-timeline/prod/keyword-discovery-config`), the Lambda's IAM policy needs to list that param. Existing IAM policy is scoped to `/ai-timeline/${Environment}/*` (verified in `infra/template.yaml` SSM permissions block) — new params under that prefix are already covered. Just confirm in Task 8 (Deploy).
- **M7. `requireAdmin` import path** — same as SEOI-8 M3 / SEOI-9 Mi3 / SEOI-10 M6. Use `'../middleware/auth'` for the new endpoints implied by Tasks 5-6.

### Minor

- **Mi1. `sourceType` enum vs string** — cross-references Slop P3-S1. The existing Prisma `SourceType` enum (in news ingestion section of schema, per `news-ingestion.md` rule) sets the precedent for typed source enums. Apply the same pattern: add `KeywordSourceType` enum with `gsc_cluster | google_trends | serp_sample | editorial_seed`.
- **Mi2. Cap weekly intake (Task 6)** — agent nominates ≤2 ideas per run. Implement as a hard constant in `keywordDiscovery.ts` (e.g., `WEEKLY_NOMINATION_CAP = 2`) so it's grep-able and tunable in one place.
- **Mi3. Test paths use `/tests/unit/` convention from start.** ✓
- **Mi4. AdminLayout flat-nav constraint (cross-cutting from SEOI-8/9/10).** Recommend the portfolio surface as a tab within `/admin/seo-insights` rather than a new sidebar entry — keeps the SEO surfaces co-located.

### What's verified correct

- `KeywordOpportunity` model name doesn't collide with any of the 50+ existing models ✓
- `keywordDiscovery.ts` file doesn't exist (collision-free) ✓
- `/admin/seo-insights/portfolio` route is unclaimed ✓
- "Default v1 must work with zero new paid vendor dependencies" (Task 1) — explicit cost discipline ✓
- Cap weekly intake (Task 6) — avoids backlog explosion ✓
- Content-graph gap checks (Task 3) — avoids re-deriving what the entity graph already proves ✓
- `linkedExperimentId` ties to SEOI-9's `SeoExperiment` rather than introducing a parallel measurement system ✓
- `aws [service] list-*` checks before any new AWS resource — explicit IaC discipline ✓
- Paused mode read-only honored (Task 6) ✓

### Effort impact

~30-45 min for the patches above. M5 (paid-provider verification) might add 1-2 hours if either Google Trends or SERP sampling fails the headless test, in which case the sprint either narrows scope (`gsc_cluster + editorial_seed` only, defer external sources) or escalates the paid-provider decision to PM.

---

## Slop Findings (AISlopReviewer — 2026-05-01)

Reviewed against the 17-category vibe-code slop checklist + LAEA's centralized systems map. Cross-references the parent PLAN's post-pilot slop section for cross-cutting findings.

### P0

(None.)

### P1

(None.)

### P2

- **P2-S1. `KeywordOpportunity` is the third "discovery/proposal/experiment"-shaped table.** After SEOI-6 (`SeoProposal`), SEOI-9 (`SeoExperiment`), and SEOI-4 (`SeoAgentAction`), the schema now has FOUR overlapping shapes for "approved or candidate SEO action with metadata about target/source/measurement". Without an explicit taxonomy, future devs will either (a) merge two of them by accident, (b) fork yet a fifth table, or (c) duplicate functionality across them. The shapes ARE genuinely different, but the difference must be documented. **Fix:** add to the parent `PLAN-SEO-Insights-Pilot.md` "Data Model Summary" section a 4-row taxonomy:
  - `KeywordOpportunity` — pre-impression demand scouting (no GSC evidence yet exists for the keyword on LAEA pages)
  - `SeoProposal` — post-finding draft (GSC evidence exists; specific page+keyword pair identified)
  - `SeoExperiment` — approved action with scheduled measurement checkpoints (D+14/D+28/D+56)
  - `SeoAgentAction` — auto-shipped change with rollback + single 7-day measured delta
  
  Also add a Prisma `///` comment on `KeywordOpportunity` referencing the taxonomy. Category 2 (Inconsistency / drift if undocumented) + Category 1.1 (Parallel helpers risk).
- **P2-S2. Per-route `requireAdmin` not specified.** New endpoints implied in Tasks 5-6 (portfolio CRUD + promote-to-experiment) need explicit per-route middleware. Same as SEOI-8/9/10 P2-S1. Category 2.
- **P2-S3. `SeoKeywordPortfolioPage` lazy import not addressed.** Files Touched lists `src/pages/admin/SeoKeywordPortfolioPage.tsx`. Plan needs `const SeoKeywordPortfolioPage = lazy(() => import('./pages/admin/SeoKeywordPortfolioPage'))` in `src/App.tsx` matching SEOI-2/4/6. Category 3 (Hallucination — implicit).
- **P2-S4. `google_trends` and `serp_sample` source types — verify "no paid provider" actually holds.** Task 1 says "default v1 must work with zero new paid vendor dependencies." Google Trends has no public API, only Trends UI scraping (via `pytrends` or unofficial libraries) which is rate-limited and unreliable. Public SERP sampling without auth often triggers Google's bot defenses (recaptchas, IP blocks). **Fix:** before Task 3 implementation, add a sub-task to verify each source can actually deliver data without paid auth: "(a) confirm the chosen Google Trends fetch path works headless from Lambda for at least 10 keywords without rate-limit blocks; (b) confirm public SERP sampling (e.g. via DuckDuckGo HTML or Bing public results) returns usable competition signal without auth." If either fails, the "no paid vendor" gate is hit and the sprint needs a different signal source — don't quietly add `puppeteer` + a residential proxy to make scraping work. Category 13 (Dependency hygiene — heavy infra introduced sideways).
- **P2-S5. `linkedExperimentId` foreign-key declaration.** Task 2 lists `linkedExperimentId` as a field. As with SEOI-4's `SeoAgentAction.snapshotId` and SEOI-6's `SeoProposal.snapshotId`/`draftPostId`, this should be declared as a Prisma `@relation`, not a raw FK string, so `prisma.keywordOpportunity.findMany({ include: { experiment: true } })` typechecks. **Fix:**
  ```prisma
  experiment   SeoExperiment? @relation(fields: [linkedExperimentId], references: [id])
  ```
  And the inverse on `SeoExperiment`. Category 2 (Inconsistency / drift — convention violation).

### P3

- **P3-S1. `sourceType` should be a Prisma enum or a documented constants set.** Task 1 lists four sources (`gsc_cluster | google_trends | serp_sample | editorial_seed`). Either declare a `KeywordSourceType` enum in `schema.prisma` (matches Prisma `SourceType` enum precedent in the news ingestion section) or document the allowed-values set in a code constants file imported wherever the field is read/written. Avoids string-typo silent bugs. Minor.

### Slop Avoided

- **"Default v1 must work with zero new paid vendor dependencies"** — Task 1 explicit cost discipline. Avoids Category 13 (Dependency hygiene — paid service for unverified value). (P2-S4 above sharpens the implementation-time check so this stays true.)
- **Cap weekly intake** at 1-2 new discovery-lane ideas (Task 6) so discovery doesn't overwhelm the backlog. Avoids Category 17 (Misreading the task — "AI suggested 200 keywords this week" as success).
- **Content-graph gap checks** ensure LAEA doesn't "discover" keywords for content it already owns (Task 3). Category 1.1 (Parallel helpers — re-deriving what the entity graph already proves) avoided.
- **`linkedExperimentId` ties to SEOI-9's experiment table** rather than introducing a parallel measurement system inside `KeywordOpportunity`. Category 1.1 avoided. (P2-S5 sharpens to make the relation declaration explicit.)
- **Editorial seed source type** — preserves human input as a first-class signal alongside automated discovery. Avoids over-reliance on automated discovery for backlog construction.
- **`aws [service] list-*` checks before any new AWS resource** (Task 1) — explicit IaC discipline. Category 7 (Security pitfalls — surprise infra cost).
- **Paused mode remains read-only** (Task 6). Discovery lane respects the SEOI-5 killswitch boundary.
- **Test paths use `/tests/unit/` convention** (`tests/unit/seo/keywordDiscovery.test.ts`, etc.). ✓
- **No `mcp__claude-in-chrome__*`, no `VITE_*` secrets, no manual AWS console steps, no backwards-compat shims.**
