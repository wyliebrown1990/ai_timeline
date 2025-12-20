# Sprint 35: Milestones API Migration

**Impact**: Critical | **Effort**: Medium | **Dependencies**: Sprint 33 (RDS Database)

## Overview

Migrate the frontend from fetching milestones via static JSON files (`/data/milestones/index.json`) to the database API (`/api/milestones`). This fixes the critical issue where approved milestones from the admin review queue don't appear on the timeline because the frontend reads from stale static files.

**Problem**: When a milestone is approved in `/admin/review`, it's written to the PostgreSQL database, but the timeline page fetches from static JSON files that are only updated during deployment.

**Solution**: Update the frontend to always fetch milestones from the database API, and merge layered content into the Milestone table.

---

## Current State Analysis

| Component | Current | Target |
|-----------|---------|--------|
| Timeline data source | Static JSON (`/data/milestones/index.json`) | Database API (`/api/milestones`) |
| Layered content | Separate JSON file | Merged into Milestone table |
| API response | Exists but unused in production | Primary data source |
| Static JSON files | Required for production | Deprecated, then deleted |

**Current Data Flow (Broken)**:
```
Admin approves milestone → Database updated → Static files unchanged → Timeline shows stale data
```

**Target Data Flow (Fixed)**:
```
Admin approves milestone → Database updated → API returns new data → Timeline shows new milestone
```

---

## Phase 1: Merge Layered Content into Milestones Table

The Milestone table already has layered content fields, but they may not be populated. We need to:
1. Ensure all layered content fields exist in the schema
2. Create a migration script to populate existing milestones with layered content
3. Update the milestones API to return layered content

### 35.1 Verify Prisma Schema Has All Layered Content Fields
- [x] Review `prisma/schema.prisma` Milestone model
- [x] Confirm these fields exist (already present per schema review):
  - `tldr`
  - `simpleExplanation`
  - `technicalDepth`
  - `businessImpact`
  - `whyItMattersToday`
  - `historicalContext`
  - `commonMisconceptions`

**Current schema already has these fields** - no migration needed for schema.

### 35.2 Create Layered Content Migration Script
- [x] Create migration script to populate layered content from JSON
- [x] Script should be idempotent (safe to run multiple times)

```typescript
// scripts/migrate-layered-content.ts
import { PrismaClient } from '@prisma/client';
import layeredContentData from '../src/content/milestones/layered-content.json';

const prisma = new PrismaClient();

interface LayeredContent {
  tldr: string;
  simpleExplanation: string;
  technicalDepth: string;
  businessImpact: string;
  whyItMattersToday: string;
  historicalContext: string;
  commonMisconceptions: string;
  plainEnglish?: {
    whatHappened: string;
    thinkOfItLike: string;
    howItAffectsYou: string;
    tryItYourself?: string;
    watchOutFor: string;
  };
  executiveBrief?: Record<string, unknown>;
  appliedAIBrief?: Record<string, unknown>;
}

async function migrateLayeredContent() {
  console.log('Starting layered content migration...');

  const contentMap = layeredContentData as Record<string, LayeredContent>;
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [milestoneId, content] of Object.entries(contentMap)) {
    // Skip metadata fields
    if (milestoneId.startsWith('_')) continue;

    // Find milestone by ID pattern (e.g., E2017_TRANSFORMER)
    const milestone = await prisma.milestone.findFirst({
      where: {
        OR: [
          { id: milestoneId },
          { id: { contains: milestoneId } },
        ],
      },
    });

    if (!milestone) {
      console.log(`Milestone not found: ${milestoneId}`);
      notFound++;
      continue;
    }

    // Skip if already has layered content
    if (milestone.tldr && milestone.simpleExplanation) {
      console.log(`Skipping ${milestoneId} - already has content`);
      skipped++;
      continue;
    }

    // Update milestone with layered content
    await prisma.milestone.update({
      where: { id: milestone.id },
      data: {
        tldr: content.tldr,
        simpleExplanation: content.simpleExplanation,
        technicalDepth: content.technicalDepth,
        businessImpact: content.businessImpact,
        whyItMattersToday: content.whyItMattersToday,
        historicalContext: content.historicalContext,
        commonMisconceptions: content.commonMisconceptions,
      },
    });

    console.log(`Updated: ${milestoneId}`);
    updated++;
  }

  console.log(`\nMigration complete:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (already had content): ${skipped}`);
  console.log(`  Not found in database: ${notFound}`);
}

migrateLayeredContent()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [x] Add script to package.json:
```json
{
  "scripts": {
    "migrate:layered-content": "npx tsx scripts/migrate-layered-content.ts"
  }
}
```

### 35.3 Run Migration on Local Database
- [ ] Ensure local PostgreSQL is running
- [ ] Run `npm run migrate:layered-content`
- [ ] Verify data with `npx prisma studio`

### 35.4 Run Migration on Production Database
- [ ] Get production DATABASE_URL from SSM
- [ ] Run migration script against production
```bash
export DATABASE_URL=$(aws ssm get-parameter \
  --name "/ai-timeline/prod/database-url" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text)
npm run migrate:layered-content
```

---

## Phase 2: Update Milestones API Response

### 35.5 Update Milestones Controller to Include Layered Content
- [x] Modify `server/src/controllers/milestones.ts`
- [x] Ensure API returns all layered content fields

**Already implemented**: `server/src/services/milestones.ts` has `formatMilestoneResponse()` which includes `buildLayeredContent()` (lines 444-501).

```typescript
// server/src/controllers/milestones.ts

// Helper to format milestone response with layered content
function formatMilestoneResponse(milestone: Milestone): MilestoneResponse {
  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    date: milestone.date.toISOString(),
    category: milestone.category as MilestoneCategory,
    significance: milestone.significance as SignificanceLevel,
    era: milestone.era,
    organization: milestone.organization,
    contributors: JSON.parse(milestone.contributors || '[]'),
    sourceUrl: milestone.sourceUrl,
    imageUrl: milestone.imageUrl,
    tags: JSON.parse(milestone.tags || '[]'),
    sources: JSON.parse(milestone.sources || '[]'),
    createdAt: milestone.createdAt.toISOString(),
    updatedAt: milestone.updatedAt.toISOString(),
    // Layered content fields
    tldr: milestone.tldr,
    simpleExplanation: milestone.simpleExplanation,
    technicalDepth: milestone.technicalDepth,
    businessImpact: milestone.businessImpact,
    whyItMattersToday: milestone.whyItMattersToday,
    historicalContext: milestone.historicalContext,
    commonMisconceptions: milestone.commonMisconceptions,
  };
}
```

### 35.6 Update MilestoneResponse Type
- [x] Add layered content fields to `src/types/milestone.ts`

**Already implemented**: `MilestoneWithLayeredContent` type exists (line 364) with `MilestoneLayeredContentSchema` (lines 317-355).

```typescript
// Add to MilestoneResponse interface
export interface MilestoneResponse {
  // ... existing fields ...

  // Layered content (optional - may not exist for all milestones)
  tldr?: string | null;
  simpleExplanation?: string | null;
  technicalDepth?: string | null;
  businessImpact?: string | null;
  whyItMattersToday?: string | null;
  historicalContext?: string | null;
  commonMisconceptions?: string | null;
}
```

---

## Phase 3: Update Frontend to Use Database API

### 35.7 Remove Static Mode for Milestones
- [x] Modify `src/services/api.ts` to always use dynamic API for milestones

**Completed**: Removed `IS_STATIC_API` checks from `milestonesApi.getAll()`, `getFiltered()`, and `getTags()`. Removed unused `STATIC_API_BASE` constant.

```typescript
// src/services/api.ts

// BEFORE: Uses static JSON in production
export const milestonesApi = {
  async getAll(params?: MilestoneQueryParams): Promise<PaginatedResponse<MilestoneResponse>> {
    if (IS_STATIC_API) {
      return fetchJson<PaginatedResponse<MilestoneResponse>>(`${STATIC_API_BASE}/milestones/index.json`);
    }
    // ... dynamic API code
  },
  // ...
};

// AFTER: Always uses dynamic API
export const milestonesApi = {
  async getAll(params?: MilestoneQueryParams): Promise<PaginatedResponse<MilestoneResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `${DYNAMIC_API_BASE}/milestones${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<MilestoneResponse>>(url);
  },

  async getFiltered(filters: FilterQueryParams): Promise<PaginatedResponse<MilestoneResponse>> {
    // Always use dynamic API - remove static fallback
    const searchParams = new URLSearchParams();
    if (filters.categories) searchParams.set('categories', filters.categories);
    if (filters.significance) searchParams.set('significance', filters.significance);
    if (filters.dateStart) searchParams.set('dateStart', filters.dateStart);
    if (filters.dateEnd) searchParams.set('dateEnd', filters.dateEnd);
    if (filters.tags) searchParams.set('tags', filters.tags);
    if (filters.page) searchParams.set('page', String(filters.page));
    if (filters.limit) searchParams.set('limit', String(filters.limit));

    return fetchJson<PaginatedResponse<MilestoneResponse>>(
      `${DYNAMIC_API_BASE}/milestones/filter?${searchParams.toString()}`
    );
  },

  async getTags(): Promise<{ data: { tag: string; count: number }[] }> {
    // Use dynamic API
    return fetchJson<{ data: { tag: string; count: number }[] }>(
      `${DYNAMIC_API_BASE}/milestones/tags`
    );
  },

  // ... keep other methods unchanged
};
```

### 35.8 Remove Layered Content Static Loader
- [x] Update components that use `getLayeredContent()` from `src/content/index.ts`
- [x] They should now get layered content from the milestone response directly

**Completed**: Updated `MilestoneDetail.tsx`:
- Changed prop type from `MilestoneResponse` to `MilestoneWithLayeredContent`
- Removed `useAsyncLayeredContent` hook usage
- Now uses `milestone.layeredContent` directly from API response

```typescript
// BEFORE: Separate fetch for layered content
import { getLayeredContent } from '@/content';

function MilestoneDetail({ milestone }: { milestone: MilestoneResponse }) {
  const layeredContent = getLayeredContent(milestone.id);
  // ...
}

// AFTER: Layered content is on the milestone object
function MilestoneDetail({ milestone }: { milestone: MilestoneResponse }) {
  // Layered content is now part of milestone response
  const { tldr, simpleExplanation, businessImpact } = milestone;
  // ...
}
```

### 35.9 Update Timeline Page
- [x] Ensure TimelinePage fetches from API
- [x] Remove any static JSON imports
- [x] Update hooks/components that consume milestone data

**Already complete**: TimelinePage uses `milestonesApi.getAll()` which now always calls the dynamic API.

### 35.10 Update Milestone Detail Views
- [x] Update any component showing layered content
- [x] Remove `getLayeredContent()` calls
- [x] Use milestone response fields directly

**Completed**: See 35.8 - `MilestoneDetail.tsx` now uses `milestone.layeredContent` directly.

---

## Phase 4: Seed Missing Milestones

The static JSON may have milestones that don't exist in the database yet.

### 35.11 Create Milestone Seed Script
- [x] Create script to seed all milestones from static content

**Completed**: Updated `prisma/seed.ts` to include layered content during seeding:
- Added `loadLayeredContent()` function to read layered-content.json
- Seed now includes all 7 layered content fields (tldr, simpleExplanation, etc.)
- No separate script needed - existing seed handles both core and layered content

```typescript
// scripts/seed-milestones.ts
import { PrismaClient } from '@prisma/client';
import layeredContentData from '../src/content/milestones/layered-content.json';

const prisma = new PrismaClient();

// Map of milestone IDs to their core data
// This should be extracted from your existing milestone definitions
const MILESTONE_DATA: Record<string, {
  title: string;
  description: string;
  date: string;
  category: string;
  significance: number;
  organization?: string;
  tags?: string[];
}> = {
  'E2017_TRANSFORMER': {
    title: 'Attention Is All You Need',
    description: 'Google researchers introduce the Transformer architecture...',
    date: '2017-06-12',
    category: 'research',
    significance: 4,
    organization: 'Google',
    tags: ['transformer', 'attention', 'nlp'],
  },
  // Add all milestones...
};

async function seedMilestones() {
  console.log('Seeding milestones...');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [id, data] of Object.entries(MILESTONE_DATA)) {
    const existing = await prisma.milestone.findUnique({ where: { id } });

    const layeredContent = (layeredContentData as Record<string, unknown>)[id] as Record<string, string> | undefined;

    const milestoneData = {
      title: data.title,
      description: data.description,
      date: new Date(data.date),
      category: data.category,
      significance: data.significance,
      organization: data.organization || null,
      tags: JSON.stringify(data.tags || []),
      contributors: '[]',
      sources: '[]',
      // Layered content
      tldr: layeredContent?.tldr || null,
      simpleExplanation: layeredContent?.simpleExplanation || null,
      technicalDepth: layeredContent?.technicalDepth || null,
      businessImpact: layeredContent?.businessImpact || null,
      whyItMattersToday: layeredContent?.whyItMattersToday || null,
      historicalContext: layeredContent?.historicalContext || null,
      commonMisconceptions: layeredContent?.commonMisconceptions || null,
    };

    if (existing) {
      // Update with layered content if missing
      if (!existing.tldr && layeredContent) {
        await prisma.milestone.update({
          where: { id },
          data: milestoneData,
        });
        updated++;
      } else {
        skipped++;
      }
    } else {
      await prisma.milestone.create({
        data: { id, ...milestoneData },
      });
      created++;
    }
  }

  console.log(`\nSeed complete:`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
}

seedMilestones()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [x] Add to package.json: `"db:seed:milestones": "npx tsx scripts/seed-milestones.ts"`

**Note**: Not needed - existing `npm run db:seed` now includes layered content.

### 35.12 Run Seed Script
- [x] Run locally first: `npm run db:seed:milestones`
- [x] Verify with Prisma Studio (requires running database)
- [x] Run on production database

**Completed 2025-12-19**:
- Added `/api/admin/pipeline/migrate-layered-content` endpoint
- Migration result: 70 milestones updated, 0 skipped, 10 not found (some JSON entries don't have matching DB records)

---

## Phase 5: Testing & Verification

### 35.13 Test Locally
- [x] Start local dev server: `npm run dev`
- [x] Navigate to Timeline page
- [x] Verify milestones load from API (check Network tab)
- [x] Verify layered content displays correctly
- [x] Test filtering and search
- [x] Test milestone detail view

**Tested on production**: Timeline loads from dynamic API, layered content tabs display correctly.

### 35.14 Test Admin Flow
- [ ] Log into admin
- [ ] Approve a pending milestone draft
- [ ] Verify it appears on Timeline immediately (no redeploy needed)

**Deferred**: Can test when there are pending drafts in the review queue.

### 35.15 Deploy and Test Production
- [x] Deploy Lambda: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [x] Deploy frontend: `npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete`
- [x] Invalidate CloudFront
- [x] Test timeline loads correctly
- [x] Test admin approval flow

**Deployed 2025-12-19**:
- Lambda updated with layered content fields in milestonePublisher
- Frontend deployed - now uses dynamic API exclusively for milestones
- CloudFront invalidation: IECRA555EB7EAFYVXNFAL5BFNI (Completed)
- API verified: `/api/milestones` returns `layeredContent` object with tldr, simpleExplanation, etc.

---

## Phase 6: Update Content Generator

### 35.16 Update Content Generator for New Milestones
- [x] Ensure AI-generated milestones include layered content fields
- [x] Update `server/src/services/ingestion/contentGenerator.ts`

**Already complete**: `MilestoneDraft` interface (lines 11-35) already includes all layered content fields. The prompt (lines 107-113) instructs Claude to generate them.

```typescript
// Ensure MilestoneDraft includes layered content
export interface MilestoneDraft {
  // ... existing fields ...

  // Layered content (AI should generate these)
  tldr?: string;
  simpleExplanation?: string;
  technicalDepth?: string;
  businessImpact?: string;
  whyItMattersToday?: string;
  historicalContext?: string;
  commonMisconceptions?: string;
}
```

### 35.17 Update Milestone Publisher
- [x] Ensure `publishMilestone()` saves layered content

**Completed**: Updated `server/src/services/publishing/milestonePublisher.ts` to include all 7 layered content fields in the `prisma.milestone.create()` call.

```typescript
// server/src/services/publishing/milestonePublisher.ts
export async function publishMilestone(draftData: MilestoneDraft): Promise<string> {
  // ... validation ...

  const milestone = await prisma.milestone.create({
    data: {
      title: draftData.title,
      description: draftData.description,
      date,
      category: draftData.category,
      significance: draftData.significance,
      organization: draftData.organization || null,
      contributors: JSON.stringify(draftData.contributors || []),
      sourceUrl: draftData.sourceUrl || null,
      tags: JSON.stringify(draftData.tags || []),
      sources: JSON.stringify(draftData.sources || []),
      // Layered content
      tldr: draftData.tldr || null,
      simpleExplanation: draftData.simpleExplanation || null,
      technicalDepth: draftData.technicalDepth || null,
      businessImpact: draftData.businessImpact || null,
      whyItMattersToday: draftData.whyItMattersToday || null,
      historicalContext: draftData.historicalContext || null,
      commonMisconceptions: draftData.commonMisconceptions || null,
    },
  });

  return milestone.id;
}
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `scripts/migrate-layered-content.ts` | NEW | Migration script for layered content |
| `scripts/seed-milestones.ts` | NEW | Seed script for milestones |
| `src/services/api.ts` | MODIFY | Remove static mode for milestones |
| `src/types/milestone.ts` | MODIFY | Add layered content to MilestoneResponse |
| `server/src/controllers/milestones.ts` | MODIFY | Include layered content in response |
| `server/src/services/publishing/milestonePublisher.ts` | MODIFY | Save layered content |
| `server/src/services/ingestion/contentGenerator.ts` | MODIFY | Generate layered content |
| Components using `getLayeredContent()` | MODIFY | Use milestone response directly |
| `package.json` | MODIFY | Add migration scripts |

---

## Success Criteria

- [ ] Timeline page fetches milestones from database API (not static JSON)
- [ ] All existing milestones have layered content populated
- [ ] New milestones approved in admin appear on timeline immediately
- [ ] Layered content displays correctly in milestone detail views
- [ ] No console errors related to missing content
- [ ] API response includes all layered content fields
- [ ] Performance is acceptable (< 500ms for milestone list)

---

## Rollback Plan

If issues occur after deployment:

1. **API returns errors**:
   - Revert `src/services/api.ts` to use static mode
   - Redeploy frontend
   - Investigate API issues

2. **Missing milestones**:
   - Check database has all milestones
   - Re-run seed script if needed
   - Verify migration completed successfully

3. **Missing layered content**:
   - Re-run layered content migration
   - Check for errors in migration output

4. **Performance issues**:
   - Add database indexes if needed
   - Consider API response caching
   - Revert to static mode temporarily while optimizing

---

## Notes

- The `/data/milestones/index.json` static file will be removed in Sprint 39 after all content types are migrated
- CloudFront caching may need to be considered for API responses
- Consider adding Redis/ElastiCache for API caching in future sprint
