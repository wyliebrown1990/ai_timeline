/**
 * Stage 2: Content Generation Service
 *
 * Uses Claude Sonnet for high-quality content generation.
 * Only called for milestone-worthy articles after Stage 1 screening.
 */

import Anthropic from '@anthropic-ai/sdk';

// These interfaces match our Zod schemas EXACTLY
export interface MilestoneDraft {
  title: string; // Max 500 chars
  description: string; // Max 5000 chars, educational tone
  date: string; // YYYY-MM-DD format
  category: 'research' | 'model_release' | 'breakthrough' | 'product' | 'regulation' | 'industry';
  significance: 1 | 2 | 3 | 4; // 1=Minor, 2=Moderate, 3=Major, 4=Groundbreaking
  organization?: string;
  contributors?: string[];
  sourceUrl: string; // Link to original article
  tags: string[]; // 3-8 relevant tags
  sources: Array<{
    label: string;
    kind: 'article' | 'paper' | 'primary_doc' | 'media';
    url: string;
  }>;
}

export interface NewsEventDraft {
  headline: string; // 10-200 chars, educational angle
  summary: string; // 50-500 chars
  sourceUrl: string;
  sourcePublisher: string;
  publishedDate: string; // YYYY-MM-DD
  prerequisiteMilestoneIds: string[]; // 2-6 milestone IDs for context
  connectionExplanation: string; // How this connects to prerequisites
  featured: boolean;
}

export interface ContentGenerationResult {
  milestone: MilestoneDraft | null;
  newsEvent: NewsEventDraft;
}

const CONTENT_GENERATION_PROMPT = `You are creating educational content for "Let AI Explain AI", a platform that helps non-technical professionals understand AI.

## Your Task:
Generate structured content from this article that matches our EXACT schemas.

## Article:
Title: {{title}}
Source: {{source}}
URL: {{sourceUrl}}
Published: {{publishedDate}}
Content: {{content}}

## Category Determined: {{category}}

## Existing Milestones for Context (use these IDs for prerequisites):
{{recentMilestones}}

## Generate This EXACT JSON Structure:

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

## Important Rules:
- Return ONLY valid JSON (no markdown code blocks, no explanation text)
- Use EXACT field names as shown
- category must be exactly one of the 6 values listed
- significance must be an integer 1-4, not a string
- prerequisiteMilestoneIds must contain 2-6 valid IDs from the provided list
- All dates in YYYY-MM-DD format
- If no suitable prerequisite milestones exist, use an empty array []`;

export async function generateContent(
  article: {
    title: string;
    content: string;
    sourceUrl: string;
    source: string;
    publishedAt: Date;
  },
  category: string,
  recentMilestones: Array<{ id: string; title: string; date: string }>,
  anthropicApiKey: string
): Promise<ContentGenerationResult> {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  // Format milestones for prompt
  const milestonesContext =
    recentMilestones.length > 0
      ? recentMilestones.map((m) => `- ${m.id}: "${m.title}" (${m.date})`).join('\n')
      : '(No existing milestones yet)';

  const prompt = CONTENT_GENERATION_PROMPT.replace('{{title}}', article.title)
    .replace('{{source}}', article.source)
    .replace('{{sourceUrl}}', article.sourceUrl)
    .replace('{{publishedDate}}', article.publishedAt.toISOString().split('T')[0])
    .replace('{{content}}', article.content.slice(0, 6000))
    .replace('{{category}}', category)
    .replace('{{recentMilestones}}', milestonesContext);

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON found in content generation response: ${text.slice(0, 200)}`);
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as ContentGenerationResult;

    // Validate and fix common issues
    if (result.milestone) {
      // Ensure significance is a number
      if (typeof result.milestone.significance === 'string') {
        result.milestone.significance = parseInt(result.milestone.significance, 10) as 1 | 2 | 3 | 4;
      }
      // Ensure significance is in valid range
      result.milestone.significance = Math.max(1, Math.min(4, result.milestone.significance)) as 1 | 2 | 3 | 4;

      // Ensure arrays exist
      result.milestone.tags = result.milestone.tags || [];
      result.milestone.contributors = result.milestone.contributors || [];
      result.milestone.sources = result.milestone.sources || [];
    }

    if (result.newsEvent) {
      result.newsEvent.prerequisiteMilestoneIds = result.newsEvent.prerequisiteMilestoneIds || [];
    }

    return result;
  } catch (parseError) {
    throw new Error(`Failed to parse content generation response JSON: ${parseError}`);
  }
}
