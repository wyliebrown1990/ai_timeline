# Sprint SSR-2: Infra, Deploy Pipeline & Prod Rollout

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-07-01 by Claude (sprint created — no tasks started)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `build-and-deploy-security.md`, `frontend.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-Blog-SSR-Indexability.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm any prerequisite sprints' Definitions of Done are fully checked. If not, finish them first.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Ship SSR to production: package the SSR bundle into the API Lambda, route `letaiexplainai.com/blog*` through CloudFront to the API Gateway origin, add cache headers + invalidation-on-publish so posts go live instantly, and verify **every currently published post** serves full HTML from prod. This sprint is where "fix all our existing blogs" actually happens — runtime SSR fixes them all at once the moment the behavior flips.

**Priority**: HIGH (P0 initiative)
**Depends on**: Sprint SSR-1 (DoD fully checked)
**Estimated Effort**: 2–3 days
**Status**: Not started

---

## Prerequisites

- [ ] Sprint SSR-1 DoD fully checked (local SSR proven with `curl`)
- [ ] AWS CLI access to CloudFront distribution `E23Z9QNRPDI3HW`, Lambda `ai-timeline-api-prod`, and `infra/` SAM stack
- [ ] Snapshot current CloudFront config before touching it:
      `aws cloudfront get-distribution-config --id E23Z9QNRPDI3HW > /tmp/cf-config-backup-$(date +%s).json`

---

## Tasks

### 1. Recon existing CloudFront + edge setup (read-only, do first)

- [ ] Dump behaviors + origins: `aws cloudfront get-distribution-config --id E23Z9QNRPDI3HW | jq '.DistributionConfig | {Origins: .Origins.Items[].DomainName, Behaviors: [.CacheBehaviors.Items[]? | {PathPattern, TargetOriginId}], Default: .DefaultCacheBehavior.TargetOriginId}'`
- [ ] Confirm whether an API Gateway origin (`nhnkwe8o6i.execute-api…`) already exists (robots.txt implies a `/api/*` behavior does). Record findings in this file
- [ ] Confirm the Lambda@Edge viewer-request association (`ai-timeline-og-tags-edge`) and verify `infra/edge-og-tags/index.js` passes `/blog*` through untouched (it matches only `/news/:id` and `/glossary/:slug` today — must stay that way)

### 2. Lambda packaging of the SSR bundle

- [ ] Update `scripts/deploy-backend.sh` to run `npm run build:ssr` and copy `dist-ssr/` into the SAM build context so `server/src/ssr/blogSsr.ts` can import the built `entry-server` at runtime
- [ ] Confirm `infra/template.yaml` API function's bundling (esbuild/CodeUri) includes the SSR artifact; adjust `Metadata.BuildProperties`/includes as needed — no new Lambda, extend `ai-timeline-api-prod`
- [ ] Keep sourcemap hygiene: SSR artifacts in the Lambda are server-side (never served), but the deploy script must still never copy `dist-ssr` anywhere web-served. Add a guard comment in `deploy-frontend.sh` that `dist-ssr/` is backend-only
- [ ] Deploy backend: `./scripts/deploy-backend.sh`, then smoke test the SSR route direct at API Gateway:
      `curl -s https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/blog/<slug> | grep -c "<h2"` → ≥1
      (If API Gateway stage/proxy config doesn't route non-`/api` paths, fix the SAM `Events` definition — the function needs a `/blog/{proxy+}` event or an existing `{proxy+}` catch-all; record which.)

### 3. CloudFront behavior for /blog*

- [ ] Add (or reuse) the API Gateway origin with `OriginPath: /prod`
- [ ] Add cache behavior `PathPattern: /blog*` → API Gateway origin:
      - Allowed methods: GET, HEAD
      - Cache policy: cache by URL only (no cookies, no query strings except pagination param if the index uses one; no headers) — respect origin `Cache-Control` (`s-maxage=3600`)
      - Origin request policy: none of the viewer cookies/headers except `Accept-Encoding`; compress = true
- [ ] Apply with `aws cloudfront update-distribution` (edit the backed-up JSON; mind `IfMatch` ETag), wait for `Deployed`
- [ ] Verify precedence: `/blog*` behavior must not shadow or be shadowed by `/api/*` or the default S3 behavior — `curl -s https://letaiexplainai.com/api/blog?limit=1` still returns JSON, `curl -sL https://letaiexplainai.com/timeline | grep -c "<div id=\"root\">"` still serves the SPA shell

### 4. Invalidation on publish (future posts go live instantly)

- [ ] Add the dependency first: `npm i @aws-sdk/client-cloudfront` — the repo's AWS SDK is **v3** (`@aws-sdk/client-s3`, `-lambda`, `-ssm`, `-ses`, `-cloudwatch-logs` are installed; no v2 `aws-sdk`, no cloudfront client yet). Match the existing v3 client style in `cloudfrontInvalidator.ts`
- [ ] Hook invalidation at the **service layer** where the status transition commits — `server/src/services/blogAdmin.ts` (the controllers in `controllers/blogAdmin.ts` — `publishPost`/`updatePost`/`schedulePost`/`archivePost` — are thin wrappers over it). Call `cloudfront:CreateInvalidation` on `E23Z9QNRPDI3HW` for paths `["/blog", "/blog/<slug>", "/blog/tag/*", "/blog/author/*"]` — fire-and-forget with error logging; a failed invalidation must not fail the publish request
- [ ] Add the distribution ID as a Lambda env var in `infra/template.yaml` (no hardcoding in TS) and grant the function IAM `cloudfront:CreateInvalidation` scoped to the distribution ARN
- [ ] Unit test: publishing a post triggers an invalidation call with the right paths (mock the CloudFront SDK client)
- [ ] Verify from prod: publish a trivial edit to an existing post via `/admin/blog`, confirm the change is visible in raw `curl` HTML within ~1 minute

### 5. Tests

- [ ] Unit tests from task 4 (invalidation paths, publish-not-blocked-on-failure)
- [ ] Integration test: SSR route sets `Cache-Control: public, max-age=300, s-maxage=3600` on 200 and `no-store` on 404
- [ ] `npm test` — all pass; `npm run typecheck` — zero errors; `npm run lint` — zero errors

### 6. Deploy

- [ ] Backend: `./scripts/deploy-backend.sh` (includes SSR bundle)
- [ ] Frontend: `./scripts/deploy-frontend.sh` (hydration changes from SSR-1 must be live BEFORE the CloudFront behavior flips, or SSR pages won't hydrate)
- [ ] CloudFront behavior update (task 3) LAST, then `aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/blog*"`

### 7. Backend Validation — every published post, not a sample

- [ ] Script the sweep (keep it in `scripts/verify-blog-ssr.sh` — it's reused in SSR-4 and by /AIBlogDraft):
  ```bash
  # For every published slug from /api/blog: raw HTML must contain <h1>, ≥1 <h2>,
  # ld+json Article, canonical, og:title, meta description. Print PASS/FAIL per slug.
  curl -s "https://letaiexplainai.com/api/blog?limit=100" | jq -r '.posts[].slug' | while read s; do …; done
  ```
- [ ] Run it: **100% PASS** for all published posts
- [ ] Bot-UA spot check (must get the SAME SSR HTML — no cloaking on /blog):
      `curl -s -A "GPTBot" https://letaiexplainai.com/blog/<slug> | grep -c "<h2"` → ≥1; repeat with `Googlebot`, `ClaudeBot`, `PerplexityBot`
- [ ] `curl -s -o /dev/null -w "%{http_code}" https://letaiexplainai.com/blog/does-not-exist` → `404`
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 30m` — zero errors, zero `[SSR] render failed`
- [ ] Cache behavior sanity: second `curl -sI` of same post shows CloudFront `X-Cache: Hit from cloudfront`

### 8. Browser Validation (prod, via `/Browser` skill)

- [ ] `agent-browser open https://letaiexplainai.com/blog/<slug>` → screenshot; visually identical to pre-SSR
- [ ] `agent-browser snapshot -i` → exercise subscribe form + a related-post click (hydration works on prod assets)
- [ ] Dark mode + mobile viewport (`agent-browser resize 375 812`) screenshots
- [ ] Zero console errors (hydration warnings count), zero 4xx/5xx in network tab
- [ ] Lighthouse on one post: Performance ≥90, Accessibility ≥95, SEO ≥95 (SSR should improve LCP — record before/after)

---

## Definition of Done

- [ ] All tasks above checked
- [ ] `curl -sL https://letaiexplainai.com/blog/<slug>` returns full article HTML for **every** published post (sweep script 100% PASS)
- [ ] Blog index, tag, and author archives also SSR from prod
- [ ] Publishing/updating a post is visible in raw HTML within ~1 minute (invalidation works)
- [ ] `/api/*` and all non-blog SPA routes unaffected
- [ ] `.claude/rules/backend.md` + `.claude/CLAUDE.md` updated: `/blog*` CloudFront behavior, SSR packaging in deploy-backend, invalidation-on-publish, `scripts/verify-blog-ssr.sh`
- [ ] Zero TypeScript errors, zero lint errors, tests passing; CloudWatch + browser console clean
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```
scripts/deploy-backend.sh                      (modify — build + package SSR bundle)
scripts/deploy-frontend.sh                     (modify — dist-ssr guard comment)
scripts/verify-blog-ssr.sh                     (new — all-posts raw-HTML sweep)
infra/template.yaml                            (modify — /blog route event, env var, IAM invalidation)
server/src/services/blogAdmin.ts               (modify — fire invalidation on status transitions)
server/src/services/cloudfrontInvalidator.ts   (new — thin @aws-sdk/client-cloudfront v3 wrapper)
tests/unit/services/cloudfrontInvalidator.test.ts (new — Jest only runs tests/unit/**)
package.json                                    (modify — add @aws-sdk/client-cloudfront)
.claude/rules/backend.md                       (modify — document new infra)
.claude/CLAUDE.md                              (modify — SSR deploy note)
```

---

## Blocked — PM decision needed

(None yet. Note: no new billable resources — invalidations stay within CloudFront's 1,000 free paths/month at current publish volume. If publish volume ever makes invalidations non-trivial, revisit with a versioned-path cache strategy.)

---

## Slop Findings (AISlopReviewer — 2026-07-02)

Verified against the codebase. Inline corrections above already applied for the SDK dependency, the invalidation service layer, and test paths.

### P1

(None.)

### P2

- [x] **[Cat 13 — Dependency hygiene]** Task 4. Fixed inline: `@aws-sdk/client-cloudfront` is **not installed** — the repo has v3 clients for s3/lambda/ssm/ses/cloudwatch-logs only. Added an explicit `npm i` task and pinned the wrapper to v3 style (no `aws-sdk` v2 anywhere in the repo).
- [x] **[Cat 9 — Tests wrong directory]** Task 5 + Files Touched. Fixed inline: `server/src/services/__tests__/…` won't run under Jest (`testMatch` = `tests/unit/**`). Moved to `tests/unit/services/cloudfrontInvalidator.test.ts`.
- [x] **[Cat 12 — Correct layer]** Task 4. Fixed inline: DB writes for publish/archive/schedule live in `server/src/services/blogAdmin.ts`, not the controller. The invalidation belongs where the status transition commits.

### P3

- [ ] **[Cat 16 — IaC vs CLI]** Task 3 changes the CloudFront distribution via `aws cloudfront update-distribution`. Confirmed the distribution `E23Z9QNRPDI3HW` is **not in any IaC file** (`infra/template.yaml` / `infra/edge-og-tags/template.yaml` don't declare it), so a SAM change is impossible without first importing it. The CLI path is acceptable here (it's not a console click-op), but: (a) script the change as a committed, re-runnable file under `scripts/` or `infra/` rather than ad-hoc shell, and (b) see `roadmap/slop-ledger.md` — logged the "CloudFront distribution unmanaged by IaC" debt so it's tracked, not lost.

### Slop Avoided (positive)

- Correctly relies on the API Gateway `/{proxy+}` catch-all (`infra/template.yaml:113-118`) + `serverless-http` passing the full path unmodified — a top-level `/blog` route genuinely reaches Express (verified: no `/api` basepath stripping). The architecture is sound.
- Extends `ai-timeline-api-prod` rather than adding a new Lambda — matches the "extend, don't create" AWS rule.
- Correctly identifies that the production domain serves `/blog` from CloudFront→S3 today, so the CloudFront behavior change (not just the Lambda route) is the real prerequisite.
- Keeps `dist-ssr/` backend-only with a guard comment — no risk of the SSR bundle reaching the public CDN (`build-and-deploy-security.md`).
