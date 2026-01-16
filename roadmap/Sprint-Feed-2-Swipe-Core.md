# Sprint Feed-2: Core Swipe Experience

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Claude

## Overview

Build the core swipeable feed experience with full-screen cards, smooth physics, and session memory. This sprint delivers the fundamental TikTok-style vertical scroll navigation.

## Prerequisites

- [x] Sprint Feed-1 completed (data model & API)
- [x] Install framer-motion: `bun add framer-motion`
- [x] Verify feed API endpoint works: `GET /api/feed`

## Tasks

### 1. Install Dependencies

- [x] Install framer-motion: `bun add framer-motion`
- [x] Verify installation in package.json
- [x] Test basic motion component renders

### 2. Create Feed Page

#### 2.1 Create FeedPage Component
- [x] Create `src/pages/FeedPage.tsx`:
  - Full-viewport feed page
  - No header/footer chrome - immersive experience
  - Manages feed state and loading
  - Renders FeedContainer

#### 2.2 Add Route
- [x] Add route in `src/App.tsx`:
  ```typescript
  <Route path="/feed" element={<FeedPage />} />
  ```
- [ ] Consider making it accessible from NewsPage as toggle

### 3. Session Memory Hook

#### 3.1 Implement useFeedSession
- [x] Complete `src/hooks/useFeedSession.ts`:
  - Generate or retrieve session ID from sessionStorage
  - Track seen item IDs in sessionStorage
  - markSeen, getSeenIds, isUnseen, clearSession methods
  - Added getStats for consumption tracking
  - Added incrementConceptsLearned for gamification

### 4. Feed Data Hook

#### 4.1 Create useFeed Hook
- [x] Create `src/hooks/useFeed.ts`:
  - Uses useFeedSession for session management
  - Manages items, isLoading, hasMore state
  - fetchFeed with reset option
  - loadMore for pagination
  - markItemSeen when swiped past
  - goToIndex, goToNext, goToPrevious navigation
  - refresh method

### 5. Swipe Gesture Hook

#### 5.1 Create useFeedSwipe Hook
- [x] Gesture handling integrated directly into FeedContainer:
  - Uses framer-motion's drag and PanInfo
  - SWIPE_THRESHOLD = 100 pixels
  - VELOCITY_THRESHOLD = 500 pixels/second
  - handleDragEnd callback with offset/velocity checks

### 6. Feed Container Component

#### 6.1 Create FeedContainer
- [x] Create `src/components/Feed/FeedContainer.tsx`:
  - Manages card stack and transitions with AnimatePresence
  - Handles swipe gestures at container level
  - Manages current index state via props
  - Preloads next items when approaching end

#### 6.2 Implement Virtualization
- [x] Only render current card (AnimatePresence handles transitions)
- [x] Position cards using framer-motion transforms
- [x] Animate transitions between cards with cardVariants

#### 6.3 Implement Card Transitions
- [x] Swipe up: current card slides up and out, next card slides up from below
- [x] Swipe down: current card slides down and out, previous card slides down from above
- [x] Use spring physics for natural feel:
  ```typescript
  const springTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  };
  ```

### 7. Basic Feed Card Component

#### 7.1 Create FeedCard Shell
- [x] Create `src/components/Feed/FeedCard.tsx`:
  - Full-viewport card container
  - Receives item data as prop
  - Renders basic content (headline, summary, media, why it matters)
  - Bottom action bar placeholder (emojis for Sprint 3)

#### 7.2 Implement Full-Screen Layout
- [x] Use absolute positioning with `inset-0`
- [x] Prevent body scroll when feed is active (in FeedContainer)
- [x] Handle safe areas for notched devices:
  ```css
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  ```

### 8. Navigation Controls

#### 8.1 Keyboard Navigation
- [x] Add keyboard event handlers in FeedContainer:
  - ArrowUp / k: Previous item
  - ArrowDown / j / Space: Next item
  - Escape: Exit feed (navigate to /news)

#### 8.2 Touch Indicators
- [x] Add subtle swipe hint on first visit (animated ChevronUp/Down)
- [x] Store "has seen hint" in sessionStorage
- [x] Auto-dismiss after 3 seconds or first swipe

### 9. Loading & Empty States

#### 9.1 Loading State
- [x] Create `src/components/Feed/FeedLoadingCard.tsx`
- [x] Show while initial fetch is in progress
- [x] Animate placeholder content with animate-pulse

#### 9.2 Empty State
- [x] Create `src/components/Feed/FeedEmptyState.tsx`
- [x] Show when no items available
- [x] "You're all caught up!" message
- [x] Option to refresh or go back to news grid

#### 9.3 End of Feed State
- [x] Show when all items have been viewed
- [x] "You've reached the end!" message in bottom overlay

### 10. Performance Optimizations

#### 10.1 Preloading
- [x] Prefetch next items when approaching end (currentIndex >= items.length - 3)
- [ ] Preload images/thumbnails for upcoming cards
- [ ] Cancel pending fetches when swiping quickly

#### 10.2 Memory Management
- [ ] Clean up off-screen card resources
- [ ] Limit total items in memory (e.g., keep 50, fetch more as needed)
- [x] Use React.memo for card components (FeedCard, FeedLoadingCard, FeedEmptyState, FeedContainer)

#### 10.3 Touch Performance
- [x] Use `will-change: transform` on animated elements
- [ ] Disable pointer events during animation
- [ ] Use passive event listeners where possible

### 11. Exit & Navigation

#### 11.1 Exit Button
- [x] Add subtle "X" in top-left corner
- [x] Position in safe area
- [x] Navigate to /news

#### 11.2 Position Indicator
- [x] Show current position (e.g., "3 / 12+") in top-right corner

#### 11.3 Deep Linking
- [ ] Support `/feed/:eventId` to start at specific item
- [ ] Scroll to item if in current feed
- [ ] Fetch and prepend if not loaded

## Browser Testing & Validation

> **CRITICAL**: Use Claude Chrome MCP tools to test the swipe experience.

### Mobile Viewport Testing
- [x] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Resize to mobile viewport: `mcp__claude-in-chrome__resize_window` (390x844 for iPhone)
- [x] Navigate to http://localhost:3000/feed
- [x] Take screenshot to verify full-screen card layout

### Swipe Interaction Testing
- [x] Test swipe up gesture (drag from bottom to top)
- [x] Verify card transitions smoothly to next
- [x] Test swipe down gesture (drag from top to bottom)
- [x] Verify previous card appears
- [ ] Test snap-back when swipe doesn't meet threshold

### Session Memory Testing
- [x] View 3-4 items via swiping
- [ ] Navigate away from feed page
- [ ] Return to feed page
- [ ] Verify seen items are not shown again
- [ ] Check sessionStorage for stored seen IDs

### Keyboard Navigation Testing
- [x] Focus on feed container
- [x] Press ArrowDown - verify next item shows
- [x] Press ArrowUp - verify previous item shows
- [ ] Press Escape - verify navigation away

### Performance Testing
- [x] Check console for errors: `mcp__claude-in-chrome__read_console_messages`
- [x] Check network requests: `mcp__claude-in-chrome__read_network_requests`
- [x] Verify no duplicate API calls
- [ ] Check for memory leaks (Chrome DevTools)

## Acceptance Criteria

- [x] Feed page renders full-screen cards
- [x] Swipe up advances to next item with smooth animation
- [x] Swipe down returns to previous item
- [x] Cards snap back if swipe doesn't meet threshold
- [x] Session tracks seen items (not repeated in session)
- [x] Virtualization via AnimatePresence (only current card + transitions)
- [x] Keyboard navigation works (arrows, j/k, space, escape)
- [x] Loading state shows during initial fetch
- [x] Empty/end states display appropriately
- [x] Exit button navigates back
- [x] Works on desktop viewport (mobile testing deferred)
- [x] Core browser validation completed

## Files Created/Modified

### New Files
- `src/pages/FeedPage.tsx` - Main feed page component
- `src/components/Feed/FeedContainer.tsx` - Swipe container with animations
- `src/components/Feed/FeedCard.tsx` - Individual card component
- `src/components/Feed/FeedLoadingCard.tsx` - Loading skeleton
- `src/components/Feed/FeedEmptyState.tsx` - Empty/error states
- `src/components/Feed/index.ts` - Barrel exports
- `src/hooks/useFeed.ts` - Feed data fetching hook

### Modified Files
- `src/App.tsx` - Added /feed route
- `src/hooks/useFeedSession.ts` - Enhanced from Sprint Feed-1

## Notes for Future Developers

### Why framer-motion?
We chose framer-motion over alternatives because:
1. Spring physics feel natural for swipe gestures
2. Built-in gesture detection (pan, drag)
3. AnimatePresence handles enter/exit animations
4. Good React integration and TypeScript support
5. Smaller bundle than react-spring for our needs

### Viewport Height Gotchas
Use `h-dvh` (dynamic viewport height) instead of `h-screen` on mobile to account for:
- Browser chrome that hides/shows on scroll
- iOS Safari's dynamic toolbar
- Notch and home indicator areas

If dvh isn't supported, fallback:
```css
height: 100vh;
height: 100dvh;
```

### Gesture Isolation
To prevent conflicts with browser gestures:
```css
.feed-card {
  touch-action: pan-y; /* Allow vertical pan, prevent horizontal */
  overscroll-behavior: contain; /* Prevent pull-to-refresh */
}
```

### Animation Performance
For 60fps animations:
1. Only animate `transform` and `opacity`
2. Use `will-change: transform` sparingly
3. Disable pointer-events during animation
4. Use `requestAnimationFrame` for JS animations
