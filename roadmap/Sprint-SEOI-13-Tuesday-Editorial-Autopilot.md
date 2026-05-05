# Sprint SEOI-13: Tuesday Editorial Autopilot

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-05-05 by Codex

## Overview

Build a Tuesday automation that turns the Monday SEO digest into higher-throughput editorial action. The runner should autonomously select strong blog opportunities, create optimized topic-mode blog posts using the durable rules from `AIBlogDraft`, publish only when strict quality gates pass, and email Wylie at `wyliedeveloper@gmail.com` with a recap and review links.

This is intentionally more autonomous than SEOI-12: the cap should rise beyond one post. Wylie remains human-in-the-loop by reviewing the published or ready-to-review posts on Tuesday from the email and admin pages, not by approving every draft before the runner can act.

Recommended initial cap:

- Up to **3 autonomous topic-mode posts per Tuesday**.
- At most **2 can publish immediately**.
- At least **1 slot is reserved for draft-only** if the runner finds a promising but voice-fragile or research-heavy idea.
- No auto-publish from `editorial_seed` rows until Wylie explicitly approves that source type for automation.

The core PM tradeoff is speed versus taste risk. This plan chooses speed with guardrails: publish the clean long-tail/opportunity posts, draft the edgy/thesis-heavy posts, email Wylie everything.

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

- [ ] Read `AGENTS.md`, `.claude/CLAUDE.md`, `.claude/reference/seo-insights.md`, `.claude/schedules/seo-weekly.md`, `.claude/skills/AIBlogDraft/SKILL.md`, and `.claude/skills/SEOAuditAgent/SKILL.md`.
- [ ] Confirm SEOI-12 production rule remains restored to `cron(15 13 ? * MON *)` with target input `{"action":"seoWeeklyDigest"}`.
- [ ] Confirm Tuesday runner should use the existing ingestion Lambda rather than creating a new Lambda.
- [ ] Define SSM names for Tuesday state, for example `/ai-timeline/prod/seo-editorial-last-run` and `/ai-timeline/prod/seo-editorial-paused`.
- [ ] Confirm email sender constraints in SES: verified sender identity, sandbox status, and whether `wyliedeveloper@gmail.com` can receive from the configured sender.
- [ ] Document expected incremental cost: LLM tokens, Serper calls, SES email, and any extra CloudWatch/EventBridge usage.
- [ ] Get PM approval before adding any new billable AWS resources. Prefer no new billable resource beyond existing EventBridge/Lambda/SES.

### 2. Editorial Runner Service

- [ ] Add `server/src/services/seo/editorialAutopilotRunner.ts`.
- [ ] Add `server/src/services/seo/editorialOpportunitySelector.ts` to rank eligible opportunities from proposals, keyword portfolio rows, and recent articles.
- [ ] Add `server/src/services/seo/blogDraftComposer.ts` to codify the durable parts of `AIBlogDraft` topic mode:
  - voice file read
  - SERP/winnability summary
  - entity inventory
  - first-mention internal linking
  - SEO title/description generation
  - duplicate-topic check
  - final self-audit
- [ ] Add `server/src/services/seo/blogQualityGate.ts` with deterministic pass/fail checks before publish.
- [ ] Add `server/src/services/seo/editorialRunStatus.ts` for Tuesday run persistence.
- [ ] Reuse existing Prisma/blog admin service functions where possible rather than calling public admin HTTP endpoints from inside Lambda.
- [ ] Add a hard idempotency key per opportunity and week so the Tuesday runner cannot publish duplicate posts on retry.

### 3. Opportunity Selection Rules

- [ ] Select from Monday-approved proposals first.
- [ ] Then select unapproved but high-confidence proposals only when the source is `content_gap`, `trend_signal`, `gsc_cluster`, `google_trends`, or `serp_sample`.
- [ ] Permit autonomous topic-mode posts only when confidence is at least `0.75`.
- [ ] Require `overallScore >= 70` for keyword portfolio-driven posts.
- [ ] Require `pageTypeRecommendation=blog_post` for keyword portfolio rows.
- [ ] Exclude `editorial_seed` rows from auto-publish.
- [ ] Exclude opportunities if a same or near-duplicate blog post already exists.
- [ ] Exclude topics with fewer than 3 strong internal links unless Wylie has manually approved the idea.
- [ ] Cap output at 3 total posts per Tuesday.
- [ ] Cap immediate publishing at 2 posts per Tuesday.
- [ ] Convert all remaining good opportunities to draft-only or leave them queued with a clear reason.

### 4. Blog Draft and Publish Flow

- [ ] For each selected opportunity, produce a structured brief before drafting.
- [ ] Run SERP/Serper sampling with cache and spend caps before drafting.
- [ ] Generate one topic-mode blog draft in Wylie's accumulated voice.
- [ ] Build an entity link inventory and enforce first-mention links.
- [ ] Require at least 3 internal links and no invented entities.
- [ ] Require a unique slug, title, `seoTitle`, `seoDescription`, excerpt, tags, subjects, and relation records.
- [ ] Create the post as `draft` first.
- [ ] Run the quality gate against the persisted draft.
- [ ] Publish only when the quality gate passes every required item.
- [ ] Leave as draft when any soft editorial risk is present.
- [ ] Mark the originating proposal as `approved`, `published`, or `draft_created` according to the existing proposal status model.

### 5. Quality Gates

- [ ] Reject auto-publish if the post has hallucinated facts, unsupported claims, or missing primary-source links for news claims.
- [ ] Reject auto-publish if the title or body reads as generic listicle/slop.
- [ ] Reject auto-publish if the post competes with an existing LAEA page without a clear canonical strategy.
- [ ] Reject auto-publish if the target keyword is too broad for LAEA to plausibly win.
- [ ] Reject auto-publish if internal links are forced or irrelevant.
- [ ] Reject auto-publish if body content lacks a thesis or is only a recap.
- [ ] Reject auto-publish if markdown shortcodes do not resolve to valid entities.
- [ ] Reject auto-publish if Article/Breadcrumb metadata cannot be generated.
- [ ] Reject auto-publish if generated post would exceed the weekly cap.
- [ ] On rejection, persist a draft or skipped opportunity with a reason for Tuesday email review.

### 6. Tuesday Email Recap

- [ ] Add an email helper for SEO editorial recap emails.
- [ ] Prefer SES `SendEmailCommand`; if sending from the ingestion Lambda, add `ses:SendEmail` and `ses:SendRawEmail` permissions to `IngestionFunction`.
- [ ] Store the recipient in SSM as `/ai-timeline/prod/seo-editorial-recap-email`, defaulting to `wyliedeveloper@gmail.com`.
- [ ] Store or configure the sender identity explicitly; do not hardcode an unverified sender without checking SES.
- [ ] Include published post URLs.
- [ ] Include admin edit URLs for every published and draft post.
- [ ] Include source opportunity links back to `/admin/seo-insights/proposals` or `/admin/seo-insights/portfolio`.
- [ ] Include skipped/deferred opportunities with reasons.
- [ ] Include Serper credits used, month-to-date spend, remaining credits, warning level, and auto-top-up state.
- [ ] Include Tuesday runner status and CloudWatch log pointer.
- [ ] Send the email even when the run produces zero posts, unless the whole run fails before email construction.
- [ ] If email send fails, keep the runner status `warning` or `failed_email_only` while preserving blog/proposal results.

### 7. EventBridge Schedule

- [ ] Add `SeoTuesdayEditorialRule` to `infra/template.yaml`.
- [ ] Schedule it for Tuesday after the Monday review window, recommended `cron(0 15 ? * TUE *)` (Tuesday 15:00 UTC).
- [ ] Target the existing ingestion Lambda with `{"action":"seoEditorialTuesday"}`.
- [ ] Add paired Lambda invoke permission for the EventBridge rule.
- [ ] Add ingestion Lambda environment variables for Tuesday pause/status/email SSM params.
- [ ] Confirm EventBridge rule, target, and permission via AWS CLI after deploy.

### 8. Ingestion Lambda Wiring

- [ ] Add `seoEditorialTuesday` action dispatch in `server/src/ingestionLambda.ts`.
- [ ] Support `dryRun`, `force`, and `maxPosts` payload overrides for manual validation.
- [ ] Ensure dry-run never creates posts, proposals, status mutations, or emails unless explicitly passed `sendTestEmail=true`.
- [ ] Ensure force bypasses same-week idempotency but still respects post caps and duplicate-topic gates.
- [ ] Return a compact JSON summary with selected, published, drafted, skipped, emailed, and failed counts.

### 9. Admin UI Review Surface

- [ ] Add Tuesday editorial status to `/admin/seo-insights` or a sub-panel under proposals.
- [ ] Show last Tuesday run status, started/completed times, published count, draft count, skipped count, email status, and error message.
- [ ] Add links to created blog posts and admin edit pages.
- [ ] Add a pause switch for Tuesday editorial autopilot separate from Monday SEO digest pause, or clearly document if the existing SEO pause controls both.
- [ ] Add badges for `auto_published`, `draft_for_review`, and `skipped_by_gate`.
- [ ] Keep admin UI dense and operator-focused; no marketing-style hero section.

### 10. Tests

- [ ] Unit test opportunity ranking and caps.
- [ ] Unit test exclusion of `editorial_seed` from auto-publish.
- [ ] Unit test duplicate-topic detection.
- [ ] Unit test quality gate pass/fail cases.
- [ ] Unit test idempotency: same week does not duplicate posts.
- [ ] Unit test dry-run: no blog writes, no proposal mutations, no emails.
- [ ] Unit test email recap payload generation.
- [ ] Unit test email failure handling preserves run results.
- [ ] Unit test ingestion Lambda dispatch for `seoEditorialTuesday`.
- [ ] Integration test draft creation against mocked Prisma/blog service.
- [ ] Run `npm run typecheck` after each implementation block.
- [ ] Run `npm run lint` after each implementation block.
- [ ] Run targeted Jest tests after each implementation block.

### 11. Deployment

- [ ] Run `aws events list-rules` and `aws lambda get-function` to confirm existing infrastructure before provisioning.
- [ ] Deploy backend with `./scripts/deploy-backend.sh`.
- [ ] Confirm CloudFormation creates `SeoTuesdayEditorialRule` and permission.
- [ ] Confirm ingestion Lambda has required SSM and SES permissions.
- [ ] Invoke manually with `{"action":"seoEditorialTuesday","dryRun":true}`.
- [ ] Invoke manually with `{"action":"seoEditorialTuesday","dryRun":true,"sendTestEmail":true}` to verify email delivery to `wyliedeveloper@gmail.com`.
- [ ] Invoke manually with `{"action":"seoEditorialTuesday","force":true,"maxPosts":1}` only after reviewing dry-run output.
- [ ] Temporarily move EventBridge to a near-term trigger and validate scheduled invocation end-to-end.
- [ ] Restore EventBridge to Tuesday cadence after validation.

## Browser Testing & Validation

> **CRITICAL**: Use agent-browser CLI to manually test all web features.
> Do NOT mark tasks complete without browser validation.

### Admin Review UI

- [ ] Open feature URL: `agent-browser open https://letaiexplainai.com/admin/seo-insights`
- [ ] Take initial screenshot: `agent-browser screenshot`
- [ ] Get element references: `agent-browser snapshot -i`
- [ ] Verify Tuesday editorial run status appears.
- [ ] Click published post links and draft edit links.
- [ ] Verify status badges and skipped reasons render correctly.
- [ ] Verify pause switch behavior if implemented.
- [ ] Take final screenshot: `agent-browser screenshot`
- [ ] Repeat on mobile viewport: `agent-browser resize 375 812 && agent-browser screenshot`
- [ ] Confirm zero console errors and zero unexpected 4xx/5xx network responses.

### Blog Post Review

- [ ] Open each auto-published blog URL from the Tuesday recap email.
- [ ] Screenshot the public post.
- [ ] Verify title, H1, excerpt, body, internal links, related posts, and metadata render.
- [ ] Open each admin edit URL from the Tuesday recap email.
- [ ] Verify the editor loads the generated content and can save changes.
- [ ] Confirm no broken shortcode output is visible on the public post.

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

## Acceptance Criteria

- [ ] Tuesday runner can select up to 3 autonomous topic-mode post opportunities.
- [ ] Runner publishes no more than 2 posts per Tuesday without human pre-approval.
- [ ] Runner creates draft-only posts for promising but risky opportunities.
- [ ] Runner never auto-publishes `editorial_seed` opportunities.
- [ ] Runner sends a Tuesday recap email to `wyliedeveloper@gmail.com`.
- [ ] Recap email includes public links, admin edit links, source opportunity links, and skipped reasons.
- [ ] Runner respects pause, dry-run, force, idempotency, duplicate-topic checks, and spend caps.
- [ ] Admin UI exposes Tuesday run status and links for human review.
- [ ] EventBridge scheduled trigger validated end-to-end and restored to Tuesday cadence.
- [ ] All browser validation tasks completed with screenshots.
- [ ] Backend logs and CloudWatch metrics clean.

## Notes for Future Developers

- This sprint should reuse the SEOI-12 EventBridge/SSM/idempotency pattern. Do not invent a second scheduler architecture.
- The deployed runtime should codify `AIBlogDraft` behavior; it should not attempt to invoke Codex skills inside Lambda.
- Treat Wylie's Tuesday email as the human-in-the-loop handoff. The email must be crisp enough to review quickly from a phone.
- The first production run should use `maxPosts=1` even though the final cap is 3. Raise to 3 only after the first generated post passes human review.
- If SES is still in sandbox mode, email validation may be the actual blocker. Document it under `Blocked — PM decision needed` rather than weakening the review loop.

## Blocked — PM Decision Needed

- [ ] Confirm final starting cap: recommended `maxPosts=3`, `maxAutoPublish=2`, `minDraftReviewSlots=1`.
- [ ] Confirm sender identity for Tuesday recap emails.
- [ ] Confirm whether the first production Tuesday run should publish immediately or create drafts only for one calibration week.
