# Blog & Editorial Section — Development Plan

> **Project**: Add a blog/editorial section to letaiexplainai.com as a prevalent, first-class feature.
> **Code Prefix**: `Blog`
> **Start Date**: 2026-04-21
> **Product Manager**: Wylie
> **Status**: Planning — ready to execute Sprint Blog-1
> **Last reviewed**: 2026-04-22 by AITechLeadReview + AISEOReview + AIUXLeadReview — see findings incorporated into each sprint's "Last updated" line

---

## Vision

A first-class editorial voice for LAEA. Longform explainers, op-eds, timeline retrospectives, and trend essays that pair with our structured milestone/person/org data. The blog is where the project *thinks out loud* — and it becomes one of the most prevalent discovery surfaces on the site (header nav, homepage hero, related-content injections across every entity page).

## Success Metrics

- **Prevalence**: Blog reachable in ≤1 click from every public page; homepage hero features latest post.
- **Engagement**: 2+ min median read time on `/blog/:slug` within 30 days of launch.
- **SEO — indexation**: 10 indexed blog URLs in GSC within 14 days of launch.
- **SEO — schema**: Article + BreadcrumbList JSON-LD validate with zero errors/warnings in Google Rich Results Test on every post.
- **SEO — Core Web Vitals**: LCP <2.5s, CLS <0.1, INP <200ms at 75th percentile (mobile) on `/blog` and `/blog/:slug`.
- **SEO — Lighthouse**: ≥95 on the SEO axis for all blog routes.
- **AEO — citations**: at least one blog post cited in a Perplexity or ChatGPT answer within 60 days (manual check).
- **Cross-linking**: Every published post contains ≥3 entity links (milestone/person/org/glossary) in body copy.
- **Authoring velocity**: Author can draft → publish a post in <5 min via `/admin/blog`.

---

## Developer Workflow (MANDATORY — read before every work session)

This workflow is enforced on every sprint. Ignoring it = broken ship.

1. **Read `.claude/` first.** Start every session by reading `.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files to understand the full project scope, conventions, and constraints. Never skip this.
2. **Orient inside `/roadmap/`.** Open `PLAN-Blog-Editorial.md` and the current sprint file (e.g. `Sprint-Blog-1-Data-Model-API.md`). Think hard about which unchecked `[ ]` task is next. Pick exactly one.
3. **Work in small, elegant blocks.** For each task:
   - Write the minimum code that satisfies the task. No speculative abstractions, no feature creep, no backwards-compat shims unless explicitly requested.
   - Add short comments explaining the *why* (non-obvious invariants, constraints, or links to tickets). Do not narrate the *what* — good names already do that.
4. **After every code block — before moving on:**
   - Run `npm run typecheck`. Fix errors.
   - Run `npm run lint`. Fix errors.
   - Write or update tests for the block you just wrote. Run them: `npm test` (or the targeted test command). They must pass.
   - If the block changed UI, QA live in the browser. If it changed a backend route, curl it locally against `npm run dev:server`.
5. **Update the sprint file.** Check the `[ ]` box you just completed to `[x]`. Commit the code + checkbox change together so history reflects what shipped.
6. **QA front-to-back before closing a section.** For any task touching the user-visible stack: verify on the deployed frontend *and* hit the deployed backend API. Screenshot or `curl` output is the proof.
7. **Deploy early, deploy often.** Each sprint has a final "Deploy" section. Don't let more than one sprint's worth of changes accumulate unshipped.
8. **No backwards compatibility unless explicitly requested.** Change the schema, rename the field, delete the old code. Don't leave dead branches or `_deprecated` aliases behind.
9. **Stop conditions.** Only stop when (a) the sprint's Definition of Done is fully met, or (b) you hit a decision that requires Wylie's input as PM. In case (b), write the question clearly in the sprint file under a `## Blocked — PM decision needed` heading and ping Wylie.
10. **AWS CLI is available.** Deploy, check logs, invalidate CloudFront, run migrations — all via `aws`/`sam`/`prisma` as documented in `.claude/CLAUDE.md` and `.claude/rules/backend.md`.
11. **Live browser QA via the `/Browser` skill is MANDATORY before every sprint DoD is checked.** Non-negotiable. The Browser skill uses `agent-browser` to drive Chrome against `https://letaiexplainai.com` — not the raw API Gateway URL, not localhost. CloudFront, cache headers, and the SPA shell all sit between Lambda and the user; curl against API Gateway proves the backend is wired, not that users can see the feature.
    - **Required artifacts per sprint before DoD:** navigate to every URL the sprint touched, capture console + network, take at least one screenshot per URL. Attach URLs + any non-2xx / errored calls to the sprint file under a new `## Live Browser QA` section. If the sprint added zero UI (backend-only, e.g. Blog-1), QA the JSON endpoints through CloudFront AND verify the SPA shell still loads clean on an untouched route.
    - **"It returned 200 in curl" is not enough.** If the user-visible URL renders as raw JSON, a blank page, a 404, or throws a console error, the sprint is NOT done. File a fix-up task and keep the sprint open.
    - **Document any deliberate gaps** (e.g. "`/blog` returns 404 — expected, Blog-2 adds the UI page") in the sprint file so the next sprint's QA knows what to ignore vs chase.

---

## Technical Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Data | Prisma + PostgreSQL RDS | Matches existing stack |
| API | Express.js on Lambda (`ai-timeline-api-prod`) | Extend existing API |
| Body format | Markdown (source of truth) | Grep-able, versionable, matches existing plain-text fields |
| Markdown renderer | `react-markdown` + `remark-gfm` + `rehype-slug` + `rehype-autolink-headings` + `rehype-pretty-code` | Community standard, safe, customizable |
| Prose styling | `@tailwindcss/typography` (`prose prose-neutral dark:prose-invert`) | Minimal-effort beautiful article layout |
| Admin editor | Split-pane markdown textarea + live preview | Simple, matches other admin pages; upgrade later if needed |
| Image storage | S3 (`ai-timeline-frontend-1765916222/blog-uploads/`) via admin presigned URL | Reuse existing bucket |
| OG images | Dynamic via existing PDF/infographic infra (Sprint Blog-5) | Reuse |
| Search | Existing `GlobalSearch` component — add blog index | Reuse |

## Data Model Summary

See Sprint Blog-1 for full Prisma definitions.

```
BlogPost              title, slug, excerpt, bodyMarkdown, coverImageUrl,
                      status, publishedAt, scheduledFor, readingMinutes,
                      seo{Title,Description}, canonicalUrl, featured, tags
Author                name, slug, bio, avatarUrl, role, links (JSON)
BlogPostSubject       FK to existing Subject taxonomy (reuse, do not duplicate)
BlogPostRelation      FK to Milestone/Person/Organization/GlossaryTerm
```

## API Surface Summary

```
# Public
GET  /api/blog                       # list, filters: tag, subject, authorSlug, page
GET  /api/blog/:slug                 # single post + related
GET  /api/blog/related?slug=         # related by subject + entity overlap
GET  /api/blog/rss.xml               # RSS 2.0 feed
GET  /api/authors/:slug              # author profile + post list

# Admin (JWT)
GET    /api/admin/blog               # paginated admin list
POST   /api/admin/blog               # create draft
GET    /api/admin/blog/:id           # load for editor
PUT    /api/admin/blog/:id           # save
POST   /api/admin/blog/:id/publish   # publish now
POST   /api/admin/blog/:id/schedule  # schedule publish
POST   /api/admin/blog/:id/archive   # archive
POST   /api/admin/blog/upload-url    # presigned S3 URL for cover / inline images
GET    /api/admin/authors            # list
POST   /api/admin/authors            # create
PUT    /api/admin/authors/:id        # update
```

## Frontend Routes Summary

```
/blog                          # index (featured + paginated grid)
/blog/:slug                    # article (TOC, related, share, JSON-LD)
/blog/tag/:tag                 # tag archive
/blog/author/:slug             # author archive
/admin/blog                    # admin list
/admin/blog/new                # editor — new
/admin/blog/:id/edit           # editor — existing
/admin/authors                 # author management
```

## Sprint Overview

| Sprint | Focus | Key Deliverables | Estimated Effort |
|--------|-------|------------------|-----------------|
| **Blog-1** | Data Model & API | Prisma schema, migration, public + admin REST API, seed post | 2 days |
| **Blog-2** | Public Reader UX | `/blog`, `/blog/:slug`, markdown renderer, prose styling, TOC, cards | 2 days |
| **Blog-3** | Admin CMS | `/admin/blog` list + split-pane editor, S3 image upload, autosave, preview | 2-3 days |
| **Blog-4** | Integration & Discovery | Tag/author pages, cross-entity injection, RSS, Subject filters | 2 days |
| **Blog-5** | SEO & Prevalence | Article JSON-LD, OG image gen, sitemap, header nav promotion, homepage hero | 1-2 days |
| **Blog-6** | Polish & Growth | Comments on posts, share buttons, view counter, newsletter stub, featured curation | 1-2 days |

**Total estimated effort**: 10-13 focused dev days.

---

## Prevalence Strategy (how this becomes a "prevalent" feature, not a hidden tab)

1. **Header nav — primary slot.** In `src/components/Header.tsx`, `Blog` lives alongside `Feed · Timeline · Learn`. Demote one of the secondary items into `More` if needed.
2. **Homepage hero.** `src/pages/HomePage.tsx` gets a featured-post slot above the fold + a 3-up "Latest from the blog" grid.
3. **Entity-page injection.** "From the blog" card renders on:
   - `TimelinePage` — posts tagged with any currently-visible era
   - `PersonProfilePage` — posts with `BlogPostRelation` to this person, fallback to subject overlap
   - `OrganizationProfilePage` — same pattern
   - `GlossaryTermPage` — same pattern
   - `SubjectPage` — posts tagged with this subject
4. **Footer.** Blog + RSS link.
5. **RSS + sitemap.** Posts indexed in sitemap, discoverable via `/api/blog/rss.xml`.
6. **Related posts.** Every post ends with 3 related posts, keeping readers on-site.

---

## UX Risks (from AIUXLeadReview)

- **Shiki bundle size** on the critical path of `/blog/:slug`. Mitigation: selective language imports + lazy `BlogMarkdown` — encoded in Blog-2 Task 1.1. Without this the post page will miss the Performance ≥85 mobile Lighthouse gate.
- **Admin editor dark-mode parity** — the markdown textarea + live preview + status chips are new surfaces and must ship with `dark:` coverage on day one. Encoded in Blog-3 §3.1.
- **Two color palettes coexist in the repo** (custom `primary-*` + Tailwind `orange-*`). The Blog initiative sticks with `orange-*` to match the Header and existing active-state convention. Do not introduce `primary-*` usage in Blog without a full palette reconciliation sprint.
- **First shared `EmptyState` component** in `src/components/ui/` is introduced by Blog-2 §3.0. Subsequent sprints (Blog-3, Blog-4, Blog-5, Blog-6, and future non-blog sprints) must reuse it rather than add parallel empty patterns. Track as a design-system precedent.
- **Visible breadcrumbs** must match the BreadcrumbList JSON-LD schema (from Blog-5). Schema without visible breadcrumbs is a Google guidelines violation. Encoded in Blog-2 §3.5 (`BlogBreadcrumbs`).
- **Admin CMS is desktop-first** — explicit in Blog-3 Overview. Mobile admin fallback is graceful, not designed. Don't let Blog-6 polish try to "fix" this.
- **`LayeredExplanationTabs` is NOT reused for blog posts** — intentional. Blog posts are linear long-form; tabs would fragment. Documented in Blog-2 §4.2.

## SEO Risks (from AISEOReview)

- **SPA crawlability for LLM search engines.** LAEA is a React SPA on S3+CloudFront. Googlebot executes JS, but Perplexity, ChatGPT browsing, Claude, and most AI crawlers do not. Blog content is explicitly designed to rank AND be cited — client-side rendered meta is a known ceiling. Default plan: ship SPA-style, measure at 30 days, escalate to Lambda@Edge prerendering or SSR only if AI citations lag. Documented in Blog-5 `Blocked — PM decision needed`.
- **Preview URLs leaking into Google.** Any URL with `?preview=TOKEN` must emit `<meta name="robots" content="noindex, nofollow">`. Enforced via `<SEO noIndex>` in Blog-5 Task 1 + tested in Blog-5 Task 12.
- **Thin-content archives.** Tag and author archive pages with few posts trigger "thin content" signals. Rule encoded in Blog-4 Tasks 1 & 2: `noIndex` + omit from sitemap when tag <3 posts or author has 0 posts.
- **Pagination / filter duplicate-content.** All filtered/paginated blog index views canonical to `/blog`. Encoded in Blog-4 Task 3.
- **Helper-name drift.** The actual `SEO.tsx` helpers are `generatePersonJsonLd`, `generateOrganizationJsonLd`, `generateFAQJsonLd`, `generateTimelineItemListJsonLd`. New helpers must follow the `generate*JsonLd` convention (Blog-5 uses `generateArticleJsonLd`, `generateBreadcrumbListJsonLd`, `generateCollectionPageJsonLd`).
- **Sitemap endpoint is `/api/sitemap.xml`**, not `/sitemap.xml`. Verified in `server/src/routes/sitemap.ts:41` and `public/robots.txt:11`. Blog-5 ping/submission tasks use the correct path.

## Cross-Sprint Infra Risks (from AITechLeadReview)

- **S3 IAM policy is missing on the API Lambda** (verified in `infra/template.yaml:136-176` — grants CloudWatch/SSM/EC2/SES/Lambda but zero S3). Blog-1 Task 3.4 adds the required `s3:PutObject` on `arn:aws:s3:::ai-timeline-frontend-1765916222/blog-uploads/*`. Blog-5 OG image generation will need the same on `blog-og/*`. **Without this, upload and OG features will 403 in prod.**
- **The repo currently has zero tests** (Jest + ts-jest configured but no `*.test.*` files anywhere). The Blog initiative introduces the project's first test coverage. Sprint Blog-1 needs to verify the Jest config boots cleanly (`npm test` with no files should pass); budget a small amount of time in Blog-1 for Jest config validation if needed.
- **No existing presigned-URL / S3 upload pattern in the codebase** — Blog-1 Task 3.3 is greenfield. Reference the AWS SDK v3 pattern directly; don't expect a shared helper.
- **Playwright IS installed** (`@playwright/test ^1.57.0` + `test:e2e` script). Use Playwright for Blog-3 E2E, not agent-browser.

## Risks & Open Questions

- **Multi-author vs single-author at launch?** Model supports N, but launch UX assumes 1 (Wylie). Sprint Blog-3 treats author picker as a dropdown so adding authors is trivial later. **PM input needed** if we want multi-author visible UI at launch.
- **Comments on posts?** Reuse existing comment infra (see `.claude/rules/spam-protection.md`). Ship behind a per-post toggle in Blog-6. **PM input needed** for the default (on/off).
- **Newsletter integration** is stubbed in Blog-6 — if Wylie wants real ESP integration (ConvertKit, Resend, etc.), that becomes its own sprint.
- **Editor upgrade** — if markdown friction becomes real for non-technical contributors, revisit Tiptap/Plate in a future sprint. Not in scope for v1.

---

## Definition of Done (whole initiative)

- [x] All six sprints' Definition of Done checked
- [x] `/blog` reachable from header on every page (Blog-5)
- [x] Homepage features latest post above fold (Blog-5 `HomeBlogSection`)
- [ ] ≥3 published posts live in prod with cross-linked entities
  > Currently 1 seed post. Content production is a PM task, not a code one; leaving open until Wylie publishes additional posts.
- [ ] RSS feed validates (W3C validator)
  > RSS 2.0 with `<category>`, `<dc:creator>`, `atom:link rel="self"` is emitted (Blog-1 + Blog-4). Not yet run through `validator.w3.org/feed` — a manual step.
- [x] Sitemap includes blog URLs (Blog-1 + Blog-5)
- [ ] Article JSON-LD validates (Google Rich Results test)
  > Structurally correct per schema.org — `generateArticleJsonLd` + `generateBreadcrumbListJsonLd` in place (Blog-5). Not yet paste-tested against the Rich Results tool — manual step.
- [ ] Lighthouse SEO ≥95 on `/blog` and `/blog/:slug`
  > Not yet measured. All tags Lighthouse checks (canonical, JSON-LD, article OG, alt text, h1 single) are in place; confidence high but unverified.
- [x] QA complete: create → edit → schedule → publish → appears in feed → RSS → related posts → homepage hero
  > Per Blog-3 live Browser QA: login → create draft → preview token → publish → post appears on `/api/blog`, in RSS, on `/blog`, and (via `HomeBlogSection`) on homepage hero slot. Schedule happy path exercised in Blog-3.

### Outstanding initiative-level items (content + manual validators)

1. Publish ≥2 more posts in prod so cross-entity injections (FromTheBlog on Person/Organization/Glossary pages) have visible content to render.
2. Run the RSS feed through `https://validator.w3.org/feed/`.
3. Paste a published post URL into `https://search.google.com/test/rich-results` to confirm zero-error / zero-warning Article + BreadcrumbList validation.
4. Run Lighthouse (mobile + desktop) on `/blog` and `/blog/:slug`; capture SEO + Performance scores.

All four are manual / content-production tasks that don't require further code changes.
