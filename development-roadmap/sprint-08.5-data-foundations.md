# Sprint 8.5: Data Layer & Content Foundations

**Impact**: Critical (Blocker for Sprints 9-15) | **Effort**: Medium | **Dependencies**: None

## Overview

Establish the data layer, schemas, and content structure required for the AI Fluency Platform features. This sprint creates the foundation that all subsequent sprints build upon.

---

## Goals

1. Define TypeScript + Zod schemas for all new entities
2. Extend the Milestone model for layered explanations
3. Create content file structure and seed data
4. Set up content generation pipeline using Claude
5. Build API layer for serving new content types

---

## Tasks

### 8.5.1 Schema Definitions

Create Zod schemas and TypeScript types for all new entities in `src/types/`:

- [ ] Create `src/types/learningPath.ts` - LearningPath schema
- [ ] Create `src/types/glossary.ts` - GlossaryEntry schema
- [ ] Create `src/types/checkpoint.ts` - Checkpoint, Question, Flashcard schemas
- [ ] Create `src/types/currentEvent.ts` - CurrentEvent schema
- [ ] Create `src/types/userProfile.ts` - UserProfile schema
- [ ] Update `src/types/milestone.ts` - Add layered explanation fields
- [ ] Create `src/types/index.ts` - Export all types

### 8.5.2 Extend Milestone Schema

Add layered explanation fields to existing Milestone type:

```typescript
// New fields to add to MilestoneResponse
interface MilestoneLayeredContent {
  tldr: string;                  // Max 15 words
  simpleExplanation: string;     // 1-2 paragraphs, no jargon
  businessImpact: string;        // Bullet points + paragraph
  technicalDepth: string;        // 2-3 paragraphs
  historicalContext: string;     // 1-2 paragraphs
  whyItMattersToday: string;     // 1-2 sentences
  commonMisconceptions: string;  // Bullet points
}
```

- [ ] Update Prisma schema with new fields
- [ ] Create database migration
- [ ] Update MilestoneResponse type
- [ ] Update API to return new fields

### 8.5.3 Content File Structure

Create static JSON content directory:

```
src/content/
├── milestones/
│   └── layered-content.json    # Extended content for all milestones
├── learning-paths/
│   ├── chatgpt-story.json
│   ├── ai-fundamentals.json
│   ├── ai-safety.json
│   ├── ai-for-business.json
│   └── ai-image-generation.json
├── glossary/
│   └── terms.json              # All glossary entries
├── checkpoints/
│   ├── questions.json          # All checkpoint questions
│   └── flashcards.json         # All flashcard entries
├── current-events/
│   └── events.json             # Curated current events
└── index.ts                    # Content loader utilities
```

- [ ] Create directory structure
- [ ] Create content loader utility functions
- [ ] Set up TypeScript path aliases for content imports

### 8.5.4 Content API Layer

Create API endpoints/utilities to serve content:

- [ ] Create `src/services/contentApi.ts` for content fetching
- [ ] Add content endpoints to server (or static JSON serving)
- [ ] Create React hooks for each content type:
  - `useLearningPaths()` / `useLearningPath(id)`
  - `useGlossary()` / `useGlossaryTerm(id)`
  - `useCheckpoints(pathId)`
  - `useFlashcards()`
  - `useCurrentEvents()`

### 8.5.5 Seed Content Generation

Use Claude to generate initial content:

- [ ] Create content generation prompts in `scripts/prompts/`
- [ ] Generate layered explanations for all 62 milestones
- [ ] Generate 5 learning path definitions
- [ ] Generate 30+ glossary entries
- [ ] Generate checkpoint questions for 3 paths
- [ ] Generate 30+ flashcards
- [ ] Generate 5-10 current event entries
- [ ] Human review and edit all generated content

### 8.5.6 Content Validation

- [ ] Create content validation script (`scripts/validate-content.ts`)
- [ ] Validate all JSON against Zod schemas
- [ ] Check referential integrity (milestone IDs exist, etc.)
- [ ] Add to CI pipeline

---

## Schema Definitions

### LearningPath Schema

```typescript
// src/types/learningPath.ts
import { z } from 'zod';

export const LearningPathSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().min(10).max(500),
  targetAudience: z.string(),
  milestoneIds: z.array(z.string()).min(3),
  estimatedMinutes: z.number().min(5).max(120),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  suggestedNextPathIds: z.array(z.string()).default([]),
  keyTakeaways: z.array(z.string()).min(3).max(5),
  conceptsCovered: z.array(z.string()),
  icon: z.string().optional(), // Emoji or icon name
});

export type LearningPath = z.infer<typeof LearningPathSchema>;
```

### GlossaryEntry Schema

```typescript
// src/types/glossary.ts
import { z } from 'zod';

export const GlossaryEntrySchema = z.object({
  id: z.string(),
  term: z.string().min(1).max(100),
  shortDefinition: z.string().max(200),  // For tooltips
  fullDefinition: z.string(),            // For glossary page
  businessContext: z.string(),           // Why it matters
  inMeetingExample: z.string().optional(), // "In a meeting: ..."
  example: z.string().optional(),
  relatedTermIds: z.array(z.string()).default([]),
  relatedMilestoneIds: z.array(z.string()).default([]),
  category: z.enum([
    'core_concept',
    'technical_term',
    'business_term',
    'model_architecture',
    'company_product'
  ]),
});

export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;
```

### Checkpoint & Question Schemas

```typescript
// src/types/checkpoint.ts
import { z } from 'zod';

export const MultipleChoiceQuestionSchema = z.object({
  type: z.literal('multiple_choice'),
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().min(0).max(3),
  explanation: z.string(),
});

export const OrderingQuestionSchema = z.object({
  type: z.literal('ordering'),
  id: z.string(),
  prompt: z.string(),
  items: z.array(z.object({
    id: z.string(),
    label: z.string(),
    date: z.string().optional(),
  })).min(3).max(6),
  correctOrder: z.array(z.string()),
});

export const MatchingQuestionSchema = z.object({
  type: z.literal('matching'),
  id: z.string(),
  prompt: z.string(),
  pairs: z.array(z.object({
    id: z.string(),
    left: z.string(),
    right: z.string(),
  })).min(3).max(6),
});

export const ExplainBackQuestionSchema = z.object({
  type: z.literal('explain_back'),
  id: z.string(),
  concept: z.string(),
  prompt: z.string(),
  rubric: z.string(), // Sent to AI for evaluation
});

export const QuestionSchema = z.discriminatedUnion('type', [
  MultipleChoiceQuestionSchema,
  OrderingQuestionSchema,
  MatchingQuestionSchema,
  ExplainBackQuestionSchema,
]);

export const CheckpointSchema = z.object({
  id: z.string(),
  title: z.string(),
  pathId: z.string(),
  afterMilestoneId: z.string(),
  questions: z.array(QuestionSchema).min(1).max(5),
});

export const FlashcardSchema = z.object({
  id: z.string(),
  term: z.string(),
  definition: z.string(),
  category: z.string(),
  relatedMilestoneIds: z.array(z.string()).default([]),
});

export type MultipleChoiceQuestion = z.infer<typeof MultipleChoiceQuestionSchema>;
export type OrderingQuestion = z.infer<typeof OrderingQuestionSchema>;
export type MatchingQuestion = z.infer<typeof MatchingQuestionSchema>;
export type ExplainBackQuestion = z.infer<typeof ExplainBackQuestionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Checkpoint = z.infer<typeof CheckpointSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
```

### CurrentEvent Schema

```typescript
// src/types/currentEvent.ts
import { z } from 'zod';

export const CurrentEventSchema = z.object({
  id: z.string(),
  headline: z.string().min(10).max(200),
  summary: z.string().min(50).max(500),
  sourceUrl: z.string().url().optional(),
  sourcePublisher: z.string().optional(),
  publishedDate: z.string(), // ISO date
  prerequisiteMilestoneIds: z.array(z.string()).min(2).max(6),
  connectionExplanation: z.string(),
  featured: z.boolean().default(false),
  expiresAt: z.string().optional(), // ISO date
});

export type CurrentEvent = z.infer<typeof CurrentEventSchema>;
```

### UserProfile Schema

```typescript
// src/types/userProfile.ts
import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'executive',
  'product_manager',
  'marketing_sales',
  'operations_hr',
  'developer',
  'student',
  'curious',
]);

export const LearningGoalSchema = z.enum([
  'discuss_at_work',
  'evaluate_tools',
  'hype_vs_real',
  'industry_impact',
  'build_with_ai',
  'career_transition',
]);

export const TimeCommitmentSchema = z.enum(['quick', 'standard', 'deep']);

export const UserProfileSchema = z.object({
  id: z.string(),
  role: UserRoleSchema,
  goals: z.array(LearningGoalSchema).min(1).max(3),
  timeCommitment: TimeCommitmentSchema,
  preferredExplanationLevel: z.enum(['simple', 'business', 'technical']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserRole = z.infer<typeof UserRoleSchema>;
export type LearningGoal = z.infer<typeof LearningGoalSchema>;
export type TimeCommitment = z.infer<typeof TimeCommitmentSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
```

### Extended Milestone Schema

```typescript
// Add to src/types/milestone.ts

export const MilestoneLayeredContentSchema = z.object({
  tldr: z.string().max(100),
  simpleExplanation: z.string(),
  businessImpact: z.string(),
  technicalDepth: z.string(),
  historicalContext: z.string(),
  whyItMattersToday: z.string().max(300),
  commonMisconceptions: z.string(),
});

export type MilestoneLayeredContent = z.infer<typeof MilestoneLayeredContentSchema>;

// Update MilestoneResponseSchema to include:
// layeredContent: MilestoneLayeredContentSchema.optional()
```

---

## Content Generation Prompts

### Layered Explanations Prompt

```
scripts/prompts/layered-explanations.md

For the AI milestone below, generate 7 explanation layers for non-technical professionals.

MILESTONE:
Title: {{title}}
Date: {{date}}
Current Description: {{description}}

GENERATE:

1. TL;DR (max 15 words)
   - Plain English, no jargon
   - Focus on the single key insight

2. Simple Explanation (1-2 paragraphs)
   - Use everyday analogies
   - No technical terms
   - A smart 12-year-old should understand

3. Business Impact (bullet points)
   - 3-5 specific use cases by function/industry
   - Who it affected and how
   - Cost/accessibility implications

4. Technical Depth (2-3 paragraphs)
   - For users who want architecture details
   - Can include technical concepts
   - Still explain terms when introduced

5. Historical Context (1-2 paragraphs)
   - What research led to this
   - What problems it solved
   - Key predecessors

6. Why It Matters Today (1-2 sentences)
   - Direct connection to products they use
   - Current relevance

7. Common Misconceptions (2-3 bullets)
   - Format: "❌ [misconception]" → "✅ [correction]"
   - Things people commonly get wrong

TARGET AUDIENCE: Business executives, product managers, marketers with no CS background.
```

### Glossary Entry Prompt

```
scripts/prompts/glossary-entry.md

Create a glossary entry for non-technical professionals.

TERM: {{term}}

GENERATE:

1. Short Definition (max 20 words)
   - For hover tooltips
   - No jargon

2. Full Definition (2-3 sentences)
   - More detail but still accessible
   - Explain what it does, not how

3. Business Context (1-2 sentences)
   - Why should a PM/exec care?

4. "In a Meeting" Example (1 sentence)
   - How you might hear this term used at work
   - Format: "We're evaluating [term] for..."

5. Real-World Example (1 sentence)
   - Connect to a product/service they know

Related terms to link: {{suggestedRelatedTerms}}
```

---

## Content Loader Utilities

```typescript
// src/content/index.ts

import learningPaths from './learning-paths/*.json';
import glossaryTerms from './glossary/terms.json';
import checkpointQuestions from './checkpoints/questions.json';
import flashcards from './checkpoints/flashcards.json';
import currentEvents from './current-events/events.json';
import layeredContent from './milestones/layered-content.json';

import {
  LearningPathSchema,
  GlossaryEntrySchema,
  CheckpointSchema,
  FlashcardSchema,
  CurrentEventSchema,
  MilestoneLayeredContentSchema,
} from '../types';

// Validate and export content
export const validateContent = () => {
  // Validate all content against schemas
  // Throw errors for invalid content
  // Run in CI and on dev startup
};

export const getLearningPaths = () => learningPaths;
export const getLearningPath = (id: string) => learningPaths.find(p => p.id === id);

export const getGlossaryTerms = () => glossaryTerms;
export const getGlossaryTerm = (id: string) => glossaryTerms.find(t => t.id === id);

export const getCheckpointsForPath = (pathId: string) =>
  checkpointQuestions.filter(c => c.pathId === pathId);

export const getFlashcards = () => flashcards;
export const getFlashcardsByCategory = (category: string) =>
  flashcards.filter(f => f.category === category);

export const getCurrentEvents = () =>
  currentEvents.filter(e => !e.expiresAt || new Date(e.expiresAt) > new Date());

export const getLayeredContent = (milestoneId: string) =>
  layeredContent[milestoneId];
```

---

## React Hooks

```typescript
// src/hooks/useContent.ts

import { useState, useEffect } from 'react';
import * as content from '../content';

export function useLearningPaths() {
  const [paths, setPaths] = useState(content.getLearningPaths());
  return { data: paths, isLoading: false };
}

export function useLearningPath(id: string) {
  const path = content.getLearningPath(id);
  return { data: path, isLoading: false };
}

export function useGlossary() {
  const terms = content.getGlossaryTerms();
  return { data: terms, isLoading: false };
}

export function useGlossaryTerm(id: string) {
  const term = content.getGlossaryTerm(id);
  return { data: term, isLoading: false };
}

export function useCheckpoints(pathId: string) {
  const checkpoints = content.getCheckpointsForPath(pathId);
  return { data: checkpoints, isLoading: false };
}

export function useFlashcards(category?: string) {
  const cards = category
    ? content.getFlashcardsByCategory(category)
    : content.getFlashcards();
  return { data: cards, isLoading: false };
}

export function useCurrentEvents() {
  const events = content.getCurrentEvents();
  return { data: events, isLoading: false };
}

export function useLayeredContent(milestoneId: string) {
  const layered = content.getLayeredContent(milestoneId);
  return { data: layered, isLoading: false };
}
```

---

## Initial Seed Content Requirements

| Content Type | Quantity | Priority |
|--------------|----------|----------|
| Layered Explanations | 62 (all milestones) | P0 |
| Learning Paths | 5 paths | P0 |
| Glossary Entries | 30 terms | P0 |
| Flashcards | 30 cards | P1 |
| Checkpoint Questions | 9 (3 per path × 3 paths) | P1 |
| Current Events | 5 entries | P1 |

---

## Validation Script

```typescript
// scripts/validate-content.ts

import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Import all schemas
import {
  LearningPathSchema,
  GlossaryEntrySchema,
  CheckpointSchema,
  FlashcardSchema,
  CurrentEventSchema,
  MilestoneLayeredContentSchema,
} from '../src/types';

const validateFile = <T>(
  filePath: string,
  schema: z.ZodType<T>,
  isArray: boolean = true
) => {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const data = isArray ? content : [content];

  const errors: string[] = [];
  data.forEach((item: unknown, index: number) => {
    const result = schema.safeParse(item);
    if (!result.success) {
      errors.push(`Item ${index}: ${result.error.message}`);
    }
  });

  return errors;
};

const validateReferences = () => {
  // Check that all milestone IDs in paths/events exist
  // Check that all term IDs in relatedTermIds exist
  // Check that all path IDs in suggestedNextPathIds exist
};

// Run validation
const main = () => {
  console.log('Validating content...');

  // Validate each content type
  // Report errors
  // Exit with code 1 if any errors
};

main();
```

---

## Prisma Schema Updates

```prisma
// Add to prisma/schema.prisma

model Milestone {
  // ... existing fields ...

  // Layered content fields
  tldr                  String?
  simpleExplanation     String?
  businessImpact        String?
  technicalDepth        String?
  historicalContext     String?
  whyItMattersToday     String?
  commonMisconceptions  String?
}
```

---

## Success Criteria

- [ ] All 6 new type files created with Zod schemas
- [ ] Milestone schema extended with layered content fields
- [ ] Prisma migration created and applied
- [ ] Content directory structure created
- [ ] Content loader utilities working
- [ ] React hooks for all content types
- [ ] Layered explanations generated for all 62 milestones
- [ ] 5 learning paths defined with milestone sequences
- [ ] 30+ glossary terms with business context
- [ ] Validation script passing in CI
- [ ] Content renders correctly in existing UI (no breaking changes)

---

## Architecture Decision: Static JSON vs DynamoDB

**For Sprint 8.5, we use Static JSON because:**
- Faster to implement
- Content versioned in Git
- No additional AWS costs
- Works with current S3/CloudFront setup
- Content updates via PR → merge → deploy

**Future migration to DynamoDB when:**
- Admin UI needed for non-technical content editors
- Real-time content updates required
- User-generated content (saved progress syncing)
- A/B testing of content variations

The hooks abstraction (`useContent.ts`) makes this migration seamless - just swap the implementation.

---

## Deployment & Production Verification

### Pre-Deployment Checklist
- [ ] All Playwright tests passing locally
- [ ] Content validation script passes (`npm run content:validate`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)

### Deployment Steps
- [ ] Create PR with all schema and content changes
- [ ] Verify CI pipeline passes (lint, typecheck, tests, content validation)
- [ ] Merge to main branch
- [ ] Deploy to S3/CloudFront (`npm run deploy`)
- [ ] Invalidate CloudFront cache

### Production Verification
- [ ] Visit production URL: https://d33f170a3u5yyl.cloudfront.net
- [ ] Verify existing timeline functionality works (no regressions)
- [ ] Verify new content JSON files are accessible:
  - [ ] `/content/learning-paths/chatgpt-story.json`
  - [ ] `/content/glossary/terms.json`
  - [ ] `/content/milestones/layered-content.json`
- [ ] Check browser console for errors
- [ ] Test on mobile device

### Rollback Plan
If issues found in production:
1. Revert merge commit: `git revert <commit-hash>`
2. Push to main
3. Redeploy to S3
4. Invalidate CloudFront cache
