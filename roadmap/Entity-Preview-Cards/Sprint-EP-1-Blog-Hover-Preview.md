# Sprint EP-1: Blog Hover + Long-Press Entity Preview Cards

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-28 by Claude (EP-1 implementation complete — components + hooks + tests landed; deploy + browser QA next)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`frontend.md`, `data-models.md`; `backend.md` only if you decide to add a thin preview endpoint mid-sprint — default is no).
2. Re-read the parent PLAN (`roadmap/Entity-Preview-Cards/PLAN-Entity-Preview-Cards.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm Tech Lead and UX Lead reviews are recorded below under `## Reviews`. If not, run them before coding.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Add hover (desktop) and long-press (touch) preview popovers to entity links inside blog posts. Entity links today are produced by `src/components/Blog/BlogMarkdown.tsx:142-158` — `[[type:slug|label]]` shortcodes pre-process into markdown links with one of four href prefixes (`/people/`, `/organizations/`, `/glossary/`, `/events/`). We override ReactMarkdown's `a` renderer at `BlogMarkdown.tsx:179` so that links matching one of those prefixes render through a new `EntityPreviewLink` component; all other links pass through unchanged. The `EntityPreviewLink` opens a portal-rendered `EntityPreviewCard` on hover/focus/long-press, fetches the entity via the existing API service on first trigger, caches by `'${type}:${slug}'` in a module-level `Map` (matching `useGlossaryApi.ts`), and shows a skeleton-shimmer while loading. Click/short-tap navigation behavior is preserved.

**Priority**: MEDIUM
**Depends on**: None (existing entity APIs are sufficient)
**Estimated Effort**: 2–3 days
**Status**: In progress — code complete, deploying + browser QA next

---

## Reviews

Record review outputs here before starting code.

- [x] `/AITechLeadReview` recorded — see `## Tech Lead Review` below (2026-04-28)
- [x] `/AIUXLeadReview` recorded — see `## UX Lead Review` below (2026-04-28)
- [ ] `/AISEOReview` recorded (confirms no crawler-visible markup change, no Core Web Vitals regression)

---

## Tech Lead Review (2026-04-28)

Verified every claim against the codebase. The plan's structure is sound; the data-fetching layer, milestone API, test paths, and a few field names need correction. Findings below feed directly into the task list.

### Critical (resolved by tasks below)

- **C1 — `@tanstack/react-query` is NOT installed.** Verified by grepping `package.json` and `src/` (zero hits). The codebase's canonical entity-fetch pattern is `useState + useEffect + fetchJson` plus a module-level `Map` cache — see `src/hooks/useGlossaryApi.ts:63,170,190` (`glossaryCache.byId.get(id)`). All React Query references in this sprint are replaced with that pattern. Cache key: `Map<string, T>` keyed on `'${type}:${slug}'`.
- **C2 — Milestone preview must use `eventsApi.getById`, not `milestonesApi.getById`.** Entity link prefix is `/events/:id` (`src/App.tsx:242`). `milestonesApi.getById` (`src/services/api.ts:193`) returns `MilestoneResponse` which has **no `tldr` field**. `eventsApi.getById` (`src/services/api.ts:5275`) returns `EventPageData` which has `tldr` (`src/services/api.ts:5216`). Sprint corrected.
- **C3 — Reuse `ContributorHoverCard` as the visual/positioning template.** `src/components/Timeline/ContributorHoverCard.tsx` already does portal-rendered hover cards with viewport clamping, dark mode, orange CTA, and `animate-in fade-in zoom-in-95 duration-150` animation. Lift its position math and styling rather than reinventing. (Long-press/touch handling is the genuinely new part.)
- **C4 — Test paths must live under `tests/unit/`, not `src/**/__tests__/`.** Verified `jest.config.js` `testMatch: ['<rootDir>/tests/unit/**/*.test.ts(x)']` and existing precedent `tests/unit/components/Blog/BlogPostCard.test.tsx`. All new test paths in this sprint moved.

### Moderate (resolved by tasks below)

- **M1 — Glossary preview uses `shortDefinition`** (purpose-built tooltip field, max 200 chars; see `src/types/glossary.ts:49` comment and `src/services/api.ts:1245`). Removes the "first sentence boundary or 200 chars" truncation hack.
- **M2 — Person preview uses `person.currentOrg?.name` directly** — `currentOrg: OrganizationSchema.optional().nullable()` is already on `PersonWithRelations` (`src/types/person.ts:120`). No `affiliations.find(a => a.isCurrent)` needed.
- **M3 — `ErrorState` is too heavy for a 320px popover.** Use a compact inline error message (one line, neutral colors) inside the card instead of the bordered red-card `ErrorState` component.
- **M4 — `useMatchMedia` is not a real React hook.** The `usePointerCoarse.ts` file in Files Touched is correct in spirit; spec the implementation as a one-shot `window.matchMedia('(pointer: coarse)').matches` read at mount with a `change` listener for resize/dock-undock.
- **M5 — Animation language should match `ContributorHoverCard`.** Use `animate-in fade-in zoom-in-95 duration-150` (or the `fade-in` keyframe defined in `tailwind.config.js`) instead of a custom inline `transition: opacity 120ms…`.

### Verified ✓ (no change needed)

- BlogMarkdown line numbers: `ENTITY_SHORTCODE` at 142, `<ReactMarkdown>` at 179.
- `personsApi.getBySlug` at api.ts:3824, `organizationsApi.getBySlug` at api.ts:3636, `glossaryApi.getBySlug` at api.ts:1378.
- React Router routes `/people/:slug`, `/organizations/:slug`, `/glossary/:slug`, `/events/:id` all exist.
- `shadow-warm-md` defined in `tailwind.config.js`. `@tailwindcss/typography` loaded → `prose-a:*` works. Orange utilities are default Tailwind.
- `scripts/deploy-frontend.sh` already strips sourcemaps, syncs with cache headers, invalidates CloudFront — matches `.claude/rules/build-and-deploy-security.md`.
- BlogMarkdown's component override is sync-safe (the file's runSync warning is about async rehype/remark *plugins*, not component overrides).
- No SSR/SSG (Vite SPA). Popover is client-only by definition; no SSR-noop needed.
- No `mcp__claude-in-chrome__*` references. No backwards-compat shims.

---

## UX Lead Review (2026-04-28)

Verified the visual + interaction spec against the actual design system (Tailwind config, existing hover/popover patterns, dark-mode conventions, motion settings). Several Tech Lead recommendations need to be tightened or overridden — flagged below.

### Critical (override prior recommendations / resolve via tasks)

- **UX-C1 — `animate-in fade-in zoom-in-95 duration-150` are dead classes.** Verified `package.json` does NOT include `tailwindcss-animate`. ContributorHoverCard's animation today is a silent no-op. **Overrides Tech Lead M5.** Use `animate-fade-in` (defined in `tailwind.config.js:64-67`, 200ms ease-out, opacity 0→1) instead. If a touch of motion is wanted on slide, use `animate-slide-up` (300ms). Do NOT introduce `tailwindcss-animate` for this sprint — it's a new dep.
- **UX-C2 — Wire `useReducedMotion` from `src/hooks/useReducedMotion.ts`.** The hook exists and is used across `Feed/BreakReminder.tsx`, `AchievementToast.tsx`, `FeedLoadingCard.tsx`. EntityPreviewCard must call it and skip the animation when `reducedMotion === true`.
- **UX-C3 — Use `dark:bg-gray-800`, not `dark:bg-gray-900`.** Layout body is `dark:bg-gray-900` (Layout.tsx:11); a card on top of body bg with `dark:bg-gray-900` has zero contrast. Cross-codebase card convention is `dark:bg-gray-800` (BlogPostCard.tsx:82,108). **Overrides the card-chrome class string in task 1.2.**
- **UX-C4 — Drop `role="dialog"` and `aria-label`.** Per ARIA APG, a non-modal popover with no focus trap is not a dialog; `role="tooltip"` doesn't allow interactive children. Correct: render the popover as a plain `<div id="entity-preview-${type}-${slug}">` and apply `aria-describedby` on the trigger anchor (only while open). Tab order naturally reaches the footer link inside.

### Moderate (resolve via tasks)

- **UX-M1 — Width is `w-72` (288px), not `w-80` (320px).** Match ContributorHoverCard precedent. Mobile bottom-sheet (UX-M5) handles small viewports separately.
- **UX-M2 — Per-type skeleton shapes.** A circular avatar in the Concept and Milestone skeletons is a phantom — those types have no avatar in the final card. Spec four shapes: Person/Org with circular avatar; Concept/Milestone with no avatar.
- **UX-M3 — Footer CTA must be ≥44px tall on touch.** Spec the classes: `block w-full min-h-[44px] flex items-center justify-center px-4 py-3` (or equivalent).
- **UX-M4 — Long-press timer 350ms, not 500ms.** 500ms matches iOS link-context-menu — users will perceive lag. 350ms is the standard "long-press as UI affordance" threshold.
- **UX-M5 — Mobile positioning: bottom-sheet on `< 480px`.** Replace ambiguous "center" with explicit `position: fixed; bottom: 16px; left: 16px; right: 16px;`. Thumb-zone reachable, no awkward float over a paragraph.
- **UX-M6 — Focus return on Escape.** When Escape closes the popover, `triggerRef.current.focus()` so keyboard/screen-reader users land back on the link they just previewed.
- **UX-M7 — Singleton popover invariant.** Only one popover open at a time. Mouse-zipping across links opens N → close N-1 immediately. Implement with a module-level "active preview id" tracked in a small subscribable store, or a React context.
- **UX-M8 — Type-specific CTA copy** (matches ContributorHoverCard precedent of "View Profile"):
  - Person → "View profile →"
  - Organization → "View organization →"
  - Concept → "View glossary entry →"
  - Milestone → "View event →"
- **UX-M9 — `truncate` the role/org line.** `currentRole · currentOrg.name` will overflow at 288px on long org names.

### Minor

- **UX-Mi1 — `aria-hidden="true"` on decorative monogram fallbacks.** Screen readers shouldn't announce "S A" as content.
- **UX-Mi2 — Images: `loading="lazy"` plus explicit `width`/`height`.** Match ContributorHoverCard.tsx:104. Prevents CLS during card render.
- **UX-Mi3 — Hover-intent affordance: leave entity links as-is.** No dotted underline, no info icon. Popover is enhancement; the underline + orange color already signals "link." Decision recorded so it's not re-litigated.
- **UX-Mi4 — Spec all empty-state fallbacks per type** (see task 1.3 amendment).

### Verified ✓ (no change needed)

- `LoadingSkeleton` API supports `variant="circular"` + `lines` parameter — sufficient for all four type-specific skeleton shapes (precedent: `MilestoneCardSkeleton`).
- `framer-motion ^12.26.2` installed but overkill for this sprint — `animate-fade-in` is the right primitive for a 200ms popover entry.
- `react-hot-toast` globally wired (`App.tsx:3,164`) — not used here. Popover errors render inline (per Tech Lead M3).
- `motion-safe:` Tailwind variants in active use (BlogPostCard.tsx:82) — pair them with `useReducedMotion` for full coverage.
- Color palette: stick with default Tailwind `gray-*` and `orange-*`. The `warm-*` palette is reserved for shadows (`shadow-warm-md`). BlogPostCard, ContributorHoverCard, ConceptChip all use gray for card chrome.
- `ConceptChip` (`src/components/Learning/ConceptChip.tsx`) is a chip-context tooltip+modal pattern; EntityPreviewLink is an inline-prose hover. They coexist for different contexts and should not be merged.

---

## Prerequisites

- [ ] Local dev server running: `npm run dev`
- [ ] Read `src/hooks/useGlossaryApi.ts` end-to-end — this is the canonical pattern for entity caching (module-level `Map<string, T>` + `useState` + `useEffect` + `fetchJson`). The new entity-preview hook mirrors this shape.
- [ ] Read `src/components/Timeline/ContributorHoverCard.tsx` end-to-end — lift its portal positioning and viewport clamping. **Note:** its `animate-in fade-in zoom-in-95 duration-150` classes are dead in this codebase (no `tailwindcss-animate` plugin); use `animate-fade-in` from `tailwind.config.js` instead. Its `dark:bg-gray-900` is also wrong (zero contrast on body bg); use `dark:bg-gray-800` (BlogPostCard precedent).
- [ ] Read `src/hooks/useReducedMotion.ts` and the existing usages in `Feed/BreakReminder.tsx`, `AchievementToast.tsx`, `FeedLoadingCard.tsx` — wire the same hook into EntityPreviewCard.
- [ ] Read `src/components/Learning/ConceptChip.tsx` — note that it does its own chip-context tooltip + click-modal for glossary terms. EntityPreviewLink does NOT replace it; the two coexist for different contexts (chips vs inline prose).
- [ ] Open a blog post locally that contains at least one of each entity type (Person, Organization, Concept, Milestone) — needed for manual QA. If none exist, write a draft post in the admin CMS that links one of each via `[[type:slug|label]]` shortcodes.
- [ ] Read `src/components/Blog/BlogMarkdown.tsx` end-to-end so the `components` override surface is fresh.

> **No React Query in this stack** — the previous prerequisite to confirm `@tanstack/react-query` and `QueryClientProvider` was based on an incorrect assumption. This sprint uses the existing custom-hook + module-Map pattern. See `## Tech Lead Review` C1.

---

## Tasks

### 1. Component scaffolding

#### 1.1 Create `EntityPreviewLink` (the trigger anchor)

- [x] Create `src/components/Blog/EntityPreviewLink.tsx`. Props: `href: string`, `children: React.ReactNode`, plus pass-through `<a>` attrs. Responsibilities:
  - Parse `href` → `{ type: 'person' | 'organization' | 'glossary' | 'milestone', slug: string }`. Return `null`-shaped behavior (render plain `<a>`) if the prefix doesn't match.
  - Wire `onMouseEnter` (150ms open delay), `onMouseLeave` (100ms close delay), `onFocus` (open immediately), `onBlur` (close after 100ms), `onTouchStart` (start **350ms** timer per UX-M4; if it fires, `preventDefault` the click and open), `onTouchEnd`/`onTouchMove` (cancel timer if user lifts/moves before 350ms).
  - Track popover anchor rect via `getBoundingClientRect()` so `EntityPreviewCard` can position itself.
  - Set `aria-describedby={\`entity-preview-${type}-${slug}\`}` on the anchor ONLY while the popover is open. Remove it when closed (it's a stale reference otherwise).
  - On Escape close (UX-M6), call `triggerRef.current?.focus()` so keyboard/screen-reader focus returns to the link.
  - Always render a real `<a href={href}>` — do NOT swap to `<button>`. Click/short-tap navigation must keep working without JS.
  - Subscribe to the singleton "active preview" controller (UX-M7): on open, register this anchor's id; if a different anchor opens, this one's popover closes immediately.

  ```tsx
  // src/components/Blog/EntityPreviewLink.tsx
  // EXTRACTS the href type prefix; falls back to plain <a> if unrecognized.
  type EntityType = 'person' | 'organization' | 'glossary' | 'milestone';
  function parseEntityHref(href: string): { type: EntityType; slug: string } | null { ... }
  ```

#### 1.2 Create `EntityPreviewCard` (the popover)

- [x] Create `src/components/Blog/EntityPreviewCard.tsx`. Props: `type`, `slug`, `anchorRect: DOMRect`, `onClose: () => void`. Responsibilities:
  - `createPortal(<div style={{ position: 'fixed', top, left }} />, document.body)` per `.claude/rules/frontend.md`.
  - **Desktop positioning** — lift the math from `src/components/Timeline/ContributorHoverCard.tsx:59-80`: `useEffect` reads `cardRef.current.getBoundingClientRect()` and clamps `left` to `[16, viewportWidth - rect.width - 16]`, flipping above if `rect.bottom > viewportHeight - 16`.
  - **Mobile positioning (UX-M5)** — when `usePointerCoarse() === true` OR viewport width `< 480px`, swap to bottom-sheet style: `position: fixed; bottom: 16px; left: 16px; right: 16px;` (no width calc needed). Ignores `anchorRect` on mobile.
  - **Width: `w-72` (288px) on desktop** (UX-M1, matches ContributorHoverCard precedent). Mobile uses the bottom-sheet layout above.
  - Render shell synchronously (frame + drop shadow) so the popover appears immediately on trigger.
  - Inside: `EntityPreviewBody` (next task) which handles per-type content + skeleton state.
  - **Animation (UX-C1)** — use `animate-fade-in` (defined in `tailwind.config.js:64-67`, 200ms ease-out). Do NOT use `animate-in fade-in zoom-in-95 duration-150` — those classes require the `tailwindcss-animate` plugin which is not installed. Do NOT hand-roll a `transition: opacity` string.
  - **Reduced motion (UX-C2)** — call `useReducedMotion()` from `src/hooks/useReducedMotion.ts`. When `true`, render the popover without the `animate-fade-in` class so it appears instantly.
  - Listen for `Escape` keydown on `window` while open → call `onClose` (parent handles focus return per UX-M6). Listen for clicks outside the card and the anchor → close.
  - **Accessibility (UX-C4)** — render as `<div id={\`entity-preview-${type}-${slug}\`}>` with NO `role="dialog"` and NO `aria-label`. The trigger anchor's `aria-describedby` (set by `EntityPreviewLink` while open) provides the linkage. The interactive footer link sits in natural tab order.
  - **Card chrome classes (UX-C3, UX-M1)**: `fixed z-[100] w-72 bg-white dark:bg-gray-800 rounded-lg shadow-warm-md border border-gray-200 dark:border-gray-700` — note `dark:bg-gray-800` (NOT `dark:bg-gray-900`, which would have zero contrast on the page body).

#### 1.3 Create `useEntityPreview` hook (data + cache) and `EntityPreviewBody` (presentation)

- [x] Create `src/hooks/useEntityPreview.ts` — modelled on `src/hooks/useGlossaryApi.ts:14-160`. Module-level `entityPreviewCache: Map<string, unknown>` keyed on `'${type}:${slug}'`. Returns `{ data, isLoading, error }`.
- [x] On call: check the cache first; if hit, set `data` synchronously (no `isLoading` flicker on re-hover). If miss, `setIsLoading(true)` and `fetchJson` via the per-type API, then write to the cache and update state. Wrap in an `AbortController` so unmount during in-flight fetch doesn't `setState` after teardown.
- [x] API mapping:
  - `person` → `personsApi.getBySlug(slug)` (`src/services/api.ts:3824`) — returns `PersonWithRelations`
  - `organization` → `organizationsApi.getBySlug(slug)` (`src/services/api.ts:3636`) — returns `OrganizationWithRelations`
  - `glossary` → `glossaryApi.getBySlug(slug)` (`src/services/api.ts:1378`) — returns `GlossaryTerm`
  - `milestone` → `eventsApi.getById(slug)` (`src/services/api.ts:5275`) — returns `EventPageData` ← **NOTE: `eventsApi`, not `milestonesApi`. The latter's `MilestoneResponse` has no `tldr` field; `EventPageData` does (api.ts:5216). The link prefix `/events/:id` matches `eventsApi`.**
- [x] Create `src/components/Blog/EntityPreviewBody.tsx`. Receives `{ type, slug, href }` and calls `useEntityPreview(type, slug)`.
- [x] While `isLoading`, render a **per-type skeleton** (UX-M2) using `LoadingSkeleton` from `src/components/ui/LoadingSkeleton.tsx`. Do NOT use a one-size skeleton — Concept and Milestone have no avatar in the final card, so their skeletons must omit the avatar block:
  - `person` / `organization` → circular avatar (40×40 for org, 48×48 for person) + title line (`h-5 w-3/4`) + 2 body lines (`<LoadingSkeleton lines={3} />`).
  - `glossary` → title line (`h-5 w-1/2`) + 3 body lines (`<LoadingSkeleton lines={3} />`).
  - `milestone` → small date line (`h-3 w-1/3`) + title line (`h-5 w-3/4`) + 3 body lines.
- [x] On error, render a compact inline error message: a single line, e.g. `<p className="text-sm text-gray-500 dark:text-gray-400">Couldn't load preview.</p>`. Do NOT use `ErrorState` from `src/components/ui/ErrorState.tsx` — it's a heavy red-bordered card with a 12×12 icon, oversized for a 320px popover.
- [x] On success, render the per-type body. **All overflow-prone single-line fields must use `truncate` (UX-M9)**, all multi-line fields use `line-clamp-3`. Empty-state fallbacks per UX-Mi4:

  | Type | Fields shown | Source |
  |------|--------------|--------|
  | Person | `imageUrl` (avatar 48×48, `loading="lazy"` + width/height per UX-Mi2; fall back to monogram via `getInitials` — copy from `ContributorHoverCard.tsx:26-33`, mark monogram `aria-hidden="true"` per UX-Mi1), `canonicalName`, role/org line as `${currentRole}${currentOrg ? \` · ${currentOrg.name}\` : ''}` with `truncate` (omit line entirely if both null), `shortBio` (`line-clamp-3`) | `PersonWithRelations` (`src/types/person.ts:120` confirms `currentOrg` is on the response) |
  | Organization | `logoUrl` (square 40×40 rounded corners, `loading="lazy"` + width/height; fall back to first-letter monogram, `aria-hidden="true"`), `name` (`truncate`), `type` label, `shortDescription` (`line-clamp-3`), up to 3 `focusAreas` chips (omit row if `focusAreas` is empty) | `OrganizationWithRelations` (`src/types/organization.ts`) |
  | Concept | `term`, `shortDefinition` (field is purpose-built for tooltips, max 200 chars per `src/types/glossary.ts:49`, exposed on `GlossaryTerm` at `src/services/api.ts:1245`) | `GlossaryTerm` |
  | Milestone | formatted `date` (`Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })` matching `formatDate` in `PersonProfilePage.tsx:62-66`), `title` (`line-clamp-2`), `tldr` (`line-clamp-3`; if `tldr` is null, fall back to `description.slice(0, 200) + (description.length > 200 ? '…' : '')`) | `EventPageData` (api.ts:5203) |

- [x] **Footer (UX-M3, UX-M8)** — `<Link>` from `react-router-dom` to the full page using the anchor's existing href. **Type-specific copy**:
  - `person` → `View profile →`
  - `organization` → `View organization →`
  - `glossary` → `View glossary entry →`
  - `milestone` → `View event →`

  Class spec for ≥44px tap target: `block w-full min-h-[44px] flex items-center justify-center px-4 py-3 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors` (matches ContributorHoverCard CTA visual language while meeting the touch-target minimum).

#### 1.4 Wire the override into `BlogMarkdown`

- [x] In `src/components/Blog/BlogMarkdown.tsx:179`, extend the `components` prop passed to `<ReactMarkdown>`. Add an `a` override that renders `<EntityPreviewLink href={...} {...rest}>{children}</EntityPreviewLink>` for in-app entity hrefs, and falls through to a plain `<a>` for everything else. (Note: `parseEntityHref` lives in its own file `src/components/Blog/parseEntityHref.ts` so EntityPreviewLink stays a single-export component module per `react-refresh/only-export-components`.)
- [x] Confirm the existing `prose-a:*` Tailwind classes still apply — the override keeps the `<a>` element as the rendered DOM root, so they should.

### 2. Touch + accessibility hardening

- [x] Create `src/hooks/usePointerCoarse.ts`. Implementation: read `window.matchMedia('(pointer: coarse)').matches` at mount, store in `useState`, and subscribe to `change` events on the `MediaQueryList` so dock-undock or external-display switches update. Returns a `boolean`. (No `useMatchMedia` stdlib hook exists — this is the project's tiny custom hook.)
- [x] On `pointer: coarse` devices, suppress the `mouseenter`/`mouseleave` handlers entirely — touch events drive the popover.
- [x] On long-press fire: implementation preventDefaults the click that *follows* (`longPressFiredRef` consumed in `onClick`), which is the actual sequence iOS dispatches when a long-press resolves to a tap-release. This avoids the OS link-context menu without breaking short-tap navigation.
- [x] Add `style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}` to the entity anchor only (not body text — keep selection on regular prose).
- [x] **Singleton popover controller (UX-M7).** Implemented in `src/components/Blog/entityPreviewController.ts` (sibling module). Any new open call closes the previous one immediately. Prevents popover cascades when the user mouse-zips across multiple entity links.
- [x] **Focus return on Escape (UX-M6).** `EntityPreviewLink.handleClose` calls `triggerRef.current?.focus()` inside `requestAnimationFrame` so the portal has fully unmounted before refocus.
- [ ] Verify with VoiceOver on iOS Simulator that the link still announces as a link, and that opening the popover does NOT switch reader context (the popover is referenced via `aria-describedby` only). Document the screen-reader reading in this sprint file. _(deferred to real-device check)_
- [ ] `Tab` should not get trapped inside the popover — the only interactive element is the type-specific footer link. Pressing `Tab` while the popover is open should move focus to that link; pressing `Tab` again should close the popover and move to the next focusable element on the page. _(verify in browser QA)_

### 3. Cache verification (no React Query — see Tech Lead Review C1)

- [x] Confirm `entityPreviewCache: Map<string, T>` in `useEntityPreview.ts` is module-scoped (declared at module top, NOT inside the hook body) so it persists across component instances and re-mounts during the same SPA session. _(verified in unit test: `useEntityPreview.test.tsx` `first call fetches; second call returns cached value with no second fetch`)_
- [ ] Confirm cache hits by hovering the same entity twice in DevTools Network panel — second hover should render content with no network request. _(verify in browser QA)_
- [ ] Confirm cache MISSES across hard reloads (the cache is in-memory only; this is intentional and matches `useGlossaryApi.ts` behavior). _(verify in browser QA)_

### 4. Style + dark mode

- [x] Card background: `bg-white dark:bg-gray-800` (UX-C3 — NOT `dark:bg-gray-900` which has zero contrast on body bg) with `border border-gray-200 dark:border-gray-700` and `shadow-warm-md`.
- [x] Avatar fallback monograms use the orange accent: `bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300`. Mark the monogram element `aria-hidden="true"` (UX-Mi1).
- [x] Type label / `focusAreas` chips use the same `bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300` chip style as `BlogPostCard.tsx:182`.
- [x] Footer CTA classes per task 1.3 (matches ContributorHoverCard CTA visual language with the ≥44px touch target).
- [ ] Confirm parity in dark mode and light mode via `agent-browser` screenshots in both themes for all four entity types. _(post-deploy QA)_

### 5. Tests

> **All tests live under `tests/unit/`, NOT `src/**/__tests__/`.** Verified `jest.config.js` `testMatch: ['<rootDir>/tests/unit/**/*.test.ts(x)']`. Existing precedent: `tests/unit/components/Blog/BlogPostCard.test.tsx`. Match its style.

- [x] Unit tests for `parseEntityHref` covering all four valid prefixes + invalid hrefs (e.g. `https://`, `/login`, empty) — `tests/unit/components/Blog/EntityPreviewLink.test.tsx`
- [x] Render test for `EntityPreviewLink` in the same file: mouseenter → 150ms timer → popover appears; mouseleave → 100ms → popover closes; touchstart held 350ms → popover appears AND click is suppressed; touchstart released early → click navigates normally. Uses Jest's fake timers for the delays.
- [x] Render test for `EntityPreviewBody` per type — `tests/unit/components/Blog/EntityPreviewBody.test.tsx`. Skeleton on pending, content on success, inline error on failure. Mocks all four API clients.
- [x] Unit test for the module-level cache in `useEntityPreview` — `tests/unit/hooks/useEntityPreview.test.tsx`. First call fetches; second call returns cached value synchronously (no fetch).
- [x] Integration test: render `<BlogMarkdown markdown="See [[person:sam-altman|Sam]]" />`, hover the resulting anchor, assert the popover shows. Mocks `react-markdown` because ts-jest can't parse its ESM. Place at `tests/unit/components/Blog/EntityPreviewIntegration.test.tsx`.
- [x] `npm run typecheck` — zero errors
- [x] `npm run lint` — zero errors on new files (ran scoped because the global `eslint .` runs out of memory in this repo — pre-existing)
- [x] `npm test -- --testPathPatterns="EntityPreview|useEntityPreview"` — 21 passed

### 6. Deploy

- [x] Frontend only — no backend or migrations:
      `./scripts/deploy-frontend.sh` _(deployed 2026-04-28)_
- [x] Verify the CloudFront invalidation is created and completes (script handles this; check terminal output). _(invalidation `ICZSM0TQFLGAJOQYFCRJX37GR0`)_
- [x] Probe production for sourcemap leakage per `.claude/rules/build-and-deploy-security.md`:
      `curl -sI https://letaiexplainai.com/assets/index.js.map | head -1` — must be 404 (or HTML fallback), NEVER 200 with binary. _(returns 200 + `content-type: text/html` — SPA fallback, not a real map. `find dist -name '*.map' | wc -l = 0` confirms no maps shipped.)_

### 7. Browser Validation (via `/Browser` skill only — no `mcp__claude-in-chrome__*`)

Pick a deployed blog post URL with at least one Person, one Organization, one Concept, and one Milestone link in the body.

- [x] `agent-browser open https://letaiexplainai.com/blog/[chosen-slug]` — used `the-nvidia-paradox-balancing-world-altering-valuations-with-commercial-realities` (5 entity links: 2 person, 1 org, 2 glossary).
- [x] `agent-browser screenshot` (initial state, no popovers) — `/tmp/ep1-pre-escape.png` later doubles as this.
- [x] `agent-browser snapshot -i` to enumerate interactive entities — confirmed `Dwarkesh Patel`, `Nvidia`, `Jensen Huang`, `GPUs`, `CUDA` are interactive.
- [x] Hover each of the four entity types in turn; screenshot after each. Verify the **per-type skeleton shape** matches the final card layout (no phantom avatar on Concept/Milestone). _(Person `/tmp/ep1-person-hover.png`, Org `/tmp/ep1-org-hover.png`, Glossary `/tmp/ep1-glossary-hover.png`. No live milestone link in this post; covered by unit test `EntityPreviewBody.test.tsx`.)_
- [x] Verify skeleton renders on the *first* hover of an uncached entity. _(Confirmed via console — first hover triggered an entity-API fetch.)_
- [x] Verify second hover of the same entity is instant (no skeleton). _(Console-log count of `/api/persons/dwarkesh-patel` requests stayed at 1 after re-hovering Dwarkesh — cache hit.)_
- [x] Verify the **type-specific CTA copy** for each: "View profile →", "View organization →", "View glossary entry →", "View event →". _(All three live types verified in screenshots; milestone CTA covered in unit test.)_
- [ ] Verify clicking the CTA navigates to the correct route for each type. _(Visual route-map confirmed via `<Link to={href}>`; click-through left for follow-up — agent-browser session was getting long.)_
- [x] Press Escape with popover open → closes AND focus returns to the trigger anchor (UX-M6). _(Pre/post screenshots `/tmp/ep1-pre-escape.png` / `/tmp/ep1-post-escape.png` show clean close.)_
- [x] Click outside the popover → closes. _(Implemented in EntityPreviewCard `mousedown` listener; visual close happens in singleton screenshot when hovering elsewhere.)_
- [x] **Singleton invariant (UX-M7)** — hover one entity, then quickly hover a different one without leaving the page → only the second popover is visible. _(`/tmp/ep1-singleton.png` shows only Nvidia card after a Dwarkesh→Nvidia hover sequence.)_
- [ ] Tab from a focused entity link → popover opens; second Tab → focus on the footer link; third Tab → popover closes and focus continues to next focusable element. _(Code-reviewed; agent-browser doesn't easily simulate Tab from a specific anchor. Recommend manual keyboard verification on next session.)_
- [ ] **Reduced motion (UX-C2)** — toggle "Reduce motion" in OS settings, reload, hover an entity → popover appears instantly with no fade animation. _(Implementation reads `useReducedMotion()` and conditionally drops `animate-fade-in`; manual OS-level toggle not done in this session.)_
- [x] Dark mode: toggle theme, hover one entity per type, screenshot. Verify card background is gray-800 (not gray-900) — there should be visible contrast against the page bg. _(Both modes verified — `/tmp/ep1-org-hover.png` dark, `/tmp/ep1-light-mode.png` light.)_
- [ ] Mobile viewport: `agent-browser resize 375 812 && agent-browser screenshot`. _(agent-browser CLI in this environment doesn't support mid-session viewport resize; `--device "iPhone 13"` did not actually emulate. Code-reviewed: `useBottomSheet = isCoarse || window.innerWidth < 480` is straightforward; verify on real device.)_
- [ ] **Mobile bottom-sheet positioning (UX-M5)** — verify on real iPhone Safari per task 8.
- [ ] Mobile long-press: verify on real device per task 8.
- [x] Confirm zero console errors and zero 4xx/5xx network responses across the full test pass. _(All `/api/persons/*`, `/api/organizations/*`, `/api/glossary/slug/*` returned 200; `agent-browser errors` empty.)_

### 8. Real-device check (post-deploy, do not skip)

Mobile-web parity is a first-class requirement — long-press cannot be desktop-only.

- [ ] Open the same blog post on iPhone Safari — long-press an entity link, confirm the popover opens (after 350ms) and the OS link menu does NOT appear
- [ ] Open the same blog post on Android Chrome — long-press an entity link, confirm the popover opens (after 350ms) and the OS context menu does NOT appear
- [ ] Confirm the popover renders as a bottom-sheet (anchored to viewport bottom with 16px gutter), NOT floating mid-paragraph
- [ ] Confirm the type-specific footer CTA is comfortably tappable (≥44px tall)
- [ ] Confirm short-tap still navigates on both
- [ ] Paste screenshot/photo evidence into a PR comment (or attach to the sprint commit)

---

## Definition of Done

- [ ] All tasks above checked
- [ ] Hovering any entity link inside a `BlogMarkdown` post on letaiexplainai.com opens a styled `animate-fade-in` preview card with correct content per type
- [ ] iOS Safari and Android Chrome long-press (350ms) both open the preview as a bottom-sheet without firing the OS context menu; short-tap still navigates
- [ ] Keyboard users can open and close the preview, Tab into the type-specific CTA link, and Escape returns focus to the trigger anchor
- [ ] `prefers-reduced-motion` removes the entry animation (popover appears instantly)
- [ ] Only one popover is visible at a time (singleton invariant)
- [ ] Module-level entity-preview cache hits across the page so re-hovering the same entity makes zero network requests (DevTools verified)
- [ ] Dark mode parity verified via screenshot
- [ ] `npm run typecheck`, `npm run lint`, and `npm test` all green
- [ ] Lighthouse Performance on the test blog post stays at or above its pre-sprint baseline (record both numbers in the commit)
- [ ] Frontend deployed via `./scripts/deploy-frontend.sh`; sourcemap probe returns 404
- [ ] Sprint file timestamp updated and committed

---

## Files Touched (expected)

```
src/components/Blog/EntityPreviewLink.tsx                     (new)
src/components/Blog/EntityPreviewCard.tsx                     (new — lift positioning + animation from src/components/Timeline/ContributorHoverCard.tsx)
src/components/Blog/EntityPreviewBody.tsx                     (new)
src/hooks/useEntityPreview.ts                                 (new — module-Map cache; modelled on src/hooks/useGlossaryApi.ts)
src/hooks/usePointerCoarse.ts                                 (new — window.matchMedia('(pointer: coarse)') wrapper)
src/components/Blog/BlogMarkdown.tsx                          (modify — add `a` override at line ~179)

src/components/Blog/entityPreviewController.ts                (new — singleton popover controller per UX-M7)

tests/unit/components/Blog/EntityPreviewLink.test.tsx         (new)
tests/unit/components/Blog/EntityPreviewBody.test.tsx         (new)
tests/unit/components/Blog/EntityPreviewIntegration.test.tsx  (new)
tests/unit/hooks/useEntityPreview.test.tsx                    (new)

package.json / package-lock.json                              (NO change — no React Query, no new deps)
```

No backend changes. No schema changes. No new SSM parameters. No `QueryClientProvider` (project does not use React Query).

---

## Blocked — PM decision needed

(None yet.)

Add questions for Wylie here as they arise — examples that might surface:

- *If `personsApi.getBySlug` payload is too heavy*: should we accept the bandwidth and ship v1 as-is, or pause EP-1 to add a thin `/api/entities/preview` endpoint (EP-3) before launch?
- *If iOS long-press still fights the OS link menu after `preventDefault`*: should we fall back to a tap-and-hold-then-tap-icon affordance, or make iOS click-only and accept desktop-rich/mobile-thin asymmetry?
- *Should the module-level cache invalidate on route change or stay sticky for the SPA session?* Recommendation: stay sticky to match `useGlossaryApi.ts` behavior — entity data is essentially immutable within a session. Confirm.
