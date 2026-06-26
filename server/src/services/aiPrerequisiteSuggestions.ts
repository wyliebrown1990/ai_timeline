/**
 * AI-Assisted Prerequisite Suggestions Service
 * Uses Claude to analyze glossary terms and suggest prerequisites
 * Sprint LEarn-1, Section 8
 */

import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_HAIKU_MODEL } from './anthropicModels';

// Types
export interface PrerequisiteSuggestion {
  termId: string;
  termName: string;
  confidence: number; // 0-1 scale
  reason: string;
  matchType: 'exact' | 'fuzzy' | 'semantic';
}

export interface SuggestionResult {
  termId: string;
  termName: string;
  currentPrerequisites: string[];
  suggestions: PrerequisiteSuggestion[];
  suggestedDifficulty: number;
  reasoning: string;
}

interface GlossaryTermRecord {
  id: string;
  term: string;
  shortDefinition: string;
  fullDefinition: string;
  category: string;
  difficulty: number | null;
  conceptType: string | null;
  prerequisiteIds: string | null;
}

interface ClaudeSuggestion {
  conceptName: string;
  reason: string;
  confidence: number;
}

interface ClaudeResponse {
  suggestedPrerequisites: ClaudeSuggestion[];
  suggestedDifficulty: number;
  reasoning: string;
}

/**
 * Parse JSON array safely
 */
function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Calculate string similarity using Jaro-Winkler algorithm
 */
function jaroWinkler(s1: string, s2: string): number {
  const str1 = s1.toLowerCase();
  const str2 = s2.toLowerCase();

  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const matchDistance = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
  const s1Matches = new Array(str1.length).fill(false);
  const s2Matches = new Array(str2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < str1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, str2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || str1[i] !== str2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / str1.length + matches / str2.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler modification - boost for common prefix
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(str1.length, str2.length)); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Match a suggested concept name to existing glossary terms
 */
function matchToExistingTerms(
  suggestedName: string,
  existingTerms: GlossaryTermRecord[],
  excludeTermId: string
): { term: GlossaryTermRecord; matchType: 'exact' | 'fuzzy' | 'semantic'; score: number } | null {
  const normalizedSuggestion = suggestedName.toLowerCase().trim();

  // Try exact match first
  const exactMatch = existingTerms.find(
    (t) => t.id !== excludeTermId && t.term.toLowerCase().trim() === normalizedSuggestion
  );
  if (exactMatch) {
    return { term: exactMatch, matchType: 'exact', score: 1.0 };
  }

  // Try fuzzy matching
  let bestMatch: { term: GlossaryTermRecord; score: number } | null = null;
  for (const term of existingTerms) {
    if (term.id === excludeTermId) continue;

    const score = jaroWinkler(normalizedSuggestion, term.term);
    if (score >= 0.85 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { term, score };
    }
  }

  if (bestMatch) {
    return { term: bestMatch.term, matchType: 'fuzzy', score: bestMatch.score };
  }

  // Try semantic matching (check if suggestion is contained in term or vice versa)
  const semanticMatch = existingTerms.find((t) => {
    if (t.id === excludeTermId) return false;
    const termLower = t.term.toLowerCase();
    return termLower.includes(normalizedSuggestion) || normalizedSuggestion.includes(termLower);
  });

  if (semanticMatch) {
    return { term: semanticMatch, matchType: 'semantic', score: 0.75 };
  }

  return null;
}

/**
 * Get AI-powered prerequisite suggestions for a glossary term
 */
export async function suggestPrerequisites(
  termId: string,
  prisma: {
    glossaryTerm: {
      findUnique: (args: { where: { id: string } }) => Promise<GlossaryTermRecord | null>;
      findMany: () => Promise<GlossaryTermRecord[]>;
    };
  }
): Promise<SuggestionResult> {
  // Fetch the target term
  const term = await prisma.glossaryTerm.findUnique({
    where: { id: termId },
  });

  if (!term) {
    throw new Error(`Term not found: ${termId}`);
  }

  // Fetch all existing terms for matching
  const allTerms = await prisma.glossaryTerm.findMany();

  // Build context about existing terms for Claude
  const termList = allTerms
    .filter((t) => t.id !== termId)
    .map((t) => `- ${t.term} (${t.category}, difficulty: ${t.difficulty ?? 1})`)
    .join('\n');

  // Build the prompt
  const prompt = `You are analyzing an AI/ML glossary term to suggest prerequisite concepts that users should understand first.

TERM TO ANALYZE:
Name: ${term.term}
Category: ${term.category}
Current Difficulty: ${term.difficulty ?? 1}
Definition: ${term.fullDefinition}
Short Definition: ${term.shortDefinition}

EXISTING GLOSSARY TERMS (match prerequisites from this list when possible):
${termList}

TASK:
1. Identify 0-5 prerequisite concepts that a learner should understand BEFORE learning "${term.term}"
2. For each prerequisite, match it to an existing term from the list above if possible
3. Suggest an appropriate difficulty level (1-5 scale: 1=Beginner, 2=Intermediate, 3=Advanced, 4=Expert, 5=Specialist)

IMPORTANT RULES:
- Only suggest prerequisites that are genuinely needed to understand this term
- Prefer matching to existing terms in the glossary
- If a concept isn't in the glossary but is essential, still suggest it
- Confidence should reflect how certain you are this is a true prerequisite (0.0-1.0)
- Don't suggest prerequisites for foundational concepts that everyone knows

Respond in JSON format:
{
  "suggestedPrerequisites": [
    {
      "conceptName": "exact name from glossary list or new concept",
      "reason": "brief explanation of why this is a prerequisite",
      "confidence": 0.95
    }
  ],
  "suggestedDifficulty": 3,
  "reasoning": "Brief explanation of the difficulty assessment"
}`;

  // Call Claude API
  const client = new Anthropic();
  const message = await client.messages.create({
    model: ANTHROPIC_HAIKU_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  // Parse the response
  const responseText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  let claudeResponse: ClaudeResponse;
  try {
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    claudeResponse = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error('[aiPrerequisiteSuggestions] Failed to parse Claude response:', parseError, responseText);
    throw new Error('Failed to parse AI response');
  }

  // Match suggestions to existing terms
  const suggestions: PrerequisiteSuggestion[] = [];
  for (const suggestion of claudeResponse.suggestedPrerequisites || []) {
    const match = matchToExistingTerms(suggestion.conceptName, allTerms, termId);
    if (match) {
      suggestions.push({
        termId: match.term.id,
        termName: match.term.term,
        confidence: suggestion.confidence * match.score,
        reason: suggestion.reason,
        matchType: match.matchType,
      });
    } else {
      // Include unmatched suggestions with lower confidence
      suggestions.push({
        termId: '', // Empty - not in glossary
        termName: suggestion.conceptName,
        confidence: suggestion.confidence * 0.5, // Reduce confidence for unmatched
        reason: `${suggestion.reason} (Not found in glossary)`,
        matchType: 'semantic',
      });
    }
  }

  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return {
    termId: term.id,
    termName: term.term,
    currentPrerequisites: parseJsonArray<string>(term.prerequisiteIds),
    suggestions,
    suggestedDifficulty: claudeResponse.suggestedDifficulty || term.difficulty || 1,
    reasoning: claudeResponse.reasoning || '',
  };
}

/**
 * Bulk suggest prerequisites for multiple terms
 */
export async function bulkSuggestPrerequisites(
  termIds: string[],
  prisma: {
    glossaryTerm: {
      findUnique: (args: { where: { id: string } }) => Promise<GlossaryTermRecord | null>;
      findMany: () => Promise<GlossaryTermRecord[]>;
    };
  }
): Promise<SuggestionResult[]> {
  const results: SuggestionResult[] = [];

  for (const termId of termIds) {
    try {
      const result = await suggestPrerequisites(termId, prisma);
      results.push(result);
    } catch (error) {
      console.error(`[aiPrerequisiteSuggestions] Failed for term ${termId}:`, error);
      // Continue with other terms
    }
  }

  return results;
}
