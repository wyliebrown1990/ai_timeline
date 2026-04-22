# Sprint Blog-5: SEO & Prevalence

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-22 by Claude (AIUXLeadReview — explicit responsive + state specs for HomePage blog section, Header active-state reuse, keyboard shortcut `g b`, PenLine icon confirmed)

> Previous: 2026-04-21 by Claude (AISEOReview — fixed helper names, sitemap URL, added breadcrumb/CollectionPage/article OG tags, GSC+MFT+PSI tasks, SPA crawlability call-out, llms.txt)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `.claude/CLAUDE.md`, `.claude/rules/frontend.md`, and the existing SEO sprint docs `Sprint-SEO-1-Foundation.md` and `Sprint-SEO-5-Content-Freshness-EEAT.md` for precedent.
2. Re-read `roadmap/PLAN-Blog-Editorial.md` **Developer Workflow (MANDATORY)** section.
3. Confirm Sprint Blog-1/2/3/4 DoDs complete.
4. Pick the next unchecked `[ ]` task below.
5. typecheck → lint → tests → QA with live validator tools → commit → check the box.
6. Stop only when DoD met or PM decision needed.

---

## Overview

Make the blog unmissable and indexable. Article JSON-LD, dynamic OG images, sitemap inclusion, canonical URLs — and critically, **promote Blog into the primary header nav and homepage hero** so it becomes a prevalent feature, not a hidden tab.

**Priority**: HIGH (prevalence was the user's explicit ask)
**Depends on**: Blog-1/2/3/4 shipped to prod
**Estimated Effort**: 1-2 days
**Status**: Not started

---

## Prerequisites

- [ ] Blog-1/2/3/4 DoDs complete; ≥3 published posts live on prod.
- [ ] Review existing SEO patterns: `src/components/SEO/` if present; how other pages set `<title>` / meta tags (maybe `react-helmet-async`? check `package.json`).

---

## Tasks

### 1. Per-post SEO meta tags (REUSE `<SEO>` — do not hand-roll)

> **Verified by AISEOReview**: `src/components/SEO.tsx` already emits title, description, canonical, robots, full OG set (type/url/title/description/image/site_name/locale), Twitter Card (`summary_large_image`), and JSON-LD. Do not duplicate. Pass props.

- [ ] On `BlogPostPage.tsx`, render the existing `<SEO>` component with these props:
  ```tsx
  <SEO
    title={post.seoTitle ?? post.title}
    description={(post.seoDescription ?? post.excerpt).slice(0, 160)}
    canonical={post.canonicalUrl ?? `https://letaiexplainai.com/blog/${post.slug}`}
    type="article"
    image={post.ogImageUrl ?? post.coverImageUrl ?? undefined}
    jsonLd={[articleSchema, breadcrumbSchema]}
    noIndex={isPreview}
  />
  ```
- [ ] Enforce meta description length: warn/truncate outside 140-160 chars at the admin editor boundary (Blog-3 should add a char counter — cross-sprint note).
- [ ] Enforce `<title>` length ≤60 chars (similarly warn in admin editor).
- [ ] **Add `article:*` OG tags** (the default `<SEO>` component does not emit these — extend `SEO.tsx` with an optional `articleMeta` prop OR emit them directly from `BlogPostPage.tsx` inside the same `<Helmet>` scope):
  - `<meta property="article:published_time" content={ISO date} />`
  - `<meta property="article:modified_time" content={ISO date} />`
  - `<meta property="article:author" content={author URL} />`
  - `<meta property="article:section" content={primary subject name} />`
  - `<meta property="article:tag" content={tag} />` (one per tag)
- [ ] Preview-URL handling: if `?preview=TOKEN` is present in the URL, pass `noIndex={true}` to `<SEO>`. Prevents indexable shared preview URLs. (Cross-ref: Blog-3 generates these tokens.)

### 2. Article + Breadcrumb JSON-LD (extend `SEO.tsx`)

> **Verified by AISEOReview**: actual helper names in `SEO.tsx` are `generatePersonJsonLd`, `generateOrganizationJsonLd`, `generateFAQJsonLd`, `generateTimelineItemListJsonLd` — NOT `PersonJsonLd` etc. Match this convention for the new helpers.

- [ ] Add `generateArticleJsonLd({ post, authorUrl })` to `src/components/SEO.tsx`. Return object shape:
  ```ts
  {
    '@context': 'https://schema.org',
    '@type': 'Article',            // Use 'BlogPosting' if the initiative treats these as blog posts specifically
    headline: post.title,          // ≤110 chars per Google guidance
    description: post.excerpt,
    image: post.ogImageUrl ?? post.coverImageUrl,
    datePublished: post.publishedAt,   // ISO 8601
    dateModified: post.updatedAt,      // ISO 8601 — REQUIRED for freshness signal
    author: { '@type': 'Person', name: author.name, url: authorUrl },
    publisher: {
      '@type': 'Organization',
      name: 'Let AI Explain AI',
      logo: { '@type': 'ImageObject', url: 'https://letaiexplainai.com/logo-512.png' }
    },
    mainEntityOfPage: `https://letaiexplainai.com/blog/${post.slug}`,
    keywords: post.tags.join(', '),
    wordCount: post.wordCount,         // compute from bodyMarkdown on publish
    timeRequired: `PT${post.readingMinutes}M`   // ISO 8601 duration
  }
  ```
- [ ] Add `generateBreadcrumbListJsonLd(crumbs: { name: string; url: string }[])` to `SEO.tsx`. For blog posts, crumbs are: Home → Blog → {post.title}. Emit alongside Article JSON-LD as an array via `jsonLd={[articleSchema, breadcrumbSchema]}`.
- [ ] Validate BOTH schemas in Google Rich Results Test (`https://search.google.com/test/rich-results`) — zero errors, zero warnings.
- [ ] Validate in schema.org validator (`https://validator.schema.org/`) as secondary check.
- [ ] Unit test both builders (edge cases: missing cover image, missing tags, escaped characters in title).

### 3. Dynamic OG image generation

- [ ] Option A (ship fastest): Use a Lambda endpoint `GET /api/blog/og-image?slug=` that renders an SVG → PNG with post title, author, LAEA logo using `@vercel/og` or `satori` + `@resvg/resvg-js`. Cache result in S3 (`s3://ai-timeline-frontend-.../og-cache/{slug}.png`) for 24h.
- [ ] Option B (simpler, acceptable for v1): generate at publish-time in `blogAdmin.publishPost`, store PNG in S3, save URL on the post. **Preferred for v1** — no cold-start cost on first share.
- [ ] Implement Option B:
  - Add `generateOgImage(post)` in `server/src/services/blogAdmin.ts`.
  - Template: 1200x630, LAEA orange accent, title (wrap at 40 chars), author, "letaiexplainai.com" footer.
  - Store as `blog-og/{slug}.png`.
  - Save resulting URL on `post.ogImageUrl` (add column to Prisma — migration needed).
- [ ] Verify rendered image by visiting the S3 URL.
- [ ] Share a post URL in a Slack preview / Twitter post-compose window → confirm the image renders correctly.

### 4. Sitemap + robots + llms.txt

> **Verified by AISEOReview**: sitemap endpoint is `/api/sitemap.xml` (not `/sitemap.xml`) — confirmed in `server/src/routes/sitemap.ts:41` and `public/robots.txt:11`. Existing `changefreq` + `priority` conventions from sitemap.ts: Persons/Orgs weekly+0.7, Glossary monthly+0.6, Events monthly+0.5-0.7.

- [ ] Extend `server/src/routes/sitemap.ts` — add:
  - `/blog` index — `changefreq: daily`, `priority: 0.9` (high — important hub)
  - Every published post `/blog/:slug` — `changefreq: weekly`, `priority: 0.7`, `lastmod = post.updatedAt`
  - Every tag archive `/blog/tag/:tag` — `changefreq: monthly`, `priority: 0.5` — SKIP tags with <3 posts (thin content)
  - Every author archive `/blog/author/:slug` — `changefreq: monthly`, `priority: 0.5` — SKIP authors with 0 posts
- [ ] Confirm `public/robots.txt` is unchanged — the existing `Disallow: /admin/` already covers `/admin/blog*` preview URLs. No edit required.
- [ ] After deploy, submit sitemap via Google Search Console UI (more reliable than the deprecated ping endpoint): GSC → Sitemaps → enter `api/sitemap.xml` → Submit.
- [ ] Create `public/llms.txt` pointing LLM crawlers (Perplexity, ChatGPT, Claude) at the blog index + canonical entity URLs. Follows the emerging `llms.txt` standard (https://llmstxt.org). Example contents:
  ```
  # Let AI Explain AI
  > Timeline, glossary, profiles, and blog for the history of AI.

  ## Blog
  - [Blog index](https://letaiexplainai.com/blog): Longform AI explainers and essays.
  - [RSS feed](https://letaiexplainai.com/api/blog/rss.xml)

  ## Reference
  - [Timeline](https://letaiexplainai.com/timeline)
  - [Glossary](https://letaiexplainai.com/glossary)
  - [People](https://letaiexplainai.com/people)
  - [Organizations](https://letaiexplainai.com/organizations)
  ```

### 5. Prevalence — Header nav promotion

- [ ] Edit `src/components/Header.tsx`:
  - Add `Blog` to `primaryLinks` with `PenLine` icon from lucide-react (not used elsewhere in primary):
    ```tsx
    { to: '/blog', label: 'Blog', icon: PenLine, exact: false },
    ```
  - Primary nav target: `Feed · Timeline · Blog · Learn` (4 items — at desktop ceiling; see Blocked for the PM call).
  - Active-state styling reuses the existing convention: `bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400` (already in Header.tsx — extending, not reinventing).
  - Mobile menu naturally picks it up via `allLinks`.
- [ ] Verify active-state styling highlights correctly on `/blog`, `/blog/:slug`, `/blog/tag/*`, `/blog/author/*` (use `exact: false` + matching on `location.pathname.startsWith('/blog')`).
- [ ] Keyboard shortcut (added by AIUXLeadReview): register `g b` (Gmail-style two-key) as a shortcut to `/blog` in the existing `KeyboardShortcutsHelp.tsx`. Follow the precedent of existing shortcuts on Timeline page. This is low-effort prevalence + accessibility.

### 6. Prevalence — HomePage feature slot

- [ ] Edit `src/pages/HomePage.tsx`:
  - Add a "Featured from the blog" section above the fold: large card for the most recent `featured: true` post (fall back to most recent published).
  - Below: 3-up "Latest from the blog" grid.
  - Use `BlogPostCard` variants from Blog-2.
  - Fetch via `blogApi.list({ pageSize: 4 })` with React Query (`staleTime: 60_000`).
  - Responsive (EXPLICIT — added by AIUXLeadReview):
    - `sm` (<640px): stacked, featured card full-width, 3-up collapses to 1 column.
    - `md` (≥768px): featured full-width, 3-up becomes 2-up.
    - `lg` (≥1024px): featured full-width OR side-by-side with first latest-post, 3-up below.
  - **State checklist for the HomePage blog section:**
    - [ ] Loading: 1 × featured skeleton + 3 × `<BlogPostCardSkeleton variant="default">` — matches the populated layout's card count/shape.
    - [ ] Populated: hero + 3-up grid.
    - [ ] Empty (no posts published yet): hide the section entirely — do NOT render a placeholder. The homepage has plenty of content already.
    - [ ] Error: silent no-op (don't break the homepage over a secondary section); log to console.
  - Section heading `<h2>` "From the blog" with "View all →" link to `/blog` in the top-right of the section.

### 7. Prevalence — Footer

- [ ] Add "Blog" + "RSS" links to the existing `src/components/Footer.tsx` (~40 lines, imported by `Layout.tsx`). Do not create a new footer.
- [ ] Blog link → `/blog`. RSS → `/api/blog/rss.xml` (opens in new tab with `rel="noopener"`).

### 8. Migration for OG image URL column

- [ ] Add `ogImageUrl String?` to `BlogPost` in `prisma/schema.prisma`.
- [ ] `npx prisma migrate dev --name add_blog_og_image`.
- [ ] Run prod migration after deploy.

### 9. Tests

- [ ] Unit test JSON-LD builder.
- [ ] Unit test OG image generation (mocked rendering).
- [ ] Snapshot test Header nav contains "Blog".
- [ ] Snapshot test HomePage includes blog section.
- [ ] `npm test` + `npm run typecheck` + `npm run lint` — all green.

### 10. Deploy

- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`.
- [ ] Prod migration: `export DATABASE_URL=... && npx prisma migrate deploy`.
- [ ] Frontend: `npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete && aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`.

### 11. QA — Live on prod (expanded for SEO validation)

- [ ] `https://letaiexplainai.com` — hero features blog post; 3-up grid below.
- [ ] Header shows Blog in primary nav; active states work.
- [ ] `https://letaiexplainai.com/blog/:slug` — view source, confirm meta + JSON-LD (Article + BreadcrumbList) + `article:*` OG tags present.
- [ ] **Google Rich Results Test** (`https://search.google.com/test/rich-results`) → Article schema + BreadcrumbList both validate with zero errors and zero warnings on ≥2 representative posts.
- [ ] **Schema.org Validator** (`https://validator.schema.org/`) → zero errors on the same posts.
- [ ] **Mobile-Friendly Test** (`https://search.google.com/test/mobile-friendly`) → pass on `/blog` and `/blog/:slug`.
- [ ] **PageSpeed Insights** (`https://pagespeed.web.dev/`) — run on `/blog` and `/blog/:slug`. Record LCP, CLS, INP for mobile + desktop. Target: LCP <2.5s, CLS <0.1, INP <200ms.
- [ ] **Lighthouse SEO ≥95** on `/blog`, `/blog/:slug`, `/blog/tag/:tag`, `/blog/author/:slug` (harmonized with Blog-2 — update Blog-2 from ≥90 to ≥95).
- [ ] Paste post URL into Twitter/LinkedIn/Slack compose → OG image renders beautifully (1200×630, readable, on-brand).
- [ ] `curl https://letaiexplainai.com/api/sitemap.xml | grep /blog/` shows all post URLs.
- [ ] `curl https://letaiexplainai.com/llms.txt` returns the new file.
- [ ] RSS feed link in `<head>` detected by a feed reader browser extension.

### 12. GSC + indexation follow-up (REQUIRED — don't skip)

- [ ] **GSC → Sitemaps** — re-submit `api/sitemap.xml`. Confirm "Success" status within 24h.
- [ ] **GSC → URL Inspection** — for the top 3 blog URLs: Request Indexing. Screenshot "URL is on Google" once processed (typically 1-7 days).
- [ ] **GSC → Enhancements → Breadcrumbs + Article** — confirm rich results eligibility shows up in GSC within 14 days.
- [ ] Set a reminder: 30-day post-launch check in GSC → Performance for the `/blog/*` URL filter — record impressions, clicks, CTR, average position.
- [ ] **Preview URL safety check**: fetch `/blog/some-draft?preview=TOKEN` as Googlebot (curl with Googlebot UA) → confirm `<meta name="robots" content="noindex, nofollow">` is present.

---

## Definition of Done

- [ ] All tasks above checked.
- [ ] Blog visible in header on every page.
- [ ] Homepage features latest post.
- [ ] Article + BreadcrumbList JSON-LD validate in Rich Results Test (zero errors, zero warnings).
- [ ] `article:*` OG tags present on every post.
- [ ] Preview-token URLs return `noindex`.
- [ ] OG images render on social shares (Twitter/LinkedIn/Slack confirmed).
- [ ] Sitemap includes all blog URLs; resubmitted via GSC UI.
- [ ] llms.txt live at `https://letaiexplainai.com/llms.txt`.
- [ ] Lighthouse SEO ≥95 on every blog route.
- [ ] PSI mobile LCP <2.5s, CLS <0.1, INP <200ms on blog routes.
- [ ] GSC URL Inspection shows "URL is on Google" for ≥3 posts within 14 days.
- [ ] Zero TypeScript / lint errors.

---

## Files Touched (expected)

```
src/components/Header.tsx                           (modify — primary nav)
src/pages/HomePage.tsx                              (modify — featured + grid)
src/pages/BlogPostPage.tsx                          (modify — head tags, JSON-LD)
src/components/Layout.tsx or Footer.tsx             (modify — footer links)
src/components/SEO.tsx                              (modify — add ArticleJsonLd helper)
server/src/services/blogAdmin.ts                    (modify — OG image generation)
server/src/routes/sitemap.ts                        (modify)
prisma/schema.prisma                                (modify — ogImageUrl)
prisma/migrations/<ts>_add_blog_og_image/           (new)
package.json                                        (modify — satori / resvg-js / helmet)
```

---

## Blocked — PM decision needed

- [ ] **Header real estate**: promoting Blog to primary nav means showing `Feed · Timeline · Blog · Learn` on desktop. That's four items — tight but workable. Alternative: demote Learn into "More". **Default plan: keep Learn in primary, accept 4-wide; revisit if mobile menu feels crowded.** Ping Wylie only if you see real layout issues.
- [ ] **SPA crawlability for ranking-critical pages** (flagged by AISEOReview): LAEA is a React SPA served from S3+CloudFront. Googlebot executes JavaScript, but Perplexity, ChatGPT browsing, Claude, and many crawlers do NOT. For the blog — which is *explicitly* designed to win organic traffic and AI citations — this is a strategic decision point. Options in order of effort:
  1. **Accept client-side rendering** (current default; matches rest of site). Relies on Googlebot JS. May hurt AI engine citation.
  2. **Add Lambda@Edge / CloudFront Function prerendering** for `/blog/*` only (intercept bot UAs, return prerendered HTML).
  3. **Migrate blog pages to SSR** (Next.js, Remix, or a small SSR shim).
  Recommended default: ship (1) and measure. If GSC impressions grow but AI citations lag (check Perplexity/ChatGPT manually after 30 days), escalate to (2). **Ping Wylie with 30-day data before committing to (2) or (3).**
