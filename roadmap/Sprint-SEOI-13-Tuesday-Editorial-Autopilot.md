# Sprint SEOI-13: Tuesday Editorial Autopilot

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-05-05 by Codex + AITechLeadReview + AIUXLeadReview + AISlopReviewer + AISEOReview

## Overview

Build a Tuesday automation that turns the Monday SEO digest into higher-throughput editorial action. The runner should autonomously select strong blog opportunities, create optimized topic-mode blog posts using the durable rules from `AIBlogDraft`, publish only when strict quality gates pass, and email Wylie at `wyliedeveloper@gmail.com` with a recap and review links.

This is intentionally more autonomous than SEOI-12: the cap should rise beyond one post. Wylie remains human-in-the-loop by reviewing the published or ready-to-review posts on Tuesday from the email and admin pages, not by approving every draft before the runner can act.

Recommended initial cap:

- Up to **3 autonomous topic-mode posts per Tuesday**.
- At most **2 can publish immediately**.
- At least **1 slot is reserved for draft-only** if the runner finds a promising but voice-fragile or research-heavy idea.
- No auto-publish from `editorial_seed` rows until Wylie explicitly approves that source type for automation.

The core PM tradeoff is speed versus taste risk. This plan chooses speed with guardrails: publish the clean long-tail/opportunity posts, draft the edgy/thesis-heavy posts, email Wylie everything.

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/AGENTS.md`, `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md`, and the relevant `.claude/rules/*.md` files.
2. Open `/Users/wyliebrown/ai_timeline/roadmap/PLAN-SEO-Insights-Pilot.md` and this sprint file.
3. Pick exactly one unchecked `[ ]` task. Do not start broad refactors.
4. After each implementation block, run:
   - [ ] `npm run typecheck`
   - [ ] `npm run lint`
   - [ ] targeted tests for the changed behavior
5. For backend changes, validate deployed behavior with AWS CLI, SSM/API checks, and CloudWatch logs before checking the task.
6. For frontend changes, validate with `agent-browser` screenshots on deployed `https://letaiexplainai.com`.
7. Update this sprint checklist and commit the code plus checkbox change together.
8. Stop only when the Acceptance Criteria are met or a PM decision is required.

## Product Decision

### Chosen Mode: Post-Publish Human Review With Guardrails

Tuesday automation may publish posts without pre-approval only when all gates pass. Wylie reviews the result the same day from the email recap and can edit, archive, or redirect follow-up work from `/admin/blog` and `/admin/seo-insights/proposals`.

Why this fits the current architecture:

- The blog CMS already supports draft, publish, edit, archive, and public URLs.
- The SEO proposal system already separates safe proposals from human-only work.
- SEOI-12 already proved EventBridge -> ingestion Lambda -> SSM run-status works.
- Admin pages are already the operator interface.
- SES already exists for contact-form email, but the ingestion Lambda needs explicit email permissions or the runner needs a shared email helper routed through an API-owned path.

### Non-Goals

- Do not run Codex skills directly inside Lambda. Skills are local agent instructions, not deployed runtime code.
- Do not publish broad thought-leadership, controversial claims, or speculative news essays without human review.
- Do not auto-publish packaging/canonical/H1/schema/internal-link infrastructure changes.
- Do not create another notification product. This is a simple operator email to Wylie.

## Inputs

- Monday SEO digest run status from `/ai-timeline/prod/seo-agent-last-run`.
- SEO proposals from `/admin/seo-insights/proposals`.
- Scored keyword portfolio rows from `/admin/seo-insights/portfolio`.
- Recent admin-ingested articles from `/admin/articles`.
- Blog voice source: `.claude/skills/AIBlogDraft/blog_voice.md`.
- SEO voice source: `.claude/skills/SEOAuditAgent/seo_voice.md`.
- Existing blog posts and slugs for duplication checks.
- Entity graph lookups for people, organizations, glossary terms, milestones, subjects, news events, and learning paths.

## Output

- Published blog posts, when all gates pass.
- Draft blog posts, when an idea is promising but not safe to publish automatically.
- Updated SEO proposal records linked to created draft/published posts.
- Tuesday run status in SSM, separate from Monday digest status.
- Email recap to `wyliedeveloper@gmail.com` with:
  - published post links
  - draft review links
  - skipped opportunities and reasons
  - SEO targets and internal-link summary
  - warnings, blockers, and Serper/API spend state

## Tasks

### 1. Planning and Architecture Confirmation

- [x] Read `AGENTS.md`, `.claude/CLAUDE.md`, `.claude/reference/seo-insights.md`, `.claude/schedules/seo-weekly.md`, `.claude/skills/AIBlogDraft/SKILL.md`, and `.claude/skills/SEOAuditAgent/SKILL.md`.
- [x] Confirm SEOI-12 production rule remains restored to `cron(15 13 ? * MON *)` with target input `{"action":"seoWeeklyDigest"}`.
- [x] Confirm Tuesday runner should use the existing ingestion Lambda rather than creating a new Lambda.
- [x] Define SSM names for Tuesday state, for example `/ai-timeline/prod/seo-editorial-last-run` and `/ai-timeline/prod/seo-editorial-paused`.
- [ ] Define how deployed Lambda receives blog/SEO voice context. Do not assume repo-root `.claude/skills/...` files exist in the `server/src` Lambda bundle; either copy a reviewed voice snapshot into deployable source, store it in SSM/RDS, or load it from an explicitly packaged asset.
- [x] Confirm email sender constraints in SES: verified sender identity, sandbox status, and whether `wyliedeveloper@gmail.com` can receive from the configured sender.
- [ ] Document expected incremental cost: LLM tokens, Serper calls, SES email, and any extra CloudWatch/EventBridge usage.
- [ ] Get PM approval before adding any new billable AWS resources. Prefer no new billable resource beyond existing EventBridge/Lambda/SES.

### 2. Editorial Runner Service

- [x] Add `server/src/services/seo/editorialAutopilotRunner.ts`.
- [ ] Add `server/src/services/seo/editorialOpportunitySelector.ts` to rank eligible opportunities from proposals, keyword portfolio rows, and recent articles.
- [ ] Add `server/src/services/seo/blogDraftComposer.ts` to codify the durable parts of `AIBlogDraft` topic mode:
  - voice file read
  - SERP/winnability summary
  - entity inventory
  - first-mention internal linking
  - SEO title/description generation
  - duplicate-topic check
  - final self-audit
- [ ] Before adding composer logic, audit and reuse `server/src/services/seo/briefGenerator.ts`; do not copy or fork its proposal generation, link inventory, duplicate-window, entity search, or anti-slop phrase logic.
- [ ] If `briefGenerator.ts` has useful private helpers, extract narrow exported helpers there instead of creating a parallel SEO context builder.
- [x] Add `server/src/services/seo/blogQualityGate.ts` with deterministic pass/fail checks before publish.
- [x] Add `server/src/services/seo/editorialRunStatus.ts` for Tuesday run persistence.
- [x] Keep Tuesday run-status values in one typed backend/UI contract. Avoid scattered string literals for `warning`, `failed_email_only`, `paused`, or partial-success states.
- [ ] Reuse existing `server/src/services/blogAdmin.ts` functions where possible rather than calling public admin HTTP endpoints from inside Lambda:
  - `createDraft(input, authorId)`
  - `publishPost(id)`
  - `archivePost(id)` for rollback/manual cleanup support
  - `getOrCreateDefaultAuthor()`
- [ ] Add a hard idempotency key per opportunity and week so the Tuesday runner cannot publish duplicate posts on retry.
- [ ] Add an idempotency persistence mechanism before publishing. Use an existing durable table if sufficient, otherwise add a small Prisma model/migration; do not rely on in-memory keys because EventBridge/Lambda retries can cold-start.

### 3. Opportunity Selection Rules

- [x] Select from Monday-approved proposals first.
- [x] Then select unapproved but high-confidence proposals only when the source is `content_gap`, `trend_signal`, `gsc_cluster`, `google_trends`, or `serp_sample`.
- [x] Permit autonomous topic-mode posts only when confidence is at least `0.75`.
- [x] Require `overallScore >= 70` for keyword portfolio-driven posts.
- [x] Require `pageTypeRecommendation=blog_post` for keyword portfolio rows.
- [x] Exclude `editorial_seed` rows from auto-publish.
- [ ] Exclude opportunities if a same or near-duplicate blog post already exists.
- [ ] Exclude topics with fewer than 3 strong internal links unless Wylie has manually approved the idea.
- [x] Cap output at 3 total posts per Tuesday.
- [x] Cap immediate publishing at 2 posts per Tuesday.
- [x] Convert all remaining good opportunities to draft-only or leave them queued with a clear reason.

### 4. Blog Draft and Publish Flow

- [ ] For each selected opportunity, produce a structured brief before drafting.
- [ ] Run SERP/Serper sampling with cache and spend caps before drafting.
- [ ] Generate one topic-mode blog draft in Wylie's accumulated voice.
- [ ] Build an entity link inventory and enforce first-mention links.
- [ ] Use the existing entity/search/link inventory path from `briefGenerator.ts`, `entityMatcher.ts`, and related SEO services. Add only a thin blog-body shortcode resolver if no reusable function exists.
- [ ] Require at least 3 internal links and no invented entities.
- [ ] Require a unique kebab-case slug, exactly one title/H1, `seoTitle`, `seoDescription`, excerpt, tags, subjects, and relation records.
- [ ] Enforce `seoTitle` ≤60 characters and `seoDescription` between 140-160 characters before publish; leave as draft if the generated metadata misses the bounds.
- [ ] Default canonical URL to `https://letaiexplainai.com/blog/:slug`; allow a custom canonical only when the gate records a duplicate-content rationale.
- [ ] Structure the first 150 words to answer the target query directly for AI Overview and LLM citability.
- [ ] Include a visible `Key facts` or concise summary block for generated explainers, with entity names, dates, and claims written as standalone citation-ready sentences.
- [ ] Include a visible citations/sources section for any news-like or factual claims, prioritizing primary sources, official announcements, papers, or authoritative documentation.
- [ ] Add a short visible FAQ/PAA block only when it is genuinely useful and the literal Q&A text appears on the page; if FAQ JSON-LD is added later, it must reuse `generateFAQJsonLd` from `src/components/SEO.tsx`.
- [ ] Create the post as `draft` first.
- [ ] Run the quality gate against the persisted draft.
- [ ] Publish only when the quality gate passes every required item.
- [ ] Leave as draft when any soft editorial risk is present.
- [ ] Mark the originating proposal using the real `SeoProposal.status` values only: `approved` for linked draft posts and `shipped` when the linked blog post is published. Do not introduce `draft_created`; it does not exist in `prisma/schema.prisma`.
- [ ] Link created posts through the existing proposal path semantics (`draftPostId` + `status`) so `/admin/seo-insights/proposals` remains accurate.

### 5. Quality Gates

- [ ] Reject auto-publish if the post has hallucinated facts, unsupported claims, or missing primary-source links for news claims.
- [ ] Reject auto-publish if the title or body reads as generic listicle/slop.
- [ ] Source anti-slop checks from existing SEO voice/brief-generation rules where possible; do not maintain a second disconnected list of forbidden phrases or generic-writing heuristics.
- [ ] Reject auto-publish if the post competes with an existing LAEA page without a clear canonical strategy.
- [ ] Reject auto-publish if the target keyword is too broad for LAEA to plausibly win.
- [ ] Reject auto-publish if internal links are forced or irrelevant.
- [ ] Reject auto-publish if body content lacks a thesis or is only a recap.
- [ ] Reject auto-publish if markdown shortcodes do not resolve to valid entities.
- [ ] Reject auto-publish if Article/Breadcrumb metadata cannot be generated.
- [ ] Reject auto-publish if Article JSON-LD lacks `author`, `publisher`, `datePublished`, `dateModified`, `mainEntityOfPage`, or absolute `url`/canonical values.
- [ ] Reject auto-publish if the post cannot be represented by the existing `SEO`, `generateArticleJsonLd`, and `generateBreadcrumbListJsonLd` patterns without creating parallel head-management code.
- [ ] Reject auto-publish if the generated post would be client-rendered but Google URL Inspection cannot verify the rendered HTML contains the H1 and opening body for a sampled production post.
- [ ] Reject auto-publish if generated post would exceed the weekly cap.
- [ ] On rejection, persist a draft or skipped opportunity with a reason for Tuesday email review.

### 6. Tuesday Email Recap

- [ ] Add an email helper for SEO editorial recap emails.
- [ ] Do not duplicate the contact-form SES wiring inline. Extract or reuse a small shared server email helper so SES client creation, sender validation, and error normalization live in one place.
- [ ] Prefer SES `SendEmailCommand`; if sending from the ingestion Lambda, add `ses:SendEmail` and `ses:SendRawEmail` permissions to `IngestionFunction`.
- [ ] Store the recipient in SSM as `/ai-timeline/prod/seo-editorial-recap-email`, defaulting to `wyliedeveloper@gmail.com`.
- [ ] Store or configure the sender identity explicitly; do not hardcode an unverified sender without checking SES.
- [x] If email uses the ingestion Lambda directly, wire SES permissions in `infra/template.yaml` under `IngestionFunction.Policies`; existing SES permissions currently live on the API Lambda for the contact form, not on the ingestion Lambda.
- [ ] Include published post URLs.
- [ ] Include admin edit URLs for every published and draft post using the real route shape `/admin/blog/:id/edit`.
- [ ] Include source opportunity links back to `/admin/seo-insights/proposals` or `/admin/seo-insights/portfolio`.
- [ ] Include skipped/deferred opportunities with reasons.
- [ ] Include Serper credits used, month-to-date spend, remaining credits, warning level, and auto-top-up state.
- [ ] Include Tuesday runner status and CloudWatch log pointer.
- [ ] Send the email even when the run produces zero posts, unless the whole run fails before email construction.
- [ ] If email send fails, keep the runner status `warning` or `failed_email_only` while preserving blog/proposal results.
- [ ] Design the recap as a scannable operator artifact, not a newsletter:
  - top line status: `Published`, `Drafts ready`, `Skipped`, `Warnings`
  - first visible links: public post review URLs and `/admin/blog/:id/edit`
  - grouped sections for Published, Drafts for review, Skipped by gate, Spend/Serper, and Logs
  - plain-text fallback with the same links for mobile/email clients
- [ ] Keep link labels descriptive (`Review public post`, `Edit draft`, `Open source proposal`) and avoid generic `click here` / `learn more`.
- [ ] Include one explicit "what Wylie should do next" sentence when posts were published or drafts were created.

### 7. EventBridge Schedule

- [x] Add `SeoTuesdayEditorialRule` to `infra/template.yaml`.
- [x] Schedule it for Tuesday after the Monday review window, recommended `cron(0 15 ? * TUE *)` (Tuesday 15:00 UTC).
- [x] Target the existing ingestion Lambda with `{"action":"seoEditorialTuesday"}`.
- [x] Add paired Lambda invoke permission for the EventBridge rule.
- [x] Add ingestion Lambda environment variables for Tuesday pause/status/email SSM params.
- [x] Confirm EventBridge rule, target, and permission via AWS CLI after deploy.

### 8. Ingestion Lambda Wiring

- [x] Add `seoEditorialTuesday` action dispatch in `server/src/ingestionLambda.ts`.
- [x] Support `dryRun`, `force`, and `maxPosts` payload overrides for manual validation.
- [x] Ensure dry-run never creates posts, proposals, status mutations, or emails unless explicitly passed `sendTestEmail=true`.
- [ ] Ensure force bypasses same-week idempotency but still respects post caps and duplicate-topic gates.
- [ ] Process selected opportunities sequentially or with bounded concurrency. Do not use unbounded `Promise.all` around LLM, Serper, blog writes, or publish steps.
- [ ] Persist per-opportunity failure reasons and continue the run when one candidate fails after selection.
- [x] Return a compact JSON summary with selected, published, drafted, skipped, emailed, and failed counts.

### 9. Admin UI Review Surface

- [ ] Add Tuesday editorial status to `/admin/seo-insights` or a sub-panel under proposals.
- [ ] Update `src/services/api.ts` with Tuesday editorial status types and API client methods; do not create a parallel frontend API client.
- [ ] Update `server/src/routes/seoAdmin.ts` and `server/src/controllers/seoAdmin.ts` only if a new admin status endpoint is needed; gate any new route with `requireAdmin`.
- [ ] Keep Tuesday status separate from the current Monday `PUT /api/admin/seo/run-status` payload unless that endpoint is deliberately generalized. The existing controller validates only `success | failed` and Monday-style digest counts.
- [ ] Extend `src/pages/admin/SeoInsightsPage.tsx` or an existing SEO Insights child page rather than creating an unlinked admin route.
- [ ] Show last Tuesday run status, started/completed times, published count, draft count, skipped count, email status, and error message.
- [ ] Add links to created blog posts and admin edit pages.
- [ ] Add a pause switch for Tuesday editorial autopilot separate from Monday SEO digest pause, or clearly document if the existing SEO pause controls both.
- [ ] Add badges for `auto_published`, `draft_for_review`, and `skipped_by_gate`.
- [ ] Keep admin UI dense and operator-focused; no marketing-style hero section.
- [ ] Reuse existing admin/SEO UI patterns:
  - `SeoInsightsSectionNav` if adding a dedicated SEO Insights subsection
  - `Drawer` from `src/components/ui/Drawer.tsx` for Tuesday run details instead of a one-off modal
  - `LoadingSkeleton` for loading state
  - `ErrorState` for status fetch failures with retry
  - `react-hot-toast` for pause/resume or resend-email feedback
- [ ] Define all Tuesday status states in the UI:
  - loading
  - populated success
  - zero eligible opportunities
  - partial success with skipped/failed candidates
  - email failed but posts/drafts succeeded
  - paused
  - fatal run failure
- [ ] Make every status chip text-first and icon-supported. Do not rely on color alone for `auto_published`, `draft_for_review`, `skipped_by_gate`, `email_failed`, or `paused`.
- [ ] Add explicit dark-mode classes for every new background, border, text, chip, and button state.
- [ ] Keep the accent palette consistent with existing admin SEO surfaces (`slate`, `blue`, `amber`, `green`, `red`; avoid introducing new purple/pink marketing accents for this operator UI).
- [ ] Specify responsive behavior:
  - desktop/lg: compact summary row plus grouped details/drawer
  - tablet/md: two-column cards or wrapping summary metrics
  - mobile/sm: single-column stack with 48px minimum tap targets and no horizontal scroll
- [ ] Ensure every action (`Open public post`, `Edit post`, `Archive post`, `Resend recap`, `Pause Tuesday autopilot`) has visible focus, disabled/loading state, and success/failure feedback.
- [ ] Use `ConfirmDialog` before any destructive action exposed from the Tuesday review surface, especially archive/unpublish cleanup.
- [ ] Ensure any animations use existing `animate-fade-in` / `animate-slide-up` or motion-safe variants; respect `prefers-reduced-motion`.

### 10. Tests

- [x] Add `tests/unit/seo/editorialOpportunitySelector.test.ts` for ranking, caps, `editorial_seed` exclusion, and keyword score thresholds.
- [x] Add `tests/unit/seo/blogQualityGate.test.ts` for pass/fail cases, unresolved shortcodes, weak internal links, and slop-listicle rejection.
- [ ] Add `tests/unit/seo/editorialAutopilotRunner.test.ts` for idempotency, dry-run no-op behavior, bounded caps, partial candidate failure, and email failure preserving run results.
- [ ] Add `tests/unit/seo/editorialEmail.test.ts` for recap payload generation and plain-text fallback links.
- [ ] Add `tests/unit/ingestionLambda.seoEditorialTuesday.test.ts` for `seoEditorialTuesday` dispatch and dry-run/force/maxPosts payload handling.
- [ ] Add a mocked Prisma/blog-service integration-style unit test under `tests/unit/seo/` for draft creation; follow the repo's `tests/unit/...` convention instead of colocated `__tests__` folders.
- [x] Run `npm run typecheck` after each implementation block.
- [x] Run `npm run lint` after each implementation block.
- [x] Run targeted Jest tests after each implementation block.

### 11. Deployment

- [x] Run `aws events list-rules` and `aws lambda get-function` to confirm existing infrastructure before provisioning.
- [x] Deploy backend with `./scripts/deploy-backend.sh`.
- [x] Confirm CloudFormation creates `SeoTuesdayEditorialRule` and permission.
- [x] Confirm ingestion Lambda has required SSM and SES permissions.
- [x] Invoke manually with `{"action":"seoEditorialTuesday","dryRun":true}`.
- [ ] Invoke manually with `{"action":"seoEditorialTuesday","dryRun":true,"sendTestEmail":true}` to verify email delivery to `wyliedeveloper@gmail.com`.
- [ ] Invoke manually with `{"action":"seoEditorialTuesday","force":true,"maxPosts":1}` only after reviewing dry-run output.
- [ ] Keep the first production scheduled run at `maxPosts=1` or draft-only until Wylie reviews the generated output; then raise the default cap to `maxPosts=3` / `maxAutoPublish=2`.
- [ ] Temporarily move EventBridge to a near-term trigger and validate scheduled invocation end-to-end.
- [ ] Restore EventBridge to Tuesday cadence after validation.
- [ ] Deploy frontend/admin UI changes with `/Users/wyliebrown/ai_timeline/scripts/deploy-frontend.sh`; do not use ad-hoc S3 sync because the deploy script enforces sourcemap and cache-header rules.
- [ ] Validate deployed admin UI after CloudFront invalidation, not only against local Vite.

## Browser Testing & Validation

> **CRITICAL**: Use agent-browser CLI to manually test all web features.
> Do NOT mark tasks complete without browser validation.

### Admin Review UI

- [ ] Open feature URL: `agent-browser open https://letaiexplainai.com/admin/seo-insights`
- [ ] Take initial screenshot: `agent-browser screenshot`
- [ ] Get element references: `agent-browser snapshot -i`
- [ ] Verify Tuesday editorial run status appears.
- [ ] Verify loading, empty/zero-post, populated, partial-success, failed-email, paused, and fatal-error states with mocked or seeded run-status data.
- [ ] Click published post links and draft edit links.
- [ ] Verify status badges and skipped reasons render correctly.
- [ ] Verify pause switch behavior if implemented.
- [ ] Toggle light/dark theme and screenshot both.
- [ ] Take final screenshot: `agent-browser screenshot`
- [ ] Repeat on mobile viewport: `agent-browser resize 375 812 && agent-browser screenshot`
- [ ] Verify mobile layout has no horizontal scroll and all tap targets are at least 48px high/wide.
- [ ] Confirm zero console errors and zero unexpected 4xx/5xx network responses.

### Blog Post Review

- [ ] Open each auto-published blog URL from the Tuesday recap email.
- [ ] Screenshot the public post.
- [ ] Verify title, H1, excerpt, body, internal links, related posts, and metadata render.
- [ ] Verify the rendered post has exactly one `<h1>`, descriptive H2/H3 hierarchy, and no heading-level skips caused by generated markdown.
- [ ] Verify Article + BreadcrumbList JSON-LD are present in the rendered DOM and match the visible breadcrumb/title/content.
- [ ] Verify canonical, Open Graph, Twitter Card, `article:*` tags, author URL, published date, and modified date are present for every published post.
- [ ] Open each admin edit URL from the Tuesday recap email.
- [ ] Verify the editor loads the generated content and can save changes.
- [ ] Verify the admin editor's existing mobile tabs (`write`, `preview`, `meta`) still work for generated drafts.
- [ ] Verify post-publish cleanup path: from recap link -> admin edit -> archive confirmation -> toast/status feedback.
- [ ] Confirm no broken shortcode output is visible on the public post.
- [ ] Verify public post readability in light and dark themes: title, prose width, internal links, related posts, comments/newsletter sections, and no layout shift from cover images.
- [ ] Verify any cover image has meaningful alt text, uses a valid 1200x630-ish social preview asset or the site default intentionally, and does not create CLS.

## SEO Validation & Search Console

- [ ] Validate at least one generated published post with Google Rich Results Test; Article and BreadcrumbList schemas must show zero errors before the cap is raised beyond the calibration run.
- [ ] Validate at least one generated published post with Schema.org validator as a secondary check.
- [ ] Run PageSpeed Insights on `/blog` and at least one generated `/blog/:slug` post after deploy; record mobile/desktop LCP, CLS, and INP. Targets: LCP <2.5s, CLS <0.1, INP <200ms.
- [ ] Run Google's Mobile-Friendly Test or URL Inspection mobile render on at least one generated post.
- [ ] Confirm `/api/sitemap.xml` includes each newly published `/blog/:slug` URL after the sitemap cache expires, and confirm `lastmod` reflects the post's `updatedAt` date.
- [ ] Re-submit `api/sitemap.xml` in Google Search Console after the first production generated post ships.
- [ ] Use GSC URL Inspection for the first 3-5 generated published posts; request indexing and verify Google-rendered HTML contains the H1, opening answer, canonical, and structured data.
- [ ] Check `https://letaiexplainai.com/llms.txt` still points LLM crawlers at the blog index and canonical entity URLs; update it only if the generated editorial format introduces a new durable hub or collection.
- [ ] Add a 14-day follow-up to verify generated post coverage/indexing in GSC.
- [ ] Add a 30-day follow-up to review impressions, clicks, CTR, and average position for generated `/blog/*` posts and feed the result back into SEOI measurement.

## Backend Validation

- [ ] Smoke test Tuesday run status via SSM and admin API.
- [ ] Tail ingestion logs: `aws logs tail /aws/lambda/ai-timeline-ingestion-prod --since 30m`.
- [ ] Tail API logs after admin UI review: `aws logs tail /aws/lambda/ai-timeline-api-prod --since 30m`.
- [ ] Confirm EventBridge invocation metric increments.
- [ ] Confirm Lambda error metric remains zero for the scheduled test.
- [ ] Confirm created posts exist in RDS with expected status.
- [ ] Confirm public blog API returns published posts.
- [ ] Confirm draft-only posts are not publicly listed.
- [ ] Confirm Tuesday email arrives at `wyliedeveloper@gmail.com`.
- [ ] Confirm `/admin/blog/:id/edit` opens for every recap link.
- [ ] Confirm generated public URLs are returned by `GET /api/blog/:slug` only after publish.

## Acceptance Criteria

- [ ] Tuesday runner can select up to 3 autonomous topic-mode post opportunities.
- [ ] Runner publishes no more than 2 posts per Tuesday without human pre-approval.
- [ ] Runner creates draft-only posts for promising but risky opportunities.
- [ ] Runner never auto-publishes `editorial_seed` opportunities.
- [ ] Runner sends a Tuesday recap email to `wyliedeveloper@gmail.com`.
- [ ] Recap email includes public links, admin edit links, source opportunity links, and skipped reasons.
- [ ] Runner respects pause, dry-run, force, idempotency, duplicate-topic checks, and spend caps.
- [ ] Every auto-published post has bounded SEO metadata, absolute canonical URL, Article + BreadcrumbList JSON-LD, visible author/date/freshness signals, citations for factual claims, and at least 3 relevant internal links.
- [ ] Every auto-published post answers the target query in the first 150 words and includes a concise `Key facts`/summary block suitable for AI Overview and LLM citation.
- [ ] Admin UI exposes Tuesday run status and links for human review.
- [ ] EventBridge scheduled trigger validated end-to-end and restored to Tuesday cadence.
- [ ] All browser validation tasks completed with screenshots.
- [ ] Tuesday admin review surface covers loading, empty, populated, partial-success, failed-email, paused, and fatal-error states.
- [ ] Tuesday UI passes dark-mode and mobile checks.
- [ ] Tuesday email recap is scannable on mobile and includes plain-text fallback links.
- [ ] Rich Results Test, Schema.org validator, PageSpeed Insights, Mobile-Friendly/URL Inspection, sitemap inclusion, and GSC follow-up tasks completed for the first generated posts.
- [ ] Backend logs and CloudWatch metrics clean.

## Notes for Future Developers

- This sprint should reuse the SEOI-12 EventBridge/SSM/idempotency pattern. Do not invent a second scheduler architecture.
- The deployed runtime should codify `AIBlogDraft` behavior; it should not attempt to invoke Codex skills inside Lambda.
- The deployed runtime cannot rely on repo-root `.claude/skills/...` paths unless those files are deliberately packaged. Treat voice context as a deployable dependency.
- Do not paste full skill files or long prompt manuals into Lambda source. Keep deployable prompts concise, versioned, and data-driven from reviewed voice snapshots.
- Treat Wylie's Tuesday email as the human-in-the-loop handoff. The email must be crisp enough to review quickly from a phone.
- The first production run should use `maxPosts=1` even though the final cap is 3. Raise to 3 only after the first generated post passes human review.
- If SES is still in sandbox mode, email validation may be the actual blocker. Document it under `Blocked — PM decision needed` rather than weakening the review loop.
- Admin UX should be dense and review-first. This is an operator cockpit, not a public landing page: summary, links, warnings, and next actions should fit above the fold on desktop.

## AITechLeadReview Findings — 2026-05-05

### Critical

- [ ] **Voice files are not automatically available in Lambda.** `AIBlogDraft` / `SEOAuditAgent` files live under repo-root `.claude/skills` and `.codex/skills`, while SAM builds the ingestion Lambda from `server/src`. Implementation must explicitly package, copy, or externalize the reviewed voice context before any Lambda code tries to read it.
- [ ] **Use real proposal statuses.** `SeoProposal.status` is `pending | drafting | approved | rejected | shipped`; the initial plan mentioned `draft_created`, which would drift from `prisma/schema.prisma` and existing proposal UI filters.

### Moderate

- [ ] **Do not reuse Monday run-status blindly.** `PUT /api/admin/seo/run-status` and `agentRunStatus.ts` are shaped for the Monday digest (`success | failed`, shipped/proposal/human/measured counts). Tuesday editorial status needs its own status record or a deliberate generalized schema and UI update.
- [ ] **Wire SES on the correct Lambda.** SES permissions exist for the API Lambda contact form. If Tuesday email sends from `ai-timeline-ingestion-prod`, add SES IAM to `IngestionFunction`.
- [ ] **Frontend tasks need concrete integration points.** Extend `src/services/api.ts` and `src/pages/admin/SeoInsightsPage.tsx` / existing SEO Insights pages rather than adding a detached admin surface.

### Minor

- [ ] **Use existing blog service names.** Prefer `createDraft`, `publishPost`, `archivePost`, and `getOrCreateDefaultAuthor` from `server/src/services/blogAdmin.ts`.
- [ ] **Use real admin edit links.** The route is `/admin/blog/:id/edit`.

## AIUXLeadReview Findings — 2026-05-05

### Moderate

- [ ] **Design the Tuesday operator states, not just the data.** The admin surface must specify loading, populated, zero-opportunity, partial-success, failed-email, paused, and fatal-error states using existing `LoadingSkeleton` / `ErrorState` patterns.
- [ ] **Specify responsive and dark-mode behavior.** The Tuesday review panel must define desktop/tablet/mobile layout, avoid horizontal scroll at 375px, keep 48px mobile tap targets, and include `dark:` variants for every new visual state.
- [ ] **Make the recap email a review workflow.** Since Wylie stays human-in-the-loop by email, the recap must be mobile-scannable, put review/edit links first, group published/draft/skipped items, and include plain-text fallback links.

### Minor

- [ ] **Reuse existing admin interaction patterns.** Use `Drawer`, `ConfirmDialog`, `react-hot-toast`, `SeoInsightsSectionNav`, `LoadingSkeleton`, and `ErrorState` instead of one-off review cards/modals/spinners.
- [ ] **Status cannot be color-only.** Every generated-post state needs text and/or icon labels in addition to color.
- [ ] **Post-publish cleanup needs a visible UX path.** Browser QA must verify recap link -> admin edit -> archive/cleanup confirmation works.

## Slop Findings (AISlopReviewer — 2026-05-05)

### Critical

- [ ] No P0 slop findings. The plan reuses the existing ingestion Lambda/EventBridge path and does not propose a second scheduler, detached admin app, or fake blog API.

### Moderate

- [ ] **Avoid a parallel SEO brief engine.** `blogDraftComposer.ts` could become a fork of `server/src/services/seo/briefGenerator.ts` unless implementation first extracts/reuses existing proposal, link inventory, entity search, duplicate-window, and anti-slop helpers.
- [ ] **Centralize Tuesday status strings.** The plan names new states such as `warning` and `failed_email_only`; implementation needs a single typed backend/UI contract so admin filters, SSM persistence, and email copy do not drift.
- [ ] **Do not duplicate SES plumbing.** The repo already has SES contact-form wiring on the API side. Adding Tuesday email from ingestion should extract a small shared email helper or clearly reuse one path, not create another inline SES client with separate error semantics.

### Minor

- [ ] **Follow the repo test layout.** Tests should live under `tests/unit/...`; avoid colocated `__tests__` folders or new test conventions.
- [ ] **Bound expensive async work.** Cap selected posts and process LLM/Serper/blog-write steps sequentially or with explicit bounded concurrency so retries and partial failures stay legible.
- [ ] **Deploy the admin UI through the canonical script.** Because the plan touches `/admin/seo-insights`, frontend validation must include `/Users/wyliebrown/ai_timeline/scripts/deploy-frontend.sh` and deployed browser QA.
- [ ] **Keep prompts out of source comments.** Runtime should package concise, reviewed voice snapshots rather than embedding full skill docs or comment-heavy prompt manuals.

### Slop Avoided

- [x] The plan keeps automation in the existing `server/src/ingestionLambda.ts` action dispatch instead of creating a new Lambda.
- [x] The plan uses real `SeoProposal.status` values from Prisma after tech review.
- [x] The plan reuses `server/src/services/blogAdmin.ts` for draft/publish/archive flows.
- [x] The plan uses `src/services/api.ts`, `SeoInsightsPage`, `Drawer`, `ConfirmDialog`, `LoadingSkeleton`, and `ErrorState` instead of inventing detached frontend surfaces.
- [x] The browser validation uses `agent-browser`, which matches the repo's current validation tooling.

## AISEOReview Findings — 2026-05-05

### Critical

- [ ] No P0 SEO findings. The plan uses the existing `/blog/:slug` public surface, which already has Article/Breadcrumb JSON-LD helpers, canonical support, sitemap inclusion for published posts, and preview `noindex` handling.

### Moderate

- [ ] **Strengthen auto-publish SEO gates.** Publishing must fail closed unless generated posts have bounded `seoTitle`/`seoDescription`, one H1, absolute canonical URL, Article + BreadcrumbList JSON-LD, visible author/date signals, and at least 3 relevant internal links.
- [ ] **Make generated posts AEO-ready, not just blog-shaped.** Topic-mode posts need a direct answer in the first 150 words, citation-ready `Key facts`/summary block, explicit entity/date claims, and visible citations for factual or news-like assertions.
- [ ] **Verify SPA crawlability with Google-rendered output.** Because the public site is a React SPA behind S3/CloudFront, the first generated posts must be checked in GSC URL Inspection to confirm Google sees the H1, opening body, canonical, and structured data after rendering.
- [ ] **Add mandatory search validation after launch.** The plan now requires Rich Results Test, Schema.org validator, PageSpeed Insights, Mobile-Friendly/URL Inspection, sitemap inclusion, sitemap resubmission, and 14/30-day GSC follow-ups before raising the autonomous cap.

### Minor

- [ ] **Protect sitemap freshness.** Confirm `/api/sitemap.xml` uses each generated post's `updatedAt` as `lastmod`; stale `publishedAt`-only lastmod weakens freshness signals after edits.
- [ ] **Keep FAQ schema honest.** FAQ/PAA blocks are useful only when visible Q&A text exists on the page and any future schema reuses `generateFAQJsonLd`.
- [ ] **Treat images as SEO assets.** Generated posts should either use a valid social/cover image with meaningful alt text and no CLS, or intentionally fall back to the site default OG image.

## Blocked — PM Decision Needed

- [ ] Confirm final starting cap: recommended `maxPosts=3`, `maxAutoPublish=2`, `minDraftReviewSlots=1`.
- [ ] Confirm sender identity for Tuesday recap emails.
- [ ] Confirm whether the first production Tuesday run should publish immediately or create drafts only for one calibration week.
