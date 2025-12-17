# AI Fluency Platform - Product Plan

## Vision
Transform the AI Timeline from a reference tool into an **AI Fluency Platform** that helps non-technical professionals (executives, PMs, marketers, investors) understand AI concepts, history, and implications through interactive learning.

**Core Principle**: The timeline remains the anchor experience. All new features enhance understanding of timeline content rather than replacing it.

---

## Target Users
- Business executives evaluating AI investments
- Product managers working with AI teams
- Marketing professionals explaining AI products
- Investors analyzing AI companies
- Curious professionals wanting AI literacy

---

## Current State (Completed)
- Interactive horizontal timeline (62 milestones, 1943-2025)
- Semantic zoom (pills/cards based on density)
- Mobile-optimized vertical layout
- Dark mode, search, category filtering
- Production deployment: https://d33f170a3u5yyl.cloudfront.net

---

## New Features (Priority Order)

### 1. AI Learning Companion (High Impact / Medium Effort)
An AI assistant powered by Claude that helps users understand timeline content in plain language.

**User Experience**:
- Floating chat button on every page
- "Explain this to me" button on milestone cards
- Context-aware responses based on current milestone
- Follow-up questions encouraged

**Example Interactions**:
- User views GPT-3 milestone, clicks "Explain" -> AI explains in business terms
- User asks "Why did this matter?" -> AI provides business impact
- User asks "How does this relate to [other milestone]?" -> AI connects concepts

**Technical Approach**:
- Claude API (Anthropic) for responses
- System prompt with milestone context
- Rate limiting per session
- Cost: ~$0.01-0.05 per conversation

### 2. Layered Explanations (High Impact / Low Effort)
Multiple explanation depths for each milestone and concept.

**Explanation Levels**:
- **TL;DR** (1 sentence): "GPT-3 showed that making AI models much bigger makes them dramatically smarter"
- **Executive Summary** (1 paragraph): Business impact and significance
- **Technical Deep Dive** (full): For those wanting details

**Implementation**:
- Add fields to milestone data model
- Toggle UI in milestone detail panel
- AI-assisted generation with human review

### 3. Learning Paths (High Impact / Low Effort)
Curated sequences of milestones for specific learning goals.

**Initial Paths** (hardcoded):
- **AI Fundamentals**: Core concepts every professional should know
- **The ChatGPT Story**: Transformer -> GPT-3 -> ChatGPT -> GPT-4
- **AI Safety & Alignment**: Understanding AI risks
- **Business AI Applications**: Commercial AI evolution

**User Experience**:
- Path selector in navigation
- Progress tracking (localStorage initially)
- "Next milestone" navigation within path
- Completion indicators

### 4. Business Glossary (Medium Impact / Low Effort)
Plain-language definitions of AI terms with business context.

**Entry Structure**:
```
Term: Transformer
Plain English: A breakthrough design for AI that lets it understand context in text
Business Relevance: Powers ChatGPT, translation tools, content generation
Related Milestones: [links]
```

**Implementation**:
- Inline hover definitions on key terms
- Dedicated glossary page
- Link from milestone descriptions

### 5. Concept Checkpoints (Medium Impact / Medium Effort)
Quick comprehension checks after viewing milestones.

**Question Types**:
- "Which best describes why GPT-3 was significant?"
- "True/False: Transformers were invented by Google"
- "What came first: BERT or GPT-3?"

**Implementation**:
- Questions attached to milestones/paths
- Optional (skip button always visible)
- Progress stored in localStorage
- No grades or pressure

### 6. Personalized Onboarding (Medium Impact / Medium Effort)
Tailored experience based on user's role and goals.

**Onboarding Flow**:
1. "What's your role?" (Executive, PM, Developer, Other)
2. "What do you want to understand?" (Basics, ChatGPT, Business Impact, Technical)
3. Recommend starting path
4. Adjust explanation default level

**Implementation**:
- Simple modal on first visit
- Store preferences in localStorage
- Plan for auth migration later

---

## Technical Architecture

### Current Stack
- Frontend: React + TypeScript + Tailwind
- Data: Static JSON on S3
- CDN: CloudFront
- Testing: Playwright

### Future Stack (when needed)
- Backend: Lambda + API Gateway
- Database: DynamoDB (milestones, user progress, glossary)
- AI: Claude API via Lambda
- Auth: Cognito (when user accounts needed)
- Secrets: AWS Secrets Manager (API keys)

### Data Model Extensions

```typescript
// Milestone extensions
interface Milestone {
  // ... existing fields
  tldr: string;                    // 1-sentence explanation
  executiveSummary: string;        // Business-focused paragraph
  businessRelevance: string;       // Why professionals should care
  relatedConceptIds: string[];     // Links to glossary
  pathIds: string[];               // Which learning paths include this
}

// New models
interface GlossaryEntry {
  id: string;
  term: string;
  plainEnglish: string;
  technicalDefinition: string;
  businessRelevance: string;
  relatedMilestoneIds: string[];
  relatedTermIds: string[];
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  targetAudience: string;
  milestoneIds: string[];         // Ordered sequence
  estimatedMinutes: number;
}

interface UserProgress {
  visitorId: string;              // Anonymous ID
  viewedMilestones: string[];
  completedPaths: string[];
  checkpointResults: Record<string, boolean>;
  preferences: {
    explanationLevel: 'tldr' | 'executive' | 'technical';
    role: string;
  };
}
```

---

## Content Strategy

### AI-Assisted Generation
Use Claude to draft content, human review before publishing:
1. Generate TL;DR and executive summaries for existing milestones
2. Generate glossary entries for key terms
3. Generate checkpoint questions
4. Human review and edit all generated content

### Quality Standards
- Every explanation tested with non-technical reader
- No jargon without definition
- Business relevance explicit
- Sources cited

---

## Success Metrics
- Time on site (learning engagement)
- Path completion rates
- AI companion usage
- Return visits
- Glossary hover/click rates

---

## Budget Approach
- Keep infrastructure costs minimal (< $50/month)
- Claude API: Pay per use, rate limit aggressively
- Scale backend only when static JSON insufficient
- Anonymous users first, auth only when needed

---

## Original Timeline Reference (Preserved)

### Era Structure
- Foundations (pre-1956): Turing and early computation
- Birth of AI (1956-1969): Dartmouth, symbolic AI
- Symbolic and Expert Systems (1970-1987)
- Winters and Statistical ML (1988-2011)
- Deep Learning Resurgence (2012-2016): AlexNet, ImageNet
- Transformers and Modern NLP (2017-2019): Transformer, BERT
- Scaling and LLMs (2020-2021): GPT-3
- Alignment and Productization (2022-2023): ChatGPT
- Multimodal and Deployment (2023-present): GPT-4+

### Content Goals
- 200 timeline items (currently 62)
- Mix: papers, model releases, datasets, hardware, policy, culture
- 60+ concept definitions
- Primary source citations for everything
