/**
 * SEO Content Generator Service
 * Sprint SEO-4 Task 8 - Admin Tools for Content Generation
 *
 * Uses Claude API to generate enriched content for Explained and Who Invented pages.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../db';
import { ANTHROPIC_SONNET_MODEL } from './anthropicModels';

// Initialize Anthropic client
function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
}

// Use Sonnet for quality content generation
const CONTENT_MODEL = ANTHROPIC_SONNET_MODEL;

/**
 * Generated content for Explained pages
 */
export interface ExplainedContent {
  historySection: string;
  howItWorksSection: string;
  faqItems: Array<{ question: string; answer: string }>;
}

/**
 * Generated content for Who Invented pages
 */
export interface WhoInventedContent {
  quickAnswer: string;
}

/**
 * Generation result
 */
export interface GenerationResult {
  success: boolean;
  termId: string;
  term: string;
  error?: string;
}

/**
 * Get terms that need SEO content generation
 */
export async function getTermsNeedingGeneration(limit: number = 50): Promise<Array<{
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  fullDefinition: string;
  category: string;
  seoContentStatus: string;
  hasKeyFigures: boolean;
}>> {
  const terms = await prisma.glossaryTerm.findMany({
    where: {
      OR: [
        { seoContentStatus: 'pending' },
        { seoContentStatus: null },
      ],
    },
    select: {
      id: true,
      term: true,
      slug: true,
      shortDefinition: true,
      fullDefinition: true,
      category: true,
      seoContentStatus: true,
      keyFigures: {
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { term: 'asc' },
    take: limit,
  });

  return terms.map((t) => ({
    id: t.id,
    term: t.term,
    slug: t.slug,
    shortDefinition: t.shortDefinition,
    fullDefinition: t.fullDefinition,
    category: t.category,
    seoContentStatus: t.seoContentStatus || 'pending',
    hasKeyFigures: t.keyFigures.length > 0,
  }));
}

/**
 * Get generation stats
 */
export async function getGenerationStats(): Promise<{
  total: number;
  pending: number;
  generating: number;
  complete: number;
  error: number;
}> {
  const [total, pending, generating, complete, error] = await Promise.all([
    prisma.glossaryTerm.count(),
    prisma.glossaryTerm.count({ where: { OR: [{ seoContentStatus: 'pending' }, { seoContentStatus: null }] } }),
    prisma.glossaryTerm.count({ where: { seoContentStatus: 'generating' } }),
    prisma.glossaryTerm.count({ where: { seoContentStatus: 'complete' } }),
    prisma.glossaryTerm.count({ where: { seoContentStatus: 'error' } }),
  ]);

  return { total, pending, generating, complete, error };
}

/**
 * Generate Explained page content for a glossary term
 */
export async function generateExplainedContent(termId: string): Promise<GenerationResult> {
  // Get the term with related data
  const term = await prisma.glossaryTerm.findUnique({
    where: { id: termId },
    include: {
      keyFigures: {
        include: {
          person: {
            select: {
              canonicalName: true,
              shortBio: true,
            },
          },
        },
      },
      milestoneLinks: {
        include: {
          milestone: {
            select: {
              title: true,
              date: true,
              description: true,
            },
          },
        },
        take: 5,
      },
    },
  });

  if (!term) {
    return { success: false, termId, term: '', error: 'Term not found' };
  }

  // Mark as generating
  await prisma.glossaryTerm.update({
    where: { id: termId },
    data: { seoContentStatus: 'generating' },
  });

  try {
    const client = getAnthropicClient();

    // Build context about the term
    const keyFiguresContext = term.keyFigures.length > 0
      ? `Key people associated with this concept:\n${term.keyFigures.map((kf) => `- ${kf.person.canonicalName}: ${kf.person.shortBio}`).join('\n')}`
      : 'No specific key figures linked to this concept yet.';

    const milestonesContext = term.milestoneLinks.length > 0
      ? `Related milestones:\n${term.milestoneLinks.map((ml) => `- ${ml.milestone.title} (${ml.milestone.date.toISOString().split('T')[0]}): ${ml.milestone.description.slice(0, 200)}...`).join('\n')}`
      : 'No specific milestones linked to this concept yet.';

    const prompt = `You are creating educational SEO content for "Let AI Explain AI", a platform that helps non-technical professionals understand AI.

## Your Task:
Generate comprehensive content about "${term.term}" for our "Explained" page. This content should be educational, accurate, and optimized for search engines.

## Existing Content About This Term:
- Short Definition: ${term.shortDefinition}
- Full Definition: ${term.fullDefinition}
- Category: ${term.category}
${term.businessContext ? `- Business Context: ${term.businessContext}` : ''}
${term.example ? `- Example: ${term.example}` : ''}

## Related Context:
${keyFiguresContext}

${milestonesContext}

## Generate This EXACT JSON Structure:

{
  "historySection": "<2-4 paragraphs about the history and evolution of ${term.term}. Include when it was first developed, key milestones in its evolution, and how it has changed over time. Be specific with dates and names when possible. Target 200-400 words.>",
  "howItWorksSection": "<2-4 paragraphs explaining how ${term.term} works in plain English. Use analogies for complex concepts. Target 200-400 words for a non-technical professional audience.>",
  "faqItems": [
    {
      "question": "<Common question about ${term.term}>",
      "answer": "<Clear, concise answer in 2-4 sentences>"
    },
    {
      "question": "<Another common question>",
      "answer": "<Answer>"
    },
    {
      "question": "<Third common question>",
      "answer": "<Answer>"
    },
    {
      "question": "<Fourth common question>",
      "answer": "<Answer>"
    },
    {
      "question": "<Fifth common question>",
      "answer": "<Answer>"
    }
  ]
}

## Requirements:
1. Content must be factually accurate and educational
2. Write for non-technical professionals (avoid jargon or explain it)
3. History section should include real dates and names when known
4. FAQ questions should be the actual questions people search for
5. All content should be original and not copy from the existing definitions
6. Return ONLY valid JSON, no markdown code blocks`;

    const response = await client.messages.create({
      model: CONTENT_MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text from response
    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse the JSON response
    let content: ExplainedContent;
    try {
      // Clean up the response - remove any markdown code blocks
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      content = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('[SEOContentGenerator] Failed to parse response for', term.term, parseError);
      await prisma.glossaryTerm.update({
        where: { id: termId },
        data: { seoContentStatus: 'error' },
      });
      return { success: false, termId, term: term.term, error: 'Failed to parse AI response' };
    }

    // Validate the content structure
    if (!content.historySection || !content.howItWorksSection || !Array.isArray(content.faqItems)) {
      await prisma.glossaryTerm.update({
        where: { id: termId },
        data: { seoContentStatus: 'error' },
      });
      return { success: false, termId, term: term.term, error: 'Invalid content structure' };
    }

    // Update the term with generated content
    await prisma.glossaryTerm.update({
      where: { id: termId },
      data: {
        historySection: content.historySection,
        howItWorksSection: content.howItWorksSection,
        faqItems: JSON.stringify(content.faqItems),
        seoContentStatus: 'complete',
        seoContentGeneratedAt: new Date(),
      },
    });

    console.log(`[SEOContentGenerator] Generated Explained content for: ${term.term}`);
    return { success: true, termId, term: term.term };
  } catch (error) {
    console.error('[SEOContentGenerator] Error generating content for', term.term, error);
    await prisma.glossaryTerm.update({
      where: { id: termId },
      data: { seoContentStatus: 'error' },
    });
    return {
      success: false,
      termId,
      term: term.term,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate Who Invented quick answer for a glossary term
 */
export async function generateWhoInventedContent(termId: string): Promise<GenerationResult> {
  // Get the term with key figures
  const term = await prisma.glossaryTerm.findUnique({
    where: { id: termId },
    include: {
      keyFigures: {
        include: {
          person: {
            select: {
              canonicalName: true,
              shortBio: true,
            },
          },
        },
      },
      organizationLinks: {
        include: {
          organization: {
            select: {
              name: true,
              shortDescription: true,
            },
          },
        },
      },
      milestoneLinks: {
        include: {
          milestone: {
            select: {
              title: true,
              date: true,
            },
          },
        },
        orderBy: {
          milestone: {
            date: 'asc',
          },
        },
        take: 3,
      },
    },
  });

  if (!term) {
    return { success: false, termId, term: '', error: 'Term not found' };
  }

  // Skip if no key figures
  if (term.keyFigures.length === 0) {
    return { success: false, termId, term: term.term, error: 'No key figures linked to this term' };
  }

  try {
    const client = getAnthropicClient();

    // Build context
    const keyFiguresContext = term.keyFigures.map((kf) =>
      `- ${kf.person.canonicalName} (${kf.contributionNote || 'Contributor'}): ${kf.person.shortBio}`
    ).join('\n');

    const orgsContext = term.organizationLinks.length > 0
      ? `Organizations involved:\n${term.organizationLinks.map((ol) => `- ${ol.organization.name} (${ol.contributionNote || 'Contributor'})`).join('\n')}`
      : '';

    const milestonesContext = term.milestoneLinks.length > 0
      ? `Key milestones:\n${term.milestoneLinks.map((ml) => `- ${ml.milestone.title} (${ml.milestone.date.toISOString().split('T')[0]})`).join('\n')}`
      : '';

    const prompt = `You are creating a quick answer for the question "Who invented ${term.term}?" for a featured snippet in search results.

## Context:
Term: ${term.term}
Definition: ${term.shortDefinition}

Key figures:
${keyFiguresContext}

${orgsContext}

${milestonesContext}

## Generate This EXACT JSON Structure:

{
  "quickAnswer": "<A 50-70 word direct answer to 'Who invented ${term.term}?' that could appear as a featured snippet. Name the key inventor(s) or pioneers, mention the year or time period, and briefly note their contribution. Be specific and factual.>"
}

## Requirements:
1. Start with the name(s) of the inventor(s) or pioneers
2. Include the year or time period when possible
3. Be factually accurate based on the provided context
4. Keep it between 50-70 words
5. Write in a clear, direct style suitable for a featured snippet
6. Return ONLY valid JSON, no markdown code blocks`;

    const response = await client.messages.create({
      model: CONTENT_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text from response
    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse the JSON response
    let content: WhoInventedContent;
    try {
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      content = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('[SEOContentGenerator] Failed to parse Who Invented response for', term.term, parseError);
      return { success: false, termId, term: term.term, error: 'Failed to parse AI response' };
    }

    if (!content.quickAnswer) {
      return { success: false, termId, term: term.term, error: 'Invalid content structure' };
    }

    // Update the term with generated content
    await prisma.glossaryTerm.update({
      where: { id: termId },
      data: {
        whoInventedQuickAnswer: content.quickAnswer,
      },
    });

    console.log(`[SEOContentGenerator] Generated Who Invented content for: ${term.term}`);
    return { success: true, termId, term: term.term };
  } catch (error) {
    console.error('[SEOContentGenerator] Error generating Who Invented content for', term.term, error);
    return {
      success: false,
      termId,
      term: term.term,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Bulk generate Explained content for multiple terms
 */
export async function bulkGenerateExplainedContent(
  termIds: string[],
  onProgress?: (result: GenerationResult) => void
): Promise<{
  total: number;
  success: number;
  failed: number;
  results: GenerationResult[];
}> {
  const results: GenerationResult[] = [];
  let success = 0;
  let failed = 0;

  for (const termId of termIds) {
    const result = await generateExplainedContent(termId);
    results.push(result);

    if (result.success) {
      success++;
    } else {
      failed++;
    }

    if (onProgress) {
      onProgress(result);
    }

    // Small delay between API calls to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return {
    total: termIds.length,
    success,
    failed,
    results,
  };
}

/**
 * Bulk generate Who Invented content for terms with key figures
 */
export async function bulkGenerateWhoInventedContent(
  termIds: string[],
  onProgress?: (result: GenerationResult) => void
): Promise<{
  total: number;
  success: number;
  failed: number;
  skipped: number;
  results: GenerationResult[];
}> {
  const results: GenerationResult[] = [];
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const termId of termIds) {
    const result = await generateWhoInventedContent(termId);
    results.push(result);

    if (result.success) {
      success++;
    } else if (result.error === 'No key figures linked to this term') {
      skipped++;
    } else {
      failed++;
    }

    if (onProgress) {
      onProgress(result);
    }

    // Small delay between API calls to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    total: termIds.length,
    success,
    failed,
    skipped,
    results,
  };
}

/**
 * Reset a term's SEO content status to pending (for regeneration)
 */
export async function resetTermStatus(termId: string): Promise<void> {
  await prisma.glossaryTerm.update({
    where: { id: termId },
    data: {
      seoContentStatus: 'pending',
      historySection: null,
      howItWorksSection: null,
      faqItems: '[]',
      whoInventedQuickAnswer: null,
      seoContentGeneratedAt: null,
    },
  });
}

/**
 * Get a term's generated content for preview/editing
 */
export async function getTermContent(termId: string): Promise<{
  id: string;
  term: string;
  slug: string | null;
  historySection: string | null;
  howItWorksSection: string | null;
  faqItems: Array<{ question: string; answer: string }>;
  whoInventedQuickAnswer: string | null;
  seoContentStatus: string;
  seoContentGeneratedAt: Date | null;
} | null> {
  const term = await prisma.glossaryTerm.findUnique({
    where: { id: termId },
    select: {
      id: true,
      term: true,
      slug: true,
      historySection: true,
      howItWorksSection: true,
      faqItems: true,
      whoInventedQuickAnswer: true,
      seoContentStatus: true,
      seoContentGeneratedAt: true,
    },
  });

  if (!term) return null;

  return {
    ...term,
    faqItems: term.faqItems ? JSON.parse(term.faqItems as string) : [],
  };
}

/**
 * Update a term's generated content (for editing)
 */
export async function updateTermContent(
  termId: string,
  data: {
    historySection?: string;
    howItWorksSection?: string;
    faqItems?: Array<{ question: string; answer: string }>;
    whoInventedQuickAnswer?: string;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (data.historySection !== undefined) {
    updateData.historySection = data.historySection;
  }
  if (data.howItWorksSection !== undefined) {
    updateData.howItWorksSection = data.howItWorksSection;
  }
  if (data.faqItems !== undefined) {
    updateData.faqItems = JSON.stringify(data.faqItems);
  }
  if (data.whoInventedQuickAnswer !== undefined) {
    updateData.whoInventedQuickAnswer = data.whoInventedQuickAnswer;
  }

  await prisma.glossaryTerm.update({
    where: { id: termId },
    data: updateData,
  });
}
