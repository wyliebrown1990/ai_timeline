# Sprint 13: Concept Checkpoints

**Impact**: Medium | **Effort**: Medium | **Dependencies**: Sprint 11 (Learning Paths), Sprint 9 (AI Companion)

## Overview
Add knowledge testing checkpoints throughout learning paths. Users can verify comprehension through multiple choice, ordering exercises, and AI-powered "explain it back" feedback.

---

## Tasks

### 13.1 Data Model
- [ ] Define Checkpoint interface
- [ ] Define Question types (multiple choice, ordering, matching, explain-back)
- [ ] Create checkpoints.json with initial checkpoint data
- [ ] Link checkpoints to milestones and learning paths

### 13.2 Multiple Choice Questions
- [ ] Create `MultipleChoiceQuestion` component
- [ ] Support 4 answer options with one correct
- [ ] Show explanation after answer (why correct/incorrect)
- [ ] Track correct/incorrect in localStorage

### 13.3 Ordering Questions ("Which Came First?")
- [ ] Create `OrderingQuestion` component
- [ ] Drag-and-drop or tap-to-reorder interface
- [ ] Support 3-5 items to order chronologically
- [ ] Show correct order with dates after submission

### 13.4 Matching Questions
- [ ] Create `MatchingQuestion` component
- [ ] Match concepts to use cases or definitions
- [ ] Support 4-6 pairs
- [ ] Visual feedback for correct/incorrect matches

### 13.5 "Explain It Back" with AI Feedback
- [ ] Create `ExplainBackQuestion` component
- [ ] Text area for user's explanation
- [ ] Send to Claude API for feedback
- [ ] Return constructive feedback on accuracy/clarity
- [ ] Suggest improvements without being discouraging

### 13.6 Flashcard Mode
- [ ] Create `FlashcardDeck` component
- [ ] Term on front, definition on back
- [ ] Tap/click to flip
- [ ] Swipe or buttons for "Got it" / "Review again"
- [ ] Spaced repetition tracking (optional)

### 13.7 Checkpoint Integration
- [ ] Insert checkpoints after key milestones in paths
- [ ] Show checkpoint progress in path navigation
- [ ] Optional: Allow skipping checkpoints
- [ ] Show checkpoint scores in end-of-path summary

### 13.8 Content Creation
- [ ] Write 2-3 checkpoints per learning path
- [ ] Create 30+ flashcards for key AI terms
- [ ] Use Claude to generate draft questions
- [ ] Human review for accuracy and clarity

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
- [ ] 3+ checkpoint types working (multiple choice, ordering, explain-back)
- [ ] AI feedback feels helpful, not judgmental
- [ ] Flashcard deck with 30+ terms
- [ ] Checkpoints integrated into at least 3 learning paths
- [ ] Progress tracked and shown in path summary
- [ ] Works on mobile (tap-friendly interactions)
- [ ] Average checkpoint completion time < 3 minutes

---

## Deployment & Production Verification

### Pre-Deployment Checklist
- [ ] All Playwright tests passing locally
- [ ] All checkpoint questions validated against schema
- [ ] AI feedback prompts tested with Claude API
- [ ] Flashcard deck complete with 30+ cards
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)

### Deployment Steps
- [ ] Create PR with checkpoint features
- [ ] Verify CI pipeline passes
- [ ] Merge to main branch
- [ ] Deploy to S3/CloudFront (`npm run deploy`)
- [ ] Invalidate CloudFront cache

### Production Verification
- [ ] Visit production URL: https://d33f170a3u5yyl.cloudfront.net
- [ ] Start a learning path that has checkpoints
- [ ] Complete milestones until checkpoint appears
- [ ] Test multiple choice question (correct + incorrect answers)
- [ ] Verify explanation shows after answering
- [ ] Test ordering question (drag/tap to reorder)
- [ ] Test "Explain it back" and verify AI feedback returns
- [ ] Navigate to Flashcards section
- [ ] Test flip animation and Got It/Review Again buttons
- [ ] Complete a path and verify checkpoint scores in summary
- [ ] Test all interactions on mobile device

### Rollback Plan
If issues found in production:
1. Revert merge commit: `git revert <commit-hash>`
2. Push to main and redeploy
3. Invalidate CloudFront cache
4. If AI feedback broken: Feature flag to hide explain-back questions
