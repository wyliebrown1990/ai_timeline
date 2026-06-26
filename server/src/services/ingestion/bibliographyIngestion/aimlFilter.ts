/**
 * AI/ML Filter
 * Sprint Bib-1: Filter bibliography entries to AI/ML-focused content
 *
 * Uses LLM to classify entries and filter to ~200-300 relevant ones
 */

import Anthropic from '@anthropic-ai/sdk';
import type { BibliographyEntry, ClassificationResult, MilestoneCategory } from './types';
import { ANTHROPIC_HAIKU_MODEL } from '../../anthropicModels';

// AI/ML topic keywords for initial filtering
const AI_ML_KEYWORDS = [
  // Core AI/ML terms
  'artificial intelligence',
  'machine learning',
  'neural network',
  'deep learning',
  'reinforcement learning',
  'natural language processing',
  'nlp',
  'computer vision',
  'pattern recognition',
  'expert system',
  // Architectures and methods
  'perceptron',
  'backpropagation',
  'transformer',
  'attention mechanism',
  'convolutional',
  'recurrent',
  'lstm',
  'gru',
  'gan',
  'generative adversarial',
  'autoencoder',
  'variational',
  'diffusion model',
  'language model',
  'gpt',
  'bert',
  'llm',
  // Learning paradigms
  'supervised learning',
  'unsupervised learning',
  'self-supervised',
  'semi-supervised',
  'transfer learning',
  'few-shot',
  'zero-shot',
  'meta-learning',
  'curriculum learning',
  // Optimization
  'gradient descent',
  'stochastic gradient',
  'optimizer',
  'loss function',
  'regularization',
  'dropout',
  'batch normalization',
  // Applications
  'speech recognition',
  'image recognition',
  'object detection',
  'segmentation',
  'machine translation',
  'text generation',
  'question answering',
  'sentiment analysis',
  'robotics',
  'autonomous',
  // Neuroscience connections
  'computational neuroscience',
  'cognitive science',
  'neural computation',
  'brain-inspired',
  'neuromorphic',
  'biological neural',
  'hebbian',
  'dopamine',
  'reward prediction',
  'temporal difference',
  // Historical
  'turing',
  'mcculloch',
  'pitts',
  'rosenblatt',
  'minsky',
  'mccarthy',
  'newell',
  'simon',
  'hinton',
  'lecun',
  'bengio',
  'schmidhuber',
  'sutton',
  'hopfield',
  'rumelhart',
];

/**
 * Quick keyword-based pre-filter
 */
export function quickKeywordFilter(entry: BibliographyEntry): boolean {
  const searchText = `${entry.title} ${entry.authors.join(' ')} ${entry.rawCitation}`.toLowerCase();

  for (const keyword of AI_ML_KEYWORDS) {
    if (searchText.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * LLM-based classification for more nuanced filtering
 */
async function classifyWithLLM(
  entries: BibliographyEntry[],
  apiKey: string
): Promise<ClassificationResult[]> {
  const client = new Anthropic({ apiKey });

  // Format entries for the prompt
  const entriesText = entries
    .map(
      (e, i) =>
        `${i + 1}. "${e.title}" by ${e.authors.slice(0, 2).join(', ')}${e.authors.length > 2 ? ' et al.' : ''} (${e.year})`
    )
    .join('\n');

  const prompt = `You are classifying academic works for an AI history timeline. Evaluate each entry below.

For EACH entry, determine:
1. Is it directly related to AI, machine learning, neural networks, or computational approaches to intelligence?
2. If yes, suggest a category: research (papers/theories), breakthrough (major capability milestone), model_release (new model), product (commercial AI), regulation (policy), industry (business events)
3. Rate historical significance: 1=minor, 2=moderate, 3=major, 4=groundbreaking

## Entries to classify:
${entriesText}

## Return JSON array with one object per entry:
[
  {
    "index": 1,
    "isAIML": true/false,
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation",
    "suggestedCategory": "research|breakthrough|model_release|product|regulation|industry",
    "suggestedSignificance": 1-4
  },
  ...
]

IMPORTANT:
- Include entries about: neural networks, machine learning algorithms, AI systems, cognitive architectures, computational learning theory, robotics AI, NLP, computer vision
- Include foundational neuroscience work that directly influenced AI (like Hebb's learning rule, dopamine reward systems)
- EXCLUDE: pure biology/evolution without AI connection, psychology without computational modeling, philosophy without AI implications
- Be generous with neuroscience/cognitive science if it has computational modeling aspects

Return ONLY the JSON array, no other text.`;

  try {
    const response = await client.messages.create({
      model: ANTHROPIC_HAIKU_MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const classifications = JSON.parse(jsonMatch[0]) as Array<{
      index: number;
      isAIML: boolean;
      confidence: number;
      reasoning: string;
      suggestedCategory: string;
      suggestedSignificance: number;
    }>;

    // Map back to entries
    return classifications.map((c) => {
      const entryIndex = c.index - 1;
      const entry = entries[entryIndex] || entries[0];
      return {
        entry,
        isAIML: c.isAIML === true,
        confidence: typeof c.confidence === 'number' ? c.confidence : 0.5,
        reasoning: c.reasoning || '',
        suggestedCategory: (c.suggestedCategory || 'research') as MilestoneCategory,
        suggestedSignificance: (Math.max(1, Math.min(4, c.suggestedSignificance || 2)) as 1 | 2 | 3 | 4),
      };
    });
  } catch (error) {
    console.error('[AIMLFilter] LLM classification failed:', error);
    // Return all entries as potentially AI/ML with low confidence
    return entries.map((entry) => ({
      entry,
      isAIML: quickKeywordFilter(entry),
      confidence: 0.3,
      reasoning: 'LLM classification failed, using keyword fallback',
      suggestedCategory: 'research' as MilestoneCategory,
      suggestedSignificance: 2 as 1 | 2 | 3 | 4,
    }));
  }
}

/**
 * Filter entries to AI/ML-focused content
 */
export async function filterToAIML(
  entries: BibliographyEntry[],
  apiKey: string,
  options: {
    batchSize?: number;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<ClassificationResult[]> {
  const { batchSize = 30, onProgress } = options;

  console.log(`[AIMLFilter] Starting classification of ${entries.length} entries`);

  // Step 1: Quick keyword pre-filter to reduce LLM calls
  const preFiltered = entries.filter((e) => quickKeywordFilter(e));
  console.log(`[AIMLFilter] Keyword pre-filter: ${preFiltered.length}/${entries.length} entries`);

  // If pre-filter gives us reasonable number, use all of them
  // Otherwise, also include non-keyword entries for LLM review
  const toClassify =
    preFiltered.length >= 200
      ? preFiltered
      : [...preFiltered, ...entries.filter((e) => !quickKeywordFilter(e)).slice(0, 200)];

  console.log(`[AIMLFilter] Sending ${toClassify.length} entries to LLM for classification`);

  const results: ClassificationResult[] = [];
  let processed = 0;

  // Process in batches
  for (let i = 0; i < toClassify.length; i += batchSize) {
    const batch = toClassify.slice(i, i + batchSize);
    console.log(
      `[AIMLFilter] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toClassify.length / batchSize)}`
    );

    const batchResults = await classifyWithLLM(batch, apiKey);
    results.push(...batchResults);

    processed += batch.length;
    onProgress?.(processed, toClassify.length);

    // Rate limiting delay between batches
    if (i + batchSize < toClassify.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Filter to only AI/ML entries
  const aimlEntries = results.filter((r) => r.isAIML);
  console.log(`[AIMLFilter] Classification complete: ${aimlEntries.length}/${results.length} are AI/ML`);

  return aimlEntries;
}

/**
 * Get category statistics from classification results
 */
export function getCategoryStats(
  results: ClassificationResult[]
): Record<MilestoneCategory, number> {
  const stats: Record<MilestoneCategory, number> = {
    research: 0,
    model_release: 0,
    breakthrough: 0,
    product: 0,
    regulation: 0,
    industry: 0,
  };

  for (const r of results) {
    if (r.isAIML && r.suggestedCategory) {
      stats[r.suggestedCategory]++;
    }
  }

  return stats;
}
