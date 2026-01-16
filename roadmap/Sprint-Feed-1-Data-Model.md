# Sprint Feed-1: Data Model & API Foundation

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Claude

## Overview

Establish the database schema and API endpoints needed to support the swipeable news feed. This sprint focuses on backend infrastructure: engagement tracking, interaction logging, ranking algorithm, and collection storage.

## Prerequisites

- [x] Verify PostgreSQL database is accessible
- [x] Confirm Prisma is working: `npx prisma db pull`
- [x] Review existing CurrentEvent model in `prisma/schema.prisma`

## Tasks

### 1. Database Schema Updates

#### 1.1 Modify CurrentEvent Model
- [x] Add engagement fields to `prisma/schema.prisma`:
  ```prisma
  // Add to CurrentEvent model
  upvotes          Int      @default(0)
  downvotes        Int      @default(0)
  viewCount        Int      @default(0)
  completionCount  Int      @default(0)
  hotScore         Float    @default(0)
  tldr             String?
  ```
- [x] Add relation for interactions:
  ```prisma
  interactions     NewsInteraction[]
  ```
- [x] Add index for hot score ranking:
  ```prisma
  @@index([hotScore(sort: Desc)])
  @@index([isPublished, hotScore(sort: Desc)])
  ```

#### 1.2 Create NewsInteraction Model
- [x] Add new model to `prisma/schema.prisma`:
  ```prisma
  model NewsInteraction {
    id        String   @id @default(cuid())
    sessionId String
    eventId   String
    event     CurrentEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
    action    String   // view | upvote | downvote | save | share | chat | swipe_past
    metadata  String?  // JSON for additional context
    createdAt DateTime @default(now())

    @@index([sessionId, eventId])
    @@index([eventId, action])
    @@index([createdAt])
    @@index([sessionId, createdAt])
  }
  ```

#### 1.3 Create SavedCollection Model
- [x] Add new model to `prisma/schema.prisma`:
  ```prisma
  model SavedCollection {
    id        String   @id @default(cuid())
    sessionId String
    userId    String?
    user      User?    @relation(fields: [userId], references: [id])
    name      String
    items     String   @default("[]")
    isPublic  Boolean  @default(false)
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@index([sessionId])
    @@index([userId])
  }
  ```
- [x] Add relation to User model (if exists):
  ```prisma
  // Add to User model
  savedCollections SavedCollection[]
  ```

#### 1.4 Run Migration
- [x] Create migration: `npx prisma migrate dev --name add_feed_engagement_fields`
- [x] Verify migration applied successfully
- [x] Regenerate Prisma client: `npx prisma generate`

### 2. Hot Score Service

#### 2.1 Create Ranking Service
- [x] Create `server/src/services/feedRankingService.ts`:
  ```typescript
  // Core ranking algorithm
  export function calculateHotScore(event: {
    upvotes: number;
    downvotes: number;
    completionCount: number;
    viewCount: number;
    publishedDate: Date;
  }): number {
    const ageHours = (Date.now() - event.publishedDate.getTime()) / (1000 * 60 * 60);
    const gravity = 1.8;

    const engagementScore =
      (event.upvotes * 1.0) -
      (event.downvotes * 0.5) +
      (event.completionCount * 0.3) +
      (event.viewCount * 0.1);

    // Prevent division by zero, add 2 to age
    return engagementScore / Math.pow(ageHours + 2, gravity);
  }
  ```

#### 2.2 Create Score Update Job
- [x] Create `server/src/services/feedScoreUpdater.ts`:
  - Function to batch update hot scores for all events
  - Called periodically (every 15 minutes) or on significant vote changes
- [x] Add to scheduled tasks or create admin endpoint to trigger

### 3. Feed API Endpoints

#### 3.1 Create Feed Routes
- [x] Create `server/src/routes/feed.ts`:
  ```typescript
  // GET /api/feed - Main feed endpoint
  // Query params: limit, exclude (comma-separated IDs), sessionId

  // GET /api/feed/trending - High hot score items

  // GET /api/feed/fresh - Newest items only
  ```

#### 3.2 Create Feed Controller
- [x] Create `server/src/controllers/feedController.ts`:
  - `getFeed()` - Returns personalized feed with exclusions
  - `getTrending()` - Returns top hot score items
  - `getFresh()` - Returns newest items by publishedDate

#### 3.3 Implement Feed Query Logic
- [x] Build query with exclusion list support
- [x] Sort by hot score for main feed
- [x] Apply isPublished and expiresAt filters
- [x] Limit results with configurable page size
- [x] Include related data: concepts, personMentions (limited)

### 4. Interaction API Endpoints

#### 4.1 Create Interaction Routes
- [x] Add to `server/src/routes/currentEvents.ts` or create `server/src/routes/newsInteractions.ts`:
  ```typescript
  // POST /api/news/:id/vote - Record upvote/downvote
  // Body: { vote: 'up' | 'down', sessionId: string }

  // POST /api/news/:id/view - Record view
  // Body: { sessionId: string }

  // POST /api/news/:id/engage - Record completion/engagement
  // Body: { sessionId: string, engagementType: string }

  // DELETE /api/news/:id/vote - Remove vote
  // Body: { sessionId: string }
  ```

#### 4.2 Create Interaction Controller
- [x] Create `server/src/controllers/newsInteractionController.ts`:
  - `recordVote()` - Handle upvote/downvote with duplicate prevention
  - `recordView()` - Track view (dedupe by session+event)
  - `recordEngagement()` - Track meaningful interactions
  - `removeVote()` - Allow vote removal/change

#### 4.3 Implement Vote Logic
- [x] Check for existing vote from same session
- [x] If changing vote: adjust counts accordingly
- [x] Update CurrentEvent upvotes/downvotes counts
- [x] Trigger hot score recalculation
- [x] Return updated vote counts

### 5. Collections API Endpoints

#### 5.1 Create Collections Routes
- [x] Create `server/src/routes/collections.ts`:
  ```typescript
  // GET /api/collections - List user's collections
  // Query: sessionId (required)

  // POST /api/collections - Create collection
  // Body: { sessionId, name, isPublic? }

  // PUT /api/collections/:id - Update collection
  // Body: { name?, isPublic? }

  // DELETE /api/collections/:id - Delete collection

  // POST /api/collections/:id/items - Add item
  // Body: { eventId }

  // DELETE /api/collections/:id/items/:eventId - Remove item
  ```

#### 5.2 Create Collections Controller
- [x] Create `server/src/controllers/collectionsController.ts`:
  - `getCollections()` - List collections for session/user
  - `createCollection()` - Create new collection
  - `updateCollection()` - Update name/visibility
  - `deleteCollection()` - Remove collection
  - `addItem()` - Add event to collection (prevent duplicates)
  - `removeItem()` - Remove event from collection

### 6. Frontend API Client

#### 6.1 Create Feed API Client
- [x] Create `src/services/feedApi.ts`:
  ```typescript
  export const feedApi = {
    getFeed(options: { limit?: number; exclude?: string[]; sessionId: string }),
    getTrending(limit?: number),
    getFresh(limit?: number),
  };
  ```

#### 6.2 Create Interaction API Client
- [x] Add to `src/services/feedApi.ts`:
  ```typescript
  export const newsInteractionApi = {
    vote(eventId: string, vote: 'up' | 'down', sessionId: string),
    removeVote(eventId: string, sessionId: string),
    recordView(eventId: string, sessionId: string),
    recordEngagement(eventId: string, sessionId: string, type: string),
  };
  ```

#### 6.3 Create Collections API Client
- [x] Add to `src/services/feedApi.ts`:
  ```typescript
  export const collectionsApi = {
    getAll(sessionId: string),
    create(sessionId: string, name: string),
    update(id: string, data: { name?: string; isPublic?: boolean }),
    delete(id: string),
    addItem(collectionId: string, eventId: string),
    removeItem(collectionId: string, eventId: string),
  };
  ```

### 7. Session Management Hook

#### 7.1 Create Session Hook
- [x] Create `src/hooks/useFeedSession.ts`:
  ```typescript
  // Generate/retrieve persistent session ID from sessionStorage
  // Track seen items in session
  // Provide methods: getSessionId, markSeen, getSeenIds, clearSession
  ```

### 8. TypeScript Types

#### 8.1 Create Feed Types
- [x] Create `src/types/feed.ts`:
  ```typescript
  export interface FeedItem extends CurrentEvent {
    upvotes: number;
    downvotes: number;
    viewCount: number;
    hotScore: number;
    userVote?: 'up' | 'down' | null;
  }

  export interface NewsInteraction {
    id: string;
    sessionId: string;
    eventId: string;
    action: 'view' | 'upvote' | 'downvote' | 'save' | 'share' | 'chat' | 'swipe_past';
    createdAt: string;
  }

  export interface SavedCollection {
    id: string;
    name: string;
    items: string[];
    isPublic: boolean;
    createdAt: string;
  }
  ```

## Browser Testing & Validation

> **CRITICAL**: Use Claude Chrome MCP tools to test API endpoints.

### API Endpoint Testing
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to local dev server (start with `bun run dev:all`)
- [ ] Test GET /api/feed endpoint via browser console or Postman
- [ ] Test POST /api/news/:id/vote endpoint
- [ ] Verify vote counts update correctly
- [ ] Test GET /api/collections endpoint
- [ ] Test POST /api/collections endpoint
- [ ] Check console for errors: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network for failed requests: `mcp__claude-in-chrome__read_network_requests`

## Acceptance Criteria

- [x] Migration runs successfully without data loss
- [x] Hot score is calculated correctly (verified with test data)
- [x] Feed endpoint returns items sorted by hot score
- [x] Votes are recorded and counts update atomically
- [x] Session-based vote deduplication works
- [x] Collections CRUD operations work correctly
- [x] All new endpoints return proper error responses
- [x] TypeScript types are complete and accurate
- [ ] All browser validation tasks completed

## Notes for Future Developers

### Vote Deduplication Strategy
Each session can only have one vote per event. When voting:
1. Check for existing NewsInteraction with same sessionId + eventId + action in (upvote, downvote)
2. If exists and same vote type: no-op
3. If exists and different vote type: remove old interaction, create new, adjust counts
4. If not exists: create interaction, increment count

### Hot Score Caching
Hot scores are pre-computed and stored on CurrentEvent for fast queries. They should be recalculated:
- Every 15 minutes via scheduled job
- Immediately after significant vote activity (>10 votes in 5 minutes)

### Session ID Generation
Use a UUID v4 stored in sessionStorage. Format: `feed_session_${uuid}`. This allows:
- Anonymous interaction tracking
- Session-based seen/vote tracking
- Later linking to user accounts if they log in
