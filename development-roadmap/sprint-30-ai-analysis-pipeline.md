# Sprint 30: AI Analysis Pipeline

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 29 (News Ingestion Foundation)

## Overview

Add AI-powered analysis to ingested articles using Claude (Anthropic API). The system uses a two-stage approach:
1. **Stage 1 (Haiku)**: Quick relevance screening and milestone determination
2. **Stage 2 (Sonnet)**: Full content generation for milestone-worthy articles

**Goal**: Ingested articles are automatically analyzed and structured drafts are generated that match our exact backend schemas.

---

## Pipeline Flow

```
┌─────────────────┐     ┌──────────────────────┐     ┌───────────────────────┐
│ Ingested Article│────▶│ Stage 1: Screening   │────▶│ Stage 2: Generation   │
│                 │     │ (Claude Haiku)       │     │ (Claude Sonnet)       │
└─────────────────┘     │                      │     │                       │
                        │ • Relevance score    │     │ • Milestone draft     │
                        │ • Is milestone?      │     │ • News event draft    │
                        │ • Brief rationale    │     │ • Full content        │
                        └──────────────────────┘     └───────────────────────┘
                                 │                              │
                                 │                              ▼
                                 │              ┌───────────────────────────┐
                                 │              │ Stage 3: Glossary Check   │
                                 └─────────────▶│ (Claude Haiku)            │
                                                │ • New AI terms only       │
                                                │ • Deduplicate vs existing │
                                                └───────────────────────────┘
```

---

## Tasks

### 30.1 Extend Database Schema for Analysis
- [ ] Add analysis fields to `IngestedArticle` model
- [ ] Add `ContentDraft` model for generated content
- [ ] Run migration

```prisma
model IngestedArticle {
  // ... existing fields from Sprint 29

  // Stage 1 Analysis Results
  analysisStatus       String   @default("pending") // pending, screening, analyzed, generating, complete, error
  analyzedAt           DateTime?
  relevanceScore       Float?   // 0-1 scale
  isMilestoneWorthy    Boolean  @default(false)
  milestoneRationale   String?  // Why/why not milestone-worthy
  analysisError        String?

  // Relations
  drafts               ContentDraft[]
}

model ContentDraft {
  id          String   @id @default(uuid())
  articleId   String
  article     IngestedArticle @relation(fields: [articleId], references: [id])

  contentType String   // "news_event" | "milestone" | "glossary_term"
  draftData   String   // JSON matching target schema EXACTLY

  // Validation
  isValid     Boolean  @default(false) // Passed Zod validation
  validationErrors String? // JSON array of validation errors

  status      String   @default("pending") // pending, approved, rejected, published
  rejectionReason String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  publishedAt DateTime?
  publishedId String?  // ID of published milestone/event/term
}
```

### 30.2 Stage 1: Relevance Screening Service
- [ ] Create `server/src/services/ingestion/screening.ts`
- [ ] Use Claude Haiku (claude-3-haiku-20240307) for cost efficiency
- [ ] Return structured JSON for relevance determination

```typescript
// server/src/services/ingestion/screening.ts
import Anthropic from '@anthropic-ai/sdk';

interface ScreeningResult {
  relevanceScore: number;      // 0-1, how relevant to AI history/developments
  isMilestoneWorthy: boolean;  // Does this qualify as a historical milestone?
  milestoneRationale: string;  // 2-3 sentences explaining the decision
  suggestedCategory?: string;  // If milestone-worthy, which category
  hasNewGlossaryTerms: boolean; // Worth checking for new terms?
}

const SCREENING_PROMPT = `You are a curator for "Let AI Explain AI", an educational platform tracking significant AI developments from 1940s to present.

Your task: Evaluate if this article describes a MILESTONE-WORTHY event in AI history.

## What Makes a Milestone (ALL must apply):
1. **First or Major Breakthrough**: First of its kind, or a significant leap over previous capabilities
2. **Historical Significance**: Will likely be remembered and referenced 5+ years from now
3. **Verifiable Achievement**: Concrete, measurable advancement (not just announcements or speculation)
4. **Category Fit**: Fits one of our tracked categories

## Our Milestone Categories:
- research: Published papers, new techniques, theoretical breakthroughs
- model_release: New AI models publicly released (GPT-4, Claude 3, Llama 3, etc.)
- breakthrough: Capability milestones (beating humans at games, passing exams, etc.)
- product: AI products launched that changed how people work/live
- regulation: Government policies, laws, or major industry standards
- industry: Major company events (funding >$1B, acquisitions >$500M, major pivots)

## NOT Milestone-Worthy:
- Incremental updates or minor version releases
- Rumors, speculation, or "coming soon" announcements
- Opinion pieces or analysis without new developments
- Funding rounds under $500M (unless first-of-kind)
- Product features (vs. entirely new products)
- Internal company changes (leadership, layoffs) unless industry-shaping

## Article to Evaluate:
Title: {title}
Source: {source}
Published: {publishedDate}
Content: {content}

## Return JSON:
{
  "relevanceScore": <0.0-1.0 how relevant to AI developments>,
  "isMilestoneWorthy": <true/false>,
  "milestoneRationale": "<2-3 sentences explaining your decision>",
  "suggestedCategory": "<category if milestone-worthy, null otherwise>",
  "hasNewGlossaryTerms": <true if article introduces AI terminology worth defining>
}`;

export async function screenArticle(
  article: { title: string; content: string; source: string; publishedAt: Date },
  anthropicApiKey: string
): Promise<ScreeningResult> {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  const response = await client.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: SCREENING_PROMPT
        .replace('{title}', article.title)
        .replace('{source}', article.source)
        .replace('{publishedDate}', article.publishedAt.toISOString().split('T')[0])
        .replace('{content}', article.content.slice(0, 4000)) // Limit content length
    }]
  });

  // Parse JSON from response
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in screening response');

  return JSON.parse(jsonMatch[0]) as ScreeningResult;
}
```

### 30.3 Stage 2: Content Generation Service
- [ ] Create `server/src/services/ingestion/contentGenerator.ts`
- [ ] Use Claude Sonnet (claude-3-5-sonnet-20241022) for quality
- [ ] Generate drafts that EXACTLY match our Zod schemas

```typescript
// server/src/services/ingestion/contentGenerator.ts
import Anthropic from '@anthropic-ai/sdk';
import { MilestoneCategory, SignificanceLevel } from '../../types/milestone';

// These interfaces match our Zod schemas EXACTLY
interface MilestoneDraft {
  title: string;           // Max 500 chars
  description: string;     // Max 5000 chars, educational tone
  date: string;            // YYYY-MM-DD format
  category: 'research' | 'model_release' | 'breakthrough' | 'product' | 'regulation' | 'industry';
  significance: 1 | 2 | 3 | 4;  // 1=Minor, 2=Moderate, 3=Major, 4=Groundbreaking
  organization?: string;
  contributors?: string[];
  sourceUrl: string;       // Link to original article
  tags: string[];          // 3-8 relevant tags
  sources: Array<{
    label: string;
    kind: 'article' | 'paper' | 'primary_doc' | 'media';
    url: string;
  }>;
}

interface NewsEventDraft {
  headline: string;              // 10-200 chars, educational angle
  summary: string;               // 50-500 chars
  sourceUrl: string;
  sourcePublisher: string;
  publishedDate: string;         // YYYY-MM-DD
  prerequisiteMilestoneIds: string[];  // 2-6 milestone IDs for context
  connectionExplanation: string; // How this connects to prerequisites
  featured: boolean;
}

interface ContentGenerationResult {
  milestone?: MilestoneDraft;
  newsEvent: NewsEventDraft;
}

const CONTENT_GENERATION_PROMPT = `You are creating educational content for "Let AI Explain AI", a platform that helps non-technical professionals understand AI.

## Your Task:
Generate structured content from this article that matches our EXACT schemas.

## Article:
Title: {title}
Source: {source}
URL: {sourceUrl}
Published: {publishedDate}
Content: {content}

## Category Determined: {category}

## Existing Milestones for Context (use these IDs for prerequisites):
{recentMilestones}

## Generate This JSON Structure:

{
  "milestone": {
    "title": "<Clear, specific title - what happened, max 500 chars>",
    "description": "<Educational description explaining significance for non-experts, 200-1000 chars>",
    "date": "<YYYY-MM-DD when this occurred>",
    "category": "<exactly one of: research, model_release, breakthrough, product, regulation, industry>",
    "significance": <1-4 integer: 1=Minor first, 2=Moderate advance, 3=Major breakthrough, 4=Groundbreaking/historic>,
    "organization": "<Primary organization responsible, or null>",
    "contributors": ["<Key people involved>"],
    "sourceUrl": "<URL to original article>",
    "tags": ["<3-8 lowercase tags like: llm, openai, reasoning, multimodal>"],
    "sources": [
      {"label": "<Source name>", "kind": "article", "url": "<url>"}
    ]
  },
  "newsEvent": {
    "headline": "<Educational headline, 10-200 chars, what it means not just what happened>",
    "summary": "<Plain English summary for business professionals, 50-500 chars>",
    "sourceUrl": "<URL to original article>",
    "sourcePublisher": "<Publisher name like 'The Neuron Daily'>",
    "publishedDate": "<YYYY-MM-DD>",
    "prerequisiteMilestoneIds": ["<2-6 milestone IDs from the list above that help explain this news>"],
    "connectionExplanation": "<How this news connects to and builds on the prerequisite milestones>",
    "featured": <true if groundbreaking, false otherwise>
  }
}

## Significance Guide:
- 1 (Minor): Notable but limited impact, first smaller achievement
- 2 (Moderate): Clear advancement, will be cited in future work
- 3 (Major): Significant breakthrough, changes how field operates
- 4 (Groundbreaking): Historic, will be in textbooks, changes everything

## Important:
- Use EXACT field names as shown
- category must be exactly one of the 6 values listed
- significance must be an integer 1-4, not a string
- prerequisiteMilestoneIds must contain 2-6 valid IDs from the provided list
- All dates in YYYY-MM-DD format`;

export async function generateContent(
  article: { title: string; content: string; sourceUrl: string; source: string; publishedAt: Date },
  category: string,
  recentMilestones: Array<{ id: string; title: string; date: string }>,
  anthropicApiKey: string
): Promise<ContentGenerationResult> {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  // Format milestones for prompt
  const milestonesContext = recentMilestones
    .map(m => `- ${m.id}: "${m.title}" (${m.date})`)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: CONTENT_GENERATION_PROMPT
        .replace('{title}', article.title)
        .replace('{source}', article.source)
        .replace('{sourceUrl}', article.sourceUrl)
        .replace('{publishedDate}', article.publishedAt.toISOString().split('T')[0])
        .replace('{content}', article.content.slice(0, 6000))
        .replace('{category}', category)
        .replace('{recentMilestones}', milestonesContext)
    }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in content generation response');

  return JSON.parse(jsonMatch[0]) as ContentGenerationResult;
}
```

### 30.4 Stage 3: Glossary Term Extraction
- [ ] Create `server/src/services/ingestion/glossaryExtractor.ts`
- [ ] Use Claude Haiku for cost efficiency
- [ ] Pass existing terms to prevent duplicates
- [ ] Only extract genuinely NEW AI-specific terms

```typescript
// server/src/services/ingestion/glossaryExtractor.ts
import Anthropic from '@anthropic-ai/sdk';

interface GlossaryTermDraft {
  id: string;              // lowercase-kebab-case
  term: string;            // Display name
  shortDefinition: string; // Max 200 chars, for tooltips
  fullDefinition: string;  // 2-3 sentences
  businessContext: string; // Why business professionals should care
  category: 'core_concept' | 'technical_term' | 'business_term' | 'model_architecture' | 'company_product';
  relatedTermIds: string[];
  relatedMilestoneIds: string[];
}

const GLOSSARY_EXTRACTION_PROMPT = `You are a glossary curator for "Let AI Explain AI", helping non-technical professionals understand AI terminology.

## Your Task:
Identify NEW AI-specific terms from this article that should be added to our glossary.

## Article:
Title: {title}
Content: {content}

## EXISTING Glossary Terms (DO NOT duplicate these):
{existingTerms}

## Rules for New Terms:
1. Must be AI-SPECIFIC (not general tech terms like "API" or "cloud")
2. Must NOT already exist in our glossary (check the list above!)
3. Must be terminology a business professional would encounter and need defined
4. Skip company names unless they've become common nouns (like "GPT" has)
5. Skip version numbers (don't add "GPT-4" if "GPT" exists)

## Return JSON Array (empty array if no new terms):
[
  {
    "id": "<lowercase-kebab-case>",
    "term": "<Display Name>",
    "shortDefinition": "<Max 200 chars, no jargon, for tooltips>",
    "fullDefinition": "<2-3 sentences explaining the concept>",
    "businessContext": "<1-2 sentences: why should a business professional care?>",
    "category": "<exactly one of: core_concept, technical_term, business_term, model_architecture, company_product>",
    "relatedTermIds": ["<existing term IDs this relates to>"],
    "relatedMilestoneIds": []
  }
]

Return [] if no genuinely new terms are found. Quality over quantity.`;

export async function extractGlossaryTerms(
  article: { title: string; content: string },
  existingTerms: string[], // Array of existing term names
  anthropicApiKey: string
): Promise<GlossaryTermDraft[]> {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  const response = await client.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: GLOSSARY_EXTRACTION_PROMPT
        .replace('{title}', article.title)
        .replace('{content}', article.content.slice(0, 4000))
        .replace('{existingTerms}', existingTerms.join(', '))
    }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return []; // No terms found

  const terms = JSON.parse(jsonMatch[0]) as GlossaryTermDraft[];

  // Double-check for duplicates (AI might still suggest existing terms)
  const existingLower = existingTerms.map(t => t.toLowerCase());
  return terms.filter(t => !existingLower.includes(t.term.toLowerCase()));
}
```

### 30.5 Orchestration Service
- [ ] Create `server/src/services/ingestion/articleAnalyzer.ts`
- [ ] Coordinate all three stages
- [ ] Validate outputs against Zod schemas before saving
- [ ] Store drafts with validation status

```typescript
// server/src/services/ingestion/articleAnalyzer.ts
import { prisma } from '../../db';
import { screenArticle } from './screening';
import { generateContent } from './contentGenerator';
import { extractGlossaryTerms } from './glossaryExtractor';
import { CreateMilestoneDtoSchema } from '../../types/milestone';
import { CurrentEventSchema } from '../../types/currentEvent';
import { GlossaryEntrySchema } from '../../types/glossary';

export async function analyzeArticle(articleId: string): Promise<void> {
  const article = await prisma.ingestedArticle.findUnique({
    where: { id: articleId },
    include: { source: true }
  });

  if (!article) throw new Error('Article not found');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  try {
    // Update status to screening
    await prisma.ingestedArticle.update({
      where: { id: articleId },
      data: { analysisStatus: 'screening' }
    });

    // Stage 1: Screening (Haiku - cheap)
    const screening = await screenArticle({
      title: article.title,
      content: article.content,
      source: article.source.name,
      publishedAt: article.publishedAt
    }, apiKey);

    await prisma.ingestedArticle.update({
      where: { id: articleId },
      data: {
        relevanceScore: screening.relevanceScore,
        isMilestoneWorthy: screening.isMilestoneWorthy,
        milestoneRationale: screening.milestoneRationale,
        analysisStatus: screening.isMilestoneWorthy ? 'generating' : 'analyzed'
      }
    });

    // Stage 2: Content Generation (Sonnet - if milestone-worthy)
    if (screening.isMilestoneWorthy && screening.suggestedCategory) {
      // Get recent milestones for context
      const recentMilestones = await prisma.milestone.findMany({
        take: 50,
        orderBy: { date: 'desc' },
        select: { id: true, title: true, date: true }
      });

      const content = await generateContent({
        title: article.title,
        content: article.content,
        sourceUrl: article.externalUrl,
        source: article.source.name,
        publishedAt: article.publishedAt
      }, screening.suggestedCategory, recentMilestones.map(m => ({
        id: m.id,
        title: m.title,
        date: m.date.toISOString().split('T')[0]
      })), apiKey);

      // Validate and save milestone draft
      if (content.milestone) {
        const milestoneValidation = CreateMilestoneDtoSchema.safeParse(content.milestone);
        await prisma.contentDraft.create({
          data: {
            articleId,
            contentType: 'milestone',
            draftData: JSON.stringify(content.milestone),
            isValid: milestoneValidation.success,
            validationErrors: milestoneValidation.success ? null :
              JSON.stringify(milestoneValidation.error.errors)
          }
        });
      }

      // Validate and save news event draft
      const eventValidation = CurrentEventSchema.safeParse({
        ...content.newsEvent,
        id: `evt_${Date.now()}` // Generate ID
      });
      await prisma.contentDraft.create({
        data: {
          articleId,
          contentType: 'news_event',
          draftData: JSON.stringify(content.newsEvent),
          isValid: eventValidation.success,
          validationErrors: eventValidation.success ? null :
            JSON.stringify(eventValidation.error.errors)
        }
      });
    }

    // Stage 3: Glossary Terms (Haiku - if indicated)
    if (screening.hasNewGlossaryTerms) {
      // Get existing glossary terms
      const existingTerms = await getExistingGlossaryTerms();

      const glossaryTerms = await extractGlossaryTerms({
        title: article.title,
        content: article.content
      }, existingTerms, apiKey);

      // Save each term as a draft
      for (const term of glossaryTerms) {
        const validation = GlossaryEntrySchema.safeParse(term);
        await prisma.contentDraft.create({
          data: {
            articleId,
            contentType: 'glossary_term',
            draftData: JSON.stringify(term),
            isValid: validation.success,
            validationErrors: validation.success ? null :
              JSON.stringify(validation.error.errors)
          }
        });
      }
    }

    // Mark complete
    await prisma.ingestedArticle.update({
      where: { id: articleId },
      data: {
        analysisStatus: 'complete',
        analyzedAt: new Date()
      }
    });

  } catch (error) {
    await prisma.ingestedArticle.update({
      where: { id: articleId },
      data: {
        analysisStatus: 'error',
        analysisError: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
}

async function getExistingGlossaryTerms(): Promise<string[]> {
  // TODO: Once glossary is in DB (Sprint 32), query from there
  // For now, load from static JSON
  const glossaryData = await import('../../../src/content/glossary/terms.json');
  return glossaryData.default.map((t: { term: string }) => t.term);
}
```

### 30.6 Analysis API Endpoints
- [ ] `POST /api/admin/articles/:id/analyze` - Analyze single article
- [ ] `POST /api/admin/articles/analyze-pending` - Analyze all pending (with limit)
- [ ] `GET /api/admin/articles/:id` - Get article with analysis & drafts

### 30.7 Update Articles List UI
- [ ] Add analysis status column/badge
- [ ] Add "Analyze" button for pending articles
- [ ] Add "Analyze All Pending" bulk action (limit 10 per batch)
- [ ] Show relevance score when analyzed
- [ ] Show milestone-worthy indicator (⭐)
- [ ] Show validation status on drafts

### 30.8 Article Detail View
- [ ] Create `src/pages/admin/ArticleDetailPage.tsx`
- [ ] Show original article content
- [ ] Show AI screening results (relevance, rationale)
- [ ] Show all generated drafts with validation status
- [ ] Preview each draft inline
- [ ] Show validation errors if any

---

## Cost Estimates

| Stage | Model | Est. Tokens | Cost/Article |
|-------|-------|-------------|--------------|
| Screening | Haiku | ~1500 | ~$0.001 |
| Content Gen | Sonnet | ~3000 | ~$0.02 |
| Glossary | Haiku | ~1000 | ~$0.0008 |

**Per article (milestone-worthy)**: ~$0.022
**Per article (not milestone)**: ~$0.001
**100 articles/month (20% milestone)**: ~$0.50/month

---

## Success Criteria

- [ ] Screening correctly identifies milestone-worthy articles (spot-check 10)
- [ ] Generated milestone drafts pass Zod validation >90% of time
- [ ] Generated news event drafts pass Zod validation >95% of time
- [ ] Glossary extraction doesn't suggest existing terms
- [ ] Analysis completes in <30 seconds per article
- [ ] Errors are logged and don't crash the pipeline
- [ ] UI shows clear status and validation results

---

## Notes

- Keep ANTHROPIC_API_KEY in environment variables (already in .env for local)
- For production, store in AWS Secrets Manager or Parameter Store
- Consider adding retry logic for API rate limits
- Store raw API responses for debugging (optional field in ContentDraft)
