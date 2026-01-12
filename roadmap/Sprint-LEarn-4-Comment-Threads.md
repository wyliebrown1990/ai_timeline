# Sprint LEarn-4: Reddit-Style Comment Threads

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-12 by Claude - Backend + Frontend Core Complete

## Overview

Add Reddit-style threaded comments with upvote/downvote functionality to all content types. Enable community discussion on milestones, news events, glossary terms, persons, and organizations.

**Goals:**
1. Threaded comment system with unlimited nesting
2. Upvote/downvote with score calculation
3. Sort by Best, New, or Controversial
4. Comment on any content type
5. User karma from accumulated votes
6. Basic moderation (report, admin delete)

**Dependency:** Sprint LEarn-3 (User Profiles) must be complete first.

---

## Tasks

### 1. Database Schema Changes

#### 1.1 Create Comment Model
- [x] Add to `prisma/schema.prisma`:
  ```prisma
  model Comment {
    id              String   @id @default(cuid())

    // Author
    authorId        String
    author          User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

    // Content
    body            String   // Markdown supported
    bodyHtml        String?  // Pre-rendered HTML for display

    // Threading
    parentId        String?
    parent          Comment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
    replies         Comment[] @relation("CommentReplies")
    depth           Int      @default(0)  // 0 = top-level, 1 = reply, etc.

    // Polymorphic target (content being commented on)
    targetType      String   // milestone, news_event, glossary_term, person, organization
    targetId        String   // ID of the target entity

    // Scoring
    upvotes         Int      @default(0)
    downvotes       Int      @default(0)
    score           Int      @default(0)  // upvotes - downvotes
    hotScore        Float    @default(0)  // Time-weighted score for "Best" sort

    // Status
    isDeleted       Boolean  @default(false)
    isHidden        Boolean  @default(false)  // Hidden by mod, visible to author
    reportCount     Int      @default(0)

    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
    editedAt        DateTime?

    // Relations
    votes           CommentVote[]

    @@index([targetType, targetId])
    @@index([parentId])
    @@index([authorId])
    @@index([score])
    @@index([createdAt])
  }
  ```

#### 1.2 Create CommentVote Model
- [x] Add vote tracking:
  ```prisma
  model CommentVote {
    id          String   @id @default(cuid())
    commentId   String
    comment     Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
    userId      String
    user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    value       Int      // 1 = upvote, -1 = downvote

    createdAt   DateTime @default(now())

    @@unique([commentId, userId])
    @@index([userId])
  }
  ```

#### 1.3 Add Karma to User Model
- [x] Update User model:
  ```prisma
  model User {
    // ... existing fields ...

    // Karma
    commentKarma    Int      @default(0)  // Sum of comment scores
    postKarma       Int      @default(0)  // Future: for user-created content

    // Relations
    comments        Comment[]
    commentVotes    CommentVote[]
  }
  ```

#### 1.4 Run Migration
- [x] Execute migration (via API - 0009_comment_system):
  ```bash
  npx prisma migrate dev --name add_comment_threads
  ```

---

### 2. Comment Service

#### 2.1 Create Comment Service
- [x] Create `server/src/services/commentService.ts`:
  ```typescript
  interface CreateCommentInput {
    authorId: string;
    targetType: 'milestone' | 'news_event' | 'glossary_term' | 'person' | 'organization';
    targetId: string;
    parentId?: string;
    body: string;
  }

  interface CommentWithReplies extends Comment {
    replies: CommentWithReplies[];
    author: { username: string; avatarUrl?: string };
    userVote?: number;  // Current user's vote: 1, -1, or null
  }

  async function createComment(input: CreateCommentInput): Promise<Comment>;
  async function getCommentsForTarget(
    targetType: string,
    targetId: string,
    sortBy: 'best' | 'new' | 'controversial',
    userId?: string
  ): Promise<CommentWithReplies[]>;
  async function updateComment(id: string, body: string): Promise<Comment>;
  async function deleteComment(id: string): Promise<void>;
  ```

#### 2.2 Implement Voting
- [x] Voting implemented in `commentService.ts` (voteOnComment function):
  ```typescript
  async function vote(userId: string, commentId: string, value: 1 | -1 | 0): Promise<Comment>;
  async function recalculateHotScore(commentId: string): Promise<void>;
  async function updateUserKarma(userId: string): Promise<void>;
  ```

#### 2.3 Hot Score Algorithm
- [x] Implement Reddit-style hot ranking:
  ```typescript
  function calculateHotScore(upvotes: number, downvotes: number, createdAt: Date): number {
    const score = upvotes - downvotes;
    const order = Math.log10(Math.max(Math.abs(score), 1));
    const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
    const seconds = (createdAt.getTime() - new Date('2024-01-01').getTime()) / 1000;
    return sign * order + seconds / 45000;
  }
  ```

#### 2.4 Controversial Score
- [x] Calculate controversial comments:
  ```typescript
  function calculateControversyScore(upvotes: number, downvotes: number): number {
    if (upvotes === 0 || downvotes === 0) return 0;
    const total = upvotes + downvotes;
    const balance = Math.min(upvotes, downvotes) / Math.max(upvotes, downvotes);
    return total * balance;
  }
  ```

---

### 3. Comment API Endpoints

#### 3.1 Public Endpoints
- [x] Add to `server/src/routes/comments.ts`:
  ```
  GET  /api/comments/:targetType/:targetId           # Get comments for target
  GET  /api/comments/:id                             # Get single comment with replies
  GET  /api/users/:username/comments                 # User's comment history
  ```

#### 3.2 Authenticated Endpoints
- [x] Add authenticated routes:
  ```
  POST   /api/comments                    # Create comment
  PUT    /api/comments/:id                # Edit comment (author only)
  DELETE /api/comments/:id                # Delete comment (author or admin)
  POST   /api/comments/:id/vote           # Vote on comment
  POST   /api/comments/:id/report         # Report comment
  ```

#### 3.3 Admin Endpoints
- [x] Add admin routes:
  ```
  GET    /api/admin/comments/reported     # Get reported comments
  POST   /api/admin/comments/:id/hide     # Hide comment
  POST   /api/admin/comments/:id/unhide   # Unhide comment
  DELETE /api/admin/comments/:id          # Force delete
  ```

---

### 4. Frontend: Comment Components

#### 4.1 Create CommentThread Component
- [x] Create `src/components/Comments/CommentThread.tsx`:
  ```tsx
  interface CommentThreadProps {
    targetType: 'milestone' | 'news_event' | 'glossary_term' | 'person' | 'organization';
    targetId: string;
  }

  function CommentThread({ targetType, targetId }: CommentThreadProps) {
    // Sort selector (Best, New, Controversial)
    // Comment list
    // Load more button
    // "Add a comment" form (if logged in)
  }
  ```

#### 4.2 Create Comment Component
- [x] Create `src/components/Comments/Comment.tsx`:
  - Author avatar + username + timestamp
  - Comment body (rendered markdown)
  - Vote buttons with score
  - Reply button
  - Edit/Delete (if author)
  - Report button
  - Nested replies (recursive)
  - Collapse/expand toggle for long threads

#### 4.3 Create VoteButtons Component
- [x] Create `src/components/Comments/VoteButtons.tsx`:
  - Upvote arrow (filled if user upvoted)
  - Score display
  - Downvote arrow (filled if user downvoted)
  - Optimistic UI updates
  - Auth prompt if not logged in

#### 4.4 Create CommentForm Component
- [x] Create `src/components/Comments/CommentForm.tsx`:
  - Markdown textarea
  - Preview toggle
  - Submit button
  - Cancel button (for replies)
  - Character limit indicator

#### 4.5 Create SortSelector Component
- [x] Create `src/components/Comments/SortSelector.tsx`:
  - "Best" (hot score)
  - "New" (chronological)
  - "Controversial" (high engagement, mixed votes)

---

### 5. Frontend: Integration with Content Pages

#### 5.1 Add Comments to Milestone Details
- [x] Update milestone detail view:
  ```tsx
  <MilestoneDetail milestone={milestone}>
    <CommentThread targetType="milestone" targetId={milestone.id} />
  </MilestoneDetail>
  ```

#### 5.2 Add Comments to News Events
- [ ] Update news event detail:
  ```tsx
  <NewsEventDetail event={event}>
    <CommentThread targetType="news_event" targetId={event.id} />
  </NewsEventDetail>
  ```

#### 5.3 Add Comments to Glossary Terms
- [ ] Update glossary term view:
  ```tsx
  <GlossaryTermDetail term={term}>
    <CommentThread targetType="glossary_term" targetId={term.id} />
  </GlossaryTermDetail>
  ```

#### 5.4 Add Comments to Person Profiles
- [ ] Update person profile:
  ```tsx
  <PersonProfile person={person}>
    <CommentThread targetType="person" targetId={person.id} />
  </PersonProfile>
  ```

#### 5.5 Add Comments to Organization Profiles
- [ ] Update organization profile:
  ```tsx
  <OrganizationProfile org={org}>
    <CommentThread targetType="organization" targetId={org.id} />
  </OrganizationProfile>
  ```

---

### 6. Comment Moderation

#### 6.1 Report Flow
- [ ] Create report reasons enum:
  - Spam
  - Harassment
  - Misinformation
  - Off-topic
  - Other

- [ ] Create `src/components/Comments/ReportModal.tsx`:
  - Reason selector
  - Optional details textarea
  - Submit button

#### 6.2 Admin Moderation Queue
- [ ] Create `src/pages/admin/CommentModerationPage.tsx`:
  - List of reported comments
  - Report count + reasons
  - Actions: Hide, Delete, Dismiss reports
  - Comment context (target link)

#### 6.3 Auto-moderation Rules
- [ ] Implement basic auto-hide:
  - Comments with 5+ reports auto-hidden
  - Comments with score < -10 auto-hidden
  - Send notification to admin

---

### 7. User Profile Integration

#### 7.1 Comment History
- [ ] Add to user profile page:
  - Tab or section for "Comments"
  - List of user's comments
  - Link to comment context
  - Total comment karma displayed

#### 7.2 Karma Display
- [ ] Show karma on profile:
  - Comment karma (sum of comment scores)
  - Badge/flair based on karma level (optional)

---

### 8. Real-time Updates (Optional Enhancement)

#### 8.1 WebSocket Integration
- [ ] Add real-time comment updates:
  - New comments appear without refresh
  - Vote counts update live
  - "New comments" notification banner

---

## Acceptance Criteria

- [ ] Users can post top-level comments on all content types
- [ ] Users can reply to comments (nested threading)
- [ ] Comments can be upvoted and downvoted
- [ ] Score displays correctly (upvotes - downvotes)
- [ ] Comments can be sorted by Best, New, Controversial
- [ ] Authors can edit and delete their comments
- [ ] Deleted comments show "[deleted]" but preserve thread structure
- [ ] Users can report inappropriate comments
- [ ] Admins can moderate reported comments
- [ ] User karma updates based on received votes
- [ ] Comment counts show on content cards

---

## Testing Checklist

- [ ] Post comment on milestone → Appears immediately
- [ ] Reply to comment → Appears nested under parent
- [ ] Upvote comment → Score increases, arrow fills
- [ ] Downvote same comment → Changes to downvote
- [ ] Remove vote → Score returns to original
- [ ] Sort by New → Comments in chronological order
- [ ] Sort by Best → High-score recent comments first
- [ ] Edit own comment → Shows "edited" indicator
- [ ] Delete own comment → Shows "[deleted]"
- [ ] Report comment → Appears in admin queue
- [ ] Admin hides comment → Marked as hidden
- [ ] Check user profile → Comment karma correct

---

## Validation with Claude Chrome

- [ ] Navigate to milestone detail page
- [ ] Verify comment section appears
- [ ] Post a test comment
- [ ] Reply to the comment
- [ ] Upvote the original comment
- [ ] Change sort to "New"
- [ ] Navigate to user profile
- [ ] Verify comment appears in history
- [ ] Screenshot comment thread UI

---

## Notes for Future Developers

### Thread Depth Limits
- Allow unlimited nesting in data
- UI collapses after depth 5 with "Continue this thread" link
- Deeply nested comments load on demand

### Markdown Support
- Support basic markdown: bold, italic, links, code, lists
- Sanitize HTML to prevent XSS
- Use remark/rehype for rendering

### Vote Spam Prevention
- One vote per user per comment
- Rate limit: max 30 votes per minute
- Detect and flag suspicious voting patterns

### Deleted Comments
- Soft delete only (isDeleted = true)
- Show "[deleted]" for body
- Preserve thread structure
- Hide author name on deleted comments

### Performance Considerations
- Paginate top-level comments (load 25 at a time)
- Lazy-load nested replies (collapse by default if > 3 replies)
- Cache hot scores (recalculate hourly, not on every vote)
- Index on (targetType, targetId, score) for efficient queries

### Karma Calculation
- Karma = sum of scores on user's comments
- Recalculate periodically, not on every vote
- Cap karma gain per comment to prevent manipulation

### Comment Formatting
```
**bold** → <strong>bold</strong>
*italic* → <em>italic</em>
[link](url) → <a href="url">link</a>
`code` → <code>code</code>
> quote → <blockquote>quote</blockquote>
```

### Future Enhancements
- Comment permalinks
- Notifications on replies
- Mention users with @username
- Pin important comments (admin)
- Highlight author comments on their own content
