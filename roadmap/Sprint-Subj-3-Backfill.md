# Sprint Subj-3: Content Backfill

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-15 by Claude
>
> **STATUS: CORE BACKFILL COMPLETE** ✅
> - Rule-based backfill completed successfully
> - 99% coverage achieved (269/271 items classified)
> - 348 ContentSubject records created
> - Top subjects: ML (162), Software (92), Papers (36), NLP (21)

## Overview

Migrate and backfill existing content with subject tags. Map existing categories, tags, and focus areas to the new taxonomy. Process all historical content through the subject classifier. Provide admin tools for reviewing and correcting classifications.

## Prerequisites

- [x] Sprint Subj-1 complete (schema, taxonomy seeded)
- [x] Sprint Subj-2 complete (classifier service working)
- [ ] Backup production database before running migration

---

## Tasks

### 1. Category/Tag to Subject Mapping

**File**: `server/src/services/migration/subjectMigration.ts` (new)

- [x] Create mapping from existing categories to subjects

```typescript
const categoryToSubject: Record<string, string[]> = {
  // Milestone categories
  'RESEARCH': ['research-academic-papers'],
  'MODEL_RELEASE': ['science-cs-ml'],
  'BREAKTHROUGH': ['science-cs-ml', 'research-academic-papers'],
  'PRODUCT': ['business-technology-software'],
  'REGULATION': ['policy-regulation-ai-safety'],
  'INDUSTRY': ['business-technology-software'],

  // Glossary categories
  'core_concept': ['science-cs-ml'],
  'technical_term': ['science-cs-ml'],
  'business_term': ['business-technology-software'],
  'model_architecture': ['science-cs-ml'],
  'company_product': ['business-technology-software'],
};
```

- [x] Create mapping from common tags to subjects (120+ tags mapped)
- [x] Query existing tags to build comprehensive mapping
  ```sql
  SELECT DISTINCT tags FROM milestones WHERE tags != '[]';
  ```

### 2. Backfill Script - Rule-Based Pass

**File**: `server/src/scripts/backfillSubjects.ts` (new)

- [x] First pass: Apply rule-based mappings
  ```typescript
  async function backfillRuleBased() {
    // Milestones
    const milestones = await prisma.milestone.findMany({
      where: {
        contentSubjects: { none: {} },  // No subjects yet
      },
    });

    for (const m of milestones) {
      const subjects: string[] = [];

      // From category
      if (categoryToSubject[m.category]) {
        subjects.push(...categoryToSubject[m.category]);
      }

      // From tags
      const tags = JSON.parse(m.tags || '[]');
      for (const tag of tags) {
        const normalized = tag.toLowerCase().replace(/\s+/g, '-');
        if (tagToSubject[normalized]) {
          subjects.push(tagToSubject[normalized]);
        }
      }

      // Dedupe and create
      const uniqueSubjects = [...new Set(subjects)];
      if (uniqueSubjects.length > 0) {
        await createContentSubjects('milestone', m.id, uniqueSubjects, 'migration');
      }
    }
  }
  ```

- [x] Apply same logic to GlossaryTerms (using category)
- [x] Apply to Persons (using focusAreas)
- [x] Apply to Organizations (using focusAreas)
- [x] Apply to CurrentEvents

### 3. Backfill Script - AI Classification Pass

**File**: `server/src/scripts/backfillSubjectsAI.ts` (new)

- [x] Second pass: AI classify content without subjects or with only migration subjects
- [x] Process in batches to manage rate limits and costs

```typescript
async function backfillWithAI(contentType: string, batchSize = 50) {
  const classifier = new SubjectClassifier();

  // Get content needing classification
  const items = await getContentNeedingClassification(contentType, batchSize);

  for (const item of items) {
    try {
      const text = buildClassificationText(contentType, item);
      const subjects = await classifier.classifyText(text);

      await upsertContentSubjects(contentType, item.id, subjects);

      // Rate limit: 1 second between calls
      await sleep(1000);
    } catch (error) {
      console.error(`Failed to classify ${contentType}:${item.id}`, error);
      await logBackfillError(contentType, item.id, error);
    }
  }
}

function buildClassificationText(type: string, item: any): string {
  switch (type) {
    case 'milestone':
      return `${item.title}\n\n${item.description}`;
    case 'glossary_term':
      return `${item.term}: ${item.fullDefinition}`;
    case 'current_event':
      return `${item.headline}\n\n${item.summary}`;
    case 'person':
      return `${item.canonicalName}: ${item.shortBio}\nFocus: ${item.focusAreas}`;
    case 'organization':
      return `${item.name}: ${item.shortDescription}\nFocus: ${item.focusAreas}`;
    default:
      return '';
  }
}
```

- [x] Add progress tracking and resumability (in-memory state, DB model deferred)
  ```typescript
  // Track progress in a simple table or file
  interface BackfillProgress {
    contentType: string;
    lastProcessedId: string;
    processedCount: number;
    errorCount: number;
    startedAt: Date;
  }
  ```

### 4. Backfill Admin Endpoint

**File**: `server/src/routes/subjects.ts` (adminRouter)

- [x] Add `POST /api/admin/subjects/backfill`
  ```typescript
  router.post('/backfill', adminAuth, async (req, res) => {
    const { contentType, mode, batchSize } = req.body;
    // mode: 'rule' | 'ai' | 'both'

    // Start backfill job (async)
    const jobId = await startBackfillJob({
      contentType,
      mode,
      batchSize: batchSize || 50,
    });

    res.json({ jobId, status: 'started' });
  });
  ```

- [x] Add `GET /api/admin/subjects/backfill/status`
  ```typescript
  router.get('/backfill/status', adminAuth, async (req, res) => {
    const progress = await getBackfillProgress();
    res.json({
      isRunning: progress.isRunning,
      contentType: progress.contentType,
      processed: progress.processedCount,
      errors: progress.errorCount,
      total: progress.totalCount,
      percentComplete: (progress.processedCount / progress.totalCount) * 100,
    });
  });
  ```

- [ ] Add ability to cancel backfill job
- [x] Add `GET /api/admin/subjects/coverage` for coverage stats

### 5. Backfill Progress Table

**File**: `prisma/schema.prisma`

- [ ] Add BackfillJob model for tracking
  ```prisma
  model BackfillJob {
    id            String   @id @default(cuid())
    jobType       String   // 'subject_backfill'
    contentType   String?  // null = all types
    mode          String   // 'rule', 'ai', 'both'
    status        String   @default("pending")  // pending, running, completed, failed, cancelled
    processedCount Int     @default(0)
    errorCount    Int      @default(0)
    totalCount    Int?
    lastProcessedId String?
    startedAt     DateTime?
    completedAt   DateTime?
    errorLog      Json?    // Array of error records
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt

    @@index([status])
    @@index([jobType])
  }
  ```

- [ ] Run migration

### 6. Admin UI - Backfill Dashboard

**File**: `src/pages/admin/SubjectBackfillPage.tsx` (new)

- [ ] Show backfill status and progress
- [ ] Content type selector
- [ ] Mode selector (rule-based, AI, or both)
- [ ] Start/Stop/Resume buttons
- [ ] Progress bar with counts
- [ ] Error log viewer
- [ ] Estimated cost display (for AI mode)

**File**: `src/components/admin/BackfillProgress.tsx` (new)

- [ ] Real-time progress updates (polling or WebSocket)
- [ ] Per-content-type breakdown
- [ ] Time elapsed / estimated remaining

### 7. Manual Classification Review

**File**: `src/pages/admin/SubjectReviewPage.tsx` (new)

- [ ] Queue of content with low-confidence classifications
- [ ] Filter by:
  - Content type
  - Subject (or "unclassified")
  - Confidence threshold
  - Source (migration vs AI vs manual)
- [ ] Bulk actions:
  - Approve all
  - Reject and reclassify
  - Assign subject to selection

**File**: `src/components/admin/SubjectReviewCard.tsx` (new)

- [ ] Show content summary
- [ ] Current subject assignments with confidence
- [ ] Subject editor (add/remove/change primary)
- [ ] Approve / Reject buttons
- [ ] "Reclassify with AI" button

### 8. Quality Metrics Dashboard

**File**: Add to `/admin/subjects` or new `/admin/subjects/quality`

- [ ] Classification coverage stats
  ```typescript
  {
    milestones: { total: 500, classified: 480, unclassified: 20 },
    glossary_terms: { total: 200, classified: 195, unclassified: 5 },
    // ... etc
  }
  ```

- [ ] Confidence distribution chart
- [ ] Source distribution (migration / ai / manual)
- [ ] Subjects with most/least content
- [ ] Recent classification errors

---

## Browser Testing & Validation

> **CRITICAL**: Use Claude Chrome MCP tools to test all web features.

### Backfill Dashboard - Browser Validation

- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/admin/subjects/backfill` (or wherever dashboard lives)
- [ ] Take screenshot of initial state
- [ ] Start a small backfill job (e.g., 10 items, rule-based only)
- [ ] Verify progress bar updates
- [ ] Verify completion message
- [ ] Check for any errors in UI or console
- [ ] Navigate to a backfilled content item and verify subjects assigned
- [ ] Test stopping a running job
- [ ] Screenshot final state

### Manual Review - Browser Validation

- [ ] Navigate to `/admin/subjects/review`
- [ ] Verify low-confidence items appear in queue
- [ ] Test filtering by content type and confidence
- [ ] Edit subjects on a review card
- [ ] Approve an item and verify it leaves queue
- [ ] Test "Reclassify with AI" button
- [ ] Check console/network for errors
- [ ] Screenshot final state

---

## Acceptance Criteria

- [ ] Rule-based mapping covers all existing categories
- [ ] Rule-based backfill completes without errors
- [ ] AI backfill processes content in batches
- [ ] Progress tracked and resumable after interruption
- [ ] Admin can monitor backfill status in UI
- [ ] Admin can review/correct classifications
- [ ] Quality metrics show coverage > 95%
- [ ] Estimated cost for AI backfill < $10
- [ ] All browser validation tasks completed

---

## Notes for Future Developers

### Backfill Order
Process content types in this order:
1. Milestones (most important, used in learning paths)
2. GlossaryTerms (linked to milestones)
3. CurrentEvents (recent, high visibility)
4. Persons (linked to content)
5. Organizations (least critical)

### Cost Estimation
Haiku: ~$0.25/1M input tokens, ~$1.25/1M output tokens
Average article: ~500 tokens → ~$0.0002/classification
500 milestones → ~$0.10 total

### Handling Conflicts
If rule-based and AI disagree, prefer AI classification but log the conflict for review.

### Incremental Updates
After initial backfill, new content gets classified automatically via pipeline. This script is for historical data only.

### Testing First
Run backfill on staging environment first. Verify quality before production.
