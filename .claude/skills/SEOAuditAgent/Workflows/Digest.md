# Digest Workflow

Runs the weekly all-buckets sweep.

## Steps

1. Read `seo_voice.md`, `slop_categories.md`, and each bucket playbook.
2. Call `GET /api/admin/seo/health`.
   - If `paused === true`, produce a digest-only run. Do not call mutating endpoints such as `ship-rewrite` or `generate-proposal`.
   - If `agentRun` is null, treat the run as the system's first digest and say so plainly.
3. Run the feedback loop before reviewing fresh findings:
   - `GET /api/admin/seo/feedback/pending`
   - `POST /api/admin/seo/actions/:id/measure` for each eligible action
   - capture any measured gains or regressions for the digest and `seo_voice.md`
4. Pull the selected week from `/api/admin/seo/insights` for all four buckets.
5. Skip findings already marked `dismissed` or `shipped`.
6. Classify each finding into `auto_ship`, `propose`, or `human_only`.
7. When active, execute the lane mutations:
   - `auto_ship`: call `POST /api/admin/seo/insights/:id/ship-rewrite` only for qualifying metadata rewrites and stay under the weekly ship cap.
   - `propose`: for `content_gap` or `trend_signal` findings with confidence `>= 0.60`, call `POST /api/admin/seo/insights/:id/generate-proposal`.
   - If `generate-proposal` returns `409`, treat it as already queued recently and keep going.
8. Produce a ranked digest:
   - top auto-ship candidates
   - proposals queued this run
   - top human-only escalations
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
