/**
 * Stage 4: Key Figure Extraction Service
 * Sprint 46 - Key Figures Pipeline Integration
 *
 * Uses Claude Haiku for cost-efficient extraction of key figures
 * mentioned in AI news articles. Extracts researchers, executives,
 * founders, and other notable individuals relevant to AI developments.
 *
 * Phase 2 adds matching integration to link extracted figures to existing
 * KeyFigure records or create KeyFigureDraft records for review.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../db';
import { normalizeName } from '../../lib/nameNormalizer';
import { findMatch, type MatchResult } from '../keyFigureMatcher';
import type { IngestedArticle, KeyFigure } from '@prisma/client';

/**
 * Extracted figure data from article analysis
 */
export interface ExtractedFigure {
  /** Raw name exactly as it appears in the article */
  name: string;
  /** Figure's role: researcher, executive, founder, engineer, policy_maker, other */
  role: 'researcher' | 'executive' | 'founder' | 'engineer' | 'policy_maker' | 'other';
  /** Organization affiliation if mentioned */
  organization?: string;
  /** The exact sentence where they are mentioned */
  context: string;
  /** What they did/said relevant to this article */
  contribution?: string;
  /** Normalized name for matching (added during processing) */
  normalizedName?: string;
}

/**
 * Valid role values for extracted figures
 */
const VALID_ROLES = ['researcher', 'executive', 'founder', 'engineer', 'policy_maker', 'other'] as const;

/**
 * System prompt for key figure extraction
 * Carefully crafted to extract only relevant figures while filtering out
 * journalists, commentators, and other non-central individuals.
 */
const KEY_FIGURE_EXTRACTION_PROMPT = `You extract key figures from AI news articles for a historical AI timeline database.

## Your Task:
Identify people who are KEY FIGURES in the AI development described in this article.

## Article:
Title: {{title}}
Content: {{content}}

## Extract ONLY:
- Researchers and scientists who made technical contributions
- Executives and C-level leaders of AI companies mentioned in relation to the news
- Founders of AI companies or research labs
- Engineers who built significant AI systems
- Policy makers involved in AI regulation decisions

## DO NOT Extract:
- Journalists, reporters, or article authors
- Unnamed sources ("a researcher said...", "sources familiar with...")
- Historical figures mentioned only as background context (e.g., "Alan Turing invented...")
- Commentators or analysts giving opinions on the news
- PR/communications representatives
- People mentioned only in passing without substantive connection to the news

## For Each Key Figure, Provide:
{
  "name": "Full name exactly as written in the article",
  "role": "researcher|executive|founder|engineer|policy_maker|other",
  "organization": "Their affiliation if explicitly mentioned, null otherwise",
  "context": "The exact sentence from the article where they are most prominently mentioned",
  "contribution": "Brief description of what they did/said that's relevant to this article (1 sentence max)"
}

## Return Format:
Return ONLY a valid JSON array. No markdown, no explanation, no commentary.
- If no key figures found, return exactly: []
- Most articles will have 1-5 key figures
- Quality over quantity - only include truly relevant figures

## Examples:
Good extraction: Sam Altman announcing GPT-5 → {"name": "Sam Altman", "role": "executive", "organization": "OpenAI", ...}
Bad extraction: "John Smith, a tech reporter at TechCrunch, wrote about..." → DO NOT INCLUDE
Bad extraction: "As Alan Turing once theorized..." → DO NOT INCLUDE (historical context only)`;

/**
 * Extract key figures from an article using Claude Haiku
 *
 * @param article - Article title and content to analyze
 * @param anthropicApiKey - API key for Claude
 * @returns Array of extracted figures with normalized names
 */
export async function extractKeyFigures(
  article: { title: string; content: string },
  anthropicApiKey: string
): Promise<ExtractedFigure[]> {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  // Prepare prompt with article content (truncate to manage token usage)
  const prompt = KEY_FIGURE_EXTRACTION_PROMPT
    .replace('{{title}}', article.title)
    .replace('{{content}}', article.content.slice(0, 6000)); // More content than glossary for better context

  console.log('[KeyFigureExtractor] Sending request to Claude Haiku');

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000, // Sufficient for 10-15 figures
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    console.log(
      '[KeyFigureExtractor] Response length:',
      text.length,
      'stop_reason:',
      response.stop_reason
    );

    // Parse and validate the response
    const figures = parseExtractedFigures(text);

    console.log(`[KeyFigureExtractor] Extracted ${figures.length} valid figures`);

    return figures;
  } catch (error) {
    console.error('[KeyFigureExtractor] API error:', error);
    throw error;
  }
}

/**
 * Parse and validate the LLM response
 * Handles malformed JSON and validates each extracted figure
 */
function parseExtractedFigures(text: string): ExtractedFigure[] {
  // Try to extract JSON array from the response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.log('[KeyFigureExtractor] No JSON array in response, returning empty');
    console.log('[KeyFigureExtractor] Full response:', text.slice(0, 500));
    return [];
  }

  try {
    // Attempt to repair common JSON issues from LLM responses
    const repairedJson = repairJsonArray(jsonMatch[0]);
    console.log('[KeyFigureExtractor] Parsing JSON, length:', repairedJson.length);

    const parsed = JSON.parse(repairedJson);

    if (!Array.isArray(parsed)) {
      console.log('[KeyFigureExtractor] Parsed result is not an array');
      return [];
    }

    // Validate and normalize each figure
    const validFigures: ExtractedFigure[] = [];

    for (const item of parsed) {
      const validated = validateFigure(item);
      if (validated) {
        // Add normalized name for matching
        const normalized = normalizeName(validated.name);
        validated.normalizedName = normalized.canonical;
        validFigures.push(validated);
      }
    }

    return validFigures;
  } catch (parseError) {
    console.error('[KeyFigureExtractor] Failed to parse response:', parseError);
    console.error('[KeyFigureExtractor] Raw JSON (first 1000 chars):', jsonMatch[0].slice(0, 1000));
    return [];
  }
}

/**
 * Validate a single extracted figure has required fields and valid values
 */
function validateFigure(item: unknown): ExtractedFigure | null {
  if (!item || typeof item !== 'object') {
    console.log('[KeyFigureExtractor] Invalid item: not an object');
    return null;
  }

  const obj = item as Record<string, unknown>;

  // Required fields
  if (typeof obj.name !== 'string' || obj.name.trim().length === 0) {
    console.log('[KeyFigureExtractor] Invalid item: missing or empty name');
    return null;
  }

  if (typeof obj.context !== 'string' || obj.context.trim().length === 0) {
    console.log('[KeyFigureExtractor] Invalid item: missing or empty context for', obj.name);
    return null;
  }

  // Validate role (default to 'other' if invalid)
  let role: ExtractedFigure['role'] = 'other';
  if (typeof obj.role === 'string' && VALID_ROLES.includes(obj.role as typeof VALID_ROLES[number])) {
    role = obj.role as ExtractedFigure['role'];
  }

  // Filter out likely journalist/author mentions
  const nameLower = obj.name.toString().toLowerCase();
  const contextLower = obj.context.toString().toLowerCase();
  if (
    contextLower.includes('wrote ') ||
    contextLower.includes('reported ') ||
    contextLower.includes('according to sources') ||
    contextLower.includes('journalist') ||
    contextLower.includes('reporter')
  ) {
    // Additional check: if context suggests they're a journalist, skip
    if (
      !contextLower.includes('announced') &&
      !contextLower.includes('founded') &&
      !contextLower.includes('developed') &&
      !contextLower.includes('created') &&
      !contextLower.includes('launched')
    ) {
      console.log('[KeyFigureExtractor] Filtered likely journalist/author:', obj.name);
      return null;
    }
  }

  // Build validated figure
  const figure: ExtractedFigure = {
    name: obj.name.toString().trim(),
    role,
    context: obj.context.toString().trim(),
  };

  // Optional fields
  if (typeof obj.organization === 'string' && obj.organization.trim().length > 0) {
    figure.organization = obj.organization.trim();
  }

  if (typeof obj.contribution === 'string' && obj.contribution.trim().length > 0) {
    figure.contribution = obj.contribution.trim();
  }

  return figure;
}

/**
 * Repair common JSON issues from LLM responses
 * Handles: trailing commas, missing closing brackets, unescaped newlines in strings
 * (Adapted from glossaryExtractor.ts)
 */
function repairJsonArray(json: string): string {
  let repaired = json;

  // Remove trailing commas before closing brackets
  repaired = repaired.replace(/,(\s*[\]}])/g, '$1');

  // Fix truncated JSON - try to close any unclosed brackets
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;

  // If truncated, try to close the JSON properly
  if (openBraces > closeBraces || openBrackets > closeBrackets) {
    // Find the last complete object and truncate there
    const lastCompleteMatch = repaired.match(/^([\s\S]*\})\s*,?\s*\{[^}]*$/);
    if (lastCompleteMatch) {
      repaired = lastCompleteMatch[1] + ']';
    } else {
      // Just add missing closing brackets
      repaired += '}'.repeat(openBraces - closeBraces);
      repaired += ']'.repeat(openBrackets - closeBrackets);
    }
  }

  return repaired;
}

// =============================================================================
// Phase 2: Matching Integration
// =============================================================================

/**
 * Result of processing a single extracted figure
 */
export interface ProcessedFigureResult {
  /** Original extracted figure */
  figure: ExtractedFigure;
  /** Match result from keyFigureMatcher */
  matchResult: MatchResult;
  /** Action taken: linked, draft_created, skipped_duplicate */
  action: 'linked' | 'draft_created' | 'skipped_duplicate';
  /** ID of linked KeyFigure (if matched) */
  linkedKeyFigureId?: string;
  /** ID of created KeyFigureDraft (if not matched) */
  draftId?: string;
  /** Whether an alias was automatically added (for very high confidence fuzzy matches) */
  aliasAdded?: boolean;
  /** The alias that was added (if aliasAdded is true) */
  aliasValue?: string;
}

/**
 * Result of processing all extracted figures for an article
 */
export interface ProcessingResult {
  /** Article ID processed */
  articleId: string;
  /** Total figures extracted */
  totalExtracted: number;
  /** Figures linked to existing KeyFigure records */
  linked: number;
  /** Figures that created new KeyFigureDraft records */
  draftsCreated: number;
  /** Figures skipped due to deduplication */
  skippedDuplicates: number;
  /** Aliases automatically added to existing figures (Phase 7: Auto-Alias Learning) */
  aliasesAdded: number;
  /** IDs of linked KeyFigures */
  linkedKeyFigureIds: string[];
  /** IDs of created KeyFigureDrafts */
  createdDraftIds: string[];
  /** Detailed results per figure */
  results: ProcessedFigureResult[];
}

/** Threshold for auto-linking fuzzy matches without review */
const AUTO_LINK_THRESHOLD = 0.95;

/** Threshold for automatically adding extracted name as alias (very high confidence) */
const AUTO_ALIAS_THRESHOLD = 0.98;

/** Threshold for creating a draft with match suggestion */
const SUGGESTION_THRESHOLD = 0.80;

/**
 * Process all extracted figures for an article
 * Matches against existing KeyFigures and creates drafts for review
 *
 * @param figures - Array of extracted figures from LLM
 * @param article - The source article (needs id at minimum)
 * @returns Processing result with counts and details
 */
export async function processExtractedFigures(
  figures: ExtractedFigure[],
  article: Pick<IngestedArticle, 'id' | 'title'>
): Promise<ProcessingResult> {
  console.log(`[KeyFigureExtractor] Processing ${figures.length} figures for article ${article.id}`);

  const result: ProcessingResult = {
    articleId: article.id,
    totalExtracted: figures.length,
    linked: 0,
    draftsCreated: 0,
    skippedDuplicates: 0,
    aliasesAdded: 0,
    linkedKeyFigureIds: [],
    createdDraftIds: [],
    results: [],
  };

  // Track processed normalized names to avoid duplicate drafts for same person
  const processedNames = new Set<string>();

  // Also check for existing drafts for this article to avoid duplicates
  const existingDrafts = await prisma.keyFigureDraft.findMany({
    where: { articleId: article.id },
    select: { normalizedName: true },
  });
  existingDrafts.forEach((d) => processedNames.add(d.normalizedName.toLowerCase()));

  for (const figure of figures) {
    const normalizedName = figure.normalizedName || normalizeName(figure.name).canonical;
    const normalizedLower = normalizedName.toLowerCase();

    // Skip if we've already processed this name for this article
    if (processedNames.has(normalizedLower)) {
      console.log(`[KeyFigureExtractor] Skipping duplicate mention: ${figure.name}`);
      result.skippedDuplicates++;
      result.results.push({
        figure,
        matchResult: { matched: false, matchType: 'none', confidence: 0 },
        action: 'skipped_duplicate',
      });
      continue;
    }

    // Mark as processed
    processedNames.add(normalizedLower);

    // Process this figure
    const figureResult = await processExtractedFigure(figure, article);
    result.results.push(figureResult);

    // Update counts based on action
    if (figureResult.action === 'linked' && figureResult.linkedKeyFigureId) {
      result.linked++;
      result.linkedKeyFigureIds.push(figureResult.linkedKeyFigureId);
      // Track auto-alias additions (Phase 7)
      if (figureResult.aliasAdded) {
        result.aliasesAdded++;
      }
    } else if (figureResult.action === 'draft_created' && figureResult.draftId) {
      result.draftsCreated++;
      result.createdDraftIds.push(figureResult.draftId);
    }
  }

  console.log(
    `[KeyFigureExtractor] Processing complete: ${result.linked} linked, ` +
    `${result.draftsCreated} drafts created, ${result.skippedDuplicates} duplicates skipped, ` +
    `${result.aliasesAdded} aliases auto-added`
  );

  return result;
}

/**
 * Process a single extracted figure
 * Matches against existing KeyFigures and creates draft if needed
 *
 * @param figure - Extracted figure data
 * @param article - Source article
 * @returns Processing result for this figure
 */
async function processExtractedFigure(
  figure: ExtractedFigure,
  article: Pick<IngestedArticle, 'id' | 'title'>
): Promise<ProcessedFigureResult> {
  const normalizedName = figure.normalizedName || normalizeName(figure.name).canonical;

  // Find match against existing KeyFigures
  const matchResult = await findMatch(figure.name);

  console.log(
    `[KeyFigureExtractor] Match result for "${figure.name}": ` +
    `type=${matchResult.matchType}, confidence=${matchResult.confidence.toFixed(2)}`
  );

  // Handle based on match type and confidence
  if (matchResult.matched && matchResult.keyFigure) {
    // Exact match or high-confidence fuzzy match - link directly
    if (
      matchResult.matchType === 'exact_canonical' ||
      matchResult.matchType === 'exact_alias' ||
      (matchResult.matchType === 'fuzzy' && matchResult.confidence >= AUTO_LINK_THRESHOLD)
    ) {
      console.log(`[KeyFigureExtractor] Auto-linking to ${matchResult.keyFigure.canonicalName}`);

      // Log alias usage for exact_alias matches
      if (matchResult.matchType === 'exact_alias') {
        console.log(`[KeyFigureExtractor] Matched via alias: "${figure.name}" -> "${matchResult.keyFigure.canonicalName}"`);
      }

      // Phase 7: Auto-Alias Learning
      // For very high confidence fuzzy matches, automatically add the extracted name as an alias
      let aliasAdded = false;
      let aliasValue: string | undefined;

      if (matchResult.matchType === 'fuzzy' && matchResult.confidence >= AUTO_ALIAS_THRESHOLD) {
        aliasAdded = await tryAddAlias(
          matchResult.keyFigure.id,
          figure.name,
          matchResult.keyFigure.canonicalName
        );
        if (aliasAdded) {
          aliasValue = figure.name;
          console.log(
            `[KeyFigureExtractor] Auto-added alias "${figure.name}" to "${matchResult.keyFigure.canonicalName}" ` +
            `(confidence: ${(matchResult.confidence * 100).toFixed(1)}%)`
          );
        }
      }

      return {
        figure,
        matchResult,
        action: 'linked',
        linkedKeyFigureId: matchResult.keyFigure.id,
        aliasAdded,
        aliasValue,
      };
    }
  }

  // Create a draft for review
  // Include match suggestion if there are candidates above threshold
  const suggestedMatch = matchResult.candidates?.find((c) => c.confidence >= SUGGESTION_THRESHOLD);

  const draft = await prisma.keyFigureDraft.create({
    data: {
      articleId: article.id,
      extractedName: figure.name,
      normalizedName,
      context: figure.context,
      suggestedBio: figure.contribution || null,
      suggestedOrg: figure.organization || null,
      suggestedRole: figure.role,
      matchedFigureId: suggestedMatch?.keyFigure.id || null,
      matchConfidence: suggestedMatch?.confidence || null,
      status: 'pending',
    },
  });

  console.log(
    `[KeyFigureExtractor] Created draft ${draft.id} for "${figure.name}"` +
    (suggestedMatch ? ` (suggested: ${suggestedMatch.keyFigure.canonicalName} @ ${(suggestedMatch.confidence * 100).toFixed(0)}%)` : '')
  );

  return {
    figure,
    matchResult,
    action: 'draft_created',
    draftId: draft.id,
  };
}

/**
 * Get existing pending drafts for an article
 * Used to check for duplicates before processing
 *
 * @param articleId - The article ID to check
 * @returns Array of normalized names that already have drafts
 */
export async function getExistingDraftNames(articleId: string): Promise<string[]> {
  const drafts = await prisma.keyFigureDraft.findMany({
    where: { articleId },
    select: { normalizedName: true },
  });
  return drafts.map((d) => d.normalizedName.toLowerCase());
}

// =============================================================================
// Phase 7: Auto-Alias Learning
// =============================================================================

/**
 * Attempt to add a name variant as an alias to an existing KeyFigure
 * Only adds if the alias doesn't already exist (case-insensitive check)
 *
 * @param keyFigureId - The KeyFigure to add the alias to
 * @param newAlias - The name variant to add as an alias
 * @param canonicalName - The canonical name (for logging)
 * @returns true if alias was added, false if it already existed
 */
async function tryAddAlias(
  keyFigureId: string,
  newAlias: string,
  canonicalName: string
): Promise<boolean> {
  try {
    // Get current aliases
    const keyFigure = await prisma.keyFigure.findUnique({
      where: { id: keyFigureId },
      select: { aliases: true },
    });

    if (!keyFigure) {
      console.warn(`[KeyFigureExtractor] Cannot add alias: KeyFigure ${keyFigureId} not found`);
      return false;
    }

    const aliases: string[] = JSON.parse(keyFigure.aliases);
    const aliasLower = newAlias.toLowerCase();
    const canonicalLower = canonicalName.toLowerCase();

    // Check if alias already exists (case-insensitive)
    const existingLower = aliases.map((a) => a.toLowerCase());
    if (existingLower.includes(aliasLower) || aliasLower === canonicalLower) {
      return false; // Alias already exists or is the canonical name
    }

    // Add the new alias
    aliases.push(newAlias);

    await prisma.keyFigure.update({
      where: { id: keyFigureId },
      data: { aliases: JSON.stringify(aliases) },
    });

    return true;
  } catch (error) {
    console.error(`[KeyFigureExtractor] Failed to add alias "${newAlias}":`, error);
    return false;
  }
}
