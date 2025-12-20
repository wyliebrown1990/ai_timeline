---
paths: infra/**/*.{ts,yaml,yml}, server/**/*.ts
---

# Backend & Infrastructure Rules

## AWS Architecture

```
CloudFront → API Gateway → Lambda (VPC) → RDS PostgreSQL
                                      ↓
                              NAT Instance → Internet (RSS, Anthropic API)
```

### Core Resources

| Resource | ID/Name | Notes |
|----------|---------|-------|
| API Gateway | nhnkwe8o6i | Rate limited 100 req/s |
| API Lambda | ai-timeline-api-prod | 30s timeout, 512MB |
| Ingestion Lambda | ai-timeline-ingestion-prod | 300s timeout |
| RDS PostgreSQL | ai-timeline-db | db.t3.micro, PostgreSQL 15 |
| NAT Instance | i-090d928fcfb2841f7 | t3.micro for VPC internet |

### VPC Configuration
- Lambda runs in private subnets (us-east-1b, us-east-1c)
- NAT Instance in public subnet (us-east-1a) for outbound internet
- RDS in private subnet, accessible only from Lambda SG

## Database (PostgreSQL + Prisma)

### Connection
```typescript
// server/src/db.ts - Uses Prisma 7.x with PrismaPg adapter
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
```

### Migrations
```bash
# Local development
npx prisma migrate dev --name description

# Production (run before Lambda deploy)
export DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text)
npx prisma migrate deploy
```

## Lambda Functions

### API Function (`server/src/lambda.ts`)
- Express app wrapped with `serverless-http`
- Handles all `/api/*` routes
- 30s timeout (API Gateway limit)

### Ingestion Function (`server/src/ingestionLambda.ts`)
- Scheduled via EventBridge (daily 5:00 AM UTC)
- Fetches RSS, runs AI analysis
- 300s timeout for batch processing

### Deployment (SAM)
```bash
cd infra
sam build
sam deploy --no-confirm-changeset \
  --parameter-overrides \
    VpcId=vpc-025e4607eafae104c \
    SubnetIds=subnet-0a0879f8ada49ff8f,subnet-09f38a0620df0ce1e \
    LambdaSecurityGroupId=sg-0cf3d578d162c94dc
```

## API Design

### Public Endpoints
```
GET  /api/milestones         # Timeline events
GET  /api/milestones/:id     # Single milestone
GET  /api/glossary           # AI terminology
GET  /api/health             # Health check
```

### Admin Endpoints (require JWT)
```
POST /api/auth/login         # Get JWT token
GET  /api/admin/sources      # News sources
GET  /api/admin/articles     # Ingested articles
GET  /api/admin/review/queue # Pending drafts
GET  /api/admin/pipeline/stats # Pipeline health
```

### Response Format
```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 50, "total": 200 }
}
```

## Security

- JWT authentication for admin routes (`server/src/middleware/auth.ts`)
- Credentials in SSM Parameter Store (not environment variables)
- API Gateway rate limiting (100 req/s, 200 burst)
- VPC isolation for database

## Monitoring

**Dashboard**: `AI-Timeline-Production`
```
https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AI-Timeline-Production
```

**Log Groups**:
- `/aws/lambda/ai-timeline-api-prod`
- `/aws/lambda/ai-timeline-ingestion-prod`

**Alarms**:
- `AI-Timeline-Lambda-Errors` - API errors > 5 in 5 min
- `AI-Timeline-Ingestion-Errors` - Any ingestion error

## SSM Parameters

```
/ai-timeline/prod/database-url      # PostgreSQL connection string
/ai-timeline/prod/jwt-secret        # JWT signing secret
/ai-timeline/prod/admin-username    # Admin login
/ai-timeline/prod/admin-password    # Admin password
/ai-timeline/prod/anthropic-api-key # Claude API key
/ai-timeline/prod/cors-origin       # Allowed CORS origin
```
