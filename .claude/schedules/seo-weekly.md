# SEO Weekly Automation

Committed reference for the weekly SEO digest automation.

## Primary schedule

- Scheduler: AWS EventBridge `SeoWeeklyDigestRule`
- Target: existing Lambda `IngestionFunction`
- Payload: `{"action":"seoWeeklyDigest"}`
- Schedule expression: `cron(15 13 ? * MON *)`
- Local time during DST: Monday `9:15 AM America/New_York`
- Source of truth: `infra/template.yaml`

The digest intentionally runs after the GSC weekly ingest rule, which is scheduled for Monday `06:00 UTC`.

## Runner

- Shared service: `server/src/services/seo/weeklyDigestRunner.ts`
- Lambda entry: `server/src/ingestionLambda.ts` dispatches `event.action === "seoWeeklyDigest"`
- Local manual wrapper: `node scripts/seo-weekly-digest-runner.mjs --dry-run` invokes the deployed ingestion Lambda
- Local fallback installer: `scripts/install-seo-weekly-digest-launchd.sh`

The Lambda path composes directly with backend services. It does not read admin username/password SSM parameters and does not call the public admin API from inside AWS. The local wrapper intentionally invokes Lambda instead of importing the service directly because production RDS is private to the VPC.

## Required behavior

1. Read health, pause state, latest run status, and Serper spend state first.
2. Exit idempotently when the latest successful run already covers the most recent finalized GSC week, unless `force` is true.
3. If paused, produce a digest-only run and suppress all mutations, including measurement writes, rewrites, proposals, packaging proposals, and keyword promotions.
4. Measure eligible feedback actions only while active.
5. Pull all four insight buckets for `lastWeekCovered`, packaging page 1 limit 100, and scored keyword portfolio page 1 limit 25.
6. Auto-ship only guarded metadata rewrites, capped at 3 per run.
7. Queue eligible content, packaging, and keyword proposals only while active; treat `409` as already queued or ineligible.
8. Promote at most 2 scored keyword ideas per run, excluding `editorial_seed`.
9. Persist run status through `setLatestAgentRunStatus()` on success or failure.

## Operator surface

MVP delivery does not depend on Discord or email. The operator interface is:

- `/admin/seo-insights`
- `/admin/seo-insights/actions`
- `/admin/seo-insights/proposals`
- `/admin/seo-insights/packaging`
- `/admin/seo-insights/portfolio`

## Fallback note

`launchd` is only a local fallback because it depends on Wylie's Mac being awake and online. EventBridge remains the primary scheduler.
