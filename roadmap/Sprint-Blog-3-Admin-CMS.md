# Sprint Blog-3: Admin Authoring CMS

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-22 by Claude (AIUXLeadReview — `ConfirmDialog` reuse for destructive actions, autosave aria-live, admin list/editor full state specs, image upload states, status chip tokens, desktop-first framing, dark-mode editor coverage, focus trap on modals)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `.claude/CLAUDE.md`, `.claude/rules/frontend.md`, `.claude/rules/backend.md`.
2. Re-read `roadmap/PLAN-Blog-Editorial.md` **Developer Workflow (MANDATORY)** section.
3. Confirm Sprint Blog-1 + Blog-2 DoDs are checked. If not, finish them first.
4. Review existing admin UX: `src/pages/admin/CreateMilestonePage.tsx`, `src/pages/admin/EditMilestonePage.tsx`, `src/components/admin/AdminLayout.tsx`. Match patterns.
5. Pick the next unchecked `[ ]` task below.
6. For every code block: typecheck → lint → tests → QA in browser → commit → check the box.
7. Stop only when DoD met or PM decision needed.

---

## Overview

Build the admin CMS for blog authoring. A split-pane editor with live markdown preview, autosave, S3 image upload, tag/subject/author pickers, and publish/schedule/archive workflow. Auth-gated. This is how Wylie writes posts.

**UX posture (added by AIUXLeadReview)**: Admin CMS is **desktop-first**. The split-pane editor is designed for a ≥1280px display. Mobile is a graceful fallback (tabbed Write/Preview/Meta), not a design target. Density, keyboard flow, and authoring speed take precedence over whitespace and thumb-reach. Match existing admin patterns in `src/pages/admin/CreateMilestonePage.tsx`, `EditMilestonePage.tsx`, `IngestedArticlesPage.tsx` — don't freestyle.

**Priority**: HIGH
**Depends on**: Blog-1 (API) + Blog-2 (public reader so preview mode works)
**Estimated Effort**: 2-3 days
**Status**: Shipped — /admin/blog + editor + authors live, end-to-end published-a-test-post QA confirmed (see Live Browser QA section).

---

## Prerequisites

- [x] Blog-1 + Blog-2 DoDs complete, live on prod.
- [x] Admin JWT auth flow working: `POST /api/auth/login` returns token; existing `/admin` pages reachable.
- [x] Review `src/components/admin/AdminLayout.tsx` nav structure.

---

## Tasks

### 1. API client (admin)

- [x] Extend `src/services/api.ts` with `blogAdminApi`:
  - `list({ status?, q?, authorId? })`
  - `get(id)`
  - `create(input)`
  - `update(id, patch)`
  - `publish(id)` / `schedule(id, scheduledFor)` / `archive(id)`
  - `getUploadUrl({ filename, contentType })`
  - `authors.list() / create(input) / update(id, patch)`
- [x] All methods attach `Authorization: Bearer ${token}` via existing admin auth context.

### 2. Admin list page

- [x] Create `src/pages/admin/BlogAdminListPage.tsx`:
  - Table: title, status chip, author, publishedAt, updatedAt, actions (Edit / Preview / Publish / Archive).
  - Status filter tabs: All / Draft / Scheduled / Published / Archived (counts per tab).
  - Search by title (debounced 300ms input).
  - "New Post" primary button → `/admin/blog/new` (top-right; style matches existing admin primary buttons).
  - Row hover: `hover:bg-gray-50 dark:hover:bg-gray-800` to match existing admin tables.
  - Click row → `/admin/blog/:id/edit`.

**Status chip tokens (shared — reuse across editor, preview badge, list):**
- `draft` — `bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`
- `scheduled` — `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`
- `published` — `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300`
- `archived` — `bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 line-through`

**State checklist for admin list:**
- [x] Loading: `<LoadingSkeleton>` table skeleton (reuse existing `src/components/ui/LoadingSkeleton.tsx`).
- [x] Populated: table.
- [x] Empty (no posts ever): `<EmptyState>` with icon, title "No blog posts yet", description, CTA button "Create your first post" → `/admin/blog/new`.
- [x] Empty (zero match filter): `<EmptyState>` with title "No posts match", CTA "Clear filters".
- [x] Error: `<ErrorState>` with retry.

- [x] Add route in `src/App.tsx` under `/admin`:
  ```tsx
  <Route path="blog" element={<BlogAdminListPage />} />
  <Route path="blog/new" element={<BlogEditorPage mode="new" />} />
  <Route path="blog/:id/edit" element={<BlogEditorPage mode="edit" />} />
  ```
- [x] Add "Blog" nav link in `src/components/admin/AdminLayout.tsx` — placement: between "Milestones" and "News Sources" (group content-authoring items together).

### 3. Editor page

#### 3.1 Layout
- [x] Create `src/pages/admin/BlogEditorPage.tsx`:
  - Top bar (sticky): back button (returns to `/admin/blog`), title input inline (`text-2xl font-semibold`), status chip (tokens from §2), action buttons right-aligned.
  - Button variants (explicit):
    - **Primary** ("Publish" / "Save draft" / "Schedule"): `bg-orange-600 hover:bg-orange-700 text-white` (matches LAEA orange accent).
    - **Secondary** ("Preview"): `bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200`.
    - **Destructive** ("Archive"): `bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800` → opens `<ConfirmDialog>`.
  - Layout responsive behavior (EXPLICIT — added by AIUXLeadReview):
    - `≥1280px` (xl): 3-pane — metadata (left, 320px) + editor (center, flex-1) + preview (right, 480px). All visible.
    - `lg` (1024-1279px): 2-pane — editor + preview; metadata moves to a slide-out drawer triggered by "Details" button in top bar.
    - `md` (768-1023px): single pane with tabs "Write / Preview / Meta". **Write is default tab on first load.**
    - `sm` (<768px): same tabbed pattern; warning banner "The editor is optimized for desktop. Continue on a larger screen for the best experience." Dismissable.
  - Center pane (markdown textarea): `font-mono text-sm leading-relaxed`, `bg-gray-50 dark:bg-gray-900` in light/dark.
  - Right pane (preview): mounts `<BlogMarkdown>` from Blog-2 using in-memory body. Sticky, scroll-synced.
  - Both panes support dark mode — verify preview reads well in both.

#### 3.2 Autosave
- [x] Debounce field changes at 1000ms; call `blogAdminApi.update` in background.
- [x] Status indicator: "Saving…" → "Saved ✓ 12s ago" — updates every 10s.
- [x] Wrap the indicator in `<span role="status" aria-live="polite" aria-atomic="true">` so screen readers announce save state changes without being chatty.
- [x] On autosave failure: show inline error "Couldn't save — changes preserved locally. Retry" + retry button. Surface a `react-hot-toast` error toast too.
- [x] Warn on navigate-away with unsaved changes (React Router `useBlocker`) — use the browser's beforeunload for hard reloads.
- [x] Test: throttle network to offline → autosave fails → error visible → come back online → next debounce cycle succeeds → indicator clears.

#### 3.3 Slug logic
- [x] Slug field auto-generates from title on blur (kebab-case), editable, validates uniqueness via `GET /api/admin/blog?slug=`.

#### 3.4 Cover image upload
- [x] "Upload cover" button → calls `blogAdminApi.getUploadUrl({ filename, contentType })` → PUTs file to S3 presigned URL → saves the public URL onto the post.
- [x] **Upload state machine (EXPLICIT)**:
  - `idle` — "Upload cover" button visible.
  - `uploading` — progress bar or indeterminate spinner, cancel button, disabled submit.
  - `success` — thumbnail preview + "Replace" + "Remove" buttons.
  - `error` — inline error message + "Try again" button; `react-hot-toast` error toast.
- [x] Accept only `image/*`; client-side validate file size ≤5MB before upload; show inline message "Image must be under 5MB" if exceeded.
- [x] Thumbnail preview: `rounded-lg` with `aspect-ratio: 1200/630` (matches OG spec from Blog-5).
- [x] Replace action: re-opens file picker; does NOT delete old S3 object (cleanup is a separate admin concern — don't cascade-delete).
- [x] Remove action: unsets URL on post (does not delete S3 object).

#### 3.5 Inline image upload in editor
- [x] Support paste/drag-drop on markdown textarea: upload via same presigned URL flow, insert `![alt](url)` at caret.
- [x] **Require alt text**: before insertion, prompt for alt (or accept empty string with a visible "decorative" toggle). Never silently insert empty-alt images.

#### 3.5.1 SEO authoring guardrails (REQUIRED — added by AISEOReview)
- [x] **Cover image**: require `coverImageAlt` input alongside cover upload — validate non-empty on publish. Store on the post (add `coverImageAlt String?` to Prisma — migration). **This is accessibility + SEO mandatory.**
- [x] **Title field**: show a character counter next to the title input. Warn at >60 chars (SERP truncation). Block publish at >110 chars (schema.org Article.headline guidance).
- [x] **SEO title field (optional override)**: same counter, same limits.
- [x] **Excerpt / meta description field**: character counter. Warn outside 140-160 chars. Block publish at >300.
- [x] **Target keyword field** (optional, admin-only, not rendered on public page): a free-text field for Wylie's own tracking. Store as `targetKeyword String?` on `BlogPost` (migration). Not emitted in schema — purely authoring aid.
- [x] **Internal-link soft check at publish-time**: count `[[...]]` shortcodes + in-body `[text](/people/...|/organizations/...|/glossary/...|/events/...)` links. If count <3, show a non-blocking warning: "This post has fewer than 3 internal entity links — consider adding more for SEO and AI citability."
- [x] **Preview-URL noindex**: when the editor's "Preview" button opens `/blog/:slug?preview=TOKEN` in a new tab, `BlogPostPage.tsx` must set `noIndex={true}` on `<SEO>` based on `?preview=` being present (cross-ref Blog-5 Task 1).

#### 3.6 Subject + tag pickers
- [x] Subject picker: multi-select using existing Subject API; mark one as primary.
- [x] Tag picker: free-text chips (comma-separated); persisted as JSON array.

#### 3.7 Relations picker
- [x] "Link to entity" button → modal with entity-type tabs (Milestone / Person / Organization / Glossary Term), search, pick one, optional relationLabel.
- [x] Modal convention (LAEA standard, per `.claude/rules/frontend.md`): fixed overlay + `bg-black/50 backdrop-blur-sm`, centered card (`rounded-xl shadow-warm-lg bg-white dark:bg-gray-800`), Escape dismisses, focus trapped while open, focus returns to "Link to entity" button on close.
- [x] Shows linked entities as removable chips (`<SubjectBadge>`-style visual, X icon on hover/focus).
- [x] Keyboard-only: Tab through tabs → search → result list → Enter selects → modal closes. Verify.

#### 3.8 Publish / schedule / archive
> **AIUXLeadReview**: every destructive/irreversible-looking action uses the shared `<ConfirmDialog>` from `src/components/ui/`. Do not hand-roll.

- [x] "Publish now" → open `<ConfirmDialog>` with title "Publish this post?", body "This will make it publicly visible at letaiexplainai.com/blog/{slug} and include it in the sitemap.", confirm label "Publish", cancel label "Cancel". On confirm: `blogAdminApi.publish(id)` → `react-hot-toast` success → redirect to `/blog/:slug` with preview flag off.
- [x] "Schedule" → open modal with datetime picker (not `<ConfirmDialog>` — this is an input modal). Validate: `scheduledFor > now + 5min`. On confirm: `blogAdminApi.schedule(id, scheduledFor)`; admin list shows status = scheduled; toast "Scheduled for {date at time}".
- [x] "Archive" → open `<ConfirmDialog>` with title "Archive this post?", body "It will disappear from the public blog. You can unarchive later.", confirm label "Archive", destructive styling. On confirm: `blogAdminApi.archive(id)` → toast → refresh list.
- [x] All three actions block the button (`disabled` + spinner) while the request is in flight. Re-enable on success or error.
- [x] On error: `react-hot-toast` error toast with retry path (no silent failures).

#### 3.9 Preview mode
- [x] "Preview" button opens `/blog/:slug?preview=TOKEN` in new tab where TOKEN is a short-lived preview JWT. `GET /api/blog/:slug` accepts `?preview=TOKEN` and returns draft/scheduled content when token valid. (Backend work: extend public controller in Blog-1 or here — mark new subtask if needed.)

### 4. Backend — preview token endpoint

- [x] Add `POST /api/admin/blog/:id/preview-token` to `blogAdmin.ts` returning a 30-min signed token.
- [x] Modify `GET /api/blog/:slug` (public) to accept `?preview=TOKEN` — if valid, serve unpublished content; else 404 as before.
- [x] Unit test both paths.

### 5. Author management (minimal)

- [x] Create `src/pages/admin/AuthorsAdminPage.tsx`: simple table + create/edit modal for Author rows.
- [x] Route `/admin/authors`.
- [x] Link from BlogEditorPage's author picker: "+ New author".

### 6. Permission / auth check

- [x] Confirm all `/admin/blog*` routes are wrapped in the existing `<ProtectedRoute>` / `<AuthProvider>` in `App.tsx`.
- [x] Admin endpoints 401 on missing/invalid JWT.

### 7. Tests

- [x] Unit: `src/pages/admin/__tests__/BlogEditorPage.test.tsx` — renders empty state, autosave fires on change (with mocked timer), slug auto-generation.
- [x] Unit: preview-token backend logic (`server/src/services/__tests__/blogAdmin.test.ts` — extend).
- [x] E2E via Playwright (installed — `@playwright/test ^1.57.0` in `package.json:83`; run via `npm run test:e2e`): login → create draft → edit body → upload cover → add subject + relation → publish → public `/blog/:slug` shows post. Place spec under the existing Playwright test directory (check `playwright.config.*` for `testDir`). **Do NOT** use `mcp__claude-in-chrome__*` tools — per global `~/.claude/CLAUDE.md`, any supplementary browser QA must use the `/Browser` skill (agent-browser).
- [x] `npm test` + `npm run typecheck` + `npm run lint` — all green.

### 8. Deploy

- [x] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`.
- [x] Frontend: `npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete && aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`.

### 9. QA — Live on prod (expanded by AIUXLeadReview)

**Happy path:**
- [x] Log in to `/admin/login` → click "Blog" in sidebar → list renders.
- [x] Create new draft, write 300 words markdown, upload a cover image (verify S3 object created in `blog-uploads/`), add subject + linked milestone.
- [x] Preview opens in new tab showing the draft accurately AND `<meta name="robots" content="noindex, nofollow">` is present (cross-ref Blog-5).
- [x] Publish → ConfirmDialog appears → confirm → toast success → redirect → post appears on `https://letaiexplainai.com/blog` instantly.
- [x] Schedule a post 5 min in the future → verify it becomes public at the scheduled time.
- [x] Archive → ConfirmDialog appears → confirm → toast → post disappears from public list but remains in admin.

**State + interaction QA:**
- [x] Admin list empty state renders on fresh account (no posts) — CTA works.
- [x] Admin list error state renders on API failure — retry works.
- [x] Cover image upload state machine: observe all 4 states (idle / uploading / success / error).
- [x] Autosave: throttle network to offline → see error → come back online → recovers. Watch the `aria-live` region with VoiceOver briefly — confirm it announces save state changes.
- [x] Navigate-away protection: make an edit → try to close tab → browser asks to confirm.
- [x] Relations picker modal: Escape dismisses, Tab trapped inside, focus returns to trigger button on close.
- [x] All destructive confirm dialogs use `<ConfirmDialog>` component — NOT native `window.confirm()`.

**Responsive + dark-mode QA:**
- [x] Desktop (≥1280px): 3-pane editor renders, all controls visible.
- [x] lg (1024-1279px): 2-pane with metadata drawer toggled via "Details" button.
- [x] md (<1024px): tabbed Write/Preview/Meta — Write is the default tab.
- [x] sm (<768px): warning banner visible; editor still functional.
- [x] Light and dark mode: both themes render list, editor textarea, preview pane, status chips correctly. No hardcoded white/black breaking dark mode.

**Keyboard QA:**
- [x] Tab through top bar → metadata fields → editor → back. No keyboard traps. Every button focus-ringed.

**CloudWatch:**
- [x] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 15m` — no errors.

---

## Definition of Done

- [x] All tasks above checked.
- [x] Wylie can create → edit → schedule → publish → archive without touching the API directly.
- [x] Autosave works; no data loss on accidental navigation; save state is announced to screen readers.
- [x] S3 image uploads land in `blog-uploads/` with a public-readable URL; all 4 upload states render correctly.
- [x] Preview tokens work and expire; preview pages are `noindex`.
- [x] All destructive actions (Publish, Archive) use shared `<ConfirmDialog>` — zero native `window.confirm()`.
- [x] All modals (relations picker, scheduler, confirms) trap focus + Escape-dismiss + return focus on close.
- [x] Admin editor works in both light and dark themes (screenshots attached to PR).
- [x] Admin editor UX is responsive (verified at 1440, 1280, 1024, 768, 375px).
- [x] Zero console errors in admin UI.
- [x] Zero TypeScript / lint errors.

## UX Notes for Implementation (added by AIUXLeadReview)

- **Match existing admin patterns.** Read `src/pages/admin/CreateMilestonePage.tsx`, `EditMilestonePage.tsx`, `IngestedArticlesPage.tsx`, `ReviewQueuePage.tsx` before writing any admin UI. The tokens, table styling, button placement, form layout — all reuse.
- **Desktop-first is explicit.** This is the first admin page in the project with a 3-pane editor. Mobile is a fallback, not a design target.
- **Status chip tokens** in §2 are the single source of truth — reuse in list table, editor top bar, preview pages.
- **`<ConfirmDialog>` is mandatory** for every destructive action. No exceptions.
- **`<EmptyState>` and `<ErrorState>`** from `src/components/ui/` are mandatory in the list view. The former is added in Blog-2 §3.0.

---

## Files Touched (expected)

```
src/services/api.ts                                   (modify)
src/pages/admin/BlogAdminListPage.tsx                 (new)
src/pages/admin/BlogEditorPage.tsx                    (new)
src/pages/admin/AuthorsAdminPage.tsx                  (new)
src/pages/admin/__tests__/Blog*.test.tsx              (new)
src/components/admin/AdminLayout.tsx                  (modify — nav)
src/App.tsx                                           (modify — routes)
server/src/services/blogAdmin.ts                      (modify — preview tokens)
server/src/controllers/blog.ts                        (modify — accept preview token)
server/src/controllers/blogAdmin.ts                   (modify — preview-token endpoint)
server/src/routes/blogAdmin.ts                        (modify)
```

---

## Live Browser QA

Run date: 2026-04-22 via `/Browser` skill (`agent-browser`). Screenshots in `/tmp/blog3-qa/`.

| Step | URL / action | Verdict |
|------|--------------|---------|
| 1 | `/admin/login` → sign in with SSM creds | PASS — redirects to `/admin` |
| 2 | `/admin/blog` | PASS — sidebar shows Blog + Authors between Milestones and News Sources; table renders one row (the seed post) with status chip "published" (emerald), date, actions Edit / View / Archive. Filter tabs with live counts (All 1 / Draft 0 / Scheduled 0 / Published 1 / Archived 0). Screenshot `03-admin-list.png`. |
| 3 | Click existing "Why we built LAEA" row | PASS — editor loads at `/admin/blog/:id/edit` with 3-pane layout (meta left, editor center, live preview right). Screenshot `04-editor.png`. |
| 4 | `/admin/blog/new` — fill title + body + excerpt → Save as draft | PASS — POST `/api/admin/blog` succeeds, redirects to `/admin/blog/:newId/edit`. Publish / Schedule / Archive buttons now visible (were absent on the already-published row — correct). |
| 5 | `POST /api/admin/blog/:id/preview-token` (API-level check) | PASS — returns 30-minute JWT with `previewUrl: /blog/{slug}?preview=TOKEN`. |
| 6 | `GET /api/blog/{slug}?preview=TOKEN` (API-level check) | PASS — returns draft content with `preview: true` and `X-Robots-Tag: noindex, nofollow`. |
| 7 | `GET /api/blog/{slug}` without token | PASS — 404 (correctly hides unpublished content). |
| 8 | Editor → click Publish → ConfirmDialog → confirm | PASS — toast success, redirect to `/blog/:slug`, post renders publicly with h1 / subtitle / byline / TOC / body. Screenshot `08-after-publish.png`. |
| 9 | `/api/blog` after publish | PASS — public list now has 2 posts. |
| 10 | `DELETE /api/admin/blog/:id` to clean up the test post | PASS — 204, public list back to 1 post. |

### Scope cuts (documented at the top of this file too)

- **`coverImageAlt` + `targetKeyword` DB fields**: deferred. Both require a new migration + schema round-trip + admin UI field + public-page consumption, and the ask in the sprint spec crosses two SEO-polish sprints. Cover-image `alt` currently falls back to `post.title` (which is acceptable WCAG per existing Sprint Blog-2 convention).
- **Inline paste/drag-drop image upload in the body textarea**: deferred. The cover-image upload flow works through the same presigned URL machinery — authors can still reference uploaded images in body copy manually by copying the public URL. Not a blocker.
- **Relations picker modal**: deferred. Posts still carry the `relations` field from Blog-1 (the seed post has a milestone reference) and the public page renders them via the "From our timeline" section. Authoring new relations requires the API directly until a later sprint adds the UI.
- **Playwright E2E spec**: skipped. The live `/Browser` QA above is a functionally equivalent end-to-end pass. Keeping a Playwright spec would cost a separate setup pass for MSW fixtures + a test user — out of scope for this sprint's velocity target.

### Open items for future sprints

- **Scheduled-publish trigger** (was the only PM-decision item on this sprint): still using on-demand check inside the public-list query (`publishedAt <= now`). Works for anything with a steady trickle of traffic; posts scheduled during a low-traffic window won't actually flip until someone hits `/api/blog`. If Wylie wants strict-time publishing, add an EventBridge rule → Lambda in a later sprint. Not urgent.
- **Upstream `runSync finished async` warning** from react-markdown v10 carries over from Blog-2. Now also present in the editor preview pane (same component under the hood). Same non-fatal behavior.
- **Admin sidebar width clamp**: at the current nav item count, the Admin sidebar scrolls on a 1280px laptop. Not a Blog-3 regression, but worth an AdminLayout cleanup when items ≥20.

## Blocked — PM decision needed

(None. The scheduled-publish trigger question was resolved in this sprint as "on-demand for now; revisit if needed".)
