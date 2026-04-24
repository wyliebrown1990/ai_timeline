/**
 * News Event Generator Service
 *
 * Generates news event drafts for relevant articles that aren't milestone-worthy.
 * Uses Claude Haiku for cost-efficiency since we only need a news event summary,
 * not the full layered content that milestones require.
 *
 * Sprint fix: News events should be created for ALL relevant AI articles,
 * not just milestone-worthy ones.
 */

import Anthropic from '@anthropic-ai/sdk';

export interface NewsEventOnlyDraft {
  headline: string; // 10-200 chars, educational angle
  summary: string; // 100-1500 chars, TLDR with key points
  sourceUrl: string;
  sourcePublisher: string;
  publishedDate: string; // YYYY-MM-DD
  prerequisiteMilestoneIds: string[]; // 2-6 milestone IDs for context
  connectionExplanation: string; // How this connects to prerequisites
  featured: boolean;
  // Media fields (added by caller if needed)
  mediaType?: 'text' | 'video' | 'audio';
  videoId?: string;
  thumbnailUrl?: string;
}

const NEWS_EVENT_PROMPT = `You are creating news content for "Let AI Explain AI", a platform that helps non-technical professionals understand AI developments.

## Your Task:
Create a news event entry that connects this article to AI history and explains its significance.

## Article:
Title: {{title}}
Source: {{source}}
URL: {{sourceUrl}}
Published: {{publishedDate}}
Content: {{content}}

## Existing Milestones for Context (use these IDs for prerequisites):
{{recentMilestones}}

## Generate This EXACT JSON Structure:

{
  "headline": "<Educational headline explaining what this means for AI, 10-200 chars>",
  "summary": "<TLDR summary for business professionals: Cover the key facts, why it matters, and main implications. Include 3-5 critical points in plain English. 100-1500 chars>",
  "sourceUrl": "{{sourceUrl}}",
  "sourcePublisher": "<Publisher name>",
  "publishedDate": "{{publishedDate}}",
  "prerequisiteMilestoneIds": ["<2-6 milestone IDs from the list above that provide context for understanding this news>"],
  "connectionExplanation": "<How this news connects to and builds on the prerequisite milestones, helping readers understand the bigger picture>",
  "featured": false
}

## Important Rules:
- Return ONLY valid JSON (no markdown code blocks, no explanation text)
- headline should explain significance, not just state facts
- summary should be a comprehensive TLDR with key facts, significance, and implications - not just a single sentence. Include the critical points someone needs to understand this news.
- prerequisiteMilestoneIds: Select 2-6 milestones that help explain this news
- If no suitable prerequisite milestones exist, use an empty array []
- featured should almost always be false (only true for truly groundbreaking news)`;

export async function generateNewsEventOnly(
  article: {
    title: string;
    content: string;
    sourceUrl: string;
    source: string;
    publishedAt: Date;
  },
  recentMilestones: Array<{ id: string; title: string; date: string }>,
  anthropicApiKey: string
): Promise<NewsEventOnlyDraft> {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  // Format milestones for prompt
  const milestonesContext =
    recentMilestones.length > 0
      ? recentMilestones.map((m) => `- ${m.id}: "${m.title}" (${m.date})`).join('\n')
      : '(No existing milestones yet)';

  const publishedDate = article.publishedAt.toISOString().split('T')[0];

  const prompt = NEWS_EVENT_PROMPT.replace(/\{\{title\}\}/g, article.title)
    .replace(/\{\{source\}\}/g, article.source)
    .replace(/\{\{sourceUrl\}\}/g, article.sourceUrl)
    .replace(/\{\{publishedDate\}\}/g, publishedDate)
    .replace('{{content}}', article.content.slice(0, 4000)) // Limit for Haiku
    .replace('{{recentMilestones}}', milestonesContext);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
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
    throw new Error(`No JSON found in news event generation response: ${text.slice(0, 200)}`);
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as NewsEventOnlyDraft;

    // Validate and fix common issues
    result.prerequisiteMilestoneIds = result.prerequisiteMilestoneIds || [];
    result.featured = result.featured || false;

    // Ensure required fields have values
    if (!result.headline || result.headline.length < 10) {
      result.headline = article.title.slice(0, 200);
    }
    if (!result.summary || result.summary.length < 100) {
      result.summary = `${article.source} reports on this AI development. The article discusses key implications for the industry and what it means for businesses and professionals following AI progress.`;
    }
    if (!result.sourceUrl) {
      result.sourceUrl = article.sourceUrl;
    }
    if (!result.sourcePublisher) {
      result.sourcePublisher = article.source;
    }
    if (!result.publishedDate) {
      result.publishedDate = publishedDate;
    }
    if (!result.connectionExplanation) {
      result.connectionExplanation = 'This news provides insight into current AI developments.';
    }

    return result;
  } catch (parseError) {
    throw new Error(`Failed to parse news event generation response JSON: ${parseError}`);
  }
}
