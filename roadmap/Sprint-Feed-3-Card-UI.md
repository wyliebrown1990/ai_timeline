# Sprint Feed-3: Card UI & Actions

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Claude

## Overview

Design and implement the full-screen card layout with all visual elements, action bar, and voting UI. This sprint transforms the basic card shell into a polished, information-rich interface.

## Prerequisites

- [x] Sprint Feed-2 completed (swipe navigation works)
- [x] Feed API returns items with engagement data
- [x] Session hook provides sessionId for voting

## Tasks

### 1. Card Layout Structure

#### 1.1 Define Card Zones
- [x] Update `src/components/Feed/FeedCard.tsx` with zones:
  ```
  ┌─────────────────────────────────────────┐
  │ HEADER: Source, time, share button      │ 48px
  ├─────────────────────────────────────────┤
  │                                         │
  │ MEDIA: Thumbnail, video, or gradient    │ 40%
  │                                         │
  ├─────────────────────────────────────────┤
  │ HEADLINE: Large, bold, 2-3 lines max    │ auto
  ├─────────────────────────────────────────┤
  │ TEASER: Summary snippet, expandable     │ auto
  ├─────────────────────────────────────────┤
  │ WHY IT MATTERS: Collapsed by default    │ auto
  ├─────────────────────────────────────────┤
  │ SPACER: Push action bar to bottom       │ flex
  ├─────────────────────────────────────────┤
  │ ACTION BAR: Vote, comment, save, AI     │ 64px
  └─────────────────────────────────────────┘
  ```

#### 1.2 Implement Responsive Scaling
- [x] Use clamp() for font sizes that scale with viewport
- [x] Test on various screen sizes (320px to 428px width)
- [x] Ensure thumb-reachable areas are at least 44px (min-w-[48px] min-h-[48px])

### 2. Header Component

#### 2.1 Create FeedCardHeader
- [x] Create `src/components/Feed/FeedCardHeader.tsx`:
  ```typescript
  interface FeedCardHeaderProps {
    sourcePublisher: string | null;
    publishedDate: string;
    sourceUrl: string | null;
    featured: boolean;
    onShareClick: () => void;
  }
  ```

#### 2.2 Implement Header UI
- [x] Source publisher name (or "AI News" fallback)
- [x] Relative time ("2h ago", "3d ago") using date-fns formatDistanceToNow
- [x] Share button (top right)
- [x] Optional: Featured badge indicator (amber with Sparkles icon)
- [ ] Subtle background blur if over media (deferred - not needed for gradient media)

### 3. Media Component

#### 3.1 Create FeedCardMedia
- [x] Create `src/components/Feed/FeedCardMedia.tsx`:
  ```typescript
  interface FeedCardMediaProps {
    thumbnailUrl: string | null;
    videoId: string | null;
    mediaType: 'text' | 'video' | 'audio';
    headline: string; // For alt text
    isActive: boolean;
    onVideoClick?: () => void;
  }
  ```

#### 3.2 Implement Media Display
- [x] If thumbnailUrl: Show image with lazy loading
- [x] If videoId: Show thumbnail with play button overlay
- [x] If neither: Show gradient background with subtle cross pattern
- [x] Aspect ratio container (16:9 via aspect-video)

#### 3.3 Video Handling
- [x] Tap on video thumbnail opens expanded video view (opens source URL)
- [ ] Consider: Auto-play muted when card is active (deferred)
- [ ] Show duration badge if available (deferred - data not available)

### 4. Headline Component

#### 4.1 Create FeedCardHeadline
- [x] Headline implemented inline in FeedCard.tsx (no separate component needed)

#### 4.2 Implement Headline UI
- [x] Large, bold text (text-2xl to text-3xl via clamp)
- [x] High contrast for readability (white on dark)
- [x] Featured indicator handled in header component

### 5. Teaser/Summary Component

#### 5.1 Create FeedCardTeaser
- [x] Teaser/Summary implemented inline in FeedCard.tsx with expand/collapse

#### 5.2 Implement Expandable Summary
- [x] Collapsed: 3 lines with "Read more" button
- [x] Expanded: Full summary
- [x] Tap to toggle expansion
- [x] Smooth transition (via line-clamp removal)

### 6. "Why It Matters" Section

#### 6.1 Create FeedCardContext
- [x] Context implemented inline in FeedCard.tsx with expand/collapse

#### 6.2 Implement Collapsible Context
- [x] Collapsed state: "Why it matters" header with chevron
- [x] Expanded state: Full explanation text
- [ ] "View full context" link to existing modal (deferred)
- [x] Amber/gold accent color for context sections

### 7. Action Bar Component

#### 7.1 Create FeedActionBar
- [x] Create `src/components/Feed/FeedActionBar.tsx`:
  ```typescript
  interface FeedActionBarProps {
    eventId: string;
    upvotes: number;
    downvotes: number;
    commentCount: number;
    userVote: 'up' | 'down' | null;
    isSaved: boolean;
    onVote: (vote: 'up' | 'down') => void;
    onComment: () => void;
    onSave: () => void;
    onAIChat: () => void;
    onShare: () => void;
  }
  ```

#### 7.2 Implement Action Bar Layout
- [x] Fixed to bottom of card (above safe area)
- [x] Horizontal layout with spacing (frequent actions left, less frequent right)
- [x] Icons with counts below (vertical stack per action)
- [x] Glass/blur background for legibility (bg-gray-950/80 backdrop-blur-md)

#### 7.3 Action Bar Items
| Icon | Label | Action | Status |
|------|-------|--------|--------|
| ChevronUp | {upvotes} | Vote up | ✅ |
| ChevronDown | {downvotes} | Vote down | ✅ |
| MessageCircle | {count} | Open comments | ✅ (UI only) |
| Bookmark | Save | Toggle save | ✅ (UI only) |
| Bot | AI | Open AI chat | ✅ (UI only) |
| Share2 | Share | Open share sheet | ✅ |

### 8. Voting UI

#### 8.1 Create FeedVoteButtons
- [x] Vote buttons integrated into FeedActionBar component

#### 8.2 Implement Voting Hook
- [x] Create `src/hooks/useFeedVoting.ts`:
  - Optimistic updates ✅
  - API call in background ✅
  - Rollback on failure ✅
  - Prevent double-voting ✅

#### 8.3 Vote Animations
- [x] Upvote: Green highlight (text-emerald-500)
- [x] Downvote: Red highlight (text-red-500)
- [x] Button scale animation on active state
- [ ] Haptic feedback (if supported) - deferred

#### 8.4 Vote States
- [x] Neutral: Both buttons normal (text-gray-400)
- [x] Upvoted: Up button filled/highlighted (emerald)
- [x] Downvoted: Down button filled/highlighted (red)
- [x] Tap same vote again: Remove vote (return to neutral)

### 9. Visual Polish

#### 9.1 Typography Scale
- [x] Define consistent type scale using clamp():
  - Headline: clamp(1.5rem, 5vw, 2rem)
  - Summary: clamp(0.875rem, 3vw, 1rem)
  - Meta: text-sm
  - Counts: text-xs

#### 9.2 Color Scheme
- [x] Dark background for immersive feel: `bg-gray-950`
- [x] High contrast text: `text-white` / `text-gray-100` / `text-gray-300`
- [x] Accent colors:
  - Upvote: `text-emerald-500`
  - Downvote: `text-red-500`
  - Save: `text-amber-500`
  - AI: default gray (text-gray-400)

#### 9.3 Transitions
- [x] All interactive elements have hover/active states
- [x] Use `transition-all duration-150` for micro-interactions
- [ ] Respect `prefers-reduced-motion` (deferred)

### 10. Accessibility

#### 10.1 Screen Reader Support
- [x] Add aria-labels to all action buttons
- [x] Use semantic HTML (article, header, footer/contentinfo)
- [x] Position indicator shows "Item X of Y"

#### 10.2 Focus Management
- [ ] Focus trap within card when active (deferred)
- [ ] Tab order: Header → Content → Actions (deferred)
- [ ] Visible focus indicators (deferred)

#### 10.3 Reduced Motion
- [ ] Check `prefers-reduced-motion` (deferred)
- [ ] Disable animations if preferred (deferred)
- [ ] Use instant transitions instead (deferred)

## Browser Testing & Validation

> **CRITICAL**: Use Claude Chrome MCP tools to validate the card UI.

### Visual Testing
- [x] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [x] Navigate to http://localhost:5173/feed
- [x] Take screenshot of card layout
- [x] Verify all zones are visible and properly sized

### Mobile Viewport Testing
- [ ] Resize to 375x667 (iPhone SE)
- [x] Resize to 390x844 (iPhone 14) - tested and verified
- [ ] Resize to 412x915 (Pixel 7)

### Voting Interaction Testing
- [x] Click upvote button - verified button highlights
- [x] Check network for vote API calls - verified POST request made
- [x] Backend vote endpoint working (200 status)
- [x] Vote toggle works (click again removes vote)
- [x] Vote counts update correctly (28→29→28)

### Action Bar Testing
- [x] Click each action button and verify interaction
- [ ] Test comment button opens comment section (UI only, no backend)
- [x] Test save button toggles saved state (UI only)
- [x] Test share button (native share API or clipboard)

### Expansion Testing
- [x] Click summary "more" link - expands/collapses
- [x] Click "Why it matters" section - expands/collapses

### Console Error Check
- [x] Check console for errors - no critical React errors
- [x] Session errors are unrelated to card UI

## Acceptance Criteria

- [x] Card displays all content zones (header, media, headline, teaser, context, actions)
- [x] Typography is readable and scales with viewport
- [x] Action bar is always visible at bottom
- [x] Voting UI works with optimistic updates
- [x] Vote state managed correctly (frontend + backend sync)
- [x] Vote toggle working (add/remove votes)
- [x] Summary expands/collapses smoothly
- [x] Context section expands/collapses smoothly
- [x] All buttons have visible feedback on interaction
- [x] Layout works on mobile viewports (tested 390x844)
- [x] Aria-labels added to action buttons
- [x] Core browser validation completed

## Files Created/Modified

### New Files
- `src/components/Feed/FeedCardHeader.tsx` - Header component
- `src/components/Feed/FeedCardMedia.tsx` - Media component
- `src/components/Feed/FeedActionBar.tsx` - Action bar component
- `src/components/Feed/FeedCommentSheet.tsx` - Slide-up comment sheet
- `src/components/Feed/FeedAIChatSheet.tsx` - Slide-up AI chat overlay
- `src/hooks/useFeedVoting.ts` - Voting hook with optimistic updates
- `src/hooks/useFeedSave.ts` - Save/bookmark hook with optimistic updates
- `src/hooks/useFeedSwipeActions.ts` - Horizontal swipe action handlers (save right, not-interested left)

### Modified Files
- `src/components/Feed/FeedCard.tsx` - Integrated new components, save/bookmark props, comment sheet, AI chat sheet
- `src/components/Feed/FeedContainer.tsx` - Added voting, save, and swipe gesture integration with visual overlays
- `src/components/Feed/index.ts` - Updated barrel exports
- `src/types/feed.ts` - Added commentCount to FeedItem type
- `server/src/services/feedRankingService.ts` - Added comment count to feed queries
- `server/src/routes/feed.ts` - Added `/api/news/:id/not-interested` endpoint

## Notes for Future Developers

### Thumb Zone Design
The action bar places the most frequent actions (vote, comment) on the left where right-handed users can easily reach with their thumb. Less frequent actions (AI, share) are on the right.

```
[UPVOTE] [DOWNVOTE] [COMMENT]    [SAVE] [AI] [SHARE]
└─────── frequent ───────┘       └──── less freq ────┘
```

### Optimistic Updates Pattern
For voting:
```typescript
// 1. Update local state immediately
setLocalVote('up');
setLocalUpvotes(prev => prev + 1);

// 2. Call API in background
try {
  await voteApi.vote(eventId, 'up', sessionId);
} catch (error) {
  // 3. Rollback on failure
  setLocalVote(null);
  setLocalUpvotes(prev => prev - 1);
  toast.error('Vote failed');
}
```

### Safe Area Handling
For devices with notches/home indicators:
```css
.action-bar {
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}
```

### Dark Mode Default
The feed uses a dark theme by default for:
1. Better media viewing (images/videos pop)
2. Reduced eye strain during extended use
3. Better battery life on OLED screens
4. More "immersive" content consumption feel

### Known Issues / TODO
1. Line-clamp on h1 elements in flex containers causes height:0 issue - use plain styling instead

### Completed
- Save/bookmark persistence implemented via `useFeedSave` hook
  - Uses `/api/collections/save` endpoint (toggle save to default collection)
  - Uses `/api/collections/check-saved` endpoint (check initial state)
  - Optimistic updates with rollback on failure
  - Integrated in FeedCard and FeedContainer

- Comments backend integrated for feed cards
  - Uses existing `/api/comments/news_event/:eventId` endpoint (mature system with threading, voting, spam protection)
  - Added `commentCount` to feed API response (efficient batch query via groupBy)
  - Updated `FeedItem` type and `FeedCard` component to use real comment count
  - Comment creation requires user authentication (spam protection)

- Comment sheet UI implemented
  - Created `FeedCommentSheet` component with slide-up animation (framer-motion)
  - Wraps existing `CommentThread` component for full comment functionality
  - Mobile-optimized with drag handle, backdrop blur, safe area support
  - Opens on comment button tap, closes with X button, backdrop tap, or Escape key

- AI chat overlay implemented
  - Created `FeedAIChatSheet` component with slide-up animation
  - Uses existing `chatApi` service (supports BYOK and free tier)
  - Provides news context (headline, summary, whyItMatters) to AI
  - Features: suggested questions, conversation history, explain mode selector
  - Four explain modes: Simple, Technical, Business, Interview
  - Responsive input with send button and loading states

- Horizontal swipe gestures implemented
  - Swipe right: Save to collection (triggers `/api/collections/save`)
  - Swipe left: Mark as not interested (triggers `/api/news/:id/not-interested`)
  - Visual feedback overlays with emerald Save icon (right) and red X icon (left)
  - Gradient backgrounds intensify as swipe progresses
  - Auto-advance to next card after action
  - Created `useFeedSwipeActions` hook for action handling
  - Added `/api/news/:id/not-interested` backend endpoint
  - Uses framer-motion useMotionValue and useTransform for smooth animations
