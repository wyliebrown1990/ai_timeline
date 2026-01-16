# Sprint Feed-6: Gamification & Polish

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Claude (accessibility additions)

## Overview

Add gamification elements and final polish to create an addictive yet educational experience. This sprint adds consumption tracking, streaks, quiz integration, haptic feedback, and "take a break" prompts.

## Prerequisites

- [x] Sprint Feed-5 completed (sharing & collections work)
- [x] Existing news quiz system is functional
- [x] Session tracking is working

## Tasks

### 1. Daily Consumption Tracker ✅

#### 1.1 Create FeedProgress Component
- [x] Created `src/components/Feed/FeedProgress.tsx`
- [x] Displays items viewed, concepts learned, streak, session duration
- [x] Expandable with more details

#### 1.2 Track Session Stats
- [x] Using existing useFeedSession hook with sessionStorage
- [x] Tracks itemsViewed, conceptsLearned, sessionDurationMinutes
- [x] Updates on each item view

#### 1.3 Progress Display UI
- [x] Positioned at top of feed with backdrop blur
- [x] Shows streak fire emoji, items viewed, concepts learned
- [x] Tap to expand with full stats
- [x] Animated count-up when incrementing

### 2. Streak System ✅

#### 2.1 Create StreakService
- [x] Created `src/services/streakService.ts`
- [x] Methods: getCurrentStreak, updateStreak, getLastVisit, hasVisitedToday, getLongestStreak

#### 2.2 Streak Storage
- [x] Stored in localStorage (persists across sessions)
- [x] Tracks: currentStreak, lastVisitDate, longestStreak, totalDaysActive

#### 2.3 Streak Logic
- [x] Visit on consecutive day: Increment streak
- [x] Visit after 1+ days missed: Reset to 1
- [x] Update streak on feed mount

#### 2.4 Streak Display
- [x] Fire emoji + count in FeedProgress
- [x] Integrated with progress indicator
- [x] Animation on streak increment
- [x] Celebration animation on milestones (7, 14, 30, 60, 100, 365)

### 3. "Take a Break" System ✅

#### 3.1 Create BreakReminder Component
- [x] Created `src/components/Feed/BreakReminder.tsx`
- [x] Props: itemsViewed, minutesSpent, conceptsLearned, onContinue, onTakeBreak

#### 3.2 Trigger Conditions
- [x] After 20 items viewed OR 15 minutes
- [x] Checks every 30 seconds
- [x] Respects 5-minute cooldown after dismissal

#### 3.3 Break Reminder UI
- [x] Full-screen overlay with animations
- [x] Positive message: "Great learning session!"
- [x] Stats summary: Items viewed, concepts learned
- [x] Two CTAs: "Take a break" / "Keep learning"
- [x] Gentle, non-judgmental wellness-focused tone

### 4. Quiz Integration ✅

#### 4.1 Create FeedQuizPrompt
- [x] Created `src/components/Feed/FeedQuizPrompt.tsx`
- [x] Props: recentEventIds, itemsViewed, onStartQuiz, onSkip

#### 4.2 Quiz Prompt Trigger
- [x] After viewing 7-10 items (with randomness)
- [x] Appears as full-screen prompt
- [x] Once per session until dismissed

#### 4.3 Mini Quiz Experience
- [x] Navigates to existing /news/quiz page
- [x] Shows preview of 3-question quiz
- [x] "Continue reading" skip option

#### 4.4 Quiz Results Celebration
- [ ] Confetti animation on perfect score (deferred)
- [ ] Share quiz results option (deferred)

### 5. Haptic Feedback ✅

#### 5.1 Create HapticService
- [x] Created `src/services/hapticService.ts`
- [x] Methods: light, medium, heavy, success, error, double, custom, stop
- [x] Enable/disable via localStorage preference

#### 5.2 Implement Vibration API
- [x] Check for support: `'vibrate' in navigator`
- [x] Patterns implemented: light, medium, heavy, success, error, double

#### 5.3 Apply Haptics to Actions
- [x] Swipe complete: light
- [x] Save (swipe right): success
- [x] Not interested (swipe left): medium
- [x] Vote: medium
- [x] Double-tap save: double
- [ ] Quiz answers (deferred)

### 6. Sound Design (Optional)

#### 6.1 Create SoundService
- [ ] Create `src/services/soundService.ts`:
  ```typescript
  export const soundService = {
    play(sound: 'swipe' | 'vote' | 'save' | 'achievement'): void,
    setEnabled(enabled: boolean): void,
    isEnabled(): boolean,
  };
  ```

#### 6.2 Sound Files
- [ ] Short, subtle sounds (<100ms)
- [ ] Store in `/public/sounds/`
- [ ] Preload on feed mount
- [ ] Default: Disabled (opt-in in settings)

### 7. Achievement Badges (Optional)

#### 7.1 Define Achievement Types
- [ ] "First Steps" - View 10 items
- [ ] "Week Warrior" - 7-day streak
- [ ] "Knowledge Seeker" - Learn 50 concepts
- [ ] "Thought Leader" - Comment gets 10 upvotes
- [ ] "Early Adopter" - Use feed in first month

#### 7.2 Achievement Storage
- [ ] localStorage or user profile (if logged in)
- [ ] Track progress toward each achievement
- [ ] Unlock notification when achieved

#### 7.3 Achievement Display
- [ ] Toast notification on unlock
- [ ] Viewable in settings/profile
- [ ] Optional: Share achievement

### 8. Personalization Indicators

#### 8.1 "For You" Labels
- [ ] Tag items that match user's interests
- [ ] Based on: Concepts in flashcards, past upvotes, subject preferences
- [ ] Subtle badge: "Recommended for you"

#### 8.2 Learning Progress Connection
- [ ] "You're learning about this topic" indicator
- [ ] Shows if item relates to active flashcard concepts
- [ ] Reinforcement learning loop

### 9. Performance Polish

#### 9.1 Animation Performance Audit
- [ ] Profile animations in Chrome DevTools
- [ ] Ensure 60fps on mid-tier devices
- [ ] Reduce complexity if needed

#### 9.2 Load Time Optimization
- [ ] Lazy load images below fold
- [ ] Prefetch next 2 items' images
- [ ] Code-split feed components

#### 9.3 Memory Optimization
- [ ] Limit items in memory to 30
- [ ] Clean up event listeners on unmount
- [ ] Profile memory usage over extended sessions

### 10. Accessibility Polish

#### 10.1 Screen Reader Announcements
- [x] Announce card changes: "Now viewing item 3 of 25"
- [x] Announce vote results: "Upvoted. 124 total upvotes."
- [x] Announce save: "Saved to collection"

#### 10.2 Reduced Motion Final Check
- [x] Verify all animations disabled when preferred
- [x] Ensure functionality still works
- [ ] Test with macOS/iOS reduced motion setting

#### 10.3 Color Contrast Audit
- [ ] Run Lighthouse accessibility audit
- [ ] Fix any contrast issues
- [ ] Test with color blindness simulators

### 11. Final Polish

#### 11.1 Empty States
- [x] Review all empty states for personality
- [x] Add illustrations or icons
- [x] Helpful CTAs

#### 11.2 Error States
- [x] Network error: Retry button
- [x] API error: Helpful message
- [x] No results: Suggestions

#### 11.3 Loading States
- [x] Consistent skeleton patterns
- [x] Appropriate loading messages (screen reader)
- [x] Avoid layout shift

#### 11.4 Micro-copy Review
- [ ] Review all text for clarity
- [ ] Consistent tone (friendly, educational)
- [ ] No jargon without explanation

## Browser Testing & Validation

> **CRITICAL**: Use Claude Chrome MCP tools for final testing.

### Progress Tracker Testing
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to feed, view 5 items
- [ ] Verify progress counter updates
- [ ] Take screenshot showing progress

### Streak Testing
- [ ] View feed (creates/updates streak)
- [ ] Check localStorage for streak data
- [ ] Verify streak display shows correctly
- [ ] Simulate day change (modify localStorage)
- [ ] Verify streak increments

### Break Reminder Testing
- [ ] View 20+ items rapidly
- [ ] Verify break reminder appears
- [ ] Test "Keep learning" - verify dismissal
- [ ] Test "Take a break" - verify navigation

### Quiz Prompt Testing
- [ ] View 5-10 items
- [ ] Verify quiz prompt appears in feed
- [ ] Start quiz and complete
- [ ] Verify celebration animation on success

### Haptic Testing (Mobile)
- [ ] Load feed on mobile device or simulator
- [ ] Perform various actions
- [ ] Verify haptic feedback triggers
- [ ] Test with haptics disabled in settings

### Performance Testing
- [ ] Open Chrome DevTools Performance tab
- [ ] Record 30 seconds of swipe navigation
- [ ] Verify frame rate stays above 55fps
- [ ] Check for memory leaks

### Accessibility Testing
- [ ] Enable screen reader (VoiceOver/NVDA)
- [ ] Navigate through feed
- [ ] Verify all actions are announced
- [ ] Enable reduced motion
- [ ] Verify animations are disabled

### Final Checklist
- [ ] Check console for any errors: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network for failed requests: `mcp__claude-in-chrome__read_network_requests`
- [ ] Take screenshots of all major states
- [ ] Test on 3+ viewport sizes
- [ ] Test on iOS Safari (if possible)
- [ ] Test on Android Chrome (if possible)

## Acceptance Criteria

- [ ] Progress tracker shows items viewed and concepts learned
- [ ] Streak system tracks and displays consecutive days
- [ ] Streak animations play on milestones
- [ ] Break reminder appears after 20 items or 15 minutes
- [ ] Quiz prompt appears after 5-10 items
- [ ] Mini quiz works inline or navigates to quiz page
- [x] Haptic feedback triggers on all major actions
- [ ] Performance is smooth (60fps on mid-tier devices)
- [ ] Accessibility audit passes (Lighthouse 90+)
- [x] All empty/error/loading states are polished
- [x] Reduced motion preference is respected
- [ ] All browser validation tasks completed

## Notes for Future Developers

### Streak Calculation Edge Cases
```typescript
function updateStreak() {
  const lastVisit = getLastVisit();
  const now = new Date();
  const today = startOfDay(now);
  const lastVisitDay = lastVisit ? startOfDay(lastVisit) : null;

  if (!lastVisitDay) {
    // First visit ever
    setStreak(1);
  } else if (isSameDay(today, lastVisitDay)) {
    // Already visited today, no change
    return;
  } else if (differenceInDays(today, lastVisitDay) === 1) {
    // Visited yesterday, increment
    incrementStreak();
  } else {
    // Missed a day, reset
    setStreak(1);
  }

  setLastVisit(now);
}
```

### Haptic API Fallbacks
Some browsers don't support Vibration API. Fallback gracefully:
```typescript
function vibrate(pattern: number[]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
  // Silently fail on unsupported browsers
}
```

### Achievement Storage
For users without accounts, store achievements in localStorage:
```typescript
{
  achievements: {
    first_steps: { unlocked: true, unlockedAt: '2025-01-15' },
    week_warrior: { unlocked: false, progress: 5 },
    ...
  }
}
```

When user creates account, migrate localStorage achievements to database.

### Break Reminder Philosophy
The goal is digital wellness, not guilt. Messaging should be:
- Positive: "Great job learning!"
- Informative: Show stats
- Non-judgmental: No "you've been here too long"
- Empowering: User chooses to continue or stop
