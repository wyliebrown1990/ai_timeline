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
**Status**: Not started

---

## Prerequisites

- [ ] Blog-1/2/3/4/5 DoDs complete.
- [ ] Review existing comments system: `server/src/routes/comments.ts`, `server/src/controllers/...`, `.claude/rules/spam-protection.md`.
- [ ] Review existing engagement counters on `CurrentEvent` for view-count pattern.

---

## Tasks

### 1. View counter

- [ ] Increment `BlogPost.viewCount` on each `GET /api/blog/:slug` request (fire-and-forget update; do not block response).
- [ ] Skip bots via simple UA heuristic + skip preview-token requests.
- [ ] Display view count subtly on `/blog/:slug` and on admin list.
- [ ] Unit test.

### 2. Share buttons

- [ ] Create `src/components/Blog/ShareBar.tsx`:
  - Twitter/X intent URL
  - LinkedIn share
  - Copy-link-to-clipboard (with `react-hot-toast` success toast — reuse, don't hand-roll notification)
  - Email `mailto:`
  - On mobile with `navigator.share` support: render a single "Share" button that triggers native share sheet; fall back to the explicit icon row on desktop.
- [ ] **Mobile thumb-reach (added by AIUXLeadReview)**: on mobile (`<md`), position the ShareBar as a sticky footer-floating bar at the BOTTOM of the viewport (not top) so thumbs can reach it one-handed. Hide on scroll-up, show on scroll-down (or simpler: always visible). On desktop, inline after the post body.
- [ ] Button size: 48×48px minimum (tap target), icons from lucide-react (`Twitter`, `Linkedin`, `Link`, `Mail`, `Share2`).
- [ ] Accessible labels on each button (`aria-label="Share on Twitter"` etc.).
- [ ] Insert in `BlogPostPage`: inline after body on desktop, sticky footer on mobile.
- [ ] Analytics: tiny `POST /api/blog/:id/share-click?channel=` that just logs — optional, skip if not hooked to analytics yet.

### 3. Comments on posts (reuse existing infra)

> **Verified by AITechLeadReview**: `Comment` model at `prisma/schema.prisma:1074-1121` already has polymorphic `targetType` + `targetId`. The `CommentTargetType` enum at `prisma/schema.prisma:1065-1071` currently has: `milestone | news_event | glossary_term | person | organization`. Extend, do not replace.

- [ ] Add `blog_post` to the `CommentTargetType` enum at `prisma/schema.prisma:1065-1071`. Create a migration: `npx prisma migrate dev --name add_blog_post_comment_target`.
- [ ] No other comment model changes required — `targetId` is already a generic `String`.
- [ ] On `BlogPostPage`, mount the existing comments component pointed at `targetType="blog_post"`, `targetId=post.id`.
- [ ] Per-post toggle: add `commentsEnabled Boolean @default(true)` to `BlogPost`. Expose in admin editor. Migration required.
- [ ] Moderation dashboard (`/admin/comments`) picks them up automatically — confirm by posting a test comment and viewing in admin.
- [ ] All existing spam protections (rate limits, trust tiers, auto-flag) apply without code changes — verify.

### 4. Newsletter subscribe stub

- [ ] Create `src/components/Blog/NewsletterCta.tsx`:
  - Email input + "Subscribe" button
  - On submit, `POST /api/blog/subscribe` — backend stores in a new `Subscriber` table (`email`, `source`, `subscribedAt`, `unsubscribedAt`) or simply logs + emails Wylie via SES/existing contact flow — **pick simpler of the two; default: store in DB, integrate with real ESP later**.
  - Add small privacy note: "We'll only email when a new post publishes. No spam. Unsubscribe anytime."
- [ ] **Form state machine (EXPLICIT — added by AIUXLeadReview)**:
  - `idle` — input + disabled-until-valid button
  - `validating` — client-side email regex check; inline error "Please enter a valid email" if invalid
  - `submitting` — button disabled with inline spinner ("Subscribing…")
  - `success` — replace form with "Thanks! You'll hear from us when the next post goes live." + `react-hot-toast` success
  - `error` — inline error "Couldn't subscribe. Please try again." + retry; toast error
- [ ] Accessibility: input has visible label OR `aria-label`; error message uses `aria-describedby`; success state uses `role="status" aria-live="polite"`.
- [ ] Mobile responsive: stacked on `sm`, inline on `md+`.
- [ ] Dark mode: input + button themed via `dark:` classes.
- [ ] Insert on `/blog` index (bottom of grid) and at the end of each post body.
- [ ] Unit test all 5 states.
- [ ] **PM decision flagged below** for real ESP integration.

### 5. Editor's picks / featured curation

- [ ] `BlogPost.featured` already exists. Admin editor already sets it.
- [ ] On `/blog` index, add a small "Editor's picks" row (featured=true posts, max 3) above the main grid.
- [ ] If no featured posts, hide the row entirely.

### 6. Admin analytics tile

- [ ] On `/admin` dashboard (`AdminDashboard.tsx`), add a "Blog" tile:
  - Total posts (by status)
  - Total views (sum of viewCount) last 30 days — keep simple; a richer analytics dashboard is out of scope.
  - Latest 3 published posts with quick edit link.
- [ ] **Reuse existing tile pattern**: inspect `AdminDashboard.tsx` for the current tile component/layout — match card styling, heading size, padding, and loading-skeleton pattern exactly. Do NOT freestyle a new tile shape.
- [ ] Loading: skeleton matching other dashboard tiles.
- [ ] Error: tile shows inline error "Couldn't load blog stats" with retry — does not crash the dashboard.
- [ ] Empty (no posts yet): tile shows "No posts yet" + CTA "Create your first post" → `/admin/blog/new`.

### 7. Related-posts tuning

- [ ] Manual QA pass on 5 posts — are related results relevant? If not, adjust scoring weights in `getRelatedPosts` and re-deploy.

### 8. Full regression QA

- [ ] Smoke test every blog touchpoint end-to-end (see checklist in Task 10).

### 9. Tests

- [ ] Unit tests for view counter, comments polymorphic filter, subscriber create.
- [ ] `npm test` + `npm run typecheck` + `npm run lint` — all green.

### 10. QA — Full regression on prod

- [ ] Homepage hero features latest blog post.
- [ ] Header → Blog → index loads, features + editor's picks + grid all visible.
- [ ] Click a post → reads cleanly, TOC works, share bar works (all 4 channels), copy-link toasts.
- [ ] Post a comment as a test user → appears instantly; shows in `/admin/comments` moderation queue.
- [ ] Subscribe newsletter form → success toast, row in DB.
- [ ] Admin dashboard → Blog tile shows correct counts.
- [ ] OG image renders on social previews.
- [ ] RSS still validates.
- [ ] Lighthouse SEO ≥95 on `/blog` and `/blog/:slug`.
- [ ] CloudWatch + console clean.

### 11. Deploy

- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`.
- [ ] Prod migration (for `commentsEnabled` + `Subscriber`): `export DATABASE_URL=... && npx prisma migrate deploy`.
- [ ] Frontend: `npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete && aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`.

---

## Definition of Done

- [ ] All tasks above checked.
- [ ] Comments live on blog posts, moderation flows work.
- [ ] Share bar functional with all four channels.
- [ ] View counter increments and surfaces.
- [ ] Newsletter form captures emails (even if ESP integration is stubbed).
- [ ] Editor's picks row renders when featured posts exist.
- [ ] Admin dashboard Blog tile accurate.
- [ ] Zero TypeScript / lint errors.
- [ ] **Initiative-level Definition of Done in `PLAN-Blog-Editorial.md` fully checked.**

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

## Blocked — PM decision needed

- [ ] **Real ESP integration** (ConvertKit / Resend / Buttondown / Mailchimp): deferring. Current plan is to store subscribers in DB and export/import manually until volume justifies an ESP. **Ping Wylie if we should wire a real ESP now** — that becomes its own mini-sprint (tokens in SSM, double-opt-in emails, unsubscribe flow, GDPR compliance).
- [ ] **Comments default (on/off)**: current plan is `commentsEnabled = true` by default. Flip to `false` if Wylie prefers opt-in on publish.
