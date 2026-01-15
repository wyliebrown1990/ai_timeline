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
cd infra && sam build && sam deploy --no-confirm-changeset
```

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
```

## Monitoring
- CloudWatch Dashboard: `AI-Timeline-Production`
- Log Groups: `/aws/lambda/ai-timeline-api-prod`, `/aws/lambda/ai-timeline-ingestion-prod`
