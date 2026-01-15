/**
 * Stage 1.5: Subject Classification Service
 * Sprint Subj-2 - Pipeline Integration
 *
 * Classifies ingested articles by subject using AI.
 * Runs after screening (Stage 1) and before content generation (Stage 2).
 * Uses Claude Haiku for fast, cost-efficient classification.
 * Includes error handling and retry logic.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../db';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Log a classification error to the IngestionError table
 */
async function logClassificationError(
  articleId: string | null,
  error: Error,
  retryCount: number
): Promise<void> {
  try {
    await prisma.ingestionError.create({
      data: {
        errorType: 'classification',
        articleId,
        message: `Subject classification failed: ${error.message}`,
        stackTrace: error.stack,
        retryCount,
        maxRetries: MAX_RETRIES,
        resolved: false,
      },
    });
  } catch (logError) {
    console.error('[SubjectClassifier] Failed to log error:', logError);
  }
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Subject classification result
 */
export interface SubjectClassification {
  subjectId: string;
  subjectSlug: string;
  confidence: number; // 0-1
  isPrimary: boolean;
}

/**
 * Cached subject for prompt building
 */
interface CachedSubject {
  id: string;
  slug: string;
  name: string;
  path: string;
  level: number;
  parentId: string | null;
}

// Cache for taxonomy data
let taxonomyCache: CachedSubject[] | null = null;
let taxonomyCacheTime: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load taxonomy into memory (cached)
 */
async function loadTaxonomy(): Promise<CachedSubject[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (taxonomyCache && now - taxonomyCacheTime < CACHE_TTL_MS) {
    return taxonomyCache;
  }

  console.log('[SubjectClassifier] Loading taxonomy from database');

  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      path: true,
      level: true,
      parentId: true,
    },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
  });

  taxonomyCache = subjects;
  taxonomyCacheTime = now;

  console.log(`[SubjectClassifier] Cached ${subjects.length} subjects`);

  return subjects;
}

/**
 * Clear the taxonomy cache (call after taxonomy changes)
 */
export function clearTaxonomyCache(): void {
  taxonomyCache = null;
  taxonomyCacheTime = 0;
}

/**
 * Format taxonomy for the classification prompt
 * Organizes by domain with indentation for hierarchy
 */
function formatTaxonomyForPrompt(subjects: CachedSubject[]): string {
  const lines: string[] = [];

  // Group by domain
  const domains = subjects.filter((s) => s.level === 0);

  for (const domain of domains) {
    lines.push(`${domain.slug}: ${domain.name}`);

    // Get categories for this domain
    const categories = subjects.filter((s) => s.level === 1 && s.parentId === domain.id);

    for (const category of categories) {
      lines.push(`  ${category.slug}: ${category.name}`);

      // Get subcategories for this category
      const subcategories = subjects.filter((s) => s.level === 2 && s.parentId === category.id);

      for (const subcategory of subcategories) {
        lines.push(`    ${subcategory.slug}: ${subcategory.name}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Build the classification prompt
 */
function buildClassificationPrompt(
  article: { title: string; content: string; publishedAt?: Date },
  taxonomyText: string
): string {
  const publishedDate = article.publishedAt
    ? article.publishedAt.toISOString().split('T')[0]
    : 'Unknown';

  return `You are classifying an AI-related article into subject categories for an educational platform.

TAXONOMY (hierarchical - assign at the most specific applicable level):
${taxonomyText}

ARTICLE:
Title: ${article.title}
Published: ${publishedDate}
Content: ${article.content.slice(0, 3000)}

INSTRUCTIONS:
1. Identify 1-4 subjects that best describe this article's topics
2. Assign confidence scores (0.0-1.0) based on how central each subject is to the article
3. Mark exactly ONE subject as primary (the most central topic)
4. Prefer more specific subcategories (level 2) over broad domains (level 0) when applicable
5. Only include subjects with confidence >= 0.5
6. Use the exact slug values from the taxonomy above

Return ONLY valid JSON (no markdown, no explanation):
{
  "subjects": [
    {"slug": "science-cs-nlp", "confidence": 0.95, "isPrimary": true},
    {"slug": "business-technology-software", "confidence": 0.7, "isPrimary": false}
  ],
  "reasoning": "Brief explanation of classification"
}`;
}

/**
 * Parse and validate the AI classification response
 */
function parseClassificationResponse(
  responseText: string,
  subjects: CachedSubject[]
): SubjectClassification[] {
  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn('[SubjectClassifier] No JSON found in response');
    return [];
  }

  let parsed: { subjects?: Array<{ slug: string; confidence: number; isPrimary: boolean }>; reasoning?: string };

  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.warn('[SubjectClassifier] Failed to parse JSON:', e);
    return [];
  }

  if (!Array.isArray(parsed.subjects)) {
    console.warn('[SubjectClassifier] No subjects array in response');
    return [];
  }

  // Create slug->id lookup
  const slugToId = new Map(subjects.map((s) => [s.slug, s.id]));

  const classifications: SubjectClassification[] = [];
  let hasPrimary = false;

  for (const item of parsed.subjects) {
    // Validate slug exists
    const subjectId = slugToId.get(item.slug);
    if (!subjectId) {
      console.warn(`[SubjectClassifier] Unknown subject slug: ${item.slug}`);
      continue;
    }

    // Validate confidence
    const confidence = Number(item.confidence);
    if (isNaN(confidence) || confidence < 0.5) {
      continue; // Skip low-confidence subjects
    }

    classifications.push({
      subjectId,
      subjectSlug: item.slug,
      confidence: Math.min(1, Math.max(0, confidence)),
      isPrimary: Boolean(item.isPrimary),
    });

    if (item.isPrimary) {
      hasPrimary = true;
    }
  }

  // Ensure exactly one primary subject
  if (classifications.length > 0 && !hasPrimary) {
    // Mark the highest confidence subject as primary
    classifications.sort((a, b) => b.confidence - a.confidence);
    classifications[0].isPrimary = true;
  } else if (classifications.length > 0) {
    // Ensure only one is primary
    let foundPrimary = false;
    for (const c of classifications) {
      if (c.isPrimary) {
        if (foundPrimary) {
          c.isPrimary = false;
        } else {
          foundPrimary = true;
        }
      }
    }
  }

  return classifications;
}

/**
 * Classify an article by subject with retry logic
 *
 * @param article - The article to classify
 * @param anthropicApiKey - The API key for Claude
 * @param articleId - Optional article ID for error logging
 * @returns Array of subject classifications
 */
export async function classifyArticle(
  article: { title: string; content: string; publishedAt?: Date },
  anthropicApiKey: string,
  articleId?: string
): Promise<SubjectClassification[]> {
  // Load taxonomy
  const subjects = await loadTaxonomy();

  if (subjects.length === 0) {
    console.warn('[SubjectClassifier] No subjects in taxonomy, skipping classification');
    return [];
  }

  // Build prompt
  const taxonomyText = formatTaxonomyForPrompt(subjects);
  const prompt = buildClassificationPrompt(article, taxonomyText);

  // Retry loop
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Call Claude Haiku
      const client = new Anthropic({ apiKey: anthropicApiKey });

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

      // Parse response
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const classifications = parseClassificationResponse(text, subjects);

      console.log(
        `[SubjectClassifier] Classified article: ${classifications.length} subjects, ` +
          `primary=${classifications.find((c) => c.isPrimary)?.subjectSlug || 'none'}`
      );

      return classifications;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[SubjectClassifier] Classification attempt ${attempt + 1}/${MAX_RETRIES} failed:`,
        lastError.message
      );

      if (attempt < MAX_RETRIES - 1) {
        // Exponential backoff
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }

  // All retries exhausted - log error and return empty (non-fatal)
  if (lastError) {
    console.error('[SubjectClassifier] All retries exhausted, logging error');
    await logClassificationError(articleId || null, lastError, MAX_RETRIES);
  }

  return [];
}

/**
 * Classify an article by ID and store results in database
 *
 * @param articleId - The article ID to classify
 * @param anthropicApiKey - The API key for Claude
 * @returns The classification results
 */
export async function classifyArticleById(
  articleId: string,
  anthropicApiKey: string
): Promise<SubjectClassification[]> {
  const article = await prisma.ingestedArticle.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      content: true,
      publishedAt: true,
    },
  });

  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  const classifications = await classifyArticle(
    {
      title: article.title,
      content: article.content,
      publishedAt: article.publishedAt,
    },
    anthropicApiKey,
    articleId // Pass for error logging
  );

  // Store results in database
  await prisma.ingestedArticle.update({
    where: { id: articleId },
    data: {
      classifiedSubjects: classifications,
      subjectClassifiedAt: new Date(),
    },
  });

  console.log(`[SubjectClassifier] Stored ${classifications.length} subjects for article ${articleId}`);

  return classifications;
}

/**
 * Re-classify an existing article (for manual re-runs or taxonomy updates)
 */
export async function reclassifyArticle(
  articleId: string,
  anthropicApiKey: string
): Promise<SubjectClassification[]> {
  // Clear cache to ensure fresh taxonomy
  clearTaxonomyCache();

  return classifyArticleById(articleId, anthropicApiKey);
}

/**
 * Classify arbitrary text by subject
 * Used for backfill scripts and non-article content
 *
 * @param text - The text to classify (title + description, or any content)
 * @param anthropicApiKey - The API key for Claude
 * @returns Array of subject classifications
 */
export async function classifyText(
  text: string,
  anthropicApiKey: string
): Promise<SubjectClassification[]> {
  // Create a pseudo-article for classification
  const pseudoArticle = {
    title: text.split('\n')[0] || 'Untitled',
    content: text,
  };

  return classifyArticle(pseudoArticle, anthropicApiKey);
}

/**
 * SubjectClassifier class wrapper
 * Provides an OOP interface for the classification functions
 * Used by backfill scripts and other services
 */
export class SubjectClassifier {
  private apiKey: string;
  private initialized: boolean = false;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
  }

  /**
   * Initialize the classifier (loads API key, caches taxonomy)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Try to get API key from environment or SSM
    if (!this.apiKey) {
      // In Lambda, API key comes from environment (set by SSM)
      this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    }

    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not available');
    }

    // Pre-load taxonomy
    await loadTaxonomy();
    this.initialized = true;
  }

  /**
   * Classify arbitrary text
   */
  async classifyText(text: string): Promise<SubjectClassification[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return classifyText(text, this.apiKey);
  }

  /**
   * Classify an article object
   */
  async classifyArticle(article: {
    title: string;
    content: string;
    publishedAt?: Date;
  }): Promise<SubjectClassification[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return classifyArticle(article, this.apiKey);
  }

  /**
   * Clear the taxonomy cache
   */
  clearCache(): void {
    clearTaxonomyCache();
  }
}
