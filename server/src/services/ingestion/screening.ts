/**
 * Stage 1: Article Screening Service
 *
 * Uses Claude Haiku for cost-efficient relevance screening and milestone determination.
 * This is the first stage of the AI analysis pipeline.
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ScreeningResult {
  relevanceScore: number; // 0-1, how relevant to AI history/developments
  isMilestoneWorthy: boolean; // Does this qualify as a historical milestone?
  milestoneRationale: string; // 2-3 sentences explaining the decision
  suggestedCategory: string | null; // If milestone-worthy, which category
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
Title: {{title}}
Source: {{source}}
Published: {{publishedDate}}
Content: {{content}}

## Return ONLY valid JSON (no markdown, no explanation):
{
  "relevanceScore": <0.0-1.0 how relevant to AI developments>,
  "isMilestoneWorthy": <true or false>,
  "milestoneRationale": "<2-3 sentences explaining your decision>",
  "suggestedCategory": "<category if milestone-worthy, null otherwise>",
  "hasNewGlossaryTerms": <true if article introduces AI terminology worth defining>
}`;

export async function screenArticle(
  article: {
    title: string;
    content: string;
    source: string;
    publishedAt: Date;
  },
  anthropicApiKey: string
): Promise<ScreeningResult> {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  const prompt = SCREENING_PROMPT.replace('{{title}}', article.title)
    .replace('{{source}}', article.source)
    .replace('{{publishedDate}}', article.publishedAt.toISOString().split('T')[0])
    .replace('{{content}}', article.content.slice(0, 4000)); // Limit content length

  const response = await client.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Parse JSON from response
  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON found in screening response: ${text.slice(0, 200)}`);
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as ScreeningResult;

    // Validate required fields
    if (typeof result.relevanceScore !== 'number') {
      result.relevanceScore = 0.5;
    }
    if (typeof result.isMilestoneWorthy !== 'boolean') {
      result.isMilestoneWorthy = false;
    }
    if (typeof result.milestoneRationale !== 'string') {
      result.milestoneRationale = 'Unable to determine rationale';
    }
    if (typeof result.hasNewGlossaryTerms !== 'boolean') {
      result.hasNewGlossaryTerms = false;
    }

    // Ensure relevanceScore is within bounds
    result.relevanceScore = Math.max(0, Math.min(1, result.relevanceScore));

    return result;
  } catch (parseError) {
    throw new Error(`Failed to parse screening response JSON: ${parseError}`);
  }
}
