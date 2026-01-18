/**
 * Comparison Configuration
 * Sprint SEO-4 Task 2 - Priority comparison pairs for SEO
 *
 * Defines high-value comparison pairs that target specific search queries.
 */

import type { ComparisonEntityType } from '../services/api';

/**
 * Priority comparison pair configuration
 */
export interface PriorityComparison {
  type: ComparisonEntityType;
  slugA: string;
  slugB: string;
  nameA: string;
  nameB: string;
  searchIntent: string; // The search query this targets
}

/**
 * Priority organization comparisons
 * These target high-volume search queries like "OpenAI vs Anthropic"
 */
export const ORGANIZATION_COMPARISONS: PriorityComparison[] = [
  // Note: Limited orgs in database currently - add more as data grows
  // {
  //   type: 'organization',
  //   slugA: 'openai',
  //   slugB: 'anthropic',
  //   nameA: 'OpenAI',
  //   nameB: 'Anthropic',
  //   searchIntent: 'openai vs anthropic',
  // },
];

/**
 * Priority person comparisons
 * AI pioneers and researchers people search for
 */
export const PERSON_COMPARISONS: PriorityComparison[] = [
  // These will be validated against actual database entries
  {
    type: 'person',
    slugA: 'geoffrey-hinton',
    slugB: 'yann-lecun',
    nameA: 'Geoffrey Hinton',
    nameB: 'Yann LeCun',
    searchIntent: 'hinton vs lecun',
  },
  {
    type: 'person',
    slugA: 'sam-altman',
    slugB: 'dario-amodei',
    nameA: 'Sam Altman',
    nameB: 'Dario Amodei',
    searchIntent: 'sam altman vs dario amodei',
  },
];

/**
 * Priority term/concept comparisons
 * Technical concepts people commonly compare
 */
export const TERM_COMPARISONS: PriorityComparison[] = [
  // Model architectures
  {
    type: 'term',
    slugA: 'transformer',
    slugB: 'rnn-recurrent-neural-network',
    nameA: 'Transformer',
    nameB: 'RNN',
    searchIntent: 'transformer vs rnn',
  },
  {
    type: 'term',
    slugA: 'cnn-convolutional-neural-network',
    slugB: 'rnn-recurrent-neural-network',
    nameA: 'CNN',
    nameB: 'RNN',
    searchIntent: 'cnn vs rnn',
  },
  {
    type: 'term',
    slugA: 'gpt-generative-pre-trained-transformer',
    slugB: 'bert',
    nameA: 'GPT',
    nameB: 'BERT',
    searchIntent: 'gpt vs bert',
  },
  // Learning paradigms
  {
    type: 'term',
    slugA: 'supervised-learning',
    slugB: 'unsupervised-learning',
    nameA: 'Supervised Learning',
    nameB: 'Unsupervised Learning',
    searchIntent: 'supervised vs unsupervised learning',
  },
  {
    type: 'term',
    slugA: 'reinforcement-learning',
    slugB: 'supervised-learning',
    nameA: 'Reinforcement Learning',
    nameB: 'Supervised Learning',
    searchIntent: 'reinforcement learning vs supervised learning',
  },
  // AI concepts
  {
    type: 'term',
    slugA: 'machine-learning',
    slugB: 'deep-learning',
    nameA: 'Machine Learning',
    nameB: 'Deep Learning',
    searchIntent: 'machine learning vs deep learning',
  },
  {
    type: 'term',
    slugA: 'ai-agents',
    slugB: 'ai-copilot',
    nameA: 'AI Agents',
    nameB: 'AI Copilot',
    searchIntent: 'ai agents vs ai copilot',
  },
  {
    type: 'term',
    slugA: 'ai-alignment',
    slugB: 'ai-safety',
    nameA: 'AI Alignment',
    nameB: 'AI Safety',
    searchIntent: 'ai alignment vs ai safety',
  },
  // Products/Models
  {
    type: 'term',
    slugA: 'chatgpt',
    slugB: 'anthropic',
    nameA: 'ChatGPT',
    nameB: 'Claude (Anthropic)',
    searchIntent: 'chatgpt vs claude',
  },
  // Attention mechanisms
  {
    type: 'term',
    slugA: 'attention-mechanism',
    slugB: 'transformer',
    nameA: 'Attention Mechanism',
    nameB: 'Transformer',
    searchIntent: 'attention mechanism vs transformer',
  },
  // Neural network types
  {
    type: 'term',
    slugA: 'neural-network',
    slugB: 'deep-learning',
    nameA: 'Neural Network',
    nameB: 'Deep Learning',
    searchIntent: 'neural network vs deep learning',
  },
];

/**
 * All priority comparisons combined
 */
export const PRIORITY_COMPARISONS: PriorityComparison[] = [
  ...ORGANIZATION_COMPARISONS,
  ...PERSON_COMPARISONS,
  ...TERM_COMPARISONS,
];

/**
 * Get comparison URL
 */
export function getComparisonUrl(comparison: PriorityComparison): string {
  return `/compare/${comparison.type}/${comparison.slugA}-vs-${comparison.slugB}`;
}

/**
 * Get comparison title
 */
export function getComparisonTitle(comparison: PriorityComparison): string {
  return `${comparison.nameA} vs ${comparison.nameB}`;
}

/**
 * Category pairs for generating dynamic comparisons
 * Terms within the same category make good comparisons
 */
export const CATEGORY_COMPARISON_RULES = {
  model_architecture: {
    maxPairs: 30,
    description: 'Neural network architectures and models',
  },
  technical_term: {
    maxPairs: 40,
    description: 'AI/ML technical concepts and methods',
  },
  core_concept: {
    maxPairs: 25,
    description: 'Fundamental AI concepts and paradigms',
  },
  business_term: {
    maxPairs: 15,
    description: 'AI business terms and applications',
  },
};
