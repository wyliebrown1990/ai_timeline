/**
 * Milestone Generator
 * Sprint Bib-1: Generate milestone data using LLM when scraping fails
 *
 * Uses Claude to generate comprehensive milestone data from bibliography entries
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  BibliographyEntry,
  ClassificationResult,
  GeneratedMilestoneData,
  ScrapedMetadata,
} from './types';

// Era definitions matching the existing system
const ERA_DEFINITIONS = [
  { id: 'foundations', name: 'Foundations', start: 1940, end: 1955 },
  { id: 'birth_of_ai', name: 'Birth of AI', start: 1956, end: 1969 },
  { id: 'symbolic_expert', name: 'Symbolic & Expert Systems', start: 1970, end: 1987 },
  { id: 'winters_statistical', name: 'Winters & Statistical ML', start: 1988, end: 2011 },
  { id: 'deep_learning_resurgence', name: 'Deep Learning Resurgence', start: 2012, end: 2016 },
  { id: 'transformers_nlp', name: 'Transformers & Modern NLP', start: 2017, end: 2019 },
  { id: 'scaling_llms', name: 'Scaling & LLMs', start: 2020, end: 2021 },
  { id: 'alignment_productization', name: 'Alignment & Productization', start: 2022, end: 2023 },
  { id: 'multimodal_deployment', name: 'Multimodal & Deployment', start: 2024, end: 2099 },
];

function getEraForYear(year: number): string {
  const era = ERA_DEFINITIONS.find((e) => year >= e.start && year <= e.end);
  return era?.name || 'Foundations';
}

const GENERATION_PROMPT = `You are creating a historical milestone entry for an AI history timeline from a bibliography citation.

## Bibliography Entry:
Title: {{title}}
Authors: {{authors}}
Year: {{year}}
Type: {{type}}
{{abstractSection}}
{{venueSection}}

## Classification Info:
Category: {{category}}
Suggested Significance: {{significance}}
Reasoning: {{reasoning}}

## Your Task:
Generate comprehensive milestone data for this historical AI/ML work. This should explain its significance to a non-technical audience while being historically accurate.

## Generate This EXACT JSON Structure:
{
  "title": "<Clear milestone title - what this work introduced/discovered, 50-200 chars>",
  "description": "<Educational description explaining what this work did and why it matters, 200-800 chars. Written for non-experts.>",
  "date": "<YYYY-MM-DD format. If only year known, estimate based on typical publication patterns (conferences: summer/fall, journals: varies)>",
  "category": "{{category}}",
  "significance": {{significance}},
  "era": "{{era}}",
  "organization": "<Primary institution/organization if known, or null>",
  "contributors": {{authorsJson}},
  "tags": ["<5-8 relevant lowercase tags like: neural-networks, reinforcement-learning, nlp, computer-vision>"],
  "tldr": "<1-2 sentence summary of the key contribution>",
  "simpleExplanation": "<3-4 sentences explaining this to someone with no technical background>",
  "businessImpact": "<2-3 sentences on how this eventually impacted technology/industry>",
  "historicalContext": "<How this fits in the broader history of AI>",
  "technicalDepth": "<Optional technical details for those who want more depth>",
  "dateIsApproximate": <true if only year is known, false if exact date determined>
}

## Guidelines:
- Title should capture the key contribution, not just repeat the paper title
- Description should explain WHY this matters, not just WHAT it is
- Use the provided category and significance
- Era must be exactly one of: Foundations, Birth of AI, Symbolic & Expert Systems, Winters & Statistical ML, Deep Learning Resurgence, Transformers & Modern NLP, Scaling & LLMs, Alignment & Productization, Multimodal & Deployment
- For historical papers before 1990, be generous with significance if they were foundational
- Tags should be lowercase with hyphens (no spaces)

Return ONLY the JSON, no other text.`;

/**
 * Generate milestone data for a single entry
 */
export async function generateMilestoneData(
  entry: BibliographyEntry,
  classification: ClassificationResult,
  scrapedMetadata: ScrapedMetadata | null,
  apiKey: string
): Promise<GeneratedMilestoneData> {
  const client = new Anthropic({ apiKey });

  // Build prompt with available data
  const abstractSection = scrapedMetadata?.abstract
    ? `Abstract: ${scrapedMetadata.abstract.slice(0, 1000)}`
    : '';

  const venueSection = scrapedMetadata?.venue
    ? `Venue: ${scrapedMetadata.venue}`
    : entry.journal
      ? `Journal: ${entry.journal}`
      : '';

  const era = getEraForYear(entry.year);
  const authorsJson = JSON.stringify(entry.authors.slice(0, 5));

  const prompt = GENERATION_PROMPT.replace('{{title}}', entry.title)
    .replace('{{authors}}', entry.authors.join(', '))
    .replace('{{year}}', entry.year.toString())
    .replace('{{type}}', entry.type)
    .replace('{{abstractSection}}', abstractSection)
    .replace('{{venueSection}}', venueSection)
    .replace(/\{\{category\}\}/g, classification.suggestedCategory)
    .replace(/\{\{significance\}\}/g, classification.suggestedSignificance.toString())
    .replace('{{reasoning}}', classification.reasoning)
    .replace('{{era}}', era)
    .replace('{{authorsJson}}', authorsJson);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]) as GeneratedMilestoneData;

    // Validate and fix common issues
    result.significance = Math.max(1, Math.min(4, result.significance || classification.suggestedSignificance)) as 1 | 2 | 3 | 4;
    result.category = result.category || classification.suggestedCategory;
    result.era = result.era || era;
    result.tags = result.tags || [];
    result.contributors = result.contributors || entry.authors.slice(0, 5);
    result.dateIsApproximate = result.dateIsApproximate !== false; // Default to true

    // Ensure date is valid
    if (!result.date || !/^\d{4}-\d{2}-\d{2}$/.test(result.date)) {
      // Default to June 1 of the year (middle of year for unknown dates)
      result.date = `${entry.year}-06-01`;
      result.dateIsApproximate = true;
    }

    return result;
  } catch (error) {
    console.error(`[MilestoneGenerator] LLM generation failed:`, error);

    // Return a basic milestone with available data
    return {
      title: entry.title,
      description: `${entry.title} by ${entry.authors.slice(0, 3).join(', ')}${entry.authors.length > 3 ? ' et al.' : ''}. Published in ${entry.year}.`,
      date: `${entry.year}-01-01`,
      category: classification.suggestedCategory,
      significance: classification.suggestedSignificance,
      era,
      organization: undefined,
      contributors: entry.authors.slice(0, 5),
      tags: ['ai-history', entry.type],
      tldr: `A ${entry.type} from ${entry.year} contributing to AI research.`,
      simpleExplanation: `This ${entry.type} was published in ${entry.year} and contributed to the field of artificial intelligence.`,
      businessImpact: 'This work contributed to the foundation of modern AI technology.',
      dateIsApproximate: true,
    };
  }
}

/**
 * Batch generate milestone data with progress tracking
 */
export async function generateMilestonesForEntries(
  entries: Array<{
    entry: BibliographyEntry;
    classification: ClassificationResult;
    metadata: ScrapedMetadata | null;
  }>,
  apiKey: string,
  options: {
    onProgress?: (processed: number, total: number) => void;
    batchDelay?: number;
  } = {}
): Promise<Map<string, GeneratedMilestoneData>> {
  const { onProgress, batchDelay = 500 } = options;
  const results = new Map<string, GeneratedMilestoneData>();

  for (let i = 0; i < entries.length; i++) {
    const { entry, classification, metadata } = entries[i];
    const key = `${entry.title}-${entry.year}`;

    console.log(
      `[MilestoneGenerator] Generating milestone ${i + 1}/${entries.length}: "${entry.title.slice(0, 40)}..."`
    );

    const milestoneData = await generateMilestoneData(entry, classification, metadata, apiKey);
    results.set(key, milestoneData);

    onProgress?.(i + 1, entries.length);

    // Rate limiting delay between requests
    if (i < entries.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, batchDelay));
    }
  }

  console.log(`[MilestoneGenerator] Generated ${results.size} milestones`);
  return results;
}

/**
 * Estimate publication date based on year and type
 */
export function estimateDate(year: number, type: string): string {
  // Conference papers are typically summer/fall
  if (type === 'conference') {
    return `${year}-06-15`; // Mid-June (typical conference season start)
  }

  // Journal papers can be any time, default to beginning of year
  if (type === 'paper' || type === 'article') {
    return `${year}-03-01`; // Early in year
  }

  // Books typically take longer to publish
  if (type === 'book') {
    return `${year}-09-01`; // Fall publishing season
  }

  // Default to middle of year
  return `${year}-06-01`;
}
