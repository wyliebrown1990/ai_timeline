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

## UX Lead Review (2026-04-29)

Audited every UI surface against the actual chip/badge conventions in the codebase. Several findings reshape Task 1.1 (component spec), Task 2.6 (Feed insertion), and Task 2.7 (modal placement); two recommendations override the Tech Lead Review.

### Critical (resolved by tasks below)

- **UX-C1 — Two distinct chip families exist; PaywallBadge spec must accommodate both.** Verified: admin chips (Duplicate, Milestone, Status) are `rounded` + flat colors; Feed personalization chips (For You, Learning, Featured) are `rounded-full` + opacity-tint backgrounds. PD-3 Task 1.1 specs **one** style (admin family) and uses it everywhere — that lands wrong on the FeedCard. **Required**: `<PaywallBadge />` accepts a `variant: 'admin' | 'feed'` prop. Class spec per variant:
  - `variant="admin"` (default): `inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200`
  - `variant="feed"`: `inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400`
  
  Match precedent: `IngestedArticlesPage.tsx:683-702` for admin, `FeedCardHeader.tsx:48-66` for feed. Tasks 2.1-2.5 + 2.7 use `admin`; Task 2.6 uses `feed`.

- **UX-C2 — Use lucide `Lock`, not the 🔒 emoji.** Plan offers either. **Verified**: every existing chip in the codebase uses lucide icons (`Copy`, `Star`, `Clock`, `Loader2`, `CheckCircle`, `AlertCircle` — all from `lucide-react`). Mixing emoji breaks visual consistency. Drop the emoji option from Task 1.1; spec lucide `Lock` exclusively at `h-3 w-3` (matches admin chip-strip icon size).

- **UX-C3 — JSON-LD `isAccessibleForFree` task should be DROPPED, not added.** Tech Lead Review M1 recommends emitting `isAccessibleForFree: false` on paywalled news events in `NewsDetailPage.tsx:25`. This is **semantically wrong**: Schema.org's `isAccessibleForFree` describes the page hosting the JSON-LD (LAEA's `/news/:id` page), which is **free to read**. The paywall lives on the upstream source article, not on LAEA. Marking LAEA pages as `isAccessibleForFree: false` would tell Google our pages are paywalled (they aren't) and could violate structured-data guidelines. **Override Tech Lead Review M1**: do NOT add this to PD-3. The visible badge on the LAEA page is the right user-facing signal; no JSON-LD change is appropriate.

### Moderate (resolved by tasks below)

- **UX-M1 — FeedCard insertion point is wrong.** Task 2.6 inserts the badge "near `sourcePublisher` (line ~ 136 / 283)". Verified: line 136 is in the **header** (`FeedCardHeader.tsx:36-77`) where the publisher row sits left, and the personalization-badge cluster (For You / Learning / Featured) sits **right**, next to the Share button. The publisher row is dim text-gray-400; chips there get lost. The right-side cluster is where users' eyes land first on a swipe-card. **Recommend**: render the PaywallBadge at the **front** of the right-side cluster (immediately before the personalization badges), not in the publisher row. Two reasons: (a) it's where chips already live; (b) it's where the eye lands first on mobile when the card swipes in.
  
  Update Task 2.6 to: "Render `<PaywallBadge variant='feed' />` as the first child of the right-side cluster in `FeedCardHeader.tsx:48-66`, before the personalization chips."

- **UX-M2 — Mobile FeedCard width is tight; spec icon-only at small viewports.** The right-side cluster on iPhone 13 (390px) already holds 0–3 personalization badges + Share button (~180-200px). Adding a 4th chip ("Paywalled" full text ≈ 80px wide) risks overflow at 320px (iPhone SE). **Spec a `compact` mode**: `<PaywallBadge variant='feed' compact />` renders icon-only with `aria-label="Paywalled — source article requires subscription"` on the badge wrapper (so screen readers still announce it). Apply `compact` at the FeedCard surface only; full text everywhere else. CSS: hide the text via `hidden sm:inline` on the visible label inside the compact variant. Add to Task 1.1 props: `compact?: boolean` (default false).

- **UX-M3 — Profile-page Recent News rows risk wrap at 320px.** Verified: `flex items-center gap-2 mt-1 text-sm text-gray-500` row already has date + `•` + mentionType. Adding a 4th token to a flex row at 320px is genuinely tight. **Spec**: ensure parent has `flex-wrap` so the badge wraps cleanly to a new line on narrow viewports rather than overflowing. Update Tasks 2.4 and 2.5 to add `flex-wrap` to the metadata row's className if not already present (verify in code).

- **UX-M4 — NewsContextModal needs TWO badge placements, not one.** Task 2.7 says "near `event.sourcePublisher` (line ~ 258), and again near the source-link block (line ~ 466)" but underspecifies. Two placements serve different jobs:
  - **Line ~258 (publisher row, top of modal)**: small inline `<PaywallBadge variant='admin' />` next to the publisher name. Job: tell the reader at modal-open that this source is paywalled.
  - **Line ~466 (source-link block, bottom of modal)**: a more prominent **banner** above the anchor, like:
    ```tsx
    {event.isPaywalled && (
      <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          This source may require a subscription to read in full.
        </p>
      </div>
    )}
    ```
    Job: warn the user at the moment of click-out. The bottom of the modal is the click-out moment; a chip alone is too small for that decision. Spec the banner explicitly in Task 2.7.

- **UX-M5 — Existing admin chips have no `dark:` variants; PaywallBadge will look better than its neighbors.** Verified: `bg-orange-100 text-orange-800` (Duplicate) and the other admin chips ship without dark-mode overrides — they render the same colors in dark mode, which is OK because text-800-on-bg-100 has enough contrast against either page background. PaywallBadge with explicit `dark:bg-amber-900/30 dark:text-amber-200` will look visibly different from its neighbors in dark mode. Two paths:
  - **(Recommended)** Ship PaywallBadge with dark-mode variants AND add a tiny task: "While in `IngestedArticlesPage.tsx:683-702`, also add `dark:bg-orange-900/30 dark:text-orange-300` to the Duplicate chip and `dark:bg-purple-900/30 dark:text-purple-300` to the Milestone Candidate chip." ~6 lines, meaningful UX win for admin in dark mode. Add to PD-3 as **Task 2.8 (admin chip dark-mode retrofit)**.
  - Alternative: drop dark-mode on PaywallBadge to match neighbors. Worse — existing admin chips are slightly broken in dark mode and we'd be entrenching the bug.

- **UX-M6 — Tooltip spec is fine but should be admin-only via prop, not surface-by-surface flag.** Task 1.1 has `showReasonInTooltip?: boolean`. Better: rename to `adminTooltip?: boolean` (more obviously admin-only) and document that public surfaces (Person/Org/Feed/Modal) MUST omit it; admin surfaces (IngestedArticlesPage, ReviewQueue, ArticleDetail) MUST include it. **Verified**: no existing badge in the codebase uses tooltips today, so any tooltip is novel — `title` attribute is the lightest-weight choice and matches no-tooltip-precedent more closely than a portal-based one. ✓ Stick with `title=`.

### Minor

- **UX-Mi1 — Accessibility cleanup opportunity.** Verified: existing admin chips (Duplicate, Milestone, Status) have NO `aria-hidden` on their lucide icons today. PaywallBadge's spec correctly hides the icon and exposes the text label — that's a quality improvement over precedent. Optional follow-up: while writing PaywallBadge, audit `IngestedArticlesPage.tsx:683-702` for missing `aria-hidden="true"` on existing chip icons. ~3 lines. Out of scope; flag for follow-up.

- **UX-Mi2 — Color choice: amber works but verify against Duplicate's orange in DevTools.** Spec uses `amber-100`. The neighboring Duplicate chip is `orange-100`. On Tailwind's palette, amber is yellower (more #FEF3C7) and orange is warmer (more #FFEDD5) — **side-by-side they ARE distinguishable**, but only by a few hue degrees. The lucide `Lock` icon (vs `Copy` icon on Duplicate) is what makes them instantly readable as different chips. Acceptable as spec'd; this finding is just a heads-up for the implementing dev to do a visual side-by-side check during agent-browser QA in Task 3.

- **UX-Mi3 — `<PaywallBadge />` should live alongside `<SubjectBadge />` in `src/components/ui/`.** ✓ Already in plan. Confirms it's the right home and signals that future shared-badge patterns belong here too.

- **UX-Mi4 — No animation in spec; matches existing badge precedent.** ✓ No motion-safe / reduced-motion handling needed. If a future hover state is added (e.g. `hover:bg-amber-200`), wrap the transition in `motion-safe:` per project convention.

### Verified ✓

- `<PaywallBadge />` returning `null` when not paywalled (caller controls visibility) is the right pattern.
- Visible "Paywalled" text + `aria-hidden="true"` on the icon is correct accessibility per WCAG.
- `tests/unit/components/ui/PaywallBadge.test.tsx` is the right test path (matches `tests/unit/components/Blog/BlogPostCard.test.tsx` precedent — `<rootDir>/tests/unit/**`, NOT `src/**/__tests__/`).
- The agent-browser QA section covers light + dark mode + mobile viewport.
- No `mcp__claude-in-chrome__*` references — consistent with project-global rule.
- Sourcemap probe in Section 4 (Deploy) is required and correctly invoked.

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
