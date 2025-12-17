# Sprint 13: Concept Checkpoints

**Status**: COMPLETE (December 17, 2025)

**Impact**: Medium | **Effort**: Medium | **Dependencies**: Sprint 11 (Learning Paths), Sprint 9 (AI Companion)

## Overview
Add knowledge testing checkpoints throughout learning paths. Users can verify comprehension through multiple choice, ordering exercises, and AI-powered "explain it back" feedback.

---

## Tasks

### 13.1 Data Model
- [x] Define Checkpoint interface
- [x] Define Question types (multiple choice, ordering, matching, explain-back)
- [x] Create checkpoints.json with initial checkpoint data
- [x] Link checkpoints to milestones and learning paths

### 13.2 Multiple Choice Questions
- [x] Create `MultipleChoiceQuestion` component
- [x] Support 4 answer options with one correct
- [x] Show explanation after answer (why correct/incorrect)
- [x] Track correct/incorrect in localStorage

### 13.3 Ordering Questions ("Which Came First?")
- [x] Create `OrderingQuestion` component
- [x] Drag-and-drop or tap-to-reorder interface
- [x] Support 3-5 items to order chronologically
- [x] Show correct order with dates after submission

### 13.4 Matching Questions
- [x] Create `MatchingQuestion` component
- [x] Match concepts to use cases or definitions
- [x] Support 4-6 pairs
- [x] Visual feedback for correct/incorrect matches

### 13.5 "Explain It Back" with AI Feedback
- [x] Create `ExplainBackQuestion` component
- [x] Text area for user's explanation
- [x] Send to Claude API for feedback
- [x] Return constructive feedback on accuracy/clarity
- [x] Suggest improvements without being discouraging

### 13.6 Flashcard Mode
- [x] Create `FlashcardDeck` component
- [x] Term on front, definition on back
- [x] Tap/click to flip
- [x] Swipe or buttons for "Got it" / "Review again"
- [x] Spaced repetition tracking (optional)

### 13.7 Checkpoint Integration
- [x] Create `CheckpointView` orchestration component
- [x] Support all question types (multiple choice, ordering, matching, explain-back)
- [x] Show checkpoint progress in path navigation (question X of Y)
- [x] Optional: Allow skipping checkpoints
- [x] Show checkpoint scores in completion summary

### 13.8 Content Creation
- [x] Write 2-3 checkpoints per learning path (11 checkpoints across 4 paths)
- [x] Create 30+ flashcards for key AI terms (39 flashcards created)
- [x] Use Claude to generate draft questions
- [x] Human review for accuracy and clarity

---

## Data Structure

```typescript
type QuestionType = 'multiple_choice' | 'ordering' | 'matching' | 'explain_back';

interface MultipleChoiceQuestion {
  type: 'multiple_choice';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;  // Shown after answering
}

interface OrderingQuestion {
  type: 'ordering';
  prompt: string;  // e.g., "Put these in chronological order"
  items: {
    id: string;
    label: string;
    date?: string;  // Shown after submission
  }[];
  correctOrder: string[];  // Array of item IDs
}

interface MatchingQuestion {
  type: 'matching';
  prompt: string;
  pairs: {
    id: string;
    left: string;   // Concept
    right: string;  // Use case or definition
  }[];
}

interface ExplainBackQuestion {
  type: 'explain_back';
  concept: string;
  prompt: string;  // e.g., "In your own words, explain attention to a colleague"
  rubric: string;  // Sent to AI for evaluation
}

interface Checkpoint {
  id: string;
  title: string;
  afterMilestoneId: string;  // When to show in path
  questions: (MultipleChoiceQuestion | OrderingQuestion | MatchingQuestion | ExplainBackQuestion)[];
}

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  relatedMilestoneIds: string[];
}

interface UserCheckpointProgress {
  checkpointId: string;
  completedAt?: string;
  score: number;  // Percentage correct
  answers: Record<number, any>;  // Question index -> user answer
}
```

---

## UI Components

### Multiple Choice
```
┌─────────────────────────────────────────────────────────────┐
│  ✓ CHECKPOINT: Attention Mechanism                          │
│                                                             │
│  Quick check - which statement best describes attention?    │
│                                                             │
│  ○ A way to compress data into smaller files                │
│  ● A mechanism that lets models focus on relevant parts     │
│  ○ A technique for making models run faster                 │
│  ○ A method for storing information in databases            │
│                                                             │
│  [Check Answer]                                             │
└─────────────────────────────────────────────────────────────┘
```

### After Answer
```
┌─────────────────────────────────────────────────────────────┐
│  ✓ Correct!                                                 │
│                                                             │
│  Attention allows the model to "pay attention" to           │
│  different parts of the input when producing output,        │
│  rather than treating all inputs equally.                   │
│                                                             │
│  [Continue →]                                               │
└─────────────────────────────────────────────────────────────┘
```

### Explain It Back
```
┌─────────────────────────────────────────────────────────────┐
│  💡 Explain it back (optional):                             │
│                                                             │
│  "In your own words, explain transformers to a colleague"   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Transformers are like a team reading a document       │  │
│  │ together where everyone can see what everyone else    │  │
│  │ is looking at. This helps them understand context...  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [Get AI Feedback]                                          │
└─────────────────────────────────────────────────────────────┘
```

### AI Feedback Response
```
┌─────────────────────────────────────────────────────────────┐
│  🎯 Great explanation!                                      │
│                                                             │
│  You captured the key idea of parallel processing and       │
│  context awareness. To make it even stronger, you could     │
│  mention that this replaced the older sequential approach   │
│  (RNNs/LSTMs) which was slower.                             │
│                                                             │
│  Your explanation would work well in a business meeting!    │
│                                                             │
│  [Continue →]                                               │
└─────────────────────────────────────────────────────────────┘
```

### Flashcard
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                        TRANSFORMER                          │
│                                                             │
│                     (tap to flip)                           │
│                                                             │
│                         3 / 30                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  A neural network architecture that processes all words     │
│  at once, understanding how they relate to each other.      │
│  Powers ChatGPT, Claude, and most modern AI.                │
│                                                             │
│  [😕 Review Again]              [✓ Got It]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## AI Feedback Prompt

```
You are evaluating a user's explanation of an AI concept. Be encouraging and constructive.

Concept: [CONCEPT_NAME]
User's explanation: [USER_TEXT]

Evaluation criteria:
- Did they capture the core idea?
- Is the explanation accurate (no misconceptions)?
- Would this explanation make sense to a non-technical colleague?

Respond with:
1. A brief assessment (1 sentence, positive tone)
2. What they got right (1-2 sentences)
3. One suggestion for improvement (optional, only if needed)
4. A closing encouragement

Keep response under 100 words. Never be discouraging.
```

---

## Initial Checkpoint Content

### Checkpoint: After Transformer (2017)
**Questions:**
1. Multiple choice: "What problem did Transformers solve?"
2. Ordering: Put these architectures in chronological order (RNN, LSTM, Transformer, GPT)
3. Explain back: "Explain attention to your marketing team"

### Checkpoint: After GPT-3 (2020)
**Questions:**
1. Multiple choice: "What made GPT-3 different from GPT-2?"
2. Matching: Match the capability to the application
3. Explain back: "Explain in-context learning to your boss"

### Checkpoint: After ChatGPT (2022)
**Questions:**
1. Multiple choice: "What technique made ChatGPT more helpful than GPT-3?"
2. Ordering: Put these products in launch order
3. Explain back: "Explain RLHF in business terms"

---

## Success Criteria
- [x] 3+ checkpoint types working (multiple choice, ordering, matching, explain-back)
- [x] AI feedback feels helpful, not judgmental (constructive feedback with encouragement)
- [x] Flashcard deck with 30+ terms (39 flashcards created)
- [x] Checkpoints integrated into at least 3 learning paths (4 paths with checkpoints)
- [x] Progress tracked and shown in path summary (question X of Y, score display)
- [x] Works on mobile (tap-friendly interactions - all components use button/click)
- [ ] Average checkpoint completion time < 3 minutes (requires user testing)

---

## Deployment & Production Verification

### Pre-Deployment Checklist
- [x] All Playwright tests passing locally
- [x] All checkpoint questions validated against schema
- [x] AI feedback prompts tested with Claude API
- [x] Flashcard deck complete with 30+ cards (39 flashcards)
- [x] No TypeScript errors (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)

### Deployment Steps
- [x] Create PR with checkpoint features
- [x] Verify CI pipeline passes
- [x] Merge to main branch
- [x] Deploy to S3/CloudFront
- [x] Invalidate CloudFront cache

### Production Verification
- [x] Visit production URL: https://d33f170a3u5yyl.cloudfront.net
- [x] Start a learning path that has checkpoints
- [x] Complete milestones until checkpoint appears
- [x] Test multiple choice question (correct + incorrect answers)
- [x] Verify explanation shows after answering
- [x] Test ordering question (drag/tap to reorder)
- [x] Test matching question
- [x] Complete a path and verify checkpoint scores in summary
- [x] Checkpoints work for all 5 learning paths

### Bug Fixes During Verification
- Fixed: Question state bleeding between consecutive questions (added `key` prop)
- Fixed: Last question not showing feedback before completion (added "See Results" flow)
- Fixed: Invalid category value causing React error #130 (changed `product_launch` to `product`)
- Fixed: Missing E2022_CHATGPT milestone in database
- Added: Checkpoints for ai-for-business learning path (was missing)
- Added: VITE_USE_STATIC_API env var for local development without backend

### Rollback Plan
If issues found in production:
1. Revert merge commit: `git revert <commit-hash>`
2. Push to main and redeploy
3. Invalidate CloudFront cache
4. If AI feedback broken: Feature flag to hide explain-back questions
