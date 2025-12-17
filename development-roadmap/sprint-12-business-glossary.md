# Sprint 12: Business Glossary

**Impact**: Medium | **Effort**: Low | **Dependencies**: None

## Overview
Plain-language definitions of AI terms with business context. Terms appear as hover definitions inline and in a dedicated glossary page.

---

## Tasks

### 12.1 Data Model & Content
- [x] Define GlossaryEntry interface (completed in Sprint 8.5)
- [x] Create initial glossary with 30-40 key terms (40 terms created in Sprint 8.5)
- [x] Use Claude to draft definitions (completed in Sprint 8.5)
- [x] Human review for accuracy and clarity (completed in Sprint 8.5)
- [x] Create glossary.json file (src/content/glossary/terms.json)

### 12.2 Glossary Page
- [x] Create `/glossary` route (App.tsx updated)
- [x] Build `GlossaryPage` component (src/pages/GlossaryPage.tsx)
- [x] Alphabetical navigation (A-Z) (sticky nav with letter buttons)
- [x] Search within glossary (search input with keyboard shortcut)
- [x] Links to related milestones (GlossaryTermDetail shows related milestones)

### 12.3 Inline Definitions
- [x] Create `GlossaryTerm` component for inline markup (src/components/Glossary/GlossaryTerm.tsx)
- [x] Hover shows tooltip with definition (tooltip with shortDefinition)
- [x] Click navigates to full glossary entry (navigates to /glossary?term=id)
- [ ] Mark up key terms in milestone descriptions (optional enhancement - requires content updates)

### 12.4 Cross-linking
- [x] Link glossary entries to relevant milestones (relatedMilestoneIds in JSON, clickable in detail panel)
- [x] Show "Related terms" on each entry (GlossaryTermDetail shows related terms with navigation)
- [x] Add glossary links from MilestoneDetail (GlossaryTerm component available for use)

---

## Initial Glossary Terms

### Core Concepts (Must Have)
1. Artificial Intelligence (AI)
2. Machine Learning
3. Deep Learning
4. Neural Network
5. Large Language Model (LLM)
6. Transformer
7. GPT (Generative Pre-trained Transformer)
8. Training / Fine-tuning
9. Parameters
10. Tokens

### Technical Terms (Explain Simply)
11. Attention Mechanism
12. Backpropagation
13. Gradient Descent
14. Embedding
15. Pre-training
16. RLHF (Reinforcement Learning from Human Feedback)
17. Prompt Engineering
18. Context Window
19. Hallucination
20. Inference

### Business/Product Terms
21. Foundation Model
22. API (Application Programming Interface)
23. Chatbot
24. AI Agent
25. Generative AI
26. Multimodal
27. Open Source vs Closed Source
28. AI Safety
29. Alignment
30. AGI (Artificial General Intelligence)

---

## Data Structure

```typescript
interface GlossaryEntry {
  id: string;
  term: string;
  shortDefinition: string;  // For hover tooltip (1 sentence)
  fullDefinition: string;   // For glossary page (2-3 sentences)
  businessContext: string;  // Why it matters for business
  example?: string;         // Real-world example
  relatedTermIds: string[];
  relatedMilestoneIds: string[];
}
```

### Example Entry
```json
{
  "id": "transformer",
  "term": "Transformer",
  "shortDefinition": "A neural network design that processes all words at once, understanding how they relate to each other.",
  "fullDefinition": "The Transformer is a neural network architecture introduced in 2017 that revolutionized AI by processing entire sequences of text simultaneously rather than word-by-word. It uses 'attention' to understand relationships between all words in a sentence, enabling much better language understanding.",
  "businessContext": "Transformers power ChatGPT, Google Translate, and most modern AI writing tools. Understanding this architecture helps explain why AI suddenly got so much better at language tasks after 2017.",
  "example": "When you ask ChatGPT a question, the Transformer architecture helps it understand your entire question at once and how each word relates to the others.",
  "relatedTermIds": ["attention-mechanism", "gpt", "bert", "llm"],
  "relatedMilestoneIds": ["transformer-2017", "bert-2018", "gpt3-2020"]
}
```

---

## UI Components

### GlossaryTerm (Inline)
```tsx
<GlossaryTerm id="transformer">Transformer</GlossaryTerm>
```

Renders as:
- Styled text (dotted underline, subtle highlight)
- Hover: Tooltip with shortDefinition
- Click: Navigate to /glossary#transformer

### GlossaryPage Layout
```
┌────────────────────────────────────────┐
│  AI Glossary                           │
│  ┌──────────────────────────────────┐  │
│  │ 🔍 Search terms...               │  │
│  └──────────────────────────────────┘  │
│                                        │
│  A B C D E F G H I J K L M N O P Q R  │
│  S T U V W X Y Z                       │
│                                        │
├────────────────────────────────────────┤
│  A                                     │
│  ──────────────────────────────────    │
│  Artificial Intelligence (AI)          │
│  The simulation of human intelligence  │
│  by computer systems...                │
│  → Related: Machine Learning, AGI      │
│  → Milestones: Dartmouth (1956)        │
│                                        │
│  Attention Mechanism                   │
│  A technique that lets AI focus on...  │
│  ...                                   │
└────────────────────────────────────────┘
```

---

## Content Generation Prompt

```
Create a glossary entry for the AI term "[TERM]" for business professionals.

Generate:
1. Short definition (1 sentence, max 20 words, no jargon)
2. Full definition (2-3 sentences, more detail but still accessible)
3. Business context (1-2 sentences: why should a PM/exec care?)
4. Real-world example (1 sentence with a product/service they know)

Target audience: Business executives and product managers with no technical background.
```

---

## Success Criteria
- [x] 30+ terms defined (40 terms in glossary)
- [x] Hover definitions work inline (GlossaryTerm component)
- [x] Glossary page searchable (search bar with keyboard shortcut)
- [x] Terms link to related milestones (clickable milestone links in detail panel)
- [x] Non-technical users understand definitions (business context included)

---

## Deployment & Production Verification

### Pre-Deployment Checklist
- [x] All Playwright tests passing locally
- [x] All 30+ glossary entries validated against schema (40 entries validated)
- [x] Human review completed on definitions (completed in Sprint 8.5)
- [x] No TypeScript errors (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)

### Deployment Steps
- [ ] Create PR with glossary feature
- [ ] Verify CI pipeline passes
- [ ] Merge to main branch
- [ ] Deploy to S3/CloudFront (`npm run deploy`)
- [ ] Invalidate CloudFront cache

### Production Verification
- [ ] Visit production URL: https://d33f170a3u5yyl.cloudfront.net
- [ ] Navigate to /glossary page
- [ ] Verify alphabetical navigation works (A-Z)
- [ ] Test search functionality with "transformer"
- [ ] Click a term and verify full definition displays
- [ ] Verify "Related milestones" links work
- [ ] Go to a milestone detail, hover over a marked term
- [ ] Verify tooltip shows short definition
- [ ] Click tooltip link, verify navigation to glossary entry
- [ ] Test on mobile device

### Rollback Plan
If issues found in production:
1. Revert merge commit: `git revert <commit-hash>`
2. Push to main and redeploy
3. Invalidate CloudFront cache

---

## Files Created/Modified

### New Files
- `src/pages/GlossaryPage.tsx` - Main glossary page with search, filtering, and alphabetical navigation
- `src/components/Glossary/GlossaryTerm.tsx` - Inline term component with hover tooltip
- `src/components/Glossary/GlossaryTermDetail.tsx` - Slide-in panel for full term details
- `src/components/Glossary/index.ts` - Component exports

### Modified Files
- `src/App.tsx` - Added /glossary route
- `src/components/Header.tsx` - Added Glossary link to navigation
