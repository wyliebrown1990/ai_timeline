/**
 * News Context Generator Service (Sprint LEarn-2)
 *
 * Generates "Why this matters" historical context for news events
 * by finding related milestones and creating educational explanations.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { PrismaClient, Milestone, CurrentEvent } from '@prisma/client';

// Initialize Anthropic client
const anthropic = new Anthropic();

/**
 * Related milestone with relevance info
 */
export interface RelatedMilestone {
  id: string;
  title: string;
  date: Date;
  category: string;
  relevanceScore: number;
  relevanceReason: string;
}

/**
 * Context generation result
 */
export interface ContextResult {
  whyItMatters: string;
  relatedMilestones: RelatedMilestone[];
}

/**
 * Find milestones related to a news event using semantic search with Claude
 */
export async function findRelatedMilestones(
  event: { headline: string; summary: string },
  prisma: PrismaClient,
  limit = 5
): Promise<RelatedMilestone[]> {
  // Get recent milestones for context
  const milestones = await prisma.milestone.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      date: true,
      category: true,
      tldr: true,
    },
    orderBy: { date: 'desc' },
    take: 100, // Get top 100 recent milestones for analysis
  });

  if (milestones.length === 0) {
    return [];
  }

  const prompt = `Analyze this AI news event and find the most relevant historical milestones from the list below.

NEWS EVENT:
Headline: ${event.headline}
Summary: ${event.summary}

HISTORICAL MILESTONES:
${milestones.map((m, i) => `${i + 1}. [${m.id}] ${m.title} (${m.date.toISOString().split('T')[0]}) - ${m.tldr || m.description.substring(0, 200)}`).join('\n')}

Find up to ${limit} milestones that are DIRECTLY related to this news - events that:
- Led to or enabled this development
- Are being built upon or extended
- Represent similar achievements from the past
- Are from the same organization or research lineage

Return a JSON array of related milestones:
[
  {
    "id": "milestone_id",
    "relevanceScore": 0.95,
    "relevanceReason": "Brief explanation of why this milestone relates to the news"
  }
]

Rules:
- Only include truly relevant milestones (relevanceScore > 0.7)
- Maximum ${limit} milestones
- Sort by relevance score descending
- If no milestones are truly relevant, return empty array []

Return ONLY the JSON array, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        id: string;
        relevanceScore: number;
        relevanceReason: string;
      }>;

      // Map back to full milestone data
      const milestoneMap = new Map(milestones.map((m) => [m.id, m]));

      return parsed
        .filter((p) => milestoneMap.has(p.id) && p.relevanceScore >= 0.7)
        .slice(0, limit)
        .map((p) => {
          const milestone = milestoneMap.get(p.id)!;
          return {
            id: milestone.id,
            title: milestone.title,
            date: milestone.date,
            category: milestone.category,
            relevanceScore: p.relevanceScore,
            relevanceReason: p.relevanceReason,
          };
        });
    }
  } catch (error) {
    console.error('[newsContextGenerator] Failed to find related milestones:', error);
  }

  return [];
}

/**
 * Generate "Why this matters" context using Claude
 */
export async function generateWhyItMatters(
  event: { headline: string; summary: string },
  relatedMilestones: RelatedMilestone[]
): Promise<string> {
  if (relatedMilestones.length === 0) {
    // Generate generic context without historical references
    const prompt = `Write a 2-3 sentence "Why this matters" explanation for this AI news event.
Focus on the significance and implications for the AI field and industry.

NEWS EVENT:
Headline: ${event.headline}
Summary: ${event.summary}

Write in an educational, informative tone. Be concise and specific.
Do NOT use phrases like "This matters because..." - just explain the significance directly.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      return response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    } catch (error) {
      console.error('[newsContextGenerator] Failed to generate context:', error);
      return '';
    }
  }

  // Generate context with historical references
  const prompt = `Write a 2-3 sentence "Why this matters" explanation for this AI news event, connecting it to its historical context.

NEWS EVENT:
Headline: ${event.headline}
Summary: ${event.summary}

RELATED HISTORICAL MILESTONES:
${relatedMilestones.map((m) => `- ${m.title} (${m.date.toISOString().split('T')[0]}): ${m.relevanceReason}`).join('\n')}

Guidelines:
- Reference specific dates and milestones by name
- Explain the progression from past to present
- Keep to 2-3 sentences maximum
- Use an educational, informative tone
- Do NOT start with "This matters because..." - just explain directly

Example format:
"This announcement builds on GPT-4 (March 2023), which itself evolved from the original Transformer architecture (2017). We're seeing the third generation of this technology reach mainstream consumers."`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  } catch (error) {
    console.error('[newsContextGenerator] Failed to generate context:', error);
    return '';
  }
}

/**
 * Generate full context for a news event
 */
export async function generateNewsContext(
  eventId: string,
  prisma: PrismaClient
): Promise<ContextResult> {
  // Get the news event
  const event = await prisma.currentEvent.findUnique({
    where: { id: eventId },
    select: { id: true, headline: true, summary: true },
  });

  if (!event) {
    throw new Error(`News event not found: ${eventId}`);
  }

  // Find related milestones
  const relatedMilestones = await findRelatedMilestones(event, prisma);

  // Generate "Why this matters" context
  const whyItMatters = await generateWhyItMatters(event, relatedMilestones);

  // Update the event with context
  await prisma.currentEvent.update({
    where: { id: eventId },
    data: {
      relatedMilestoneIds: JSON.stringify(relatedMilestones.map((m) => m.id)),
      whyItMatters,
    },
  });

  console.log(
    `[newsContextGenerator] Generated context for event ${eventId}: ${relatedMilestones.length} related milestones`
  );

  return { whyItMatters, relatedMilestones };
}

/**
 * Get context for a news event (from DB or generate if missing)
 */
export async function getNewsContext(
  eventId: string,
  prisma: PrismaClient,
  regenerate = false
): Promise<ContextResult> {
  const event = await prisma.currentEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      headline: true,
      summary: true,
      whyItMatters: true,
      relatedMilestoneIds: true,
    },
  });

  if (!event) {
    throw new Error(`News event not found: ${eventId}`);
  }

  // Return existing context if available and not regenerating
  if (!regenerate && event.whyItMatters && event.relatedMilestoneIds !== '[]') {
    const milestoneIds = JSON.parse(event.relatedMilestoneIds) as string[];

    // Get milestone details
    const milestones = await prisma.milestone.findMany({
      where: { id: { in: milestoneIds } },
      select: {
        id: true,
        title: true,
        date: true,
        category: true,
      },
    });

    return {
      whyItMatters: event.whyItMatters,
      relatedMilestones: milestones.map((m) => ({
        id: m.id,
        title: m.title,
        date: m.date,
        category: m.category,
        relevanceScore: 1.0,
        relevanceReason: '',
      })),
    };
  }

  // Generate new context
  return generateNewsContext(eventId, prisma);
}

/**
 * Process multiple news events for context generation (batch)
 */
export async function batchGenerateContext(
  eventIds: string[],
  prisma: PrismaClient
): Promise<Map<string, ContextResult>> {
  const results = new Map<string, ContextResult>();

  for (const eventId of eventIds) {
    try {
      const result = await generateNewsContext(eventId, prisma);
      results.set(eventId, result);
    } catch (error) {
      console.error(`[newsContextGenerator] Failed to process event ${eventId}:`, error);
    }
  }

  return results;
}
