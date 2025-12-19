# AI Timeline Atlas

Interactive web app for exploring AI history from 1940s through modern LLMs.

## Commands
```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build (or `npx vite build` to skip typecheck)
npm run typecheck    # TypeScript checking - run after code changes
```

## AWS Hosting
**Production URL:** https://letaiexplainai.com (CloudFront: d33f170a3u5yyl.cloudfront.net)

| Component | Resource |
|-----------|----------|
| Frontend | S3 (`ai-timeline-frontend-1765916222`) + CloudFront (`E23Z9QNRPDI3HW`) |
| Custom Domain | letaiexplainai.com |
| Backend API | API Gateway + Lambda (`ai-timeline-api-prod`) |
| API Endpoint | https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod |
| Database | RDS PostgreSQL (`ai-timeline-db`) in VPC |
| Region | us-east-1 |

## Database

### Local Development (PostgreSQL via Docker)
```bash
# Start local PostgreSQL
docker run --name ai-timeline-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=ai_timeline_dev \
  -p 5432:5432 -d postgres:15

# Set DATABASE_URL in .env (already configured)
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_timeline_dev"

# Run migrations
npx prisma migrate dev

# Seed initial data
npm run db:seed
```

### Database Migrations (Production)
Before deploying code changes that modify the database schema:

```bash
# 1. Get production DATABASE_URL from SSM
export DATABASE_URL=$(aws ssm get-parameter \
  --name "/ai-timeline/prod/database-url" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text)

# 2. Run migrations
npx prisma migrate deploy

# 3. Then deploy Lambda
cd infra && sam build && sam deploy --no-confirm-changeset
```

### SSM Parameters Required
```bash
# Database connection (required for Lambda)
/ai-timeline/prod/database-url  # PostgreSQL connection string

# VPC configuration (required for SAM deploy)
# Pass as parameters: VpcId, SubnetIds, LambdaSecurityGroupId
```

## Deployment
**Frontend** - Deploy to S3 and invalidate CloudFront:
```bash
npm run build
aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete
aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"
```

**Backend** - Deploy Lambda via SAM:
```bash
cd infra && sam build && sam deploy --no-confirm-changeset
```

## Project Structure
```
src/
├── components/      # React components (PascalCase)
├── pages/           # Route pages
├── hooks/           # Custom hooks (useUserProfile, useCheckpointProgress)
├── contexts/        # React Context providers
├── types/           # Zod schemas + TypeScript types
├── services/        # API clients
├── content/         # Static content (milestones, paths, checkpoints)
└── lib/             # Utilities
development-roadmap/ # Sprint planning documents
```

## Code Style
- TypeScript strict mode, no `any`
- Named exports over default exports
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`

## Key Patterns
- **State**: localStorage + React hooks/context
- **Modals**: Fixed overlay + backdrop blur + escape key dismiss
- **Hover cards/tooltips**: MUST use React Portal (`createPortal`) to `document.body` with `position: fixed`. CSS z-index alone cannot escape parent stacking contexts.
- **Testing**: `data-testid` attributes on interactive elements

## Rules (in `.claude/rules/`)
- `data-models.md` - Zod schemas for Event, Concept, Person, Org, Checkpoint
- `frontend.md` - React, Tailwind, state management patterns
- `backend.md` - AWS Lambda, DynamoDB, API design
