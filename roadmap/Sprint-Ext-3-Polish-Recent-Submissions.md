# Sprint Ext-3: Polish — Recent Submissions, Errors, Sideload Docs

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-26 by AIUXLeadReview (added all-four-states for recent list, color-safe badges, reduced-motion fallbacks)

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
**Status**: Not started

---

## Prerequisites

- [ ] Sprint Ext-2 DoD complete (extension sideloaded, ≥3 real submissions, two-tier fallback proven)
- [ ] Extension `dist/` builds cleanly via `cd extension && bun run build`

---

## Tasks

### 1. Recent submissions panel in popup

- [ ] On popup open, fetch `GET /api/admin/articles?limit=10` (existing endpoint per `routes/articles.ts:18`) using the stored JWT. **Corrected by AITechLeadReview**: `order=desc` is silently ignored — `getAllArticles` hardcodes `createdAt: 'desc'`, so default ordering already gives most-recent-first. Drop the param.
- [ ] Render a list with: title, hostname (extracted from `externalUrl`), `analysisStatus` badge, and a deep link to `https://letaiexplainai.com/admin/articles/<id>`.
- [ ] **Status badge spec (added by AIUXLeadReview — color is not the only signal)**: each badge combines an icon (lucide-react) + status text + color. Color-blind users still get the signal:
      - pending: `Clock` icon + "Pending" + `bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`
      - screening: `Search` icon + "Screening" + `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300` (animated pulse on icon, but `motion-safe:` only)
      - generating: `Sparkles` icon + "Generating" + same blue tones
      - complete: `CheckCircle` icon + "Complete" + `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`
      - error: `AlertCircle` icon + "Error" + `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`
      - All badges: `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium`. Match the chip style from `SubjectBadge.tsx` for visual consistency.
- [ ] Filter the list to only show rows from `single_url` source type (i.e. extension/manual submissions, not RSS) by joining via `sourceId` — accept that the existing endpoint may return all sources and filter client-side. If the volume is too large to filter client-side, defer a server-side `?sourceType=single_url` query param to a follow-up sprint and document the deferral in `Blocked — PM decision needed`.
- [ ] Cache the last fetched list in `chrome.storage.session` so subsequent popup opens render instantly while a background refresh happens.
- [ ] **All four states (added by AIUXLeadReview — required for any data-dependent surface)**:
      - **Loading** (cold open, no cache): 3-row skeleton block, mirroring `LoadingSkeleton` shape from `src/components/ui/LoadingSkeleton.tsx`. Never use a generic spinner.
      - **Populated**: list as specified above.
      - **Empty** ("Nothing submitted yet"): centered message with a hint — "Click the extension on any article tab to submit it." Use the same warm-gray palette as other empty messages in the web app.
      - **Error** (fetch failed): inline error block with a "Retry" button. Mirror the visual treatment of `<ErrorState />` from `src/components/ui/ErrorState.tsx` — short title, one-line description, single action.

### 2. Toolbar badge for in-flight submissions

- [ ] In the service worker, track `inFlightCount` in memory: increment on submit-start, decrement on submit-complete-or-error.
- [ ] Use `chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' })` and `setBadgeBackgroundColor({ color: '#2563eb' })` to surface activity.
- [ ] On error, flash badge red (`#dc2626`) for 3 seconds before clearing. **Reduced-motion fallback (added by AIUXLeadReview)**: detect `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and skip the flash entirely (just set red and clear after 3s with no animation). The badge color change still communicates the error; only the strobe-like flash is suppressed.

### 3. Better error / duplicate UX

- [ ] On 409 from `scrape` or `submit`: show "Already in queue" with a button that opens `https://letaiexplainai.com/admin/articles/<existingId>` (the controllers already return `existingId`, see `controllers/articles.ts:307-309, 656-658`).
- [ ] On `failureType` from `scrape`: show "Server can't reach this site — extracting from your tab instead…" before the second tier kicks in. Don't make the admin guess.
- [ ] On Readability-null or `<200 chars`: show "Couldn't extract article. Open `/admin/articles` and paste manually." with a button that opens that URL and copies the current `tab.url` to the clipboard.
- [ ] On 401: clear stored JWT, return to login form, preserve the in-progress submission intent so the click isn't lost (re-trigger after login).

### 4. "Force Readability" toggle

- [ ] Add a small checkbox in the popup labeled "Skip server scrape (use this tab's content)". When checked, the submit logic skips the first tier entirely and goes straight to client extraction + `POST /submit`. Useful for sites the admin already knows will be blocked (saves a round-trip).
- [ ] **Accessibility (added by AIUXLeadReview)**: the toggle must be a real `<input type="checkbox">` with an associated `<label>` (clicking the label toggles the checkbox). `aria-describedby` points to a one-line helper text below: "Skips the server scrape — useful for paywalled sites." Keyboard reachable via Tab; Space toggles.
- [ ] Persist the toggle's state per-domain in `chrome.storage.local` (e.g. theinformation.com once forced → always forced, until manually unchecked).
- [ ] **Visual feedback (added by AIUXLeadReview)**: when the toggle persists for a domain, show an inline pill above the submit button on subsequent visits to that domain — "Force-Readability is on for theinformation.com [Undo]" — so the admin can see and reverse the persisted state without reopening the toggle.

### 5. Sideload + key documentation

- [ ] `extension/README.md`:
      - Build: `cd extension && bun install && bun run build`
      - Sideload: `chrome://extensions` → Developer mode → Load unpacked → `extension/dist/`
      - Key handling: `key.pem` is private and gitignored. To install on a second machine, copy `key.pem` from the primary machine via secure transfer (1Password, USB, etc.). Do not regenerate — that changes the extension ID and breaks the CORS allowlist.
      - Login: admin creds from `/ai-timeline/prod/admin-username` / `admin-password` SSM parameters.
      - Troubleshooting: 401 (token expired — re-login), 403 from CORS (verify Ext-1 deploy), Readability null (site is JS-only — paste manually).
- [ ] Update `.claude/CLAUDE.md` Quick Commands section with `cd extension && bun run build` so future sessions discover the build path.

### 6. Tests

- [ ] Unit tests for the recent-submissions fetch + render in `extension/src/popup/__tests__/recent.test.ts` — mock fetch, verify status-badge mapping, verify cache hit-through.
- [ ] Unit tests for the badge state machine in `extension/src/background/__tests__/badge.test.ts`.
- [ ] Unit tests for the per-domain force-readability persistence in `extension/src/popup/__tests__/force-readability.test.ts`.
- [ ] `cd extension && bun test` — all pass
- [ ] `cd extension && bun run typecheck` — zero errors
- [ ] `cd extension && bun run lint` — zero errors
- [ ] Repo root: `npm run typecheck && npm run lint && npm test` — green.

### 7. Deploy

- [ ] No backend deploy.
- [ ] No web frontend deploy.
- [ ] Extension build: `cd extension && bun run build` — fresh `extension/dist/`.
- [ ] Reload the unpacked extension in `chrome://extensions` → click the reload icon on the AI Timeline Submit card.

### 8. Backend Validation

- [ ] Open the popup with no JWT → login flow works.
- [ ] Open the popup with a stored JWT → recent submissions list renders, network tab shows one call to `/api/admin/articles?limit=10`.
- [ ] Submit a fresh article → badge increments to 1, decrements when status flips past `screening`.
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 10m` — clean.

### 9. Browser Validation (admin UI side, via `/Browser` skill only)

- [ ] `agent-browser open https://letaiexplainai.com/admin/articles`
- [ ] `agent-browser screenshot` — confirm extension-submitted rows are present and the most recent matches what the popup showed
- [ ] Zero console errors, zero 4xx/5xx

---

## Definition of Done

- [ ] All tasks above checked
- [ ] Recent submissions panel renders with correct status colors and deep links
- [ ] Badge counter visible during in-flight submissions, clears on completion/error
- [ ] Duplicate / Readability-null / 401 paths each surface a specific actionable message
- [ ] Force-Readability toggle persists per-domain and skips the first tier when enabled
- [ ] `extension/README.md` is the single source of truth for setup
- [ ] Zero TypeScript errors, zero lint errors, all tests passing
- [ ] Sprint file timestamp updated

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
