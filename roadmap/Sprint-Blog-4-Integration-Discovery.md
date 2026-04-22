# Sprint Blog-4: Integration & Discovery

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-22 by Claude (AIUXLeadReview — responsive specs for tag/author pages, full state checklists, GlobalSearch registration, FromTheBlog variants match existing patterns)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `.claude/CLAUDE.md`, `.claude/rules/subject-taxonomy.md`, `.claude/rules/frontend.md`.
2. Re-read `roadmap/PLAN-Blog-Editorial.md` **Developer Workflow (MANDATORY)** section.
3. Confirm Sprint Blog-1/2/3 DoDs complete. If not, finish them first.
4. Pick the next unchecked `[ ]` task below.
5. typecheck → lint → tests → QA front+back → commit → check the box.
6. Stop only when DoD met or PM decision needed.

---

## Overview

Connect the blog to the rest of the site. Tag and author archive pages, "From the blog" injections on every major entity page, Subject taxonomy integration, and a proper RSS feed. This sprint is what makes the blog feel woven into the project rather than bolted on.

**Priority**: MEDIUM-HIGH
**Depends on**: Blog-1/2/3 shipped to prod
**Estimated Effort**: 2 days
**Status**: Not started

---

## Prerequisites

- [ ] Blog-1/2/3 DoDs complete; ≥2 test posts published in prod with subjects + entity relations set.
- [ ] Review cross-entity page layouts: `PersonProfilePage.tsx`, `OrganizationProfilePage.tsx`, `GlossaryTermPage.tsx`, `SubjectPage.tsx`, `TimelinePage.tsx`.

---

## Tasks

### 1. Tag archive

- [ ] Backend: `GET /api/blog?tag=foo` already exists from Blog-1 — confirm it filters correctly and paginates.
- [ ] Frontend: create `src/pages/BlogTagPage.tsx` — reuses `BlogPostCard` grid, exactly one `<h1>` = "#tag" (unique per page), shows post count, includes a short intro paragraph (not just a list — avoids "thin content" flags in GSC).
- [ ] Route: `<Route path="blog/tag/:tag" element={<BlogTagPage />} />` in `App.tsx`.
- [ ] On `/blog/:slug`, make tag chips link to `/blog/tag/:tag` with the tag name as anchor text (never "tag", "view", or "click").
- [ ] **SEO for tag pages** (added by AISEOReview):
  - Render `<SEO>` with `title={tag} posts | Let AI Explain AI`, `description={post count}-post archive for #{tag}...`, `canonical` set to the tag URL.
  - Emit `CollectionPage` JSON-LD via a new `generateCollectionPageJsonLd` helper in `src/components/SEO.tsx` — include an `ItemList` of the first 10 posts (follow the existing `generateTimelineItemListJsonLd` pattern).
  - **Thin-content rule**: if the tag has <3 posts, set `noIndex={true}` on `<SEO>` and omit from sitemap (cross-ref Blog-5 Task 4).

### 2. Author archive

- [ ] Backend: `GET /api/authors/:slug` returns author + their published posts.
- [ ] Frontend: create `src/pages/AuthorPage.tsx`:
  - One `<h1>` = author name.
  - Author avatar, bio, links, role — visible E-E-A-T signals.
  - Post grid below.
  - Route `<Route path="blog/author/:slug" element={<AuthorPage />} />`.
- [ ] On `/blog/:slug`, link author byline → `/blog/author/:slug`.
- [ ] **SEO for author pages** (added by AISEOReview):
  - Render `<SEO>` with `title={author.name}`, `description={author.bio}`, `canonical={author URL}`, `type="profile"`.
  - Emit `Person` JSON-LD via existing `generatePersonJsonLd` helper — set `name`, `description`, `url`, `image`, `sameAs` (from `author.links`).
  - ALSO emit `CollectionPage` JSON-LD with the author's post `ItemList` (reuse `generateCollectionPageJsonLd` from Task 1).
  - **Thin-content rule**: if the author has 0 posts, set `noIndex={true}` and omit from sitemap.

### 3. Subject integration

- [ ] Backend: confirm `GET /api/blog?subjectSlug=science-cs-ml` works and returns posts ordered by published date.
- [ ] Frontend: on `BlogIndexPage`, add a subject filter sidebar/dropdown using `GET /api/subjects/tree` with post counts per subject (enhance service to return counts).
- [ ] When filters are applied via query string (`?subjectSlug=...`, `?tag=...`, `?authorSlug=...`), set `canonical` on `<SEO>` to the base `/blog` URL (filtered views should not be indexed as duplicates — pagination and filter canonicalization strategy).
- [ ] For true paginated navigation (`/blog?page=2`), set `canonical` to `/blog` (page 1) to avoid duplicate-content signals.
- [ ] On `SubjectPage` (`src/pages/SubjectPage.tsx`), add a "From the blog" section at the top of the content list if there are ≥1 posts for this subject.

### 4. "From the blog" cross-entity injections

#### 4.1 Shared component
- [ ] Create `src/components/Blog/FromTheBlog.tsx`:
  - Props: `entityType`, `entityId`, `subjectSlugs?` (fallback), `title?` (default "From the blog"), `limit = 3`.
  - Calls a new endpoint `GET /api/blog/for-entity?type=&id=` (backend task below).
  - Renders `BlogPostCard variant="compact"` list; hides if zero results.
  - Link "See all posts →" to `/blog/tag/:tag` or `/blog` with relevant filter.
  - Loading: 3 × `<BlogPostCardSkeleton variant="compact">` (skeleton added in Blog-2 §3.1.1).
  - Error: silent no-op (this is a secondary section — don't disrupt primary content with an error card); log to console.
  - **Section chrome**: `<section>` with heading `<h2 class="text-xl font-semibold mb-4">` matching the "Related" / "Key Concepts" section patterns already used on `PersonProfilePage.tsx` / `OrganizationProfilePage.tsx`. Inspect those files before building.

#### 4.2 Backend endpoint
- [ ] `GET /api/blog/for-entity?type=&id=&limit=` in `server/src/controllers/blog.ts`:
  - First match: posts with `BlogPostRelation` where `entityType` + `entityId` match.
  - Fallback: posts sharing any subject with that entity (via existing `ContentSubject`).
  - Return up to `limit` ordered by published date.
  - Add test in `__tests__/blog.test.ts`.

#### 4.3 Inject on entity pages
- [ ] `PersonProfilePage.tsx` — insert `<FromTheBlog entityType="person" entityId={person.id} />` in the right-column or after bio sections.
- [ ] `OrganizationProfilePage.tsx` — same pattern.
- [ ] `GlossaryTermPage.tsx` — insert after definition.
- [ ] `SubjectPage.tsx` — insert above milestone list.
- [ ] `TimelinePage.tsx` — insert a single "Latest from the blog" teaser row above/below the timeline header (design taste — subtle).
- [ ] Each injection is conditional on results > 0 (component handles internally; verify no layout pop).

### 5. Full RSS 2.0 feed

- [ ] Extend `GET /api/blog/rss.xml` (stubbed in Blog-1):
  - Include `<title>`, `<link>`, `<description>`, `<language>`, `<lastBuildDate>`, `<atom:link rel="self">`.
  - Per item: `<title>`, `<link>`, `<guid>`, `<pubDate>`, `<description>` (excerpt), `<dc:creator>` (author), `<category>` per tag/subject.
  - Content: include first 500 chars of markdown rendered to HTML as `<content:encoded>`. Use existing server-side renderer or a small helper (`remark-html`).
- [ ] Validate with `https://validator.w3.org/feed/` (paste feed URL).
- [ ] Advertise RSS globally: add `<link rel="alternate" type="application/rss+xml" title="Let AI Explain AI — Blog" href="/api/blog/rss.xml">` to `index.html` (in the static `<head>`). This makes browsers + feed readers discover the feed from any page, not just `/blog`.

### 6. Related posts — upgrade

- [ ] Improve `getRelatedPosts` scoring in `server/src/services/blog.ts`:
  - +3 per shared subject, +2 per shared linked entity, +1 per shared tag, +0.5 * recency decay.
- [ ] Unit test the scoring.

### 6.1 Global Search registration (added by AIUXLeadReview)

> LAEA's `src/components/GlobalSearch.tsx` is the ⌘K / Ctrl+K palette reachable from every page. Blog posts must be searchable from there.

- [ ] Extend `GlobalSearch.tsx` to index `blogApi.list()` results (title + excerpt + author + tags).
- [ ] Blog results appear under a "Blog" result group alongside existing groups (milestones, people, orgs, glossary).
- [ ] Each result links to `/blog/:slug`; icon = `PenLine` or `BookOpen` from lucide-react.
- [ ] Verify: open ⌘K → type part of a post title → result appears → Enter navigates.

### 7. Tests

- [ ] Backend tests for `for-entity` endpoint, `rss.xml` markup, related scoring.
- [ ] Frontend tests for `FromTheBlog` (hides when empty, renders 3 cards when populated, skeleton on loading), `BlogTagPage` (populated + thin-content noindex), `AuthorPage` (populated + 0-post noindex).
- [ ] GlobalSearch test: blog results appear when query matches.
- [ ] `npm test` + `npm run typecheck` + `npm run lint` — all green.

### 8. Deploy

- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`.
- [ ] Frontend: `npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete && aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`.

### 9. QA — Live on prod

- [ ] Publish a 3rd post tagged with a subject + linked to a specific person and milestone.
- [ ] Visit that person's `/people/:slug` — "From the blog" card visible with new post.
- [ ] Visit that milestone's event page — same.
- [ ] Visit `/subjects/:slug` — blog row visible.
- [ ] Visit `/blog/tag/:tag` — post listed.
- [ ] Visit `/blog/author/wylie-brown` — profile + post list renders.
- [ ] Fetch `/api/blog/rss.xml` in a feed reader (Feedly / Inoreader) — validates, renders.
- [ ] CloudWatch + console clean.

---

## Definition of Done

- [ ] All tasks above checked.
- [ ] Blog posts appear contextually on every major entity page when relevant.
- [ ] RSS validates on W3C validator with zero errors.
- [ ] Tag + author archive pages live.
- [ ] Subject filter on `/blog` works end-to-end.
- [ ] Zero TypeScript / lint errors.

---

## Files Touched (expected)

```
src/components/Blog/FromTheBlog.tsx                 (new)
src/pages/BlogTagPage.tsx                           (new)
src/pages/AuthorPage.tsx                            (new)
src/pages/BlogIndexPage.tsx                         (modify — subject filter)
src/pages/PersonProfilePage.tsx                     (modify)
src/pages/OrganizationProfilePage.tsx               (modify)
src/pages/GlossaryTermPage.tsx                      (modify)
src/pages/SubjectPage.tsx                           (modify)
src/pages/TimelinePage.tsx                          (modify)
src/App.tsx                                         (modify — routes)
server/src/services/blog.ts                         (modify — related scoring)
server/src/controllers/blog.ts                      (modify — for-entity endpoint, rss)
server/src/routes/blog.ts                           (modify)
index.html                                          (modify — RSS link)
```

---

## Blocked — PM decision needed

(None yet.)
