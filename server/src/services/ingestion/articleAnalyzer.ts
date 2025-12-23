/**
 * Article Analyzer - Orchestration Service
 *
 * Coordinates the 4-stage AI analysis pipeline:
 * - Stage 1: Screening (Haiku) - Relevance and milestone determination
 * - Stage 2: Content Generation (Sonnet) - Full content for milestone-worthy articles
 * - Stage 3: Glossary Extraction (Haiku) - New AI terminology
 * - Stage 4: Key Figure Extraction (Haiku) - Notable people mentioned (Sprint 46)
 *
 * Includes retry logic for transient failures (Sprint 32.11)
 */

import { prisma } from '../../db';
import { screenArticle, ScreeningResult } from './screening';
import { generateContent, ContentGenerationResult } from './contentGenerator';
import { extractGlossaryTerms, GlossaryTermDraft } from './glossaryExtractor';
import {
  extractKeyFigures,
  processExtractedFigures,
  type ProcessingResult as KeyFigureProcessingResult,
} from './keyFigureExtractor';
import { withRetry, resolveArticleErrors } from '../errorTracker';

// Import schemas for validation
import {
  CreateMilestoneDtoSchema,
} from '../../../../src/types/milestone';
import { CurrentEventSchema } from '../../../../src/types/currentEvent';
import { GlossaryEntrySchema } from '../../../../src/types/glossary';

export interface AnalysisResult {
  screening: ScreeningResult;
  contentGeneration?: ContentGenerationResult;
  glossaryTerms: GlossaryTermDraft[];
  keyFigures?: KeyFigureProcessingResult;
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
      source: article.source?.name || 'Manual Submission',
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
        source: article.source?.name || 'Manual Submission',
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
          // Native PostgreSQL Json type - pass object directly (no JSON.stringify needed)
          draftData: contentGeneration.milestone,
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
          // Native PostgreSQL Json type - pass object directly (no JSON.stringify needed)
          draftData: contentGeneration.newsEvent,
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

  // Stage 3: Glossary Terms - Always run for relevant articles (Sprint 43 refactor)
  // Removed hasNewGlossaryTerms gate - now runs for milestone-worthy or high-relevance articles
  let glossaryTerms: GlossaryTermDraft[] = [];
  if (screening.isMilestoneWorthy || screening.relevanceScore >= 0.6) {
    console.log(`[Analyzer] Stage 3: Extracting glossary terms`);

    // Get existing glossary terms for deduplication
    const existingTerms = await getExistingGlossaryTerms();

    // Also get pending glossary drafts to avoid duplicates in queue
    const pendingDrafts = await getPendingGlossaryDrafts();
    const allExistingTerms = [...existingTerms, ...pendingDrafts];

    console.log(`[Analyzer] Deduplicating against ${existingTerms.length} published + ${pendingDrafts.length} pending terms`);

    glossaryTerms = await extractGlossaryTerms(
      {
        title: article.title,
        content: article.content,
      },
      allExistingTerms,
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
          // Native PostgreSQL Json type - pass object directly (no JSON.stringify needed)
          draftData: term,
          isValid: validation.success,
          validationErrors: validation.success ? null : JSON.stringify(validation.error.errors),
        },
      });
      draftsCreated++;
    }
  }

  // Stage 4: Key Figure Extraction (Sprint 46)
  // Extract notable people mentioned in milestone-worthy or high-relevance articles
  let keyFigureResult: KeyFigureProcessingResult | undefined;
  if (screening.isMilestoneWorthy || screening.relevanceScore >= 0.6) {
    console.log(`[Analyzer] Stage 4: Extracting key figures`);

    try {
      // Extract key figures from article content
      const extractedFigures = await extractKeyFigures(
        {
          title: article.title,
          content: article.content,
        },
        apiKey
      );

      console.log(`[Analyzer] Extracted ${extractedFigures.length} key figures from article`);

      // Process extracted figures - match against existing or create drafts
      if (extractedFigures.length > 0) {
        keyFigureResult = await processExtractedFigures(extractedFigures, {
          id: article.id,
          title: article.title,
        });

        // Add key figure drafts to total count
        draftsCreated += keyFigureResult.draftsCreated;

        console.log(
          `[Analyzer] Key figures processed: ${keyFigureResult.linked} linked, ` +
          `${keyFigureResult.draftsCreated} drafts created, ` +
          `${keyFigureResult.skippedDuplicates} duplicates skipped`
        );

        // Update milestone draft with linked key figure IDs (46.9)
        // These will be used to create MilestoneContributor records on publish
        if (keyFigureResult.linkedKeyFigureIds.length > 0) {
          const milestoneDraft = await prisma.contentDraft.findFirst({
            where: {
              articleId,
              contentType: 'milestone',
              status: 'pending',
            },
          });

          if (milestoneDraft) {
            const existingData = milestoneDraft.draftData as Record<string, unknown>;
            await prisma.contentDraft.update({
              where: { id: milestoneDraft.id },
              data: {
                draftData: {
                  ...existingData,
                  keyFigureIds: keyFigureResult.linkedKeyFigureIds,
                },
              },
            });
            console.log(
              `[Analyzer] Updated milestone draft with ${keyFigureResult.linkedKeyFigureIds.length} key figure IDs`
            );
          }
        }
      }
    } catch (keyFigureError) {
      // Log error but don't fail the entire analysis pipeline
      console.error(`[Analyzer] Key figure extraction error (non-fatal):`, keyFigureError);
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
    keyFigures: keyFigureResult,
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
 * Get existing glossary terms from database for deduplication
 */
async function getExistingGlossaryTerms(): Promise<string[]> {
  try {
    const terms = await prisma.glossaryTerm.findMany({
      select: { term: true },
    });
    return terms.map((t) => t.term);
  } catch (error) {
    console.error('[Analyzer] Failed to load glossary terms:', error);
    return [];
  }
}

/**
 * Get pending glossary drafts to avoid creating duplicates in the review queue
 * Sprint 43: Added to prevent duplicate drafts
 */
async function getPendingGlossaryDrafts(): Promise<string[]> {
  try {
    const drafts = await prisma.contentDraft.findMany({
      where: {
        contentType: 'glossary_term',
        status: 'pending',
      },
      select: { draftData: true },
    });

    return drafts
      .map((d) => {
        const data = d.draftData as { term?: string };
        return data.term;
      })
      .filter((term): term is string => !!term);
  } catch (error) {
    console.error('[Analyzer] Failed to load pending glossary drafts:', error);
    return [];
  }
}
