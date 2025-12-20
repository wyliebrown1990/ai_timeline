# Sprint 39: Static JSON Cleanup & Deprecation

**Impact**: Low (housekeeping) | **Effort**: Low | **Dependencies**: Sprints 35-38 (All migrations complete)

## Overview

Final cleanup sprint to remove deprecated static JSON files, unused content loaders, and S3 static data endpoints. This sprint should only be executed after verifying all content is successfully served from the database API.

**Pre-requisite**: ALL previous migration sprints (35-38) must be complete and verified in production.

---

## Pre-Cleanup Verification Checklist

Before proceeding, verify ALL of the following in production:

### Milestones (Sprint 35)
- [ ] Timeline page loads milestones from `/api/milestones`
- [ ] Milestone detail views show layered content
- [ ] Admin-approved milestones appear immediately
- [ ] No console errors related to milestones

### Glossary & Flashcards (Sprint 36)
- [ ] Glossary page loads from `/api/glossary`
- [ ] Flashcard lists load from `/api/flashcards`
- [ ] Prebuilt decks load from `/api/prebuilt-decks`
- [ ] Study functionality works correctly

### Learning Paths, Checkpoints, Events (Sprint 37)
- [ ] Learning paths load from `/api/learning-paths`
- [ ] Checkpoints load with learning path data
- [ ] Current events load from `/api/current-events`
- [ ] News page shows featured events

### User Data (Sprint 38)
- [ ] User sessions persist correctly
- [ ] Flashcard progress saves to database
- [ ] Study stats track correctly
- [ ] Streak calculations work

---

## Phase 1: Remove Static Content Loaders

### 39.1 Remove Static Imports from Content Index
- [ ] Update `src/content/index.ts` - remove all static loaders

```typescript
// BEFORE: src/content/index.ts
import chatgptStoryPath from './learning-paths/chatgpt-story.json';
import glossaryTermsData from './glossary/terms.json';
import checkpointQuestionsData from './checkpoints/questions.json';
import flashcardsData from './checkpoints/flashcards.json';
import currentEventsData from './current-events/events.json';
import layeredContentData from './milestones/layered-content.json';
// ... lots of imports and validation code

// AFTER: src/content/index.ts
/**
 * Content Loader Utilities - DEPRECATED
 *
 * All content is now served from the database API.
 * This file is retained for backwards compatibility during migration.
 *
 * Use these API hooks instead:
 * - useMilestones() from '@/hooks/useMilestones'
 * - useGlossary() from '@/hooks/useGlossary'
 * - useFlashcards() from '@/hooks/useFlashcards'
 * - useLearningPaths() from '@/hooks/useLearningPaths'
 * - useCurrentEvents() from '@/hooks/useCurrentEvents'
 */

// Re-export types for backwards compatibility
export type {
  LearningPath,
  GlossaryEntry,
  Checkpoint,
  Flashcard,
  CurrentEvent,
  MilestoneLayeredContent,
} from '../types';

// Export empty arrays/objects for any code that still imports
// These should trigger errors in development if used
export function getLearningPaths(): never[] {
  console.warn('DEPRECATED: Use useLearningPaths() hook instead');
  return [];
}

export function getGlossaryTerms(): never[] {
  console.warn('DEPRECATED: Use useGlossary() hook instead');
  return [];
}

export function getLayeredContent(_id: string): undefined {
  console.warn('DEPRECATED: Layered content is now part of milestone response');
  return undefined;
}

// ... deprecation stubs for all functions
```

### 39.2 Find and Update Any Remaining Usages
- [ ] Search for all `@/content` imports
- [ ] Replace with appropriate API hooks

```bash
# Find remaining usages
grep -r "from '@/content'" src/
grep -r "from '../content'" src/
grep -r "getGlossaryTerm" src/
grep -r "getLearningPath" src/
grep -r "getLayeredContent" src/
grep -r "getFlashcards" src/
grep -r "getCurrentEvents" src/
grep -r "getCheckpoints" src/
```

### 39.3 Remove asyncLoaders.ts
- [ ] Delete `src/content/asyncLoaders.ts` if exists

---

## Phase 2: Delete Static JSON Files

### 39.4 Remove Learning Path JSON Files
- [ ] Delete `src/content/learning-paths/` directory

```bash
# List files to be deleted
ls -la src/content/learning-paths/

# Files to delete:
# - ai-image-generation.json
# - ai-for-business.json
# - ai-governance.json
# - chatgpt-story.json
# - ai-fundamentals.json
# - ai-for-everyday-life.json
# - pop-culture.json
# - applied-ai.json
# - ai-for-leaders.json
# - coding-with-ai.json

# Delete directory
rm -rf src/content/learning-paths/
```

### 39.5 Remove Glossary JSON
- [ ] Delete `src/content/glossary/` directory

```bash
rm -rf src/content/glossary/
```

### 39.6 Remove Checkpoints JSON Files
- [ ] Delete `src/content/checkpoints/` directory

```bash
# Contains:
# - flashcards.json
# - questions.json
rm -rf src/content/checkpoints/
```

### 39.7 Remove Current Events JSON
- [ ] Delete `src/content/current-events/` directory

```bash
rm -rf src/content/current-events/
```

### 39.8 Remove Layered Content JSON
- [ ] Delete `src/content/milestones/` directory

```bash
rm -rf src/content/milestones/
```

### 39.9 Remove Other Static Content
- [ ] Delete `src/content/ai-coding-tools.json` (if migrated)
- [ ] Delete `src/content/prebuiltDecks.ts` (now in database)

---

## Phase 3: Remove S3 Static Data Endpoints

### 39.10 Update Frontend API Client
- [ ] Remove `STATIC_API_BASE` constant
- [ ] Remove `IS_STATIC_API` logic
- [ ] Remove static fallback code

```typescript
// BEFORE: src/services/api.ts
const STATIC_API_BASE = '/data';
const IS_STATIC_API = import.meta.env.PROD || import.meta.env.VITE_USE_STATIC_API === 'true';

async getAll(params?: MilestoneQueryParams): Promise<PaginatedResponse<MilestoneResponse>> {
  if (IS_STATIC_API) {
    return fetchJson<PaginatedResponse<MilestoneResponse>>(`${STATIC_API_BASE}/milestones/index.json`);
  }
  // ... dynamic API code
}

// AFTER: src/services/api.ts
// Remove STATIC_API_BASE and IS_STATIC_API entirely
// All methods use DYNAMIC_API_BASE only

async getAll(params?: MilestoneQueryParams): Promise<PaginatedResponse<MilestoneResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const queryString = searchParams.toString();
  return fetchJson<PaginatedResponse<MilestoneResponse>>(
    `${DYNAMIC_API_BASE}/milestones${queryString ? `?${queryString}` : ''}`
  );
}
```

### 39.11 Remove Static Data from S3
- [ ] Remove `/data/` folder from S3 bucket (if separate from app)
- [ ] Or update deployment script to not sync static data files

```bash
# If static data was in a /data/ folder in S3:
aws s3 rm s3://ai-timeline-frontend-1765916222/data/ --recursive

# Update deployment script to exclude old static files
# (if they were being synced as part of dist/)
```

### 39.12 Update CloudFront Behavior (If Applicable)
- [ ] Remove `/data/*` cache behavior if it was configured separately
- [ ] Update cache headers for API responses

---

## Phase 4: Clean Up Related Code

### 39.13 Remove Unused Type Schemas
- [ ] Check if any static-specific schemas can be removed
- [ ] Keep schemas used by API responses

### 39.14 Remove Seed Scripts (Optional - Keep for Recovery)
- [ ] Consider keeping seed scripts in `scripts/` for disaster recovery
- [ ] Or archive them in a separate branch

### 39.15 Update CLAUDE.md and Documentation
- [ ] Update `.claude/CLAUDE.md` to remove references to static JSON
- [ ] Update `.claude/rules/data-models.md` if needed
- [ ] Update any developer documentation

```markdown
# BEFORE in CLAUDE.md
- **State**: localStorage + React hooks/context
- **Data**: Static JSON files + Database API

# AFTER in CLAUDE.md
- **State**: Database (user data) + React Query (caching)
- **Data**: PostgreSQL via Prisma, served through Express API
```

### 39.16 Clean Up Build Configuration
- [ ] Remove any Vite config related to static JSON bundling
- [ ] Check `vite.config.ts` for unnecessary json handling

---

## Phase 5: Deploy & Verify (Production Only)

**Note**: Skip local testing. Deploy directly to AWS and test on production.

### 39.17 Deploy to Production
- [ ] Run `npm run build` (verify no build errors)
- [ ] Deploy frontend: `aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete`
- [ ] Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`

### 39.18 Verify on Production
- [ ] Verify all pages still work
- [ ] Check bundle size decreased (should be smaller without JSON)
- [ ] Check CloudWatch for 404 errors on `/data/*` paths
- [ ] Check browser console for import errors
- [ ] Monitor API response times

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/content/index.ts` | REWRITE | Replace with deprecation stubs |
| `src/content/asyncLoaders.ts` | DELETE | No longer needed |
| `src/content/learning-paths/*.json` | DELETE | 10 files |
| `src/content/glossary/terms.json` | DELETE | |
| `src/content/checkpoints/flashcards.json` | DELETE | |
| `src/content/checkpoints/questions.json` | DELETE | |
| `src/content/current-events/events.json` | DELETE | |
| `src/content/milestones/layered-content.json` | DELETE | |
| `src/content/prebuiltDecks.ts` | DELETE | |
| `src/content/ai-coding-tools.json` | DELETE | (if exists) |
| `src/services/api.ts` | MODIFY | Remove static mode |
| `.claude/CLAUDE.md` | MODIFY | Update documentation |
| `.claude/rules/data-models.md` | MODIFY | Update documentation |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Static JSON in bundle | ~520 KB | 0 KB |
| Content source | Mixed (static + API) | API only |
| Build complexity | JSON imports, validation | Simple API types |
| Data freshness | Deploy to update | Instant via API |

---

## Success Criteria

- [ ] Build completes without JSON import errors
- [ ] Bundle size reduced (measure before/after)
- [ ] All pages load correctly from API
- [ ] No 404 errors on removed paths
- [ ] No console errors about missing content
- [ ] Documentation updated
- [ ] Git shows clean deletion of ~40+ files

---

## Rollback Plan

If issues occur:

1. **Missing data**: Data is still in database, just restore API calls
2. **Build errors**: Restore deleted files from git history
3. **Production issues**: Can quickly restore static files to S3

```bash
# Restore deleted files from git
git checkout HEAD~1 -- src/content/

# Re-deploy if needed
npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete
```

---

## Archive Note

Consider creating a git tag before this sprint for easy reference:

```bash
git tag -a pre-static-cleanup -m "Before Sprint 39: Last version with static JSON content"
git push origin pre-static-cleanup
```

This allows easy recovery of static files if needed in the future.

---

## Post-Cleanup Checklist

After completing this sprint:

- [ ] All static JSON files removed from codebase
- [ ] `src/content/` directory minimal (types only, or removed entirely)
- [ ] No static data in S3 bucket
- [ ] API is single source of truth for all content
- [ ] Documentation reflects new architecture
- [ ] Bundle size improved
- [ ] Team notified of changes
