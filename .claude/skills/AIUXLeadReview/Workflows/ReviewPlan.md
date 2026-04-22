# ReviewPlan Workflow (AIUXLeadReview)

Review a roadmap sprint plan for the AI Timeline Atlas repo from the frontend/UX perspective. Ensure it produces beautiful, intuitive, accessible experiences — across desktop, tablet, and mobile web, on both public site and admin CMS surfaces, in both light and dark themes.

---

## Prerequisites

- A sprint plan document must exist under `/Users/wyliebrown/ai_timeline/roadmap/`.
- The parent `PLAN-[Initiative].md` should also exist for cross-sprint context.
- Read `SKILL.md` in this skill directory first — internalize the design system inventory, IA, and UX principles before reviewing.
- You can `Read` `src/components/`, `src/components/ui/`, `src/components/admin/`, `tailwind.config.js`, and the affected feature folders to verify the plan against current reality.

---

## Steps

### Step 1: Read the Plan and Design Context

1. Read the sprint plan the user specified.
2. Read the parent `PLAN-[Initiative].md` in the same `/roadmap/` directory.
3. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and `.claude/rules/frontend.md`.
4. Read the skill's own `SKILL.md` (this directory's parent) if you haven't internalized it.
5. For surfaces the plan touches:
   - Read the current page component (e.g. `src/pages/BlogPostPage.tsx` if plan touches blog post rendering)
   - Read any feature folder the plan modifies (e.g. `src/components/Timeline/` for timeline work)
   - Read `src/components/Header.tsx` if nav changes are proposed
   - Read `src/components/admin/AdminLayout.tsx` if admin nav changes

**Before analyzing, answer these framing questions internally:**
- What will the user SEE differently after this sprint ships?
- Which pages / components are affected?
- Does this sprint touch the public site, the admin CMS, the embed widget, or all three?
- Is this new UI, or modification of existing UI?
- What is the user's primary intent on the affected surface (read? scan? author? browse? compare?)

---

### Step 2: Frontend Impact Investigation

Launch an Explore agent (`subagent_type: Explore`, thoroughness: `medium` or `very thorough` depending on sprint size) to verify how the plan's changes interact with the frontend. Check in parallel:

#### Affected surfaces
- Which pages currently render the data this sprint modifies? Read them.
- What design-system components do they currently use?
- Are there existing loading, empty, and error states on these pages? Screenshot-via-code (read the JSX) what they look like.
- If the plan introduces new components, do equivalents already exist in `src/components/ui/` or a feature folder?

#### Public vs admin split
- Does the sprint affect only public, only admin, or both?
- If both: is the UX tuned differently for each, or is the plan applying one template to both?
- If the sprint adds admin data tables/forms, does the pattern match `src/pages/admin/*` precedent?

#### Design-system compliance
- Does the plan reference any hardcoded hex colors, inline pixel values, or custom spinners?
- Does it propose new components that should live in `src/components/ui/`?
- Does it reuse existing patterns: `<ErrorState>`, `<LoadingSkeleton>`, `<ConfirmDialog>`, `<SubjectBadge>`, `react-hot-toast`, modal overlay convention, tooltip Portal convention?

#### Existing pattern inventory (for the affected feature)
- How does the app currently handle loading on this surface? Plan should match.
- How are cards laid out elsewhere? Plan should match radius/shadow/spacing.
- What anchor-text conventions exist for internal links?
- What button variants exist? (Primary, secondary, ghost, destructive — usually Tailwind-composed inline.)

#### State inventory for every new data-dependent section
For each new list/table/card grid/detail page in the plan:
1. **Loading** — What does the user see while data loads? Which skeleton?
2. **Populated** — What does the happy-path layout look like?
3. **Empty** — What does a user with zero data see? (E.g. `/blog` before any post is published.)
4. **Error** — What happens on fetch failure? Is there a retry affordance?
5. **Degraded / partial** — What if some data is missing? (Missing cover image, missing author avatar, etc.)
6. **First-time** — What does a user encountering this feature for the first time see? Is there an onboarding hint, a tooltip, a tutorial modal?

---

### Step 3: Apply the UX Review Framework

Evaluate the plan against each lens. Not every lens applies to every sprint — focus on the ones that matter.

#### A. Design System Compliance (Tailwind + `ui/` primitives)

**The "no one-offs" rule**: every visual element comes from an existing pattern or is added to `ui/` for future reuse.

- Does the plan introduce any new visual element (card, badge, banner, modal variant)?
- If so, does an equivalent exist in `src/components/ui/` or a feature folder? Reuse > build new.
- Are colors specified via Tailwind classes (`orange-600`, `warm-50`) or via the custom palette (`primary-500`)? Is the choice consistent with the surrounding page?
- Is spacing via Tailwind's 4px scale — no freestyle pixel values?
- Is radius via `rounded-{sm|md|lg|xl|2xl|full}` — no freestyle radius?
- Is shadow via `shadow-warm{-sm|-md|-lg}` tokens where applicable?
- Is the brand animated logo or brand spinner used for brand moments (not a generic spinner)?
- If a new component is proposed: is it added to `src/components/ui/` with a matching test, so the next sprint benefits?

#### B. Responsive Behavior

**The "it works on mobile" claim is insufficient.** Require specification.

- At `sm` (640px) — what stacks? What hides? What shrinks?
- At `md` (768px) — Header flips from mobile menu to desktop nav. Does the sprint's new UI respect this boundary?
- At `lg` (1024px) — sidebars / TOCs / 3-up grids typically appear. Does the plan use this correctly?
- Are tap targets ≥48×48px on mobile?
- Are primary actions thumb-reachable on mobile (near the bottom or at the top)?
- Is horizontal scrolling avoided on mobile?
- Does the admin CMS plan acknowledge it's desktop-first? Mobile admin is not a priority — but should degrade gracefully, not break.

#### C. Dark Mode Parity

**The "both themes" rule**: every new UI must ship with `dark:` overrides for background, border, and text colors.

- Is every proposed class-list checked for a `dark:` counterpart?
- Are images/illustrations swapped per theme where needed?
- Are elevation/shadow values theme-aware? (LAEA's `shadow-warm-*` tokens work for light; dark mode usually wants opacity-adjusted shadows or none.)
- Is the plan's QA checklist explicit about verifying both themes?

#### D. State Completeness

**The "no blank screens" rule**: every data-dependent surface needs the full state set.

For each new or modified surface:
- **Loading** — Specified, using `LoadingSkeleton` or a feature skeleton?
- **Populated** — Happy-path layout clear?
- **Empty** — Is there a component (or proposal to add one)? What's the empty-state message + CTA?
- **Error** — `<ErrorState>` reuse? Retry path defined?
- **Degraded** — Partial data handling (missing cover, missing author, stale content)?
- **First-time** — Does a brand-new user see something helpful?

If any state is missing from the plan, flag it with a proposed fix.

#### E. Interaction Quality

**The "did that work?" test**: every user action produces immediate visual feedback.

- Every button: default / hover / focus / active / disabled / loading states defined?
- Every async action: optimistic update OR loading indicator OR toast on complete?
- Every destructive action: `<ConfirmDialog>` + toast on success/failure?
- Every modal: open animation + close via (X), Escape, backdrop click?
- Every form: validation messages, inline errors, disabled submit while pending?

#### F. Information Architecture

**The "where does this live?" test**: new features need a discoverable home.

- If the plan adds a new public page, where does it sit?
  - Primary nav (Feed/Timeline/Learn)? Requires demoting another item.
  - "More" dropdown (News/Subjects/Study/Glossary/Resources)?
  - Footer link?
  - Global Search (⌘K) registration?
- If the plan adds an admin page, where does it sit in `AdminLayout.tsx` sidebar?
- Are new pages reachable in ≤3 clicks from the homepage?
- Does the plan add URL patterns that conflict with existing routes? (Cross-check `src/App.tsx`.)
- Do new internal links use descriptive anchor text, not "click here" / "learn more"?

#### G. Progressive Disclosure

**The "3-second test"**: new users understand the screen in 3 seconds.

- Does the plan front-load the most important content / primary action?
- Are secondary details collapsible or tabbed (reuse `LayeredExplanationTabs` where appropriate)?
- Is there a clear visual hierarchy (one `<h1>`, then `<h2>` sections, then body)?
- Are power-user controls hidden by default but reachable?
- Could anything be removed without loss of value?

#### H. Accessibility

- Every interactive element has an accessible label (`aria-label` or visible text)?
- Every color-coded indicator (status chips, badges) has a non-color alternative (icon or text)?
- Every animation has a `prefers-reduced-motion` fallback (Tailwind `motion-safe:` / `motion-reduce:` or `useReducedMotion()` in framer-motion)?
- Every form input is labeled, with error states and `aria-describedby`?
- Every modal traps focus and returns focus on close?
- Every route change announces the new page to screen readers (React Router's scroll-to-top pattern is already wired in `App.tsx:114`)?
- Color contrast ≥AA (4.5:1 for body text, 3:1 for large text) verified in BOTH themes?
- Keyboard can reach every action (Tab order + Escape + Enter/Space)?

#### I. Performance Implications

- Are new routes lazy-loaded via `React.lazy()`? (Pattern in `src/App.tsx`.)
- Are heavy libraries (markdown renderers, chart libs, editors) lazy-loaded or gated behind user intent?
- Are images: optimized (WebP/AVIF), sized (`width`/`height`), lazy below the fold (`loading="lazy"`), prioritized above the fold (`fetchpriority="high"`)?
- Does the plan add new data fetching to existing pages? Could it slow initial load?
- Is React Query's caching strategy explicit (stale time, cache time) for new queries?

#### J. Public vs Admin UX Alignment

- Public sprints: is the UX optimized for readability, shareability, mobile, SEO?
- Admin sprints: is the UX optimized for density, keyboard flow, desktop, authoring speed?
- Is there any accidental mixing (e.g., a content-heavy admin screen that uses public prose styling and becomes too sparse, or a public page that uses admin's dense-table styling)?

#### K. Content Rendering (LAEA-specific)

For plans that render content entities (milestone, person, organization, glossary term, subject, event, blog post):

- Does the plan reuse existing rendering patterns?
  - Milestone detail → `LayeredExplanationTabs`
  - Person/Org → profile header + sections pattern
  - Glossary → term + definition + related terms
  - Subject → hub + content list
- Are relationships rendered as proper links (person → orgs, milestone → people, glossary → related terms)?
- Are subject chips rendered via `<SubjectBadge>`?
- Is `RelatedBySubject.tsx` reused where cross-linking applies?

#### L. Embed Widget Considerations

If the plan affects content that might be embedded (timeline, infographics, etc.):
- Does the embed have a theme param (`?theme=light|dark`)?
- Is the embed self-contained (no external dependencies)?
- Is there a visible attribution link back to letaiexplainai.com?
- Is the embed iframe-safe (no top-window navigation)?

#### M. Keyboard + Command Palette

- Does the feature belong in Global Search (⌘K)? (Most content types do. Cross-check `GlobalSearch.tsx`.)
- Does the feature introduce new keyboard shortcuts? If so, add them to `KeyboardShortcutsHelp.tsx`.

---

### Step 4: Compile Findings

Organize findings into these categories. Present to the user BEFORE mutating the plan.

#### Design System Violations
- Hardcoded values instead of tokens
- Custom components where shared components exist
- Generic spinners instead of skeletons
- New patterns that don't match existing ones
- Missing entry in `src/components/ui/` for a reusable primitive

#### Missing States
- Loading state not specified
- Empty state not designed
- Error recovery path missing
- Degraded/partial data not addressed
- First-time user experience absent

#### Responsive Gaps
- No breakpoint behavior specified
- Mobile tap targets too small
- Horizontal scrolling risk on mobile
- Admin UX trying to be mobile-first (or public UX trying to be desktop-first)

#### Dark Mode Gaps
- Missing `dark:` variants on backgrounds, borders, text
- Theme-inappropriate shadows/images
- QA checklist doesn't require both themes

#### Interaction Gaps
- Actions without visual confirmation
- Async operations without loading indicators
- Modals without transition/escape
- Buttons without full state definitions
- Destructive actions without confirm dialog

#### IA / Discoverability Issues
- New feature has no home in nav
- Primary nav overflow (>4 items) without proposed demotion
- URL conflict with existing route
- Non-descriptive anchor text

#### Accessibility Issues
- Missing labels / contrast / motion alternatives
- Color-only indicators
- Keyboard-unreachable flows
- Focus-trap absent on modals

#### Content-Rendering Issues (LAEA-specific)
- Plan reinvents the `LayeredExplanationTabs` pattern
- Subject chips not using `<SubjectBadge>`
- Cross-entity links missing where content calls for them
- `RelatedBySubject` not reused

#### Performance Concerns
- New route not lazy-loaded
- Heavy library added to main bundle
- Images without dimensions (CLS risk)
- No caching strategy for new queries

**Present full findings to user before updating the plan.**

---

### Step 5: Update the Sprint Plan

Apply findings directly to the sprint document. Follow these rules strictly.

**Corrections:**
- Fix wrong values inline (component names, class lists, file paths).
- Replace references to reinvented components with pointers to existing `src/components/ui/` primitives or feature-folder components.

**New tasks:**
- Add UX-driven tasks using the plan's existing `[ ]` format.
- Place them in the relevant task section, not in a silo at the bottom.
- Typical additions:
  - State definitions (loading / empty / error / degraded / first-time)
  - Specific design-system component usage ("Use `<ErrorState>`" / "Reuse `LoadingSkeleton`")
  - Responsive breakpoint behavior (explicit `sm:` / `md:` / `lg:` behavior)
  - Dark-mode class coverage
  - Animation specifications (matching neighboring pages)
  - Accessibility requirements (labels, keyboard paths, motion fallbacks)
  - Empty-state copy + CTA drafts
  - Keyboard shortcut additions to `KeyboardShortcutsHelp.tsx`

**State specifications:**
For each new data-dependent surface, add a checklist:
```
- [ ] Loading state: use `<LoadingSkeleton>` matching card shape
- [ ] Empty state: use `<EmptyState>` with icon, headline, description, CTA (propose adding `EmptyState` to `src/components/ui/` if it doesn't exist)
- [ ] Error state: use `<ErrorState>` with retry button
- [ ] Degraded state: handle missing cover image with neutral placeholder; handle missing author with "Staff" fallback
- [ ] First-time state: show helper banner linking to `/about` on first visit
```

**Notes for Future Developers:**
Add a `## UX Notes for Implementation` subsection listing which components to reuse, which tokens to reference, any new components to add to `ui/`.

**Acceptance Criteria / Definition of Done additions:**
Add UX criteria alongside technical criteria. Examples:
- "New surfaces render correctly in both light and dark themes (QA screenshots attached to PR)"
- "Responsive: verify at 375px, 768px, 1024px, 1440px"
- "Keyboard: every action reachable via Tab + Enter/Space + Escape"
- "Lighthouse Accessibility ≥95 on affected pages"

**Timestamp:**
Update the "Last updated: YYYY-MM-DD by Claude (AIUXLeadReview — brief note)" line at the top.

**DO NOT:**
- Reorganize or reformat the plan's existing structure.
- Remove or rewrite technically correct tasks.
- Mandate specific pixel values or visual designs (that's implementation, not plan review).
- Override technical decisions — raise UX concerns, suggest alternatives, don't mandate.
- Add scope that belongs in a separate sprint — flag it as follow-up instead.

---

### Step 6: Update the Parent `PLAN-[Initiative].md`

If findings affect cross-sprint concerns, update the PLAN doc:
- New UX risks under a `## UX Risks` section
- Updated Definition of Done to include UX quality gates (both-theme QA, responsive QA, accessibility QA)
- Cross-sprint UX dependencies (e.g., Sprint X introduces a shared `EmptyState` that Sprint Y will reuse)
- Effort estimate deltas (UX tasks add scope)

---

### Step 7: Report Summary

After updating, provide a concise summary:

```
## AI UX Lead Review Summary

**User-facing impact**: [What changes the user sees/feels on the public site / admin CMS]
**Surface(s) affected**: Public site / Admin CMS / Embed widget / multiple
**Design-system status**: Compliant / violations found / new `ui/` component proposed

**Files updated:**
- roadmap/Sprint-[Prefix]-N-*.md — [N UX tasks, M state specs, K responsive/dark-mode items]
- roadmap/PLAN-[Initiative].md — [what changed]

**Top UX risk**: [The single biggest risk to user experience quality]
**Top accessibility risk**: [If applicable — what would block WCAG AA]

**Tasks added:** [bulleted list with section numbers]

**Status**: Plan is UX-ready / needs PM input on [X].
```

Keep the summary under 30 lines. Detail lives in the updated plan.

---

## Verification Checklist (Use This Every Time)

Every review must check these. Skip none.

- [ ] **Design-system compliance** — no hardcoded values, reuse `ui/` primitives, reuse feature-folder patterns
- [ ] **Responsive behavior** — explicit `sm:` / `md:` / `lg:` specs; tap targets ≥48px; thumb-reachable primary actions on mobile
- [ ] **Dark-mode parity** — every `bg-*` / `text-*` / `border-*` has `dark:` variant
- [ ] **State completeness** — loading / populated / empty / error / degraded / first-time defined
- [ ] **Interaction feedback** — every action has visual confirmation; buttons have full state set
- [ ] **Modal / tooltip conventions** — overlay + backdrop blur + Escape; tooltip Portal
- [ ] **Confirm + toast conventions** — `<ConfirmDialog>` + `react-hot-toast` reused
- [ ] **Information architecture** — new features have a discoverable home; no primary-nav overflow
- [ ] **Progressive disclosure** — key content first, details behind tabs/collapses
- [ ] **Accessibility** — labels, contrast (both themes), reduced-motion, keyboard paths, focus trap on modals
- [ ] **Animation consistency** — Tailwind keyframes or framer-motion matches neighboring pages
- [ ] **Brand moments** — animated logo / brand skeleton used where appropriate, not generic spinner
- [ ] **Performance** — lazy routes, code-split heavy libs, images with dimensions, caching defined
- [ ] **Public vs Admin alignment** — correct UX priorities for the surface
- [ ] **Content-rendering patterns** (LAEA-specific) — `LayeredExplanationTabs`, `<SubjectBadge>`, `RelatedBySubject` reused where applicable
- [ ] **Keyboard + Global Search** — new content types registered in ⌘K; new shortcuts documented
- [ ] **Embed / shareability** — if applicable, theme-aware and attribution-linked
- [ ] **Terminology consistency** — same words for same concepts across pages

---

## Anti-Patterns (NEVER DO THESE)

- **Never accept a plan without specified responsive behavior.**
- **Never accept a plan without `dark:` class coverage** for new UI.
- **Never accept a data-dependent surface without loading / empty / error / (+degraded / first-time) states.**
- **Never allow hardcoded hex colors or pixel values.** Tailwind tokens only.
- **Never allow a generic spinner where a skeleton belongs.**
- **Never allow a custom modal instead of the established overlay convention** (`.claude/rules/frontend.md`).
- **Never allow a custom destructive confirmation instead of `<ConfirmDialog>`.**
- **Never allow a one-off notification instead of `react-hot-toast`.**
- **Never allow a tooltip/hover card that doesn't Portal to `document.body`.**
- **Never allow a new interactive element without a keyboard path.**
- **Never allow animations without `prefers-reduced-motion` fallback.**
- **Never allow images without `alt` + `width` + `height`.**
- **Never promote a nav item to primary without demoting another.**
- **Never mix public and admin UX patterns on the same surface.**
- **Never allow a full-screen route without an exit affordance.**
- **Never skip verifying both themes.**
- **Never reinvent `LayeredExplanationTabs` or `<SubjectBadge>` or `RelatedBySubject` when the surface warrants them.**
- **Never approve a plan that ships new UI without Lighthouse Accessibility ≥95 as a QA gate.**
