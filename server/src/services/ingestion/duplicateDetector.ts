/**
 * Duplicate Detector - Cross-Source Duplicate Detection (Sprint 32.2)
 *
 * Detects duplicate articles across different news sources using:
 * 1. Title similarity (Levenshtein distance)
 * 2. URL matching (same external URLs referenced)
 * 3. AI-assisted content matching for ambiguous cases (Haiku)
 */

import { prisma } from '../../db';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Duplicate match result
 */
export interface DuplicateMatch {
  articleId: string;
  duplicateOfId: string;
  score: number;
  reason: 'title_match' | 'content_match' | 'url_match';
}

/**
 * Article data for comparison
 */
interface ArticleForComparison {
  id: string;
  sourceId: string;
  title: string;
  content: string;
  publishedAt: Date;
  externalUrl: string;
}

/**
 * Similarity check result
 */
interface SimilarityResult {
  isDuplicate: boolean;
  score: number;
  reason: 'title_match' | 'content_match' | 'url_match';
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed to transform one string into another
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create a 2D array to store distances
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0-1)
 * 1 = identical, 0 = completely different
 */
export function calculateTitleSimilarity(title1: string, title2: string): number {
  // Normalize titles: lowercase, remove extra whitespace
  const norm1 = title1.toLowerCase().trim().replace(/\s+/g, ' ');
  const norm2 = title2.toLowerCase().trim().replace(/\s+/g, ' ');

  if (norm1 === norm2) return 1;
  if (norm1.length === 0 || norm2.length === 0) return 0;

  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);

  return 1 - distance / maxLength;
}

/**
 * Extract URLs from article content
 */
function extractUrls(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = content.match(urlRegex) || [];
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Check if two articles share any external URLs
 */
function hasSharedUrls(content1: string, content2: string): boolean {
  const urls1 = new Set(extractUrls(content1));
  const urls2 = extractUrls(content2);

  for (const url of urls2) {
    if (urls1.has(url)) return true;
  }
  return false;
}

/**
 * Use Haiku to determine if two articles describe the same event
 * Only called for ambiguous cases (50-80% title similarity)
 */
async function checkContentSimilarityWithAI(
  articleA: ArticleForComparison,
  articleB: ArticleForComparison,
  apiKey: string
): Promise<{ isSameEvent: boolean; confidence: number; reason: string }> {
  const client = new Anthropic({ apiKey });

  const prompt = `Compare these two news articles and determine if they describe the SAME news event.

Article A:
Title: ${articleA.title}
Published: ${articleA.publishedAt.toISOString().split('T')[0]}
Content: ${articleA.content.slice(0, 1500)}

Article B:
Title: ${articleB.title}
Published: ${articleB.publishedAt.toISOString().split('T')[0]}
Content: ${articleB.content.slice(0, 1500)}

Return JSON only:
{
  "isSameEvent": <true if both articles describe the same news event>,
  "confidence": <0.0-1.0>,
  "reason": "<brief explanation>"
}

Note: Different sources may use different headlines for the same story.
Focus on: Is this the SAME news event being reported?`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        isSameEvent: result.isSameEvent === true,
        confidence: typeof result.confidence === 'number' ? result.confidence : 0,
        reason: result.reason || 'AI analysis',
      };
    }
  } catch (error) {
    console.error('[DuplicateDetector] AI comparison failed:', error);
  }

  // Default to not a duplicate if AI check fails
  return { isSameEvent: false, confidence: 0, reason: 'AI check failed' };
}

/**
 * Compare two articles for similarity
 */
async function compareArticles(
  articleA: ArticleForComparison,
  articleB: ArticleForComparison,
  apiKey?: string
): Promise<SimilarityResult> {
  // 1. Check title similarity
  const titleSimilarity = calculateTitleSimilarity(articleA.title, articleB.title);

  // High similarity (>80%) - definitely a duplicate
  if (titleSimilarity >= 0.8) {
    return { isDuplicate: true, score: titleSimilarity, reason: 'title_match' };
  }

  // 2. Check for shared URLs
  if (hasSharedUrls(articleA.content, articleB.content)) {
    return { isDuplicate: true, score: 0.9, reason: 'url_match' };
  }

  // 3. Ambiguous zone (50-80%) - use AI for content comparison
  if (titleSimilarity >= 0.5 && apiKey) {
    const aiResult = await checkContentSimilarityWithAI(articleA, articleB, apiKey);
    if (aiResult.isSameEvent && aiResult.confidence >= 0.7) {
      return { isDuplicate: true, score: aiResult.confidence, reason: 'content_match' };
    }
  }

  // Not a duplicate
  return { isDuplicate: false, score: titleSimilarity, reason: 'title_match' };
}

/**
 * Group articles by source
 */
function groupBySource(articles: ArticleForComparison[]): Map<string, ArticleForComparison[]> {
  const groups = new Map<string, ArticleForComparison[]>();

  for (const article of articles) {
    const existing = groups.get(article.sourceId) || [];
    existing.push(article);
    groups.set(article.sourceId, existing);
  }

  return groups;
}

/**
 * Detect duplicates in articles from the last ingestion batch
 *
 * Algorithm:
 * 1. Fetch all articles from the batch period (default: last 24 hours)
 * 2. Group by source (articles from same source can't be duplicates of each other)
 * 3. Compare across sources using title similarity, URL matching, and AI
 * 4. Mark the LATER article as duplicate, pointing to the earlier one
 */
export async function detectDuplicates(batchDate: Date): Promise<DuplicateMatch[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  console.log(`[DuplicateDetector] Starting duplicate detection from ${batchDate.toISOString()}`);

  // Get articles from the batch period that aren't already marked as duplicates
  const articles = await prisma.ingestedArticle.findMany({
    where: {
      ingestedAt: { gte: batchDate },
      isDuplicate: false,
    },
    select: {
      id: true,
      sourceId: true,
      title: true,
      content: true,
      publishedAt: true,
      externalUrl: true,
    },
  });

  console.log(`[DuplicateDetector] Found ${articles.length} articles to check`);

  if (articles.length < 2) {
    console.log('[DuplicateDetector] Not enough articles to compare');
    return [];
  }

  // Group by source
  const bySource = groupBySource(articles);
  const sourceIds = Array.from(bySource.keys());

  console.log(`[DuplicateDetector] Articles spread across ${sourceIds.length} sources`);

  const matches: DuplicateMatch[] = [];
  const markedAsDuplicate = new Set<string>(); // Track which articles are already marked

  // Compare across sources only (not within same source)
  for (let i = 0; i < sourceIds.length; i++) {
    for (let j = i + 1; j < sourceIds.length; j++) {
      const sourceAArticles = bySource.get(sourceIds[i]) || [];
      const sourceBArticles = bySource.get(sourceIds[j]) || [];

      for (const articleA of sourceAArticles) {
        // Skip if already marked as duplicate
        if (markedAsDuplicate.has(articleA.id)) continue;

        for (const articleB of sourceBArticles) {
          // Skip if already marked as duplicate
          if (markedAsDuplicate.has(articleB.id)) continue;

          const similarity = await compareArticles(articleA, articleB, apiKey);

          if (similarity.isDuplicate) {
            // Earlier article is primary, later is duplicate
            const [primary, duplicate] =
              articleA.publishedAt <= articleB.publishedAt
                ? [articleA, articleB]
                : [articleB, articleA];

            matches.push({
              articleId: duplicate.id,
              duplicateOfId: primary.id,
              score: similarity.score,
              reason: similarity.reason,
            });

            markedAsDuplicate.add(duplicate.id);
            console.log(
              `[DuplicateDetector] Found duplicate: "${duplicate.title.slice(0, 50)}..." ` +
                `is duplicate of "${primary.title.slice(0, 50)}..." (${similarity.reason}, ${(similarity.score * 100).toFixed(0)}%)`
            );
          }
        }
      }
    }
  }

  console.log(`[DuplicateDetector] Found ${matches.length} duplicates`);

  // Update database with duplicate flags
  if (matches.length > 0) {
    await updateDuplicateFlags(matches);
  }

  return matches;
}

/**
 * Update duplicate flags in the database
 */
async function updateDuplicateFlags(matches: DuplicateMatch[]): Promise<void> {
  console.log(`[DuplicateDetector] Updating ${matches.length} articles with duplicate flags`);

  for (const match of matches) {
    await prisma.ingestedArticle.update({
      where: { id: match.articleId },
      data: {
        isDuplicate: true,
        duplicateOfId: match.duplicateOfId,
        duplicateScore: match.score,
        duplicateReason: match.reason,
      },
    });
  }
}

/**
 * Get duplicate statistics for monitoring
 */
export async function getDuplicateStats(): Promise<{
  totalDuplicates: number;
  byReason: Record<string, number>;
  recentDuplicates: number;
}> {
  const [totalDuplicates, byReason, recentDuplicates] = await Promise.all([
    prisma.ingestedArticle.count({ where: { isDuplicate: true } }),
    prisma.ingestedArticle.groupBy({
      by: ['duplicateReason'],
      where: { isDuplicate: true },
      _count: true,
    }),
    prisma.ingestedArticle.count({
      where: {
        isDuplicate: true,
        ingestedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    totalDuplicates,
    byReason: Object.fromEntries(
      byReason.map((r) => [r.duplicateReason || 'unknown', r._count])
    ),
    recentDuplicates,
  };
}
