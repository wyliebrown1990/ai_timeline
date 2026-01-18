/**
 * Comparison Configuration (Backend)
 * Sprint SEO-4 Task 2 - Priority comparison pairs for sitemap
 *
 * Defines high-value comparison pairs that should always be in the sitemap.
 */

import type { ComparisonEntityType } from '../services/comparison';

/**
 * Priority comparison pair
 */
export interface PriorityComparison {
  type: ComparisonEntityType;
  slugA: string;
  slugB: string;
}

/**
 * Priority term comparisons that target high-value search queries
 * These are validated to exist in the database before being added to sitemap
 */
export const PRIORITY_TERM_COMPARISONS: PriorityComparison[] = [
  // Model comparisons
  { type: 'term', slugA: 'transformer', slugB: 'rnn-recurrent-neural-network' },
  { type: 'term', slugA: 'cnn-convolutional-neural-network', slugB: 'rnn-recurrent-neural-network' },
  { type: 'term', slugA: 'gpt-generative-pre-trained-transformer', slugB: 'bert' },

  // Learning paradigms
  { type: 'term', slugA: 'supervised-learning', slugB: 'unsupervised-learning' },
  { type: 'term', slugA: 'reinforcement-learning', slugB: 'supervised-learning' },
  { type: 'term', slugA: 'machine-learning', slugB: 'deep-learning' },

  // AI concepts
  { type: 'term', slugA: 'ai-agents', slugB: 'ai-copilot' },
  { type: 'term', slugA: 'ai-alignment', slugB: 'ai-safety' },
  { type: 'term', slugA: 'attention-mechanism', slugB: 'transformer' },
  { type: 'term', slugA: 'neural-network', slugB: 'deep-learning' },
  { type: 'term', slugA: 'chatgpt', slugB: 'anthropic' },
  { type: 'term', slugA: 'backpropagation', slugB: 'gradient-descent' },
];

/**
 * Priority person comparisons
 */
export const PRIORITY_PERSON_COMPARISONS: PriorityComparison[] = [
  // AI pioneers - these may not exist in DB yet
  { type: 'person', slugA: 'geoffrey-hinton', slugB: 'yann-lecun' },
  { type: 'person', slugA: 'sam-altman', slugB: 'dario-amodei' },
];

/**
 * All priority comparisons
 */
export const PRIORITY_COMPARISONS: PriorityComparison[] = [
  ...PRIORITY_TERM_COMPARISONS,
  ...PRIORITY_PERSON_COMPARISONS,
];
