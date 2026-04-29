# Sprint PD-3: Frontend — Paywall Badge on every news surface

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-29 by Claude (initial draft)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and `.claude/rules/frontend.md`.
2. Re-read the parent PLAN's **Developer Workflow (MANDATORY)** section.
3. Confirm PD-1 is shipped — API responses include `isPaywalled` + `paywallReason` on every endpoint listed below. If not, finish PD-1 first.
4. Pick the next unchecked `[ ]` task. Exactly one.
5. After every code block: `npm run typecheck` → scoped `npm run lint` → write/update tests → `npm test` → /Browser QA on the affected surface → commit → check the box.
6. Use `/Browser` (agent-browser) for UI validation. Never `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when blocked on a PM decision.

---

## Overview

Render a small `🔒 Paywalled` badge on every UI surface that references an article or news event. One shared component, six insertion points, dark-mode parity, accessibility (text label, not just icon, for screen readers).

**Priority**: MEDIUM
**Depends on**: PD-1 (API responses include the flag)
**Blocks**: Whole initiative DoD
**Estimated Effort**: ~1 day → **revised to ~1.25 days** after Tech Lead Review (one new task: JSON-LD `isAccessibleForFree` markup)
**Status**: Not started

---

## Tech Lead Review (2026-04-29)

Verified all six surfaces and the type-update plumbing. One critical gating finding that depends on PD-1 expansion (covered in PD-1 review C2), one new SEO task to add, and several type-update touch points that weren't fully enumerated.

### Critical (resolved upstream, called out here for visibility)

- **C1 (mirrors PD-1 C2) — Org profile news block is dead code today.** PD-3 Task 2.5 wires the badge into `OrganizationProfilePage.tsx:538`, but the section never renders today because `getBySlugWithRelations` doesn't return `newsEvents` (verified at `server/src/services/organizations.ts:164`). PD-3 Task 2.5 is a no-op until PD-1 Task 5.2 expands to wire the org `newsEvents` fetch. Mark this task as **blocked-on-PD-1** in the prerequisites and order it after the PD-1 deploy.

### Moderate (resolved by tasks below)

- **M1 — Add JSON-LD `isAccessibleForFree: false` to paywalled news events.** Verified `src/pages/NewsDetailPage.tsx:25 generateNewsArticleJsonLd` emits Schema.org `NewsArticle` markup for every news event. Per Google's [paywalled content structured data spec](https://developers.google.com/search/docs/appearance/structured-data/paywalled-content), paywalled articles must include `isAccessibleForFree: false`, otherwise crawlers can interpret short paywalled snippets as cloaking and demote ranking. **New task to add to PD-3 Section 2 (or a new Section 3 "SEO/structured-data")**:
  ```ts
  // In generateNewsArticleJsonLd(event)
  isAccessibleForFree: !event.isPaywalled,
  // Optional: hasPart for free-portion scoping if event has a public excerpt
  ```
  Cheap fix — one field. Schema-org-standard signal Google uses for the paywall label in search results. Bake into v1.

- **M2 — Zod schemas need updating in lockstep with the new fields.** PD-3 doesn't enumerate every Zod/TS shape that reads the new fields. Audit:
  - `src/types/currentEvent.ts:15 CurrentEventSchema` (Zod) — add `isPaywalled: z.boolean().default(false)` and `paywallReason: z.string().optional().nullable()`.
  - `src/types/feed.ts:10 FeedItem` (TS interface, not Zod) — add the same two fields.
  - `src/types/person.ts` and `src/types/organization.ts` — verified neither has a Zod schema for the `newsEvents[]` element today; the array is on `PersonWithRelations` / `OrganizationWithRelations` which are TS interfaces in `src/services/api.ts`. Update the inline shape at `api.ts:3594` (org) and `api.ts:3764` (person).
  - **Two copies of `IngestedArticleListItem`** exist: `src/services/api.ts` (used by `IngestedArticlesPage`) and `extension/src/lib/api.ts:127-134` (used by the extension's recent-submissions panel). Update both — they don't share a source of truth and will drift if only one moves.

- **M3 — `ReviewQueuePage` API response shape must include source-article paywall flag.** Plan task 2.2 inserts the badge on each draft row. Verified the page exists at `src/pages/admin/ReviewQueuePage.tsx`. PD-1 Task 5.1 references "`/api/admin/review/queue`" — confirm the actual route handler (likely `server/src/controllers/review.ts` `getReviewQueue` or similar) selects the source `IngestedArticle.isPaywalled` via the existing `article` relation on `ContentDraft`. If not, PD-1's Task 5.1 needs to extend the queue response. Add a verification step to PD-3 prerequisites: "curl `/api/admin/review/queue` and confirm each draft row carries `article.isPaywalled` (or `isPaywalled` if denormalized)."

### Verified ✓ (no change needed)

- `src/components/ui/` exists; `SubjectBadge.tsx` is the precedent for the new `PaywallBadge.tsx`. Same directory, same naming convention.
- `src/pages/admin/IngestedArticlesPage.tsx` chip-strip lives at lines ~ 680-712; existing `flex-wrap` parent (line 681) handles the additional chip cleanly.
- `src/pages/PersonProfilePage.tsx:536-548` renders `ne.title`, `formatDate(ne.date)`, `ne.mentionType` in a flex row — natural insertion point for the badge.
- `src/components/Feed/FeedCard.tsx:136 / 283` references `item.sourceUrl` and `item.sourcePublisher`; the `item` type is `FeedItem` from `src/types/feed.ts:10`.
- `src/components/CurrentEvents/NewsContextModal.tsx:258 / 466` references `event.sourcePublisher` / `event.sourceUrl`; the `event` type derives from `CurrentEvent` (`src/types/currentEvent.ts:15`).
- agent-browser is the QA tool; no `mcp__claude-in-chrome__*` references — consistent with project-global rule.
- Sourcemap probe step (`curl -sI https://letaiexplainai.com/assets/index.js.map | head -1`) is correctly required before declaring the deploy done — matches `.claude/rules/build-and-deploy-security.md`.

---

## Prerequisites

- [ ] PD-1 deployed to prod; new fields visible on `/api/admin/articles`, `/api/persons/:slug`, `/api/organizations/:slug`, feed/news endpoints
- [ ] At least one paywalled article exists in prod DB (manually create via admin CMS or wait for PD-2 ship)
- [ ] Read `src/components/ui/` end-to-end to understand existing badge / chip conventions (see `LoadingSkeleton`, ConfirmDialog patterns)
- [ ] Read `src/pages/admin/IngestedArticlesPage.tsx` chip-strip rendering (`Duplicate`, `Status`, `Milestone Candidate` near line 680) — the new badge slots into this strip
- [ ] Read `src/components/CurrentEvents/CurrentEventCard.tsx`, `NewsContextModal.tsx`, `Feed/FeedCard.tsx` — note how `sourcePublisher` is rendered today; the badge sits adjacent

---

## Tasks

### 1. Shared `<PaywallBadge />` component

#### 1.1 Create `src/components/ui/PaywallBadge.tsx`

- [ ] New file. Props:
  ```ts
  interface Props {
    paywallReason?: string | null;  // shown in tooltip — admin only
    showReasonInTooltip?: boolean;  // default false (public surfaces); true on /admin/* pages
    size?: 'sm' | 'md';             // default 'sm'
    className?: string;
  }
  ```
- [ ] Visual spec:
  - Background: `bg-amber-100 dark:bg-amber-900/30`
  - Text: `text-amber-800 dark:text-amber-200`
  - Icon: 🔒 (emoji — no new dependency) OR `Lock` from lucide-react if already imported on the page (prefer lucide for consistency with existing chips). Use `aria-hidden="true"` on the icon and put visible text "Paywalled" alongside.
  - Size `sm`: `px-2 py-0.5 text-xs gap-1`
  - Size `md`: `px-2.5 py-1 text-sm gap-1.5`
- [ ] Accessibility: full visible text "Paywalled" (don't rely on icon alone). On admin surfaces, the tooltip shows the `paywallReason` value (e.g. `extension_overlay`); plain `title="Paywalled — reason: extension_overlay"` is fine, no portal needed.
- [ ] Returns `null` when nothing to render — caller controls visibility via `{article.isPaywalled && <PaywallBadge … />}`.

#### 1.2 Tests

- [ ] `tests/unit/components/ui/PaywallBadge.test.tsx`:
  - Renders the visible "Paywalled" text
  - Renders the tooltip / `title` attribute with reason on admin surfaces
  - `size="md"` and `size="sm"` produce different class strings
- [ ] `npm test -- --testPathPatterns=PaywallBadge` — all pass

### 2. Wire into the six surfaces

> Order matters: ship admin surfaces first (low blast radius — only Wylie sees them), then public surfaces.

#### 2.1 Admin articles list (`/admin/articles`)

- [ ] In `src/pages/admin/IngestedArticlesPage.tsx`, near the existing chip strip (~ line 680, the row that already renders Duplicate / Status / Milestone Candidate badges), add:
  ```tsx
  {article.isPaywalled && (
    <PaywallBadge paywallReason={article.paywallReason} showReasonInTooltip />
  )}
  ```
- [ ] Confirm the chip strip wraps cleanly when 4 chips are present (`flex-wrap` is already on the parent — verify).

#### 2.2 Admin review queue (`/admin/review`)

- [ ] Find the equivalent draft-row component in `src/pages/admin/ReviewQueuePage.tsx`. The draft has `articleId`; the API response should include the source article's `isPaywalled` (verify in PD-1's `GET /api/admin/review/queue`). Render the badge.

#### 2.3 Admin article detail (`/admin/articles/:id`)

- [ ] In `src/pages/admin/ArticleDetailPage.tsx`, render the badge in the page header next to the article title.

#### 2.4 Person profile "Recent News" (`/people/:slug`)

- [ ] In `src/pages/PersonProfilePage.tsx` line ~ 536 (`person.newsEvents.slice(0, 5).map((ne) => ( … ))`), add the badge inside the `<Link>` block, in the metadata row (next to date + mentionType):
  ```tsx
  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
    <span>{formatDate(ne.date)}</span>
    <span>•</span>
    <span className="capitalize">{ne.mentionType}</span>
    {ne.isPaywalled && <PaywallBadge paywallReason={ne.paywallReason} />}
  </div>
  ```

#### 2.5 Organization profile "Recent News" (`/organizations/:slug`)

- [ ] Mirror the change in `src/pages/OrganizationProfilePage.tsx` line ~ 538.

#### 2.6 Feed news cards (`FeedCard`)

- [ ] In `src/components/Feed/FeedCard.tsx`, near where `sourcePublisher` renders (line ~ 136 / 283), add:
  ```tsx
  {item.isPaywalled && <PaywallBadge paywallReason={item.paywallReason} className="ml-2" />}
  ```
- [ ] Visually verify the chip doesn't break layout on small viewports.

#### 2.7 News context modal (`NewsContextModal`)

- [ ] In `src/components/CurrentEvents/NewsContextModal.tsx`, near the `event.sourcePublisher` block (line ~ 258), and again near the source-link block (line ~ 466), add the badge.
- [ ] On the source link, prepend the badge so users see it BEFORE deciding to click out.

### 3. /Browser QA

```markdown
- [ ] agent-browser open https://letaiexplainai.com/admin/articles (need an admin login — sideload with a valid token via SSM-fetched JWT or use the existing admin login flow)
- [ ] Verify at least one row shows the Paywalled badge; screenshot
- [ ] agent-browser open https://letaiexplainai.com/people/<a-person-with-paywalled-news>
- [ ] Verify the badge appears in the Recent News block; screenshot
- [ ] agent-browser open https://letaiexplainai.com/news (feed)
- [ ] Verify badge on feed cards; screenshot
- [ ] Toggle dark mode; re-screenshot all three surfaces
- [ ] agent-browser console — zero errors / warnings
```

### 4. Deploy

- [ ] `./scripts/deploy-frontend.sh`
- [ ] Sourcemap probe: `curl -sI https://letaiexplainai.com/assets/index.js.map | head -1` — must NOT return 200 with binary/octet-stream

---

## Definition of Done

- [ ] All tasks above checked
- [ ] `<PaywallBadge />` exists, tested, lint-clean
- [ ] All six surfaces render the badge for paywalled rows on prod
- [ ] Dark mode parity verified via screenshot
- [ ] `npm run typecheck`, scoped `npm run lint`, and targeted `npm test` all green
- [ ] Frontend deployed; sourcemap probe passes
- [ ] Sprint file timestamp updated and committed
- [ ] Manual audit: spot-check 10 random non-paywalled articles in `/admin/articles` and confirm none are mistakenly badged

---

## Files Touched (expected)

```
src/components/ui/PaywallBadge.tsx                            (new)
src/pages/admin/IngestedArticlesPage.tsx                      (modify)
src/pages/admin/ReviewQueuePage.tsx                           (modify)
src/pages/admin/ArticleDetailPage.tsx                         (modify)
src/pages/PersonProfilePage.tsx                               (modify)
src/pages/OrganizationProfilePage.tsx                         (modify)
src/components/Feed/FeedCard.tsx                              (modify)
src/components/CurrentEvents/NewsContextModal.tsx             (modify)

tests/unit/components/ui/PaywallBadge.test.tsx                (new)
```

No backend changes (PD-1 covered it). No new routes. No new dependencies.

---

## Blocked — PM decision needed

1. **Color choice.** Spec uses amber. Existing chip palette on `/admin/articles` already uses orange (Duplicate), purple (Milestone Candidate), and the analysisStatus chip uses status-driven colors. Confirm amber is distinct enough from orange when sitting next to a Duplicate chip, or pick a different color (slate? red?). Recommend amber — it reads as "caution" without competing with destructive red.

2. **Show `paywallReason` to end users?** Currently the spec hides reason on public surfaces (only admins see it). Confirm — or do we want a simple human-facing reason like "This source requires a subscription" on public surfaces too? Recommend hiding reason for v1, revisit if user feedback asks for it.

3. **Optional backfill.** PD-1 left existing rows un-flagged. Decide whether to run a one-shot script over `IngestedArticle` to apply the heuristic to historical content. Recommend: hold off; flag forward only and revisit after a week of data.
