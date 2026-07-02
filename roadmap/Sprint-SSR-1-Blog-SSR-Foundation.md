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
- [ ] Data loading: import the **existing data functions from `server/src/services/blog.ts`** — `listPublishedPosts` (`:121`), `getPublishedPostBySlug` (`:210`), `getPostBySlugForPreview` (`:218`). These are already pure (no `req`/`res`). Do NOT extract new functions from `server/src/controllers/blog.ts` — that layer is a thin req/res wrapper over this service and re-extracting would duplicate queries. Reuse the controller's serialization helpers (`serializeListItem`/`serializePost`, `controllers/blog.ts:16`/`:23`) rather than re-writing them
- [ ] HTML shell: load the **built client** `dist/index.html` as the template — fetch `https://letaiexplainai.com/index.html` at cold start and cache in memory (decouples backend deploys from hashed asset names); inject `appHtml` into `<div id="root">`, helmet output (`helmet.title`, `helmet.meta`, `helmet.link`, `helmet.script`) into `<head>`, and `<script>window.__SSR_DATA__ = …</script>` (JSON-escaped — `</script>` breakout guard) before the bundle script. For local dev, read `dist/index.html` from disk
- [ ] Set `Cache-Control: public, max-age=300, s-maxage=3600` on 200s; `no-store` + `<meta name="robots" content="noindex">` on 404s
- [ ] Error fallback: if SSR render throws, log to CloudWatch and return the un-rendered SPA shell with status 200 (site must never go down because SSR broke) — but count it: `console.error('[SSR] render failed', …)` so it's alarmable

### 4. Client hydration

- [ ] `src/main.tsx`: when `window.__SSR_DATA__` exists and path matches `/blog`, use `hydrateRoot`; otherwise keep `createRoot` exactly as-is
- [ ] Seed React Query (or the `useSsrData` hook) from `__SSR_DATA__` so hydration doesn't refetch or flash
- [ ] Verify zero hydration warnings in the browser console on all four blog surfaces (dates/times are the usual culprit — render ISO-deterministic values)

### 5. Tests

- [ ] Unit test `tests/unit/ssr/blogSsr.test.ts` (repo-root `tests/unit/**` is the ONLY path Jest's `testMatch` picks up — see `jest.config.ts`; `__tests__/` folders do not run): mock Prisma, assert raw response HTML for a post contains `<h1>{title}</h1>`, at least one `<h2>`, body copy from `bodyMarkdown`, `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:title`, `og:image`, `twitter:card`, and a `<script type="application/ld+json">` parsing to `@type: Article` with correct `headline`/`datePublished`/`dateModified`/`author`/`mainEntityOfPage`
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
tests/unit/ssr/blogSsr.test.ts                 (new — Jest only runs tests/unit/**)
server/src/services/blog.ts                    (reuse — import existing data fns; no new extraction)
server/src/index.ts                            (modify — mount /blog SSR router)
vite.config.ts                                 (modify — SSR build config if needed)
package.json                                   (modify — build:ssr script)
```

---

## Blocked — PM decision needed

(None yet. Add questions for Wylie here as they arise. Include context so Wylie can decide without re-reading the whole sprint.)

---

## Slop Findings (AISlopReviewer — 2026-07-02)

Verified against the codebase. P0/P1 are blocking; P2/P3 are advisory. Inline corrections above already applied for the test path and the data-layer reuse.

### P1

(None. The SSR mechanism is genuinely net-new — no existing `renderToString`/`StaticRouter`/`hydrateRoot` in the repo, so no duplication risk here. `src/main.tsx:18` is `createRoot`-only with routing inside `App`; the `hydrateRoot` branch is justified.)

### P2

- [x] **[Cat 1 — Duplication / wrong layer]** Task 3 (data loading). Fixed inline: the reusable data layer already exists as `server/src/services/blog.ts` (`listPublishedPosts`/`getPublishedPostBySlug`/`getPostBySlugForPreview`), not something to extract from the controller. Import the service; don't duplicate queries.
- [x] **[Cat 9 — Tests wrong directory]** Task 5 + Files Touched. Fixed inline: Jest `testMatch` is `tests/unit/**/*.test.ts(x)` (`jest.config.ts`, rootDir = repo root). `server/src/ssr/__tests__/…` would be silently skipped. Moved to `tests/unit/ssr/blogSsr.test.ts`. No `__tests__/` folder exists anywhere in the repo except `extension/` (separate package).

### P3

- [ ] **[Cat 12 — Architecture, for /AITechLeadReview]** Task 3 (HTML shell). The API Lambda's `CodeUri` is `../server/src/` (`infra/template.yaml:80`), so the built `dist/index.html` is **not** in the Lambda bundle. The plan's "fetch `https://letaiexplainai.com/index.html` at cold start" means the Lambda fetches the CloudFront domain it will itself be serving `/blog*` from — workable (different path → S3 behavior, egress via NAT) but a cold-start + circular-ish dependency. Confirm with /AITechLeadReview whether to instead **copy `dist/index.html` into the SAM build context** (deterministic, no runtime fetch) — likely the cleaner choice. Not slop; flagging for the correctness lens.

### Slop Avoided (positive)

- Reuses `src/components/SEO.tsx` correctly — verified `jsonLd` prop accepts `Record<string, unknown> | Record<string, unknown>[]` (`:20`) and `noIndex` (`:22`) exist; the server render emits the same tags via react-helmet-async's server API.
- Keeps sourcemap discipline: DoD asserts `find dist dist-ssr -name '*.map' | wc -l` → 0, honoring `build-and-deploy-security.md` for the new SSR artifact.
- Imports blog pages directly into `entry-server.tsx` rather than `App.tsx` — avoids dragging the whole SPA (and its client-only modules) into the SSR bundle.
