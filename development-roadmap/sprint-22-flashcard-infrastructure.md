# Sprint 22: Flashcard Infrastructure & Add-to-Deck UX

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 13 (Checkpoints - existing FlashcardDeck component)

## Overview
Build the core flashcard system infrastructure: data models, state management, and the "Add to Flashcards" UX that appears throughout the app. Users should be able to add any milestone or concept to their personal flashcard collection from wherever they encounter it.

---

## Tasks

### 22.1 Data Models & Schemas
- [ ] Create `UserFlashcard` Zod schema with spaced repetition fields
- [ ] Create `FlashcardPack` Zod schema for custom deck organization
- [ ] Create `FlashcardReviewSession` schema for session tracking
- [ ] Create `FlashcardStats` schema for aggregate statistics
- [ ] Add schemas to `src/types/flashcard.ts`
- [ ] Export all types from types index

### 22.2 Flashcard Store Hook
- [ ] Create `useFlashcardStore.ts` hook following `useCheckpointProgress` pattern
- [ ] Implement localStorage persistence (`ai-timeline-flashcards` key)
- [ ] Implement `addCard(sourceType, sourceId, packIds?)` action
- [ ] Implement `removeCard(cardId)` action
- [ ] Implement `getCardBySource(sourceType, sourceId)` for duplicate detection
- [ ] Implement `getDueCards(packId?)` for review queue
- [ ] Add migration support for schema changes
- [ ] Write unit tests for store operations

### 22.3 Pack Management Functions
- [ ] Implement `createPack(name, description?, color?)` action
- [ ] Implement `deletePack(packId)` action
- [ ] Implement `renamePack(packId, name)` action
- [ ] Implement `moveCardToPack(cardId, packId)` action
- [ ] Implement `removeCardFromPack(cardId, packId)` action
- [ ] Create default system packs on first use ("All Cards", "Recently Added")
- [ ] Persist packs to localStorage (`ai-timeline-flashcard-packs` key)

### 22.4 FlashcardContext Provider
- [ ] Create `FlashcardContext.tsx` following `UserProfileContext` pattern
- [ ] Wrap app in provider in `App.tsx`
- [ ] Export `useFlashcardContext()` hook for component access
- [ ] Include computed values: `totalCards`, `dueToday`, `hasCards`
- [ ] Add `isCardSaved(sourceType, sourceId)` helper for UI state

### 22.5 AddToFlashcardButton Component
- [ ] Create `src/components/Flashcards/AddToFlashcardButton.tsx`
- [ ] Support `variant`: "icon" (just bookmark icon) or "button" (with text)
- [ ] Support `size`: "sm", "md", "lg" for different contexts
- [ ] Show filled bookmark if already saved, outline if not
- [ ] Toggle save/unsave on click (single pack mode)
- [ ] Add tooltip: "Add to Flashcards" / "Remove from Flashcards"
- [ ] Include `data-testid` attributes for testing

### 22.6 PackPicker Popover Component
- [ ] Create `src/components/Flashcards/PackPicker.tsx`
- [ ] Show list of user's packs with checkboxes
- [ ] Allow selecting multiple packs for a card
- [ ] Include "Create New Pack" option at bottom
- [ ] Quick pack creation inline (name input + create button)
- [ ] Show pack colors as badges/dots
- [ ] Close on outside click or Escape key

### 22.7 Integration: Event Detail Panel
- [ ] Add `AddToFlashcardButton` to milestone detail side panel
- [ ] Position in action bar (alongside share/bookmark if present)
- [ ] Long-press or right-click opens `PackPicker`
- [ ] Show which packs milestone is already in

### 22.8 Integration: Timeline Cards
- [ ] Add small bookmark icon to timeline event cards on hover
- [ ] Icon appears in top-right corner of card
- [ ] Click adds to default pack ("All Cards")
- [ ] Shift+click or long-press opens `PackPicker`

### 22.9 Integration: Concept Tooltips
- [ ] Add "+" button to concept tooltip (when hovering `[[Concept]]` links)
- [ ] One-click adds concept to default pack
- [ ] Visual feedback: brief checkmark animation on add

### 22.10 Integration: Glossary Page
- [ ] Add `AddToFlashcardButton` to each concept card in glossary
- [ ] Support multi-select mode for batch adding
- [ ] "Add Selected to Pack" bulk action button
- [ ] Show count of selected items

---

## Data Structures

```typescript
// src/types/flashcard.ts

import { z } from 'zod'

export const UserFlashcardSchema = z.object({
  id: z.string().uuid(),
  sourceType: z.enum(['milestone', 'concept']),
  sourceId: z.string(), // E2017_TRANSFORMER or C_SELF_ATTENTION
  packIds: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  // Spaced repetition (SM-2 algorithm)
  easeFactor: z.number().min(1.3).max(3.0).default(2.5),
  interval: z.number().int().min(0).default(0), // Days until next review
  repetitions: z.number().int().min(0).default(0), // Consecutive correct
  nextReviewDate: z.string().datetime().nullable().default(null),
  lastReviewedAt: z.string().datetime().nullable().default(null),
})

export const FlashcardPackSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  isDefault: z.boolean().default(false), // System packs can't be deleted
  createdAt: z.string().datetime(),
})

export const FlashcardReviewSessionSchema = z.object({
  id: z.string().uuid(),
  packId: z.string().nullable(), // null = all due cards
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  cardsReviewed: z.number().int().min(0),
  cardsCorrect: z.number().int().min(0),
  cardsToReview: z.number().int().min(0), // "Review Again" count
})

export const FlashcardStatsSchema = z.object({
  totalCards: z.number().int().min(0),
  cardsDueToday: z.number().int().min(0),
  cardsReviewedToday: z.number().int().min(0),
  currentStreak: z.number().int().min(0), // Days in a row
  longestStreak: z.number().int().min(0),
  masteredCards: z.number().int().min(0), // interval > 21 days
  lastStudyDate: z.string().datetime().nullable(),
})

export type UserFlashcard = z.infer<typeof UserFlashcardSchema>
export type FlashcardPack = z.infer<typeof FlashcardPackSchema>
export type FlashcardReviewSession = z.infer<typeof FlashcardReviewSessionSchema>
export type FlashcardStats = z.infer<typeof FlashcardStatsSchema>

// Default pack colors
export const PACK_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6B7280', // Gray
] as const

// Default system packs
export const DEFAULT_PACKS: Omit<FlashcardPack, 'id' | 'createdAt'>[] = [
  { name: 'All Cards', color: '#3B82F6', isDefault: true },
  { name: 'Recently Added', color: '#10B981', isDefault: true },
]
```

---

## UI Components

### AddToFlashcardButton (Icon Variant)
```
Timeline Card (hover state):
┌─────────────────────────────────────────────┐
│  GPT-3: Language Models are Few-Shot   [🔖] │
│  June 2020                                  │
│  OpenAI demonstrates that scaling...        │
└─────────────────────────────────────────────┘

After adding:
┌─────────────────────────────────────────────┐
│  GPT-3: Language Models are Few-Shot   [🔖] │  ← filled bookmark
│  June 2020                              ✓   │  ← brief checkmark
│  OpenAI demonstrates that scaling...        │
└─────────────────────────────────────────────┘
```

### AddToFlashcardButton (Button Variant)
```
Event Detail Panel:
┌─────────────────────────────────────────────┐
│  GPT-3: Language Models are Few-Shot        │
│  ─────────────────────────────────────────  │
│  [🔖 Add to Flashcards]  [Share]  [...]     │
│                                             │
│  OpenAI demonstrates that scaling language  │
│  models dramatically improves capabilities  │
└─────────────────────────────────────────────┘

Already saved state:
│  [🔖 In Flashcards ▾]    [Share]  [...]     │
        ↓ click to show packs
```

### PackPicker Popover
```
┌─────────────────────────────────────┐
│  Add to Pack                        │
│  ───────────────────────────────────│
│  ☑ All Cards          (default)    │
│  ☐ Transformer Era    🟣            │
│  ☑ My Weak Spots      🟠            │
│  ☐ For Work           🔵            │
│  ───────────────────────────────────│
│  + Create New Pack                  │
└─────────────────────────────────────┘

Creating new pack:
┌─────────────────────────────────────┐
│  Add to Pack                        │
│  ───────────────────────────────────│
│  ...                                │
│  ───────────────────────────────────│
│  Pack name: [Deep Learning Era    ] │
│  Color: 🔵 🟢 🟠 🔴 🟣 🩷 🩵 ⚫      │
│  [Cancel]              [Create →]   │
└─────────────────────────────────────┘
```

### Concept Tooltip with Add Button
```
                    ┌──────────────────────────────────────┐
The [[Transformer]] │ Transformer                      [+] │
architecture uses   │ ──────────────────────────────────── │
self-attention...   │ A neural network architecture that   │
                    │ processes sequences in parallel      │
                    │ using attention mechanisms.          │
                    │                                      │
                    │ [Learn More →]                       │
                    └──────────────────────────────────────┘
```

### Glossary Multi-Select Mode
```
┌─────────────────────────────────────────────────────────────┐
│  Glossary                              [Select Mode: ON]    │
│  ─────────────────────────────────────────────────────────  │
│  ☑ Transformer       ☑ Attention        ☐ LSTM             │
│  ☐ Neural Network    ☑ Tokenization     ☐ Embedding        │
│  ...                                                        │
│  ─────────────────────────────────────────────────────────  │
│  3 selected                    [Add to Pack ▾] [Cancel]     │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── types/
│   └── flashcard.ts              # New schemas
├── hooks/
│   └── useFlashcardStore.ts      # New hook
├── contexts/
│   └── FlashcardContext.tsx      # New context
├── components/
│   └── Flashcards/
│       ├── AddToFlashcardButton.tsx
│       ├── PackPicker.tsx
│       └── index.ts
```

---

## localStorage Keys

| Key | Purpose |
|-----|---------|
| `ai-timeline-flashcards` | Array of UserFlashcard objects |
| `ai-timeline-flashcard-packs` | Array of FlashcardPack objects |
| `ai-timeline-flashcard-stats` | FlashcardStats object |
| `ai-timeline-flashcard-sessions` | Array of FlashcardReviewSession (last 30) |

---

## Success Criteria
- [ ] Can add milestone from timeline card (one click)
- [ ] Can add milestone from event detail panel
- [ ] Can add concept from tooltip
- [ ] Can add concepts in bulk from glossary
- [ ] Can create custom packs
- [ ] Can add card to multiple packs
- [ ] Duplicate detection works (can't add same card twice)
- [ ] Remove from flashcards works
- [ ] Data persists across browser refresh
- [ ] Works on mobile (tap interactions)
- [ ] All components have test coverage

---

## Deployment Checklist

### Pre-Deployment
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] All new components have `data-testid` attributes
- [ ] Tested on mobile viewport
- [ ] Tested localStorage persistence

### Production Verification
- [ ] Add milestone to flashcards from timeline
- [ ] Add concept from glossary
- [ ] Create new pack
- [ ] Verify data persists after refresh
- [ ] Test on mobile device
