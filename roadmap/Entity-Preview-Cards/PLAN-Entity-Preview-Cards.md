# Entity Preview Cards — Development Plan

> **Project**: Hover (desktop) and long-press (touch) preview popovers for Person, Organization, Concept, and Milestone entity links inside blog posts. A click/short-tap still navigates to the full page.
> **Code Prefix**: `EP`
> **Start Date**: 2026-04-28
> **Product Manager**: Wylie
> **Status**: Planning — ready to execute Sprint EP-1

---

## Vision

Blog posts on letaiexplainai.com already wire every entity mention through a known link shape (`/people/:slug`, `/organizations/:slug`, `/glossary/:slug`, `/events/:id`) via the `[[type:slug|label]]` shortcode in `src/components/Blog/BlogMarkdown.tsx`. Today those links are dead until clicked. Adding a contained preview card on hover/long-press lets readers stay in the flow of the post, preview who or what is being referenced, and decide whether to deep-dive — without losing their reading thread. This raises engagement on long-form content and surfaces the entity graph that is otherwise invisible inside a blog post.

## Success Metrics

- ≥30% of blog-post sessions trigger at least one preview hover/long-press (event tracked client-side).
- Preview-to-full-page click-through ≥15% (i.e. the preview is genuinely persuasive, not just a tooltip).
- Zero regression in Lighthouse Performance on `/blog/[slug]` pages.
- Mobile long-press works on iOS Safari and Android Chrome — not desktop-only.

---

## Developer Workflow (MANDATORY — read before every work session)

This workflow is enforced on every sprint. Ignoring it = broken ship.

1. **Read `.claude/` first.** `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` + the relevant `.claude/rules/*.md` files (`frontend.md`, `backend.md` if API touched). Never skip.
2. **Orient inside `/roadmap/Entity-Preview-Cards/`.** Open this PLAN and the current sprint file. Pick exactly one unchecked `[ ]` task.
3. **Write elegant code in small blocks.** Minimum code to satisfy the task. Short *why* comments only. No speculative abstractions.
4. **After every code block, before moving on**:
   - `npm run typecheck` (zero errors)
   - `npm run lint` (zero errors)
   - Write/update tests covering what changed
   - `npm test` (all pass)
5. **Update the sprint file.** `[ ] → [x]` on the task just completed. Commit code + checkbox together.
6. **QA front-to-back.** UI: verify local (`localhost:5173`) and prod (`letaiexplainai.com`) with `/Browser` (agent-browser). API (if a follow-up sprint adds one): `curl` prod + `aws logs tail /aws/lambda/ai-timeline-api-prod`.
7. **Deploy early, deploy often.** Each sprint has a Deploy section. Don't let more than one sprint accumulate unshipped.
8. **No backwards compatibility** unless Wylie explicitly requested it.
9. **Stop conditions**: DoD met, or PM decision needed. For PM decisions, write the question under `## Blocked — PM decision needed` in the relevant sprint and ping Wylie.
10. **Browser validation via `/Browser` only** — never use `mcp__claude-in-chrome__*` (project-global rule).

---

## Technical Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Frontend rendering | React 18 + ReactMarkdown `components` override | Existing entity-link pipeline already routes through `<a>` — overriding the `a` renderer is the surgical insertion point. |
| Data fetching | `useState` + `useEffect` + `fetchJson` + module-level `Map<string, T>` cache | Project does NOT use React Query — confirmed by AITechLeadReview (no `@tanstack/react-query` in package.json or src). Canonical pattern is `src/hooks/useGlossaryApi.ts` (`glossaryCache.byId.get(id)`). New `useEntityPreview` hook mirrors this shape. |
| Positioning | React Portal → `document.body`, `position: fixed` | Per `.claude/rules/frontend.md`. Lift positioning math from existing `src/components/Timeline/ContributorHoverCard.tsx`. |
| Touch detection | Native `touchstart` / `touchend` with timeout | No new dependency; matches iOS long-press conventions. |
| Loading state | Existing `LoadingSkeleton` from `src/components/ui/LoadingSkeleton.tsx` | Reuse skeleton-shimmer pattern already in the codebase. |
| Backend (v1) | Existing endpoints — no change | `/api/persons/:slug`, `/api/organizations/:slug`, `/api/glossary/slug/:slug`, `/api/events/:id` (NOTE: events not milestones — only `/api/events/:id` returns `tldr`). |
| Backend (conditional v2) | New `/api/entities/preview` thin endpoint | ONLY if Network panel shows the full-record payloads are too heavy. Deferred to a follow-up sprint with explicit go/no-go decision. |

## Data Model Summary

**No schema changes.** v1 is a pure frontend feature reusing existing entities:

- `Person` (canonicalName, slug, shortBio, currentRole, currentOrgId, imageUrl) — see `.claude/rules/data-models.md`
- `Organization` (name, slug, shortDescription, focusAreas, logoUrl)
- `GlossaryTerm` (slug, definition)
- `Milestone` (id, title, date, tldr)

## API Surface Summary

```
# v1 — reuse existing endpoints (NO new routes)
GET /api/persons/:slug          # personsApi.getBySlug (api.ts:3824) → PersonWithRelations
GET /api/organizations/:slug    # organizationsApi.getBySlug (api.ts:3636) → OrganizationWithRelations
GET /api/glossary/slug/:slug    # glossaryApi.getBySlug (api.ts:1378) → GlossaryTerm (use shortDefinition for preview)
GET /api/events/:id             # eventsApi.getById (api.ts:5275) → EventPageData (has tldr; do NOT use milestonesApi)

# v2 (conditional — only if v1 payloads too heavy)
GET /api/entities/preview?type=person&slug=...
```

## Frontend Routes Summary

No new routes. Feature attaches to existing blog post route:

```
/blog/:slug                     # BlogPostPage → BlogMarkdown → EntityPreviewLink
```

## Sprint Overview

| Sprint | Focus | Key Deliverables | Estimated Effort |
|--------|-------|------------------|------------------|
| **EP-1** | Blog post hover + long-press preview cards | `EntityPreviewLink` + `EntityPreviewCard` components, ReactMarkdown `a` override, four card variants (Person/Org/Concept/Milestone), React Query caching, keyboard + touch + mouse triggers, skeleton-shimmer load state, deployed to prod, browser-validated on desktop + mobile viewport | 2–3 days |
| **EP-2** *(conditional)* | Roll out preview cards to non-blog surfaces | Reuse `EntityPreviewLink` inside milestone descriptions, person bios, glossary cross-refs, learning path checkpoints. Decide after EP-1 ships and we have real usage data. | 1–2 days |
| **EP-3** *(conditional)* | Thin `/api/entities/preview` endpoint | ONLY if Chrome Network panel shows v1 payloads are >10KB or DB query latency is hurting hover responsiveness. Deferred decision. | 1 day |

**Total estimated effort**: 2–3 days for EP-1 alone; up to 5 days if both follow-ups fire.

---

## Prevalence / Integration Strategy

EP-1 lights up preview cards on every entity link inside `BlogMarkdown` — that's already the densest entity-linked surface (every blog post pre-processes `[[type:slug|label]]` shortcodes into typed anchors). EP-2 (conditional) extends the same component to other prose surfaces:

- Milestone long-form descriptions on `/events/:id`
- Person `fullBio`, `careerHistory`, `contributions`, `philosophy` on `/people/:slug`
- Organization `history`, `currentFocus` on `/organizations/:slug`
- Learning Path checkpoint copy
- Glossary term cross-references

The pattern is identical: any rendered prose that uses entity links gets the same hover/long-press affordance. This is *the* discovery surface for the entity graph and should eventually be everywhere prose meets entities.

## Risks & Open Questions

- **Mobile UX**: long-press conflicts with iOS native text-selection menus. We need to test that long-press on a link triggers our preview, not the OS link menu. Mitigation: `e.preventDefault()` inside the long-press timer and `user-select: none` on the anchor.
- **Payload weight**: `personsApi.getBySlug` returns `PersonWithRelations` (full bio, affiliations array, milestone links). For a preview card we use ~5 fields. v1 ships with the heavy payload to avoid backend churn; if Network panel shows >10KB per hover, EP-3 fires.
- **Touch on hybrid devices**: iPad with trackpad/mouse can fire both `mouseenter` and `touchstart`. Need a `pointer-coarse` media query or pointer-event detection so we don't double-trigger.
- **Accessibility**: VoiceOver on iOS reads links differently when long-press is overloaded. Need to confirm `aria-describedby` + the popover's `role="dialog"` (or `tooltip`) reads sensibly.
- **Z-index inside `prose`**: Tailwind `prose` plugin sets `position: relative` on a few children. The portal sidesteps this but we should verify no stacking-context surprises around code blocks or images.

---

## Definition of Done (whole initiative)

- [ ] EP-1 DoD checked in full
- [ ] Preview cards live on letaiexplainai.com blog posts (desktop + mobile)
- [ ] EP-2 and EP-3 explicit go/no-go decision recorded based on real EP-1 usage data
- [ ] Lighthouse Performance on `/blog/:slug` ≥ baseline (no regression)
- [ ] CloudWatch clean (no new error patterns from API hits)
- [ ] Sprint files in `roadmap/Entity-Preview-Cards/` updated and committed

---

## Reviews scheduled before implementation

This plan is intended for hand-off to:

- `/AITechLeadReview` — verify ReactMarkdown override approach and React Query cache keys work with the actual codebase
- `/AIUXLeadReview` — verify card content, animations, dark mode, mobile long-press behavior
- `/AISEOReview` — confirm hover preview doesn't change crawler-visible markup or hurt Core Web Vitals on `/blog/:slug`

EP-1 should not start until at least Tech Lead and UX Lead reviews are recorded in the sprint file.
