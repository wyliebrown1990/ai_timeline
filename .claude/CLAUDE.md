# AI Timeline Atlas

Interactive web app exploring AI history from 1940s to today.

**Production:** https://letaiexplainai.com

## Quick Commands
```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build
npm run typecheck    # TypeScript check

# Chrome extension (admin "Submit this article" toolbar button)
cd extension && bun install && bun run build   # → extension/dist/
# Sideload: chrome://extensions → Developer mode → Load unpacked → extension/dist/
# Stable extension ID: lfakkoeldmhibejkjolcmenpmlokbled

# Package the extension for download from /admin/extension
./scripts/build-extension-zip.sh   # → public/ai-timeline-extension.zip + .json metadata
# deploy-frontend.sh runs this automatically before npm run build
```

## AWS Resources
| Component | Resource |
|-----------|----------|
| Frontend | S3 (`ai-timeline-frontend-1765916222`) + CloudFront (`E23Z9QNRPDI3HW`) |
| Backend | API Gateway + Lambda (`ai-timeline-api-prod`) |
| API | https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod |
| Database | RDS PostgreSQL (`ai-timeline-db`) in VPC |

## Deployment
Always deploy via `scripts/deploy-frontend.sh` — it strips sourcemaps and applies correct cache headers. See `.claude/rules/build-and-deploy-security.md` for rationale.

```bash
# Frontend (preferred)
./scripts/deploy-frontend.sh

# Frontend (ad-hoc — MUST keep --exclude "*.map" on every sync)
npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --exclude "*.map" --delete
aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"

# Backend
cd infra && sam build && sam deploy --no-confirm-changeset

# Database migrations (run before backend deploy if schema changed)
export DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text)
npx prisma migrate deploy
```

## Skills

- `/AIBlogDraft` — create and publish SEO-aware blog drafts
- `/SEOAuditAgent` — review `/admin/seo-insights`, classify findings into action lanes, and prepare metadata or brief artifacts without publishing slop

## Project Structure
```
src/
├── components/      # React components
├── pages/           # Route pages (admin/, public profiles)
├── services/        # API clients
├── types/           # Zod schemas + TypeScript types
└── contexts/        # React Context providers

server/
├── controllers/     # Route handlers
├── services/        # Business logic
│   └── ingestion/   # News pipeline (fetchers, analysis, entity extraction)
└── routes/          # Express routes
```

## Key Routes

### Public
- `/` - Timeline
- `/people/:slug` - Person profile
- `/organizations/:slug` - Organization profile
- `/glossary` - AI terms

### Admin (`/admin/*`)
- `/admin` - Dashboard
- `/admin/review` - Content review queue
- `/admin/milestones` - Milestone management
- `/admin/sources` - News sources (RSS, YouTube, Playwright)
- `/admin/articles` - Ingested articles
- `/admin/key-figures` - Key figures (legacy)
- `/admin/person-drafts` - AI-detected person review

## Code Patterns
- **Modals**: Fixed overlay + backdrop blur + escape key dismiss
- **Hover cards/tooltips**: Use React Portal to `document.body` with `position: fixed`
- **API calls**: Use services in `src/services/api.ts`
- **Testing**: Add `data-testid` attributes on interactive elements

## Rules (in `.claude/rules/`)
- `data-models.md` - Database schemas (Person, Organization, Milestone, etc.)
- `subject-taxonomy.md` - 3-level subject hierarchy, ContentSubject linking
- `news-ingestion.md` - Multi-source ingestion pipeline
- `backend.md` - AWS Lambda, API design
- `build-and-deploy-security.md` - **No sourcemaps, no secrets in frontend bundle, no env leaks. Read before touching build or deploy.**
- `spam-protection.md` - Rate limiting, trust system, moderation
- `frontend.md` - React + Vite patterns
