# Sprint 32: Automation & Glossary Integration

**Impact**: Medium | **Effort**: Low | **Dependencies**: Sprint 31 (Admin Review Queue)

## Overview

Complete the automated pipeline with scheduled ingestion, glossary publishing, and monitoring. After this sprint, the system runs autonomously with admin review as the only manual step.

**Goal**: Fully automated ingestion on schedule, glossary integration, and operational monitoring.

---

## Tasks

### 32.1 Scheduled Ingestion - Lambda + EventBridge
- [ ] Create EventBridge rule for scheduled execution
- [ ] Create separate Lambda function for ingestion (or reuse existing)
- [ ] Schedule: Check sources every 60 minutes
- [ ] Logic per run:
  - Get all active sources
  - Fetch new articles from each
  - Store new articles
  - Queue for analysis
- [ ] Add CloudWatch logging for monitoring

```yaml
# infra/template.yaml addition
IngestionScheduleRule:
  Type: AWS::Events::Rule
  Properties:
    Name: ai-timeline-ingestion-schedule
    ScheduleExpression: "rate(1 hour)"
    State: ENABLED
    Targets:
      - Id: IngestionLambda
        Arn: !GetAtt IngestionFunction.Arn
```

### 32.2 Scheduled Analysis
- [ ] After ingestion, trigger analysis for new articles
- [ ] Or: Separate scheduled job for analysis (every 2 hours)
- [ ] Rate limit Claude API calls (max N per run)
- [ ] Skip articles already analyzed

### 32.3 Glossary API - Migrate from Static JSON
- [ ] Add `GlossaryTerm` model to Prisma schema
- [ ] Create migration script to import existing terms.json
- [ ] Create CRUD API endpoints:
  - `GET /api/glossary` - List all terms
  - `GET /api/glossary/:id` - Get single term
  - `POST /api/admin/glossary` - Create term (admin)
  - `PUT /api/admin/glossary/:id` - Update term (admin)
  - `DELETE /api/admin/glossary/:id` - Delete term (admin)
- [ ] Update frontend hooks to use API

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

### 32.4 Glossary Publishing
- [ ] Update `newsPublisher.ts` pattern for glossary
- [ ] Create `server/src/services/publishing/glossaryPublisher.ts`
- [ ] On approve:
  - Validate term matches schema
  - Check for duplicate terms
  - Insert into database
  - Update draft status

### 32.5 Glossary Admin Page
- [ ] Create `src/pages/admin/GlossaryAdminPage.tsx`
- [ ] Add route `/admin/glossary`
- [ ] List all terms with search/filter
- [ ] Create/edit/delete terms
- [ ] Show source (manual vs. AI-generated)
- [ ] Bulk import from JSON (for migration)

### 32.6 Ingestion Monitoring Dashboard
- [ ] Add ingestion stats to admin dashboard
- [ ] Show: Last run time, articles fetched, errors
- [ ] Per-source stats: success rate, last checked
- [ ] Analysis pipeline stats: pending, analyzed, error rate
- [ ] CloudWatch metrics integration

```
┌────────────────────────────────────────────────────────────────┐
│ Ingestion Pipeline Status                                       │
├────────────────────────────────────────────────────────────────┤
│ Last run: 15 minutes ago                          [Run Now]    │
│                                                                 │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │ Fetched      │ │ Analyzed     │ │ Pending      │             │
│ │ Today        │ │ Today        │ │ Review       │             │
│ │    8         │ │    6         │ │    4         │             │
│ └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                 │
│ Source Health                                                   │
│ ● The Neuron Daily    Last: 15m ago    OK                      │
│ ● Forward Future AI   Last: 1h ago     OK                      │
└────────────────────────────────────────────────────────────────┘
```

### 32.7 Error Handling & Alerts
- [ ] Add error tracking for failed fetches
- [ ] Add error tracking for failed analyses
- [ ] Retry logic for transient failures
- [ ] CloudWatch alarm for sustained failures
- [ ] (Optional) Email notification on critical errors

### 32.8 Admin Controls
- [ ] Pause/resume ingestion toggle
- [ ] Pause/resume analysis toggle
- [ ] Per-source enable/disable
- [ ] Manual "fetch now" and "analyze now" buttons
- [ ] Clear error state button

---

## File Structure

```
server/src/
├── routes/
│   └── glossary.ts               # NEW
├── controllers/
│   └── glossary.ts               # NEW
├── services/
│   ├── glossary.ts               # NEW
│   └── publishing/
│       └── glossaryPublisher.ts  # NEW
├── jobs/
│   └── ingestionJob.ts           # NEW - Scheduled job logic

src/pages/admin/
├── GlossaryAdminPage.tsx         # NEW
└── AdminDashboard.tsx            # UPDATE - Add pipeline stats

infra/
└── template.yaml                 # UPDATE - Add EventBridge rule
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

- [ ] Ingestion runs automatically every hour
- [ ] Analysis runs automatically after ingestion
- [ ] Glossary terms can be managed via admin UI
- [ ] AI-suggested glossary terms can be approved/published
- [ ] Dashboard shows pipeline health
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

### If analysis stops working:
1. Check Claude API status
2. Check API key validity
3. Check rate limits
4. Try manual "analyze" on single article

### If review queue is empty but sources have new articles:
1. Check ingestion last run time
2. Check analysis pending count
3. Manually trigger pipeline

---

## Future Enhancements (Not This Sprint)

- [ ] More news sources (easy to add now)
- [ ] Source quality scoring (based on approval rate)
- [ ] Auto-archive old news events
- [ ] Duplicate detection across sources
- [ ] Weekly digest email of pending reviews
- [ ] A/B test different analysis prompts
