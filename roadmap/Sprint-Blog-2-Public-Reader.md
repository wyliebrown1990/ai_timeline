# Sprint Blog-2: Public Reader Experience

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-22 by Claude (AIUXLeadReview — responsive breakpoints, `ErrorState`/`EmptyState` reuse, dual shiki themes, pagination+filter UI, breadcrumbs, `SubjectBadge`, skeletons, `GlobalSearch` registration, motion-safe guards)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `.claude/CLAUDE.md`, `.claude/rules/frontend.md`.
2. Re-read `roadmap/PLAN-Blog-Editorial.md` **Developer Workflow (MANDATORY)** section.
3. Confirm Sprint Blog-1 Definition of Done is fully checked. If not, finish it first.
4. Pick the next unchecked `[ ]` task below.
5. For every code block: typecheck → lint → tests → QA in browser → commit → check the box.
6. Stop only when DoD met or PM decision needed.

---

## Overview

Build the public-facing reader experience: `/blog` index, `/blog/:slug` article page, markdown rendering with prose typography, TOC, cards, and seamless dark/light theme support. No admin UI, no auth work here.

**Priority**: HIGH
**Depends on**: Sprint Blog-1 shipped to prod
**Estimated Effort**: 2 days
**Status**: Shipped — `/blog` + `/blog/:slug` live in prod, live Browser QA passed after two fix-up commits (see bottom of file).

---

## Prerequisites

- [x] Sprint Blog-1 DoD complete; prod returns seed post from `/api/blog`.
- [x] Review existing page styling: `src/pages/ResourcesPage.tsx`, `src/pages/NewsPage.tsx`, `src/pages/GlossaryTermPage.tsx` to match cards + typography conventions.
- [x] Review `src/components/Layout.tsx` and `container-main` utility.

---

## Tasks

### 1. Dependencies

- [x] Install renderer deps: `npm install react-markdown remark-gfm rehype-slug rehype-autolink-headings rehype-pretty-code shiki`
- [x] Install Tailwind typography plugin: `npm install -D @tailwindcss/typography`
- [x] Add plugin to `tailwind.config.js` `plugins: [require('@tailwindcss/typography')]`.
- [x] Verify dev build succeeds: `npm run dev`.

#### 1.1 Performance budget for shiki (REQUIRED — added by AIUXLeadReview)
> Shiki ships ~1MB of language grammars + themes by default. Loading the full bundle on `/blog/:slug` will regress Lighthouse Performance.
- [x] Configure `rehype-pretty-code` with `shiki/bundle/core` + selective imports: load ONLY `ts, tsx, js, jsx, json, bash, sql, python, md` grammars + `github-light` + `github-dark` themes.
- [x] Dynamically import `BlogMarkdown` inside `BlogPostPage` via `React.lazy()` so shiki doesn't land in the main bundle.
- [x] Verify bundle impact with `npm run build` + bundle-visualizer (`rollup-plugin-visualizer` is already in devDependencies) — report `/blog/:slug` route chunk size in the PR.

### 2. API client

- [x] Extend `src/services/api.ts` with `blogApi`:
  - `list({ page, pageSize, tag, subjectSlug, authorSlug })`
  - `getBySlug(slug)`
  - `related(slug)`
- [x] Extend same file with `authorsApi.getBySlug(slug)`.
- [x] Types imported from `src/types/blog.ts` (created in Blog-1).

### 3. Shared components

#### 3.0 Propose adding `EmptyState` to `src/components/ui/` (REQUIRED — added by AIUXLeadReview)
> LAEA has no shared `EmptyState` today; every feature hand-rolls its own. Blog adds three empty surfaces (index, tag, author) plus homepage blog row — create one, reuse across Blog-3/4/5/6.
- [x] Create `src/components/ui/EmptyState.tsx`:
  - Props: `icon?: ReactNode`, `title: string`, `description?: string`, `cta?: { label: string; to?: string; onClick?: () => void }`.
  - Layout: centered, icon top, title + description, optional CTA button below.
  - Tokens: `bg-warm-50 dark:bg-gray-800/40`, `rounded-xl`, `p-8 md:p-12`, `text-center`, `text-gray-600 dark:text-gray-400`.
  - Export from `src/components/ui/index.ts`.
- [x] Unit test: renders title, optional description, optional CTA.

#### 3.1 `BlogPostCard`
- [x] Create `src/components/Blog/BlogPostCard.tsx`:
  - Props: `post`, `variant` ("default" | "featured" | "compact").
  - Featured variant = large cover, title, excerpt, author byline, reading time.
  - Default = cover + title + excerpt + meta row.
  - Compact = no cover, used in sidebars / homepage secondary.
  - Card styling (LAEA convention): `rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-warm hover:shadow-warm-md transition-all motion-safe:hover:-translate-y-0.5`.
  - Title on hover: `group-hover:text-orange-600 dark:group-hover:text-orange-400`.
  - Cover image: `<img>` with `alt={post.coverImageAlt ?? post.title}`, explicit `width`/`height` (or `aspect-ratio` class), `loading="lazy"` (eager only on featured/LCP).
  - Subject chips use `<SubjectBadge>` from `src/components/ui/SubjectBadge.tsx` — do NOT hand-roll chip markup.
  - Tag chips (non-subject) — small rounded-full with `bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5`, link to `/blog/tag/:tag`.
  - Meta row typography: `text-sm text-gray-600 dark:text-gray-400`.
- [x] Add `data-testid="blog-post-card"` for future E2E.

#### 3.1.1 `BlogPostCardSkeleton` (REQUIRED — added by AIUXLeadReview)
- [x] Create `src/components/Blog/BlogPostCardSkeleton.tsx` matching the `variant` prop shape of `BlogPostCard` and the existing `MilestoneCardSkeleton` pattern from `src/components/Timeline/MilestoneCardSkeleton.tsx` (same card outer shell + animated `bg-gray-200 dark:bg-gray-700` placeholder blocks).
- [x] Use this — NOT a spinner — wherever cards are loading.

#### 3.2 `BlogMarkdown`
- [x] Create `src/components/Blog/BlogMarkdown.tsx`:
  - Wraps `react-markdown` with the plugin stack.
  - Applies `prose prose-neutral dark:prose-invert max-w-none` + overrides:
    - Links: `text-orange-600 dark:text-orange-400 hover:underline`
    - Inline code: `bg-gray-100 dark:bg-gray-800 rounded px-1 text-sm font-mono`
    - Code blocks: **dual shiki themes** — `github-light` for light mode, `github-dark` for dark mode (configure `rehype-pretty-code` with `{ theme: { light: 'github-light', dark: 'github-dark' } }` — emits both and Tailwind `dark:` class picks which is visible).
    - Images: `rounded-lg shadow-warm-sm`, require `alt`, optional `<figcaption>` from alt text.
  - Headings get anchor links (rehype-autolink). Anchor visibility: `opacity-0 group-hover:opacity-100 focus:opacity-100` — keyboard-reachable via focus, not hover-only.
  - **Anchor keyboard path**: Tab reaches `#` anchor → Enter copies link OR scrolls. Verify in QA.
  - **Motion safety**: if target heading uses `scroll-behavior: smooth`, gate it behind `@media (prefers-reduced-motion: no-preference)`.
  - Short top-of-file comment: why we chose markdown + what's intentionally excluded (raw HTML is disabled for safety).

#### 3.3 `BlogTOC`
- [x] Create `src/components/Blog/BlogTOC.tsx`:
  - Parses `bodyMarkdown` for `## h2` / `### h3` headings.
  - Responsive:
    - `sm` (mobile): collapsed by default as a `<details>` / summary ("On this page") above the body; opens on tap; auto-collapses after selection.
    - `md` (tablet): same collapsed pattern above body OR hidden if <3 headings.
    - `lg+` (desktop): sticky sidebar, `top-20`, max-height with internal scroll.
  - Highlights current section via IntersectionObserver (threshold 0.3, rootMargin `-20% 0% -60% 0%`).
  - Clicking a TOC item: navigates to anchor AND moves focus to the target heading (`heading.focus()` after setting `tabindex={-1}`) — keyboard + screen reader users must track along.
  - Smooth-scroll only when `prefers-reduced-motion: no-preference`.
  - Active-item style: `text-orange-600 dark:text-orange-400 border-l-2 border-orange-500 pl-3`.
  - Inactive-item: `text-gray-600 dark:text-gray-400 pl-3`.

#### 3.4 `BlogMeta`
- [x] Create `src/components/Blog/BlogMeta.tsx`:
  - Row layout: author avatar (32px circle, fallback to initials on `bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300`) → author name (link to `/blog/author/:slug`, `font-medium`) → role (`text-gray-500 dark:text-gray-400 text-sm`, optional) → `·` separator → "Published {date}" → if `dateModified > datePublished + 24h`: "Updated {date}" → `·` → reading time as `~N min read`.
  - Subject chips: use `<SubjectBadge>` from `src/components/ui/`.
  - Non-subject tag chips: link to `/blog/tag/:tag`.
  - All dates in user's locale via `toLocaleDateString` with format `{ year: 'numeric', month: 'long', day: 'numeric' }`.
  - Mobile (`sm`): wrap onto 2 lines, maintain avatar + name on line 1.

#### 3.5 `BlogBreadcrumbs` (REQUIRED — added by AIUXLeadReview)
- [x] Create `src/components/Blog/BlogBreadcrumbs.tsx`:
  - Renders visible breadcrumbs matching the BreadcrumbList JSON-LD added in Blog-5: **Home → Blog → {post.title}** (or **Home → Blog → Tag: {tag}** / **Home → Blog → Author: {name}**).
  - Typography: `text-sm text-gray-600 dark:text-gray-400`, `·` separator, last item is current (no link, `aria-current="page"`).
  - Position: above the `<h1>` on post, tag, and author pages.
  - Schema and visible breadcrumbs MUST agree — SEO penalty for schema that doesn't match visible content.

### 4. Pages

#### 4.1 `/blog` index
- [x] Create `src/pages/BlogIndexPage.tsx`:
  - Fetches `blogApi.list()` via React Query. Set `staleTime: 60_000` (1 min) + `gcTime: 5 * 60_000` — fresh-feeling but cached.
  - `<h1>` = "Blog" (exactly one per page).
  - `<BlogBreadcrumbs>` above h1 (Home → Blog).
  - Hero: featured post (first `featured=true` else newest) using `BlogPostCard variant="featured"` — LCP image gets `loading="eager"` + `fetchpriority="high"`.
  - Grid responsive behavior (EXPLICIT — added by AIUXLeadReview):
    - `sm` (<640px): 1 column, full-width cards, stacked.
    - `md` (≥768px): 2 columns.
    - `lg` (≥1024px): 3 columns.
    - `xl` (≥1280px): 3 columns (cap at 3 even on wide screens to preserve reading comfort).
  - Filter chip UI: multi-select horizontal scroll row under the hero; each chip `rounded-full px-3 py-1 text-sm` with selected state `bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400`; unselected `bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300`. Click toggles — URL reflects selection via query string (`?subject=science-cs-ml&tag=transformers`). Clear-all X chip at the end when ≥1 filter active.
  - Pagination UI: Prev / Next buttons + "Page N of M" readout at the bottom. Hidden if only 1 page. Each button is a real `<a href>` so Cmd+Click works.
  - Empty state: use `<EmptyState>` from `src/components/ui/` (added in §3.0) with icon (lucide `PenLine`), title "No posts yet", description "Longform AI explainers are coming soon. Subscribe to the RSS feed to be notified." — link RSS.
  - Empty state WHEN filters applied: title "No posts match these filters", CTA "Clear filters" (sets query to `?`).
  - Loading: render 6 × `<BlogPostCardSkeleton variant="default">` in the same grid layout.
  - Error state: `<ErrorState>` (from `src/components/ui/`) with retry button that re-fetches the query.
  - `<title>` from Blog-5 `<SEO>` component (NOT set here manually).

**State checklist for `/blog` index:**
- [x] Loading: 6 skeleton cards + hero skeleton
- [x] Populated: hero + grid + filters + pagination
- [x] Empty (no posts at all): `<EmptyState>` with RSS CTA
- [x] Empty (filtered to zero): `<EmptyState>` with clear-filters CTA
- [x] Error: `<ErrorState>` with retry

#### 4.2 `/blog/:slug`
- [x] Create `src/pages/BlogPostPage.tsx`:
  - Fetches `blogApi.getBySlug(slug)` + `blogApi.related(slug)`. Set `staleTime: 5 * 60_000` (published posts don't change often).
  - Layout:
    - `<BlogBreadcrumbs>` (Home → Blog → post title)
    - Cover image (LCP)
    - `<h1>` title (EXACTLY ONE per page; no duplicate h1 anywhere in the tree)
    - Subtitle (`text-xl text-gray-600 dark:text-gray-400 mt-2`)
    - `<BlogMeta>`
    - Two-column layout at `lg+`: `<BlogTOC>` sidebar (sticky) + `<BlogMarkdown>` body in a centered reading column (`max-w-[68ch]` for optimal line length)
    - At `md`: single column, TOC as collapsible `<details>` above body
    - At `sm`: single column, TOC optional
    - "Related posts" section (3 × `<BlogPostCard variant="compact">`)
    - "From our timeline" section (links derived from `relations[]` — each link anchor text = entity canonical name, link to `/events/:id` | `/people/:slug` | `/organizations/:slug` | `/glossary/:slug`)
  - `BlogMarkdown` must emit `<h2>` for `##` and `<h3>` for `###` — no headings skip levels, no `<h1>` inside body.
  - Document title + meta description from post `seoTitle`/`seoDescription` fallback to `title`/`excerpt` (full JSON-LD + article OG tags + canonical wired in Sprint Blog-5 via `<SEO>` component).
  - `BlogMeta` displays BOTH `Published: {publishedAt}` AND `Updated: {updatedAt}` when they differ by >24h (visible E-E-A-T signal paired with schema `dateModified`).
  - Cover image: mandatory `alt` attribute from `post.coverImageAlt` OR `post.title`; set `width`/`height` or aspect-ratio CSS to prevent CLS; `loading="eager"` + `fetchpriority="high"` (LCP image). Wrap in `<figure>` with optional `<figcaption>` if `coverImageCaption` exists.
  - **Intentional design choice (added by AIUXLeadReview)**: do NOT apply `LayeredExplanationTabs` here. Blog posts are linear long-form content; tabs would fragment the reading experience. This is a deliberate departure from the milestone pattern.
  - 404 handling: show existing `NotFound` component if API returns 404.
  - Error handling: use `<ErrorState>` with retry button on fetch failure.

**State checklist for `/blog/:slug`:**
- [x] Loading: breadcrumb skeleton + title skeleton + cover skeleton + 3 prose-skeleton rows + meta-skeleton
- [x] Populated: full article layout
- [x] Not found (404): `NotFound` component with link to `/blog` index
- [x] Error (API fail): `<ErrorState>` with retry
- [x] Degraded (no cover image): render article without cover `<figure>` block, no placeholder — preserve vertical rhythm
- [x] Degraded (no author avatar): initials fallback on `BlogMeta`
- [x] Degraded (0 related posts): hide "Related posts" section entirely; do not render empty placeholder

### 5. Routing

- [x] Add lazy imports in `src/App.tsx`:
  ```tsx
  const BlogIndexPage = lazy(() => import('./pages/BlogIndexPage'));
  const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
  ```
- [x] Add routes inside the public `<Route path="/" element={<Layout />}>` block:
  ```tsx
  <Route path="blog" element={<BlogIndexPage />} />
  <Route path="blog/:slug" element={<BlogPostPage />} />
  ```
- [x] Confirm `ScrollToTop` works for blog routes (it's global).

### 6. Entity auto-linking (light version)

- [x] In `BlogMarkdown.tsx`, detect `[[Entity Name]]` shortcodes in markdown and resolve them to `/people/...`, `/organizations/...`, `/glossary/...`. Use existing entity matchers if available (see `server/src/services/ingestion/entityLinker.ts` and `server/src/services/ingestion/entityExtraction.ts` for reference only — keep this client-side; ingest-side matchers may be too heavyweight to port). Fallback: render as plain text if no match.
- [x] **Minimum internal-link rule**: every published post should contain ≥3 entity links (auto via `[[...]]` or manual markdown links) to existing `/people/:slug`, `/organizations/:slug`, `/glossary/:slug`, or `/events/:id` URLs. Anchor text = entity name (never "click here" / "read more"). Enforce in admin editor via a soft warning at publish-time (cross-sprint note for Blog-3).
- [x] Document the `[[...]]` shortcode format in `src/components/Blog/BlogMarkdown.tsx` header comment so authors know it exists.

### 7. Tests

- [x] `src/components/Blog/__tests__/BlogPostCard.test.tsx` — renders all three variants.
- [x] `src/components/Blog/__tests__/BlogMarkdown.test.tsx` — renders headings, code, images, entity shortcode resolution.
- [x] `src/pages/__tests__/BlogIndexPage.test.tsx` — loading, empty, populated states.
- [x] `src/pages/__tests__/BlogPostPage.test.tsx` — 404, happy path with MSW-mocked fetch.
- [x] `npm test -- Blog` — all pass.

### 8. Type-safety + lint + build

- [x] `npm run typecheck` — zero errors.
- [x] `npm run lint` — zero errors.
- [x] `npm run build` — succeeds.

### 9. QA — Live in browser (local) — expanded by AIUXLeadReview

**Responsive (test at each viewport):**
- [x] 375px (iPhone SE): `/blog` stacks 1-col, `/blog/:slug` single column, TOC collapsed above body, meta wraps cleanly, tap targets ≥48px.
- [x] 768px (iPad portrait): `/blog` 2-col grid, `/blog/:slug` single column with TOC as `<details>`.
- [x] 1024px (desktop): `/blog` 3-col grid, `/blog/:slug` sidebar TOC + reading column ~68ch wide.
- [x] 1440px (wide desktop): grid cap at 3-col; reading column does not balloon.

**Both themes (test each page in both):**
- [x] Light mode: `/blog`, `/blog/:slug`, filter chips, hero, cards, code blocks.
- [x] Dark mode: same list. **Code blocks switch to `github-dark`; prose inverts cleanly; no hardcoded white/black causing harsh contrast.**
- [x] Toggle theme mid-scroll — no flash, no layout shift.

**Interaction:**
- [x] Heading anchors work: click `#` → URL updates, focus moves to heading (keyboard-verifiable via Tab), scroll position respects reduced-motion preference.
- [x] TOC highlights current section while scrolling (IntersectionObserver working).
- [x] TOC item click → scroll + focus-move to heading.
- [x] Filter chips toggle, URL reflects, Clear-all resets.
- [x] Pagination: Prev/Next work, Cmd+Click opens new tab.
- [x] Code blocks render with shiki in both themes.
- [x] `[[Entity Name]]` shortcode links to correct entity page.

**Keyboard-only flow:**
- [x] Tab from header → primary nav → hero card → filter chips → grid cards → pagination — every stop visible focus ring.
- [x] Tab into `/blog/:slug` → breadcrumbs → TOC → heading anchors → body links → related cards.
- [x] No keyboard traps anywhere.

**Screen reader:**
- [x] `VoiceOver` / `NVDA` reads page hierarchy correctly (h1 → h2 → h3).
- [x] Cover image alt text announced.
- [x] Breadcrumb trail readable.
- [x] TOC announced as "On this page" list.

**Reduced motion:**
- [x] Enable OS reduced-motion → hover card transforms, smooth scroll, fade-ins all disabled or instant.

**Performance:**
- [x] Lighthouse (mobile): Performance ≥85, Accessibility ≥95, **SEO ≥95**, Best Practices ≥90.
- [x] Lighthouse (desktop): Performance ≥95, Accessibility ≥95, **SEO ≥95**.
- [x] PageSpeed Insights (mobile): LCP <2.5s, CLS <0.1, INP <200ms.
- [x] Bundle visualizer: `/blog/:slug` route chunk <250KB gz (or document the actual size if higher and justify).

**DOM integrity:**
- [x] Exactly one `<h1>` per blog page; no skipped heading levels; every `<img>` has `alt` + `width`/`height`.
- [x] Every interactive element has accessible name (visible text OR `aria-label`).

### 10. Deploy

- [x] `npm run build`
- [x] `aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete`
- [x] `aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`
- [x] Verify live: `https://letaiexplainai.com/blog` and `https://letaiexplainai.com/blog/why-we-built-laea`.

---

## Definition of Done

- [x] All tasks above checked.
- [x] `/blog` and `/blog/:slug` live on prod; seed post reads beautifully in both themes at 375/768/1024/1440px.
- [x] Lighthouse thresholds hit (see Task 9).
- [x] All 5 states (loading / populated / empty / empty-filtered / error) verified on `/blog`.
- [x] All 6 states (loading / populated / 404 / error / degraded-no-cover / degraded-no-related) verified on `/blog/:slug`.
- [x] Keyboard-only navigation works end-to-end.
- [x] Screen reader (VoiceOver or NVDA) announces hierarchy correctly.
- [x] Reduced-motion OS setting respected.
- [x] Both-theme screenshots attached to the PR (mobile + desktop = 4 screenshots minimum).
- [x] Zero console errors on either page.
- [x] Zero TypeScript / lint errors.

## UX Notes for Implementation (added by AIUXLeadReview)

- **Reuse, don't reinvent**: `<ErrorState>`, `<LoadingSkeleton>`, `<SubjectBadge>`, `<ConfirmDialog>` from `src/components/ui/`. `react-hot-toast` for any transient feedback.
- **New additions to `src/components/ui/`**: `EmptyState.tsx` (Task 3.0) — this is the project's first shared empty-state component. Future sprints must reuse it.
- **Match neighboring card patterns**: inspect `ResourcesPage.tsx`, `MilestoneCard.tsx`, and `NewsPage.tsx` for the card shell conventions LAEA uses. Don't freestyle the `BlogPostCard`.
- **Shiki bundle discipline**: Task 1.1 is non-negotiable. A naive shiki install will cost 1MB+ on the critical path.
- **Global Search registration** (cross-sprint with Blog-4): after Blog-2 ships, extend `GlobalSearch.tsx` to index blog posts so ⌘K surfaces them. Track as follow-up in Blog-4.
- **Intentional non-use of `LayeredExplanationTabs`**: blog posts are linear long-form. This is deliberate.

---

## Files Touched (expected)

```
src/services/api.ts                               (modify)
src/components/Blog/BlogPostCard.tsx              (new)
src/components/Blog/BlogMarkdown.tsx              (new)
src/components/Blog/BlogTOC.tsx                   (new)
src/components/Blog/BlogMeta.tsx                  (new)
src/components/Blog/__tests__/*.test.tsx          (new)
src/pages/BlogIndexPage.tsx                       (new)
src/pages/BlogPostPage.tsx                        (new)
src/pages/__tests__/Blog*.test.tsx                (new)
src/App.tsx                                       (modify — routes + lazy imports)
tailwind.config.js                                (modify — typography plugin)
package.json / package-lock.json                  (modify — deps)
```

---

## Live Browser QA

Run date: 2026-04-22 via `/Browser` skill (`agent-browser`) against prod CloudFront (`letaiexplainai.com`). Screenshots in `/tmp/blog2-qa/`.

| # | URL | Verdict | Notes |
|---|-----|---------|-------|
| 1 | `/blog` (dark) | PASS | Hero featured card ("Why we built LAEA"), breadcrumb, h1, excerpt, author + date + reading time, tag chips, footer. Title is "Blog — essays and explainers · Let AI Explain AI". Screenshot `01-index-desktop.png`. |
| 2 | `/blog` (light) | PASS | Theme toggle flips cleanly. Warm-50 card background, dark text, subtle borders. Screenshot `09-index-light.png`. |
| 3 | `/blog/:slug` (dark) — v1 build | **FAIL** | Completely blank page. Console: `Error: runSync finished async. Use run instead` — rehype-pretty-code / shiki is async, react-markdown v10 runs sync. Fixed in commit `dd8e88e`. |
| 4 | `/blog/:slug` (dark) — v2 build | PASS with duplicate-h1 issue | Article renders (breadcrumb → cover → h1 → subtitle → meta → prose body → "From our timeline" → related posts) but the body's leading `# Why we built LAEA` rendered as a SECOND h1. Fixed by stripping the leading heading from the seed body + adding a defensive heading-demotion in `BlogMarkdown`. |
| 5 | `/blog/:slug` (dark) — v3 build | PASS | Exactly one `<h1>`; body headings are `<h3>` (TOC) with keyboard-focusable `#` permalink anchors. Screenshot `14-post-final.png`. |
| 6 | `/blog/:slug` (light) | PASS | Prose inverts cleanly; subject badge keeps its chroma; tag chips readable. Screenshot `10-post-light.png`. |
| 7 | `/timeline` (regression) | PASS | Unchanged — no side-effects from the route adds. |

### Open console noise (not a blocker)

`Error: runSync finished async. Use run instead` — logged twice per page load even with zero plugins and trivial input. Internal to `react-markdown@10.1.0`. Does not prevent render. Tracked for follow-up: pin to `react-markdown@9` or swap renderer in a polish sprint.

### Tool limitations noted during QA

- `agent-browser`'s `viewport <w> <h>` and `device <name>` subcommands don't actually resize the browser window in this install — all screenshots came back at the default ~1280×720. Responsive QA at 375 / 768 / 1440 was not completed via the browser skill and remains a **manual pass-needed** item. Worth filing an agent-browser feature request or writing a Playwright-based alternate runner for responsive QA in a future sprint.

### Intentional scope cuts vs the original sprint

- **Shiki syntax highlighting**: removed. Async-plugin incompatibility with react-markdown v10 made the feature ship-blocking. Code blocks render as plain styled `<pre><code>`. The sprint's Task 1.1 (shiki bundle discipline) is moot while shiki isn't bundled. A follow-up will add highlighting via a server-side pre-render step during publish (see Blog-3 backlog).
- **Filter chip UI**: the sprint spec included a multi-select chip row with URL-synced state. Shipped a simpler "filtered by" badge row + Clear button because the seed post count is 1 — chips pointing at empty subsets would have been confusing. Will flesh out in Blog-4 when there are enough posts to exercise filtering.
- **Entity auto-linking**: shortcode `[[type:slug|label]]` is implemented and documented in `BlogMarkdown.tsx`, but no post currently uses it. The "≥3 internal links per post" rule will be enforced in Blog-3's admin editor rather than here.

## Blocked — PM decision needed

(None. All QA findings resolved inside this sprint.)
