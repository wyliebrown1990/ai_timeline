# SERP Packaging Playbook

## Default lane

Always `propose` unless the audit is ambiguous enough to downgrade to `human_only`.

## Action

- prefer `propose-evergreen` when repeated demand is landing on a generic or transient page and the canonical destination is clear
- prefer `propose-fix` when the current page is the right destination but its title signal, metadata, breadcrumb support, structured-data coverage, or internal-link support is weak
- include the evidence window, page path, issue list, and why the fix should improve how Google presents the page
- keep canonical, H1, schema, and broad internal-link changes explicitly human-approved

## Hard refusals

- do not auto-ship packaging changes from this playbook
- do not recommend unsupported or spammy schema just to increase eligibility
- do not expand archive pages when the right answer is to route demand toward an evergreen destination
- if the packaging issue is really an information-architecture or product-navigation problem, downgrade to `human_only` and suggest `/AITechLeadReview` or `/AIUXLeadReview`
