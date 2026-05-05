# SEO Insights Operating System

Use this file as the canonical reference for LAEA's SEO automation stack. Keep top-level `AGENTS.md` and `CLAUDE.md` short; link here instead of restating the same operational details.

## What it is

The SEO Insights system is LAEA's operator-facing SEO workflow. It combines:

- weekly Google Search Console ingest
- clustered query mining across `28d` and `90d` windows
- proposal generation for blog, routing, packaging, and keyword opportunities
- a guarded auto-ship lane for low-risk metadata rewrites
- an experiment ledger for scheduled measurement
- external discovery through Google Trends and Serper with spend guardrails

## Main admin surfaces

- `/admin/seo-insights` — dashboard, pause switch, digest summary
- `/admin/seo-insights/clusters` — clustered `28d` / `90d` demand
- `/admin/seo-insights/actions` — shipped rewrite audit log
- `/admin/seo-insights/proposals` — blog / routing / packaging proposal queue
- `/admin/seo-insights/experiments` — scheduled measurement ledger
- `/admin/seo-insights/packaging` — SERP packaging audit lane
- `/admin/seo-insights/portfolio` — keyword discovery backlog with Serper spend card

## Core backend areas

- `server/src/services/gsc/` — GSC OAuth client, ingest, bucketing, clustering
- `server/src/services/seo/` — proposal generation, metadata rewrites, experiments, Serper, packaging audits, portfolio discovery
- `server/src/controllers/seoAdmin.ts` — admin endpoints
- `server/src/routes/seoAdmin.ts` — admin route wiring
- `src/pages/admin/Seo*.tsx` — admin SEO surfaces

## Weekly operating loop

1. GSC ingest runs on AWS EventBridge every Monday at `06:00 UTC`.
2. The primary weekly digest scheduler is AWS EventBridge `SeoWeeklyDigestRule`, which invokes the existing `IngestionFunction` with `{"action":"seoWeeklyDigest"}` every Monday at `13:15 UTC`.
3. `server/src/services/seo/weeklyDigestRunner.ts` reads health, pause state, run status, insights, packaging, portfolio state, and Serper spend state directly through backend services.
4. It classifies findings into:
   - auto-ship
   - propose
   - human-only
5. Status and summary are written back into the admin dashboard via `/ai-timeline/<env>/seo-agent-last-run`.

Fallbacks:

- Local manual dry-run: `node scripts/seo-weekly-digest-runner.mjs --dry-run` invokes the deployed ingestion Lambda
- Local `launchd` fallback: `scripts/install-seo-weekly-digest-launchd.sh`
- Codex Desktop automation remains optional/manual; it is not the source of truth for weekly scheduling.

Reference:

- `.claude/schedules/seo-weekly.md`
- `.claude/skills/SEOAuditAgent/SKILL.md`
- `infra/template.yaml`
- `server/src/services/seo/weeklyDigestRunner.ts`

## Auto-ship rules

Auto-ship is intentionally narrow.

- Today it only covers metadata rewrites on existing published blog posts.
- It does not auto-publish new blog posts.
- It does not auto-apply packaging fixes or routing plans.
- The pause switch must disable auto-mutating behavior while keeping read-only visibility alive.

Primary audit surface:

- `/admin/seo-insights/actions`

## Proposal and experiment lifecycle

Typical blog-backed flow:

1. proposal created
2. proposal approved or moved to `drafting`
3. `/AIBlogDraft` creates a real `BlogPost`
4. proposal links to the draft or published post
5. proposal moves to `shipped`
6. experiment row is created with `D+14`, `D+28`, and `D+56` checkpoints

Important:

- experiments are created when a real post is linked or when a metadata rewrite ships
- proposals by themselves do not create experiments

## Discovery sources

The portfolio mixes:

- `gsc_cluster`
- `google_trends`
- `serp_sample`
- `editorial_seed`

Serper is paid and must stay guarded:

- search-only scope
- first-page automatic sampling only
- cache reuse before new spend
- run/day/week caps
- spend visible in admin and weekly digest
- auto top-up must stay off

## Current SSM parameters used by SEO ops

- `/ai-timeline/prod/gsc-oauth-credentials-json`
- `/ai-timeline/prod/gsc-site-url`
- `/ai-timeline/prod/seo-agent-paused`
- `/ai-timeline/prod/seo-agent-last-run`
- `/ai-timeline/prod/serper-api-key`
- `/ai-timeline/prod/serper-pricing-json`

## Skills and docs that compose with this system

- `.claude/skills/AIBlogDraft/SKILL.md`
- `.claude/skills/SEOAuditAgent/SKILL.md`
- `roadmap/PLAN-SEO-Insights-Pilot.md`
- `roadmap/Sprint-SEOI-8-Clustered-Opportunity-Mining.md`
- `roadmap/Sprint-SEOI-9-Topic-Pods-Experiment-Ledger.md`
- `roadmap/Sprint-SEOI-10-News-to-Evergreen-SERP-Packaging.md`
- `roadmap/Sprint-SEOI-11-External-Discovery-Keyword-Portfolio.md`
