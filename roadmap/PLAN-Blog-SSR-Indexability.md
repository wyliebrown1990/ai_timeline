# Blog SSR & Indexability — Development Plan

> **Project**: Make every blog URL ship complete, meaningful HTML (title, body, headings, metadata, JSON-LD) in the initial server response — for all user agents, not just bots — then get those URLs indexed in Google Search Console.
> **Code Prefix**: `SSR`
> **Start Date**: 2026-07-01
> **Product Manager**: Wylie
> **Status**: Planning — ready to execute Sprint SSR-1
> **Priority**: P0 — blocks all organic search and AI-citation value from the blog

---

## Vision

The blog renders entirely client-side today: `curl -sL https://letaiexplainai.com/blog/<slug>` returns an empty SPA shell ("Let AI Explain AI") with zero article content. Google renders JS slowly and unreliably, and most LLM crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended, CCBot) don't execute JavaScript at all — so our best content is invisible to both search and AI answers (`site:letaiexplainai.com/blog` returns nothing; the domain ranks for only 2 keywords). This initiative server-renders the blog routes through the existing Express Lambda, routes `/blog*` through CloudFront to that origin, and hardens metadata, structured data, sitemap, and crawler access so every existing and future post is fully crawlable from its first request.

## Success Metrics

- `curl -sL https://letaiexplainai.com/blog/<slug>` (no JS) returns the full article title, body copy, and H2s in raw HTML for **every** published post
- Server-rendered `<head>` on every post: unique title, meta description, canonical, OG tags, `twitter:card`
- `Article` (+ `FAQPage` where applicable) JSON-LD in raw HTML passes the Rich Results Test
- GSC URL Inspection → "View Crawled Page" shows full article content
- ≥3 posts move to "Indexed" in Search Console within ~1 week of Sprint SSR-4 completing
- Future posts published via `/AIBlogDraft` are verified crawlable as part of the publish flow (regression-proof)

---

## Developer Workflow (MANDATORY — read before every work session)

This workflow is enforced on every sprint. Ignoring it = broken ship.

1. **Read `.claude/` first.** `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` + the relevant `.claude/rules/*.md` files (`frontend.md`, `backend.md`, `build-and-deploy-security.md` for this initiative). Never skip.
2. **Orient inside `/roadmap/`.** Open this PLAN and the current sprint file. Pick exactly one unchecked `[ ]` task.
3. **Write elegant code in small blocks.** Minimum code to satisfy the task. Short *why* comments only. No speculative abstractions.
4. **After every code block, before moving on**:
   - `npm run typecheck` (zero errors)
   - `npm run lint` (zero errors)
   - Write/update tests covering what changed
   - `npm test` (all pass)
5. **Update the sprint file.** `[ ] → [x]` on the task just completed. Commit code + checkbox together.
6. **QA front-to-back.** Any UI change: verify local (`localhost:5173`) and prod (`letaiexplainai.com`) with `/Browser` (agent-browser). Any API change: `curl` prod + `aws logs tail /aws/lambda/ai-timeline-api-prod`. For this initiative, "QA" always includes **raw-HTML checks with `curl` — never trust DevTools Inspect** (it shows the post-JS DOM).
7. **Deploy early, deploy often.** Each sprint has a Deploy section. Don't let more than one sprint accumulate unshipped.
8. **No backwards compatibility** unless Wylie explicitly requested it.
9. **Stop conditions**: DoD met, or PM decision needed. For PM decisions, write the question under `## Blocked — PM decision needed` in the relevant sprint and ping Wylie.
10. **AWS CLI available** — deploy, logs, invalidate CloudFront, migrations per `.claude/CLAUDE.md` and `.claude/rules/backend.md`.

---

## Current State (verified against the codebase, 2026-07-01)

| Area | Reality |
|------|---------|
| Blog frontend | `src/pages/BlogIndexPage.tsx`, `BlogPostPage.tsx`, `BlogTagPage.tsx` — pure client-side React Router routes in the Vite SPA. S3 + CloudFront serve the empty `index.html` shell for every `/blog/*` URL. |
| Blog metadata | `src/components/SEO.tsx` + `react-helmet-async` already emit per-post title/description/canonical/OG **and** `Article` + `BreadcrumbList` JSON-LD (`generateArticleJsonLd`) plus `article:*` OG tags — but all **client-injected**, invisible without JS. |
| Blog data/API | `BlogPost` Prisma model (`bodyMarkdown`, `seoTitle`, `seoDescription`, `canonicalUrl`, `tags`); public API at `/api/blog`, `/api/blog/:slug`, `/api/blog/rss.xml` on the `ai-timeline-api-prod` Express Lambda. Markdown rendered with `react-markdown@10` + `remark-gfm` (SSR-compatible). |
| Sitemap | `/api/sitemap.xml` (`server/src/routes/sitemap.ts`) already includes blog index, every published post with `<lastmod>`, tag archives (≥3 posts), and author archives. Referenced from `public/robots.txt`. |
| robots.txt | `User-agent: * / Allow: /` — nothing blocks `/blog` or AI crawlers, but no explicit AI-crawler stanzas either. |
| Bot cloaking | Lambda@Edge `ai-timeline-og-tags-edge` (`infra/edge-og-tags/index.js`, viewer-request on CloudFront `E23Z9QNRPDI3HW`) serves crawler-only HTML for `/news/:id` and `/glossary/:slug`. It does **not** cover `/blog` (passes through), and its crawler list omits GPTBot/ClaudeBot/PerplexityBot/CCBot. This is exactly the "dynamic rendering" stopgap the brief tells us to avoid for the blog. |
| GSC | Property verified; OAuth pipeline exists (`server/src/services/gsc/`, Sprint SEOI-1). |

**Step 0 of the dev brief (confirm diagnosis) is done**: the SPA shell contains no article HTML; the blog is client-rendered. Sprint SSR-1's prerequisites re-verify this against live prod with `curl` before any code is written.

## Chosen Architecture (and why)

**Runtime SSR of the blog routes on the existing `ai-timeline-api-prod` Express Lambda, fronted by a new CloudFront cache behavior `/blog*` → API Gateway origin, with edge caching + invalidation on publish.**

- **Real SSR for all user agents** — no bot sniffing, no cloaking, satisfies the brief's "prefer real SSR over dynamic rendering" and Google's guidelines.
- **Single rendering source** — the same React components (`BlogPostPage`, `SEO.tsx`, `react-markdown`) render on server and client via a Vite SSR bundle + `hydrateRoot`. No duplicated HTML templates to drift (AISlopReviewer concern).
- **Fixes all existing posts at once and every future post automatically** — content is rendered from the DB at request time; publishing via `/AIBlogDraft` or the admin CMS needs no rebuild, only a CloudFront invalidation (added in SSR-2).
- **Extends existing infra** — no new Lambda, no new framework, no Astro/Next migration. The API Lambda already has DB access, 30s timeout, and (almost certainly) an existing API Gateway origin on the distribution (robots.txt already serves `letaiexplainai.com/api/sitemap.xml` through it — SSR-2 verifies).
- **Alternative considered — publish-time static prerender to S3**: simpler runtime, but requires regeneration triggers on every publish/update/unpublish/redeploy, S3-write + invalidation plumbing in the Lambda, and full re-render of all posts on any layout change. More moving state, same end result. Rejected; documented here so it isn't re-litigated.

## Technical Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| SSR renderer | `ReactDOMServer.renderToString` via a dedicated `src/entry-server.tsx` built with `vite build --ssr` | Reuses existing React components; official Vite SSR path; no new framework |
| Head management | `react-helmet-async` server API (`HelmetProvider context`) | Already used everywhere (`SEO.tsx`); server render emits the exact same tags into raw HTML |
| Data for SSR | Direct Prisma/service calls in the SSR Express handler + `window.__SSR_DATA__` for hydration | Avoids HTTP self-calls from the Lambda; client hydrates without refetch flash |
| Hydration | `hydrateRoot` on blog routes (else `createRoot` as today) in `src/main.tsx` | Standard React 18 SSR pattern |
| HTML shell | Built `dist/index.html` fetched from the frontend origin at Lambda cold start and cached in memory | Decouples backend deploys from frontend asset hashes |
| Routing | CloudFront behavior `/blog*` → API Gateway origin | Same distribution, same domain; edge caching keeps Lambda load low |
| Cache strategy | Origin `Cache-Control: public, max-age=300, s-maxage=3600` + `cloudfront:CreateInvalidation` of `/blog*` on publish/update/unpublish | Fresh content on publish; cheap steady-state |

## Data Model Summary

No schema changes. `BlogPost` already carries everything SSR needs (`bodyMarkdown`, `seoTitle`, `seoDescription`, `canonicalUrl`, `excerpt`, `tags`, `publishedAt`, `updatedAt`, author relation). FAQPage JSON-LD (SSR-3) is derived from the markdown structure, not stored.

## API / Route Surface Summary

```
# New server-rendered HTML routes on ai-timeline-api-prod (mounted at /blog, NOT /api/blog)
GET /blog                    → SSR blog index
GET /blog/:slug              → SSR post (404 + noindex for unknown slug)
GET /blog/tag/:tag           → SSR tag archive
GET /blog/author/:slug       → SSR author archive

# Existing, unchanged
GET /api/blog, /api/blog/:slug, /api/blog/rss.xml
GET /api/sitemap.xml         (already includes all blog URLs with lastmod)
```

## Frontend Routes Summary

Unchanged routes; `main.tsx` gains SSR hydration for `/blog*`; `App.tsx` untouched except any SSR-safety guards found in SSR-1.

## Sprint Overview

| Sprint | Focus | Key Deliverables | Estimated Effort |
|--------|-------|------------------|------------------|
| **SSR-1** | SSR foundation | Vite SSR build, `entry-server.tsx`, Express SSR routes for all 4 blog surfaces, helmet server-side head (title/desc/canonical/OG/JSON-LD in raw HTML), hydration, local `curl` acceptance | 3–4 days |
| **SSR-2** | Infra, deploy pipeline & rollout | Lambda packaging of SSR bundle, CloudFront `/blog*` behavior, cache headers + invalidation-on-publish, deploy-script updates, prod verification of **every** published post | 2–3 days |
| **SSR-3** | Structured data & metadata hardening | FAQPage JSON-LD from post FAQ sections, metadata uniqueness audit, real 404s for unknown slugs, Rich Results Test validation on all posts | 2 days |
| **SSR-4** | Crawler access, GSC indexing & future-proofing | robots.txt AI-crawler stanzas + llms.txt blog section, GSC sitemap re-submit + Request Indexing, `/AIBlogDraft` publish-flow crawlability check, 1-week indexation monitoring | 1–2 days + 1 week monitoring |

**Total estimated effort**: 8–11 working days, plus ~1 week passive GSC monitoring.

---

## Prevalence / Integration Strategy

Discovery surfaces already exist from Sprints Blog-4/Blog-5 (header nav, homepage feature slot, footer, RSS, sitemap, entity cross-links). This initiative makes those URLs *readable by machines*; the only new discovery work is explicit AI-crawler allowance in `robots.txt`, a blog section in `llms.txt`, and GSC indexing requests (SSR-4).

## Risks & Open Questions

- **SSR-unsafe imports**: `entry-server.tsx` imports only the blog pages + minimal providers, but those pages' transitive imports may touch `window`/`document` at module scope. SSR-1 budgets time to add guards; if a dependency is fundamentally unrenderable server-side, swap it on blog pages rather than shimming globally.
- **CloudFront distribution is not in IaC** (`infra/template.yaml` has no distribution resource). SSR-2 inspects the live config with `aws cloudfront get-distribution-config` before changing behaviors, and documents the final behavior set in `.claude/rules/backend.md`.
- **Lambda@Edge og-tags interaction**: the viewer-request function passes `/blog*` through today — it must stay that way, and Googlebot on `/blog` must reach the SSR origin, not a cloaked page. Covered by explicit tests in SSR-2. Migrating `/news` + `/glossary` off cloaking onto real SSR is **out of scope** — logged as a candidate follow-up initiative.
- **Hydration mismatches** (dates, relative-time rendering) can cause React 18 hydration errors. SSR-1 verifies a clean console on hydration.
- **VPC Lambda → CloudFront API**: `cloudfront:CreateInvalidation` from the API Lambda traverses the NAT instance. Works, but confirm in SSR-2 backend validation.
- **Cost**: no new billable resources. CloudFront invalidations stay far under the 1,000 free paths/month at current publish volume; marginal Lambda invocations for `/blog*` are noise. Nothing needs cost approval.

---

## Definition of Done (whole initiative)

- [ ] All sprint DoDs (SSR-1 → SSR-4) checked
- [ ] Deployed to prod
- [ ] `curl -sL https://letaiexplainai.com/blog/<slug>` returns full article HTML (title, body, H2s, head metadata, JSON-LD) for every published post — no JS execution
- [ ] Rich Results Test passes on every published post
- [ ] GSC: sitemap submitted, ≥3 posts "Indexed", "View Crawled Page" shows full content
- [ ] `/AIBlogDraft` skill updated so every future publish is verified crawlable
- [ ] `.claude/rules/backend.md` + `.claude/CLAUDE.md` updated with the new `/blog*` CloudFront behavior and SSR deploy notes
- [ ] Lighthouse on a post page: Performance ≥90, Accessibility ≥95, SEO ≥95
- [ ] CloudWatch clean post-launch
