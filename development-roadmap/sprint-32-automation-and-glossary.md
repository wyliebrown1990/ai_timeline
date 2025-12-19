# Sprint 32: Automation & Glossary Integration

**Impact**: Medium | **Effort**: Low | **Dependencies**: Sprint 31 (Admin Review Queue)

## Overview

Complete the automated pipeline with scheduled ingestion, duplicate detection, glossary publishing, and monitoring. After this sprint, the system runs autonomously with admin review as the only manual step.

**Goal**: Fully automated daily ingestion at midnight EST, cross-source duplicate detection, glossary integration, and operational monitoring.

---

## Tasks

### 32.1 Scheduled Ingestion - Lambda + EventBridge
- [x] Create EventBridge rule for scheduled execution
- [x] Create separate Lambda function for ingestion (or reuse existing)
- [x] **Schedule: Once daily at midnight EST (5:00 AM UTC)**
- [x] Logic per run:
  - Get all active sources
  - Fetch new articles from each source sequentially
  - Store new articles with `pending` status
  - After ALL sources complete, trigger duplicate detection
  - Then queue new articles for analysis
- [x] Add CloudWatch logging for monitoring

```yaml
# infra/template.yaml addition
IngestionScheduleRule:
  Type: AWS::Events::Rule
  Properties:
    Name: ai-timeline-ingestion-schedule
    # Midnight EST = 5:00 AM UTC (or 4:00 AM during daylight saving)
    ScheduleExpression: "cron(0 5 * * ? *)"
    State: ENABLED
    Targets:
      - Id: IngestionLambda
        Arn: !GetAtt IngestionFunction.Arn
```

### 32.2 Cross-Source Duplicate Detection
- [x] Create `server/src/services/ingestion/duplicateDetector.ts`
- [x] Run after ALL sources have been fetched (not per-source)
- [x] Detection strategy:
  - Compare articles ingested in the same batch (last 24 hours)
  - Match by: title similarity (>80% Levenshtein) OR same external URLs referenced
  - Use AI (Haiku) for fuzzy matching on content if titles differ but content overlaps
- [x] Add database fields for duplicate tracking:

```prisma
model IngestedArticle {
  // ... existing fields

  // Duplicate detection (Sprint 32)
  isDuplicate       Boolean   @default(false)
  duplicateOfId     String?   // Points to the "primary" article
  duplicateOf       IngestedArticle? @relation("DuplicateOf", fields: [duplicateOfId], references: [id])
  duplicates        IngestedArticle[] @relation("DuplicateOf")
  duplicateScore    Float?    // 0-1 similarity score
  duplicateReason   String?   // "title_match" | "content_match" | "url_match"
}
```

- [x] Duplicate detection logic:
  1. Fetch all articles from the last ingestion batch
  2. Group by source (articles from same source can't be duplicates of each other)
  3. For each pair across sources:
     - Calculate title similarity
     - If >80% similar OR same URLs mentioned: mark as potential duplicate
     - Use Haiku to confirm if content describes same news
  4. Mark the LATER article as `isDuplicate=true`, pointing to the earlier one
  5. Both articles remain in pending queue with duplicate flag visible

```typescript
// server/src/services/ingestion/duplicateDetector.ts
interface DuplicateMatch {
  articleId: string;
  duplicateOfId: string;
  score: number;
  reason: 'title_match' | 'content_match' | 'url_match';
}

async function detectDuplicates(batchDate: Date): Promise<DuplicateMatch[]> {
  // Get articles from last 24 hours, grouped by source
  const articles = await prisma.ingestedArticle.findMany({
    where: {
      ingestedAt: { gte: batchDate },
      isDuplicate: false
    },
    include: { source: true }
  });

  // Group by source
  const bySource = groupBy(articles, a => a.sourceId);
  const sources = Object.keys(bySource);

  const matches: DuplicateMatch[] = [];

  // Compare across sources only
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const sourceA = bySource[sources[i]];
      const sourceB = bySource[sources[j]];

      for (const articleA of sourceA) {
        for (const articleB of sourceB) {
          const similarity = await comparArticles(articleA, articleB);
          if (similarity.isDuplicate) {
            // Earlier article is primary, later is duplicate
            const [primary, duplicate] = articleA.publishedAt < articleB.publishedAt
              ? [articleA, articleB]
              : [articleB, articleA];

            matches.push({
              articleId: duplicate.id,
              duplicateOfId: primary.id,
              score: similarity.score,
              reason: similarity.reason
            });
          }
        }
      }
    }
  }

  return matches;
}
```

### 32.3 Duplicate Detection AI Prompt (Haiku)
- [x] Create prompt for fuzzy content matching
- [x] Only called when title similarity is 50-80% (ambiguous zone)

```typescript
const DUPLICATE_CHECK_PROMPT = `Compare these two news articles and determine if they describe the SAME news event.

Article A:
Title: {{titleA}}
Source: {{sourceA}}
Published: {{dateA}}
Content: {{contentA}}

Article B:
Title: {{titleB}}
Source: {{sourceB}}
Published: {{dateB}}
Content: {{contentB}}

Return JSON:
{
  "isSameEvent": <true if both articles describe the same news event>,
  "confidence": <0.0-1.0>,
  "reason": "<brief explanation>"
}

Note: Different sources may use different headlines for the same story.
Focus on: Is this the SAME news event being reported?`;
```

### 32.4 Frontend: Duplicate Flagging in Articles List
- [x] Add `isDuplicate` indicator to article cards
- [x] Show link to the matching article
- [x] Add filter: "Show duplicates only"
- [x] Visual treatment: slightly dimmed card with "Duplicate" badge

```
┌────────────────────────────────────────────────────────────────┐
│ ⚠️ DUPLICATE                                    Relevance: 0.85│
│ "OpenAI Announces GPT-5 Preview"                               │
│ Source: Forward Future AI • Dec 19, 2024                       │
│                                                                 │
│ 🔗 Duplicate of: "GPT-5 Released Today" (The Neuron Daily)     │
│    Similarity: 92% (title_match)                               │
│                                                                 │
│ [View Original]    [Keep This One]    [Delete]                 │
└────────────────────────────────────────────────────────────────┘
```

### 32.5 Frontend: Delete from Pending Queue
- [x] Add "Delete" button to article cards in pending queue
- [x] Confirmation modal: "Delete this article? This cannot be undone."
- [x] API endpoint: `DELETE /api/admin/articles/:id`
- [x] Deleting a duplicate: removes article and clears duplicate links
- [x] Deleting a primary: if duplicates exist, promote oldest duplicate to primary
- [x] Bulk delete: "Delete All Duplicates" button (keeps primary articles)

```typescript
// API Endpoints
router.delete('/articles/:id', requireAdmin, deleteArticle);
router.post('/articles/delete-duplicates', requireAdmin, deleteAllDuplicates);
```

### 32.6 Scheduled Analysis
- [x] Run analysis AFTER duplicate detection completes
- [x] Skip articles marked as `isDuplicate=true` (don't waste API calls)
- [x] Rate limit Claude API calls (max 20 per run)
- [x] Skip articles already analyzed

```
Pipeline Order (Daily at Midnight EST):
1. Fetch from Source A → Store articles
2. Fetch from Source B → Store articles
3. Run duplicate detection → Mark duplicates
4. Run analysis on non-duplicate pending articles (limit 20)
5. Log results to CloudWatch
```

### 32.7 Glossary API - Migrate from Static JSON
- [x] Add `GlossaryTerm` model to Prisma schema
- [x] Create migration script to import existing terms.json
- [x] Create CRUD API endpoints:
  - `GET /api/glossary` - List all terms
  - `GET /api/glossary/:id` - Get single term
  - `POST /api/admin/glossary` - Create term (admin)
  - `PUT /api/admin/glossary/:id` - Update term (admin)
  - `DELETE /api/admin/glossary/:id` - Delete term (admin)
- [x] Update frontend hooks to use API

```prisma
model GlossaryTerm {
  id                  String   @id @default(uuid())
  term                String   @unique
  shortDefinition     String
  fullDefinition      String
  businessContext     String?
  example             String?
  category            String
  relatedTermIds      String   // JSON array
  relatedMilestoneIds String   // JSON array
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  sourceArticleId     String?  // Link to ingested article if AI-generated
}
```

### 32.8 Glossary Publishing
- [x] Update `newsPublisher.ts` pattern for glossary
- [x] Create `server/src/services/publishing/glossaryPublisher.ts`
- [x] On approve:
  - Validate term matches schema
  - Check for duplicate terms
  - Insert into database
  - Update draft status

### 32.9 Glossary Admin Page
- [x] Create `src/pages/admin/GlossaryAdminPage.tsx`
- [x] Add route `/admin/glossary`
- [x] List all terms with search/filter
- [x] Create/edit/delete terms
- [x] Show source (manual vs. AI-generated)
- [x] Bulk import from JSON (for migration)

### 32.10 Ingestion Monitoring Dashboard
- [x] Add ingestion stats to admin dashboard
- [x] Show: Last run time, articles fetched, duplicates found, errors
- [x] Per-source stats: success rate, last checked
- [x] Analysis pipeline stats: pending, analyzed, error rate
- [ ] CloudWatch metrics integration (deferred - requires AWS deployment)

```
┌────────────────────────────────────────────────────────────────┐
│ Ingestion Pipeline Status                                       │
├────────────────────────────────────────────────────────────────┤
│ Last run: Dec 19 at 12:00 AM EST                   [Run Now]   │
│ Next run: Dec 20 at 12:00 AM EST                               │
│                                                                 │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐│
│ │ Fetched      │ │ Duplicates   │ │ Analyzed     │ │ Pending  ││
│ │ Today        │ │ Found        │ │ Today        │ │ Review   ││
│ │    12        │ │    3         │ │    9         │ │    6     ││
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘│
│                                                                 │
│ Source Health                                                   │
│ ● The Neuron Daily    Last: 12:01 AM    6 articles    OK       │
│ ● Forward Future AI   Last: 12:02 AM    6 articles    OK       │
└────────────────────────────────────────────────────────────────┘
```

### 32.11 Error Handling & Alerts
- [x] Add error tracking for failed fetches
- [x] Add error tracking for failed analyses
- [x] Retry logic for transient failures (max 3 retries)
- [ ] CloudWatch alarm for sustained failures (deferred - requires AWS deployment)
- [ ] (Optional) Email notification on critical errors (deferred)

### 32.12 Admin Controls
- [x] Pause/resume ingestion toggle
- [x] Pause/resume analysis toggle
- [x] Per-source enable/disable (via Sources admin page)
- [x] Manual "fetch now" and "analyze now" buttons
- [x] Manual "detect duplicates" button
- [x] Clear error state button

---

## File Structure

```
server/src/
├── routes/
│   └── glossary.ts                  # NEW
├── controllers/
│   ├── glossary.ts                  # NEW
│   └── articles.ts                  # UPDATE - Add delete endpoints
├── services/
│   ├── glossary.ts                  # NEW
│   ├── ingestion/
│   │   └── duplicateDetector.ts     # NEW - Cross-source duplicate detection
│   └── publishing/
│       └── glossaryPublisher.ts     # NEW
├── jobs/
│   └── ingestionJob.ts              # NEW - Scheduled job logic

src/pages/admin/
├── GlossaryAdminPage.tsx            # NEW
├── IngestedArticlesPage.tsx         # UPDATE - Add duplicate UI, delete
└── AdminDashboard.tsx               # UPDATE - Add pipeline stats

infra/
└── template.yaml                    # UPDATE - Add EventBridge rule
```

---

## Migration: Glossary JSON to Database

```typescript
// scripts/migrateGlossary.ts
import { readFileSync } from 'fs'
import { prisma } from '../server/src/db'

const terms = JSON.parse(
  readFileSync('src/content/glossary/terms.json', 'utf-8')
)

for (const term of terms) {
  await prisma.glossaryTerm.create({
    data: {
      id: term.id,
      term: term.term,
      shortDefinition: term.shortDefinition,
      fullDefinition: term.fullDefinition,
      businessContext: term.businessContext || null,
      example: term.example || null,
      category: term.category,
      relatedTermIds: JSON.stringify(term.relatedTermIds || []),
      relatedMilestoneIds: JSON.stringify(term.relatedMilestoneIds || []),
    }
  })
}
```

---

## Success Criteria

- [ ] Ingestion runs automatically once daily at midnight EST
- [ ] Duplicate detection runs after all sources complete
- [ ] Duplicates are flagged and visible in admin UI
- [ ] Admin can delete individual articles or bulk delete duplicates
- [ ] Analysis skips duplicates (saves API costs)
- [ ] Glossary terms can be managed via admin UI
- [ ] AI-suggested glossary terms can be approved/published
- [ ] Dashboard shows pipeline health including duplicate stats
- [ ] Errors are logged and visible
- [ ] Can pause/resume automation
- [ ] No manual intervention needed for normal operation

---

## Operational Runbook

### If ingestion stops working:
1. Check CloudWatch logs for errors
2. Check source website availability
3. Try manual "fetch now" from admin
4. Check Lambda timeout/memory limits

### If duplicate detection fails:
1. Check CloudWatch logs
2. Manually run "detect duplicates" from admin
3. Check if articles have required fields

### If analysis stops working:
1. Check Claude API status
2. Check API key validity
3. Check rate limits
4. Try manual "analyze" on single article

### If review queue is empty but sources have new articles:
1. Check ingestion last run time
2. Check if duplicates filtered everything
3. Check analysis pending count
4. Manually trigger pipeline

---

## Future Enhancements (Not This Sprint)

- [ ] More news sources (easy to add now)
- [ ] Source quality scoring (based on approval rate)
- [ ] Auto-archive old news events
- [ ] Weekly digest email of pending reviews
- [ ] A/B test different analysis prompts
- [ ] Configurable duplicate threshold in admin UI
