# SEO Weekly Automation

Committed reference for the weekly SEO digest automation.

## Schedule

- Local time: Monday 9:00 AM America/New_York
- UTC equivalent during DST: Monday 13:00 UTC
- Cadence: weekly
- Status target: `ACTIVE` once run-status persistence and the admin banner are in place; no external notification sink is required for MVP

## Workspace

- Repo: `/Users/wyliebrown/ai_timeline`
- Execution environment: local cron automation

## Prompt

```text
Run the SEOAuditAgent weekly digest for letaiexplainai.com using the most recent finalized GSC week.

Required steps:
1. Read `.claude/skills/SEOAuditAgent/SKILL.md`, `Workflows/Digest.md`, `seo_voice.md`, and the latest dry-run note.
2. Authenticate against the live admin API using the existing admin credentials already configured for this workspace.
3. Call `GET /api/admin/seo/health` first.
   - If `paused === true`, produce a digest-only run and do not mutate the system. That means no auto-ship rewrites and no generated `SeoProposal` rows.
4. Run the feedback loop:
   - `GET /api/admin/seo/feedback/pending`
   - `POST /api/admin/seo/actions/:id/measure` for each eligible action
5. Pull this week's findings from `GET /api/admin/seo/insights` for all four buckets, up to 50 per bucket, and pull the packaging backlog from `GET /api/admin/seo/packaging?page=1&limit=100`.
6. For each weekly finding or packaging audit, classify it into `auto_ship`, `propose`, or `human_only` using the SEOAuditAgent skill rules.
7. For `auto_ship`, call `POST /api/admin/seo/insights/:id/ship-rewrite` only if:
   - the agent is not paused
   - the finding is a blog metadata rewrite
   - the run would stay at or below 3 auto-shipped rewrites this week
8. For `propose`, call `POST /api/admin/seo/insights/:id/generate-proposal` only if:
   - the agent is not paused
   - the finding bucket is `content_gap` or `trend_signal`
   - the lane confidence is at least `0.60`
   - the proposal has not already been queued in a recent week
   - If the endpoint returns `409`, treat it as "already queued recently", mention that in the digest, and continue without failing the run.
   - For packaging audits with a clear canonical destination, call `POST /api/admin/seo/packaging/:id/propose-evergreen`.
   - For packaging audits where the page is right but the packaging is weak, call `POST /api/admin/seo/packaging/:id/propose-fix`.
   - If a packaging proposal endpoint returns `409`, treat it as "already queued recently", mention that in the digest, and continue without failing the run.
   - Never auto-ship packaging changes. Canonical, H1, schema, and broad internal-link changes remain human-approved.
9. Build a digest that covers:
   - last week's measured actions
   - this week's shipped actions
   - this week's proposals queued
   - this week's packaging proposals queued
   - this week's human-only escalations
   - packaging audits that need product or IA judgment
   - any blocker such as missing GSC data or zero qualifying blog opportunities
10. Do not rely on Discord or email for MVP delivery. Treat persisted run status plus the admin pages as the operator interface for the weekly run.
11. Append one entry per shipped or measured action to `seo_voice.md` using the append protocol in `Workflows/Digest.md`.
12. Persist the run summary with `PUT /api/admin/seo/run-status`.
   - Include `status`, `startedAt`, `completedAt`, `weekStart`, `shippedCount`, `proposalCount`, `humanOnlyCount`, `measuredCount`, `digestUrl`, and `errorMessage`.
13. If any step fails after the run starts, still attempt to:
   - persist `PUT /api/admin/seo/run-status` with `status=failed`
   - include the failure reason in `errorMessage`
```

## Current Reality

- Production currently has live GSC data and a working pause switch.
- Production currently has zero qualifying blog-query rows in the recent backfill window, so many weekly runs will legitimately produce `0` auto-ships until blog traffic appears.
- Production currently has a live packaging backlog, so future runs should review both weekly insight buckets and packaging audits.
- The automation can run without any external notification sink because `/admin/seo-insights` is the primary operator surface.
