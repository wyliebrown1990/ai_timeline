# Finding Workflow

Handles one finding end to end.

## Steps

1. Identify whether this is a weekly insight or a packaging audit, plus the bucket/week/target page as applicable.
2. Read `seo_voice.md`, `slop_categories.md`, and the relevant bucket playbook.
3. Pull the finding detail from:
   - `/api/admin/seo/insights/:id` for weekly buckets
   - `/api/admin/seo/packaging/:id` for packaging audits
4. Decide the lane:
   - `auto_ship`
   - `propose`
   - `human_only`
5. Generate the lane artifact.
   - Packaging audits can only return `propose` or `human_only`.
6. Run the slop check.
7. Return the final recommendation with confidence and rationale.

## Output Shape

- lane
- confidence
- one-paragraph rationale
- artifact
- slop result
