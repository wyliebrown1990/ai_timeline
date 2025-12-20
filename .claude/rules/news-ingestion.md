---
paths: server/src/services/ingestion/**/*.ts, server/src/controllers/{articles,review,pipeline}.ts
---

# News Ingestion Service

Automated pipeline that fetches AI news, screens for milestones, generates content drafts, and queues for admin review.

## Architecture

```
RSS Feeds → Ingestion → AI Screening → Content Generation → Review Queue → Publish
```

## Pipeline Stages

### 1. Ingestion (`server/src/services/ingestion/rssFetcher.ts`)
- Fetches RSS feeds from configured news sources
- Stores articles in `IngestedArticle` table
- Runs daily via EventBridge (5:00 AM UTC)

### 2. Screening (`server/src/services/ingestion/screening.ts`)
- Uses Claude Haiku for fast relevance scoring (0-1)
- Determines if article is milestone-worthy
- Model: `claude-3-haiku-20240307`

### 3. Content Generation (`server/src/services/ingestion/contentGenerator.ts`)
- Only runs for milestone-worthy articles
- Generates: milestone, glossary_term, news_event drafts
- Model: `claude-sonnet-4-20250514`

### 4. Review Queue (`server/src/controllers/review.ts`)
- Admin reviews/edits drafts
- Approve → publishes to Milestone/GlossaryTerm tables
- Reject → marks rejected with reason

## Key Endpoints

```
# Sources
GET    /api/admin/sources              # List news sources
POST   /api/admin/sources              # Add source (validates RSS)
POST   /api/admin/sources/:id/fetch    # Manual fetch

# Articles
GET    /api/admin/articles             # List ingested articles
POST   /api/admin/articles/:id/reanalyze  # Reset and re-analyze

# Review
GET    /api/admin/review/queue         # Pending drafts
POST   /api/admin/review/:id/approve   # Publish draft
POST   /api/admin/review/:id/reject    # Reject with reason

# Pipeline
GET    /api/admin/pipeline/stats       # Health metrics
POST   /api/admin/pipeline/analyze     # Trigger analysis batch
```

## Article Status Flow

```
pending → screening → [screened | generating] → [analyzed | complete | error]
```

- `pending`: Awaiting analysis
- `screening`: Being screened by AI
- `screened`: Not milestone-worthy, done
- `generating`: Creating content drafts
- `complete`: Drafts created successfully
- `error`: Check `analysisError` field

## Recovering Errors

```bash
# Re-analyze stuck/errored article
POST /api/admin/articles/:id/reanalyze

# Check for issues
GET /api/admin/articles?limit=50
# Look for status: "generating" (stuck) or "error"
```

## Lambda Functions

| Function | Purpose | Timeout |
|----------|---------|---------|
| `ai-timeline-api-prod` | API requests | 30s |
| `ai-timeline-ingestion-prod` | Scheduled ingestion | 300s |

## Database Tables

- `NewsSource` - RSS feed configurations
- `IngestedArticle` - Raw articles with analysis status
- `ContentDraft` - AI-generated drafts pending review
- `GlossaryTerm` - Published glossary entries
- `Milestone` - Published timeline events
