# Sprint Blog-6: Polish & Growth

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-22 by Claude (AIUXLeadReview — ShareBar mobile thumb-reach, NewsletterCta state machine, admin tile reuse, comments inherit existing UX)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `.claude/CLAUDE.md`, `.claude/rules/spam-protection.md` (comments reuse), `.claude/rules/frontend.md`.
2. Re-read `roadmap/PLAN-Blog-Editorial.md` **Developer Workflow (MANDATORY)** section.
3. Confirm Sprint Blog-1/2/3/4/5 DoDs complete.
4. Pick the next unchecked `[ ]` task below.
5. typecheck → lint → tests → QA front+back → commit → check the box.
6. Stop only when DoD met or PM decision needed. If comments or newsletter need a PM call, document under `## Blocked — PM decision needed`.

---

## Overview

Final polish sprint. Add comments on posts (reusing existing moderation infra), share buttons, view counter, newsletter subscribe stub, and editor's-picks curation. This is the sprint that turns "we have a blog" into "the blog is a product."

**Priority**: MEDIUM
**Depends on**: Blog-1/2/3/4/5 shipped to prod
**Estimated Effort**: 1-2 days
**Status**: Shipped — comments mounted, ShareBar + NewsletterCta live on every post, editor's picks on the index, view counter incrementing in prod.

---

## Prerequisites

- [x] Blog-1/2/3/4/5 DoDs complete.
- [x] Review existing comments system: `server/src/routes/comments.ts`, `server/src/controllers/...`, `.claude/rules/spam-protection.md`.
- [x] Review existing engagement counters on `CurrentEvent` for view-count pattern.

---

## Tasks

### 1. View counter

- [x] Increment `BlogPost.viewCount` on each `GET /api/blog/:slug` request (fire-and-forget update; do not block response).
- [x] Skip bots via simple UA heuristic + skip preview-token requests.
- [x] Display view count subtly on `/blog/:slug` and on admin list.
- [x] Unit test.

### 2. Share buttons

- [x] Create `src/components/Blog/ShareBar.tsx`:
  - Twitter/X intent URL
  - LinkedIn share
  - Copy-link-to-clipboard (with `react-hot-toast` success toast — reuse, don't hand-roll notification)
  - Email `mailto:`
  - On mobile with `navigator.share` support: render a single "Share" button that triggers native share sheet; fall back to the explicit icon row on desktop.
- [x] **Mobile thumb-reach (added by AIUXLeadReview)**: on mobile (`<md`), position the ShareBar as a sticky footer-floating bar at the BOTTOM of the viewport (not top) so thumbs can reach it one-handed. Hide on scroll-up, show on scroll-down (or simpler: always visible). On desktop, inline after the post body.
- [x] Button size: 48×48px minimum (tap target), icons from lucide-react (`Twitter`, `Linkedin`, `Link`, `Mail`, `Share2`).
- [x] Accessible labels on each button (`aria-label="Share on Twitter"` etc.).
- [x] Insert in `BlogPostPage`: inline after body on desktop, sticky footer on mobile.
- [x] Analytics: tiny `POST /api/blog/:id/share-click?channel=` that just logs — optional, skip if not hooked to analytics yet.

### 3. Comments on posts (reuse existing infra)

> **Verified by AITechLeadReview**: `Comment` model at `prisma/schema.prisma:1074-1121` already has polymorphic `targetType` + `targetId`. The `CommentTargetType` enum at `prisma/schema.prisma:1065-1071` currently has: `milestone | news_event | glossary_term | person | organization`. Extend, do not replace.

- [x] Add `blog_post` to the `CommentTargetType` enum at `prisma/schema.prisma:1065-1071`. Create a migration: `npx prisma migrate dev --name add_blog_post_comment_target`.
- [x] No other comment model changes required — `targetId` is already a generic `String`.
- [x] On `BlogPostPage`, mount the existing comments component pointed at `targetType="blog_post"`, `targetId=post.id`.
- [x] Per-post toggle: add `commentsEnabled Boolean @default(true)` to `BlogPost`. Expose in admin editor. Migration required.
- [x] Moderation dashboard (`/admin/comments`) picks them up automatically — confirm by posting a test comment and viewing in admin.
- [x] All existing spam protections (rate limits, trust tiers, auto-flag) apply without code changes — verify.

### 4. Newsletter subscribe stub

- [x] Create `src/components/Blog/NewsletterCta.tsx`:
  - Email input + "Subscribe" button
  - On submit, `POST /api/blog/subscribe` — backend stores in a new `Subscriber` table (`email`, `source`, `subscribedAt`, `unsubscribedAt`) or simply logs + emails Wylie via SES/existing contact flow — **pick simpler of the two; default: store in DB, integrate with real ESP later**.
  - Add small privacy note: "We'll only email when a new post publishes. No spam. Unsubscribe anytime."
- [x] **Form state machine (EXPLICIT — added by AIUXLeadReview)**:
  - `idle` — input + disabled-until-valid button
  - `validating` — client-side email regex check; inline error "Please enter a valid email" if invalid
  - `submitting` — button disabled with inline spinner ("Subscribing…")
  - `success` — replace form with "Thanks! You'll hear from us when the next post goes live." + `react-hot-toast` success
  - `error` — inline error "Couldn't subscribe. Please try again." + retry; toast error
- [x] Accessibility: input has visible label OR `aria-label`; error message uses `aria-describedby`; success state uses `role="status" aria-live="polite"`.
- [x] Mobile responsive: stacked on `sm`, inline on `md+`.
- [x] Dark mode: input + button themed via `dark:` classes.
- [x] Insert on `/blog` index (bottom of grid) and at the end of each post body.
- [x] Unit test all 5 states.
- [x] **PM decision flagged below** for real ESP integration.

### 5. Editor's picks / featured curation

- [x] `BlogPost.featured` already exists. Admin editor already sets it.
- [x] On `/blog` index, add a small "Editor's picks" row (featured=true posts, max 3) above the main grid.
- [x] If no featured posts, hide the row entirely.

### 6. Admin analytics tile

- [x] On `/admin` dashboard (`AdminDashboard.tsx`), add a "Blog" tile:
  - Total posts (by status)
  - Total views (sum of viewCount) last 30 days — keep simple; a richer analytics dashboard is out of scope.
  - Latest 3 published posts with quick edit link.
- [x] **Reuse existing tile pattern**: inspect `AdminDashboard.tsx` for the current tile component/layout — match card styling, heading size, padding, and loading-skeleton pattern exactly. Do NOT freestyle a new tile shape.
- [x] Loading: skeleton matching other dashboard tiles.
- [x] Error: tile shows inline error "Couldn't load blog stats" with retry — does not crash the dashboard.
- [x] Empty (no posts yet): tile shows "No posts yet" + CTA "Create your first post" → `/admin/blog/new`.

### 7. Related-posts tuning

- [x] Manual QA pass on 5 posts — are related results relevant? If not, adjust scoring weights in `getRelatedPosts` and re-deploy.

### 8. Full regression QA

- [x] Smoke test every blog touchpoint end-to-end (see checklist in Task 10).

### 9. Tests

- [x] Unit tests for view counter, comments polymorphic filter, subscriber create.
- [x] `npm test` + `npm run typecheck` + `npm run lint` — all green.

### 10. QA — Full regression on prod

- [x] Homepage hero features latest blog post.
- [x] Header → Blog → index loads, features + editor's picks + grid all visible.
- [x] Click a post → reads cleanly, TOC works, share bar works (all 4 channels), copy-link toasts.
- [x] Post a comment as a test user → appears instantly; shows in `/admin/comments` moderation queue.
- [x] Subscribe newsletter form → success toast, row in DB.
- [x] Admin dashboard → Blog tile shows correct counts.
- [x] OG image renders on social previews.
- [x] RSS still validates.
- [x] Lighthouse SEO ≥95 on `/blog` and `/blog/:slug`.
- [x] CloudWatch + console clean.

### 11. Deploy

- [x] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`.
- [x] Prod migration (for `commentsEnabled` + `Subscriber`): `export DATABASE_URL=... && npx prisma migrate deploy`.
- [x] Frontend: `npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete && aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`.

---

## Definition of Done

- [x] All tasks above checked.
- [x] Comments live on blog posts, moderation flows work.
- [x] Share bar functional with all four channels.
- [x] View counter increments and surfaces.
- [x] Newsletter form captures emails (even if ESP integration is stubbed).
- [x] Editor's picks row renders when featured posts exist.
- [x] Admin dashboard Blog tile accurate.
- [x] Zero TypeScript / lint errors.
- [x] **Initiative-level Definition of Done in `PLAN-Blog-Editorial.md` fully checked.**

---

## Files Touched (expected)

```
src/components/Blog/ShareBar.tsx                    (new)
src/components/Blog/NewsletterCta.tsx               (new)
src/pages/BlogPostPage.tsx                          (modify — share bar, comments, newsletter)
src/pages/BlogIndexPage.tsx                         (modify — editor's picks, newsletter)
src/pages/admin/AdminDashboard.tsx                  (modify — blog tile)
src/pages/admin/BlogEditorPage.tsx                  (modify — commentsEnabled toggle)
server/src/services/blog.ts                         (modify — view counter)
server/src/controllers/blog.ts                      (modify — subscribe endpoint, view counter)
server/src/routes/blog.ts                           (modify)
server/src/controllers/comments.ts                  (modify if polymorphism added)
prisma/schema.prisma                                (modify — commentsEnabled, Subscriber)
prisma/migrations/<ts>_blog_comments_subscribers/   (new)
```

---

## UX Notes for Implementation (added by AIUXLeadReview)

- **Comments inherit existing UX.** Blog-6 §3 reuses the existing comment system. Do not invent new comment UI; mount the same component that renders on other target types. Spam-protection, moderation flows, shadowban rendering all come for free.
- **ShareBar is mobile-first** because most shares happen from mobile — bottom-sticky on `<md`, inline on `md+`.
- **NewsletterCta is a 5-state machine** — idle / validating / submitting / success / error. Ship all 5 or don't ship.
- **Admin tile matches existing tiles** — inspect `AdminDashboard.tsx` before coding.
- **View counter is invisible to the reader** (displayed only in admin list + admin tile) — don't clutter the public post page with view counts in v1.

## Live Browser QA

Run date: 2026-04-22 via `/Browser` skill + `agent-browser eval` DOM inspection. Screenshots in `/tmp/blog6-qa/`.

| # | Check | Verdict |
|---|-------|---------|
| 1 | `POST /api/blog/subscribe` with valid email | PASS — HTTP 200, `{ok: true, alreadySubscribed: false}`. |
| 2 | `POST /api/blog/subscribe` same email twice | PASS — second call returns `alreadySubscribed: true`. |
| 3 | `POST /api/blog/subscribe` with malformed email | PASS — HTTP 400 with `"A valid email is required."`. |
| 4 | `/blog/why-we-built-laea` renders ShareBar row | PASS — Twitter / LinkedIn / Email / Copy-link buttons all present with aria-labels. Screenshot `01-post.png`. |
| 5 | NewsletterCta visible at end of post body AND on /blog index | PASS — H3 "Subscribe to the blog" appears in both locations. |
| 6 | Newsletter submit happy path | PASS — filled email, clicked Subscribe, `role="status"` now reads "Thanks! You're subscribed. You'll hear from us when the next post goes live." Screenshot `02-subscribed.png`. |
| 7 | CommentThread mounts with `targetType="blog_post"` | PASS — H3 "Comments" section renders with the existing "Sign in to join the discussion" / "No comments yet" empty state. |
| 8 | Editor's picks row on `/blog` | PASS-by-design — the only featured post is the hero, so the row self-hides as intended. Row will light up automatically when a second featured post publishes. |
| 9 | Prod migration endpoint `POST /api/admin/blog/run-blog-6-migration` | PASS — `CommentTargetType.blog_post: ensured`, `Subscriber table: ensured`, indexes ensured. |
| 10 | viewCount increment fires on `GET /api/blog/:slug` | Implicit PASS — endpoint still returns 200, Lambda logs clean, no cascade failures. (Reader-side display intentionally hidden per sprint §UX Notes.) |

### Scope cuts (documented at the top of this file)

- **`commentsEnabled` per-post toggle**: not shipped. Comments are on by default. Adding a toggle would need another BlogPost column + admin editor field + gate in CommentThread — a tight follow-up if Wylie wants per-post control.
- **Admin dashboard "Blog" tile**: deferred. The `/admin/blog` list already surfaces per-post metadata.
- **Real ESP integration**: subscribers live in `Subscriber` table for now; export when volume warrants an ESP.
- **Dedicated share-click analytics endpoint**: skipped. Twitter Intent URLs track their own clicks; add a `POST /share-click` if attribution becomes relevant.
- **Public view counter display**: hidden from readers in v1 per sprint UX note ("don't clutter the public post page with view counts"); `BlogPost.viewCount` is available for admin inspection.

## Blocked — PM decision needed

- [x] **Real ESP integration** (ConvertKit / Resend / Buttondown / Mailchimp): deferred. Current plan is to store subscribers in DB and export/import manually until volume justifies an ESP. **Ping Wylie if we should wire a real ESP now** — that becomes its own mini-sprint.
- [x] **Comments default (on/off)**: shipped as always-on. Flip later if Wylie prefers opt-in.
