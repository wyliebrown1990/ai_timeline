/**
 * Stage 3: Glossary Term Extraction Service
 *
 * Uses Claude Haiku for cost-efficient extraction of new AI terminology.
 * Deduplicates against existing glossary terms.
 */

import Anthropic from '@anthropic-ai/sdk';

export interface GlossaryTermDraft {
  id: string; // lowercase-kebab-case
  term: string; // Display name
  shortDefinition: string; // Max 200 chars, for tooltips
  fullDefinition: string; // 2-3 sentences
  businessContext: string; // Why business professionals should care
  category: 'core_concept' | 'technical_term' | 'business_term' | 'model_architecture' | 'company_product';
  relatedTermIds: string[];
  relatedMilestoneIds: string[];
}

const GLOSSARY_EXTRACTION_PROMPT = `You are a glossary curator for "Let AI Explain AI", helping non-technical professionals understand AI terminology.

## Your Task:
Identify NEW AI-specific terms from this article that should be added to our glossary.

## Article:
Title: {{title}}
Content: {{content}}

## EXISTING Glossary Terms (DO NOT duplicate these):
{{existingTerms}}

## Rules for New Terms:
1. Must be AI-SPECIFIC (not general tech terms like "API", "cloud", "database")
2. Must NOT already exist in our glossary (check the list above carefully!)
3. Must be terminology a business professional would encounter and need defined
4. Skip company names unless they've become common nouns (like "GPT" has)
5. Skip version numbers (don't add "GPT-4" if "GPT" exists)
6. Focus on concepts, not proper nouns
7. Quality over quantity - only genuinely useful new terms

## Return ONLY valid JSON Array (no markdown, no explanation):
[
  {
    "id": "<lowercase-kebab-case>",
    "term": "<Display Name>",
    "shortDefinition": "<Max 200 chars, no jargon, for tooltips>",
    "fullDefinition": "<2-3 sentences explaining the concept>",
    "businessContext": "<1-2 sentences: why should a business professional care?>",
    "category": "<exactly one of: core_concept, technical_term, business_term, model_architecture, company_product>",
    "relatedTermIds": ["<existing term IDs this relates to>"],
    "relatedMilestoneIds": []
  }
]

Return an empty array [] if no genuinely new AI-specific terms are found.
Most articles will have 0-2 new terms at most. Be selective.`;

export async function extractGlossaryTerms(
  article: { title: string; content: string },
  existingTerms: string[], // Array of existing term names
  anthropicApiKey: string
): Promise<GlossaryTermDraft[]> {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  const prompt = GLOSSARY_EXTRACTION_PROMPT.replace('{{title}}', article.title)
    .replace('{{content}}', article.content.slice(0, 4000))
    .replace('{{existingTerms}}', existingTerms.length > 0 ? existingTerms.join(', ') : '(none yet)');

  const response = await client.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Try to extract JSON array from the response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    // No array found - could be empty response or error
    console.log('[GlossaryExtractor] No JSON array in response, returning empty');
    return [];
  }

  try {
    const terms = JSON.parse(jsonMatch[0]) as GlossaryTermDraft[];

    if (!Array.isArray(terms)) {
      return [];
    }

    // Double-check for duplicates (AI might still suggest existing terms)
    const existingLower = existingTerms.map((t) => t.toLowerCase());
    const filteredTerms = terms.filter((t) => {
      if (!t.term || !t.id) return false;
      return !existingLower.includes(t.term.toLowerCase());
    });

    // Validate each term has required fields
    return filteredTerms.filter((t) => {
      return (
        typeof t.id === 'string' &&
        typeof t.term === 'string' &&
        typeof t.shortDefinition === 'string' &&
        typeof t.fullDefinition === 'string' &&
        typeof t.businessContext === 'string' &&
        typeof t.category === 'string'
      );
    });
  } catch (parseError) {
    console.error('[GlossaryExtractor] Failed to parse response:', parseError);
    return [];
  }
}
