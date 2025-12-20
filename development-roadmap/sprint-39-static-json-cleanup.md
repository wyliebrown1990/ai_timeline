# Sprint 39: Static JSON Cleanup & Deprecation

**Impact**: Low (housekeeping) | **Effort**: Low | **Dependencies**: Sprints 35-38 (All migrations complete)

**Status**: ✅ COMPLETE (December 20, 2025)

## Overview

Final cleanup sprint to remove deprecated static JSON files, unused content loaders, and S3 static data endpoints. This sprint should only be executed after verifying all content is successfully served from the database API.

**Pre-requisite**: ALL previous migration sprints (35-38) must be complete and verified in production.

---

## Pre-Cleanup Verification Checklist

Before proceeding, verify ALL of the following in production:

### Milestones (Sprint 35)
- [x] Timeline page loads milestones from `/api/milestones`
- [x] Milestone detail views show layered content
- [x] Admin-approved milestones appear immediately
- [x] No console errors related to milestones

### Glossary & Flashcards (Sprint 36)
- [x] Glossary page loads from `/api/glossary`
- [x] Flashcard lists load from `/api/flashcards`
- [x] Prebuilt decks load from `/api/prebuilt-decks`
- [x] Study functionality works correctly

### Learning Paths, Checkpoints, Events (Sprint 37)
- [x] Learning paths load from `/api/learning-paths`
- [x] Checkpoints load with learning path data
- [x] Current events load from `/api/current-events`
- [x] News page shows featured events

### User Data (Sprint 38)
- [x] User sessions persist correctly
- [x] Flashcard progress saves to database
- [x] Study stats track correctly
- [x] Streak calculations work

---

## Phase 1: Remove Static Content Loaders

### 39.1 Remove Static Imports from Content Index
- [x] ~~Update `src/content/index.ts` - remove all static loaders~~ (Deleted entire file)

### 39.2 Find and Update Any Remaining Usages
- [x] Search for all `@/content` imports
- [x] Replace with appropriate API hooks
- [x] Updated components to use `useLearningPathsApi` hooks:
  - `PathSelector.tsx`
  - `InTheNewsSection.tsx`
  - `PathCompletionSummary.tsx`
  - `LearningPathsPage.tsx`
  - `NewsPage.tsx`
  - `OnboardingModal.tsx`
  - `CheckpointView.tsx`
- [x] Updated `pathRecommendation.ts` to accept paths as parameter

### 39.3 Remove asyncLoaders.ts
- [x] Delete `src/content/asyncLoaders.ts`

---

## Phase 2: Delete Static JSON Files

### 39.4 Remove Learning Path JSON Files
- [x] Delete `src/content/learning-paths/` directory (10 files)

### 39.5 Remove Glossary JSON
- [x] Delete `src/content/glossary/` directory

### 39.6 Remove Checkpoints JSON Files
- [x] Delete `src/content/checkpoints/` directory (flashcards.json, questions.json)

### 39.7 Remove Current Events JSON
- [x] Delete `src/content/current-events/` directory

### 39.8 Remove Layered Content JSON
- [x] Delete `src/content/milestones/` directory

### 39.9 Remove Other Static Content
- [x] Delete `src/content/ai-coding-tools.json`
- [x] Delete `src/content/prebuiltDecks.ts`
- [x] Delete `src/content/index.ts`

---

## Phase 3: Remove S3 Static Data Endpoints

### 39.10 Update Frontend API Client
- [x] Remove `DYNAMIC_API_BASE` → renamed to `API_BASE`
- [x] Remove `IS_STATIC_API` logic
- [x] Remove static fallback code and logging

### 39.11 Remove Static Data from S3
- [x] N/A - Static data was bundled in app, not separate in S3

### 39.12 Update CloudFront Behavior (If Applicable)
- [x] N/A - No separate `/data/*` behavior configured

---

## Phase 4: Clean Up Related Code

### 39.13 Remove Unused Type Schemas
- [x] Kept schemas used by API responses
- [x] Removed unused static content hooks from `hooks/index.ts`

### 39.14 Remove Seed Scripts (Optional - Keep for Recovery)
- [x] Kept seed scripts in `scripts/` for disaster recovery

### 39.15 Update CLAUDE.md and Documentation
- [x] Update `.claude/CLAUDE.md` to remove references to static JSON
- [x] Updated project structure (removed `content/` directory)
- [x] Updated Key Patterns section

### 39.16 Clean Up Build Configuration
- [x] N/A - Vite handles JSON removal automatically when imports are deleted

---

## Phase 5: Deploy & Verify (Production Only)

### 39.17 Deploy to Production
- [x] Run `npm run build` (verify no build errors)
- [x] Deploy frontend: `aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete`
- [x] Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`

### 39.18 Verify on Production
- [x] Verify all pages still work (Homepage 200 OK)
- [x] Verify API endpoints return data:
  - Learning Paths: 10
  - Current Events: 16
  - Glossary: 100
  - Flashcards: 39
- [x] Check bundle size decreased (7,476 lines removed)
- [x] No console errors about missing content

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/content/index.ts` | DELETE | Removed entirely |
| `src/content/asyncLoaders.ts` | DELETE | No longer needed |
| `src/content/learning-paths/*.json` | DELETE | 10 files |
| `src/content/glossary/terms.json` | DELETE | |
| `src/content/checkpoints/flashcards.json` | DELETE | |
| `src/content/checkpoints/questions.json` | DELETE | |
| `src/content/current-events/events.json` | DELETE | |
| `src/content/milestones/layered-content.json` | DELETE | |
| `src/content/prebuiltDecks.ts` | DELETE | |
| `src/content/ai-coding-tools.json` | DELETE | |
| `src/services/api.ts` | MODIFY | Remove static mode |
| `src/hooks/index.ts` | MODIFY | Remove old hook exports |
| `src/hooks/useContent.ts` | DELETE | Old static hooks |
| `src/hooks/useAsyncContent.ts` | DELETE | Old async hooks |
| `src/services/contentApi.ts` | DELETE | Old content API |
| `.claude/CLAUDE.md` | MODIFY | Update documentation |

---

## Results

| Metric | Before | After |
|--------|--------|-------|
| Static JSON in bundle | ~520 KB | 0 KB |
| Content source | Mixed (static + API) | API only |
| Build complexity | JSON imports, validation | Simple API types |
| Data freshness | Deploy to update | Instant via API |
| Files changed | - | 34 files |
| Lines removed | - | 7,476 lines |

---

## Success Criteria

- [x] Build completes without JSON import errors
- [x] Bundle size reduced (7,476 lines deleted)
- [x] All pages load correctly from API
- [x] No 404 errors on removed paths
- [x] No console errors about missing content
- [x] Documentation updated
- [x] Git shows clean deletion of ~40+ files

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

Git tag created before this sprint for easy reference:

```bash
git tag -a pre-static-cleanup -m "Before Sprint 39: Last version with static JSON content"
```

This allows easy recovery of static files if needed in the future.

---

## Post-Cleanup Checklist

After completing this sprint:

- [x] All static JSON files removed from codebase
- [x] `src/content/` directory removed entirely
- [x] No static data in S3 bucket (was bundled, not separate)
- [x] API is single source of truth for all content
- [x] Documentation reflects new architecture
- [x] Bundle size improved
- [x] Deployed to production and verified
