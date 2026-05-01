# Winnable Losses Playbook

## Default lane

`auto_ship` when:

- confidence is `>= 0.8`
- impressions are `>= 100`
- target type is `blog_post`

Otherwise downgrade to `propose` or `human_only`.

## Action

- rewrite `seoTitle`
- rewrite `seoDescription`
- keep the canonical URL and slug intact
- keep the title under 60 characters where possible
- keep the description roughly 140-160 characters

## Confidence formula

Start at `1.0`, then subtract:

- `0.2` for any slop-category hit
- `0.15` if the title would change by more than half
- `0.1` if the page was already touched in the last 14 days

## Hard refusals

- never auto-ship if the page has open moderation or review concerns
- never auto-ship the same page twice within 30 days
- never auto-ship body copy
