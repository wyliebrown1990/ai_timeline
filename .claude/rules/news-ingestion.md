---
paths: server/src/services/ingestion/**/*.ts, server/src/controllers/{articles,review,pipeline,sources}.ts
---

# News Ingestion Service

Automated pipeline that fetches AI news from multiple source types, screens for milestones, generates content drafts, and queues for admin review.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FetcherRegistry                          │
│  ┌───────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ RssFetcher │  │ PlaywrightFetcher │  │  YouTubeFetcher  │  │
│  └───────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    FetchedArticle[] (unified format)
                              │
                              ▼
              ┌───────────────────────────────┐
              │      AI Pipeline              │
              │  Screening → Generation →     │
              │  Review Queue → Publish       │
              └───────────────────────────────┘
```

## Source Types

| Type | Description | Config |
|------|-------------|--------|
| `rss` | RSS/Atom feeds | `{ feedUrl, checkFrequency }` |
| `youtube_channel` | YouTube channel videos | `{ channelId, transcriptLanguage?, includeShorts? }` |
| `youtube_playlist` | YouTube playlist | `{ playlistId, transcriptLanguage? }` |
| `web_scraper` | Playwright scraping | `{ targetUrl, articleLinkSelector?, contentSelector? }` |

## Fetcher Registry (`server/src/services/ingestion/fetchers/`)

All fetchers implement the `Fetcher` interface:

```typescript
interface Fetcher {
  sourceType: SourceType;
  fetch(source: FetcherSource): Promise<FetchedArticle[]>;
  testConnection(config: SourceConfig): Promise<TestConnectionResult>;
}
```

### Adding a New Fetcher

1. Create `server/src/services/ingestion/fetchers/NewFetcher.ts`
2. Implement `Fetcher` interface
3. Register in `fetchers/index.ts`: `fetcherRegistry.register(newFetcher)`

## Pipeline Stages

### 1. Fetching (`server/src/services/ingestion/fetchers/`)
- `RssFetcher` - RSS/Atom feeds via `rss-parser`
- `YouTubeFetcher` - YouTube Data API + transcript extraction
- `PlaywrightFetcher` - Headless browser for blocked sites

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
GET    /api/admin/sources              # List sources with health status
POST   /api/admin/sources              # Create source (any type)
POST   /api/admin/sources/test         # Test connection without saving
PUT    /api/admin/sources/:id          # Update source
POST   /api/admin/sources/:id/fetch    # Manual fetch from source

# Ingestion
POST   /api/admin/ingestion/fetch-all  # Fetch from all active sources

# Articles
GET    /api/admin/articles             # List ingested articles
POST   /api/admin/articles/:id/reanalyze  # Reset and re-analyze

# Review
GET    /api/admin/review/queue         # Pending drafts
POST   /api/admin/review/:id/approve   # Publish draft
POST   /api/admin/review/:id/reject    # Reject with reason

# Pipeline
GET    /api/admin/pipeline/stats       # Health metrics
```

## Source Health Status

Sources track health via `consecutiveFailures` and `lastSuccessAt`:

| Status | Condition |
|--------|-----------|
| `healthy` | 0 failures, recent success |
| `warning` | 1-3 failures OR no recent success |
| `error` | 4+ consecutive failures |
| `disabled` | `isActive = false` |

## Playwright Service

Local Docker service for scraping sites that block standard requests.

```bash
# Start Playwright service
npm run playwright:start

# View logs
npm run playwright:logs

# Stop service
npm run playwright:stop
```

Endpoints (localhost:3002):
- `POST /scrape` - Scrape single URL
- `POST /scrape-links` - Get article links from index page
- `GET /health` - Health check

## YouTube Integration

Requires `YOUTUBE_API_KEY` environment variable (YouTube Data API v3).

```bash
# Add to .env
YOUTUBE_API_KEY=your-api-key-here

# Or set in SSM for production
/ai-timeline/prod/youtube-api-key
```

API Quota (free tier: 10,000 units/day):
- channels.list: 1 unit
- playlistItems.list: 1 unit
- videos.list: 1 unit

## Database Schema

### NewsSource
```prisma
model NewsSource {
  sourceType          SourceType @default(rss)
  config              Json       @default("{}")
  lastSuccessAt       DateTime?
  consecutiveFailures Int        @default(0)
  // ... other fields
}

enum SourceType {
  rss
  web_scraper
  youtube_channel
  youtube_playlist
}
```

## Lambda Functions

| Function | Purpose | Timeout |
|----------|---------|---------|
| `ai-timeline-api-prod` | API requests | 30s |
| `ai-timeline-ingestion-prod` | Scheduled ingestion | 300s |

## Recovering Errors

```bash
# Re-analyze stuck/errored article
POST /api/admin/articles/:id/reanalyze

# Check for issues
GET /api/admin/articles?analysisStatus=error

# Check source health
GET /api/admin/sources
# Look for healthStatus: "error" or "warning"
```
