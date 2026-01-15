# News Ingestion Pipeline

Automated pipeline: fetch news → screen → generate content → extract entities → admin review.

## Architecture
```
FetcherRegistry (RSS, YouTube, Playwright)
         │
         ▼
  FetchedArticle[]
         │
         ▼
┌─────────────────────────────────────┐
│ AI Pipeline                          │
│ 1. Screening (relevance 0-1)        │
│ 2. Content Generation (if worthy)   │
│ 3. Key Figure Extraction            │
│ 4. Entity Extraction → PersonDraft  │
│ 5. Review Queue → Publish           │
└─────────────────────────────────────┘
```

## Source Types

| Type | Config | Fetcher |
|------|--------|---------|
| `rss` | `{ feedUrl }` | RssFetcher |
| `youtube_channel` | `{ channelId }` | YouTubeFetcher |
| `youtube_playlist` | `{ playlistId }` | YouTubeFetcher |
| `web_scraper` | `{ targetUrl, contentSelector? }` | PlaywrightFetcher |

## Pipeline Stages

### 1. Fetching (`server/src/services/ingestion/fetchers/`)
Fetchers implement `Fetcher` interface and register in `FetcherRegistry`.

### 2. Screening (`articleAnalyzer.ts`)
- Claude Haiku scores relevance 0-1
- Determines if milestone-worthy

### 3. Content Generation (`contentGenerator.ts`)
- Only for milestone-worthy articles
- Generates: milestone, glossary_term, news_event drafts
- Model: Claude Sonnet

### 4. Entity Extraction (`entityExtraction.ts`)
- Extracts persons and organizations mentioned
- Matches against existing records via `entityMatcher.ts`
- Creates PersonDraft for new/unmatched persons
- Detects career changes for "Currently Doing" updates

### 5. Review Queue
Admin approves/rejects drafts at `/admin/review`

## Key Endpoints

```
# Sources
GET/POST   /api/admin/sources
POST       /api/admin/sources/test
POST       /api/admin/sources/:id/fetch

# Articles
GET        /api/admin/articles
POST       /api/admin/articles/:id/reanalyze

# Review
GET        /api/admin/review/queue
POST       /api/admin/review/:id/approve
POST       /api/admin/review/:id/reject

# Person Drafts (from entity extraction)
GET        /api/admin/person-drafts
POST       /api/admin/person-drafts/:id/approve
POST       /api/admin/person-drafts/:id/merge
POST       /api/admin/person-drafts/:id/reject

# Pipeline
GET        /api/admin/pipeline/stats
POST       /api/admin/ingestion/fetch-all
```

## Source Health

| Status | Condition |
|--------|-----------|
| `healthy` | 0 failures, recent success |
| `warning` | 1-3 failures |
| `error` | 4+ failures |

## Playwright Service

For scraping sites that block standard requests:
```bash
npm run playwright:start   # Start Docker container
npm run playwright:stop    # Stop container
```
Runs on localhost:3002.

## Entity Matching

`entityMatcher.ts` uses:
1. Exact canonical name match (confidence: 1.0)
2. Alias match (confidence: 0.95)
3. Fuzzy Jaro-Winkler match (0.85+ threshold)

High-confidence matches auto-link; others create PersonDraft for review.
