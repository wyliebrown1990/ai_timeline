# Bucket Workflow

Deep-dives one bucket.

## Steps

1. Confirm the bucket and target week.
2. Read `seo_voice.md`, `slop_categories.md`, and the matching playbook:
   - `winnable-losses.md`
   - `content-gaps.md`
   - `trend-signals.md`
   - `decay.md`
   - `serp-packaging.md`
3. Pull the matching source data:
   - weekly buckets → up to 50 findings from `/api/admin/seo/insights`
   - packaging backlog → current rows from `/api/admin/seo/packaging`
4. Rank the findings by opportunity and confidence.
5. Produce the lane decision and artifact for each finding.
6. Never auto-ship packaging fixes. Downgrade anything weird, voice-fragile, structurally risky, or unclear to `human_only`.

## Output Shape

- bucket thesis
- ranked findings
- artifact per finding
- slop warnings
