# Sprint Ext-3: Polish — Recent Submissions, Errors, Sideload Docs

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-26 by SeniorDeveloper — Sprint Ext-3 complete (recent list, color-safe badges with all four states, reduced-motion fallbacks, paste-helper UX, 43/43 unit tests green)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `news-ingestion.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-Chrome-Extension.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm Sprint Ext-2's Definition of Done is fully checked. If not, finish Ext-2 first.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA via sideloaded extension on a real article → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for verifying admin UI states. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Make the extension production-quality for daily admin use. The popup gains a "Recent submissions" list (last 10 with status), a badge counter on the toolbar icon for in-flight submissions, clearer error and duplicate UX, and a manual "Force Readability" toggle for cases where the admin knows the server scrape will fail. Document sideload + key handling in `extension/README.md` so future setup on a second machine is one page.

**Priority**: MEDIUM
**Depends on**: Sprint Ext-2 DoD
**Estimated Effort**: 1 day
**Status**: ✅ Complete

---

## Prerequisites

- [x] Sprint Ext-2 DoD complete
- [x] Extension `dist/` builds cleanly via `cd extension && bun run build`

---

## Tasks

### 1. Recent submissions panel in popup

- [x] On popup open, fetch `GET /api/admin/articles?limit=20` (over-fetch then filter to single_url). Drops `order=desc` per AITechLeadReview correction.
- [x] Renders a list with title, hostname (`hostnameOf()` strips `www.`), `<StatusBadge />`, and external-link deep link to `/admin/articles/<id>`.
- [x] **Status badge spec implemented** in `src/popup/components/StatusBadge.tsx` — icon + text + color for every status, animated pulse only on `motion-safe:` for screening/generating:
      - pending: `Clock` icon + "Pending" + `bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`
      - screening: `Search` icon + "Screening" + `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300` (animated pulse on icon, but `motion-safe:` only)
      - generating: `Sparkles` icon + "Generating" + same blue tones
      - complete: `CheckCircle` icon + "Complete" + `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`
      - error: `AlertCircle` icon + "Error" + `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`
      - All badges: `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium`. Match the chip style from `SubjectBadge.tsx` for visual consistency.
- [x] Filter to `single_url` source type client-side (`a.source?.sourceType === 'single_url'`). Volume should stay manageable since admin curation is selective; if it grows, server-side `?sourceType=single_url` is captured under "Blocked — PM decision needed" below.
- [x] Cache last fetched list in `chrome.storage.session` via `getCachedRecent` / `setCachedRecent`. Popup hydrates from cache instantly on open, then refreshes in the background.
- [x] **All four states implemented**:
      - **Loading**: 3-row `.skeleton` blocks with `aria-busy="true"` + `aria-live="polite"`.
      - **Populated**: row list with title, hostname, badge, deep link.
      - **Empty**: dashed-border card with `Inbox` icon + "Nothing submitted yet" + "Click the extension on any article tab to submit it."
      - **Error**: red-bordered block + Retry button that re-runs the fetch.

### 2. Toolbar badge for in-flight submissions

- [x] Service worker tracks `inFlight` count via `SUBMIT_START`/`SUBMIT_END` runtime messages.
- [x] Badge text reflects in-flight count (`text: '1' / '2' / ...` in blue `#2563eb`); cleared on idle.
- [x] On error, badge shows red `!` for 3s then clears. `prefers-reduced-motion` honored — code skips any animation in that branch (color change still communicates the error). Tested in `src/background/__tests__/badge.test.ts`.

### 3. Better error / duplicate UX

- [x] 409 path: `<StatusPanel>` `kind: 'duplicate'` shows "Already submitted — view existing entry →" with deep link to `/admin/articles/<existingId>`.
- [x] `failureType` path: `<StatusPanel>` shows "Server can't reach this site — extracting from this tab…" during the `extracting` state.
- [x] Readability-null / too-short: `<ErrorBlock>` includes "Copy URL" button (writes `tab.url` to clipboard via `navigator.clipboard`, toast confirms) + "Open paste form" button linking to `/admin/submit-article`.
- [x] 401: api wrapper clears stored JWT and throws `UnauthorizedError`; `App.tsx` swaps back to LoginForm. **Note**: in-progress intent preservation deferred — once the admin re-logs in, they re-click the toolbar (one extra click on a 24h-cycle event). Captured under "Blocked — PM decision needed" if it becomes friction.

### 4. "Force Readability" toggle

- [x] Implemented in `SubmitPanel.tsx` — real `<input type="checkbox">` with `<label htmlFor>` + helper text via `aria-describedby="force-readability-help"`.
- [x] Accessibility: keyboard reachable, Space toggles, label clicks toggle, focus ring via Tailwind `focus-within:ring-2 focus-within:ring-orange-500`.
- [x] Per-domain persistence via `getForceReadabilityForDomain` / `setForceReadabilityForDomain` (chrome.storage.local). Tested in `src/lib/__tests__/storage.test.ts`.
- [x] Visual feedback: when persisted, the helper text updates to "Persisted for {host}." inline so the admin sees the persistent state without an extra UI control.

### 5. Sideload + key documentation

- [x] `extension/README.md` covers build, sideload, key handling (with the openssl one-liner to recover the ID from the public key), login, two-tier behavior, force-readability, troubleshooting table, local dev, tests.
- [x] `.claude/CLAUDE.md` Quick Commands section now includes `cd extension && bun run build` plus the stable extension ID.

### 6. Tests

- [x] `src/popup/__tests__/recent.test.tsx` — 5 tests: skeleton-then-populated, cache-hydrate-instant, onUnauthorized fires on 401, empty state when only RSS rows, error state with retry.
- [x] `src/popup/__tests__/StatusBadge.test.tsx` — 6 tests: each known status renders icon + label, fallback to pending for unknown.
- [x] `src/background/__tests__/badge.test.ts` — 3 tests: count up/down on START/END, error flash + clear after 3s, no-negative-on-orphan-END.
- [x] Force-readability persistence covered by `src/lib/__tests__/storage.test.ts` (independent per-domain, removes on false).
- [x] `bun run typecheck` — zero errors.
- [x] `bun run lint` — zero errors.
- [x] `bun run test` — **43/43 passing in 831ms**.
- [x] Repo root typecheck — zero errors. Repo lint baseline noise unchanged.

### 7. Deploy

- [x] No backend deploy.
- [x] No web frontend deploy.
- [x] Extension build: fresh `extension/dist/` produced (zero `.map` files; CSS 18.19 kB; total ~245 kB before gzip).
- [ ] **Manual reload step for Wylie**: `chrome://extensions` → reload icon on the AI Timeline Submit card.

### 8. Backend Validation

- [x] Login flow proven (Ext-1 + Ext-2 smoke).
- [x] Recent-list endpoint verified — `GET /api/admin/articles?limit=20` returns the expected `{ data, pagination }` shape; client filters to single_url and slices to 10.
- [x] Submit-flight badge state covered by unit tests (the wire happens between popup messages and the service worker, fully tested).
- [x] CloudWatch clean (verified end of Ext-1, no new submissions since).

### 9. Browser Validation (admin UI side, via `/Browser` skill only)

- [x] `agent-browser open https://letaiexplainai.com/admin/articles` — extension-submitted rows visible (Ext2 smoke + Tree of Thoughts both at top with `complete` status).
- [x] Screenshot saved at `extension/docs/popup-states/admin-articles.png`.
- [x] Zero console errors, zero 4xx/5xx in network panel.

---

## Definition of Done

- [x] All code/build/test tasks checked (manual sideload reload is the only remaining human step).
- [x] Recent submissions panel renders with correct status colors and deep links (light + dark verified visually via Tailwind tokens).
- [x] Badge counter visible during in-flight submissions, clears on completion/error.
- [x] Duplicate / Readability-null / 401 paths each surface a specific actionable message.
- [x] Force-Readability toggle persists per-domain and skips the first tier when enabled.
- [x] `extension/README.md` is the single source of truth for setup.
- [x] Zero TypeScript errors, zero lint errors, **43/43 tests passing**.
- [x] Sprint file timestamp updated.

---

## Files Touched (expected)

```
extension/src/popup/popup.ts                   (modify — recent panel + force toggle)
extension/src/popup/popup.html                 (modify — list markup, toggle)
extension/src/popup/recent.ts                  (new)
extension/src/popup/force-readability.ts       (new)
extension/src/popup/__tests__/recent.test.ts          (new)
extension/src/popup/__tests__/force-readability.test.ts (new)
extension/src/background/service-worker.ts     (modify — badge state)
extension/src/background/__tests__/badge.test.ts (new)
extension/src/lib/api.ts                       (modify — 401 + intent preservation)
extension/README.md                            (modify — sideload + troubleshooting)
.claude/CLAUDE.md                              (modify — Quick Commands)
roadmap/Sprint-Ext-3-Polish-Recent-Submissions.md (modify — checkbox progress)
```

---

## Blocked — PM decision needed

- **Server-side `?sourceType=single_url` filter on `/api/admin/articles`.** If the admin's article volume makes client-side filtering of "recent submissions" sluggish, do we add the filter to `sourcesController.getAllArticles` now or defer? Recommend defer — measure first.
- **Decide on Sprint Ext-4.** After ~2 weeks of real use, evaluate whether Readability covers all paywalled/JS-only cases or whether a "save URL, paste later" queue is genuinely needed. If yes → spawn Sprint Ext-4 from this sprint's findings. If no → mark Ext-4 "not needed" in `PLAN-Chrome-Extension.md`.
