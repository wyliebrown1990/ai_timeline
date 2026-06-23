# Backend & Infrastructure

## AWS Architecture
```
CloudFront → API Gateway → Lambda (VPC) → RDS PostgreSQL
                                      ↓
                              NAT Instance → Internet
```

| Resource | ID/Name |
|----------|---------|
| API Gateway | nhnkwe8o6i |
| API Lambda | ai-timeline-api-prod (30s timeout) |
| Ingestion Lambda | ai-timeline-ingestion-prod (300s timeout) |
| RDS | ai-timeline-db (PostgreSQL 15) |

## Deployment
```bash
./scripts/deploy-backend.sh
```

Use the backend deploy script instead of calling `sam build` directly so Prisma Client is regenerated and SAM does a clean build after schema changes.

## API Endpoints

### Public
```
GET  /api/milestones
GET  /api/milestones/:id
GET  /api/milestones/:id/linked-persons
GET  /api/persons
GET  /api/persons/:slug
GET  /api/persons/search?q=
GET  /api/organizations
GET  /api/organizations/:slug
GET  /api/glossary
```

### Admin (JWT required)
```
POST /api/auth/login

# Content Management
GET/POST    /api/admin/milestones
PUT/DELETE  /api/admin/milestones/:id
POST        /api/admin/milestones/:id/linked-persons
GET/POST    /api/admin/persons
PUT/DELETE  /api/admin/persons/:id
GET/POST    /api/admin/organizations
PUT/DELETE  /api/admin/organizations/:id

# Key Figures (legacy)
GET/POST    /api/admin/key-figures
POST        /api/admin/key-figures/generate-profile
POST        /api/admin/key-figures/process-all-drafts

# Ingestion Pipeline
GET/POST    /api/admin/sources
POST        /api/admin/sources/test
GET         /api/admin/articles
GET         /api/admin/review/queue
POST        /api/admin/review/:id/approve
GET         /api/admin/pipeline/stats

# Entity Drafts
GET         /api/admin/person-drafts
POST        /api/admin/person-drafts/:id/approve
POST        /api/admin/person-drafts/:id/merge
POST        /api/admin/person-drafts/:id/reject
```

## Database

Prisma ORM with PostgreSQL. Connection in `server/src/db.ts`.

```bash
# Migrations
npx prisma migrate dev --name description     # Local
npx prisma migrate deploy                      # Production (set DATABASE_URL first)
```

## SSM Parameters
```
/ai-timeline/prod/database-url
/ai-timeline/prod/jwt-secret
/ai-timeline/prod/admin-username
/ai-timeline/prod/admin-password
/ai-timeline/prod/anthropic-api-key
/ai-timeline/prod/cors-origin
/ai-timeline/prod/gsc-oauth-credentials-json
/ai-timeline/prod/gsc-site-url
/ai-timeline/prod/seo-agent-paused
/ai-timeline/prod/seo-agent-last-run
```

## Chrome extension CORS

The admin API accepts `chrome-extension://<id>` as a CORS origin so the AI Timeline Submit
extension can call `/api/auth/login`, `/api/admin/articles/scrape`, and `/api/admin/articles/submit`
directly from the popup. Allowlist is exact-match string equality (no globs) — every distinct
extension ID needs its own SSM entry in `/ai-timeline/prod/cors-origin` (comma-separated).

After updating SSM, the Lambda needs to re-resolve the parameter. SAM template hash doesn't change
when only the SSM value moves, so `sam deploy` may report "no changes." Force a refresh with:

```bash
# 1. Update SSM
aws ssm put-parameter --name /ai-timeline/prod/cors-origin --type String --overwrite \
  --value "https://letaiexplainai.com,https://www.letaiexplainai.com,chrome-extension://<id>"

# 2. Push the same value directly to the Lambda env to trigger reconfiguration
ENV=$(aws lambda get-function-configuration --function-name ai-timeline-api-prod --query 'Environment.Variables' --output json \
  | jq '.CORS_ORIGIN = "<new-value>"')
aws lambda update-function-configuration --function-name ai-timeline-api-prod --environment "{\"Variables\":$ENV}"
```

Rationale and full sprint context: `roadmap/Sprint-Ext-1-Backend-Prep.md`.

## Monitoring
- CloudWatch Dashboard: `AI-Timeline-Production`
- Log Groups: `/aws/lambda/ai-timeline-api-prod`, `/aws/lambda/ai-timeline-ingestion-prod`

## SEO Automation

- Use `.claude/skills/SEOAuditAgent/` as the operator-facing skill layer for weekly SEO finding review.
- The unattended weekly digest is scheduled by EventBridge `SeoWeeklyDigestRule` in `infra/template.yaml`.
- `SeoWeeklyDigestRule` targets the existing `IngestionFunction` with payload `{"action":"seoWeeklyDigest","runEditorial":false}`; do not add a second Lambda for the weekly runner.
- `server/src/services/seo/weeklyDigestRunner.ts` is the shared service used by the ingestion Lambda; local dry-runs invoke that Lambda instead of connecting to private RDS directly.
- The Lambda path composes directly with backend services and does not use admin username/password SSM parameters.
- The runner must persist successful and failed run status through `setLatestAgentRunStatus()` so `/admin/seo-insights` remains the operator surface.
- The skill reads `/api/admin/seo/insights` output for human/operator review and delegates full draft writing to `/AIBlogDraft`.
- Weekly SEO feedback + control endpoints live under:
  - `GET /api/admin/seo/health`
  - `GET /api/admin/seo/feedback/pending`
  - `POST /api/admin/seo/actions/:id/measure`
  - `PUT /api/admin/seo/pause`
  - `PUT /api/admin/seo/run-status`
