/**
 * News Concept Linker Service (Sprint LEarn-2)
 *
 * Detects glossary concepts mentioned in news content and links them
 * to news events for contextual learning.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { PrismaClient, GlossaryTerm } from '@prisma/client';

// Initialize Anthropic client
const anthropic = new Anthropic();

/**
 * Concept match result from detection
 */
export interface ConceptMatch {
  termId: string;
  term: string;
  context: string; // Sentence where found
  confidence: number; // Match confidence 0-1
  isKeyTopic: boolean; // Is this a main topic?
}

/**
 * Result from concept detection
 */
export interface ConceptDetectionResult {
  matches: ConceptMatch[];
  keyTopics: string[]; // Term names that are key topics
  reasoning: string; // AI reasoning for matches
}

/**
 * Build a map of term variations for matching
 */
function buildTermVariations(terms: GlossaryTerm[]): Map<string, GlossaryTerm> {
  const variations = new Map<string, GlossaryTerm>();

  for (const term of terms) {
    const termLower = term.term.toLowerCase();

    // Exact term
    variations.set(termLower, term);

    // Plurals
    if (!termLower.endsWith('s')) {
      variations.set(termLower + 's', term);
    }

    // Common variations
    if (termLower.includes('-')) {
      // "fine-tuning" -> "fine tuning", "finetuning"
      variations.set(termLower.replace(/-/g, ' '), term);
      variations.set(termLower.replace(/-/g, ''), term);
    }

    // Handle acronyms in parentheses: "Large Language Model" -> "LLM"
    const acronymMatch = term.term.match(/\(([A-Z]+)\)/);
    if (acronymMatch) {
      variations.set(acronymMatch[1].toLowerCase(), term);
    }

    // Generate acronym from multi-word terms
    const words = term.term.split(/\s+/);
    if (words.length > 1) {
      const acronym = words
        .map((w) => w[0])
        .join('')
        .toLowerCase();
      if (acronym.length >= 2) {
        variations.set(acronym, term);
      }
    }
  }

  return variations;
}

/**
 * Find exact and fuzzy matches in content
 */
function findTermMatches(
  content: string,
  termVariations: Map<string, GlossaryTerm>
): Map<string, { term: GlossaryTerm; contexts: string[] }> {
  const matches = new Map<string, { term: GlossaryTerm; contexts: string[] }>();
  const contentLower = content.toLowerCase();
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  // Check each variation
  for (const [variation, term] of termVariations) {
    // Word boundary check to avoid partial matches
    const regex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');

    if (regex.test(contentLower)) {
      const existingMatch = matches.get(term.id);
      const contexts: string[] = existingMatch?.contexts || [];

      // Find sentences containing this term
      for (const sentence of sentences) {
        if (new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi').test(sentence)) {
          const trimmed = sentence.trim();
          if (trimmed.length > 0 && !contexts.includes(trimmed)) {
            contexts.push(trimmed);
          }
        }
      }

      matches.set(term.id, { term, contexts: contexts.slice(0, 3) }); // Max 3 contexts
    }
  }

  return matches;
}

/**
 * Use Claude to identify key topics and validate matches
 */
async function analyzeConceptRelevance(
  headline: string,
  summary: string,
  foundTerms: Array<{ term: string; definition: string }>
): Promise<{ keyTopics: string[]; reasoning: string }> {
  if (foundTerms.length === 0) {
    return { keyTopics: [], reasoning: 'No concepts detected in content.' };
  }

  const prompt = `Analyze this AI news article and determine which of the detected technical concepts are KEY TOPICS (central to the story) vs just MENTIONED (referenced but not the main focus).

HEADLINE: ${headline}

SUMMARY: ${summary}

DETECTED CONCEPTS:
${foundTerms.map((t) => `- ${t.term}: ${t.definition}`).join('\n')}

Return a JSON object with:
{
  "keyTopics": ["term1", "term2"],  // Terms that are central to this news story
  "reasoning": "Brief explanation of why these are key topics"
}

Rules:
- Key topics should be directly relevant to the main announcement/development
- A term mentioned in passing or as context is NOT a key topic
- Limit key topics to 1-3 most relevant terms
- Return empty keyTopics array if no concepts are truly central

Return ONLY the JSON object, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
        reasoning: parsed.reasoning || '',
      };
    }
  } catch (error) {
    console.error('[newsConceptLinker] Failed to analyze concept relevance:', error);
  }

  // Fallback: treat all as non-key topics
  return { keyTopics: [], reasoning: 'Unable to determine key topics.' };
}

/**
 * Detect concepts in news content
 */
export async function detectConcepts(
  headline: string,
  summary: string,
  prisma: PrismaClient
): Promise<ConceptDetectionResult> {
  // Get all glossary terms
  const terms = await prisma.glossaryTerm.findMany({
    select: {
      id: true,
      term: true,
      shortDefinition: true,
      category: true,
      difficulty: true,
      conceptType: true,
    },
  });

  if (terms.length === 0) {
    return { matches: [], keyTopics: [], reasoning: 'No glossary terms available.' };
  }

  // Build term variations map
  const termVariations = buildTermVariations(terms as GlossaryTerm[]);

  // Find matches in headline and summary
  const content = `${headline} ${summary}`;
  const foundMatches = findTermMatches(content, termVariations);

  if (foundMatches.size === 0) {
    return { matches: [], keyTopics: [], reasoning: 'No concepts detected in content.' };
  }

  // Prepare for AI analysis
  const foundTerms = Array.from(foundMatches.values()).map((m) => ({
    term: m.term.term,
    definition: m.term.shortDefinition,
  }));

  // Analyze with Claude to identify key topics
  const { keyTopics, reasoning } = await analyzeConceptRelevance(headline, summary, foundTerms);

  // Build final matches
  const matches: ConceptMatch[] = Array.from(foundMatches.entries()).map(([termId, match]) => ({
    termId,
    term: match.term.term,
    context: match.contexts[0] || '',
    confidence: 1.0, // Exact match
    isKeyTopic: keyTopics.some((kt) => kt.toLowerCase() === match.term.term.toLowerCase()),
  }));

  // Sort: key topics first, then by term name
  matches.sort((a, b) => {
    if (a.isKeyTopic && !b.isKeyTopic) return -1;
    if (!a.isKeyTopic && b.isKeyTopic) return 1;
    return a.term.localeCompare(b.term);
  });

  return { matches, keyTopics, reasoning };
}

/**
 * Link detected concepts to a news event
 */
export async function linkConceptsToEvent(
  eventId: string,
  matches: ConceptMatch[],
  prisma: PrismaClient
): Promise<number> {
  if (matches.length === 0) return 0;

  // Delete existing links
  await prisma.newsEventConcept.deleteMany({
    where: { eventId },
  });

  // Create new links
  const links = await prisma.newsEventConcept.createMany({
    data: matches.map((match) => ({
      eventId,
      conceptId: match.termId,
      mentionContext: match.context || null,
      isKeyTopic: match.isKeyTopic,
    })),
    skipDuplicates: true,
  });

  return links.count;
}

/**
 * Process a news event: detect concepts and link them
 */
export async function processNewsEventConcepts(
  eventId: string,
  prisma: PrismaClient
): Promise<ConceptDetectionResult & { linkedCount: number }> {
  // Get the news event
  const event = await prisma.currentEvent.findUnique({
    where: { id: eventId },
    select: { id: true, headline: true, summary: true },
  });

  if (!event) {
    throw new Error(`News event not found: ${eventId}`);
  }

  // Detect concepts
  const result = await detectConcepts(event.headline, event.summary, prisma);

  // Link concepts to event
  const linkedCount = await linkConceptsToEvent(eventId, result.matches, prisma);

  console.log(
    `[newsConceptLinker] Processed event ${eventId}: ${result.matches.length} concepts detected, ${linkedCount} linked`
  );

  return { ...result, linkedCount };
}

/**
 * Get linked concepts for a news event
 */
export async function getEventConcepts(
  eventId: string,
  prisma: PrismaClient
): Promise<
  Array<{
    id: string;
    term: string;
    shortDefinition: string;
    category: string;
    difficulty: number;
    mentionContext: string | null;
    isKeyTopic: boolean;
  }>
> {
  const links = await prisma.newsEventConcept.findMany({
    where: { eventId },
    include: {
      concept: {
        select: {
          id: true,
          term: true,
          shortDefinition: true,
          category: true,
          difficulty: true,
        },
      },
    },
    orderBy: [{ isKeyTopic: 'desc' }, { concept: { term: 'asc' } }],
  });

  return links.map((link) => ({
    id: link.concept.id,
    term: link.concept.term,
    shortDefinition: link.concept.shortDefinition,
    category: link.concept.category,
    difficulty: link.concept.difficulty,
    mentionContext: link.mentionContext,
    isKeyTopic: link.isKeyTopic,
  }));
}

/**
 * Get all news events mentioning a concept
 */
export async function getNewsByConceptId(
  conceptId: string,
  prisma: PrismaClient,
  limit = 10
): Promise<
  Array<{
    id: string;
    headline: string;
    publishedDate: Date;
    isKeyTopic: boolean;
    mentionContext: string | null;
  }>
> {
  const links = await prisma.newsEventConcept.findMany({
    where: { conceptId },
    include: {
      event: {
        select: {
          id: true,
          headline: true,
          publishedDate: true,
          isPublished: true,
        },
      },
    },
    orderBy: { event: { publishedDate: 'desc' } },
    take: limit,
  });

  return links
    .filter((link) => link.event.isPublished)
    .map((link) => ({
      id: link.event.id,
      headline: link.event.headline,
      publishedDate: link.event.publishedDate,
      isKeyTopic: link.isKeyTopic,
      mentionContext: link.mentionContext,
    }));
}
