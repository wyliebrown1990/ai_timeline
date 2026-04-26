# Chrome Extension for Article Submission — Development Plan

> **Project**: One-click article submission from any browser tab into the AI Timeline ingestion pipeline, with a two-tier server-scrape → client-Readability fallback so paywalled / anti-bot sites still work.
> **Code Prefix**: `Ext`
> **Start Date**: 2026-04-24
> **Product Manager**: Wylie
> **Status**: Planning — ready to execute Sprint Ext-1 (AITechLeadReview applied 2026-04-24: 1 critical correction to Ext-1 CORS update path, 4 minor fixes across sprints, JWT lifetime question resolved. AIUXLeadReview applied 2026-04-26: popup design system specified, all-four-states added to recent-list and queue, color-blind-safe status badges, `EmptyState` to be added to `ui/` library in Ext-4)

---

## Vision

Today, getting a news article into the AI Timeline pipeline requires the admin to either (a) configure an RSS source, (b) paste a URL into `/admin/articles` and hope the server-side `scrapeUrl()` succeeds, or (c) paste the URL plus the full article text by hand. The Chrome extension collapses those flows into a single toolbar click on whatever tab the admin is reading. When the server can crawl the page it does; when the server is blocked (paywall, anti-bot, JS-only renderer), the extension extracts the rendered DOM via Mozilla Readability — leveraging the admin's already-authenticated browser session — and submits that text instead. The admin's research workflow becomes the ingestion workflow.

## Success Metrics

- One-click submission from any open tab to `IngestedArticle` row in `screening` status — verified end-to-end on letaiexplainai.com prod
- ≥90% of admin submissions succeed without manual paste (measured over the first 20 real submissions after Ext-2 ships)
- Paywalled-site submission (e.g. The Information, NYT) succeeds via the Readability fallback when the admin is signed in to the publisher
- Submission round-trip (click → row visible in `/admin/review` queue) completes in <60s
- Zero new backwards-compat shims; zero new AWS resources; zero new billable line items

---

## Developer Workflow (MANDATORY — read before every work session)

This workflow is enforced on every sprint. Ignoring it = broken ship.

1. **Read `.claude/` first.** `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` + the relevant `.claude/rules/*.md` files (`backend.md`, `news-ingestion.md` for Ext-1; `frontend.md` is mostly N/A — the extension is its own surface). Never skip.
2. **Orient inside `/roadmap/`.** Open this PLAN and the current sprint file. Pick exactly one unchecked `[ ]` task.
3. **Write elegant code in small blocks.** Minimum code to satisfy the task. Short *why* comments only. No speculative abstractions. No new analysisStatus values, no new schema fields, no new endpoints unless a sprint task explicitly calls for them.
4. **After every code block, before moving on**:
   - `npm run typecheck` (zero errors)
   - `npm run lint` (zero errors)
   - Write/update tests covering what changed
   - `npm test` (all pass)
5. **Update the sprint file.** `[ ] → [x]` on the task just completed. Commit code + checkbox together.
6. **QA front-to-back.** API change: `curl` prod + `aws logs tail /aws/lambda/ai-timeline-api-prod`. Extension change: load the unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked), click the action on a real article, verify the row appears in `/admin/review`. Use `/Browser` (agent-browser) for any web UI verification — never `mcp__claude-in-chrome__*`.
7. **Deploy early, deploy often.** Each sprint has a Deploy section. Don't let more than one sprint accumulate unshipped.
8. **No backwards compatibility** unless Wylie explicitly requested it.
9. **Stop conditions**: DoD met, or PM decision needed. For PM decisions, write the question under `## Blocked — PM decision needed` in the relevant sprint and ping Wylie.
10. **AWS CLI available** — deploy, logs, invalidate CloudFront, migrations per `.claude/CLAUDE.md` and `.claude/rules/backend.md`. SSM holds `/ai-timeline/prod/jwt-secret`, `/ai-timeline/prod/admin-username`, `/ai-timeline/prod/admin-password`.

---

## Technical Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Extension manifest | Manifest V3 | Required by Chrome — V2 deprecated |
| Extension language | TypeScript + Vite | Matches repo conventions; `@crxjs/vite-plugin` handles bundling + HMR |
| Article extraction | `@mozilla/readability` (in content script) | Battle-tested, same engine Firefox Reader View uses; runs in the admin's authenticated DOM |
| Auth | Existing `POST /api/auth/login` → JWT in `chrome.storage.local` | Reuses backend; no new auth surface |
| Submission endpoints | Existing `POST /api/admin/articles/scrape` and `POST /api/admin/articles/submit` | No new endpoints in mandatory sprints |
| CORS | Append `chrome-extension://<id>` to SSM parameter `/ai-timeline/prod/cors-origin` (consumed by Lambda env var via `infra/template.yaml:101`) | Existing config pattern at `server/src/index.ts:67-101` — exact string match only, no glob support, so the extension key (and resulting ID) must be stable |
| Repo location | `extension/` at repo root | Mono-repo — single `git push`, shared types possible later |

## UX Approach (added by AIUXLeadReview 2026-04-26)

The extension popup is a **new product surface**, not part of the web app's React Router tree. To keep it feeling like the same product:

- **Typography**: Inter (`font-sans`) — matches the web app. Body ≥14px in the popup (slight downshift from web's 16px is acceptable in a 360-400px popup), never below.
- **Palette**: Tailwind `orange-*` accent (matches `Header.tsx` active state at `bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400`). Do NOT use the declared-but-unshipped `primary-*` tokens; the web app ships `orange-*`. One palette only.
- **Dark mode**: Chrome popups do NOT inherit OS theme automatically. Read theme preference from `chrome.storage.local` (mirror the web app's ThemeToggle), default to OS via `window.matchMedia('(prefers-color-scheme: dark)')`. Every new background/border/text color carries a `dark:` variant.
- **Loading states**: Skeleton blocks (mirror `LoadingSkeleton` from `src/components/ui/`), never generic spinners.
- **Toasts**: `react-hot-toast` mounted in the popup's root for transient feedback (success, "submitted", duplicate).
- **Accessibility bar**: keyboard-only path through every flow, focus trap inside the popup, Escape dismisses overlays, ARIA labels on every icon-only control, `prefers-reduced-motion` respected on every animation.
- **Tailwind config**: the extension keeps its own `extension/tailwind.config.js`, but copies the same token decisions (font, color choices, breakpoints) so visual drift between web and extension stays minimal.

The Ext-4 admin queue page lives **inside** the existing web app and must reuse `AdminLayout`, `<ErrorState />`, `<LoadingSkeleton />`, `<ConfirmDialog />`, and `react-hot-toast` — no parallel UI infrastructure.

## Data Model Summary

**No schema changes in mandatory sprints.** The existing flow already handles every shape the extension produces:

- `IngestedArticle` (`prisma/schema.prisma:81`) — created by both `submitArticle` and `scrapeArticleUrl` controllers
- `NewsSource` with `sourceType: 'single_url'` (`prisma/schema.prisma:59`) — already used by both manual paths
- `BlockedDomain` (referenced in `server/src/controllers/articles.ts:615`) — already records hosts that fail scraping
- `analysisStatus` flow: `screening` → `generating` → `complete` (no new states needed)

**Conditional Sprint Ext-4** would add either a new `analysisStatus: 'awaiting_content'` value or a separate `PendingSubmission` model — but only fires if real-world usage in Ext-2/3 reveals a gap that Readability cannot fill.

## API Surface Summary

**No new endpoints in mandatory sprints.** The extension consumes the existing admin API:

```
POST /api/auth/login                             (existing — get JWT)
POST /api/admin/articles/scrape                  (existing — try server-side first)
POST /api/admin/articles/submit                  (existing — fallback with extracted text)
GET  /api/admin/articles?limit=10&order=desc     (existing — recent submissions in popup)
```

## Frontend Routes Summary

**No new web routes.** The extension is its own surface (Chrome toolbar popup + content script). No changes to `src/App.tsx` are expected.

## Sprint Overview

| Sprint | Focus | Key Deliverables | Estimated Effort |
|--------|-------|------------------|------------------|
| **Ext-1** | Backend prep — CORS for `chrome-extension://`, audit existing endpoints from a foreign-origin caller, document the contract the extension will rely on | Updated `CORS_ORIGIN`, deployed Lambda, curl smoke proofs from a browser-like Origin header | 0.5 day |
| **Ext-2** | Extension MVP — Manifest V3 scaffold, login popup, content script with Readability, action button, two-tier scrape→submit fallback, sideload-ready build | `extension/` directory with working unpacked extension; first real submission from a tab lands in `/admin/review` | 2 days |
| **Ext-3** | Polish — recent submissions list in popup, badge counter, error/duplicate UX, manual "force Readability" toggle, sideload docs | Production-quality popup; admin uses the extension as primary submission path | 1 day |
| **Ext-4** *(conditional)* | Queue-for-later-paste — only if Ext-2/3 surface real gaps | New `analysisStatus: 'awaiting_content'` (or `PendingSubmission` model), admin queue UI, paste-to-promote flow | 1 day |

**Total estimated effort**: 3.5 days (mandatory) — 4.5 days if Ext-4 fires.

---

## Prevalence / Integration Strategy

This is an admin-only internal tool — no public discoverability needed. Integration points:

- The extension itself ships as an unpacked load (developer mode) on Wylie's primary Chrome profile. No Web Store publication required.
- `/admin/articles` and `/admin/review` are the existing surfaces where extension-submitted rows appear; no new admin routes needed.
- Optional later: a small "Source: Chrome extension" badge on rows in `/admin/articles` if attribution becomes useful for debugging. Out of scope for Ext-1/2/3.

---

## Risks & Open Questions

- **JWT lifetime in the extension.** If the current admin token expiry is short (< 24h), the admin will be logged out frequently in the popup. Need to confirm current expiry in `server/src/middleware/auth.ts:43` and decide whether to bump it for extension use only or add a refresh-token flow. Captured as a Blocked item in Ext-2.
- **Readability false negatives.** Some pages (single-page-app news, video-only posts) won't yield useful text. Strategy: detect `Readability.parse()` returning null or `<200 char` content → surface an error toast in the popup ("Could not extract article — try the manual paste form at /admin/articles"). This is the trigger for considering Ext-4.
- **CORS exact-match constraint.** `server/src/index.ts:91` uses `allowedOrigins.includes(origin)` — pure string equality. `chrome-extension://<id>` works as-is, but every distinct extension ID (e.g. a second machine that regenerated `key.pem`) needs its own allowlist entry. Stable signing key from Ext-1 task 2 is therefore mandatory, not optional. Confirmed by AITechLeadReview.
- **CORS_ORIGIN is SSM-sourced, not template-hardcoded.** Per `infra/template.yaml:101`, the env var resolves from SSM `/ai-timeline/prod/cors-origin`. Update path: edit SSM param, then redeploy SAM (CFN resolves SSM at deploy time). See Ext-1 task 3.
- **Sideload UX.** Unpacked extensions get a permanent "Developer mode extensions are running" banner. Acceptable for an admin-only tool. Web Store publication would remove the banner but adds review overhead — defer.
- **Duplicate submissions.** The existing `submit` and `scrape` controllers already return 409 on duplicate `externalUrl` (controllers/articles.ts:305, 651). Extension UX must surface this clearly so the admin doesn't think the click failed.
- **Tracking-param stripping.** `stripTrackingParams()` runs server-side before the URL is stored. Extension does not need to duplicate this — but it should pass the raw `window.location.href` so server-side cleanup remains the single source of truth.

---

## Definition of Done (whole initiative)

- [ ] Sprint Ext-1 DoD checked
- [ ] Sprint Ext-2 DoD checked
- [ ] Sprint Ext-3 DoD checked
- [ ] (Conditional) Sprint Ext-4 DoD checked, OR documented as not needed
- [ ] Extension sideloaded on Wylie's primary Chrome profile
- [ ] ≥10 successful real-world submissions through the extension, ≥1 of which used the Readability fallback path
- [ ] CloudWatch clean post-launch (no new error patterns in `ai-timeline-api-prod`)
- [ ] Sideload instructions captured in `extension/README.md`
- [ ] `.claude/CLAUDE.md` Quick Commands section updated with extension build/load command if non-trivial
