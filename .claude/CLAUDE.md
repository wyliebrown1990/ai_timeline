# AI Timeline Atlas

Interactive web app for exploring AI history from 1940s through modern LLMs.

## Commands

```bash
npm run dev          # Start Vite dev server (localhost:5173)
npm run build        # Production build
npm run typecheck    # TypeScript checking (run after code changes)
npm run test         # Jest unit tests
npm run test:e2e     # Playwright E2E tests
```

## Project Structure

```
src/
├── components/      # React components (PascalCase files)
├── pages/           # Route pages
├── hooks/           # Custom React hooks
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
- `type` for aliases, `interface` for extendable shapes
- Always handle loading, error, and empty states in UI
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`

## Key Patterns

- **State**: localStorage + React hooks/context (see `useUserProfile`, `useCheckpointProgress`)
- **Content**: Static JSON in `src/content/`, types in `src/types/`
- **Modals**: Fixed overlay + backdrop blur + escape key dismiss
- **Testing**: `data-testid` attributes on interactive elements

## IMPORTANT

- ALWAYS run `npm run typecheck` after making code changes
- Read existing code patterns before implementing new features
- Check `src/types/` for Zod schemas before creating new data structures
- Milestones and learning paths are in `src/content/`

## Rules (Auto-loaded by path)

Detailed standards are in `.claude/rules/`:
- `data-models.md` - Zod schemas for Event, Concept, Person, Org, Checkpoint
- `frontend.md` - React, Tailwind, state management patterns
- `backend.md` - AWS Lambda, DynamoDB, API design
- `design-system.md` - Colors, typography, component variants
- `content.md` - Content guidelines and validation
- `testing.md` - Test patterns and coverage requirements
