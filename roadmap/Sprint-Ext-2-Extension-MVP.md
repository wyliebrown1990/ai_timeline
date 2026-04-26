# Sprint Ext-2: Extension MVP — Manifest V3, Login, Two-Tier Submit

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-26 by AIUXLeadReview (added popup UX, dark-mode handling, accessibility tasks)

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
**Status**: Not started

---

## Prerequisites

- [ ] Sprint Ext-1 DoD complete (CORS allows `chrome-extension://<id>`, smoke tests passing)
- [ ] Stable extension ID + `key.pem` from Ext-1 task 2 are available locally
- [ ] Chrome installed with Developer mode toggle in `chrome://extensions`
- [ ] Local dev server runnable for offline iteration: `npm run dev:server`

---

## Tasks

### 1. Scaffold the extension project

- [ ] Create `extension/` directory at repo root with `package.json`, `tsconfig.json`, `vite.config.ts`. Use `@crxjs/vite-plugin` for MV3 bundling + HMR. Package manager: `bun` (per global preferences).
- [ ] `extension/package.json` scripts: `dev` (Vite watch), `build` (Vite production build to `dist/`), `lint` (eslint), `typecheck` (tsc --noEmit).
- [ ] Add deps: `@mozilla/readability`, `@crxjs/vite-plugin`, `vite`, `typescript`, `@types/chrome`, `@types/dompurify`, `dompurify` (sanitize Readability output before sending).
- [ ] Confirm `extension/` itself is tracked but `extension/dist/`, `extension/node_modules/`, `extension/key.pem`, `extension/EXTENSION_ID.txt` are gitignored (added in Ext-1).

### 2. Manifest V3 + permissions

- [ ] Create `extension/manifest.json` with:
      - `manifest_version: 3`
      - `name: "AI Timeline Submit"`, `description`, `version`
      - `key`: paste base64 public key from Ext-1 (locks extension ID)
      - `permissions: ["storage", "activeTab", "scripting"]`
      - `host_permissions: ["https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/*"]`
      - `action`: defines the toolbar button + `default_popup: "popup.html"`
      - `content_scripts`: matches `<all_urls>`, runs `content.ts` on `document_idle`
- [ ] Verify the loaded extension's ID matches `extension/EXTENSION_ID.txt` from Ext-1. If it differs, regenerate or update Ext-1 records.

### 3. Auth: login popup + JWT storage

- [ ] `extension/src/popup/popup.html` — minimal form: username, password, submit; below it a status area for the active tab's submission state.
- [ ] `extension/src/popup/popup.ts`:
      - On load: read JWT from `chrome.storage.local`. If present and not expired, hide the login form and show the submit panel.
      - On submit: `POST https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api/auth/login` with `{ username, password }`. Store the returned JWT in `chrome.storage.local` keyed `apiJwt` plus an `apiJwtExpiresAt` epoch (decoded from the JWT). **Confirmed by AITechLeadReview**: token lifetime is `JWT_EXPIRES_IN` env var with default `'24h'` (see `server/src/middleware/auth.ts:41`) — admin re-logs in once a day. Acceptable for V1; revisit only if friction emerges.
      - On 401 anywhere: clear the stored JWT and re-show the login form.
- [ ] `extension/src/lib/api.ts` — typed wrapper around fetch that injects `Authorization: Bearer <jwt>` and handles 401-clear-storage. Uses a single `API_BASE` constant.

### 4. Content script: Readability extraction

- [ ] `extension/src/content/content.ts`:
      - Listen for `chrome.runtime.onMessage` action `EXTRACT_ARTICLE`.
      - On message: clone `document` via `document.cloneNode(true)`, run `new Readability(clone).parse()`.
      - Sanitize `result.textContent` with DOMPurify (strip residual HTML).
      - Reply with `{ success: true, title, textContent, byline, length, excerpt, url: location.href }` or `{ success: false, reason: 'readability_null' | 'too_short' }` if `result === null` or `textContent.length < 200`.
- [ ] Smoke test by injecting onto `https://www.anthropic.com/news/[any-post]` via DevTools and confirming `Readability.parse()` returns sensible content.

### 5. Submit logic: two-tier fallback

- [ ] `extension/src/popup/submit.ts`:
      1. Read active tab via `chrome.tabs.query({ active: true, currentWindow: true })`.
      2. **First tier — server scrape**:
         `POST /api/admin/articles/scrape` with `{ url: tab.url, submitForAnalysis: true }`.
         - On 200/202: success. Show "Submitted — analyzing" + link to `https://letaiexplainai.com/admin/articles/<articleId>`.
         - On 409: show "Already submitted — view existing" + link.
         - On 4xx with `failureType` ∈ `'captcha' | 'forbidden' | 'blocked' | 'paywall' | 'empty'` (confirmed by AITechLeadReview against `server/src/services/scraper/urlScraper.ts`; surfaced by `controllers/articles.ts:610-642`): proceed to second tier.
         - On 5xx or network error: show retry UI.
      3. **Second tier — client extraction + submit**:
         - Send `EXTRACT_ARTICLE` message to content script via `chrome.tabs.sendMessage(tab.id, ...)`.
         - On `{ success: true, ... }`: `POST /api/admin/articles/submit` with `{ sourceUrl: tab.url, title, content: textContent }`.
         - On `{ success: false }`: show "Could not extract article — paste manually at /admin/articles" with a deep link.
- [ ] Surface every step in the popup status area so the admin understands which tier won.

### 5b. Popup UX & Design System (added by AIUXLeadReview)

**Goal**: the popup feels like part of the same product as letaiexplainai.com, even though it's a separate build context. Reuse the web app's tokens; do not invent new ones.

- [ ] **Tailwind setup in `extension/`**: copy the relevant decisions from the web app's `tailwind.config.js` — Inter font (`font-sans`), `orange-*` palette as the accent (matches `Header.tsx` active state at `bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400`), Tailwind 4px spacing scale, `rounded-lg` for buttons, `rounded-xl` for cards. Do NOT introduce new color tokens.
- [ ] **Popup dimensions**: set a fixed `width: 380px` on the popup body (Chrome MV3 popup max is ~800px; 380px is the sweet spot for a single-column form + small list). Height grows to content up to ~600px; beyond that, scroll inside the popup.
- [ ] **Dark mode**: Chrome popups do NOT inherit OS theme. Implement:
      - Read `themePref` from `chrome.storage.local` on popup mount.
      - Default to OS theme via `window.matchMedia('(prefers-color-scheme: dark)').matches`.
      - Apply by toggling `class="dark"` on `<html>` (matches web app's `darkMode: 'class'` strategy).
      - Every new background, border, and text color in popup CSS carries a `dark:` variant.
      - Add a small theme toggle in the popup header — mirror `src/components/ThemeToggle.tsx` UX (sun/moon icon, click to switch, persists).
- [ ] **Login form UX**:
      - Username/password inputs with visible labels (not placeholder-only — accessibility).
      - Enter key submits the form.
      - Submit button shows inline spinner + disabled state during fetch.
      - On 401: show inline error message above the form ("Invalid username or password"), focus returns to username field.
      - On network error: inline error + "Try again" affordance.
- [ ] **Submit panel UX**:
      - Primary "Submit this article" button at the top, full width, `bg-orange-600 hover:bg-orange-700 text-white rounded-lg py-2`.
      - Status area below the button shows: idle (button only), in-flight (skeleton block, NOT a spinner — match the web app's LoadingSkeleton style), success (green check + title + "View in admin →" link), error (red icon + message + retry button), duplicate-409 (orange icon + "Already submitted — view existing →").
      - Use `react-hot-toast` mounted at the popup root for transient cross-state feedback.
- [ ] **Accessibility bar**:
      - Every interactive element keyboard-reachable in logical Tab order.
      - Every icon-only control has `aria-label`.
      - Escape key dismisses the popup (Chrome handles this natively, but Escape inside any inline overlay must close that overlay first, not the popup).
      - All animations wrapped in `motion-safe:` Tailwind variants OR check `window.matchMedia('(prefers-reduced-motion: reduce)')` before applying transitions.
      - Tap targets ≥40×40px (popup is desktop-only, but admin may sometimes click with trackpad — keep targets generous).
      - Focus visible: `focus:ring-2 focus:ring-orange-500 focus:ring-offset-2` on all interactive elements.
- [ ] **First-time UX**: on the first popup open after install, show a brief "Welcome — sign in with your admin credentials" header above the login form. Hide it after the first successful login.

### 6. Background service worker (optional but useful)

- [ ] `extension/src/background/service-worker.ts`:
      - Handles `chrome.action.onClicked` if the popup is bypassed (e.g. keyboard shortcut later).
      - Maintains a small `chrome.storage.session` cache of the last 10 submission results so the popup can show recent activity without an API round-trip on open. (Display polish lives in Ext-3 — for Ext-2 just write to storage.)

### 7. Local dev loop

- [ ] `cd extension && bun install && bun run dev` — Vite serves the unpacked build into `extension/dist/`.
- [ ] In Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `extension/dist/`.
- [ ] Confirm the toolbar button appears, the popup opens, and login succeeds against **local** `npm run dev:server` (point `API_BASE` at `http://localhost:3001` via a `.env.development` consumed by Vite).
- [ ] Submit a known-scrapable URL → row appears in local DB. Submit a paywalled-style URL (use a `?force=readability` query param hack for dev to skip the scrape tier) → row appears via the second tier.

### 8. Tests

- [ ] Unit tests for the submit-logic state machine in `extension/src/popup/__tests__/submit.test.ts` — mock fetch, verify scrape→submit fallback fires only on the documented `failureType` codes.
- [ ] Unit tests for the api wrapper in `extension/src/lib/__tests__/api.test.ts` — verify 401 clears storage.
- [ ] `cd extension && bun test` — all pass
- [ ] `cd extension && bun run typecheck` — zero errors
- [ ] `cd extension && bun run lint` — zero errors
- [ ] Repo root: `npm run typecheck && npm run lint && npm test` — still green (no server-side regressions).

### 9. Deploy

- [ ] No backend deploy (no server code changes in this sprint — if any leaked in, they belong in Ext-1).
- [ ] No web frontend deploy.
- [ ] Extension build: `cd extension && bun run build` — produces `extension/dist/`.
- [ ] Sideload `extension/dist/` on Wylie's primary Chrome profile.
- [ ] Repoint `API_BASE` to prod (`https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod`) before sideloading.

### 10. Backend Validation

- [ ] Submit one real article via the extension. `aws logs tail /aws/lambda/ai-timeline-api-prod --since 5m` — zero CORS errors, zero 5xx, request completes within 30s Lambda timeout.
- [ ] Confirm `IngestedArticle` row exists via `curl https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api/admin/articles?limit=5 -H "Authorization: Bearer $(cat /tmp/ext-jwt.txt)"`.
- [ ] Submit a paywalled article (e.g. The Information — log in to publisher first in the same Chrome profile). Verify the second tier fires (popup status confirms) and the row carries the Readability-extracted text.

### 11. Browser Validation (verifying server-side admin UI shows the row) — via `/Browser` skill only

- [ ] `agent-browser open https://letaiexplainai.com/admin/review`
- [ ] `agent-browser screenshot` — initial state with the just-submitted row visible
- [ ] `agent-browser snapshot -i` — confirm the row is interactive (approve/reject)
- [ ] Zero console errors, zero 4xx/5xx in network tab

### 11b. Popup UX QA (added by AIUXLeadReview)

The popup itself can't be opened by `agent-browser` (it's a Chrome extension surface, not a web page). Verify manually with screenshots:

- [ ] Take screenshots of the popup in: idle, login error (wrong creds), in-flight submit, success, error, duplicate-409 states.
- [ ] Verify dark mode: toggle theme in popup, take matching screenshots — every background/border/text color must adapt cleanly.
- [ ] Keyboard-only test: from a fresh popup open, complete login → submit using only Tab, Shift+Tab, Enter, Escape. No mouse.
- [ ] Reduced-motion test: in macOS System Settings → Accessibility → Display, enable "Reduce motion." Reload extension. Confirm transitions are instant or simplified.
- [ ] Screen reader smoke test: turn on VoiceOver (Cmd+F5), confirm all controls announce their role + label correctly (login form fields, submit button, status messages).
- [ ] Save the screenshot set in `extension/docs/popup-states/` for the README.

---

## Definition of Done

- [ ] All tasks above checked
- [ ] Extension sideloaded and used to submit ≥3 real articles, ≥1 of which used the Readability fallback
- [ ] Submission round-trip (click → row in `/admin/review`) <60s
- [ ] Zero TypeScript errors, zero lint errors, all tests passing (extension + repo root)
- [ ] CloudWatch clean post-submission window
- [ ] `extension/README.md` covers: build (`bun run build`), sideload steps, login, two-tier behavior
- [ ] Sprint file timestamp updated

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
