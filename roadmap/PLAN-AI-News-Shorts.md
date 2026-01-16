# AI News Shorts - Development Plan

> **Project**: Transform the AI Timeline news page into a TikTok-style swipeable feed
> **Code Prefix**: `Feed`
> **Start Date**: January 2025
> **Status**: Planning

## Vision

Create an addictive, mobile-first news consumption experience that makes staying informed about AI feel effortless. Users swipe through full-screen news cards, vote on content, chat with AI, and build knowledge through quick interactions.

## Success Metrics

- **Engagement**: 3x increase in news items viewed per session
- **Retention**: 50% of users return within 7 days
- **Learning**: 2x increase in concepts added to flashcards from news
- **Virality**: 20% of users share at least one item

## Technical Stack

| Component | Technology |
|-----------|------------|
| Swipe Physics | framer-motion |
| State Management | React hooks + sessionStorage |
| Virtualization | Custom 3-card window |
| API | Existing Express.js + new endpoints |
| Database | PostgreSQL via Prisma |

## Sprint Overview

| Sprint | Focus | Key Deliverables |
|--------|-------|------------------|
| **Feed-1** | Data Model & API | Engagement fields, interaction tracking, ranking algorithm |
| **Feed-2** | Core Swipe Experience | Full-screen cards, swipe navigation, session memory |
| **Feed-3** | Card UI & Actions | New card layout, action bar, voting UI |
| **Feed-4** | Engagement Features | Comments preview, AI chat overlay, concept chips |
| **Feed-5** | Sharing & Collections | Social share, bookmarks, collections |
| **Feed-6** | Gamification & Polish | Streaks, counters, quiz integration, haptics |

## Data Model Changes

### CurrentEvent (modifications)
```prisma
model CurrentEvent {
  // ... existing fields

  // New engagement fields
  upvotes          Int      @default(0)
  downvotes        Int      @default(0)
  viewCount        Int      @default(0)
  completionCount  Int      @default(0)  // Users who engaged (not just swiped)
  hotScore         Float    @default(0)  // Computed ranking score
  tldr             String?  // Auto-generated "3 things to know"
}
```

### New: NewsInteraction
```prisma
model NewsInteraction {
  id        String   @id @default(cuid())
  sessionId String   // Anonymous session tracking
  eventId   String
  event     CurrentEvent @relation(fields: [eventId], references: [id])
  action    String   // view | upvote | downvote | save | share | chat | swipe_past
  createdAt DateTime @default(now())

  @@index([sessionId, eventId])
  @@index([eventId, action])
  @@index([createdAt])
}
```

### New: SavedCollection
```prisma
model SavedCollection {
  id        String   @id @default(cuid())
  sessionId String   // Can be anonymous
  userId    String?  // Optional: linked to account
  name      String
  items     String   @default("[]") // JSON array of event IDs
  isPublic  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([sessionId])
  @@index([userId])
}
```

## API Endpoints (New)

### Feed API
```
GET  /api/feed                    # Get personalized feed
     ?limit=10                    # Number of items
     ?exclude=id1,id2             # Exclude seen items
     ?sessionId=xxx               # For personalization

GET  /api/feed/trending           # Trending items (high hot score)
GET  /api/feed/fresh              # Newest items only
```

### Interaction API
```
POST /api/news/:id/vote           # { vote: 'up' | 'down' }
POST /api/news/:id/view           # Track view
POST /api/news/:id/engage         # Track engagement (completion)
POST /api/news/:id/share          # Track share action
```

### Collections API
```
GET    /api/collections           # User's collections
POST   /api/collections           # Create collection
PUT    /api/collections/:id       # Update collection
DELETE /api/collections/:id       # Delete collection
POST   /api/collections/:id/items # Add item to collection
DELETE /api/collections/:id/items/:eventId  # Remove item
```

## Ranking Algorithm

```typescript
function calculateHotScore(event: CurrentEvent): number {
  const ageHours = (Date.now() - event.publishedDate.getTime()) / (1000 * 60 * 60);
  const gravity = 1.8; // Decay factor

  const engagementScore =
    (event.upvotes * 1.0) -
    (event.downvotes * 0.5) +
    (event.completionCount * 0.3);

  // Reddit-style hot ranking with time decay
  const hotScore = engagementScore / Math.pow(ageHours + 2, gravity);

  return hotScore;
}
```

## Component Architecture

```
src/
├── pages/
│   └── FeedPage.tsx              # Main feed page
├── components/
│   └── Feed/
│       ├── FeedContainer.tsx     # Swipe container + virtualization
│       ├── FeedCard.tsx          # Single full-screen card
│       ├── FeedCardMedia.tsx     # Video/image handling
│       ├── FeedActionBar.tsx     # Bottom action buttons
│       ├── FeedVoteButtons.tsx   # Upvote/downvote UI
│       ├── FeedCommentPreview.tsx # Hot take floating comments
│       ├── FeedConceptChips.tsx  # Tappable concept badges
│       ├── FeedAIChat.tsx        # Slide-up AI chat overlay
│       ├── FeedShareSheet.tsx    # Social sharing options
│       ├── FeedProgress.tsx      # Daily consumption counter
│       └── hooks/
│           ├── useFeedSwipe.ts   # Swipe gesture handling
│           ├── useFeedSession.ts # Session memory management
│           └── useFeedVoting.ts  # Vote optimistic updates
└── services/
    └── feedApi.ts                # Feed-specific API client
```

## Mobile-First Design Principles

1. **Full Viewport**: Cards fill entire screen, no chrome
2. **Thumb Zone**: All actions reachable with one thumb
3. **Gesture First**: Swipe > tap > hold hierarchy
4. **Instant Feedback**: Haptics + animations on every action
5. **Progressive Disclosure**: Collapsed by default, expand on tap
6. **Offline Resilient**: Optimistic updates, queue actions

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Performance on low-end devices | Virtualize to 3 cards, lazy load media |
| Gesture conflicts with browser | Use touch-action CSS, prevent default carefully |
| Content moderation at scale | Leverage existing spam/trust system |
| Addictiveness concerns | Include "take a break" prompts after 20 items |

## Dependencies

- Must complete after: Current news feature is stable
- Blocks: Nothing
- Parallel work possible: Can develop components while API is built

## Sprint Documents

1. [Sprint-Feed-1-Data-Model.md](./Sprint-Feed-1-Data-Model.md) - Database & API foundation
2. [Sprint-Feed-2-Swipe-Core.md](./Sprint-Feed-2-Swipe-Core.md) - Core swipe experience
3. [Sprint-Feed-3-Card-UI.md](./Sprint-Feed-3-Card-UI.md) - Card design & actions
4. [Sprint-Feed-4-Engagement.md](./Sprint-Feed-4-Engagement.md) - Comments, AI chat, concepts
5. [Sprint-Feed-5-Sharing.md](./Sprint-Feed-5-Sharing.md) - Social sharing & collections
6. [Sprint-Feed-6-Gamification.md](./Sprint-Feed-6-Gamification.md) - Streaks, polish, quiz
