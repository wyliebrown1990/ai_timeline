# Sprint 25: Prebuilt Decks & Flashcard Polish

**Impact**: Medium | **Effort**: Medium | **Dependencies**: Sprint 24 (Statistics)

## Overview
Create curated prebuilt flashcard decks for new users to get started quickly, plus polish the overall flashcard experience with improved UX, accessibility, and edge case handling. Includes integration with learning paths and final quality assurance.

---

## Tasks

### 25.1 Prebuilt Deck Content Creation
- [x] Create "AI Essentials" deck (15 cards) - core concepts every user should know
- [x] Create "Transformer Era" deck (12 cards) - key milestones 2017-2020
- [x] Create "LLM Revolution" deck (10 cards) - GPT-3 through ChatGPT
- [x] Create "AI Vocabulary" deck (20 cards) - common terms and jargon
- [x] Create "Key Figures in AI" deck (10 cards) - important people and orgs
- [x] Review all card content for accuracy and clarity
- [x] Ensure definitions match existing glossary/milestones

### 25.2 Prebuilt Deck Data Structure
- [x] Create `src/content/prebuiltDecks.ts` with deck definitions
- [x] Define deck metadata (name, description, difficulty, card count)
- [x] Reference existing milestone/concept IDs for card content
- [x] Add preview cards for deck discovery UI
- [x] Mark decks with difficulty level (beginner, intermediate)

### 25.3 Deck Discovery UI
- [x] Create `src/components/Flashcards/DeckLibrary.tsx`
- [x] Add "Browse Decks" section to Study Dashboard
- [x] Display prebuilt decks with descriptions and card counts
- [x] "Add to My Collection" button for each deck
- [x] Show which decks user has already added
- [x] Preview mode: see 3 sample cards before adding

### 25.4 Deck Import Flow
- [x] When user adds prebuilt deck, create UserFlashcard entries
- [x] Link cards to a new pack with deck's name
- [x] Avoid duplicates if user already has some cards
- [x] Show confirmation with count of new cards added
- [x] Option to add just missing cards if deck partially added

### 25.5 Learning Path Integration
- [x] Add "Create Flashcards from Path" button on path completion
- [x] Auto-select key milestones and concepts from completed path
- [x] Let user customize selection before adding
- [x] Create pack named after learning path
- [x] Suggest this action (don't auto-create per user feedback)

### 25.6 Empty State Improvements
- [x] Study Dashboard: Show prebuilt deck suggestions when no cards
- [x] "Get Started" CTA pointing to deck library
- [x] Explain value proposition of flashcards briefly
- [x] Show example of what studying looks like

### 25.7 Onboarding Tip
- [x] Add flashcard mention to onboarding flow (non-intrusive)
- [x] "Tip: You can add any concept to flashcards for later review"
- [x] Show small flashcard icon in UI during onboarding
- [x] Don't force flashcard creation, just educate

### 25.8 UX Polish - Study Session
- [x] Add subtle sound effects option (flip, correct, wrong) - off by default
- [x] Improve flip animation smoothness
- [x] Add "Undo" for last rating (within 5 seconds)
- [x] Show time spent on current card
- [x] Add "Skip for now" option (moves card to end)
- [x] Session pause/resume if user leaves and returns

### 25.9 UX Polish - Card Management
- [x] Swipe to remove card on mobile
- [x] Bulk select and move cards between packs
- [x] Search within pack by card title
- [x] Sort packs by: name, card count, last studied
- [x] Drag to reorder packs on dashboard

### 25.10 Accessibility Improvements
- [x] Ensure all flashcard UI is keyboard navigable
- [x] Add ARIA labels to all interactive elements
- [x] Screen reader announcements for card flip
- [x] High contrast mode support
- [x] Reduce motion option (disable flip animation)
- [x] Focus management in study session

### 25.11 Edge Cases & Error Handling
- [x] Handle localStorage quota exceeded gracefully
- [x] Graceful degradation if localStorage unavailable
- [x] Handle corrupted data with recovery option
- [x] Validate data on load, repair if possible
- [x] Show helpful error messages, not technical errors

### 25.12 Performance Optimization
- [x] Lazy load statistics components
- [x] Virtualize long card lists in pack manager
- [x] Optimize localStorage reads (cache in memory)
- [x] Debounce frequent saves
- [x] Profile and fix any jank in animations

### 25.13 Final QA Pass

#### Automated Testing (Completed)
- [x] TypeScript typecheck passes
- [x] Production build succeeds
- [x] 569 flashcard-related unit tests pass
- [x] Test fix: Added `flushPendingWrites()` for debounced localStorage tests

#### Accessibility Verification (Completed)
- [x] ARIA labels added to StudyDashboard buttons
- [x] Sort dropdown has proper ARIA (haspopup, expanded, listbox, option)
- [x] StudySession has comprehensive accessibility (live region, keyboard shortcuts)
- [x] Icons marked as `aria-hidden="true"`

#### Manual Testing Checklist
**Desktop Browser Testing:**
- [ ] Test all flashcard flows end-to-end (add deck, study session, rating)
- [ ] Test keyboard-only navigation (Tab through all interactive elements)
- [ ] Test data persistence across browser restart

**Mobile Browser Testing:**
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test swipe-to-delete gesture on mobile

**Accessibility Testing:**
- [ ] Test with screen reader (VoiceOver on Mac/iOS, NVDA on Windows)
- [ ] Verify live region announcements during study session

**Offline/Storage Testing:**
- [ ] Test with slow network (should work offline after initial load)
- [ ] Test localStorage quota warning (fill storage to trigger)
- [ ] Verify graceful degradation if localStorage unavailable

---

## Prebuilt Deck Content

### AI Essentials (15 cards) - Beginner
For anyone new to AI. Core concepts explained simply.

| Term | Short Definition |
|------|------------------|
| Artificial Intelligence | Computer systems that can perform tasks typically requiring human intelligence |
| Machine Learning | AI that improves automatically through experience and data |
| Neural Network | Computing system inspired by biological brain structure |
| Deep Learning | Machine learning using neural networks with many layers |
| Training | Process of teaching an AI model using examples |
| Model | The learned pattern an AI uses to make predictions |
| Algorithm | Step-by-step instructions for solving a problem |
| Dataset | Collection of data used to train AI models |
| Inference | Using a trained model to make predictions on new data |
| Parameters | The adjustable values a model learns during training |
| Transformer | Architecture that processes sequences in parallel using attention |
| Large Language Model | AI trained on vast text to understand and generate language |
| Prompt | The input text you give to an AI to get a response |
| Fine-tuning | Adapting a pre-trained model for a specific task |
| Hallucination | When AI generates plausible-sounding but incorrect information |

### Transformer Era (12 cards) - Intermediate
Key milestones from 2017-2020 that shaped modern AI.

| Milestone | Why It Mattered |
|-----------|-----------------|
| Attention Is All You Need (2017) | Introduced Transformer architecture, replacing RNNs |
| BERT (2018) | Showed bidirectional pre-training dramatically improves NLP |
| GPT (2018) | Demonstrated generative pre-training for language |
| GPT-2 (2019) | Showed scaling improves quality; sparked AI safety debate |
| T5 (2019) | Unified NLP tasks as text-to-text problems |
| GPT-3 (2020) | 175B parameters enabled few-shot learning |
| DALL-E (2021) | Extended transformers to image generation |
| Codex (2021) | Applied LLMs to code generation |
| ... | |

### LLM Revolution (10 cards) - Intermediate
The journey from GPT-3 to ChatGPT and beyond.

| Milestone | Why It Mattered |
|-----------|-----------------|
| GPT-3 (2020) | Proved scale unlocks emergent capabilities |
| InstructGPT (2022) | Introduced RLHF for following instructions |
| ChatGPT (2022) | Made LLMs accessible to everyone |
| GPT-4 (2023) | Multimodal, significantly more capable |
| Claude (2023) | Focused on safety and helpfulness |
| Llama (2023) | Open-source LLM democratized access |
| ... | |

### AI Vocabulary (20 cards) - Beginner
Common terms you'll encounter in AI discussions.

| Term | Definition |
|------|------------|
| Token | A piece of text (word, subword, or character) the model processes |
| Context Window | Maximum amount of text a model can consider at once |
| Temperature | Controls randomness in AI outputs (higher = more creative) |
| Embedding | Numerical representation of text that captures meaning |
| Attention | Mechanism letting models focus on relevant parts of input |
| Self-Attention | Attention applied within a single sequence |
| Encoder | Part of model that processes input into representations |
| Decoder | Part of model that generates output from representations |
| Pre-training | Initial training on large general datasets |
| RLHF | Training method using human feedback as reward signal |
| Alignment | Making AI systems behave according to human values |
| Prompt Engineering | Crafting inputs to get better AI outputs |
| Zero-shot | Performing task without any examples |
| Few-shot | Performing task with just a few examples |
| Chain of Thought | Prompting technique that improves reasoning |
| Grounding | Connecting AI outputs to factual sources |
| Retrieval | Fetching relevant information to augment AI responses |
| Multimodal | AI that can process multiple types of data (text, images, etc.) |
| Emergent Behavior | Capabilities that appear at scale, not explicitly trained |
| Scaling Laws | Predictable improvement as models grow larger |

### Key Figures in AI (10 cards) - Beginner
People and organizations shaping AI.

| Name | Significance |
|------|--------------|
| Geoffrey Hinton | "Godfather of AI", pioneered deep learning |
| Yann LeCun | Convolutional neural networks, Meta AI Chief |
| Yoshua Bengio | Deep learning researcher, Turing Award winner |
| Fei-Fei Li | Created ImageNet, Stanford HAI co-director |
| Demis Hassabis | DeepMind founder, AlphaGo creator |
| OpenAI | Created GPT series and ChatGPT |
| Anthropic | Created Claude, focus on AI safety |
| DeepMind | Created AlphaGo, AlphaFold |
| Google AI | Created Transformer, BERT, Gemini |
| Meta AI | Created Llama, open-source AI research |

---

## Data Structure

```typescript
// src/content/prebuiltDecks.ts

export interface PrebuiltDeck {
  id: string
  name: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  cardCount: number
  estimatedMinutes: number // to complete first review
  cards: PrebuiltCard[]
  previewCards: string[] // 3 card IDs for preview
}

export interface PrebuiltCard {
  id: string
  sourceType: 'milestone' | 'concept' | 'custom'
  sourceId?: string // if referencing existing content
  // For custom cards not in existing content:
  term?: string
  definition?: string
}

export const PREBUILT_DECKS: PrebuiltDeck[] = [
  {
    id: 'ai-essentials',
    name: 'AI Essentials',
    description: 'Core concepts every AI learner should know. Perfect starting point.',
    difficulty: 'beginner',
    cardCount: 15,
    estimatedMinutes: 8,
    cards: [...],
    previewCards: ['ai', 'machine-learning', 'transformer'],
  },
  // ...
]
```

---

## UI Components

### Deck Library
```
┌─────────────────────────────────────────────────────────────┐
│  📚 Deck Library                                            │
│  ─────────────────────────────────────────────────────────  │
│  Curated flashcard decks to accelerate your learning        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⭐ AI Essentials                           Beginner │   │
│  │ Core concepts every AI learner should know.         │   │
│  │ 15 cards • ~8 min                                   │   │
│  │                                                     │   │
│  │ Preview: AI • Machine Learning • Transformer        │   │
│  │                                      [Add Deck →]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔄 Transformer Era                    Intermediate  │   │
│  │ Key milestones from 2017-2020 that shaped...        │   │
│  │ 12 cards • ~6 min                                   │   │
│  │                                         [Added ✓]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💬 AI Vocabulary                          Beginner  │   │
│  │ Common terms you'll encounter in AI discussions.    │   │
│  │ 20 cards • ~10 min                                  │   │
│  │                                      [Add Deck →]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Empty State with Deck Suggestions
```
┌─────────────────────────────────────────────────────────────┐
│  📚 Study Center                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      📇                                     │
│                                                             │
│             No flashcards yet!                              │
│                                                             │
│   Build your personal AI knowledge deck by adding           │
│   milestones and concepts as you explore.                   │
│                                                             │
│   Or get started quickly with a curated deck:               │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ ⭐ AI Essentials                                    │  │
│   │ 15 must-know concepts for AI beginners              │  │
│   │                                    [Add Deck →]     │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│              [Browse All Decks]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Learning Path Completion Suggestion
```
┌─────────────────────────────────────────────────────────────┐
│                         🎉                                  │
│              Path Complete!                                 │
│                                                             │
│  You've finished "The Transformer Revolution"               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 Want to reinforce what you learned?                     │
│                                                             │
│  Add key concepts from this path to your flashcards:        │
│                                                             │
│  ☑ Transformer (2017)                                       │
│  ☑ Self-Attention                                           │
│  ☑ BERT (2018)                                              │
│  ☑ GPT-3 (2020)                                             │
│  ☐ Tokenization                                             │
│                                                             │
│  [Add 4 to Flashcards]         [Skip]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── content/
│   └── prebuiltDecks.ts         # Prebuilt deck definitions
├── components/
│   └── Flashcards/
│       ├── DeckLibrary.tsx
│       ├── DeckPreview.tsx
│       ├── EmptyState.tsx
│       ├── PathCompletionFlashcards.tsx
│       └── index.ts
```

---

## Accessibility Checklist

- [ ] All interactive elements have visible focus states
- [ ] Color is not the only means of conveying information
- [ ] Minimum touch target size of 44x44px on mobile
- [ ] ARIA labels on icon-only buttons
- [ ] Screen reader announces card flip state
- [ ] Keyboard shortcuts don't conflict with screen readers
- [ ] Motion can be disabled via prefers-reduced-motion
- [ ] Text has minimum 4.5:1 contrast ratio
- [ ] Error messages are associated with form fields

---

## Success Criteria
- [ ] All 5 prebuilt decks created with accurate content
- [ ] Users can browse and add prebuilt decks
- [ ] Duplicate detection works when adding decks
- [ ] Empty state shows helpful suggestions
- [ ] Learning path completion suggests flashcards
- [ ] Study session UX is smooth and polished
- [ ] All accessibility criteria met
- [ ] Works offline (localStorage only)
- [ ] No performance issues with 100+ cards
- [ ] All edge cases handled gracefully

---

## Deployment Checklist

### Pre-Deployment
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] Prebuilt deck content reviewed for accuracy
- [ ] Accessibility audit passed
- [ ] Performance profiled, no jank

### Production Verification
- [ ] Add prebuilt deck as new user
- [ ] Verify cards created correctly
- [ ] Complete a learning path, verify flashcard suggestion
- [ ] Test full study session flow
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test with keyboard only
- [ ] Verify data persists after browser restart

---

## Post-Sprint: Future Considerations

Features explicitly deferred for future sprints:

1. **Cloud Sync** - Sync flashcards across devices via user accounts
2. **Social Features** - Share decks with friends, leaderboards
3. **Spaced Repetition Tuning** - Let users adjust algorithm parameters
4. **Audio Cards** - Text-to-speech for accessibility and learning
5. **Image Cards** - Diagrams and visual explanations
6. **Import/Export Anki** - Compatibility with popular flashcard app
7. **Review Reminders** - Push notifications or email reminders
8. **Gamification** - Badges, achievements, XP system
