# Sprint SEOI-11: External Discovery + Keyword Portfolio

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-05-01 by Codex (Serper provider decision + cost-governed SERP-sampling plan integrated)

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

The default posture in this sprint is still **lean and cost-aware**, but it is no longer “provider-free”:
- start with GSC clusters, Google Trends, Serper-backed SERP sampling, and LAEA’s own content graph
- Wylie approved Serper on 2026-05-01 for the `serp_sample` lane, so the discipline now becomes “one tightly bounded paid provider”
- do not add a second paid SEO vendor, a scraping/proxy layer, or new billable infra unless Wylie explicitly approves it

This sprint should create a durable keyword portfolio that the weekly agent can feed gradually into the experiment system without drowning the team in speculative ideas.

**Priority**: MEDIUM-HIGH
**Depends on**: SEOI-8 through SEOI-10
**Estimated Effort**: 2-3 days
**Status**: In progress

---

## Serper Notes (captured 2026-05-01 from live browser inspection)

- Live playground confirms the v1 query surface we care about: `Search` type with `q`, `gl`, `hl`, `tbs`, `page`, plus an optional mini-batch mode.
- The generated code sample in the playground uses `POST https://google.serper.dev/search`.
- Live Billing shows top-up pricing rather than a monthly subscription.
- Current starter pack surfaced in Billing: `50,000 credits / $50` (`$1.00 / 1k`), credits valid for `6 months`.
- Auto top-ups exist as a provider-side setting and should remain disabled in v1.
- The inspected account currently shows `0` balance and no payment history, which is good: the plan can assume a clean first paid setup rather than inheriting unknown vendor drift.

---

## Prerequisites

- [x] SEOI-8 through SEOI-10 are stable in prod
- [x] GSC cluster mining and experiment ledger are already trusted
- [x] Wylie approved Serper as the `serp_sample` provider on 2026-05-01
- [ ] Serper account has a payment card on file and the initial credit pack is intentionally chosen
- [ ] Serper auto-top-ups remain disabled
- [ ] SSM params exist for `/ai-timeline/prod/serper-api-key` and `/ai-timeline/prod/serper-pricing-json`
- [ ] Local dev server running: `npm run dev` + `npm run dev:server`

---

## Tasks

### 1. Discovery-source policy

- [x] Document the source hierarchy for v1:
  - `gsc_cluster`
  - `google_trends`
  - `serp_sample`
  - `editorial_seed`
- V1 is intentionally split into:
  - live now: `gsc_cluster`, `editorial_seed`, `google_trends`
  - next up: `serp_sample` via Serper `search`
- [ ] Before provisioning any new AWS resource or changing vendor billing configuration:
  - [ ] Run the relevant `aws [service] list-*` checks first
  - [ ] Estimate costs
  - [ ] Get team approval for billable changes above the default Starter pack or for enabling auto top-ups
- [ ] Lock Serper v1 scope to:
  - [ ] `POST https://google.serper.dev/search` only
  - [ ] request params limited to `q`, `gl`, `hl`, `tbs`, and `page`
  - [ ] `page=1` by default; page 2 only for explicit operator-triggered refresh
  - [ ] no `images`, `news`, `maps`, `places`, `videos`, `shopping`, `scholar`, `patents`, or `autocomplete` endpoints in v1
  - [ ] no proxy layer, no scraping fallback, and no second provider
- [ ] Lock Serper cost controls to:
  - [ ] auto top-ups disabled in Serper Billing
  - [ ] initial pack defaults to Starter `50,000 credits / $50`, valid for 6 months
  - [ ] configurable caps for `maxQueriesPerRun`, `maxQueriesPerDay`, `maxQueriesPerWeek`, and `monthlyCreditBudget`
  - [ ] provider-specific `serperEnabled` flag composes with the existing SEO pause switch
- [ ] Record the pricing basis used for internal spend math in config (`$1.00 / 1k queries` on Starter unless Wylie later approves a different tier)

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
- [ ] Add a Serper cache + metering model, for example `SerpSample`, with fields such as:
  - `keywordOpportunityId`
  - `vendor`
  - `normalizedQueryKey`
  - `query`
  - `country`
  - `language`
  - `dateRange`
  - `page`
  - `creditsUsed`
  - `competitionSummaryJson`
  - `responseJson`
  - `sampledAt`
  - `expiresAt`
- [ ] Generate Prisma migration(s) for any new Serper cache/metering model(s)

### 3. Discovery services

- [x] Create `server/src/services/seo/keywordDiscovery.ts`
- [ ] Implement the discovery flow:
  - [x] GSC clusters that imply adjacent unmet demand
  - [x] Google Trends or equivalent lightweight trend input
  - [ ] Serper `search` sampling that inspects result mix and crude competition proxies
  - [x] content-graph gap checks so LAEA does not “discover” what it already owns
- [ ] Use Serper only after cheaper signals have already shortlisted a candidate:
  - [ ] sample only `gsc_cluster`, `google_trends`, or `editorial_seed` rows that already clear a base score threshold
  - [ ] dedupe by normalized `(q, gl, hl, tbs, page)` key
  - [ ] cache automatic samples for `28` days; manual refresh can bypass only after `7` days
  - [ ] never sample more than one page of results in automatic flows
- [x] Keep competition scoring lightweight and explainable in v1

### 4. Editorial scoring

- [x] Add a scoring rubric that balances:
  - [x] demand proxy
  - [x] competition proxy
  - [x] fit with LAEA’s existing graph
  - [x] ability to support internal linking
  - [x] experiment capacity
- [ ] Make Serper a refinement layer, not the primary ranking signal:
  - [ ] use Serper to refine `competitionProxy` and page-type recommendation
  - [ ] if Serper is paused, over budget, or cache-hit only, keep the non-Serper score path working
- [x] Cap the weekly intake so discovery does not overwhelm the backlog

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
- [x] Allow operators to promote a discovery into the existing experiment/proposal flow
- [ ] Show Serper ops state on the portfolio surface:
  - [ ] credits used this week / month
  - [ ] effective spend in USD based on the approved pricing config
  - [ ] remaining purchased balance and projected depletion date
  - [ ] auto-top-up state (`off` is the default and expected state)
  - [ ] row-level sample freshness (`last sampled`, `cache expires`)

### 6. Weekly automation

- [x] Update the weekly agent so it can nominate at most 1-2 new discovery-lane ideas per run
- [x] Keep the rest in a scored backlog for human review
- [x] Paused mode remains read-only
- [ ] Add Serper spend reporting to the weekly agent:
  - [ ] include this week’s credits used, month-to-date effective spend, remaining purchased balance, and projected depletion date in the digest
  - [ ] if burn crosses 25% / 50% / 75% / 90% of purchased credits, or projected depletion is under 30 days, elevate the warning in the digest and admin ops banner
  - [ ] Wylie receives this spend update automatically as part of the weekly SEO digest; do not rely on manual Serper dashboard checks

### 7. Tests

- [x] Unit tests for `keywordDiscovery.ts`
- [x] Integration tests for keyword portfolio endpoints
- [x] Frontend tests for the portfolio UI
- [x] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [x] Focused tests pass

### 8. Deploy

- [ ] Add `/ai-timeline/prod/serper-api-key` and `/ai-timeline/prod/serper-pricing-json` to SSM and Lambda env
- [ ] Keep Serper auto-top-up disabled after setup
- [ ] Purchase the initial Serper credit pack only once the code path is ready to consume it
- [x] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [x] Run Prisma migration(s) in prod before verification
- [x] Frontend: `./scripts/deploy-frontend.sh`
- [x] Rebuild the portfolio after deploy

### 9. Backend Validation

- [x] Confirm at least 10 keyword portfolio rows exist in prod before Serper is required
- [x] Confirm at least 3 opportunities can be promoted into experiment/proposal flows
- [x] Verify source attribution and rationale are visible and understandable
- [x] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 30m` — zero errors
- [ ] Confirm Serper cache hits prevent duplicate billable requests
- [ ] Confirm internal spend math matches observed Serper credit consumption on a small test batch
- [ ] Confirm the weekly digest/admin ops surface shows Serper usage correctly

### 10. Browser Validation (agent-browser CLI)

- [ ] Open Serper playground: `agent-browser open https://serper.dev/playground`
- [ ] Open Serper billing: `agent-browser open https://serper.dev/billing`
- [ ] Verify the provider settings we rely on are visible: search endpoint flow, Starter pricing, auto-top-up state
- [x] Open the portfolio page: `agent-browser open https://letaiexplainai.com/admin/seo-insights/portfolio`
- [x] Take initial screenshot: `agent-browser screenshot`
- [x] Get refs: `agent-browser snapshot -i`
- [x] Verify sorting/filtering by source and score works
- [x] Promote one discovery into the existing workflow and confirm the UI reflects the new state
- [x] Take final screenshot: `agent-browser screenshot`
- [x] Mobile viewport check for the portfolio page

---

## Definition of Done

- [ ] All tasks above checked
- [x] Keyword portfolio is live in prod
- [ ] Discovery lane works with Serper under hard query caps and cache discipline
- [x] At least 10 portfolio opportunities exist with usable rationale
- [x] At least 3 opportunities can feed into the existing proposal/experiment flow
- [ ] Serper auto-top-up remains disabled and documented
- [ ] Serper spend is visible in the admin and included in the weekly digest
- [ ] Wylie receives automated Serper spend updates without checking Serper manually
- [ ] Tests, typecheck, and lint are clean
- [ ] CloudWatch and browser validation are clean
- [x] Sprint file timestamp updated

---

## Files Touched (expected)

```text
prisma/schema.prisma
prisma/migrations/<ts>_add_keyword_opportunity/
server/src/services/seo/keywordDiscovery.ts
server/src/services/seo/briefGenerator.ts
server/src/controllers/seoAdmin.ts
server/src/routes/seoAdmin.ts
src/pages/admin/SeoKeywordPortfolioPage.tsx
src/components/admin/SeoEditorialSeedDrawer.tsx
src/components/admin/SeoKeywordOpportunityDrawer.tsx
src/services/api.ts
tests/unit/seo/keywordDiscovery.test.ts
tests/unit/seoAdmin.test.ts
tests/unit/pages/admin/SeoKeywordPortfolioPage.test.tsx
.claude/schedules/seo-weekly.md
```

---

## Blocked — PM decision needed

1. **Serper tier escalation.** Starter `50,000 credits / $50` is the default pack. Any move to a higher tier or enabling auto top-ups requires explicit Wylie approval.
2. **Dedicated alert channel.** Default v1 is weekly SEO digest + admin ops visibility for Serper spend. If Wylie wants a separate email/SMS alert channel, decide that before adding a new notification path.
3. **Discovery volume.** Default weekly intake should stay small. If Wylie wants a larger backlog generated automatically, set an explicit review budget first so the queue does not become junk.

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

#### 13. Serper spend visibility

- [ ] Add a compact ops card above the portfolio table showing: `credits used this week`, `effective spend`, `remaining purchased balance`, `projected depletion date`, and `auto-top-up: off`.
- [ ] The same spend summary appears in the row/detail context when a keyword has a fresh `serp_sample`, so operators can see that the paid enrichment is cached and already paid for.
- [ ] Threshold states (`25%`, `50%`, `75%`, `90%` credit burn) use icon + text + color, not color alone.

### Definition of Done additions

- [ ] Portfolio tab + table render correctly at 375px / 768px / 1280px
- [ ] Sortable columns with visible sort indicators
- [ ] All 4 source types have icon + text + color pills (color-blind safe)
- [ ] Promote-to-experiment confirmation flow works end-to-end with toast feedback
- [ ] Add-editorial-seed drawer-form works; new entries appear in the portfolio at status `scored`
- [ ] Mobile tab strip fallback decision (dropdown vs scroll) consistent with SEOI-10's call
- [ ] Lighthouse Accessibility ≥95 with table + drawer + form rendered
- [ ] Inline bars communicate via length + numeric value + tier label, not color alone
- [ ] Serper spend card is visible and understandable on desktop + mobile

### What's correct already

- IA: tab inside `/admin/seo-insights` (seventh tab) — correct, matches established pattern.
- Cap on weekly automated intake (1-2 ideas per run, Task 6) — UX-correct: prevents the portfolio from becoming an unmanageable backlog.
- Linked-experiment relationship via `linkedExperimentId` — correctly hands off to SEOI-9 without re-deriving experiment state.
- Single-provider discipline (Task 1) — UX implication: the `serp_sample` source can stay legible and trustworthy because operators can see both provenance and spend rather than treating paid enrichment as invisible magic.

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
- **M5. Serper is approved, so the key technical question becomes boundary control.** Cross-references Slop P2-S4. The live Serper playground confirms the v1 request shape we should standardize around: `POST https://google.serper.dev/search` with `q`, `gl`, `hl`, `tbs`, and `page`, plus a mini-batch mode that could otherwise make it too easy to overspend. The live Billing page confirms top-up pricing, 6-month credit expiry, and optional auto top-ups. The plan should therefore codify:
  - **Search-only scope**: no other Serper endpoints in v1
  - **Page-1 default**: automatic flows do not fan out to deeper pages
  - **Cache-first behavior**: exact request-key TTL before any repeat call
  - **Internal metering**: compute credits/spend from our own successful requests plus the configured pack price; do not assume Serper exposes a stable billing API we can query from Lambda
  - **Auto-top-up off**: leave the provider-side auto-top-up switch disabled
- **M6. IAM update task missing for any new AWS resources or SSM config.** Task 1 says "Run the relevant `aws [service] list-*` checks first" before provisioning new resources. Existing IAM policy is scoped to `/ai-timeline/${Environment}/*` (verified in `infra/template.yaml` SSM permissions block), so new params such as `/ai-timeline/prod/serper-api-key` and `/ai-timeline/prod/serper-pricing-json` are already within the pattern. Just confirm the env wiring in Task 8 (Deploy).
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
- Serper can be integrated without adding a second vendor or a scraping/proxy stack ✓
- Cap weekly intake (Task 6) — avoids backlog explosion ✓
- Content-graph gap checks (Task 3) — avoids re-deriving what the entity graph already proves ✓
- `linkedExperimentId` ties to SEOI-9's `SeoExperiment` rather than introducing a parallel measurement system ✓
- `aws [service] list-*` checks before any new AWS resource — explicit IaC discipline ✓
- Paused mode read-only honored (Task 6) ✓

### Effort impact

~45-75 min for the patches above. The extra work versus the original plan is not scraping-validation anymore; it is metering + cache discipline + ops visibility so Serper stays cheap and explainable after it lands.

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
- **P2-S4. Paid-provider scope creep is now the main `serp_sample` risk.** Serper is approved, which is cleaner than scraping, but it introduces a different failure mode: v1 quietly broadens from a narrow `search`-only enrichment layer into a general-purpose paid search dependency. The risk surfaces as page-2 fan-out, multi-endpoint expansion (`news`, `images`, etc.), auto-top-ups, missing cache TTLs, or adding a second SERP vendor without revisiting the budget model. **Fix:** Task 1 and Task 3 must explicitly codify search-only scope, page-1-only automatic flows, request-key caching, provider-specific caps, auto-top-up off, and internal spend reporting to Wylie. Category 13 (Dependency hygiene — paid dependency allowed to sprawl sideways).
- **P2-S5. `linkedExperimentId` foreign-key declaration.** Task 2 lists `linkedExperimentId` as a field. As with SEOI-4's `SeoAgentAction.snapshotId` and SEOI-6's `SeoProposal.snapshotId`/`draftPostId`, this should be declared as a Prisma `@relation`, not a raw FK string, so `prisma.keywordOpportunity.findMany({ include: { experiment: true } })` typechecks. **Fix:**
  ```prisma
  experiment   SeoExperiment? @relation(fields: [linkedExperimentId], references: [id])
  ```
  And the inverse on `SeoExperiment`. Category 2 (Inconsistency / drift — convention violation).

### P3

- **P3-S1. `sourceType` should be a Prisma enum or a documented constants set.** Task 1 lists four sources (`gsc_cluster | google_trends | serp_sample | editorial_seed`). Either declare a `KeywordSourceType` enum in `schema.prisma` (matches Prisma `SourceType` enum precedent in the news ingestion section) or document the allowed-values set in a code constants file imported wherever the field is read/written. Avoids string-typo silent bugs. Minor.

### Slop Avoided

- **Single-provider, search-only discipline** — Task 1 now explicitly bounds Serper to one narrow lane with caps, cache TTLs, and auto-top-up off. Avoids Category 13 (Dependency hygiene — paid service expanding past its justified scope).
- **Cap weekly intake** at 1-2 new discovery-lane ideas (Task 6) so discovery doesn't overwhelm the backlog. Avoids Category 17 (Misreading the task — "AI suggested 200 keywords this week" as success).
- **Content-graph gap checks** ensure LAEA doesn't "discover" keywords for content it already owns (Task 3). Category 1.1 (Parallel helpers — re-deriving what the entity graph already proves) avoided.
- **`linkedExperimentId` ties to SEOI-9's experiment table** rather than introducing a parallel measurement system inside `KeywordOpportunity`. Category 1.1 avoided. (P2-S5 sharpens to make the relation declaration explicit.)
- **Editorial seed source type** — preserves human input as a first-class signal alongside automated discovery. Avoids over-reliance on automated discovery for backlog construction.
- **`aws [service] list-*` checks before any new AWS resource** (Task 1) — explicit IaC discipline. Category 7 (Security pitfalls — surprise infra cost).
- **Paused mode remains read-only** (Task 6). Discovery lane respects the SEOI-5 killswitch boundary.
- **Test paths use `/tests/unit/` convention** (`tests/unit/seo/keywordDiscovery.test.ts`, etc.). ✓
- **No `mcp__claude-in-chrome__*`, no `VITE_*` secrets, no manual AWS console steps, no backwards-compat shims.**
