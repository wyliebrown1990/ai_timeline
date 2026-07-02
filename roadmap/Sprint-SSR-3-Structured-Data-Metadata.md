# Sprint SSR-3: Structured Data & Metadata Hardening

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-07-01 by Claude (sprint created — no tasks started)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`frontend.md`, `backend.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-Blog-SSR-Indexability.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm any prerequisite sprints' Definitions of Done are fully checked. If not, finish them first.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

With SSR live, the raw HTML now carries whatever `SEO.tsx` emits — so this sprint audits and hardens what's emitted. Add `FAQPage` JSON-LD for posts with Q&A sections (a strong lever for AI Overviews and rich results), verify per-post metadata uniqueness and length across the whole catalog, and validate every post with Google's Rich Results Test. All improvements land in the shared components/generators (`SEO.tsx`, JSON-LD helpers) — they apply to every existing post immediately and every future post automatically.

**Priority**: HIGH (P0 initiative)
**Depends on**: Sprint SSR-2 (SSR live on prod)
**Estimated Effort**: 2 days
**Status**: Not started

---

## Prerequisites

- [ ] Sprint SSR-2 DoD fully checked (`scripts/verify-blog-ssr.sh` 100% PASS)
- [ ] Local dev running: `npm run dev` + `npm run dev:server`

---

## Tasks

### 1. FAQPage JSON-LD for posts with Q&A sections

- [ ] **REUSE the existing `generateFAQJsonLd(faqs: FAQItem[])`** at `src/components/SEO.tsx:230` — it already emits a `FAQPage` schema, filters empty Q/A, and returns `null` when there are none. Do NOT add a parallel `generateFaqPageJsonLd`. (`generateArticleJsonLd` and `generateBreadcrumbListJsonLd` live in this same file too — there is no `src/lib/jsonLd.ts`.)
- [ ] Add ONLY the genuinely-new piece: `extractFaq(bodyMarkdown): FAQItem[]` (reuse the existing `FAQItem` type from `SEO.tsx`) — detect an FAQ section (`## FAQ`-style heading, or `###` question headings ending in `?`) and return `{question, answer}` pairs; render answers to plain text via the existing `react-markdown`/`remark-gfm` pipeline. Put it beside `generateFAQJsonLd` in `src/components/SEO.tsx` (or a colocated helper it imports), not a new parallel module
- [ ] Emit from `BlogPostPage`'s `<SEO jsonLd={[articleJsonLd, breadcrumbJsonLd, faqJsonLd].filter(Boolean)}>` — `generateFAQJsonLd` already returns `null` for empty input, so guard by requiring ≥2 extracted pairs before calling it (avoid thin FAQPage markup)
- [ ] Guardrail: FAQ answers in JSON-LD must be verbatim from visible page content — never generated or trimmed differently (Google policy: FAQ markup must match on-page content)
- [ ] Unit tests for `extractFaq` in `tests/unit/seo/blogFaq.test.ts` (repo-root `tests/unit/**` — Jest ignores `__tests__/`): markdown with FAQ section, without, malformed headings, 1-pair (suppressed), answers containing links/entities (correctly escaped)

### 2. Metadata quality audit across the catalog (fix data, not just code)

- [ ] Extend `scripts/verify-blog-ssr.sh` (or add `scripts/audit-blog-metadata.ts`) to pull every published post's raw HTML and report per slug: title length + uniqueness, meta description presence/length (~150–160 chars) + uniqueness, canonical exactness (`https://letaiexplainai.com/blog/<slug>`), `og:image` presence + 1200×630 where set, `article:published_time`/`modified_time` present
- [ ] Fix content-level gaps the audit finds (missing/duplicate `seoDescription`, missing cover images) via the admin CMS / `/api/admin/blog` — list every fixed slug in this file
- [ ] Where the fix is a template default (e.g. fallback description building from excerpt already exists — verify slice(0,160) doesn't mid-word truncate), fix in `SEO.tsx`/`BlogPostPage` once

### 3. Index/tag/author head correctness

- [ ] Blog index: unique title/description, canonical `https://letaiexplainai.com/blog`, `og:type=website`; paginated pages (if any) self-canonical, not canonicalized to page 1
- [ ] Tag archives: keep Blog-5 rule (noIndex when <3 posts) — assert it now appears in **raw** HTML (`<meta name="robots" content="noindex">` server-rendered)
- [ ] Author archives: `ProfilePage`/`Person` JSON-LD if cheap via existing helpers; otherwise skip and note here (no scope creep)

### 4. Validation with Google tooling (every post)

- [ ] Rich Results Test (search.google.com/test/rich-results) on every published post URL: `Article` detected, zero errors (warnings triaged and either fixed or documented). Record per-slug results in this file
- [ ] Rich Results Test on ≥1 FAQ post: `FAQPage` detected
- [ ] Schema.org validator (validator.schema.org) spot check on 3 posts for non-Google consumers (AI crawlers read schema too)
- [ ] Social card check: Twitter/X card validator + LinkedIn Post Inspector on 2 posts — real title/description/image (SSR now serves these to social bots directly; note the Lambda@Edge og-tags function never covered /blog, so this is net-new capability)

### 5. Tests

- [ ] Unit tests from task 1 (`extractFaq` + reuse of `generateFAQJsonLd`) in `tests/unit/seo/blogFaq.test.ts`
- [ ] SSR integration test additions in `tests/unit/ssr/blogSsr.test.ts`: FAQ post raw HTML contains valid `FAQPage` JSON-LD; JSON-LD parses with `JSON.parse` (no unescaped quotes/newlines from post content)
- [ ] `npm test` — all pass; `npm run typecheck` — zero errors; `npm run lint` — zero errors

### 6. Deploy

- [ ] Frontend: `./scripts/deploy-frontend.sh`
- [ ] Backend: `./scripts/deploy-backend.sh` (SSR bundle picks up the component changes)
- [ ] `aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/blog*"`

### 7. Backend Validation

- [ ] Re-run `scripts/verify-blog-ssr.sh` — 100% PASS including the new metadata checks
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 15m` — zero errors

### 8. Browser Validation (via `/Browser` skill)

- [ ] `agent-browser open https://letaiexplainai.com/blog/<faq-post-slug>` — FAQ section renders visibly and matches the JSON-LD content
- [ ] Zero console errors post-hydration; screenshot

---

## Definition of Done

- [ ] All tasks above checked
- [ ] Every published post passes Rich Results Test with `Article` (and `FAQPage` where applicable), zero errors
- [ ] Metadata audit: unique titles + descriptions, exact canonicals, OG + twitter:card on every post — verified in **raw** HTML
- [ ] Content-level metadata gaps fixed in the DB (slugs listed in this file)
- [ ] Deployed to prod, verified live
- [ ] Zero TypeScript errors, zero lint errors, tests passing; CloudWatch + browser console clean
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```
src/components/SEO.tsx                          (modify — add extractFaq beside existing generateFAQJsonLd; NO new generateFaqPageJsonLd, NO src/lib/jsonLd.ts)
tests/unit/seo/blogFaq.test.ts                  (new — extractFaq + FAQItem reuse; Jest only runs tests/unit/**)
src/pages/BlogPostPage.tsx                       (modify — emit existing generateFAQJsonLd when ≥2 pairs)
src/pages/BlogIndexPage.tsx                      (modify — head correctness if gaps found)
tests/unit/ssr/blogSsr.test.ts                   (modify — FAQ + JSON-LD escape tests)
scripts/verify-blog-ssr.sh                        (modify — metadata checks)
```

---

## Blocked — PM decision needed

(None yet. Possible future question: should older posts get FAQ sections added editorially to qualify for FAQPage rich results? That's an /AIBlogDraft editorial decision, not an engineering one — raise after SSR-4 indexation data lands.)

---

## Slop Findings (AISlopReviewer — 2026-07-02)

Verified against the codebase. **This sprint had the one P1 of the initiative** — fixed inline.

### P1

- [x] **[Cat 1 — Duplication of an existing helper]** Task 1 proposed a new `generateFaqPageJsonLd(pairs)`. A `FAQPage` generator **already exists**: `generateFAQJsonLd(faqs: FAQItem[]): Record<string, unknown> | null` at `src/components/SEO.tsx:230` — it emits the exact `@type: FAQPage` / `mainEntity` / `Question` / `acceptedAnswer` shape, filters empty Q/A, and returns `null` when empty. Shipping a parallel generator would be textbook slop. **Fixed inline:** reuse `generateFAQJsonLd` + the existing `FAQItem` type; build only the genuinely-new `extractFaq(bodyMarkdown)` markdown parser.

### P2

- [x] **[Cat 3 — Hallucinated file path]** Tasks + Files Touched referenced `src/lib/jsonLd.ts`. That file **does not exist** — `generateArticleJsonLd` (`:455`), `generateBreadcrumbListJsonLd` (`:515`), and `generateFAQJsonLd` (`:230`) all live in `src/components/SEO.tsx`. `src/lib/` holds `utils.ts`/`storage.ts`, no JSON-LD. Fixed inline throughout.
- [x] **[Cat 9 — Tests wrong directory]** `src/lib/__tests__/jsonLd.test.ts` and `server/src/ssr/__tests__/blogSsr.test.ts` won't run (`testMatch` = `tests/unit/**`). Moved to `tests/unit/seo/blogFaq.test.ts` and `tests/unit/ssr/blogSsr.test.ts`.

### Slop Avoided (positive)

- Correctly treats blog FAQ as **markdown-derived** — verified the `BlogPost` model (`prisma/schema.prisma:1651-1682`) has NO structured FAQ field (`faqItems` belongs to `GlossaryTerm:200`, not blog). No hallucinated schema field.
- Correctly reuses the existing `/api/sitemap.xml` (already lists all blog posts with `<lastmod>`) — Step 4 of the dev brief is verification, not a rebuild.
- FAQ-answer-must-match-visible-content guardrail respects Google policy and prevents generated/trimmed-answer slop.
