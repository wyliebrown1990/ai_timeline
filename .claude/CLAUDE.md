# AI Timeline Atlas

Interactive web app for exploring AI history from 1940s through modern LLMs.

## Commands
```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build (or `npx vite build` to skip typecheck)
npm run typecheck    # TypeScript checking - run after code changes
```

## Deployment - CRITICAL
Deploy to BOTH S3 buckets and invalidate BOTH CloudFront distributions:
```bash
aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete
aws s3 sync dist/ s3://ai-timeline-frontend-prod/ --delete
aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"
aws cloudfront create-invalidation --distribution-id E23NUZWAYKEKUN --paths "/*"
```
| CloudFront ID | S3 Bucket |
|---------------|-----------|
| E23Z9QNRPDI3HW | ai-timeline-frontend-1765916222 |
| E23NUZWAYKEKUN | ai-timeline-frontend-prod |

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
