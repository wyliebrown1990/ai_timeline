/**
 * Category Assigner
 * Sprint Bib-1: Auto-assign milestone categories
 *
 * Uses rules-based classification with LLM refinement for ambiguous cases
 */

import type { BibliographyEntry, MilestoneCategory } from './types';

// Known breakthrough papers and their categories
const KNOWN_BREAKTHROUGHS: Record<string, { category: MilestoneCategory; significance: number }> = {
  // Foundational papers
  'computing machinery and intelligence': { category: 'breakthrough', significance: 4 },
  'a logical calculus of ideas immanent in nervous activity': {
    category: 'breakthrough',
    significance: 4,
  },
  'the perceptron': { category: 'breakthrough', significance: 4 },
  'learning representations by back-propagating errors': {
    category: 'breakthrough',
    significance: 4,
  },
  'a mathematical theory of communication': { category: 'breakthrough', significance: 4 },
  'attention is all you need': { category: 'breakthrough', significance: 4 },
  'imagenet classification with deep convolutional neural networks': {
    category: 'breakthrough',
    significance: 4,
  },
  'playing atari with deep reinforcement learning': { category: 'breakthrough', significance: 4 },
  'mastering the game of go': { category: 'breakthrough', significance: 4 },
  'bert': { category: 'model_release', significance: 4 },
  'gpt': { category: 'model_release', significance: 4 },
  'language models are few-shot learners': { category: 'model_release', significance: 4 },
  'deep residual learning': { category: 'breakthrough', significance: 4 },
  'generative adversarial': { category: 'breakthrough', significance: 4 },
  'dropout': { category: 'research', significance: 3 },
  'batch normalization': { category: 'research', significance: 3 },
  'adam': { category: 'research', significance: 3 },
  'long short-term memory': { category: 'breakthrough', significance: 4 },
  'gradient-based learning applied to document recognition': {
    category: 'breakthrough',
    significance: 4,
  },
  'neural machine translation': { category: 'breakthrough', significance: 3 },
  'word2vec': { category: 'breakthrough', significance: 4 },
  'glove': { category: 'research', significance: 3 },
  'reinforcement learning: an introduction': { category: 'research', significance: 4 },
  'temporal difference learning': { category: 'breakthrough', significance: 4 },
  'q-learning': { category: 'breakthrough', significance: 4 },
  'policy gradient': { category: 'research', significance: 3 },
  // Neuroscience foundations
  'organization of behavior': { category: 'breakthrough', significance: 4 },
  'conditioned reflexes': { category: 'breakthrough', significance: 4 },
  'dopamine neurons': { category: 'research', significance: 3 },
  'predictive coding': { category: 'research', significance: 3 },
};

// Keywords that suggest specific categories
const CATEGORY_KEYWORDS: Record<MilestoneCategory, string[]> = {
  breakthrough: [
    'first',
    'novel',
    'breakthrough',
    'outperforms',
    'state-of-the-art',
    'superhuman',
    'beating',
    'surpassing',
    'revolutionary',
    'paradigm',
  ],
  model_release: [
    'model',
    'release',
    'gpt',
    'bert',
    'llama',
    'claude',
    'gemini',
    'architecture',
    'pre-trained',
    'language model',
  ],
  product: [
    'product',
    'launch',
    'commercial',
    'application',
    'platform',
    'service',
    'api',
    'deployed',
  ],
  regulation: [
    'regulation',
    'policy',
    'law',
    'governance',
    'ethics',
    'safety',
    'eu ai act',
    'executive order',
  ],
  industry: [
    'acquisition',
    'merger',
    'funding',
    'billion',
    'startup',
    'company',
    'investment',
    'ipo',
  ],
  research: [
    'paper',
    'study',
    'analysis',
    'survey',
    'review',
    'framework',
    'theory',
    'method',
    'algorithm',
    'technique',
  ],
};

/**
 * Check if title matches any known breakthrough papers
 */
function checkKnownBreakthroughs(
  title: string
): { category: MilestoneCategory; significance: number } | null {
  const normalizedTitle = title.toLowerCase();

  for (const [key, value] of Object.entries(KNOWN_BREAKTHROUGHS)) {
    if (normalizedTitle.includes(key)) {
      return value;
    }
  }

  return null;
}

/**
 * Score keywords for category assignment
 */
function scoreKeywords(text: string): Record<MilestoneCategory, number> {
  const normalizedText = text.toLowerCase();
  const scores: Record<MilestoneCategory, number> = {
    research: 0,
    model_release: 0,
    breakthrough: 0,
    product: 0,
    regulation: 0,
    industry: 0,
  };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword)) {
        scores[category as MilestoneCategory]++;
      }
    }
  }

  return scores;
}

/**
 * Assign category based on publication type
 */
function getCategoryFromType(type: string): MilestoneCategory {
  switch (type) {
    case 'paper':
    case 'article':
    case 'conference':
    case 'thesis':
    case 'report':
      return 'research';
    case 'book':
      return 'research'; // Most academic books are research
    default:
      return 'research';
  }
}

/**
 * Main function: Assign category to a bibliography entry
 */
export function assignCategory(entry: BibliographyEntry): {
  category: MilestoneCategory;
  confidence: number;
  significance: number;
  reasoning: string;
} {
  const searchText = `${entry.title} ${entry.rawCitation}`;

  // Check known breakthroughs first
  const knownMatch = checkKnownBreakthroughs(entry.title);
  if (knownMatch) {
    return {
      category: knownMatch.category,
      confidence: 0.95,
      significance: knownMatch.significance,
      reasoning: 'Matched known breakthrough paper',
    };
  }

  // Score keywords
  const scores = scoreKeywords(searchText);

  // Find highest scoring category
  let maxScore = 0;
  let bestCategory: MilestoneCategory = 'research';
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category as MilestoneCategory;
    }
  }

  // If no clear winner, use type-based assignment
  if (maxScore === 0) {
    bestCategory = getCategoryFromType(entry.type);
  }

  // Calculate confidence based on score differential
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.min(0.9, 0.5 + (maxScore / totalScore) * 0.4) : 0.6;

  // Estimate significance based on year and keywords
  let significance = 2; // Default moderate

  // Older foundational works tend to be more significant
  if (entry.year < 1970) {
    significance = Math.min(4, significance + 1);
  }

  // Breakthroughs are typically higher significance
  if (bestCategory === 'breakthrough') {
    significance = Math.max(3, significance);
  }

  // Check for significance-boosting keywords
  const significanceKeywords = [
    'seminal',
    'foundational',
    'landmark',
    'pioneering',
    'groundbreaking',
    'influential',
  ];
  for (const keyword of significanceKeywords) {
    if (searchText.toLowerCase().includes(keyword)) {
      significance = Math.min(4, significance + 1);
      break;
    }
  }

  return {
    category: bestCategory,
    confidence,
    significance: significance as 1 | 2 | 3 | 4,
    reasoning: maxScore > 0 ? `Keyword scoring: ${bestCategory} (${maxScore} matches)` : `Type-based: ${entry.type} → research`,
  };
}

/**
 * Batch assign categories
 */
export function assignCategories(
  entries: BibliographyEntry[]
): Array<ReturnType<typeof assignCategory> & { entry: BibliographyEntry }> {
  return entries.map((entry) => ({
    entry,
    ...assignCategory(entry),
  }));
}

/**
 * Get category distribution statistics
 */
export function getCategoryDistribution(
  results: Array<{ category: MilestoneCategory }>
): Record<MilestoneCategory, number> {
  const distribution: Record<MilestoneCategory, number> = {
    research: 0,
    model_release: 0,
    breakthrough: 0,
    product: 0,
    regulation: 0,
    industry: 0,
  };

  for (const result of results) {
    distribution[result.category]++;
  }

  return distribution;
}
