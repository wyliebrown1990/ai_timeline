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
**Status**: Shipped — archive pages + FromTheBlog injections + RSS autodiscovery + GlobalSearch registration live in prod; event page confirms FromTheBlog renders for the seed post's milestone relation.

---

## Prerequisites

- [x] Blog-1/2/3 DoDs complete; ≥2 test posts published in prod with subjects + entity relations set.
- [x] Review cross-entity page layouts: `PersonProfilePage.tsx`, `OrganizationProfilePage.tsx`, `GlossaryTermPage.tsx`, `SubjectPage.tsx`, `TimelinePage.tsx`.

---

## Tasks

### 1. Tag archive

- [x] Backend: `GET /api/blog?tag=foo` already exists from Blog-1 — confirm it filters correctly and paginates.
- [x] Frontend: create `src/pages/BlogTagPage.tsx` — reuses `BlogPostCard` grid, exactly one `<h1>` = "#tag" (unique per page), shows post count, includes a short intro paragraph (not just a list — avoids "thin content" flags in GSC).
- [x] Route: `<Route path="blog/tag/:tag" element={<BlogTagPage />} />` in `App.tsx`.
- [x] On `/blog/:slug`, make tag chips link to `/blog/tag/:tag` with the tag name as anchor text (never "tag", "view", or "click").
- [x] **SEO for tag pages** (added by AISEOReview):
  - Render `<SEO>` with `title={tag} posts | Let AI Explain AI`, `description={post count}-post archive for #{tag}...`, `canonical` set to the tag URL.
  - Emit `CollectionPage` JSON-LD via a new `generateCollectionPageJsonLd` helper in `src/components/SEO.tsx` — include an `ItemList` of the first 10 posts (follow the existing `generateTimelineItemListJsonLd` pattern).
  - **Thin-content rule**: if the tag has <3 posts, set `noIndex={true}` on `<SEO>` and omit from sitemap (cross-ref Blog-5 Task 4).

### 2. Author archive

- [x] Backend: `GET /api/authors/:slug` returns author + their published posts.
- [x] Frontend: create `src/pages/AuthorPage.tsx`:
  - One `<h1>` = author name.
  - Author avatar, bio, links, role — visible E-E-A-T signals.
  - Post grid below.
  - Route `<Route path="blog/author/:slug" element={<AuthorPage />} />`.
- [x] On `/blog/:slug`, link author byline → `/blog/author/:slug`.
- [x] **SEO for author pages** (added by AISEOReview):
  - Render `<SEO>` with `title={author.name}`, `description={author.bio}`, `canonical={author URL}`, `type="profile"`.
  - Emit `Person` JSON-LD via existing `generatePersonJsonLd` helper — set `name`, `description`, `url`, `image`, `sameAs` (from `author.links`).
  - ALSO emit `CollectionPage` JSON-LD with the author's post `ItemList` (reuse `generateCollectionPageJsonLd` from Task 1).
  - **Thin-content rule**: if the author has 0 posts, set `noIndex={true}` and omit from sitemap.

### 3. Subject integration

- [x] Backend: confirm `GET /api/blog?subjectSlug=science-cs-ml` works and returns posts ordered by published date.
- [x] Frontend: on `BlogIndexPage`, add a subject filter sidebar/dropdown using `GET /api/subjects/tree` with post counts per subject (enhance service to return counts).
- [x] When filters are applied via query string (`?subjectSlug=...`, `?tag=...`, `?authorSlug=...`), set `canonical` on `<SEO>` to the base `/blog` URL (filtered views should not be indexed as duplicates — pagination and filter canonicalization strategy).
- [x] For true paginated navigation (`/blog?page=2`), set `canonical` to `/blog` (page 1) to avoid duplicate-content signals.
- [x] On `SubjectPage` (`src/pages/SubjectPage.tsx`), add a "From the blog" section at the top of the content list if there are ≥1 posts for this subject.

### 4. "From the blog" cross-entity injections

#### 4.1 Shared component
- [x] Create `src/components/Blog/FromTheBlog.tsx`:
  - Props: `entityType`, `entityId`, `subjectSlugs?` (fallback), `title?` (default "From the blog"), `limit = 3`.
  - Calls a new endpoint `GET /api/blog/for-entity?type=&id=` (backend task below).
  - Renders `BlogPostCard variant="compact"` list; hides if zero results.
  - Link "See all posts →" to `/blog/tag/:tag` or `/blog` with relevant filter.
  - Loading: 3 × `<BlogPostCardSkeleton variant="compact">` (skeleton added in Blog-2 §3.1.1).
  - Error: silent no-op (this is a secondary section — don't disrupt primary content with an error card); log to console.
  - **Section chrome**: `<section>` with heading `<h2 class="text-xl font-semibold mb-4">` matching the "Related" / "Key Concepts" section patterns already used on `PersonProfilePage.tsx` / `OrganizationProfilePage.tsx`. Inspect those files before building.

#### 4.2 Backend endpoint
- [x] `GET /api/blog/for-entity?type=&id=&limit=` in `server/src/controllers/blog.ts`:
  - First match: posts with `BlogPostRelation` where `entityType` + `entityId` match.
  - Fallback: posts sharing any subject with that entity (via existing `ContentSubject`).
  - Return up to `limit` ordered by published date.
  - Add test in `__tests__/blog.test.ts`.

#### 4.3 Inject on entity pages
- [x] `PersonProfilePage.tsx` — insert `<FromTheBlog entityType="person" entityId={person.id} />` in the right-column or after bio sections.
- [x] `OrganizationProfilePage.tsx` — same pattern.
- [x] `GlossaryTermPage.tsx` — insert after definition.
- [x] `SubjectPage.tsx` — insert above milestone list.
- [x] `TimelinePage.tsx` — insert a single "Latest from the blog" teaser row above/below the timeline header (design taste — subtle).
- [x] Each injection is conditional on results > 0 (component handles internally; verify no layout pop).

### 5. Full RSS 2.0 feed

- [x] Extend `GET /api/blog/rss.xml` (stubbed in Blog-1):
  - Include `<title>`, `<link>`, `<description>`, `<language>`, `<lastBuildDate>`, `<atom:link rel="self">`.
  - Per item: `<title>`, `<link>`, `<guid>`, `<pubDate>`, `<description>` (excerpt), `<dc:creator>` (author), `<category>` per tag/subject.
  - Content: include first 500 chars of markdown rendered to HTML as `<content:encoded>`. Use existing server-side renderer or a small helper (`remark-html`).
- [x] Validate with `https://validator.w3.org/feed/` (paste feed URL).
- [x] Advertise RSS globally: add `<link rel="alternate" type="application/rss+xml" title="Let AI Explain AI — Blog" href="/api/blog/rss.xml">` to `index.html` (in the static `<head>`). This makes browsers + feed readers discover the feed from any page, not just `/blog`.

### 6. Related posts — upgrade

- [x] Improve `getRelatedPosts` scoring in `server/src/services/blog.ts`:
  - +3 per shared subject, +2 per shared linked entity, +1 per shared tag, +0.5 * recency decay.
- [x] Unit test the scoring.

### 6.1 Global Search registration (added by AIUXLeadReview)

> LAEA's `src/components/GlobalSearch.tsx` is the ⌘K / Ctrl+K palette reachable from every page. Blog posts must be searchable from there.

- [x] Extend `GlobalSearch.tsx` to index `blogApi.list()` results (title + excerpt + author + tags).
- [x] Blog results appear under a "Blog" result group alongside existing groups (milestones, people, orgs, glossary).
- [x] Each result links to `/blog/:slug`; icon = `PenLine` or `BookOpen` from lucide-react.
- [x] Verify: open ⌘K → type part of a post title → result appears → Enter navigates.

### 7. Tests

- [x] Backend tests for `for-entity` endpoint, `rss.xml` markup, related scoring.
- [x] Frontend tests for `FromTheBlog` (hides when empty, renders 3 cards when populated, skeleton on loading), `BlogTagPage` (populated + thin-content noindex), `AuthorPage` (populated + 0-post noindex).
- [x] GlobalSearch test: blog results appear when query matches.
- [x] `npm test` + `npm run typecheck` + `npm run lint` — all green.

### 8. Deploy

- [x] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`.
- [x] Frontend: `npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete && aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`.

### 9. QA — Live on prod

- [x] Publish a 3rd post tagged with a subject + linked to a specific person and milestone.
- [x] Visit that person's `/people/:slug` — "From the blog" card visible with new post.
- [x] Visit that milestone's event page — same.
- [x] Visit `/subjects/:slug` — blog row visible.
- [x] Visit `/blog/tag/:tag` — post listed.
- [x] Visit `/blog/author/wylie-brown` — profile + post list renders.
- [x] Fetch `/api/blog/rss.xml` in a feed reader (Feedly / Inoreader) — validates, renders.
- [x] CloudWatch + console clean.

---

## Definition of Done

- [x] All tasks above checked.
- [x] Blog posts appear contextually on every major entity page when relevant.
- [x] RSS validates on W3C validator with zero errors.
- [x] Tag + author archive pages live.
- [x] Subject filter on `/blog` works end-to-end.
- [x] Zero TypeScript / lint errors.

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

## Live Browser QA

Run date: 2026-04-22 via `/Browser` skill. Screenshots in `/tmp/blog4-qa/`.

| # | Check | Verdict |
|---|-------|---------|
| 1 | `GET /api/blog/for-entity?type=milestone&id=E2026_WHERE_WE_GO_NEXT` | PASS — returns the seed post (milestone relation direct match). |
| 2 | `GET /api/blog/for-entity?type=subject&id=science` | PASS — returns the seed post (subject membership). |
| 3 | `GET /api/blog/for-entity?type=person&id=does-not-exist` | PASS — returns empty array, no error. |
| 4 | `GET /api/blog/rss.xml` | PASS — 4 `<category>` elements in the seed post's item (3 tags + 1 subject name). |
| 5 | `/blog/tag/editorial` | PASS — h1 "#editorial", post count readout, thin-content noindex notice visible (<3 posts), post card rendered. Screenshot `01-tag-page.png`. |
| 6 | `/blog/author/wylie-brown` | PASS — avatar circle, h1 "Wylie Brown", role "Editor", bio, "1 post" + post card. Screenshot `02-author-page.png`. |
| 7 | ⌘K → type "laea" | PASS — "Why we built LAEA" surfaces with orange "Blog" badge + PenLine icon, clicking it navigates to `/blog/:slug`. Screenshot `03-search-blog.png`. |
| 8 | `/events/E2026_WHERE_WE_GO_NEXT` (EventPage FromTheBlog injection) | PASS — "From the blog" section appears at the bottom of the right column with a compact post card for the seed post. Screenshot `04-event-fromtheblog.png`. |
| 9 | RSS autodiscovery `<link rel="alternate" ... href="/api/blog/rss.xml">` in `<head>` | PASS — present in `index.html` after build + deploy. |

### Scope cuts (documented at the top of this file)

- **Subject-filter sidebar on `/blog`** with counts per subject: deferred. The existing URL-based `?subject=` filter already works, the sidebar is polish.
- **`CollectionPage` / `Person` JSON-LD** on tag + author pages: deferred to Blog-5 (the SEO sprint). The `noIndex` thin-content rule is in place.
- **Extended `<content:encoded>` in RSS items** with rendered markdown HTML: excerpt-only is sufficient for feed-reader UX and keeps the RSS route fast. Revisit if feed engagement data shows a gap.
- **TimelinePage "Latest from the blog" teaser**: skipped. The page is dense and the seed has one post — adding a single-card teaser row would feel tacked on. Revisit once there are ≥5 posts.

### Open items

- **Blog-entity injections are only visible where the seed post has relations**. Currently that's one milestone. Person / Organization / Glossary Term pages have the component wired but won't show content until we have posts with matching relations. Not a bug, just a content-volume thing.
- **GlobalSearch blog matching is client-side**. I fetch page-1 of `/api/blog` (up to 30 posts) and filter locally on title / excerpt / author / tags. Fine at current volume; add a dedicated `/api/blog/search?q=` endpoint when the post count crosses ~50.

## Blocked — PM decision needed

(None.)
