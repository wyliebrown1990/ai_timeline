# Sprint Feed-4: Engagement Features

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Claude

## Overview

Add engagement features that make the feed interactive and educational: comment previews, AI chat overlay, concept chips, and swipe gestures. These features transform passive scrolling into active learning.

## Prerequisites

- [x] Sprint Feed-3 completed (card UI & voting work)
- [x] Existing comment system is functional
- [x] Existing AI explanation API is available
- [ ] Existing concept linking system works

## Tasks

### 1. Comment Preview ("Hot Takes") ✅

#### 1.1 Create FeedCommentPreview
- [x] Created `src/components/Feed/FeedCommentPreview.tsx`

#### 1.2 Fetch Top Comments
- [x] Uses existing: `GET /api/comments/news_event/:id?sort=best&limit=2`
- [x] Only fetches if comment count > 0
- [x] Resets when eventId changes

#### 1.3 Implement Preview UI
- [x] Floating badge style with glass/blur effect
- [x] Shows 1-2 "hot" comments (highest score)
- [x] Truncates to ~80 characters
- [x] Shows commenter avatar or gradient initial
- [x] "View all X comments" link with chevron
- [x] Position: Bottom, above action bar

#### 1.4 Interaction
- [x] Tap preview: Opens full comment thread
- [x] Animate in after card settles (300ms delay via framer-motion)

### 2. AI Chat Overlay ✅ (Completed in Sprint Feed-3)

#### 2.1 Create FeedAIChat
- [x] Created `src/components/Feed/FeedAIChatSheet.tsx`

#### 2.2 Implement Slide-Up Panel
- [x] Slide up from bottom, covers 80% of screen
- [x] X button to dismiss
- [x] Semi-transparent backdrop with blur
- [x] Smooth spring animation via framer-motion

#### 2.3 Chat Interface
- [x] Message list with user/AI bubbles
- [x] Input field at bottom (with safe area padding)
- [x] Send button
- [x] Loading indicator while AI responds

#### 2.4 Quick Prompts
- [x] Show 4 suggested question buttons
- [x] Tap to auto-send prompt

#### 2.5 Context-Aware AI
- [x] Pass event context (headline, summary, whyItMatters) to AI API
- [x] Uses existing `/api/chat` endpoint with BYOK support

#### 2.6 Interaction Tracking
- [ ] Record 'chat' interaction when AI chat is opened (deferred)
- [ ] Track which prompts are most used (deferred)

### 3. Concept Chips ✅

#### 3.1 Create FeedConceptChips
- [x] Created `src/components/Feed/FeedConceptChips.tsx`

#### 3.2 Fetch Linked Concepts
- [x] Uses existing: `GET /api/current-events/:id/concepts`
- [x] Shows key topics first (sorted), then secondary concepts
- [x] Limited to 5 chips visible, "+N more" for overflow

#### 3.3 Implement Chip UI
- [x] Horizontal scrollable row with scrollbar-hide
- [x] Pill-shaped chips with concept term
- [x] Key topics: Amber background with Sparkles icon
- [x] Secondary: Gray outline style
- [x] Position: Below teaser, above "Why it matters"

#### 3.4 Concept Popover
- [x] Tap chip: Shows popover with definition
- [x] Popover includes:
  - Term name with key topic indicator
  - Short definition from glossary
  - "Add to flashcards" button (emerald)
  - "Learn more" link to glossary page (blue)
- [x] Dismiss: Tap outside or X button

#### 3.5 Add to Flashcards
- [ ] Integrate with FlashcardContext (placeholder added)
- [ ] Show toast confirmation (deferred)

### 4. Swipe Gestures (Horizontal) ✅ (Completed in Sprint Feed-3)

#### 4.1 Implement Horizontal Swipe Detection
- [x] Created `src/hooks/useFeedSwipeActions.ts`
- [x] Updated FeedContainer.tsx with horizontal swipe detection
- [x] Threshold: 80px or 400px/s velocity

#### 4.2 Swipe Right: Save to Collection
- [x] Detect horizontal swipe right (>80px)
- [x] Show visual indicator (emerald bookmark icon)
- [x] Save to collection via `/api/collections/save`
- [x] Auto-advance to next card

#### 4.3 Swipe Left: Not Interested
- [x] Detect horizontal swipe left (>80px)
- [x] Show visual indicator (red X icon)
- [x] Record 'not_interested' interaction via `/api/news/:id/not-interested`
- [x] Advance to next card

#### 4.4 Visual Feedback During Swipe
- [x] Show overlay indicating action:
  - Right swipe: Emerald gradient + bookmark icon + "Save" label
  - Left swipe: Red gradient + XCircle icon + "Not Interested" label
- [x] Opacity increases with swipe distance (useTransform)
- [x] Snap back if not past threshold

### 5. Comment Thread Integration ✅ (Completed in Sprint Feed-3)

#### 5.1 Create FeedCommentSheet
- [x] Created `src/components/Feed/FeedCommentSheet.tsx`

#### 5.2 Implement Comment Sheet
- [x] Slide up from bottom via framer-motion
- [x] Reuses existing CommentThread component
- [x] Shows comment count in header
- [x] Mobile-optimized with drag handle, backdrop blur, safe area

#### 5.3 New Comment Flow
- [x] Uses existing CommentThread which handles compose
- [x] Submit: Creates comment via existing API
- [x] CommentThread handles optimistic updates

### 6. Engagement Animations

#### 6.1 Vote Animations
- [ ] Upvote: Floating "+1" that fades up
- [ ] Downvote: Subtle shake
- [ ] Heart burst on double-tap (if implementing super upvote)

#### 6.2 Save Animation
- [ ] Bookmark fills in with bounce
- [ ] Brief checkmark overlay

#### 6.3 Add to Flashcards Animation
- [ ] Card flies toward corner
- [ ] "+1" badge on flashcard icon (if visible)

### 7. "Learn in 30 Seconds" Teaser

#### 7.1 Create FeedLearnTeaser
- [ ] Create `src/components/Feed/FeedLearnTeaser.tsx`:
  ```typescript
  interface FeedLearnTeaserProps {
    eventId: string;
    tldr: string | null;
    prerequisiteCount: number;
    onStartPath: () => void;
  }
  ```

#### 7.2 Implement Teaser UI
- [ ] Collapsible section below "Why it matters"
- [ ] "Learn this in 30 seconds" header
- [ ] If TLDR available: Show "3 things to know"
- [ ] Show milestone count: "Understand with 3 key milestones"
- [ ] "Start learning" CTA

#### 7.3 Start Learning Flow
- [ ] Tap CTA: Navigate to context path
- [ ] Or: Open mini learning modal (stretch goal)

## Browser Testing & Validation

> **CRITICAL**: Use Claude Chrome MCP tools to test engagement features.

### Comment Preview Testing
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to feed item with comments
- [ ] Verify hot take preview appears
- [ ] Tap preview - verify comment sheet opens
- [ ] Check network for comment API calls

### AI Chat Testing
- [ ] Tap AI button in action bar
- [ ] Verify chat overlay slides up
- [ ] Tap a quick prompt
- [ ] Verify message sends and AI responds
- [ ] Drag handle down - verify dismissal
- [ ] Check console for errors: `mcp__claude-in-chrome__read_console_messages`

### Concept Chips Testing
- [ ] Verify concept chips appear below teaser
- [ ] Tap a chip - verify popover appears
- [ ] Tap "Add to flashcards" - verify toast appears
- [ ] Tap outside popover - verify dismissal
- [ ] Scroll chips horizontally if overflow

### Swipe Gesture Testing
- [ ] Swipe right on card - verify flashcard action
- [ ] Verify toast shows added concepts
- [ ] Swipe left on card - verify "not interested"
- [ ] Verify card advances to next

### Animation Testing
- [ ] Vote and verify animation plays
- [ ] Save and verify bookmark animation
- [ ] Add concept to flashcards - verify animation
- [ ] Test with `prefers-reduced-motion` enabled

## Acceptance Criteria

- [ ] Comment preview shows 1-2 hot comments
- [ ] Tapping preview opens full comment thread
- [ ] AI chat overlay slides up smoothly
- [ ] Quick prompts send immediately
- [ ] AI responds with context-aware answers
- [ ] Concept chips display and scroll
- [ ] Tapping chip shows definition popover
- [ ] Add to flashcards works from popover
- [ ] Swipe right adds concepts to flashcards
- [ ] Swipe left marks "not interested" and advances
- [ ] All animations are smooth and respect reduced motion
- [ ] Interactions are tracked in database
- [ ] All browser validation tasks completed

## Notes for Future Developers

### Comment Preview Positioning
Position the hot take preview to not overlap with swipe gestures:
```css
.comment-preview {
  position: absolute;
  bottom: 80px; /* Above action bar */
  left: 16px;
  right: 16px;
  pointer-events: auto;
}
```

### AI Chat Context
The AI should have context about:
1. The news event details
2. Related concepts (for terminology)
3. Historical context (prerequisite milestones)
4. The user's learning history (if available)

System prompt example:
```
You are helping a user understand an AI news story. Be concise (2-3 sentences max).
The story is about: {headline}
Key concepts involved: {concepts}
Historical context: {whyItMatters}
```

### Swipe Gesture Priority
When both vertical and horizontal swipes are detected:
1. Check horizontal first (if > 50px)
2. Otherwise, process vertical
3. Prevents accidental horizontal swipes while scrolling

### Flashcard Batch Add
When swiping right, add all key concepts (isKeyTopic: true) at once:
```typescript
const keyConcepts = concepts.filter(c => c.isKeyTopic);
await Promise.all(keyConcepts.map(c => flashcardApi.add(c.id)));
```
