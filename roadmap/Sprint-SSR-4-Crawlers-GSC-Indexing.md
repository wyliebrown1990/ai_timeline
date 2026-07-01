# Sprint SSR-4: Crawler Access, GSC Indexing & Future-Proofing

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-07-01 by Claude (sprint created — no tasks started)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `frontend.md`) plus `.claude/reference/seo-insights.md`.
2. Re-read the parent PLAN (`roadmap/PLAN-Blog-SSR-Indexability.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm any prerequisite sprints' Definitions of Done are fully checked. If not, finish them first.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Close the loop: make crawler access explicit (search + AI crawlers), confirm the sitemap story, submit to Google Search Console and request indexing, monitor for a week, and — critically — make this class of regression impossible for future posts by wiring the raw-HTML crawlability check into the `/AIBlogDraft` publish flow and the SEO weekly digest surface.

**Priority**: HIGH (P0 initiative)
**Depends on**: Sprint SSR-2 (SSR live); Sprint SSR-3 (structured data validated) for the GSC tasks
**Estimated Effort**: 1–2 days active work + ~1 week passive monitoring
**Status**: Not started

---

## Prerequisites

- [ ] Sprints SSR-2 and SSR-3 DoDs fully checked
- [ ] GSC property access for letaiexplainai.com confirmed (GSC OAuth pipeline from Sprint SEOI-1 exists at `server/src/services/gsc/` for API paths; UI access for manual steps)

---

## Tasks

### 1. robots.txt — explicit crawler access (`public/robots.txt`)

- [ ] Verify current state: `User-agent: * / Allow: /` + `Disallow: /admin/` — confirms `/blog` was never robots-blocked (the problem was rendering, not access). Keep it that way
- [ ] Add explicit allow stanzas for AI crawlers so intent is unambiguous and future edits don't accidentally block them:
  ```
  # AI crawlers — explicitly welcome (citations = discovery)
  User-agent: GPTBot
  Allow: /
  User-agent: PerplexityBot
  Allow: /
  User-agent: ClaudeBot
  Allow: /
  User-agent: Google-Extended
  Allow: /
  User-agent: CCBot
  Allow: /
  ```
  (Each stanza still needs `Disallow: /admin/` — named UA groups don't inherit from `*`.)
- [ ] Confirm no `<meta name="robots" content="noindex">` in raw HTML of any post / blog index (`grep` the verify-sweep output); tag archives <3 posts and post previews remain noindex by design
- [ ] Confirm nothing upstream blocks the AI UAs (Cloudflare Bot Fight Mode is on per `spam-protection.md` — verify GPTBot/ClaudeBot/PerplexityBot get 200s, not challenges: `curl -s -o /dev/null -w "%{http_code}" -A "GPTBot" https://letaiexplainai.com/blog`). If Cloudflare challenges them, document the dashboard exception under Blocked for Wylie's call

### 2. Sitemap confirmation (mostly already done — verify, don't rebuild)

- [ ] `server/src/routes/sitemap.ts` already lists blog index, all published posts with `<lastmod>`, tag archives ≥3 posts, author archives. Verify live: `curl -s https://letaiexplainai.com/api/sitemap.xml | grep -c "/blog/"` matches published-post count (+archives)
- [ ] robots.txt already declares `Sitemap: https://letaiexplainai.com/api/sitemap.xml`. Cross-path sitemaps ARE valid when declared in robots.txt — keep the URL; do NOT build a root `/sitemap.xml` alias unless GSC rejects the existing one (it hasn't — it was submitted in earlier SEO sprints)
- [ ] Verify post `<lastmod>` uses `updatedAt` and reflects a freshly edited post (edit → re-curl sitemap)

### 3. llms.txt

- [ ] Update `public/llms.txt`: add/refresh the `## Blog` section listing the blog index and the highest-value posts with one-line descriptions (Blog-5 established the format — extend it, don't restructure)

### 4. Google Search Console

- [ ] Sitemaps: re-submit `https://letaiexplainai.com/api/sitemap.xml` (forces a re-crawl signal post-SSR)
- [ ] URL Inspection on 3 posts + the blog index: confirm **View Crawled Page** now shows full article HTML (this is the brief's ground-truth check), then **Request Indexing** on each
- [ ] Request Indexing for every remaining published post (manual via UI; ~1/min rate limit — fine at current catalog size)
- [ ] Record submission date + inspected URLs in this file

### 5. Future-proofing (prevent this class of bug in future posts)

- [ ] Update `.claude/skills/AIBlogDraft/SKILL.md` publish step: after shipping via `/api/admin/blog`, run `scripts/verify-blog-ssr.sh <slug>` (support single-slug mode) and treat FAIL as a publish blocker
- [ ] Add a Playwright e2e test (`tests/e2e/blog-ssr.spec.ts` or existing e2e dir) that fetches a post with `request.get()` (no browser JS) and asserts `<h1>`, `<h2>`, `ld+json`, canonical — CI-level regression net
- [ ] Add an SSR crawlability line to the weekly SEO digest surface: extend `server/src/services/seo/weeklyDigestRunner.ts` health checks with a raw-HTML probe of the latest post (fails → surfaces in `/admin/seo-insights`). Keep it a probe, not a new subsystem
- [ ] Update `.claude/reference/seo-insights.md` + `.claude/rules/backend.md` with the new probe + verify script so `/SEOAuditAgent` knows about them

### 6. Tests

- [ ] Unit test for the weekly-digest SSR probe (mock fetch: healthy/unhealthy paths)
- [ ] Playwright e2e from task 5 green locally and in CI
- [ ] `npm test` — all pass; `npm run typecheck` — zero errors; `npm run lint` — zero errors

### 7. Deploy

- [ ] Frontend (robots.txt, llms.txt): `./scripts/deploy-frontend.sh`
- [ ] Backend (digest probe): `./scripts/deploy-backend.sh`
- [ ] Verify live: `curl -s https://letaiexplainai.com/robots.txt` shows the AI-crawler stanzas

### 8. Backend Validation

- [ ] `scripts/verify-blog-ssr.sh` full sweep — 100% PASS
- [ ] Bot-UA sweep: `for ua in GPTBot ClaudeBot PerplexityBot "Google-Extended" CCBot Googlebot; do curl -s -o /dev/null -w "$ua %{http_code}\n" -A "$ua" https://letaiexplainai.com/blog/<slug>; done` — all 200
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 15m` — zero errors

### 9. Monitoring window (~1 week, passive — do not block other work)

- [ ] Day 3: GSC Pages report + URL Inspection on the 3 requested posts — note status here
- [ ] Day 7: ≥3 posts show "Indexed"; View Crawled Page shows full content. If not, diagnose (crawl anomalies? canonicalization?) and record findings + next actions here
- [ ] Check `/admin/seo-insights` weekly digest picked up the new probe with healthy status

---

## Definition of Done

- [ ] All tasks above checked (including the Day-7 monitoring checkpoint)
- [ ] robots.txt explicitly allows GPTBot, PerplexityBot, ClaudeBot, Google-Extended, CCBot; nothing blocks `/blog`
- [ ] Sitemap verified complete with lastmod; re-submitted in GSC
- [ ] GSC View Crawled Page shows full article content; ≥3 posts "Indexed" within ~1 week
- [ ] `/AIBlogDraft` publish flow includes the raw-HTML crawlability gate; e2e regression test in CI; weekly digest probe live
- [ ] Deployed to prod, verified live
- [ ] Zero TypeScript errors, zero lint errors, tests passing; CloudWatch clean
- [ ] Sprint file timestamp updated
- [ ] Parent PLAN's initiative-level Definition of Done reviewed and checked where earned

---

## Files Touched (expected)

```
public/robots.txt                                    (modify — AI crawler stanzas)
public/llms.txt                                      (modify — blog section)
scripts/verify-blog-ssr.sh                           (modify — single-slug mode)
.claude/skills/AIBlogDraft/SKILL.md                  (modify — publish-gate step)
.claude/reference/seo-insights.md                    (modify — document probe)
.claude/rules/backend.md                             (modify — document probe + script)
server/src/services/seo/weeklyDigestRunner.ts        (modify — SSR crawlability probe)
server/src/services/seo/__tests__/…                  (modify/new — probe tests)
tests/e2e/blog-ssr.spec.ts                           (new — no-JS raw HTML assertion)
```

---

## Blocked — PM decision needed

(None yet. One likely candidate: if Cloudflare Bot Fight Mode challenges GPTBot/ClaudeBot/PerplexityBot (task 1), allowing them requires a Cloudflare dashboard exception — that trades bot-protection posture for AI-citation reach and is Wylie's call. Document the observed status codes here before asking.)
