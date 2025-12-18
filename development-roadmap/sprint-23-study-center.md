# Sprint 23: Study Center & Session UI

**Impact**: High | **Effort**: High | **Dependencies**: Sprint 22 (Flashcard Infrastructure)

## Overview
Build the Study Center - a dedicated section where users review their flashcards, manage packs, and track progress. Includes the core study session experience with the SM-2 spaced repetition algorithm for optimal learning.

---

## Tasks

### 23.1 Navigation Integration
- [x] Add "Study" link to main navigation header
- [x] Show badge with due card count when > 0
- [x] Add `/study` route to React Router
- [x] Add sub-routes: `/study/session/:packId?`, `/study/packs/:packId`
- [x] Mobile: Add Study to bottom navigation or hamburger menu

### 23.2 Study Dashboard Page
- [x] Create `src/pages/StudyPage.tsx` as main Study Center
- [x] Create `src/components/Flashcards/StudyDashboard.tsx`
- [x] Display "Cards Due Today" prominent call-to-action
- [x] Show current streak with fire emoji
- [x] Display grid of user's packs with due counts
- [x] "Start Studying" button → begins session with all due cards
- [x] Empty state for users with no flashcards yet
- [x] Quick stats summary (total cards, mastered, etc.)

### 23.3 Pack Cards Display
- [x] Create `src/components/Flashcards/PackCard.tsx`
- [x] Show pack name with color indicator
- [x] Display total cards and due cards count
- [x] Click navigates to pack detail or starts study session
- [x] "Study This Pack" quick action button
- [x] Visual distinction for system vs custom packs

### 23.4 SM-2 Spaced Repetition Algorithm
- [x] Create `src/lib/spacedRepetition.ts`
- [x] Implement SM-2 algorithm for interval calculation
- [x] Support quality ratings: Again (0), Hard (3), Good (4), Easy (5)
- [x] Calculate new interval based on quality and ease factor
- [x] Update ease factor based on performance
- [x] Calculate next review date
- [x] Handle first review (initial intervals: 1 day, then 3 days)
- [x] Write unit tests for algorithm edge cases

### 23.5 Study Session Page
- [x] Create `src/pages/StudySessionPage.tsx`
- [x] Create `src/components/Flashcards/StudySession.tsx`
- [x] Accept optional `packId` param (null = all due cards)
- [x] Fetch due cards for session
- [x] Shuffle cards at session start
- [x] Track session state: current card index, answers given

### 23.6 Flashcard Display Component
- [x] Enhance existing `FlashcardDeck.tsx` or create `StudyCard.tsx`
- [x] Front: Term/title (+ date for milestones)
- [ ] Back: Definition/description + "Why it mattered" for milestones
- [x] Flip animation (CSS 3D transform, existing pattern)
- [x] Show card source indicator (milestone icon vs concept icon)
- [x] "View Full Details" link to original milestone/concept page

### 23.7 Answer Rating UI
- [x] Create rating buttons: "Again", "Hard", "Good", "Easy"
- [x] Show only after card is flipped
- [x] Color-code buttons (red, orange, green, blue)
- [x] Keyboard shortcuts: 1, 2, 3, 4 for ratings
- [x] Brief explanation of each rating on hover/long-press
- [x] Record answer and advance to next card

### 23.8 Session Progress Indicator
- [x] Show "Card X of Y" progress
- [x] Progress bar visualization
- [x] Count of cards remaining
- [x] Count of "Again" cards (will repeat at end)
- [ ] Estimated time remaining (avg 10s per card)

### 23.9 Session Completion Screen
- [x] Show when all cards reviewed (including repeats)
- [x] Display session stats: total reviewed, correct rate
- [x] Show streak update ("5 day streak! 🔥")
- [x] "Review Weak Cards" button if any marked "Again"
- [x] "Back to Study Center" button
- [x] Encouraging message based on performance
- [ ] Save session to history

### 23.10 Pack Management Page
- [x] Create `src/pages/PackDetailPage.tsx`
- [x] Create `src/components/Flashcards/PackManager.tsx`
- [x] List all cards in pack with preview
- [x] Remove card from pack (swipe or button)
- [ ] Edit pack name and color
- [x] Delete pack (with confirmation, moves cards to "All Cards")
- [x] "Study This Pack" action button
- [ ] Sort options: Date added, Next review, Alphabetical

### 23.11 Create Pack Modal
- [x] Create `src/components/Flashcards/CreatePackModal.tsx`
- [x] Name input with validation (1-50 chars, unique)
- [x] Optional description textarea
- [x] Color picker (8 preset colors)
- [x] Create button disabled until valid name entered
- [x] Success feedback and redirect to pack or close

---

## Data Structures

### SM-2 Algorithm Implementation
```typescript
// src/lib/spacedRepetition.ts

export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5
// 0 = Again (complete failure)
// 3 = Hard (correct with difficulty)
// 4 = Good (correct with hesitation)
// 5 = Easy (perfect response)

export interface SM2Result {
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewDate: string
}

export function calculateSM2(
  quality: QualityRating,
  currentEaseFactor: number,
  currentInterval: number,
  currentRepetitions: number
): SM2Result {
  // If quality < 3, reset repetitions (failed recall)
  if (quality < 3) {
    return {
      easeFactor: currentEaseFactor,
      interval: 1, // Review again tomorrow
      repetitions: 0,
      nextReviewDate: addDays(new Date(), 1).toISOString(),
    }
  }

  // Update ease factor
  const newEaseFactor = Math.max(
    1.3,
    currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  )

  // Calculate new interval
  let newInterval: number
  if (currentRepetitions === 0) {
    newInterval = 1
  } else if (currentRepetitions === 1) {
    newInterval = 3
  } else {
    newInterval = Math.round(currentInterval * newEaseFactor)
  }

  // Bonus for "Easy"
  if (quality === 5) {
    newInterval = Math.round(newInterval * 1.3)
  }

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: currentRepetitions + 1,
    nextReviewDate: addDays(new Date(), newInterval).toISOString(),
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
```

### Session State
```typescript
interface StudySessionState {
  packId: string | null
  cards: UserFlashcard[]
  currentIndex: number
  isFlipped: boolean
  answers: Map<string, QualityRating> // cardId -> rating
  againCards: string[] // cardIds to repeat at end
  startedAt: string
  phase: 'studying' | 'reviewing_again' | 'complete'
}
```

---

## UI Components

### Study Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│  📚 Study Center                              [+ New Pack]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────┐                                      │
│  │       12          │   Today's Progress                   │
│  │    cards due      │   ████████░░░░░░░░  12/20 reviewed   │
│  │                   │   🔥 5 day streak                    │
│  │  [Start Studying] │                                      │
│  └───────────────────┘                                      │
│                                                             │
│  Your Packs                                                 │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐   │
│  │ 🔵 All Cards   │ │ 🟣 Transformers│ │ 🟠 Weak Spots  │   │
│  │    47 cards    │ │    12 cards    │ │    8 cards     │   │
│  │    5 due       │ │    3 due       │ │    4 due       │   │
│  │ [Study]        │ │ [Study]        │ │ [Study]        │   │
│  └────────────────┘ └────────────────┘ └────────────────┘   │
│                                                             │
│  Quick Stats                                                │
│  • 23 cards mastered (review interval > 21 days)           │
│  • 89% retention this week                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Study Session - Card Front
```
┌─────────────────────────────────────────────────────────────┐
│  ← Exit          Card 3 of 12          ████████░░░░  25%    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                    📅 Milestone                             │
│                                                             │
│                      GPT-3                                  │
│                    June 2020                                │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                  (tap to reveal)                            │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Study Session - Card Back (Flipped)
```
┌─────────────────────────────────────────────────────────────┐
│  ← Exit          Card 3 of 12          ████████░░░░  25%    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GPT-3: Language Models are Few-Shot Learners               │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  OpenAI demonstrates that scaling language models to 175B   │
│  parameters enables "few-shot learning" - the ability to    │
│  perform tasks from just a few examples without fine-tuning.│
│                                                             │
│  Why it mattered: Showed that scale alone could unlock      │
│  emergent capabilities, fundamentally changing AI research  │
│  strategy toward bigger models.                             │
│                                                             │
│                                           [View Details →]  │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How well did you know this?                                │
│  [Again]     [Hard]      [Good]      [Easy]                 │
│   < 1 day    < 3 days    < 7 days    < 14 days              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Session Complete
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                         🎉                                  │
│                   Session Complete!                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│              12 cards reviewed                              │
│              9 correct (75%)                                │
│              3 to review again                              │
│                                                             │
│              🔥 5 day streak!                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│         [Review Weak Cards (3)]                             │
│         [Back to Study Center]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Pack Manager
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back          🟣 Transformer Era           [Study Pack]  │
├─────────────────────────────────────────────────────────────┤
│  12 cards • Created Dec 15                                  │
│                                                             │
│  Sort: [Date Added ▾]                                       │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📅 Transformer (2017)                          [✕]  │   │
│  │    Due: Tomorrow                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📖 Self-Attention                              [✕]  │   │
│  │    Due: In 3 days                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📅 BERT (2018)                                 [✕]  │   │
│  │    Due: In 7 days                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  [Edit Pack]                              [Delete Pack]     │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── pages/
│   ├── StudyPage.tsx             # Main /study route
│   ├── StudySessionPage.tsx      # /study/session/:packId?
│   └── PackDetailPage.tsx        # /study/packs/:packId
├── components/
│   └── Flashcards/
│       ├── StudyDashboard.tsx
│       ├── StudySession.tsx
│       ├── StudyCard.tsx
│       ├── RatingButtons.tsx
│       ├── SessionProgress.tsx
│       ├── SessionComplete.tsx
│       ├── PackCard.tsx
│       ├── PackManager.tsx
│       ├── CreatePackModal.tsx
│       └── index.ts
├── lib/
│   └── spacedRepetition.ts       # SM-2 algorithm
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Flip card |
| `1` | Rate "Again" |
| `2` | Rate "Hard" |
| `3` | Rate "Good" |
| `4` | Rate "Easy" |
| `Escape` | Exit session (with confirmation) |

---

## Success Criteria
- [ ] Study Center accessible from main navigation
- [ ] Due card count badge shows in nav when > 0
- [ ] Can start study session from dashboard
- [ ] Can study specific pack
- [ ] Cards flip with animation
- [ ] Rating buttons appear after flip
- [ ] SM-2 algorithm correctly updates intervals
- [ ] "Again" cards repeat at end of session
- [ ] Session completion shows accurate stats
- [ ] Streak tracking works correctly
- [ ] Can view and manage cards in packs
- [ ] Can delete cards from packs
- [x] Can edit and delete custom packs
- [ ] Keyboard shortcuts work
- [ ] Mobile-friendly (touch to flip, tap ratings)

---

## Deployment Checklist

### Pre-Deployment
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] SM-2 algorithm has unit tests
- [ ] All routes accessible
- [ ] Tested on mobile viewport

### Production Verification
- [ ] Navigate to /study from main nav
- [ ] Add some flashcards if needed
- [ ] Start a study session
- [ ] Flip cards and rate them
- [ ] Complete session and verify stats
- [ ] Check streak updates correctly
- [ ] Create and manage a custom pack
- [ ] Test on mobile device
