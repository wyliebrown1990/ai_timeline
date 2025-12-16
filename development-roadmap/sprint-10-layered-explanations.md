# Sprint 10: Layered Explanations

**Impact**: High | **Effort**: Low | **Dependencies**: None (can run parallel with Sprint 9)

## Overview
Add multiple explanation levels to milestones so users can choose their depth: TL;DR (1 sentence), Executive Summary (1 paragraph), or Full Technical.

---

## Tasks

### 10.1 Data Model Extension
- [ ] Add new fields to Milestone type:
  ```typescript
  tldr: string;                // 1-sentence plain English
  simpleExplanation: string;   // No jargon, uses analogies
  businessImpact: string;      // Concrete use cases and industry effects
  technicalDepth: string;      // For those who want details
  historicalContext: string;   // What came before, what it built on
  whyItMattersToday: string;   // Connection to current AI landscape
  commonMisconceptions: string; // What people get wrong
  ```
- [ ] Update Prisma schema
- [ ] Create migration

### 10.2 Content Generation
- [ ] Use Claude to generate all explanation layers for 62 milestones:
  - TL;DR (1 sentence)
  - Simple explanation (no jargon, uses analogies)
  - Business impact (use cases, industry effects)
  - Technical depth (for those who want details)
  - Historical context (what came before)
  - Why it matters today (current relevance)
  - Common misconceptions (what people get wrong)
- [ ] Human review and edit all generated content
- [ ] Export updated JSON to S3

### 10.3 UI Implementation
- [ ] Add explanation level tabs to `MilestoneDetail`:
  - [Simple] [Business Impact] [Technical] [Historical]
- [ ] Show "Why it matters today" section below main content
- [ ] Add collapsible "Common misconceptions" section
- [ ] Remember user's preferred tab in localStorage
- [ ] Animate transitions between tabs

### 10.4 Mobile Optimization
- [ ] Ensure toggle works well on mobile
- [ ] Test readability at all levels on small screens

---

## Content Guidelines

### TL;DR (1 sentence)
- Maximum 15 words
- No jargon
- Focus on the "what" in simplest terms

**Examples**:
- "GPT-3 showed that making AI much bigger makes it dramatically smarter"
- "Transformers let AI understand words in context, not one at a time"
- "ChatGPT made AI feel like talking to a helpful human"

### Simple Explanation (1-2 paragraphs)
- No jargon whatsoever
- Use everyday analogies
- Focus on the core concept only

**Example**:
"Imagine autocomplete on steroids. You start typing and it can write entire essays, code, or emails that sound like a human wrote them. This was the moment AI went from 'neat trick' to 'wait, this changes everything.'"

### Business Impact (bullet points + paragraph)
- Concrete use cases by industry/function
- Who it affected and how
- Cost/accessibility implications
- No code or math

**Example**:
- Customer service: Chatbots that actually work
- Content: First-draft generation at scale
- Code: Developer productivity tools emerge
- Cost: API pricing makes AI accessible to startups

### Technical Depth (2-3 paragraphs)
- For users who want details
- Can include architecture concepts
- Still accessible, not academic

### Historical Context (1-2 paragraphs)
- What research/breakthroughs led to this
- What problems it was trying to solve
- Key predecessors and influences

### Why It Matters Today (1-2 sentences)
- Direct connection to current AI landscape
- Products/services they use now

**Example**:
"ChatGPT, Claude, and every AI assistant you use today is a direct descendant of this moment."

### Common Misconceptions (bullet points)
- 2-3 things people commonly get wrong
- Brief correction for each

**Example**:
- ❌ "GPT-3 understands language like humans do" → ✅ It predicts likely next words based on patterns
- ❌ "Bigger always means better" → ✅ Training data quality and techniques matter as much as size

---

## UI Design

```
┌─────────────────────────────────────────────────────────────┐
│  GPT-3 Released (2020)                                      │
│                                                             │
│  [Simple] [Business Impact] [Technical] [Historical]       │
│  ─────────────────────────────────────────────────          │
│                                                             │
│  SIMPLE:                                                    │
│  Imagine autocomplete on steroids. You start typing         │
│  and it can write entire essays, code, or emails that       │
│  sound like a human wrote them. This was the moment         │
│  AI went from "neat trick" to "wait, this changes           │
│  everything."                                               │
│                                                             │
│  ─────────────────────────────────────────────────          │
│  WHY IT MATTERS TODAY:                                      │
│  ChatGPT, Claude, and every AI assistant you use today      │
│  is a direct descendant of this moment.                     │
│                                                             │
│  ─────────────────────────────────────────────────          │
│  ▼ Common Misconceptions                                    │
│  • "GPT-3 understands like humans" → It predicts patterns   │
│  • "Bigger always means better" → Quality matters too       │
└─────────────────────────────────────────────────────────────┘
```

---

## Generation Prompt (for Claude)

```
For the following AI milestone, generate all explanation layers:

Milestone: [TITLE]
Date: [DATE]
Current Description: [DESCRIPTION]

Generate:
1. TL;DR (max 15 words, no jargon, plain English)
2. Simple Explanation (1-2 paragraphs, use everyday analogies, no jargon)
3. Business Impact (bullet points: use cases by industry/function, who it affected)
4. Technical Depth (2-3 paragraphs for users who want architecture details)
5. Historical Context (1-2 paragraphs: what led to this, what problems it solved)
6. Why It Matters Today (1-2 sentences connecting to current AI products)
7. Common Misconceptions (2-3 bullet points: what people get wrong + corrections)

Target audience: Business executives, product managers, and marketers with no technical background.
```

---

## Success Criteria
- [ ] All 62 milestones have all seven explanation layers
- [ ] Tab selection persists user preference
- [ ] Non-technical user can understand Simple tab without googling
- [ ] "Why it matters today" visible on all views
- [ ] Common misconceptions section is scannable
- [ ] Transitions between tabs feel smooth

---

## Deployment & Production Verification

### Pre-Deployment Checklist
- [ ] All Playwright tests passing locally
- [ ] Content validation passes for all 62 milestone layered content
- [ ] Human review completed on generated content
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)

### Deployment Steps
- [ ] Create PR with layered content and UI changes
- [ ] Verify CI pipeline passes
- [ ] Merge to main branch
- [ ] Deploy to S3/CloudFront (`npm run deploy`)
- [ ] Invalidate CloudFront cache

### Production Verification
- [ ] Visit production URL: https://d33f170a3u5yyl.cloudfront.net
- [ ] Click on any milestone to open detail view
- [ ] Verify all 4 tabs appear: Simple, Business Impact, Technical, Historical
- [ ] Click through each tab and verify content loads
- [ ] Verify "Why it matters today" section displays
- [ ] Verify "Common Misconceptions" section expands/collapses
- [ ] Change tab preference, refresh page, verify preference persists
- [ ] Test on 3+ different milestones across different eras
- [ ] Test on mobile device

### Rollback Plan
If issues found in production:
1. Revert merge commit: `git revert <commit-hash>`
2. Push to main and redeploy
3. Invalidate CloudFront cache
