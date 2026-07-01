# Sprint SSR-1: Blog SSR Foundation

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-07-01 by Claude (sprint created — no tasks started)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`frontend.md`, `backend.md`, `build-and-deploy-security.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-Blog-SSR-Indexability.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm any prerequisite sprints' Definitions of Done are fully checked. If not, finish them first.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Build real server-side rendering for the four blog surfaces (`/blog`, `/blog/:slug`, `/blog/tag/:tag`, `/blog/author/:slug`) using a Vite SSR bundle of the existing React pages, served by new HTML routes on the `ai-timeline-api-prod` Express app. Because `BlogPostPage` already renders `SEO.tsx` (title, description, canonical, OG, `Article` + `BreadcrumbList` JSON-LD) and `article:*` Helmet tags, server-rendering the page moves **all** of that into raw HTML with no duplicated template. This sprint ends with local `curl` proof; prod routing and deploy are Sprint SSR-2.

**Priority**: HIGH (P0 initiative)
**Depends on**: None (Blog-1 … Blog-6 shipped)
**Estimated Effort**: 3–4 days
**Status**: Not started

---

## Prerequisites

- [ ] Re-confirm the diagnosis against live prod (dev-brief Step 0 — state the result in this file):
      `curl -sL https://letaiexplainai.com/blog | grep -ci "<h1\|<article"` → expect `0` (client-rendered confirmed)
      `curl -sL https://letaiexplainai.com/blog/$(curl -s https://letaiexplainai.com/api/blog?limit=1 | jq -r '.posts[0].slug') | grep -c "<h2"` → expect `0`
- [ ] Read `vite.config.ts`, `src/main.tsx`, `src/pages/BlogPostPage.tsx`, `src/components/SEO.tsx`, `server/src/index.ts`, `server/src/controllers/blog.ts` end to end
- [ ] Local dev running: `npm run dev` + `npm run dev:server`

---

## Tasks

### 1. Vite SSR build pipeline

- [ ] Create `src/entry-server.tsx` exporting `render(url: string, ssrData: BlogSsrData)` → `{ appHtml, helmet }`:
  ```typescript
  // Renders ONLY the blog routes inside StaticRouter + HelmetProvider(context).
  // Import blog pages directly — do NOT import App.tsx (drags in the whole SPA
  // and every client-only module with it).
  import { renderToString } from 'react-dom/server';
  import { StaticRouter } from 'react-router-dom/server';
  import { HelmetProvider } from 'react-helmet-async';
  ```
- [ ] Add a `BlogSsrData` type shared between server and client (post / post list / tag / author payloads) in `src/types/blogSsr.ts` — reuse existing blog Zod types, no new shapes
- [ ] Add npm script `build:ssr`: `vite build --ssr src/entry-server.tsx --outDir dist-ssr` and wire `"build"` to also emit it (client build unchanged; keep the `find dist -name '*.map' -delete` step intact per `build-and-deploy-security.md` — SSR output must also be map-free)
- [ ] Confirm `dist-ssr/entry-server.js` builds clean and exports `render` (`node -e "import('./dist-ssr/entry-server.js').then(m => console.log(typeof m.render))"` → `function`)

### 2. SSR safety pass on blog pages

- [ ] Audit `BlogIndexPage`, `BlogPostPage`, `BlogTagPage`, author archive component + their imports for module-scope `window`/`document`/`localStorage` access; guard or move into effects. Grep to scope it:
  ```bash
  grep -rn "window\.\|document\.\|localStorage" src/pages/Blog*.tsx src/components/blog/ src/components/SEO.tsx
  ```
- [ ] Make data access SSR-aware: blog pages read from SSR data when present (via a small `useSsrData()` context/hook) and fall back to the existing React Query fetch on pure-client navigation. No fetch waterfall on the server — the Express handler supplies data
- [ ] Interactive-only widgets on post pages (subscribe form, share buttons, view-count beacon) must render inert-but-valid HTML on the server (no crashes, no `useEffect` dependency at render time)

### 3. Express SSR routes (server/src/ssr/)

- [ ] Create `server/src/ssr/blogSsr.ts` — Express router with the four routes, mounted in `createApp()` (`server/src/index.ts`) at `/blog` (NOT under `/api`):
  ```
  GET /blog                 → index (published posts, page 1 + rel=next links)
  GET /blog/:slug           → post; unknown slug → 404 status + noindex minimal page
  GET /blog/tag/:tag        → tag archive (respect Blog-5 noIndex rule for <3 posts)
  GET /blog/author/:slug    → author archive
  ```
- [ ] Data loading: call the existing blog service/controller logic directly (extract shared functions from `server/src/controllers/blog.ts` if needed — refactor, don't duplicate queries)
- [ ] HTML shell: load the **built client** `dist/index.html` as the template — fetch `https://letaiexplainai.com/index.html` at cold start and cache in memory (decouples backend deploys from hashed asset names); inject `appHtml` into `<div id="root">`, helmet output (`helmet.title`, `helmet.meta`, `helmet.link`, `helmet.script`) into `<head>`, and `<script>window.__SSR_DATA__ = …</script>` (JSON-escaped — `</script>` breakout guard) before the bundle script. For local dev, read `dist/index.html` from disk
- [ ] Set `Cache-Control: public, max-age=300, s-maxage=3600` on 200s; `no-store` + `<meta name="robots" content="noindex">` on 404s
- [ ] Error fallback: if SSR render throws, log to CloudWatch and return the un-rendered SPA shell with status 200 (site must never go down because SSR broke) — but count it: `console.error('[SSR] render failed', …)` so it's alarmable

### 4. Client hydration

- [ ] `src/main.tsx`: when `window.__SSR_DATA__` exists and path matches `/blog`, use `hydrateRoot`; otherwise keep `createRoot` exactly as-is
- [ ] Seed React Query (or the `useSsrData` hook) from `__SSR_DATA__` so hydration doesn't refetch or flash
- [ ] Verify zero hydration warnings in the browser console on all four blog surfaces (dates/times are the usual culprit — render ISO-deterministic values)

### 5. Tests

- [ ] Unit test `server/src/ssr/__tests__/blogSsr.test.ts`: mock Prisma, assert raw response HTML for a post contains `<h1>{title}</h1>`, at least one `<h2>`, body copy from `bodyMarkdown`, `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:title`, `og:image`, `twitter:card`, and a `<script type="application/ld+json">` parsing to `@type: Article` with correct `headline`/`datePublished`/`dateModified`/`author`/`mainEntityOfPage`
- [ ] Unit test: unknown slug → HTTP 404 + `noindex`
- [ ] Unit test: index + tag + author routes return their post lists as anchor tags in raw HTML
- [ ] Unit test: SSR render throw → 200 SPA-shell fallback (and error logged)
- [ ] `npm test -- blogSsr` — all pass
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors

### 6. Local end-to-end acceptance (this sprint's exit gate — no deploy yet)

- [ ] `npm run build && npm run build:ssr && npm run dev:server`, then for a seeded post:
  ```bash
  curl -s http://localhost:3001/blog/<slug> | grep -c "<h2"          # ≥ 1
  curl -s http://localhost:3001/blog/<slug> | grep -c "ld+json"      # ≥ 1
  curl -s http://localhost:3001/blog | grep -c "href=\"/blog/"       # ≥ 1
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/blog/nope  # 404
  ```
- [ ] Open the SSR-served post in a browser (point at the local server), confirm React hydrates: nav works, subscribe form works, zero console errors

### 7. Browser Validation (local, via `/Browser` skill)

- [ ] `agent-browser open http://localhost:3001/blog/<slug>` (the SSR route, not Vite dev)
- [ ] `agent-browser screenshot` — page visually identical to current prod post page
- [ ] `agent-browser snapshot -i` → click a related-post link, confirm client-side nav still works post-hydration
- [ ] Dark mode toggle + screenshot
- [ ] Mobile viewport: `agent-browser resize 375 812 && agent-browser screenshot`
- [ ] Zero console errors (hydration warnings count as errors)

---

## Definition of Done

- [ ] All tasks above checked
- [ ] Local `curl` (no JS) of `/blog`, `/blog/:slug`, `/blog/tag/:tag`, `/blog/author/:slug` returns full content HTML incl. head metadata + JSON-LD
- [ ] Unknown slug returns a real 404 with noindex
- [ ] Hydrated page is interactive with a clean console
- [ ] Zero TypeScript errors, zero lint errors, tests passing
- [ ] `npm run build` still emits zero `.map` files (`find dist dist-ssr -name '*.map' | wc -l` → 0)
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```
src/entry-server.tsx                           (new — SSR entry, blog routes only)
src/types/blogSsr.ts                           (new — shared SSR data type)
src/main.tsx                                   (modify — hydrateRoot for /blog*)
src/pages/BlogIndexPage.tsx                    (modify — SSR data hook)
src/pages/BlogPostPage.tsx                     (modify — SSR data hook, SSR-safe guards)
src/pages/BlogTagPage.tsx                      (modify — SSR data hook)
src/components/SEO.tsx                         (modify — only if SSR guards needed)
server/src/ssr/blogSsr.ts                      (new — Express SSR routes)
server/src/ssr/htmlShell.ts                    (new — template fetch/cache/inject)
server/src/ssr/__tests__/blogSsr.test.ts       (new)
server/src/controllers/blog.ts                 (modify — extract shared data fns)
server/src/index.ts                            (modify — mount /blog SSR router)
vite.config.ts                                 (modify — SSR build config if needed)
package.json                                   (modify — build:ssr script)
```

---

## Blocked — PM decision needed

(None yet. Add questions for Wylie here as they arise. Include context so Wylie can decide without re-reading the whole sprint.)
