# AI Timeline Atlas SEO Insights — Core User Guide

Last verified: 2026-07-25

Production site: [letaiexplainai.com](https://letaiexplainai.com)

Primary operator page: [SEO Insights](https://letaiexplainai.com/admin/seo-insights)

This is the step-by-step operating guide for the AI Timeline Atlas SEO system. It
covers the remaining launch setup, the normal weekly workflow, manual runs,
proposal review, publishing, measurement, recovery, and deployment.

This guide explains **how to operate the system**. Implementation status remains
in `roadmap/`, and the technical source of truth remains
`.claude/reference/seo-insights.md`, `.claude/schedules/seo-weekly.md`, and
`infra/template.yaml`.

## 1. What is already running

The production system was checked directly in AWS on 2026-07-25. You do not need
to recreate these resources.

| Component | Current state |
| --- | --- |
| Admin SEO dashboard | Live |
| Google Search Console property | `sc-domain:letaiexplainai.com` |
| GSC OAuth credentials | Stored in AWS SSM as `SecureString` |
| Serper API key and cost limits | Configured; automatic top-up is off |
| Anthropic content-generation key | Configured for the production Lambdas |
| GSC ingest schedule | Enabled: Monday at 08:15 UTC |
| Monday SEO digest | Enabled: Monday at 13:15 UTC |
| Tuesday editorial run | Enabled: Tuesday at 15:00 UTC |
| Tuesday recap email | Configured and successfully sent |
| SES sender | Verified |
| Latest GSC ingest | Successful on 2026-07-20 |
| Latest Monday digest | Successful on 2026-07-20 |
| Latest Tuesday editorial run | Successful on 2026-07-21: 1 published, 2 drafts |
| Sitemap | Live at `/api/sitemap.xml` |

The live GSC ingest schedule is `cron(15 8 ? * MON *)`. If an older document says
06:00 UTC, use the deployed AWS/template value above.

## 2. Remaining launch setup

The automation is operational. The remaining setup is search-engine launch
validation for the first generated production posts.

Use this published post as the first representative URL:

<https://letaiexplainai.com/blog/surgeons-use-teleoperated-humanoid-robots-to-perform-live-surgery-a-world-first>

### Step 1 — Validate Google rich results

**Where:** [Google Rich Results Test](https://search.google.com/test/rich-results)

1. Open the Rich Results Test.
2. Choose the URL test.
3. Paste the representative post URL above.
4. Select the smartphone crawler and run the test.
5. Confirm the page is crawlable.
6. Confirm `Article` and `BreadcrumbList` are detected.
7. Open every detected item and confirm there are no errors.
8. Repeat with the desktop crawler.
9. If an error appears, do not increase the editorial publishing cap. Record the
   exact property and error, fix the schema, deploy, and rerun the test.

Warnings should also be reviewed. A harmless optional-property warning is not
the same as an error, but it should not be ignored without understanding it.

### Step 2 — Validate the full Schema.org graph

**Where:** [Schema.org Markup Validator](https://validator.schema.org/)

1. Open the validator.
2. Choose **Fetch URL**.
3. Paste the same production post URL.
4. Run the validation.
5. Confirm the page has no schema errors.
6. Inspect `Article`, `BreadcrumbList`, author, publisher, headline, canonical
   URL, images, and dates for obviously wrong values.
7. If the page differs from the Rich Results Test, treat Google’s result as the
   search eligibility result and Schema.org as the broader vocabulary check.

### Step 3 — Run PageSpeed Insights

**Where:** [PageSpeed Insights](https://pagespeed.web.dev/)

Test both:

- <https://letaiexplainai.com/blog>
- the representative generated post

For each URL:

1. Paste the URL and select **Analyze**.
2. Record the **Mobile** result.
3. Switch to **Desktop** and record that result.
4. Check the field data when it exists and the lab data when it does not.
5. Use these launch targets:
   - LCP below 2.5 seconds
   - CLS below 0.1
   - INP below 200 milliseconds when field data is available
6. If a target fails, inspect the diagnostics before changing code. Typical
   priorities are oversized hero media, render-blocking JavaScript, layout
   movement, and long main-thread tasks.

### Step 4 — Re-submit the sitemap

**Where:** [Google Search Console](https://search.google.com/search-console)

1. Sign in with the Google account that owns `letaiexplainai.com`.
2. Select the domain property `letaiexplainai.com`.
3. In the left navigation, open **Sitemaps**.
4. Under **Add a new sitemap**, enter:

   ```text
   api/sitemap.xml
   ```

5. Select **Submit**.
6. Confirm the submitted URL is:

   ```text
   https://letaiexplainai.com/api/sitemap.xml
   ```

7. Confirm the status becomes **Success**. Google may take time to refresh the
   result.
8. If it fails, first open the sitemap in a normal browser and confirm it returns
   XML with HTTP 200:

   ```bash
   curl -I https://letaiexplainai.com/api/sitemap.xml
   ```

### Step 5 — Inspect and request indexing for the first 3–5 generated posts

**Where:** Google Search Console → **URL inspection**

1. Copy a full published post URL from the Tuesday email or
   [Admin Blog](https://letaiexplainai.com/admin/blog).
2. Paste it into the URL Inspection search bar at the top of Search Console.
3. Select **Test live URL**.
4. Open the tested page details and inspect the rendered page/screenshot.
5. Confirm Google can see:
   - the correct H1
   - the opening answer/body copy
   - the self-referencing canonical URL
   - `Article` and `BreadcrumbList` structured data
   - no accidental `noindex`
6. Select **Request indexing**.
7. Repeat for the first 3–5 generated published posts.
8. Do not repeatedly request indexing for the same unchanged page.

Google’s retired standalone Mobile-Friendly Test should not be used. The current
mobile check is the smartphone Rich Results crawler plus Search Console’s live
URL inspection/render.

### Step 6 — Complete the 14-day check

**Where:** Google Search Console → **URL inspection** and **Indexing → Pages**

Run this 14 days after the first generated post was published.

**Schedule it now:** add a calendar event at
[Google Calendar](https://calendar.google.com/) or your preferred calendar. For
the representative post published on 2026-07-21, the 14-day check is
**2026-08-04**.

1. Inspect each generated post again.
2. Record whether it is indexed.
3. In **Indexing → Pages**, look for:
   - `Discovered – currently not indexed`
   - `Crawled – currently not indexed`
   - duplicate/canonical conflicts
   - blocked or server-error states
4. Open affected examples and compare them with the sitemap and canonical URL.
5. Fix technical problems before requesting indexing again.

### Step 7 — Complete the 30-day performance review

**Where:** Google Search Console → **Performance → Search results**

**Schedule it now:** add a second calendar event. For the representative post,
the 30-day review is **2026-08-20**.

1. Set the date range to the last 28 or 30 days.
2. Add a **Page** filter containing:

   ```text
   /blog/
   ```

3. Record total clicks, impressions, average CTR, and average position.
4. Open the **Pages** tab and identify the strongest and weakest generated posts.
5. Open the **Queries** tab for each meaningful post.
6. Compare the queries with the post’s title, description, opening answer, and
   intended search intent.
7. Use the result in the SEO Insights system:
   - metadata mismatch → propose a guarded metadata rewrite
   - strong new topic → create or promote a portfolio opportunity
   - content gap → generate a blog proposal
   - structural/routing gap → create a human-reviewed routing proposal

### Step 8 — Finish the admin mobile and cleanup-path check

**Where:** [Admin Blog](https://letaiexplainai.com/admin/blog), first in a normal
desktop browser and then at a 375-pixel-wide mobile viewport.

1. Open one of the Tuesday **draft-only** posts from the recap email. Do not use
   a published post that you want to keep as the disposable test.
2. At mobile width, open the **Write**, **Preview**, and **Meta** tabs.
3. Confirm every tab displays its content without horizontal scrolling.
4. Make a harmless draft edit, save it, reload the page, and confirm the edit
   persisted.
5. Confirm validation errors and save success feedback are readable on mobile.
6. Use a deliberately disposable draft to test the archive confirmation.
7. Cancel once to confirm cancellation is safe.
8. Reopen the confirmation and archive the disposable draft.
9. Confirm the success toast/status appears and the post leaves the active list.

### Remaining calibration note

The roadmap still records an exact manually forced one-post invocation as an
optional validation. Production already completed a scheduled run on
2026-07-21 that published one post and created two drafts, so no additional
forced publication is required for normal setup. Section 7 documents the
one-post command if an operator deliberately needs to reproduce that test.

## 3. Install the local Codex SEO skills

Do this once on any Mac that will operate the SEO workflow through Codex.

**Where:** Terminal, from the AI Timeline repository root.

```bash
cd /Users/wyliebrown/ai_timeline
mkdir -p "$HOME/.codex/skills"
for skill in AIBlogDraft AIDevPlanning AISEOReview AISlopReviewer AITechLeadReview AIUXLeadReview SEOAuditAgent; do
  ln -sfn "$(pwd)/.codex/skills/$skill" "$HOME/.codex/skills/$skill"
done
```

Then fully quit and reopen Codex.

To verify:

```bash
for skill in AIBlogDraft AIDevPlanning AISEOReview AISlopReviewer AITechLeadReview AIUXLeadReview SEOAuditAgent; do
  test -f "$HOME/.codex/skills/$skill/SKILL.md" && echo "OK $skill" || echo "MISSING $skill"
done
```

All lines should begin with `OK`.

## 4. Sign in and orient yourself

**Where:** [Admin login](https://letaiexplainai.com/admin/login)

1. Sign in with the production admin account.
2. Open [SEO Insights](https://letaiexplainai.com/admin/seo-insights).
3. Check the GSC health banner first.
4. Check the latest Monday digest status.
5. Check the latest Tuesday editorial status.
6. Confirm both pause controls are in the intended state:
   - Monday guarded mutations/auto-ship
   - Tuesday editorial publishing
7. Use the section navigation to open each lane.

| Page | What to do there |
| --- | --- |
| [Insights](https://letaiexplainai.com/admin/seo-insights) | Review digest health, findings, pause state, and Tuesday run |
| [Clusters](https://letaiexplainai.com/admin/seo-insights/clusters) | Review related 28-day and 90-day query demand |
| [Actions](https://letaiexplainai.com/admin/seo-insights/actions) | Audit, measure, or roll back shipped metadata rewrites |
| [Proposals](https://letaiexplainai.com/admin/seo-insights/proposals) | Approve/reject plans and link real drafts |
| [Experiments](https://letaiexplainai.com/admin/seo-insights/experiments) | Review D+14, D+28, and D+56 outcomes |
| [Packaging](https://letaiexplainai.com/admin/seo-insights/packaging) | Review search-result packaging and evergreen opportunities |
| [Portfolio](https://letaiexplainai.com/admin/seo-insights/portfolio) | Manage keyword opportunities and guarded Serper research |
| [Admin Blog](https://letaiexplainai.com/admin/blog) | Edit, publish, archive, or review generated posts |

Each SEO page has a **How to use…** help control. Use it for the page-specific
legend and action definitions.

## 5. The normal weekly operating loop

### Monday morning — automated input and digest

AWS runs these jobs automatically:

1. **08:15 UTC:** GSC weekly ingest.
2. **13:15 UTC / 9:15 AM New York during daylight saving time:** weekly SEO
   digest.

After 9:15 AM New York time:

1. Open [SEO Insights](https://letaiexplainai.com/admin/seo-insights).
2. Confirm GSC says the latest run succeeded.
3. Confirm the weekly digest says the latest run succeeded.
4. Review each finding and its lane:
   - **Auto-ship:** only narrowly guarded metadata changes
   - **Propose:** content, packaging, routing, or keyword work needing review
   - **Human-only:** infrastructure, high-risk, strategic, or ambiguous changes
5. Open [Actions](https://letaiexplainai.com/admin/seo-insights/actions) and
   verify any automatically shipped metadata changes.
6. Open [Proposals](https://letaiexplainai.com/admin/seo-insights/proposals) and
   review the queue before Tuesday.
7. Pause Tuesday editorial if the source data, site, or generated plans look
   unsafe.

### Run the Codex audit

**Where:** Codex, with `/Users/wyliebrown/ai_timeline` open.

Use this prompt:

```text
Run the weekly SEO digest with SEOAuditAgent. Review the live SEO Insights
findings, classify every actionable item into auto-ship, propose, or human-only,
and give me the review queue. Do not publish full posts without the required
quality and approval workflow.
```

You can also narrow the request:

```text
Use SEOAuditAgent to review only clustered opportunities.
```

```text
Use SEOAuditAgent to review only human-only findings.
```

```text
Use SEOAuditAgent to review the pending metadata rewrites.
```

The audit agent may prepare or ship only the narrow guarded metadata lane. Full
posts should use `AIBlogDraft`; borderline plans should use `AISEOReview`;
infrastructure work remains human-only.

### Tuesday — automated editorial publishing

At **15:00 UTC / 11:00 AM New York during daylight saving time**, EventBridge
runs the Tuesday editorial workflow.

The deployed payload and runner cap the normal run at three created posts and
three auto-publishes. Quality gates, duplication checks, and candidate quality
normally reduce the actual output; the system should never publish merely to
fill the cap.

1. Read the recap sent to `wyliedeveloper@gmail.com`.
2. Open every public URL in the email.
3. Check the headline, opening answer, citations/source links, images, internal
   links, canonical URL, and mobile layout.
4. Open every admin edit URL in the email.
5. Review draft-only results and their quality-gate reason.
6. Correct or archive any unsuitable output in
   [Admin Blog](https://letaiexplainai.com/admin/blog).
7. Confirm the Tuesday status panel matches the email counts.
8. If no candidate passed the gates, review the skip reasons rather than forcing
   publication.

The runner considers recent news first, then promoted portfolio opportunities,
then GSC/proposal backlog. It is intentionally allowed to create drafts when a
post is useful but not safe to publish.

### Friday or end of week — measurement cleanup

1. Open [Experiments](https://letaiexplainai.com/admin/seo-insights/experiments).
2. Review any due D+14, D+28, or D+56 checkpoint.
3. Mark the outcome according to the displayed evidence: won, flat, or lost.
4. Open [Actions](https://letaiexplainai.com/admin/seo-insights/actions).
5. Measure eligible metadata changes.
6. Roll back only when the before/after evidence supports it.

## 6. How to process each type of SEO work

### A. Metadata rewrite

1. Open a finding in **Insights**.
2. Review the affected page, query evidence, current title/description, and
   proposed replacement.
3. Select the metadata rewrite action.
4. Review the generated proposal.
5. Select **Ship it** only when it accurately describes the existing page.
6. Open **Actions** and confirm the audit row exists.
7. Wait for the experiment checkpoints before judging the result.
8. Use **Rollback** if measured evidence shows harm.

Never turn a metadata rewrite into an unsupported claim merely to increase CTR.

### B. New blog proposal

1. Open the insight or cluster.
2. Select **Generate proposal**.
3. Open **Proposals**.
4. Review the target query, intent, evidence, differentiation, outline,
   internal-link plan, and source requirements.
5. Approve or reject the proposal. Add a concrete rejection reason.
6. For an approved post, use Codex from the repository root:

   ```text
   Use AIBlogDraft to turn the approved SEO proposal into a source-backed blog
   draft. Preserve the proposal intent, apply the project voice and SEO gates,
   and do not publish until the draft passes its required review.
   ```

7. Review the resulting post in **Admin Blog**.
8. Link the real draft from the proposal page.
9. Publish only after factual, source, voice, SEO, and visual review.
10. Confirm the proposal changes to shipped and an experiment is created.

### C. Routing or packaging proposal

1. Open **Packaging** or the relevant finding.
2. Generate the evergreen or packaging/routing proposal.
3. Open **Proposals** and inspect the recommended destination, redirect,
   canonical, internal links, and collision risk.
4. Approve the plan only after checking existing URLs.
5. Implement through a normal code change and deploy; these proposals are not
   automatically applied.
6. Verify the live route, status code, canonical, navigation, and sitemap.
7. Link the deployed work back to the proposal/experiment record.

### D. Keyword portfolio opportunity

1. Open **Portfolio**.
2. Review source type, score, search intent, fit, freshness, competition, and
   existing-site overlap.
3. Select **Promote** for a strong opportunity.
4. Select **Refresh SERP sample** only when the cached sample is stale. Manual
   refresh has a seven-day cooldown.
5. Select **Archive opportunity** for irrelevant, duplicated, or strategically
   poor ideas.
6. Convert a promoted opportunity into a proposal or let Tuesday editorial
   consider it.

### E. SERP research and spend

**Where:** the spend card in
[Portfolio](https://letaiexplainai.com/admin/seo-insights/portfolio), with the
vendor account at [Serper](https://serper.dev/) used only for account/billing.

Current safeguards:

- search-only scope
- first result page only
- cache TTL: 28 days
- maximum 3 queries per run
- maximum 10 queries per day
- maximum 25 queries per week
- automatic top-up disabled

Use the admin spend card as the operational source. Do not enable automatic
top-up casually. If pricing or limits change, update the SSM pricing
configuration deliberately and verify the dashboard before running discovery.

## 7. Safe manual commands

Run all commands from:

```bash
cd /Users/wyliebrown/ai_timeline
```

Confirm AWS identity first:

```bash
aws sts get-caller-identity
```

The expected production region is `us-east-1`, stack is `ai-timeline-prod`, and
the shared worker is `ai-timeline-ingestion-prod`.

### Dry-run the Monday digest

This invokes the deployed Lambda and writes its response under
`tmp/seo-weekly-digest/`.

```bash
node scripts/seo-weekly-digest-runner.mjs --dry-run
```

Review the generated `summary.json`. A dry run must not ship rewrites, create
proposals, write measurements, or run Tuesday publishing.

### Force the Monday digest

Only use this after reviewing a dry run. This can mutate the guarded Monday
lanes, but does not run Tuesday editorial.

```bash
node scripts/seo-weekly-digest-runner.mjs --force
```

### Dry-run Tuesday editorial with a one-post calibration cap

```bash
aws lambda invoke \
  --region us-east-1 \
  --function-name ai-timeline-ingestion-prod \
  --cli-binary-format raw-in-base64-out \
  --payload '{"action":"seoEditorialTuesday","dryRun":true,"force":true,"maxPosts":1,"maxAutoPublish":0}' \
  /tmp/ai-timeline-seo-editorial-dry-run.json

jq . /tmp/ai-timeline-seo-editorial-dry-run.json
```

This is the safe diagnostic path. It publishes nothing.

### Force one Tuesday post

This is mutating and can create and publish one real production post. Use it
only after the dry-run result has been reviewed.

```bash
aws lambda invoke \
  --region us-east-1 \
  --function-name ai-timeline-ingestion-prod \
  --cli-binary-format raw-in-base64-out \
  --payload '{"action":"seoEditorialTuesday","force":true,"maxPosts":1,"maxAutoPublish":1}' \
  /tmp/ai-timeline-seo-editorial-one-post.json

jq . /tmp/ai-timeline-seo-editorial-one-post.json
```

The scheduled production run has already succeeded, so this command is not
needed for routine operation. It is a calibration/recovery command.

### Run GSC ingest manually

```bash
aws lambda invoke \
  --region us-east-1 \
  --function-name ai-timeline-ingestion-prod \
  --cli-binary-format raw-in-base64-out \
  --payload '{"action":"gscWeeklyIngest"}' \
  /tmp/ai-timeline-gsc-ingest.json

jq . /tmp/ai-timeline-gsc-ingest.json
```

Run this only when data is stale or after repairing OAuth.

### Verify the three AWS schedules

```bash
for rule in \
  ai-timeline-gsc-schedule-prod \
  ai-timeline-seo-digest-schedule-prod \
  ai-timeline-seo-editorial-tuesday-prod
do
  aws events describe-rule \
    --region us-east-1 \
    --name "$rule" \
    --query '[Name,State,ScheduleExpression]' \
    --output table
done
```

Every rule should say `ENABLED`.

### Inspect recent Lambda logs

**Where:** [AWS CloudWatch Logs in us-east-1](https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups)

Terminal alternative:

```bash
aws logs tail /aws/lambda/ai-timeline-ingestion-prod \
  --region us-east-1 \
  --since 2h \
  --follow
```

Stop the live tail with `Control-C`.

## 8. Pause controls and incident response

### Pause Monday guarded mutations

**Where:** [SEO Insights](https://letaiexplainai.com/admin/seo-insights)

1. Select **Pause auto-ship**.
2. Confirm the page shows the paused state.
3. Leave the dashboard available for read-only review.

Paused Monday runs still report health and findings but must not write
measurements, ship rewrites, create proposals, or promote keywords.

### Pause Tuesday publishing

**Where:** the Tuesday editorial status panel on **SEO Insights**.

1. Select **Pause Tuesday autopilot**.
2. Confirm the Tuesday status shows paused.
3. Resume only after the source-data, generation, publishing, or site incident is
   resolved.

The Tuesday pause is separate from Monday auto-ship.

### Repair GSC OAuth

Do this only when the admin GSC banner reports an OAuth/authentication failure.

**Where, part 1:** [Google Cloud Console credentials](https://console.cloud.google.com/apis/credentials)

1. Sign in to the Google project that owns the Search Console OAuth client.
2. Download the OAuth client JSON to `Downloads`.
3. Do not paste the client secret or refresh token into chat, notes, or shell
   history.

**Where, part 2:** Terminal at the repository root.

```bash
cd /Users/wyliebrown/ai_timeline
npm run gsc:oauth-rotate -- \
  --client-secret "$HOME/Downloads/client_secret_<actual-id>.json"
```

1. The command prints a Google authorization URL and starts a localhost callback.
2. Open the URL while signed into the Search Console owner account.
3. Grant read-only Search Console access.
4. Wait for `GSC authorization received`.
5. Return to Terminal.
6. Confirm the helper reports:
   - credentials stored in SSM `SecureString`
   - GSC ingest verification succeeded
   - SEO digest verification succeeded
7. Open **SEO Insights** and refresh.
8. Confirm the GSC banner is healthy.

The helper stores the new token directly in:

```text
/ai-timeline/prod/gsc-oauth-credentials-json
```

It safely forces the Monday digest with Tuesday publishing disabled.

### If Tuesday email fails but posts were created

1. Open the Tuesday status panel.
2. Use its public and admin links; do not rerun immediately.
3. Open **Admin Blog** and verify the posts directly.
4. Inspect CloudWatch logs for the email error.
5. Confirm the SES sender identity is verified.
6. Confirm the recipient and sender SSM parameters exist.
7. Repair email delivery, then use a dry run with test email if needed.

### If a generated post is wrong

1. Pause Tuesday autopilot if the issue may affect more than one post.
2. Open the post in **Admin Blog**.
3. Correct it, unpublish/archive it, or replace it as appropriate.
4. Check the canonical URL, internal links, sitemap, and any proposal linkage.
5. Record why the quality gate missed the problem.
6. Fix the generator/gate through the normal development workflow.
7. Run targeted tests and a one-post dry run before resuming.

## 9. Deploying SEO code changes

Do not deploy merely to operate the weekly workflow. Deploy only when code,
infrastructure, schema, or UI has changed.

### Before deployment

**Where:** Terminal at `/Users/wyliebrown/ai_timeline`.

```bash
npm ci
npm run typecheck
npm run lint
npm test -- --runInBand
```

Run targeted SEO and Playwright tests as appropriate:

```bash
npm run test:e2e
```

Review the exact changed files:

```bash
git status --short
git diff --check
```

### Deploy backend and infrastructure

```bash
./scripts/deploy-backend.sh
```

After deployment:

1. Confirm CloudFormation stack `ai-timeline-prod` is complete.
2. Confirm the three SEO EventBridge rules remain enabled.
3. Run a GSC ingest or Monday dry run.
4. Confirm the admin health/status surfaces load.
5. Inspect Lambda errors in CloudWatch.

If a Prisma migration was added, fetch `DATABASE_URL` from
`/ai-timeline/prod/database-url` without printing or committing it, then run:

```bash
npx prisma migrate deploy
```

### Deploy frontend

```bash
./scripts/deploy-frontend.sh
```

After deployment:

1. Open every SEO admin route listed in Section 4.
2. Test at desktop and mobile widths.
3. Verify loading, empty, populated, paused, and error states affected by the
   change.
4. Confirm the public blog and a post still return HTTP 200.
5. Invalidate/recheck CloudFront only through the canonical deploy script.

### SEO validation after a public-page change

Repeat the applicable parts of Section 2:

1. Rich Results Test.
2. Schema.org validator.
3. PageSpeed Insights on mobile and desktop.
4. Sitemap inclusion.
5. GSC live URL inspection after deployment.

## 10. Repeatable checklists

### Monday checklist

- Open SEO Insights after 9:15 AM New York time.
- Confirm GSC ingest succeeded.
- Confirm weekly digest succeeded.
- Review auto-shipped actions.
- Review human-only items.
- Review and approve/reject proposals.
- Review clusters and portfolio.
- Decide whether Tuesday can remain active.
- Run `SEOAuditAgent` in Codex when a deeper review is needed.

### Tuesday checklist

- Read the recap email.
- Open every published post.
- Open every admin draft/edit link.
- Review skipped and draft-only reasons.
- Fix or archive unsuitable output.
- Confirm counts in the dashboard match the email.
- Pause the runner if the problem is systemic.

### Monthly checklist

- Review GSC `/blog/` clicks, impressions, CTR, and position.
- Review indexing/coverage exclusions.
- Review due experiments and metadata outcomes.
- Review Serper usage, remaining credits, and spending controls.
- Keep automatic Serper top-up off unless deliberately approved.
- Review stale proposals and archive rejected opportunities.
- Sample at least one generated post in Rich Results Test and PageSpeed.
- Confirm all three AWS schedules remain enabled.

## 11. Security and cost rules

- Never paste Google OAuth tokens, client secrets, Anthropic keys, Serper keys,
  database URLs, or admin credentials into chat or documentation.
- Keep GSC OAuth credentials and the Serper key in AWS SSM.
- Do not print SSM secret values during routine health checks.
- Do not enable Serper automatic top-up without an explicit budget decision.
- Use dry runs before force/mutating commands.
- Keep Monday metadata auto-ship narrow.
- Treat infrastructure, routing, mass edits, unsupported claims, and ambiguous
  content changes as human-reviewed work.
- A failed quality gate is a successful safety outcome, not a reason to bypass
  the gate.

## 12. Quick “where do I go?” index

| Task | Go here |
| --- | --- |
| See SEO health and weekly digest | <https://letaiexplainai.com/admin/seo-insights> |
| Review clusters | <https://letaiexplainai.com/admin/seo-insights/clusters> |
| Review shipped changes | <https://letaiexplainai.com/admin/seo-insights/actions> |
| Approve proposals | <https://letaiexplainai.com/admin/seo-insights/proposals> |
| Review measurements | <https://letaiexplainai.com/admin/seo-insights/experiments> |
| Review packaging | <https://letaiexplainai.com/admin/seo-insights/packaging> |
| Review keywords/Serper | <https://letaiexplainai.com/admin/seo-insights/portfolio> |
| Edit generated posts | <https://letaiexplainai.com/admin/blog> |
| Inspect sitemap | <https://letaiexplainai.com/api/sitemap.xml> |
| Search Console/indexing | <https://search.google.com/search-console> |
| Rich results | <https://search.google.com/test/rich-results> |
| Full schema validation | <https://validator.schema.org/> |
| Performance test | <https://pagespeed.web.dev/> |
| Google OAuth client | <https://console.cloud.google.com/apis/credentials> |
| AWS Lambda | <https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#/functions> |
| EventBridge schedules | <https://us-east-1.console.aws.amazon.com/events/home?region=us-east-1#/rules> |
| CloudWatch logs | <https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups> |
| SSM parameters | <https://us-east-1.console.aws.amazon.com/systems-manager/parameters?region=us-east-1> |
| Serper account | <https://serper.dev/> |
