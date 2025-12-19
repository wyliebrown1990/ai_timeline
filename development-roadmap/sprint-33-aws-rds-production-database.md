# Sprint 33: AWS RDS Production Database

**Impact**: Critical | **Effort**: Medium | **Dependencies**: Sprints 29-32 (News Ingestion Pipeline)

## Overview

Migrate from local SQLite (which doesn't work in Lambda) to AWS RDS PostgreSQL for production. This is a **blocking requirement** - all database features from Sprints 29-32 are non-functional in production until this is complete.

**Goal**: All database-dependent features work in production Lambda environment.

---

## Problem Statement

The current architecture uses SQLite with `better-sqlite3` adapter:

```typescript
// server/src/db.ts - CURRENT (BROKEN IN LAMBDA)
if (IS_LAMBDA) {
  console.warn('Database disabled in Lambda environment');
  return null;  // ← All DB features fail in production!
}
```

This means the following features from Sprints 29-32 **do not work in production**:
- News source management (Sprint 29)
- Article ingestion and storage (Sprint 29)
- AI analysis pipeline (Sprint 30)
- Content drafts and validation (Sprint 30)
- Review queue and publishing (Sprint 31)
- Duplicate detection (Sprint 32)
- Error tracking (Sprint 32)
- Pipeline settings/controls (Sprint 32)
- Glossary management (Sprint 32)

---

## Architecture Change

```
BEFORE (Local Only):                    AFTER (Production Ready):
┌─────────────┐                         ┌─────────────┐
│   Lambda    │                         │   Lambda    │
│  (no DB)    │                         │  (VPC)      │
└─────────────┘                         └──────┬──────┘
                                               │
                                        ┌──────▼──────┐
                                        │   RDS       │
                                        │ PostgreSQL  │
                                        │  (private)  │
                                        └─────────────┘
```

---

## Tasks

### 33.1 Create RDS PostgreSQL Instance

- [ ] Create RDS PostgreSQL instance via AWS Console or CloudFormation
- [ ] Configuration:
  - Engine: PostgreSQL 15.x
  - Instance class: `db.t3.micro` (free tier eligible)
  - Storage: 20 GB gp2 (expandable)
  - Multi-AZ: No (cost savings, enable later if needed)
  - Public access: No (security)
  - Database name: `ai_timeline`
- [ ] Create security group allowing inbound PostgreSQL (5432) from Lambda security group
- [ ] Note connection endpoint, port, credentials

```yaml
# Example CloudFormation (can also create via Console)
RDSInstance:
  Type: AWS::RDS::DBInstance
  Properties:
    DBInstanceIdentifier: ai-timeline-db
    DBInstanceClass: db.t3.micro
    Engine: postgres
    EngineVersion: '15.4'
    MasterUsername: !Sub '{{resolve:ssm:/ai-timeline/prod/db-username}}'
    MasterUserPassword: !Sub '{{resolve:ssm:/ai-timeline/prod/db-password}}'
    DBName: ai_timeline
    AllocatedStorage: 20
    StorageType: gp2
    PubliclyAccessible: false
    VPCSecurityGroups:
      - !Ref RDSSecurityGroup
    DBSubnetGroupName: !Ref DBSubnetGroup
```

### 33.2 VPC Configuration for Lambda

- [ ] Create VPC (or use existing default VPC)
- [ ] Create at least 2 private subnets in different AZs (required for RDS)
- [ ] Create security group for Lambda functions
- [ ] Create security group for RDS (allows inbound from Lambda SG)
- [ ] Create VPC endpoints for AWS services Lambda needs:
  - SSM (for parameter store access)
  - Secrets Manager (optional)
  - CloudWatch Logs
- [ ] Or configure NAT Gateway for internet access (more expensive)

```yaml
# Lambda Security Group
LambdaSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Security group for AI Timeline Lambda functions
    VpcId: !Ref VPC
    SecurityGroupEgress:
      - IpProtocol: -1
        CidrIp: 0.0.0.0/0

# RDS Security Group
RDSSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Security group for AI Timeline RDS
    VpcId: !Ref VPC
    SecurityGroupIngress:
      - IpProtocol: tcp
        FromPort: 5432
        ToPort: 5432
        SourceSecurityGroupId: !Ref LambdaSecurityGroup
```

### 33.3 Store Database Credentials in SSM Parameter Store

- [ ] Store credentials securely (not in code):
  ```bash
  aws ssm put-parameter --name "/ai-timeline/prod/db-host" --value "your-rds-endpoint.rds.amazonaws.com" --type SecureString
  aws ssm put-parameter --name "/ai-timeline/prod/db-username" --value "postgres" --type SecureString
  aws ssm put-parameter --name "/ai-timeline/prod/db-password" --value "your-secure-password" --type SecureString
  aws ssm put-parameter --name "/ai-timeline/prod/database-url" --value "postgresql://user:pass@host:5432/ai_timeline" --type SecureString
  ```

### 33.4 Update Prisma Schema for PostgreSQL

- [x] Update `prisma/schema.prisma` datasource:

```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

- [x] Review and update SQLite-specific syntax:
  - `@default(uuid())` → `@default(dbgenerated("gen_random_uuid()"))` or keep `@default(uuid())`
  - DateTime handling (PostgreSQL is more strict)
  - Text fields (no size limits needed in PostgreSQL)
  - JSON fields can use native `Json` type instead of `String`

- [x] Update models with PostgreSQL optimizations:

```prisma
model IngestedArticle {
  // ... existing fields

  // Change JSON stored as String to native Json type
  // analysisError can stay as String

  @@index([sourceId])
  @@index([analysisStatus])
  @@index([ingestedAt])
  @@index([isDuplicate])
}

model ContentDraft {
  // draftData can become Json type for better querying
  draftData   Json     // Was: String (JSON stored as text)

  @@index([articleId])
  @@index([status])
  @@index([contentType])
}
```

### 33.5 Update db.ts for RDS Connection

- [x] Remove SQLite/better-sqlite3 dependency
- [x] Update `server/src/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // DATABASE_URL is set via environment variable (SSM in Lambda)
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### 33.6 Update SAM Template for VPC and Database

- [x] Update `infra/template.yaml`:

```yaml
Parameters:
  # ... existing parameters
  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: VPC for Lambda functions
  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
    Description: Private subnets for Lambda (at least 2 AZs)
  LambdaSecurityGroupId:
    Type: AWS::EC2::SecurityGroup::Id
    Description: Security group for Lambda functions

Globals:
  Function:
    # ... existing config
    VpcConfig:
      SecurityGroupIds:
        - !Ref LambdaSecurityGroupId
      SubnetIds: !Ref SubnetIds
    Environment:
      Variables:
        NODE_ENV: production
        DATABASE_URL: !Sub '{{resolve:ssm:/ai-timeline/${Environment}/database-url}}'

Resources:
  ApiFunction:
    # ... existing config
    Policies:
      # ... existing policies
      - Version: '2012-10-17'
        Statement:
          # ... existing statements
          - Effect: Allow
            Action:
              - ec2:CreateNetworkInterface
              - ec2:DescribeNetworkInterfaces
              - ec2:DeleteNetworkInterface
              - ec2:AssignPrivateIpAddresses
              - ec2:UnassignPrivateIpAddresses
            Resource: '*'

  IngestionFunction:
    # Same VPC config and policies as ApiFunction
```

### 33.7 Create and Run Migrations

- [ ] Generate new migration for PostgreSQL:
  ```bash
  # Set DATABASE_URL to RDS instance
  export DATABASE_URL="postgresql://user:pass@your-rds-endpoint:5432/ai_timeline"

  # Create migration
  npx prisma migrate dev --name init_postgresql

  # Or for production (no prompt):
  npx prisma migrate deploy
  ```

- [ ] Verify all tables created:
  ```bash
  npx prisma studio  # Opens browser UI to inspect database
  ```

### 33.8 Seed Initial Data

- [ ] Create seed script for production:
  ```bash
  # Seed news sources
  npx prisma db seed
  ```

- [ ] Or manually insert via Prisma Studio:
  - Add initial news sources (The Neuron Daily, Forward Future AI)
  - Create default PipelineSettings record

### 33.9 Update Package Dependencies

- [x] Remove SQLite dependencies:
  ```bash
  npm uninstall better-sqlite3 @prisma/adapter-better-sqlite3
  ```

- [x] Keep Prisma (works with PostgreSQL out of the box):
  ```bash
  npm install @prisma/client prisma
  ```

- [x] Update `package.json` if any SQLite-specific scripts exist

### 33.10 Local Development Setup

- [x] Create `.env.local` template for local PostgreSQL (or keep SQLite for local dev):

**Option A: Local PostgreSQL (recommended for parity)**
```bash
# .env.local
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_timeline_dev"
```

Run local PostgreSQL via Docker:
```bash
docker run --name ai-timeline-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ai_timeline_dev -p 5432:5432 -d postgres:15
```

**Option B: Keep SQLite for local, PostgreSQL for prod**
- Maintain two Prisma schema files or use environment-based provider
- More complex, not recommended

### 33.11 Test All Database Features

- [ ] Test in production after deployment:
  - [ ] News source CRUD (`/api/admin/sources`)
  - [ ] Article fetching (`POST /api/admin/sources/:id/fetch`)
  - [ ] Article listing (`GET /api/admin/articles`)
  - [ ] Article analysis (`POST /api/admin/articles/:id/analyze`)
  - [ ] Content drafts (`GET /api/admin/review/queue`)
  - [ ] Review workflow (approve/reject)
  - [ ] Pipeline stats (`GET /api/admin/pipeline/stats`)
  - [ ] Error tracking
  - [ ] Pipeline controls (pause/resume)
  - [ ] Glossary CRUD (`/api/admin/glossary`)
  - [ ] Duplicate detection

### 33.12 Update Deployment Scripts

- [x] Update deployment documentation in CLAUDE.md:

```markdown
## Database Migrations (Production)

Before deploying code changes that modify the database schema:

1. Set DATABASE_URL to production RDS:
   ```bash
   export DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text)
   ```

2. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

3. Then deploy Lambda:
   ```bash
   cd infra && sam build && sam deploy --no-confirm-changeset
   ```
```

---

## Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                              VPC                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     Private Subnets                          │    │
│  │                                                              │    │
│  │  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐  │    │
│  │  │   Lambda     │     │   Lambda     │     │    RDS      │  │    │
│  │  │   (API)      │────▶│ (Ingestion)  │────▶│ PostgreSQL  │  │    │
│  │  │              │     │              │     │             │  │    │
│  │  └──────┬───────┘     └──────────────┘     └─────────────┘  │    │
│  │         │                                                    │    │
│  └─────────┼────────────────────────────────────────────────────┘    │
│            │                                                          │
│  ┌─────────▼────────┐                                                │
│  │  VPC Endpoints   │  (SSM, CloudWatch Logs)                        │
│  └──────────────────┘                                                │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
            │
            │ (API Gateway - Public)
            ▼
    ┌───────────────┐
    │  CloudFront   │
    │   + S3        │
    │  (Frontend)   │
    └───────────────┘
```

---

## Cost Estimates (Monthly)

| Resource | Estimated Cost |
|----------|----------------|
| RDS db.t3.micro (750 hrs free tier) | $0 (first year) / ~$15 after |
| RDS Storage (20 GB) | ~$2.30 |
| NAT Gateway (if used) | ~$32 + data transfer |
| VPC Endpoints (alternative to NAT) | ~$7.50 per endpoint |
| Lambda (existing) | Minimal change |

**Recommendation**: Use VPC Endpoints instead of NAT Gateway to save costs.

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `prisma/schema.prisma` | MODIFY | Change provider to postgresql, update types |
| `server/src/db.ts` | REWRITE | Remove SQLite, use standard Prisma client |
| `infra/template.yaml` | MODIFY | Add VPC config, DATABASE_URL env var |
| `package.json` | MODIFY | Remove better-sqlite3, @prisma/adapter-better-sqlite3 |
| `.env.example` | MODIFY | Update DATABASE_URL format |
| `CLAUDE.md` | MODIFY | Add migration deployment docs |

---

## Rollback Plan

If issues occur after RDS deployment:

1. Lambda functions will fail gracefully (return 500 errors)
2. Frontend static content remains accessible
3. To rollback:
   - Revert SAM template to remove VPC config
   - Redeploy Lambda without VPC
   - Database features will be disabled (same as before)

---

## Success Criteria

- [ ] RDS PostgreSQL instance running and accessible from Lambda
- [ ] All Prisma migrations applied successfully
- [ ] Lambda functions connect to RDS without errors
- [ ] All admin features work in production:
  - [ ] Source management
  - [ ] Article ingestion
  - [ ] AI analysis
  - [ ] Review queue
  - [ ] Publishing
  - [ ] Pipeline monitoring
  - [ ] Glossary management
- [ ] Scheduled ingestion runs successfully at midnight EST
- [ ] No increase in Lambda cold start time >2 seconds
- [ ] Database credentials secured in SSM Parameter Store

---

## Notes

- RDS free tier includes 750 hours/month of db.t3.micro for 12 months
- Consider RDS Proxy for connection pooling if Lambda concurrency increases
- Enable automated backups for RDS (7-day retention minimum)
- Consider enabling deletion protection on RDS instance
- Monitor RDS metrics in CloudWatch (connections, CPU, storage)
