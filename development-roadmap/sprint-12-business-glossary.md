# Sprint 12: Business Glossary

**Impact**: Medium | **Effort**: Low | **Dependencies**: None

## Overview
Plain-language definitions of AI terms with business context. Terms appear as hover definitions inline and in a dedicated glossary page.

---

## Tasks

### 12.1 Data Model & Content
- [ ] Define GlossaryEntry interface
- [ ] Create initial glossary with 30-40 key terms
- [ ] Use Claude to draft definitions
- [ ] Human review for accuracy and clarity
- [ ] Create glossary.json file

### 12.2 Glossary Page
- [ ] Create `/glossary` route
- [ ] Build `GlossaryPage` component
- [ ] Alphabetical navigation (A-Z)
- [ ] Search within glossary
- [ ] Links to related milestones

### 12.3 Inline Definitions
- [ ] Create `GlossaryTerm` component for inline markup
- [ ] Hover shows tooltip with definition
- [ ] Click navigates to full glossary entry
- [ ] Mark up key terms in milestone descriptions

### 12.4 Cross-linking
- [ ] Link glossary entries to relevant milestones
- [ ] Show "Related terms" on each entry
- [ ] Add glossary links from MilestoneDetail

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
- [ ] 30+ terms defined
- [ ] Hover definitions work inline
- [ ] Glossary page searchable
- [ ] Terms link to related milestones
- [ ] Non-technical users understand definitions

---

## Deployment & Production Verification

### Pre-Deployment Checklist
- [ ] All Playwright tests passing locally
- [ ] All 30+ glossary entries validated against schema
- [ ] Human review completed on definitions
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)

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
