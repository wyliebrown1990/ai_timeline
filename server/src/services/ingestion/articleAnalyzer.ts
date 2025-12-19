/**
 * Article Analyzer - Orchestration Service
 *
 * Coordinates the 3-stage AI analysis pipeline:
 * - Stage 1: Screening (Haiku) - Relevance and milestone determination
 * - Stage 2: Content Generation (Sonnet) - Full content for milestone-worthy articles
 * - Stage 3: Glossary Extraction (Haiku) - New AI terminology
 *
 * Includes retry logic for transient failures (Sprint 32.11)
 */

import { prisma } from '../../db';
import { screenArticle, ScreeningResult } from './screening';
import { generateContent, ContentGenerationResult } from './contentGenerator';
import { extractGlossaryTerms, GlossaryTermDraft } from './glossaryExtractor';
import { withRetry, resolveArticleErrors } from '../errorTracker';

// Import schemas for validation
import {
  CreateMilestoneDtoSchema,
} from '../../../../src/types/milestone';
import { CurrentEventSchema } from '../../../../src/types/currentEvent';
import { GlossaryEntrySchema } from '../../../../src/types/glossary';

// Load existing glossary terms for deduplication
import glossaryTermsData from '../../../../src/content/glossary/terms.json';

export interface AnalysisResult {
  screening: ScreeningResult;
  contentGeneration?: ContentGenerationResult;
  glossaryTerms: GlossaryTermDraft[];
  draftsCreated: number;
}

/**
 * Internal analysis function (called by withRetry wrapper)
 */
async function analyzeArticleInternal(articleId: string, apiKey: string): Promise<AnalysisResult> {
  const article = await prisma.ingestedArticle.findUnique({
    where: { id: articleId },
    include: { source: true },
  });

  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  let draftsCreated = 0;

  // Update status to screening
  await prisma.ingestedArticle.update({
    where: { id: articleId },
    data: { analysisStatus: 'screening' },
  });

  console.log(`[Analyzer] Stage 1: Screening article "${article.title}"`);

  // Stage 1: Screening (Haiku - cheap)
  const screening = await screenArticle(
    {
      title: article.title,
      content: article.content,
      source: article.source.name,
      publishedAt: article.publishedAt,
    },
    apiKey
  );

  console.log(
    `[Analyzer] Screening complete: relevance=${screening.relevanceScore}, milestone=${screening.isMilestoneWorthy}`
  );

  await prisma.ingestedArticle.update({
    where: { id: articleId },
    data: {
      relevanceScore: screening.relevanceScore,
      isMilestoneWorthy: screening.isMilestoneWorthy,
      milestoneRationale: screening.milestoneRationale,
      analysisStatus: screening.isMilestoneWorthy ? 'generating' : 'complete',
      analyzedAt: screening.isMilestoneWorthy ? undefined : new Date(),
    },
  });

  let contentGeneration: ContentGenerationResult | undefined;

  // Stage 2: Content Generation (Sonnet - only if milestone-worthy)
  if (screening.isMilestoneWorthy && screening.suggestedCategory) {
    console.log(`[Analyzer] Stage 2: Generating content for milestone-worthy article`);

    // Get recent milestones for context
    const recentMilestones = await prisma.milestone.findMany({
      take: 50,
      orderBy: { date: 'desc' },
      select: { id: true, title: true, date: true },
    });

    contentGeneration = await generateContent(
      {
        title: article.title,
        content: article.content,
        sourceUrl: article.externalUrl,
        source: article.source.name,
        publishedAt: article.publishedAt,
      },
      screening.suggestedCategory,
      recentMilestones.map((m) => ({
        id: m.id,
        title: m.title,
        date: m.date.toISOString().split('T')[0],
      })),
      apiKey
    );

    // Validate and save milestone draft
    if (contentGeneration.milestone) {
      const milestoneValidation = CreateMilestoneDtoSchema.safeParse(contentGeneration.milestone);
      await prisma.contentDraft.create({
        data: {
          articleId,
          contentType: 'milestone',
          draftData: JSON.stringify(contentGeneration.milestone),
          isValid: milestoneValidation.success,
          validationErrors: milestoneValidation.success
            ? null
            : JSON.stringify(milestoneValidation.error.errors),
        },
      });
      draftsCreated++;
      console.log(`[Analyzer] Created milestone draft (valid=${milestoneValidation.success})`);
    }

    // Validate and save news event draft
    if (contentGeneration.newsEvent) {
      const eventData = {
        ...contentGeneration.newsEvent,
        id: `evt_${Date.now()}`, // Generate ID
      };
      const eventValidation = CurrentEventSchema.safeParse(eventData);
      await prisma.contentDraft.create({
        data: {
          articleId,
          contentType: 'news_event',
          draftData: JSON.stringify(contentGeneration.newsEvent),
          isValid: eventValidation.success,
          validationErrors: eventValidation.success
            ? null
            : JSON.stringify(eventValidation.error.errors),
        },
      });
      draftsCreated++;
      console.log(`[Analyzer] Created news event draft (valid=${eventValidation.success})`);
    }
  }

  // Stage 3: Glossary Terms (Haiku - if indicated)
  let glossaryTerms: GlossaryTermDraft[] = [];
  if (screening.hasNewGlossaryTerms) {
    console.log(`[Analyzer] Stage 3: Extracting glossary terms`);

    // Get existing glossary terms for deduplication
    const existingTerms = getExistingGlossaryTerms();

    glossaryTerms = await extractGlossaryTerms(
      {
        title: article.title,
        content: article.content,
      },
      existingTerms,
      apiKey
    );

    console.log(`[Analyzer] Found ${glossaryTerms.length} new glossary terms`);

    // Save each term as a draft
    for (const term of glossaryTerms) {
      const validation = GlossaryEntrySchema.safeParse(term);
      await prisma.contentDraft.create({
        data: {
          articleId,
          contentType: 'glossary_term',
          draftData: JSON.stringify(term),
          isValid: validation.success,
          validationErrors: validation.success ? null : JSON.stringify(validation.error.errors),
        },
      });
      draftsCreated++;
    }
  }

  // Mark complete
  await prisma.ingestedArticle.update({
    where: { id: articleId },
    data: {
      analysisStatus: 'complete',
      analyzedAt: new Date(),
    },
  });

  console.log(`[Analyzer] Analysis complete. Created ${draftsCreated} drafts.`);

  return {
    screening,
    contentGeneration,
    glossaryTerms,
    draftsCreated,
  };
}

/**
 * Analyze a single article through the full pipeline with retry logic
 */
export async function analyzeArticle(articleId: string): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  try {
    // Use retry wrapper for transient failures (API rate limits, timeouts, etc.)
    const result = await withRetry(
      () => analyzeArticleInternal(articleId, apiKey),
      {
        errorType: 'analysis',
        articleId,
        maxRetries: 3,
        initialDelayMs: 5000, // Start with 5 second delay for API calls
        onRetry: (attempt, error) => {
          console.log(`[Analyzer] Retry ${attempt} for article ${articleId}: ${error.message}`);
        },
      }
    );

    // Resolve any previous errors on success
    await resolveArticleErrors(articleId);

    return result;
  } catch (error) {
    console.error(`[Analyzer] Error analyzing article ${articleId}:`, error);

    // Update article status to error
    await prisma.ingestedArticle.update({
      where: { id: articleId },
      data: {
        analysisStatus: 'error',
        analysisError: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

/**
 * Analyze all pending articles (with limit)
 */
export async function analyzeAllPending(limit: number = 10): Promise<{
  analyzed: number;
  errors: number;
  results: Array<{ articleId: string; success: boolean; error?: string }>;
}> {
  const pendingArticles = await prisma.ingestedArticle.findMany({
    where: { analysisStatus: 'pending' },
    take: limit,
    orderBy: { ingestedAt: 'asc' },
    select: { id: true, title: true },
  });

  console.log(`[Analyzer] Found ${pendingArticles.length} pending articles to analyze`);

  const results: Array<{ articleId: string; success: boolean; error?: string }> = [];
  let analyzed = 0;
  let errors = 0;

  for (const article of pendingArticles) {
    try {
      console.log(`[Analyzer] Analyzing article: "${article.title}"`);
      await analyzeArticle(article.id);
      results.push({ articleId: article.id, success: true });
      analyzed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ articleId: article.id, success: false, error: errorMessage });
      errors++;
    }
  }

  return { analyzed, errors, results };
}

/**
 * Get existing glossary terms for deduplication
 */
function getExistingGlossaryTerms(): string[] {
  try {
    // glossaryTermsData is imported at the top from the JSON file
    if (Array.isArray(glossaryTermsData)) {
      return glossaryTermsData.map((t: { term: string }) => t.term);
    }
    return [];
  } catch (error) {
    console.error('[Analyzer] Failed to load glossary terms:', error);
    return [];
  }
}
