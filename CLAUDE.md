# AI Timeline Atlas

Start here, then go deeper only when needed.

## Primary references

- `AGENTS.md` — shared repo orientation, deploy commands, routes, and skills
- `.claude/CLAUDE.md` — Claude-specific project context
- `.claude/rules/backend.md` and `.claude/rules/frontend.md` — implementation rules
- `.claude/reference/seo-insights.md` — SEO Insights operating system, weekly automation, proposals, experiments, and Serper guardrails

## High-signal reminders

- Frontend deploys go through `./scripts/deploy-frontend.sh`
- Backend deploys go through `./scripts/deploy-backend.sh`
- If Prisma schema changes, run the migration before backend deploy
- SEO work should use the existing admin surfaces and services, not ad hoc scripts, unless the task is explicitly recovery or backfill

## SEO-specific entry points

- Weekly ops: `.claude/schedules/seo-weekly.md`
- Blog drafting: `.claude/skills/AIBlogDraft/SKILL.md`
- SEO review agent: `.claude/skills/SEOAuditAgent/SKILL.md`
