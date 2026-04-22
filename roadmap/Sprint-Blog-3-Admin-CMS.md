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
**Status**: Not started

---

## Prerequisites

- [ ] Blog-1 + Blog-2 DoDs complete, live on prod.
- [ ] Admin JWT auth flow working: `POST /api/auth/login` returns token; existing `/admin` pages reachable.
- [ ] Review `src/components/admin/AdminLayout.tsx` nav structure.

---

## Tasks

### 1. API client (admin)

- [ ] Extend `src/services/api.ts` with `blogAdminApi`:
  - `list({ status?, q?, authorId? })`
  - `get(id)`
  - `create(input)`
  - `update(id, patch)`
  - `publish(id)` / `schedule(id, scheduledFor)` / `archive(id)`
  - `getUploadUrl({ filename, contentType })`
  - `authors.list() / create(input) / update(id, patch)`
- [ ] All methods attach `Authorization: Bearer ${token}` via existing admin auth context.

### 2. Admin list page

- [ ] Create `src/pages/admin/BlogAdminListPage.tsx`:
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
- [ ] Loading: `<LoadingSkeleton>` table skeleton (reuse existing `src/components/ui/LoadingSkeleton.tsx`).
- [ ] Populated: table.
- [ ] Empty (no posts ever): `<EmptyState>` with icon, title "No blog posts yet", description, CTA button "Create your first post" → `/admin/blog/new`.
- [ ] Empty (zero match filter): `<EmptyState>` with title "No posts match", CTA "Clear filters".
- [ ] Error: `<ErrorState>` with retry.

- [ ] Add route in `src/App.tsx` under `/admin`:
  ```tsx
  <Route path="blog" element={<BlogAdminListPage />} />
  <Route path="blog/new" element={<BlogEditorPage mode="new" />} />
  <Route path="blog/:id/edit" element={<BlogEditorPage mode="edit" />} />
  ```
- [ ] Add "Blog" nav link in `src/components/admin/AdminLayout.tsx` — placement: between "Milestones" and "News Sources" (group content-authoring items together).

### 3. Editor page

#### 3.1 Layout
- [ ] Create `src/pages/admin/BlogEditorPage.tsx`:
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
- [ ] Debounce field changes at 1000ms; call `blogAdminApi.update` in background.
- [ ] Status indicator: "Saving…" → "Saved ✓ 12s ago" — updates every 10s.
- [ ] Wrap the indicator in `<span role="status" aria-live="polite" aria-atomic="true">` so screen readers announce save state changes without being chatty.
- [ ] On autosave failure: show inline error "Couldn't save — changes preserved locally. Retry" + retry button. Surface a `react-hot-toast` error toast too.
- [ ] Warn on navigate-away with unsaved changes (React Router `useBlocker`) — use the browser's beforeunload for hard reloads.
- [ ] Test: throttle network to offline → autosave fails → error visible → come back online → next debounce cycle succeeds → indicator clears.

#### 3.3 Slug logic
- [ ] Slug field auto-generates from title on blur (kebab-case), editable, validates uniqueness via `GET /api/admin/blog?slug=`.

#### 3.4 Cover image upload
- [ ] "Upload cover" button → calls `blogAdminApi.getUploadUrl({ filename, contentType })` → PUTs file to S3 presigned URL → saves the public URL onto the post.
- [ ] **Upload state machine (EXPLICIT)**:
  - `idle` — "Upload cover" button visible.
  - `uploading` — progress bar or indeterminate spinner, cancel button, disabled submit.
  - `success` — thumbnail preview + "Replace" + "Remove" buttons.
  - `error` — inline error message + "Try again" button; `react-hot-toast` error toast.
- [ ] Accept only `image/*`; client-side validate file size ≤5MB before upload; show inline message "Image must be under 5MB" if exceeded.
- [ ] Thumbnail preview: `rounded-lg` with `aspect-ratio: 1200/630` (matches OG spec from Blog-5).
- [ ] Replace action: re-opens file picker; does NOT delete old S3 object (cleanup is a separate admin concern — don't cascade-delete).
- [ ] Remove action: unsets URL on post (does not delete S3 object).

#### 3.5 Inline image upload in editor
- [ ] Support paste/drag-drop on markdown textarea: upload via same presigned URL flow, insert `![alt](url)` at caret.
- [ ] **Require alt text**: before insertion, prompt for alt (or accept empty string with a visible "decorative" toggle). Never silently insert empty-alt images.

#### 3.5.1 SEO authoring guardrails (REQUIRED — added by AISEOReview)
- [ ] **Cover image**: require `coverImageAlt` input alongside cover upload — validate non-empty on publish. Store on the post (add `coverImageAlt String?` to Prisma — migration). **This is accessibility + SEO mandatory.**
- [ ] **Title field**: show a character counter next to the title input. Warn at >60 chars (SERP truncation). Block publish at >110 chars (schema.org Article.headline guidance).
- [ ] **SEO title field (optional override)**: same counter, same limits.
- [ ] **Excerpt / meta description field**: character counter. Warn outside 140-160 chars. Block publish at >300.
- [ ] **Target keyword field** (optional, admin-only, not rendered on public page): a free-text field for Wylie's own tracking. Store as `targetKeyword String?` on `BlogPost` (migration). Not emitted in schema — purely authoring aid.
- [ ] **Internal-link soft check at publish-time**: count `[[...]]` shortcodes + in-body `[text](/people/...|/organizations/...|/glossary/...|/events/...)` links. If count <3, show a non-blocking warning: "This post has fewer than 3 internal entity links — consider adding more for SEO and AI citability."
- [ ] **Preview-URL noindex**: when the editor's "Preview" button opens `/blog/:slug?preview=TOKEN` in a new tab, `BlogPostPage.tsx` must set `noIndex={true}` on `<SEO>` based on `?preview=` being present (cross-ref Blog-5 Task 1).

#### 3.6 Subject + tag pickers
- [ ] Subject picker: multi-select using existing Subject API; mark one as primary.
- [ ] Tag picker: free-text chips (comma-separated); persisted as JSON array.

#### 3.7 Relations picker
- [ ] "Link to entity" button → modal with entity-type tabs (Milestone / Person / Organization / Glossary Term), search, pick one, optional relationLabel.
- [ ] Modal convention (LAEA standard, per `.claude/rules/frontend.md`): fixed overlay + `bg-black/50 backdrop-blur-sm`, centered card (`rounded-xl shadow-warm-lg bg-white dark:bg-gray-800`), Escape dismisses, focus trapped while open, focus returns to "Link to entity" button on close.
- [ ] Shows linked entities as removable chips (`<SubjectBadge>`-style visual, X icon on hover/focus).
- [ ] Keyboard-only: Tab through tabs → search → result list → Enter selects → modal closes. Verify.

#### 3.8 Publish / schedule / archive
> **AIUXLeadReview**: every destructive/irreversible-looking action uses the shared `<ConfirmDialog>` from `src/components/ui/`. Do not hand-roll.

- [ ] "Publish now" → open `<ConfirmDialog>` with title "Publish this post?", body "This will make it publicly visible at letaiexplainai.com/blog/{slug} and include it in the sitemap.", confirm label "Publish", cancel label "Cancel". On confirm: `blogAdminApi.publish(id)` → `react-hot-toast` success → redirect to `/blog/:slug` with preview flag off.
- [ ] "Schedule" → open modal with datetime picker (not `<ConfirmDialog>` — this is an input modal). Validate: `scheduledFor > now + 5min`. On confirm: `blogAdminApi.schedule(id, scheduledFor)`; admin list shows status = scheduled; toast "Scheduled for {date at time}".
- [ ] "Archive" → open `<ConfirmDialog>` with title "Archive this post?", body "It will disappear from the public blog. You can unarchive later.", confirm label "Archive", destructive styling. On confirm: `blogAdminApi.archive(id)` → toast → refresh list.
- [ ] All three actions block the button (`disabled` + spinner) while the request is in flight. Re-enable on success or error.
- [ ] On error: `react-hot-toast` error toast with retry path (no silent failures).

#### 3.9 Preview mode
- [ ] "Preview" button opens `/blog/:slug?preview=TOKEN` in new tab where TOKEN is a short-lived preview JWT. `GET /api/blog/:slug` accepts `?preview=TOKEN` and returns draft/scheduled content when token valid. (Backend work: extend public controller in Blog-1 or here — mark new subtask if needed.)

### 4. Backend — preview token endpoint

- [ ] Add `POST /api/admin/blog/:id/preview-token` to `blogAdmin.ts` returning a 30-min signed token.
- [ ] Modify `GET /api/blog/:slug` (public) to accept `?preview=TOKEN` — if valid, serve unpublished content; else 404 as before.
- [ ] Unit test both paths.

### 5. Author management (minimal)

- [ ] Create `src/pages/admin/AuthorsAdminPage.tsx`: simple table + create/edit modal for Author rows.
- [ ] Route `/admin/authors`.
- [ ] Link from BlogEditorPage's author picker: "+ New author".

### 6. Permission / auth check

- [ ] Confirm all `/admin/blog*` routes are wrapped in the existing `<ProtectedRoute>` / `<AuthProvider>` in `App.tsx`.
- [ ] Admin endpoints 401 on missing/invalid JWT.

### 7. Tests

- [ ] Unit: `src/pages/admin/__tests__/BlogEditorPage.test.tsx` — renders empty state, autosave fires on change (with mocked timer), slug auto-generation.
- [ ] Unit: preview-token backend logic (`server/src/services/__tests__/blogAdmin.test.ts` — extend).
- [ ] E2E via Playwright (installed — `@playwright/test ^1.57.0` in `package.json:83`; run via `npm run test:e2e`): login → create draft → edit body → upload cover → add subject + relation → publish → public `/blog/:slug` shows post. Place spec under the existing Playwright test directory (check `playwright.config.*` for `testDir`). **Do NOT** use `mcp__claude-in-chrome__*` tools — per global `~/.claude/CLAUDE.md`, any supplementary browser QA must use the `/Browser` skill (agent-browser).
- [ ] `npm test` + `npm run typecheck` + `npm run lint` — all green.

### 8. Deploy

- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`.
- [ ] Frontend: `npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete && aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`.

### 9. QA — Live on prod (expanded by AIUXLeadReview)

**Happy path:**
- [ ] Log in to `/admin/login` → click "Blog" in sidebar → list renders.
- [ ] Create new draft, write 300 words markdown, upload a cover image (verify S3 object created in `blog-uploads/`), add subject + linked milestone.
- [ ] Preview opens in new tab showing the draft accurately AND `<meta name="robots" content="noindex, nofollow">` is present (cross-ref Blog-5).
- [ ] Publish → ConfirmDialog appears → confirm → toast success → redirect → post appears on `https://letaiexplainai.com/blog` instantly.
- [ ] Schedule a post 5 min in the future → verify it becomes public at the scheduled time.
- [ ] Archive → ConfirmDialog appears → confirm → toast → post disappears from public list but remains in admin.

**State + interaction QA:**
- [ ] Admin list empty state renders on fresh account (no posts) — CTA works.
- [ ] Admin list error state renders on API failure — retry works.
- [ ] Cover image upload state machine: observe all 4 states (idle / uploading / success / error).
- [ ] Autosave: throttle network to offline → see error → come back online → recovers. Watch the `aria-live` region with VoiceOver briefly — confirm it announces save state changes.
- [ ] Navigate-away protection: make an edit → try to close tab → browser asks to confirm.
- [ ] Relations picker modal: Escape dismisses, Tab trapped inside, focus returns to trigger button on close.
- [ ] All destructive confirm dialogs use `<ConfirmDialog>` component — NOT native `window.confirm()`.

**Responsive + dark-mode QA:**
- [ ] Desktop (≥1280px): 3-pane editor renders, all controls visible.
- [ ] lg (1024-1279px): 2-pane with metadata drawer toggled via "Details" button.
- [ ] md (<1024px): tabbed Write/Preview/Meta — Write is the default tab.
- [ ] sm (<768px): warning banner visible; editor still functional.
- [ ] Light and dark mode: both themes render list, editor textarea, preview pane, status chips correctly. No hardcoded white/black breaking dark mode.

**Keyboard QA:**
- [ ] Tab through top bar → metadata fields → editor → back. No keyboard traps. Every button focus-ringed.

**CloudWatch:**
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 15m` — no errors.

---

## Definition of Done

- [ ] All tasks above checked.
- [ ] Wylie can create → edit → schedule → publish → archive without touching the API directly.
- [ ] Autosave works; no data loss on accidental navigation; save state is announced to screen readers.
- [ ] S3 image uploads land in `blog-uploads/` with a public-readable URL; all 4 upload states render correctly.
- [ ] Preview tokens work and expire; preview pages are `noindex`.
- [ ] All destructive actions (Publish, Archive) use shared `<ConfirmDialog>` — zero native `window.confirm()`.
- [ ] All modals (relations picker, scheduler, confirms) trap focus + Escape-dismiss + return focus on close.
- [ ] Admin editor works in both light and dark themes (screenshots attached to PR).
- [ ] Admin editor UX is responsive (verified at 1440, 1280, 1024, 768, 375px).
- [ ] Zero console errors in admin UI.
- [ ] Zero TypeScript / lint errors.

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

## Blocked — PM decision needed

- [ ] **Scheduled-publish trigger**: cron-driven worker (EventBridge → Lambda) vs on-demand check inside the public list endpoint? On-demand is zero-infra but subtly inaccurate for scheduled times under low traffic. Default plan: on-demand check. **Flag for Wylie if we want a scheduled worker instead.**
