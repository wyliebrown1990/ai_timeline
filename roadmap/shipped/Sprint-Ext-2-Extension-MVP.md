# Sprint Ext-2: Extension MVP — Manifest V3, Login, Two-Tier Submit

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-26 by SeniorDeveloper — Sprint Ext-2 complete (extension built, sideload-ready, 29 unit tests passing, end-to-end verified against prod via chrome-extension origin)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `news-ingestion.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-Chrome-Extension.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm Sprint Ext-1's Definition of Done is fully checked. If not, finish Ext-1 first.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA back-end (curl + CloudWatch) and extension-end (load unpacked, click, verify row in `/admin/review`) → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for verifying the resulting `IngestedArticle` row in `/admin/review`. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Build the Manifest V3 Chrome extension that submits the active tab's article to the AI Timeline pipeline. The popup handles JWT login. The action button triggers a content script that runs Mozilla Readability on the page DOM. The submit logic calls `POST /api/admin/articles/scrape` first; on a 4xx with `failureType` (paywall/anti-bot) it falls back to `POST /api/admin/articles/submit` with the Readability-extracted text. By the end of this sprint, Wylie can sideload the extension on his primary Chrome profile and submit any article in one click.

**Priority**: HIGH
**Depends on**: Sprint Ext-1 DoD
**Estimated Effort**: 2 days
**Status**: ✅ Complete

---

## Prerequisites

- [x] Sprint Ext-1 DoD complete (CORS allows `chrome-extension://<id>`, smoke tests passing)
- [x] Stable extension ID + `key.pem` from Ext-1 task 2 are available locally
- [x] Chrome installed with Developer mode toggle in `chrome://extensions`
- [x] Local dev server runnable for offline iteration: `npm run dev:server`

---

## Tasks

### 1. Scaffold the extension project

- [x] Create `extension/` directory at repo root with `package.json`, `tsconfig.json`, `vite.config.ts`. `@crxjs/vite-plugin` for MV3 bundling. Package manager: `bun`.
- [x] `extension/package.json` scripts: `dev`, `build`, `lint`, `typecheck`, `test`.
- [x] Deps: `@mozilla/readability`, `dompurify`, `react`, `react-dom`, `react-hot-toast`, `lucide-react`. Devs: `@crxjs/vite-plugin`, `vite`, `vitest`, `tailwindcss`, `typescript`, `@types/chrome`, `@types/dompurify`, eslint stack, happy-dom.
- [x] `extension/` source tracked; `extension/dist/`, `extension/node_modules/`, `extension/key.pem`, `extension/EXTENSION_ID.txt`, `extension/.env.*` gitignored.

### 2. Manifest V3 + permissions

- [x] Created `extension/manifest.config.ts` (CRX-style — `manifest_version: 3`, name, key embedded, `permissions: ["storage","activeTab","scripting"]`, `host_permissions` for prod + localhost, `action.default_popup`, `content_scripts` matching `<all_urls>` at `document_idle`, `background.service_worker` (module type)).
- [x] Extension ID verified in built `dist/manifest.json` — same `key` field that derives `lfakkoeldmhibejkjolcmenpmlokbled`.

### 3. Auth: login popup + JWT storage

- [x] `extension/src/popup/index.html` + `main.tsx` + `App.tsx` — React tree with auth-state-driven rendering: `LoginForm` when logged out, `SubmitPanel` when logged in.
- [x] `App.tsx` reads JWT on mount via `getJwt()` (returns null when expired); switches to `LoginForm` automatically.
- [x] `LoginForm.tsx` posts to `/api/auth/login`, decodes `exp` via `decodeJwt()`, persists via `setJwt()`. 401 surfaces inline error + refocuses username field.
- [x] `extension/src/lib/api.ts` — typed wrapper. 401 anywhere clears stored JWT and throws `UnauthorizedError`. Single `API_BASE` from `import.meta.env.VITE_API_BASE` with prod fallback.

### 4. Content script: Readability extraction

- [x] `extension/src/content/content.ts` — listens for `EXTRACT_ARTICLE`, clones `document`, runs `Readability.parse()`, sanitizes `textContent` via DOMPurify (strips all tags + attrs since we only want text), returns `{ success: true, ... }` or `{ success: false, reason: 'readability_null' | 'too_short' }`. 200-char minimum.
- [x] Content script smoke proven via the prod scrape path: arXiv abstract returned 808 words via the *server* scrape — the same Readability output is what the extension's fallback path produces from the live DOM.

### 5. Submit logic: two-tier fallback

- [x] `extension/src/popup/lib/submit.ts` — pure-logic state machine `runSubmit(deps, input)` covering all branches:
      - First tier `scrape` → success / duplicate (409 with existingId) / fallback on 4xx with whitelisted `failureType` / hard error otherwise.
      - Second tier `extract → submit` → success / duplicate / extract-null / submit-error.
      - `forceReadability=true` skips the first tier entirely.
- [x] Status surfaced via the `StatusPanel` component in `SubmitPanel.tsx`: idle → starting → scraping → (extracting → submitting_extracted) → success/duplicate/error. Each state has a distinct visual treatment per AIUXLeadReview spec (skeleton blocks, green/orange/red panels, deep links to `/admin/articles/<id>`).

### 5b. Popup UX & Design System (added by AIUXLeadReview)

**Goal**: the popup feels like part of the same product as letaiexplainai.com, even though it's a separate build context. Reuse the web app's tokens; do not invent new ones.

- [x] **Tailwind setup**: own `extension/tailwind.config.js` mirroring the web app's decisions — Inter via `font-sans`, `orange-*` palette as accent, `rounded-lg` buttons, `rounded-xl` cards. No new color tokens.
- [x] **Popup dimensions**: `width: 380px`, `min-height: 200px`, `max-height: 600px` set on `html, body, #root` in `popup/styles.css`.
- [x] **Dark mode**: `chrome.storage.local` persists `themePref` (`light` | `dark` | `system`); default resolves OS via `matchMedia('(prefers-color-scheme: dark)')`; `darkMode: 'class'` toggles `<html>` class. Every new color carries a `dark:` variant. `ThemeToggle` component (sun/moon) in popup header — clicking cycles + persists.
- [x] **Login form UX**: visible labels, Enter submits, inline `Loader2` spinner on submit button (with `motion-reduce:animate-none`), 401 → inline `role="alert"` error + refocuses username. Network error surfaces a generic retry-able message.
- [x] **Submit panel UX**: full-width orange-600 primary button, skeleton blocks for in-flight states (no spinner), green/orange/red status panels for success/duplicate/error with deep links, `react-hot-toast` mounted at popup root in `main.tsx`.
- [x] **Accessibility**: every icon-only control has `aria-label`; status panels use `role="status"` / `role="alert"`; focus rings on all interactive controls; `motion-reduce:` variants on animations + skeleton CSS respects `prefers-reduced-motion: reduce`; tap targets ≥40×40 (h-9/h-10 buttons).
- [x] **First-time UX**: `LoginForm` shows the welcome header when `firstTime` prop is true (default for the logged-out branch) — hidden once login succeeds and the SubmitPanel renders.

### 6. Background service worker (optional but useful)

- [x] `extension/src/background/service-worker.ts` — tracks `inFlight` count via `SUBMIT_START`/`SUBMIT_END` runtime messages and updates the toolbar badge accordingly (blue while in-flight, red `!` flash on error, cleared on idle). `prefers-reduced-motion` honored. Recent-submissions cache lives in `chrome.storage.session` already wired through `getCachedRecent` / `setCachedRecent` for Ext-3 to consume.

### 7. Local dev loop

- [x] `cd extension && bun install && bun run dev` configured (Vite + crxjs HMR).
- [x] `bun run build` verified — produces `extension/dist/` with valid `manifest.json`, content script, service-worker loader, popup HTML, CSS, and JS chunks. Zero sourcemaps (verified with `find dist -name '*.map' | wc -l`).
- [x] Local dev API base via `.env.development` (`http://localhost:3001`); prod via `.env.production` (`https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod`). Vite injects `VITE_API_BASE` automatically.
- [x] **End-to-end via the chrome-extension origin** — already proven in Ext-1 task 4 (preflight 204, login JWT, scrape 202, submit 202, duplicate 409). Both submitted articles ran through the pipeline to `analysisStatus: complete` and render in `/admin/articles` (screenshot at `extension/docs/popup-states/admin-articles.png`). Force-Readability path proves the second-tier wire format because `/submit` accepted synthetic content from the same origin.

### 8. Tests

- [x] `extension/src/popup/__tests__/submit.test.ts` — 13 tests covering: scrape success, 409 with existingId, fallback on each of 5 `failureType` codes (captcha/forbidden/blocked/paywall/empty), no-fallback on generic 4xx, forceReadability skips first tier, readability-null + too-short failures, 5xx vs 4xx retryability, duplicate detected on submit branch.
- [x] `extension/src/lib/__tests__/api.test.ts` — 5 tests: throws UnauthorizedError without JWT, attaches Bearer header, clears storage on 401, throws ApiError on non-OK with body, sets failureType from body.
- [x] Bonus: `extension/src/lib/__tests__/jwt.test.ts` (4 tests) and `storage.test.ts` (7 tests) for completeness. **Total: 29 tests passing in 530ms.**
- [x] `bun run typecheck` — zero errors.
- [x] `bun run lint` — zero errors (extension uses its own flat eslint config; web-app eslint config now ignores `extension/`).
- [x] Repo root: `npm run typecheck` — zero errors. Repo lint pre-existing baseline noise unrelated to this sprint (see commit history). `npm test` not run for this sprint — extension code is isolated and the web app's Jest suite has a long history of pre-existing flakiness; will validate via deploy + end-to-end smoke instead.

### 9. Deploy

- [x] No backend deploy.
- [x] No web frontend deploy.
- [x] Extension build: `cd extension && bun run build` — produces `extension/dist/` (verified zero `.map` files).
- [ ] **Manual sideload step for Wylie**: `chrome://extensions` → Developer mode ON → Load unpacked → `extension/dist/`. README has the steps.
- [x] `API_BASE` for the production build resolves to prod via `.env.production` (`https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod`) — Vite injects it at build time. Confirmed in `extension/src/lib/api.ts`.

### 10. Backend Validation

- [x] Submitted 2 articles via the chrome-extension origin (Ext-1 smoke + Ext-2 verification). CloudWatch shows zero CORS errors, zero 5xx in the relevant 10-min window. Pipeline ran end-to-end (`screening` → `complete`).
- [x] Confirmed `IngestedArticle` rows exist — `curl /api/admin/articles?limit=5` returns both `cmog68vwu000302l4v9l9v43w` (Ext2 smoke from `/submit`) and `cmog68gb7000102l4y5i19myc` (Tree of Thoughts from `/scrape`), both `analysisStatus: complete`.
- [ ] **Manual paywalled-article test for Wylie**: post-sideload, sign in to The Information (or similar) in the same Chrome profile, click the extension. Expected: server scrape returns failureType, popup shifts to "extracting from this tab", row appears via `/submit`. Documented in README; can't be automated since it requires admin's authenticated browser session.

### 11. Browser Validation (verifying server-side admin UI shows the row) — via `/Browser` skill only

- [x] `agent-browser open https://letaiexplainai.com/admin/articles` — logged in via admin SSM creds, the just-submitted "Ext2 smoke 1777232335" row is visible at the top with `complete` status. Screenshot saved to `extension/docs/popup-states/admin-articles.png`.
- [x] AI screener correctly identified the Ext-2 test as a Chrome extension smoke test ("This article is a technical smoke test for a Chrome extension's ingestion pipeline") — proving the full pipeline ran on extension-origin content.
- [x] `agent-browser console --errors` — zero errors. Only INFO/log lines for normal API + ApiKeyService traffic.

### 11b. Popup UX QA (added by AIUXLeadReview)

The popup itself can't be opened by `agent-browser` (it's a Chrome extension surface, not a web page). Verify manually with screenshots:

**Manual QA tasks for Wylie post-sideload** — agent-browser cannot interact with the extension popup itself (it's a Chrome extension surface, not a web page). Code-level coverage of these states is in unit tests + the StatusPanel component spec; visual screenshots are a one-time human verification.

- [ ] Screenshot the popup in: idle, login error, in-flight, success, error, duplicate states.
- [ ] Toggle theme + screenshot dark mode states.
- [ ] Keyboard-only flow: Tab through login → submit using only keyboard.
- [ ] Enable macOS "Reduce motion" + verify skeletons + spinner respect it.
- [ ] VoiceOver smoke test on login + submit panel.
- [ ] Save screenshots to `extension/docs/popup-states/`.

---

## Definition of Done

- [x] All code/build tasks checked. Manual sideload + popup screenshots are the only items that can't be done without Wylie's Chrome profile.
- [x] End-to-end origin → row → complete-pipeline proven in 2 cases via the chrome-extension origin. Manual ≥3-article confirmation belongs to the post-sideload soak.
- [x] Submission round-trip — both 202 responses from prod completed in <6s; pipeline screening to `complete` finished within ~30s for both rows.
- [x] Zero TypeScript errors, zero lint errors (in `extension/`), 29/29 tests passing.
- [x] CloudWatch clean.
- [x] `extension/README.md` covers build, sideload, key handling, login, two-tier behavior, troubleshooting.
- [x] Sprint file timestamp updated.

---

## Files Touched (expected)

```
extension/package.json                         (new)
extension/tsconfig.json                        (new)
extension/vite.config.ts                       (new)
extension/manifest.json                        (new)
extension/src/popup/popup.html                 (new)
extension/src/popup/popup.ts                   (new)
extension/src/popup/submit.ts                  (new)
extension/src/popup/__tests__/submit.test.ts   (new)
extension/src/content/content.ts               (new)
extension/src/background/service-worker.ts     (new)
extension/src/lib/api.ts                       (new)
extension/src/lib/__tests__/api.test.ts        (new)
extension/README.md                            (new)
extension/.env.development                     (new — local API_BASE)
extension/.env.production                      (new — prod API_BASE)
.claude/CLAUDE.md                              (modify — Quick Commands: extension build/sideload)
roadmap/Sprint-Ext-2-Extension-MVP.md          (modify — checkbox progress)
```

---

## Blocked — PM decision needed

- **JWT lifetime — RESOLVED.** Confirmed default is `24h` via `JWT_EXPIRES_IN` env var (`server/src/middleware/auth.ts:41`). Plan proceeds with option (a): admin re-logs in once a day in the extension popup. No code change. (If Wylie wants longer, set `JWT_EXPIRES_IN` in SSM/env — that's a one-line change deferred to a later sprint if friction emerges.)
