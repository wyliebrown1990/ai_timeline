# AI Timeline Atlas

A "reference atlas + guided path" web app for exploring the history and evolution of artificial intelligence.

## Project Vision

Build a beautiful, user-friendly timeline visualization that lets users explore AI history from foundations (1940s) through modern LLMs. The default entry point guides users through: **Transformer (2017) → GPT-3 → ChatGPT → GPT-4**.

Users can zoom (decade → year → month), filter by category, explore concepts with hover definitions, and dive into primary sources through a citation drawer.

## Key References

- @PROJECT_PLAN.md - Full technical plan and content strategy
- @starter_50_events.json - Initial 50 timeline events with schema examples

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ with App Router, React 18+, TypeScript 5+
- **Styling**: Tailwind CSS + shadcn/ui components
- **Animation**: Framer Motion for smooth transitions
- **Timeline**: visx or D3.js for semantic zoom timeline
- **State**: React Query for server state, Zustand for client state

### Backend (AWS)
- **API**: API Gateway + Lambda (or Lambda Function URLs + CloudFront)
- **Database**: DynamoDB for events, concepts, people, orgs
- **Search**: OpenSearch Serverless for full-text search and faceting
- **Media**: S3 + CloudFront CDN for images and assets
- **Auth**: Cognito (admin-only at launch)
- **Observability**: CloudWatch logs, X-Ray tracing

### Content Pipeline
- **Source of Truth**: YAML/MDX files in Git → CI deploys to DynamoDB
- **Linting**: CI enforces primary sources, date validation, concept link resolution

## Core UX Principles

1. **Mobile-first responsive** - Beautiful on phone, tablet, and desktop
2. **Semantic zoom** - Decade → Year → Month with smooth transitions
3. **Event clustering** - Aggregate when zoomed out, expand when zoomed in
4. **Concept linking** - `[[ConceptName]]` in markdown renders as interactive tooltips
5. **Citation-first** - Every event requires at least one primary source
6. **Accessibility** - WCAG 2.1 AA compliant, keyboard navigable

## Project Structure (Target)

```
ai_timeline/
├── .claude/                    # Claude Code configuration
│   ├── CLAUDE.md              # This file
│   └── rules/                 # Modular rules by topic
├── apps/
│   └── web/                   # Next.js frontend
│       ├── app/               # App Router pages
│       ├── components/        # React components
│       ├── lib/               # Utilities and hooks
│       └── styles/            # Global styles
├── packages/
│   ├── content/               # YAML/MDX content files
│   │   ├── events/            # Timeline events
│   │   ├── concepts/          # Concept definitions
│   │   ├── people/            # Person profiles
│   │   └── orgs/              # Organization profiles
│   ├── schemas/               # Zod schemas + TypeScript types
│   └── ui/                    # Shared UI components
├── infra/                     # AWS CDK or SAM templates
├── scripts/                   # Content linting, deployment scripts
└── starter_50_events.json     # Initial seed data
```

## Commands

```bash
# Development
pnpm dev           # Start Next.js dev server
pnpm lint          # Run ESLint + Prettier
pnpm typecheck     # TypeScript type checking
pnpm test          # Run tests

# Content
pnpm content:lint  # Validate content files
pnpm content:sync  # Deploy content to DynamoDB

# Infrastructure
pnpm infra:deploy  # Deploy AWS infrastructure
```

## Coding Standards

- Use TypeScript strict mode everywhere
- Prefer named exports over default exports
- Use `type` for type aliases, `interface` for extendable shapes
- Component files: PascalCase (e.g., `TimelineCanvas.tsx`)
- Utility files: camelCase (e.g., `formatDate.ts`)
- Always handle loading, error, and empty states in UI
- Write meaningful commit messages with conventional commits format

## Current Phase

**Phase A: Foundations**
- Define schemas (Event, Concept, Person, Org) and citation structure
- Build frontend skeleton: Start Here, Timeline, Event panel, Citation drawer
- Build content linting and CI deployment to DynamoDB
