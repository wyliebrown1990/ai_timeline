# Digest Workflow

Runs the weekly all-buckets sweep.

## Steps

1. Read `seo_voice.md`, `slop_categories.md`, and each bucket playbook, including `serp-packaging.md`.
2. Call `GET /api/admin/seo/health`.
   - If `paused === true`, produce a digest-only run. Do not call mutating endpoints such as `ship-rewrite` or `generate-proposal`.
   - If `agentRun` is null, treat the run as the system's first digest and say so plainly.
3. Run the feedback loop before reviewing fresh findings:
   - `GET /api/admin/seo/feedback/pending`
   - `POST /api/admin/seo/actions/:id/measure` for each eligible action
   - capture any measured gains or regressions for the digest and `seo_voice.md`
4. Pull the selected week from `/api/admin/seo/insights` for all four buckets, then pull the current packaging backlog from `/api/admin/seo/packaging` and the scored keyword backlog from `/api/admin/seo/portfolio?status=scored&limit=25`.
5. Skip weekly findings already marked `dismissed` or `shipped`. For packaging audits, skip anything that already has a recent duplicate proposal or that has no actionable recommendation. For keyword portfolio rows, skip anything that is not `status=scored`, is sourced from `editorial_seed`, is not a `blog_post`, or has `overallScore < 60`.
6. Classify each weekly finding or packaging audit into `auto_ship`, `propose`, or `human_only`.
7. When active, execute the lane mutations:
   - `auto_ship`: call `POST /api/admin/seo/insights/:id/ship-rewrite` only for qualifying metadata rewrites and stay under the weekly ship cap.
   - `propose`: for `content_gap` or `trend_signal` findings with confidence `>= 0.60`, call `POST /api/admin/seo/insights/:id/generate-proposal`.
   - `propose`: for packaging audits with clear canonical promotion, call `POST /api/admin/seo/packaging/:id/propose-evergreen`.
   - `propose`: for packaging audits where the current page is right but the packaging is weak, call `POST /api/admin/seo/packaging/:id/propose-fix`.
   - `propose`: for keyword portfolio rows, call `POST /api/admin/seo/portfolio/:id/promote` for at most the top 2 eligible non-editorial discovery rows in that run, ranked by overall score.
   - If `generate-proposal` returns `409`, treat it as already queued recently and keep going.
   - Treat `409` from packaging proposal endpoints the same way: note the duplicate in the digest and keep going.
   - Treat `409` from keyword-portfolio promotion the same way: note the ineligible or already-promoted candidate in the digest and keep going.
   - Never auto-ship packaging changes. H1, structured-data, canonical, and broad internal-link changes stay human-approved.
8. Produce a ranked digest:
   - top auto-ship candidates
   - proposals queued this run
   - packaging proposals queued this run
   - discovery nominations queued from the keyword portfolio
   - scored discovery rows deferred because of the weekly cap
   - top human-only escalations
   - packaging escalations that need product or IA judgment
   - any measured deltas from the prior week
9. Run the slop check before returning any artifact.
10. Do not rely on Discord or email for MVP delivery. Persist run status and treat the admin pages as the operator surface for the weekly run.
11. Persist the run outcome via `PUT /api/admin/seo/run-status` with:
    - `status`
    - `startedAt`
    - `completedAt`
    - `weekStart`
    - `shippedCount`
    - `proposalCount`
    - `humanOnlyCount`
    - `measuredCount`
    - `digestUrl`
    - `errorMessage`

## Voice Append Protocol

After each digest run, append one block per measured or shipped action to `seo_voice.md`.

Required block shape:

```md
## YYYY-MM-DD — `<action-or-snapshot-id>` (`<lane>` on `<target-path>`)

### Outcome
- Week reviewed: `YYYY-MM-DD`
- Query: `<query or page_aggregate>`
- Action: `<metadata_rewrite | propose | human_only | measured_regression>`
- Confidence: `0.00`
- Result: `<kept | paused | proposed rollback | needs review>`

### Keep
- `<what worked>`

### Avoid
- `<what did not land>`

### Next Time
- `<tight rule the next run should remember>`
```

If there is no shipped or measured action to append, do not invent one.

## Output Shape

- summary paragraph
- finding-by-finding lane decisions
- blockers and unusual patterns
- any recommendation to pause the agent
