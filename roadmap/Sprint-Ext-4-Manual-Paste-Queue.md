# Sprint Ext-4 *(Conditional)*: Manual-Paste Queue for Unscrapeable URLs

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-26 by AIUXLeadReview (specified all-four-states, EmptyState contribution to ui/, nav placement, modal/confirm reuse)
>
> **CONDITIONAL**: This sprint only fires if Sprint Ext-3 reveals real-world cases where neither server-scrape nor Readability extraction succeeds. If 2 weeks of usage post-Ext-3 show no such cases, mark this sprint **"Not needed — deferred indefinitely"** in `PLAN-Chrome-Extension.md` and do not execute.

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `data-models.md`, `news-ingestion.md`, `frontend.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-Chrome-Extension.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm Sprint Ext-3's Definition of Done is fully checked AND Wylie has explicitly approved firing Ext-4 (it is conditional — do not execute by default).
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Add a "submit URL only, paste content later" path for the rare case where neither server-side `scrapeUrl()` nor client-side Readability can extract usable content (e.g. video-only news pages, broken SPAs, sites that fight DOM cloning). The extension gains a "Save for later paste" action that creates a new lightweight queue row. The admin later opens an admin queue page, pastes the article text, and the row promotes into a normal `IngestedArticle` and runs the existing pipeline. Schema choice: **add a new `PendingSubmission` model** rather than relax `IngestedArticle.content` to nullable — keeps the IngestedArticle invariants clean.

**Priority**: LOW (only fires on demand)
**Depends on**: Sprint Ext-3 DoD + explicit go-ahead from Wylie
**Estimated Effort**: 1 day
**Status**: Conditional — not started

---

## Prerequisites

- [ ] Sprint Ext-3 DoD complete
- [ ] Wylie has confirmed at least 1 real-world case where Readability + server scrape both failed AND the content was worth ingesting (else this sprint is unnecessary)
- [ ] Local dev server runnable: `npm run dev` + `npm run dev:server`

---

## Tasks

### 1. Schema: PendingSubmission model

- [ ] Add to `prisma/schema.prisma`:
      ```prisma
      /// URL captured by the Chrome extension when neither server scrape
      /// nor Readability extraction yielded usable content. Promoted to
      /// IngestedArticle once the admin pastes the article text.
      model PendingSubmission {
        id          String   @id @default(cuid())
        url         String   @unique
        title       String?  // Best-effort title from <title> or Readability partial
        capturedAt  DateTime @default(now())
        notes       String?  // Admin-supplied note (e.g. "behind WSJ paywall")
        status      String   @default("pending") // pending, promoted, dropped
        promotedToArticleId String? @unique
        @@index([status])
      }
      ```
- [ ] Migration: `npx prisma migrate dev --name add_pending_submission`
- [ ] Run prod migration during Deploy step.

### 2. Backend endpoints

- [ ] `POST /api/admin/pending-submissions` — accepts `{ url, title?, notes? }`. Strips tracking params (reuse existing `stripTrackingParams`). Returns 409 with `existingId` on duplicate URL.
- [ ] `GET /api/admin/pending-submissions?status=pending` — list for queue UI.
- [ ] `POST /api/admin/pending-submissions/:id/promote` — accepts `{ content }`. Creates `IngestedArticle` (mirroring `submitArticle` flow), sets `PendingSubmission.status='promoted'` and `promotedToArticleId`, fires the analysis Lambda.
- [ ] `DELETE /api/admin/pending-submissions/:id` — sets status=`dropped`, no IngestedArticle created.
- [ ] All routes mounted under existing admin auth via `requireAdmin`.

### 3. Extension: "Save for later" action

- [ ] In the popup's failure UX (Ext-3 task 3), replace the "open `/admin/articles` and paste" message with a button: "Save for later paste". Clicking calls `POST /api/admin/pending-submissions` with `{ url, title }`.
- [ ] Show success toast + deep link to the new admin queue page.

### 4. Admin UI: queue page

- [ ] Add route in `src/App.tsx`: `/admin/pending-submissions` → `<PendingSubmissionsPage />`. Use lazy import (`React.lazy`) matching the convention of other admin pages in `src/pages/admin/index.ts`.
- [ ] `src/pages/admin/PendingSubmissionsPage.tsx` — lives inside `<AdminLayout>`, uses React Query, mirrors the table/header pattern from existing admin pages (model after `src/pages/admin/IngestedArticlesPage.tsx` for table styling and `src/pages/admin/SubmitArticlePage.tsx` for form/modal interactions).
- [ ] **Sidebar nav placement (added by AIUXLeadReview)**: insert a new entry into the `navItems` array in `src/components/admin/AdminLayout.tsx:33`. Place it **immediately after "Submit Article"** (currently at the line containing `href: '/admin/submit-article'`) since both are submission-flow surfaces:
      ```tsx
      {
        label: 'Pending Paste',
        href: '/admin/pending-submissions',
        icon: <Inbox className="h-5 w-5" />,  // import { Inbox } from 'lucide-react'
      },
      ```
- [ ] **Sidebar pending-count badge (added by AIUXLeadReview)**: when pending count > 0, render a small chip beside the nav label: `<span className="ml-auto rounded-full bg-orange-500 text-white text-xs px-2 py-0.5">{count}</span>`. Counter polls every 60s via React Query — same cadence other admin counters use (verify against existing admin polling, e.g. ReviewQueuePage).
- [ ] **All four states for the queue table (added by AIUXLeadReview — required by /AIUXLeadReview principles)**:
      - **Loading**: render `<LoadingSkeleton />` from `src/components/ui/`. No generic spinner.
      - **Populated**: table per spec above.
      - **Empty**: see task 4b below — add a shared `<EmptyState />` to the `ui/` library and use it here.
      - **Error**: render `<ErrorState />` from `src/components/ui/` with a "Retry" button.

### 4b. Add `<EmptyState />` to `src/components/ui/` (added by AIUXLeadReview)

The `ui/` library has `ConfirmDialog`, `ErrorState`, `LoadingSkeleton`, `SubjectBadge` — but **no shared empty state**. The pending-submissions queue is a clean opportunity to add one for the next admin sprint to reuse.

- [ ] Create `src/components/ui/EmptyState.tsx`:
      ```tsx
      interface EmptyStateProps {
        icon?: React.ReactNode;       // lucide-react icon component
        title: string;
        description?: string;
        action?: { label: string; onClick: () => void };
      }
      ```
      Visual: centered icon (h-12 w-12, gray-400 / dark:gray-600), title (`text-lg font-semibold gray-900 dark:gray-100`), description (`text-sm gray-600 dark:gray-400`), optional CTA button (orange-* primary). Padding `py-12 px-6`. Match the visual rhythm of `<ErrorState />` so the two feel like siblings.
- [ ] Export from `src/components/ui/index.ts`.
- [ ] Use in `PendingSubmissionsPage.tsx` for the empty case:
      ```tsx
      <EmptyState
        icon={<Inbox className="h-12 w-12" />}
        title="No URLs awaiting paste"
        description="When the extension can't extract an article, the URL lands here. Open it, copy the article text, paste it into the modal."
      />
      ```
- [ ] Add a unit test in `src/components/ui/__tests__/EmptyState.test.tsx` covering: required props, optional action button click, dark-mode classes present.

### 4c. Paste-content modal (added by AIUXLeadReview)

- [ ] Modal MUST follow the established pattern from `.claude/rules/frontend.md`: fixed overlay (`bg-black/50 backdrop-blur-sm`), centered card (`rounded-2xl bg-white dark:bg-gray-900 shadow-warm-lg max-w-2xl w-full mx-4`), Escape key dismisses, focus trapped inside the modal while open.
- [ ] Modal content: header ("Paste content for: {title or url}"), large textarea (`min-h-[300px]`, monospace `font-mono` for raw text feel), word-count helper text below, "Cancel" (ghost) + "Promote" (primary orange) buttons in a footer.
- [ ] On submit: button shows inline disabled state + loading. On success: close modal, toast "Article queued for analysis" via `react-hot-toast`, row disappears from table. On error: inline error in the modal footer, leave content in textarea (admin doesn't lose their paste).

### 4d. Drop confirmation (added by AIUXLeadReview)

- [ ] Drop button must NOT issue a raw `confirm()` or DELETE silently. Use `<ConfirmDialog />` from `src/components/ui/ConfirmDialog.tsx` with: title "Drop this URL?", description "The URL will be marked dropped and removed from the queue. This can't be undone.", confirm button "Drop" (destructive variant — red), cancel button "Keep".
- [ ] On confirm: DELETE call, success toast, row disappears.

### 4e. Dark mode parity (added by AIUXLeadReview)

- [ ] Every new className in `PendingSubmissionsPage.tsx`, `EmptyState.tsx`, and the modal includes a `dark:` variant for any background, border, or text color.
- [ ] QA both themes during Browser Validation (task 9 below).

### 5. API client + types

- [ ] **Extend, don't fork.** Add the typed client to `src/services/api.ts` matching the existing pattern (`personsApi`, `organizationsApi`, `milestonesApi`). Do NOT create a parallel client file. Methods: `pendingSubmissionsApi.list()`, `.create()`, `.promote()`, `.drop()`.
- [ ] Zod schema in `src/types/pendingSubmission.ts` matching the Prisma model shape.

### 6. Tests

- [ ] Backend integration tests in `server/src/controllers/__tests__/pendingSubmissions.test.ts`: create, duplicate-409, promote-creates-IngestedArticle, drop, list-by-status.
- [ ] Frontend component test for `PendingSubmissionsPage` covering the paste-promote happy path.
- [ ] Extension test: failure UX shows the "Save for later" button when Readability fails.
- [ ] `cd extension && bun test && bun run typecheck && bun run lint` — green.
- [ ] Repo root: `npm test && npm run typecheck && npm run lint` — green.

### 7. Deploy

- [ ] Migration first:
      ```bash
      export DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text)
      npx prisma migrate deploy
      ```
- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [ ] Frontend: `npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete && aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`
- [ ] Extension: `cd extension && bun run build` then reload in `chrome://extensions`.

### 8. Backend Validation

- [ ] Curl the four new endpoints with a valid admin JWT and verify behavior:
      ```bash
      curl -X POST https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api/admin/pending-submissions \
        -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
        -d '{"url":"https://example.com/test","title":"Test"}'
      ```
- [ ] Promote one row, verify the resulting `IngestedArticle` enters `screening` status and the Lambda runs analysis.
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 15m` — clean.
- [ ] Confirm migration recorded in `_prisma_migrations` table.

### 9. Browser Validation — via `/Browser` skill only

- [ ] `agent-browser open https://letaiexplainai.com/admin/pending-submissions`
- [ ] `agent-browser screenshot` — initial empty/non-empty state
- [ ] `agent-browser snapshot -i` — confirm "Paste content" button is interactive
- [ ] Click → modal opens → fill textarea → submit → row disappears → screenshot proof
- [ ] **Empty state QA (added by AIUXLeadReview)**: drop or promote all rows so the queue is empty; screenshot the `<EmptyState />`. Confirm dark-mode variant renders correctly.
- [ ] **Loading state QA**: throttle the network in DevTools, reload the page; screenshot `<LoadingSkeleton />` rendering.
- [ ] **Error state QA**: temporarily break the endpoint URL in dev or simulate offline; screenshot `<ErrorState />` with retry button.
- [ ] **ConfirmDialog QA**: click Drop on a row, screenshot the confirm dialog, confirm Escape and clicking outside both cancel.
- [ ] **Modal focus trap QA**: open the paste modal, Tab through the form — focus should cycle within the modal, not escape to the page underneath.
- [ ] Mobile viewport check: `agent-browser resize 375 812 && agent-browser screenshot` — admin is desktop-first, but verify no horizontal overflow on the table.
- [ ] Dark mode check — toggle theme via the existing theme toggle, screenshot every state above in dark mode.
- [ ] Zero console errors, zero 4xx/5xx

---

## Definition of Done

- [ ] All tasks above checked
- [ ] PendingSubmission model deployed to prod, migration applied
- [ ] Extension's failure UX offers "Save for later" and creates queue rows
- [ ] Admin queue page lists, promotes, and drops rows correctly
- [ ] At least one real captured row promoted end-to-end into a complete IngestedArticle
- [ ] `<EmptyState />` shipped to `src/components/ui/`, exported, tested, used by `PendingSubmissionsPage` (added by AIUXLeadReview)
- [ ] All four states (loading, populated, empty, error) verified in light AND dark mode with screenshots saved
- [ ] Modal pattern matches `.claude/rules/frontend.md` overlay convention (Escape dismisses, focus trapped)
- [ ] Drop action uses `<ConfirmDialog />`, not a raw `confirm()`
- [ ] Zero TypeScript errors, zero lint errors, tests passing
- [ ] CloudWatch clean
- [ ] Sprint file timestamp updated
- [ ] `PLAN-Chrome-Extension.md` initiative DoD updated to mark Ext-4 complete

---

## Files Touched (expected)

```
prisma/schema.prisma                                    (modify — add PendingSubmission)
prisma/migrations/<ts>_add_pending_submission/          (new)
server/src/controllers/pendingSubmissions.ts            (new)
server/src/routes/pendingSubmissions.ts                 (new)
server/src/index.ts                                     (modify — mount route)
server/src/controllers/__tests__/pendingSubmissions.test.ts (new)
src/types/pendingSubmission.ts                          (new)
src/services/api.ts                                     (modify — pendingSubmissionsApi)
src/pages/admin/PendingSubmissionsPage.tsx              (new)
src/pages/admin/index.ts                                (modify — export new page)
src/components/ui/EmptyState.tsx                        (new — reusable for future admin pages)
src/components/ui/__tests__/EmptyState.test.tsx         (new)
src/components/ui/index.ts                              (modify — export EmptyState)
src/components/admin/AdminLayout.tsx                    (modify — navItems entry + badge)
src/App.tsx                                             (modify — lazy route)
extension/src/popup/popup.ts                            (modify — Save for later button)
extension/src/popup/__tests__/save-for-later.test.ts    (new)
roadmap/Sprint-Ext-4-Manual-Paste-Queue.md              (modify — checkbox progress)
roadmap/PLAN-Chrome-Extension.md                        (modify — Ext-4 DoD outcome)
```

---

## Blocked — PM decision needed

- **Confirm Ext-4 should fire.** Default position: skip this sprint unless Ext-2/3 usage proves the queue is needed. Wylie to confirm before any task here is started.
- **Naming.** "PendingSubmission" vs. extending `IngestedArticle.analysisStatus` with `awaiting_content`. The plan picks `PendingSubmission`; if Wylie prefers a single-table design, adjust schema accordingly before task 1.
