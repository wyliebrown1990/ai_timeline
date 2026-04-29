/**
 * Article Analyzer - Orchestration Service
 *
 * Coordinates the 6-stage AI analysis pipeline:
 * - Stage 1: Screening (Haiku) - Relevance and milestone determination
 * - Stage 1.5: Subject Classification (Haiku) - Classify by subject taxonomy (Sprint Subj-2)
 * - Stage 2: Content Generation (Sonnet) - Full content for milestone-worthy articles
 * - Stage 3: Glossary Extraction (Haiku) - New AI terminology
 * - Stage 4: Key Figure Extraction (Haiku) - Notable people mentioned (Sprint 46)
 * - Stage 5: Entity Extraction (Haiku) - Person/Org detection for KPC system (Sprint KPC-4)
 *
 * Includes retry logic for transient failures (Sprint 32.11)
 */

import { prisma } from '../../db';
import { screenArticle, ScreeningResult } from './screening';
import { generateContent, ContentGenerationResult } from './contentGenerator';
import { generateNewsEventOnly, NewsEventOnlyDraft } from './newsEventGenerator';
import { extractGlossaryTerms, GlossaryTermDraft } from './glossaryExtractor';
import {
  extractKeyFigures,
  processExtractedFigures,
  type ProcessingResult as KeyFigureProcessingResult,
} from './keyFigureExtractor';
import {
  extractEntities,
  type EntityExtractionResult,
  type ExtractedPerson,
} from './entityExtraction';
import {
  classifyArticle as classifyArticleSubjects,
  type SubjectClassification,
} from './subjectClassifier';
import { matchPerson } from '../entityMatcher';
import { withRetry, resolveArticleErrors } from '../errorTracker';
import { publishNewsEvent } from '../publishing/newsPublisher';

// Import schemas for validation
import {
  CreateMilestoneDtoSchema,
} from '../../../../src/types/milestone';
import { CurrentEventSchema } from '../../../../src/types/currentEvent';
import { GlossaryEntrySchema } from '../../../../src/types/glossary';

/**
 * Extract YouTube video ID from a URL
 * Supports: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 */
function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  // Match youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // Match youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Match youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * Generate YouTube thumbnail URL from video ID
 * Uses maxresdefault with fallback to hqdefault
 */
function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Sources whose news_event drafts are auto-approved (case-insensitive match)
const AUTO_APPROVE_NEWS_EVENT_SOURCES = ['the neuron'];

/**
 * Check if an article source should have its news events auto-approved
 */
function shouldAutoApproveNewsEvent(sourceName: string | undefined): boolean {
  if (!sourceName) return false;
  return AUTO_APPROVE_NEWS_EVENT_SOURCES.some(
    (s) => sourceName.toLowerCase().includes(s)
  );
}

/**
 * Auto-approve and publish a news_event content draft
 * Used for trusted sources like The Neuron where manual review isn't needed
 */
async function autoApproveNewsEventDraft(draftId: string): Promise<void> {
  const draft = await prisma.contentDraft.findUnique({
    where: { id: draftId },
  });

  if (!draft || draft.status !== 'pending' || draft.contentType !== 'news_event') {
    return;
  }

  const draftData = draft.draftData as Record<string, unknown>;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const publishedId = await publishNewsEvent(draftData as any, {
      sourceArticleId: draft.articleId,
    });

    // Publish ContentSubject records if available
    const suggestedSubjects = draftData.suggestedSubjects as Array<{
      subjectId: string;
      subjectSlug: string;
      confidence: number;
      isPrimary: boolean;
    }> | undefined;

    if (suggestedSubjects && suggestedSubjects.length > 0) {
      for (const subject of suggestedSubjects) {
        const subjectExists = await prisma.subject.findUnique({
          where: { id: subject.subjectId },
          select: { id: true },
        });
        if (subjectExists) {
          await prisma.contentSubject.upsert({
            where: {
              contentType_contentId_subjectId: {
                contentType: 'current_event',
                contentId: publishedId,
                subjectId: subject.subjectId,
              },
            },
            create: {
              contentType: 'current_event',
              contentId: publishedId,
              subjectId: subject.subjectId,
              isPrimary: subject.isPrimary,
              confidence: subject.confidence,
              source: 'auto',
            },
            update: {
              isPrimary: subject.isPrimary,
              confidence: subject.confidence,
            },
          });
        }
      }
    }

    await prisma.contentDraft.update({
      where: { id: draftId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedId,
      },
    });

    console.log(`[Analyzer] Auto-approved news event draft ${draftId} → published as ${publishedId}`);
  } catch (error) {
    console.error(`[Analyzer] Auto-approve failed for draft ${draftId}:`, error);
    // Leave draft as pending so it can still be manually reviewed
  }
}

export interface AnalysisResult {
  screening: ScreeningResult;
  subjectClassification?: SubjectClassification[];
  contentGeneration?: ContentGenerationResult;
  glossaryTerms: GlossaryTermDraft[];
  keyFigures?: KeyFigureProcessingResult;
  entityExtraction?: EntityExtractionResult;
  personDraftsCreated: number;
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
  let screening: ScreeningResult;

  // Check if article was already screened (status = 'screened')
  // If so, skip Stage 1 and use existing screening data
  const alreadyScreened = article.analysisStatus === 'screened' && article.isMilestoneWorthy;

  if (alreadyScreened) {
    console.log(`[Analyzer] Article already screened, skipping to content generation: "${article.title}"`);
    // Reconstruct screening result from stored data
    screening = {
      relevanceScore: article.relevanceScore || 0.8,
      isMilestoneWorthy: true,
      milestoneRationale: article.milestoneRationale || 'Previously screened as milestone-worthy',
      suggestedCategory: null, // Will be determined by content generator
    };

    // Update status to generating
    await prisma.ingestedArticle.update({
      where: { id: articleId },
      data: { analysisStatus: 'generating' },
    });
  } else {
    // Update status to screening
    await prisma.ingestedArticle.update({
      where: { id: articleId },
      data: { analysisStatus: 'screening' },
    });

    console.log(`[Analyzer] Stage 1: Screening article "${article.title}"`);

    // Stage 1: Screening (Haiku - cheap)
    screening = await screenArticle(
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
        // ALL articles continue to 'generating' status - no longer stop non-milestone articles
        analysisStatus: 'generating',
      },
    });
  }

  // Stage 1.5: Subject Classification (Haiku - runs for ALL articles)
  // Even non-milestone-worthy articles get classified for filtering/analytics
  let subjectClassification: SubjectClassification[] = [];
  const existingSubjects = article.classifiedSubjects as SubjectClassification[] | null;
  const hasExistingClassification = Array.isArray(existingSubjects) && existingSubjects.length > 0;

  if (!hasExistingClassification) {
    console.log(`[Analyzer] Stage 1.5: Classifying article by subject`);

    try {
      subjectClassification = await classifyArticleSubjects(
        {
          title: article.title,
          content: article.content,
          publishedAt: article.publishedAt,
        },
        apiKey
      );

      // Store classification results
      await prisma.ingestedArticle.update({
        where: { id: articleId },
        data: {
          classifiedSubjects: subjectClassification,
          subjectClassifiedAt: new Date(),
        },
      });

      console.log(
        `[Analyzer] Subject classification complete: ${subjectClassification.length} subjects assigned`
      );
    } catch (classificationError) {
      // Log error but don't block pipeline - classification is non-critical
      console.error('[Analyzer] Subject classification error (non-fatal):', classificationError);
    }
  } else {
    // Use existing classification
    subjectClassification = existingSubjects!;
    console.log(`[Analyzer] Using existing subject classification: ${subjectClassification.length} subjects`);
  }

  let contentGeneration: ContentGenerationResult | undefined;

  // Stage 2: Content Generation (Sonnet - only if milestone-worthy)
  // For milestone-worthy articles, generate full milestone + news event content
  // Non-milestone articles skip to Stage 2b for news event only
  if (screening.isMilestoneWorthy) {
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
      screening.suggestedCategory || 'research', // Default to 'research' if category unknown
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
      // Include suggested subjects from classification (Sprint Subj-2)
      const milestoneDraftData = {
        ...contentGeneration.milestone,
        suggestedSubjects: subjectClassification,
      };
      await prisma.contentDraft.create({
        data: {
          articleId,
          contentType: 'milestone',
          // Native PostgreSQL Json type - pass object directly (no JSON.stringify needed)
          draftData: milestoneDraftData,
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
      // Enrich with video info if source is YouTube
      const videoId = extractYouTubeVideoId(article.externalUrl);
      const mediaType = videoId ? 'video' : 'text';
      const enrichedNewsEvent = {
        ...contentGeneration.newsEvent,
        mediaType,
        ...(videoId && {
          videoId,
          thumbnailUrl: getYouTubeThumbnailUrl(videoId),
        }),
      };

      const eventData = {
        ...enrichedNewsEvent,
        id: `evt_${Date.now()}`, // Generate ID
      };
      const eventValidation = CurrentEventSchema.safeParse(eventData);
      // Include suggested subjects from classification (Sprint Subj-2)
      const newsEventDraftData = {
        ...enrichedNewsEvent,
        suggestedSubjects: subjectClassification,
      };
      const newsEventDraft = await prisma.contentDraft.create({
        data: {
          articleId,
          contentType: 'news_event',
          // Native PostgreSQL Json type - pass object directly (no JSON.stringify needed)
          draftData: newsEventDraftData,
          isValid: eventValidation.success,
          validationErrors: eventValidation.success
            ? null
            : JSON.stringify(eventValidation.error.errors),
        },
      });
      draftsCreated++;
      console.log(`[Analyzer] Created news event draft (valid=${eventValidation.success}, hasVideo=${!!videoId})`);

      // Auto-approve news events from trusted sources (e.g., The Neuron)
      if (shouldAutoApproveNewsEvent(article.source?.name)) {
        await autoApproveNewsEventDraft(newsEventDraft.id);
      }
    }
  }

  // Stage 2b: News Event Generation for NON-milestone articles
  // ALL articles get processed as news events, regardless of relevance score
  // This ensures every submission creates content for the review queue
  if (!screening.isMilestoneWorthy) {
    console.log(`[Analyzer] Stage 2b: Generating news event for non-milestone article`);

    try {
      // Get recent milestones for context (reuse if already fetched, otherwise fetch)
      const milestonesForContext = await prisma.milestone.findMany({
        take: 50,
        orderBy: { date: 'desc' },
        select: { id: true, title: true, date: true },
      });

      const newsEventDraft = await generateNewsEventOnly(
        {
          title: article.title,
          content: article.content,
          sourceUrl: article.externalUrl,
          source: article.source?.name || 'Manual Submission',
          publishedAt: article.publishedAt,
        },
        milestonesForContext.map((m) => ({
          id: m.id,
          title: m.title,
          date: m.date.toISOString().split('T')[0],
        })),
        apiKey
      );

      // Enrich with video info if source is YouTube
      const videoId = extractYouTubeVideoId(article.externalUrl);
      const mediaType = videoId ? 'video' : 'text';
      const enrichedNewsEvent: NewsEventOnlyDraft = {
        ...newsEventDraft,
        mediaType,
        ...(videoId && {
          videoId,
          thumbnailUrl: getYouTubeThumbnailUrl(videoId),
        }),
      };

      const eventData = {
        ...enrichedNewsEvent,
        id: `evt_${Date.now()}`,
      };
      const eventValidation = CurrentEventSchema.safeParse(eventData);

      // Include suggested subjects from classification
      const newsEventDraftData = {
        ...enrichedNewsEvent,
        suggestedSubjects: subjectClassification,
      };

      const nonMilestoneNewsEventDraft = await prisma.contentDraft.create({
        data: {
          articleId,
          contentType: 'news_event',
          draftData: newsEventDraftData,
          isValid: eventValidation.success,
          validationErrors: eventValidation.success
            ? null
            : JSON.stringify(eventValidation.error.errors),
        },
      });
      draftsCreated++;
      console.log(`[Analyzer] Created news event draft for non-milestone article (valid=${eventValidation.success}, hasVideo=${!!videoId})`);

      // Auto-approve news events from trusted sources (e.g., The Neuron)
      if (eventValidation.success && shouldAutoApproveNewsEvent(article.source?.name)) {
        await autoApproveNewsEventDraft(nonMilestoneNewsEventDraft.id);
      }
    } catch (newsEventError) {
      // Log error but don't fail pipeline - news event generation is non-critical
      console.error(`[Analyzer] News event generation error for non-milestone article (non-fatal):`, newsEventError);
    }
  }

  // Stage 3: Glossary Terms - Run for ALL articles
  // Every article gets glossary extraction to capture new AI terminology
  let glossaryTerms: GlossaryTermDraft[] = [];
  {
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
      // Include suggested subjects from classification (Sprint Subj-2)
      const glossaryDraftData = {
        ...term,
        suggestedSubjects: subjectClassification,
      };
      await prisma.contentDraft.create({
        data: {
          articleId,
          contentType: 'glossary_term',
          // Native PostgreSQL Json type - pass object directly (no JSON.stringify needed)
          draftData: glossaryDraftData,
          isValid: validation.success,
          validationErrors: validation.success ? null : JSON.stringify(validation.error.errors),
        },
      });
      draftsCreated++;
    }
  }

  // Stage 4: Key Figure Extraction (Sprint 46)
  // Extract notable people mentioned in ALL articles
  let keyFigureResult: KeyFigureProcessingResult | undefined;
  {
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

  // Stage 5: Entity Extraction (Sprint KPC-4)
  // Extract persons and organizations for ALL articles
  let entityExtractionResult: EntityExtractionResult | undefined;
  let personDraftsCreated = 0;

  {
    console.log(`[Analyzer] Stage 5: Extracting entities (KPC-4)`);

    try {
      // Extract entities from article content
      entityExtractionResult = await extractEntities(
        {
          title: article.title,
          content: article.content,
        },
        apiKey
      );

      console.log(
        `[Analyzer] Extracted ${entityExtractionResult.persons.length} persons, ` +
        `${entityExtractionResult.organizations.length} organizations`
      );

      // Create PersonDraft records for extracted persons
      if (entityExtractionResult.persons.length > 0) {
        personDraftsCreated = await createPersonDraftsFromExtraction(
          article.id,
          entityExtractionResult.persons
        );
        console.log(`[Analyzer] Created ${personDraftsCreated} person drafts`);
      }

      // Note: Organization drafts will be added in a future sprint
      // For now, log organizations for visibility
      if (entityExtractionResult.organizations.length > 0) {
        console.log(
          `[Analyzer] Organizations detected (not stored yet):`,
          entityExtractionResult.organizations.map((o) => o.name).join(', ')
        );
      }
    } catch (entityError) {
      // Log error but don't fail the entire analysis pipeline
      console.error(`[Analyzer] Entity extraction error (non-fatal):`, entityError);
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

  console.log(`[Analyzer] Analysis complete. Created ${draftsCreated} content drafts, ${personDraftsCreated} person drafts.`);

  return {
    screening,
    subjectClassification,
    contentGeneration,
    glossaryTerms,
    keyFigures: keyFigureResult,
    entityExtraction: entityExtractionResult,
    personDraftsCreated,
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
 * Screen a single article (Stage 1 only - fast, uses Haiku)
 *
 * This is a quick operation that determines if an article is milestone-worthy.
 * If it is, the article is marked as 'screened' for later content generation.
 * Use this for real-time API requests to avoid timeouts.
 */
export async function screenOnly(articleId: string): Promise<{
  relevanceScore: number;
  isMilestoneWorthy: boolean;
  milestoneRationale: string;
  suggestedCategory: string | null;
  status: string;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const article = await prisma.ingestedArticle.findUnique({
    where: { id: articleId },
    include: { source: true },
  });

  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  // Update status to screening
  await prisma.ingestedArticle.update({
    where: { id: articleId },
    data: { analysisStatus: 'screening' },
  });

  console.log(`[Analyzer] Screening article "${article.title}"`);

  // Run screening (Haiku - fast, ~5-10s)
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

  // Determine final status
  // ALL articles go to 'screened' for batch processing to generate news events
  // Screening still captures relevance score for admin visibility
  const finalStatus = 'screened';

  await prisma.ingestedArticle.update({
    where: { id: articleId },
    data: {
      relevanceScore: screening.relevanceScore,
      isMilestoneWorthy: screening.isMilestoneWorthy,
      milestoneRationale: screening.milestoneRationale,
      analysisStatus: finalStatus,
    },
  });

  return {
    ...screening,
    status: finalStatus,
  };
}

/**
 * Analyze all pending and screened articles (with limit)
 *
 * - 'pending' articles: Run full analysis (screening + content generation)
 * - 'screened' articles: Already screened as milestone-worthy, run content generation only
 */
export async function analyzeAllPending(limit: number = 10): Promise<{
  analyzed: number;
  errors: number;
  results: Array<{ articleId: string; success: boolean; error?: string }>;
}> {
  // Get both pending (need full analysis) and screened (need content generation) articles
  const articlesToProcess = await prisma.ingestedArticle.findMany({
    where: {
      analysisStatus: { in: ['pending', 'screened'] },
    },
    take: limit,
    orderBy: { ingestedAt: 'asc' },
    select: { id: true, title: true, analysisStatus: true },
  });

  const pending = articlesToProcess.filter((a) => a.analysisStatus === 'pending').length;
  const screened = articlesToProcess.filter((a) => a.analysisStatus === 'screened').length;
  console.log(`[Analyzer] Found ${pending} pending + ${screened} screened articles to analyze`);

  const results: Array<{ articleId: string; success: boolean; error?: string }> = [];
  let analyzed = 0;
  let errors = 0;

  for (const article of articlesToProcess) {
    try {
      console.log(`[Analyzer] Analyzing article: "${article.title}" (status: ${article.analysisStatus})`);
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

// ============================================================================
// Stage 5: Entity Extraction Helpers (Sprint KPC-4)
// ============================================================================

// Thresholds for PersonDraft fuzzy matching
const PERSON_AUTO_SKIP_THRESHOLD = 0.95; // Skip draft creation - person definitely exists
const PERSON_SUGGESTION_THRESHOLD = 0.80; // Include suggested match in draft

/**
 * Create PersonDraft records from extracted persons
 * Uses fuzzy matching to prevent duplicates and suggest matches
 *
 * @param articleId - The source article ID
 * @param persons - Extracted person entities
 * @returns Number of drafts created
 */
async function createPersonDraftsFromExtraction(
  articleId: string,
  persons: ExtractedPerson[]
): Promise<number> {
  let draftsCreated = 0;
  let skippedAsKnown = 0;

  // Get existing drafts for this article to avoid duplicates
  const existingDrafts = await prisma.personDraft.findMany({
    where: { articleId },
    select: { normalizedName: true },
  });
  const existingDraftNames = new Set(existingDrafts.map((d) => d.normalizedName.toLowerCase()));

  for (const person of persons) {
    const normalizedName = person.name.trim().toLowerCase();

    // Skip if we already have a draft for this name in this article
    if (existingDraftNames.has(normalizedName)) {
      console.log(`[Analyzer] Skipping duplicate draft for: ${person.name}`);
      continue;
    }

    // Use fuzzy matching against existing Person records
    const matchResult = await matchPerson(person.name);

    // If high-confidence match, skip draft creation entirely
    if (matchResult.matched && matchResult.confidence >= PERSON_AUTO_SKIP_THRESHOLD) {
      console.log(
        `[Analyzer] Skipping "${person.name}" - matches existing person ` +
        `"${matchResult.person?.canonicalName}" (${(matchResult.confidence * 100).toFixed(0)}%)`
      );
      skippedAsKnown++;
      continue;
    }

    // Map extracted role to person role enum
    const suggestedRole = mapMentionTypeToRole(person.mentionType, person.role);

    // Determine if we should include a suggested match
    let matchedPersonId: string | null = null;
    let matchConfidence: number | null = null;

    if (matchResult.candidates && matchResult.candidates.length > 0) {
      const topCandidate = matchResult.candidates[0];
      if (topCandidate.confidence >= PERSON_SUGGESTION_THRESHOLD) {
        matchedPersonId = topCandidate.person.id;
        matchConfidence = topCandidate.confidence;
        console.log(
          `[Analyzer] Creating draft for "${person.name}" with suggested match: ` +
          `"${topCandidate.person.canonicalName}" (${(topCandidate.confidence * 100).toFixed(0)}%)`
        );
      }
    }

    try {
      await prisma.personDraft.create({
        data: {
          articleId,
          extractedName: person.name,
          normalizedName: person.name.trim(),
          context: person.context.substring(0, 500),
          suggestedOrg: person.organization || null,
          suggestedRole: suggestedRole,
          matchedPersonId,
          matchConfidence,
          status: 'pending',
        },
      });

      existingDraftNames.add(normalizedName);
      draftsCreated++;
    } catch (createError) {
      // Log but continue - might be a race condition duplicate
      console.error(`[Analyzer] Failed to create person draft for ${person.name}:`, createError);
    }
  }

  if (skippedAsKnown > 0) {
    console.log(`[Analyzer] Skipped ${skippedAsKnown} persons as known entities`);
  }

  return draftsCreated;
}

/**
 * Map extracted mention type and role to a person role
 */
function mapMentionTypeToRole(
  mentionType: 'subject' | 'quoted' | 'mentioned',
  role?: string
): string {
  // If we have an explicit role from extraction, use it
  if (role) {
    return role;
  }

  // Default based on mention type
  switch (mentionType) {
    case 'subject':
      return 'executive'; // Main subjects are often executives/leaders
    case 'quoted':
      return 'researcher'; // Quoted sources are often experts/researchers
    default:
      return 'other';
  }
}
