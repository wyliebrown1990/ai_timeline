/**
 * Prebuilt Flashcard Decks
 *
 * Curated flashcard decks for new users to get started quickly.
 * These decks reference existing milestones and concepts from the content system.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Difficulty level for prebuilt decks.
 */
export type DeckDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * A single card within a prebuilt deck.
 * Can reference existing content or define custom content.
 */
export interface PrebuiltCard {
  /** Unique identifier within the deck */
  id: string;
  /** Type of source content */
  sourceType: 'milestone' | 'concept' | 'custom';
  /** ID of source content (if referencing existing milestone/concept) */
  sourceId?: string;
  /** Custom term (for custom cards not in existing content) */
  term?: string;
  /** Custom definition (for custom cards) */
  definition?: string;
}

/**
 * A prebuilt flashcard deck with metadata and cards.
 */
export interface PrebuiltDeck {
  /** Unique deck identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of what the deck covers */
  description: string;
  /** Difficulty level */
  difficulty: DeckDifficulty;
  /** Number of cards in the deck */
  cardCount: number;
  /** Estimated minutes to complete first review */
  estimatedMinutes: number;
  /** The cards in this deck */
  cards: PrebuiltCard[];
  /** IDs of 3 cards to show in preview */
  previewCardIds: string[];
}

// =============================================================================
// AI Essentials Deck (15 cards) - Beginner
// =============================================================================

const aiEssentialsCards: PrebuiltCard[] = [
  {
    id: 'ai-essentials-1',
    sourceType: 'custom',
    term: 'Artificial Intelligence',
    definition:
      'Computer systems that can perform tasks typically requiring human intelligence, such as visual perception, speech recognition, decision-making, and language translation.',
  },
  {
    id: 'ai-essentials-2',
    sourceType: 'concept',
    sourceId: 'machine-learning',
  },
  {
    id: 'ai-essentials-3',
    sourceType: 'concept',
    sourceId: 'neural-network',
  },
  {
    id: 'ai-essentials-4',
    sourceType: 'concept',
    sourceId: 'deep-learning',
  },
  {
    id: 'ai-essentials-5',
    sourceType: 'concept',
    sourceId: 'training',
  },
  {
    id: 'ai-essentials-6',
    sourceType: 'custom',
    term: 'Model',
    definition:
      'The learned pattern an AI uses to make predictions. A model is created during training and contains the knowledge extracted from the training data.',
  },
  {
    id: 'ai-essentials-7',
    sourceType: 'custom',
    term: 'Algorithm',
    definition:
      'A step-by-step set of instructions for solving a problem or accomplishing a task. In AI, algorithms define how models learn from data.',
  },
  {
    id: 'ai-essentials-8',
    sourceType: 'custom',
    term: 'Dataset',
    definition:
      'A collection of data used to train AI models. The quality and size of the dataset significantly impacts how well the model performs.',
  },
  {
    id: 'ai-essentials-9',
    sourceType: 'concept',
    sourceId: 'inference',
  },
  {
    id: 'ai-essentials-10',
    sourceType: 'concept',
    sourceId: 'parameter',
  },
  {
    id: 'ai-essentials-11',
    sourceType: 'concept',
    sourceId: 'transformer',
  },
  {
    id: 'ai-essentials-12',
    sourceType: 'concept',
    sourceId: 'llm',
  },
  {
    id: 'ai-essentials-13',
    sourceType: 'concept',
    sourceId: 'prompt',
  },
  {
    id: 'ai-essentials-14',
    sourceType: 'concept',
    sourceId: 'fine-tuning',
  },
  {
    id: 'ai-essentials-15',
    sourceType: 'concept',
    sourceId: 'hallucination',
  },
];

// =============================================================================
// Transformer Era Deck (12 cards) - Intermediate
// =============================================================================

const transformerEraCards: PrebuiltCard[] = [
  {
    id: 'transformer-era-1',
    sourceType: 'milestone',
    sourceId: 'E2017_TRANSFORMER',
  },
  {
    id: 'transformer-era-2',
    sourceType: 'milestone',
    sourceId: 'E2018_BERT',
  },
  {
    id: 'transformer-era-3',
    sourceType: 'milestone',
    sourceId: 'E2018_GPT1',
  },
  {
    id: 'transformer-era-4',
    sourceType: 'milestone',
    sourceId: 'E2019_GPT2',
  },
  {
    id: 'transformer-era-5',
    sourceType: 'milestone',
    sourceId: 'E2020_GPT3',
  },
  {
    id: 'transformer-era-6',
    sourceType: 'concept',
    sourceId: 'attention',
  },
  {
    id: 'transformer-era-7',
    sourceType: 'custom',
    term: 'Self-Attention',
    definition:
      'A mechanism where each element in a sequence attends to all other elements, allowing the model to capture relationships regardless of distance in the sequence.',
  },
  {
    id: 'transformer-era-8',
    sourceType: 'concept',
    sourceId: 'token',
  },
  {
    id: 'transformer-era-9',
    sourceType: 'concept',
    sourceId: 'embedding',
  },
  {
    id: 'transformer-era-10',
    sourceType: 'custom',
    term: 'Pre-training',
    definition:
      'The initial phase of training where a model learns general language patterns from vast amounts of text before being fine-tuned for specific tasks.',
  },
  {
    id: 'transformer-era-11',
    sourceType: 'concept',
    sourceId: 'context-window',
  },
  {
    id: 'transformer-era-12',
    sourceType: 'concept',
    sourceId: 'scaling-laws',
  },
];

// =============================================================================
// LLM Revolution Deck (10 cards) - Intermediate
// =============================================================================

const llmRevolutionCards: PrebuiltCard[] = [
  {
    id: 'llm-revolution-1',
    sourceType: 'milestone',
    sourceId: 'E2020_GPT3',
  },
  {
    id: 'llm-revolution-2',
    sourceType: 'milestone',
    sourceId: 'E2022_INSTRUCTGPT',
  },
  {
    id: 'llm-revolution-3',
    sourceType: 'milestone',
    sourceId: 'E2022_CHATGPT',
  },
  {
    id: 'llm-revolution-4',
    sourceType: 'milestone',
    sourceId: 'E2023_GPT4',
  },
  {
    id: 'llm-revolution-5',
    sourceType: 'custom',
    term: 'Claude',
    definition:
      'An AI assistant created by Anthropic, focused on being helpful, harmless, and honest. Claude uses Constitutional AI training methods to improve safety.',
  },
  {
    id: 'llm-revolution-6',
    sourceType: 'custom',
    term: 'Llama',
    definition:
      "Meta's open-source large language model family. Llama models democratized access to powerful LLMs, enabling researchers and developers to build on top of them.",
  },
  {
    id: 'llm-revolution-7',
    sourceType: 'concept',
    sourceId: 'rlhf',
  },
  {
    id: 'llm-revolution-8',
    sourceType: 'concept',
    sourceId: 'alignment',
  },
  {
    id: 'llm-revolution-9',
    sourceType: 'concept',
    sourceId: 'emergent-behavior',
  },
  {
    id: 'llm-revolution-10',
    sourceType: 'concept',
    sourceId: 'constitutional-ai',
  },
];

// =============================================================================
// AI Vocabulary Deck (20 cards) - Beginner
// =============================================================================

const aiVocabularyCards: PrebuiltCard[] = [
  {
    id: 'ai-vocab-1',
    sourceType: 'concept',
    sourceId: 'token',
  },
  {
    id: 'ai-vocab-2',
    sourceType: 'concept',
    sourceId: 'context-window',
  },
  {
    id: 'ai-vocab-3',
    sourceType: 'custom',
    term: 'Temperature',
    definition:
      'A parameter that controls randomness in AI outputs. Higher temperature produces more creative, varied responses; lower temperature produces more focused, deterministic outputs.',
  },
  {
    id: 'ai-vocab-4',
    sourceType: 'concept',
    sourceId: 'embedding',
  },
  {
    id: 'ai-vocab-5',
    sourceType: 'concept',
    sourceId: 'attention',
  },
  {
    id: 'ai-vocab-6',
    sourceType: 'custom',
    term: 'Encoder',
    definition:
      'The part of a model that processes input into internal representations. In transformers, the encoder creates contextual embeddings of the input sequence.',
  },
  {
    id: 'ai-vocab-7',
    sourceType: 'custom',
    term: 'Decoder',
    definition:
      'The part of a model that generates output from internal representations. In language models, the decoder produces text one token at a time.',
  },
  {
    id: 'ai-vocab-8',
    sourceType: 'concept',
    sourceId: 'rlhf',
  },
  {
    id: 'ai-vocab-9',
    sourceType: 'concept',
    sourceId: 'alignment',
  },
  {
    id: 'ai-vocab-10',
    sourceType: 'concept',
    sourceId: 'prompt-engineering',
  },
  {
    id: 'ai-vocab-11',
    sourceType: 'concept',
    sourceId: 'zero-shot',
  },
  {
    id: 'ai-vocab-12',
    sourceType: 'concept',
    sourceId: 'few-shot',
  },
  {
    id: 'ai-vocab-13',
    sourceType: 'concept',
    sourceId: 'chain-of-thought',
  },
  {
    id: 'ai-vocab-14',
    sourceType: 'custom',
    term: 'Grounding',
    definition:
      'Connecting AI outputs to factual sources or real-world data. Grounded responses cite sources and are less likely to contain hallucinations.',
  },
  {
    id: 'ai-vocab-15',
    sourceType: 'concept',
    sourceId: 'rag',
  },
  {
    id: 'ai-vocab-16',
    sourceType: 'concept',
    sourceId: 'multimodal',
  },
  {
    id: 'ai-vocab-17',
    sourceType: 'concept',
    sourceId: 'emergent-behavior',
  },
  {
    id: 'ai-vocab-18',
    sourceType: 'concept',
    sourceId: 'scaling-laws',
  },
  {
    id: 'ai-vocab-19',
    sourceType: 'concept',
    sourceId: 'benchmark',
  },
  {
    id: 'ai-vocab-20',
    sourceType: 'concept',
    sourceId: 'hallucination',
  },
];

// =============================================================================
// Key Figures in AI Deck (10 cards) - Beginner
// =============================================================================

const keyFiguresCards: PrebuiltCard[] = [
  {
    id: 'key-figures-1',
    sourceType: 'custom',
    term: 'Geoffrey Hinton',
    definition:
      'Known as the "Godfather of AI," Hinton pioneered deep learning and backpropagation. He won the Turing Award in 2018 and has been vocal about AI safety concerns.',
  },
  {
    id: 'key-figures-2',
    sourceType: 'custom',
    term: 'Yann LeCun',
    definition:
      'Pioneer of convolutional neural networks (CNNs) and Chief AI Scientist at Meta. He developed techniques that made modern computer vision possible and won the Turing Award in 2018.',
  },
  {
    id: 'key-figures-3',
    sourceType: 'custom',
    term: 'Yoshua Bengio',
    definition:
      'Deep learning researcher who developed key techniques for training neural networks. Turing Award winner (2018) and advocate for responsible AI development.',
  },
  {
    id: 'key-figures-4',
    sourceType: 'custom',
    term: 'Fei-Fei Li',
    definition:
      'Computer scientist who created ImageNet, the dataset that sparked the deep learning revolution. Co-director of Stanford Human-Centered AI Institute.',
  },
  {
    id: 'key-figures-5',
    sourceType: 'custom',
    term: 'Demis Hassabis',
    definition:
      'Co-founder and CEO of DeepMind. His team created AlphaGo, AlphaFold, and other breakthrough AI systems. Nobel Prize winner (2024) for AlphaFold.',
  },
  {
    id: 'key-figures-6',
    sourceType: 'custom',
    term: 'OpenAI',
    definition:
      'AI research company that created GPT, DALL-E, and ChatGPT. Founded in 2015, it has been at the forefront of large language model development and AI safety research.',
  },
  {
    id: 'key-figures-7',
    sourceType: 'custom',
    term: 'Anthropic',
    definition:
      'AI safety company founded in 2021 by former OpenAI researchers. Created Claude and pioneered Constitutional AI, focusing on developing safe and beneficial AI systems.',
  },
  {
    id: 'key-figures-8',
    sourceType: 'custom',
    term: 'DeepMind',
    definition:
      'AI research lab acquired by Google in 2014. Known for AlphaGo, AlphaFold, and fundamental research in reinforcement learning and neural networks.',
  },
  {
    id: 'key-figures-9',
    sourceType: 'custom',
    term: 'Google AI',
    definition:
      'Created the Transformer architecture, BERT, and Gemini. Google has been central to modern AI through research publications and development of key infrastructure.',
  },
  {
    id: 'key-figures-10',
    sourceType: 'custom',
    term: 'Meta AI',
    definition:
      'Research division of Meta that created Llama and contributed to open-source AI. Known for releasing models openly to democratize AI access.',
  },
];

// =============================================================================
// Prebuilt Decks Export
// =============================================================================

export const PREBUILT_DECKS: PrebuiltDeck[] = [
  {
    id: 'ai-essentials',
    name: 'AI Essentials',
    description:
      'Core concepts every AI learner should know. The perfect starting point for understanding modern AI.',
    difficulty: 'beginner',
    cardCount: 15,
    estimatedMinutes: 8,
    cards: aiEssentialsCards,
    previewCardIds: ['ai-essentials-2', 'ai-essentials-11', 'ai-essentials-12'],
  },
  {
    id: 'transformer-era',
    name: 'Transformer Era',
    description:
      'Key milestones from 2017-2020 that transformed AI. Understand the breakthroughs that made modern LLMs possible.',
    difficulty: 'intermediate',
    cardCount: 12,
    estimatedMinutes: 6,
    cards: transformerEraCards,
    previewCardIds: [
      'transformer-era-1',
      'transformer-era-2',
      'transformer-era-5',
    ],
  },
  {
    id: 'llm-revolution',
    name: 'LLM Revolution',
    description:
      'The journey from GPT-3 to ChatGPT and beyond. Learn about the models and techniques that brought AI to the mainstream.',
    difficulty: 'intermediate',
    cardCount: 10,
    estimatedMinutes: 5,
    cards: llmRevolutionCards,
    previewCardIds: ['llm-revolution-1', 'llm-revolution-3', 'llm-revolution-7'],
  },
  {
    id: 'ai-vocabulary',
    name: 'AI Vocabulary',
    description:
      'Common terms you will encounter in AI discussions. Build your AI literacy with essential jargon.',
    difficulty: 'beginner',
    cardCount: 20,
    estimatedMinutes: 10,
    cards: aiVocabularyCards,
    previewCardIds: ['ai-vocab-1', 'ai-vocab-3', 'ai-vocab-16'],
  },
  {
    id: 'key-figures',
    name: 'Key Figures in AI',
    description:
      'The people and organizations shaping AI. Know the key players driving AI innovation and safety.',
    difficulty: 'beginner',
    cardCount: 10,
    estimatedMinutes: 5,
    cards: keyFiguresCards,
    previewCardIds: ['key-figures-1', 'key-figures-6', 'key-figures-7'],
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get a prebuilt deck by ID.
 */
export function getPrebuiltDeck(id: string): PrebuiltDeck | undefined {
  return PREBUILT_DECKS.find((deck) => deck.id === id);
}

/**
 * Get all prebuilt decks.
 */
export function getAllPrebuiltDecks(): PrebuiltDeck[] {
  return PREBUILT_DECKS;
}

/**
 * Get prebuilt decks by difficulty.
 */
export function getPrebuiltDecksByDifficulty(
  difficulty: DeckDifficulty
): PrebuiltDeck[] {
  return PREBUILT_DECKS.filter((deck) => deck.difficulty === difficulty);
}

/**
 * Get the total card count across all prebuilt decks.
 */
export function getTotalPrebuiltCardCount(): number {
  return PREBUILT_DECKS.reduce((total, deck) => total + deck.cardCount, 0);
}

/**
 * Get cards from a prebuilt deck by their IDs.
 */
export function getPrebuiltCards(
  deckId: string,
  cardIds: string[]
): PrebuiltCard[] {
  const deck = getPrebuiltDeck(deckId);
  if (!deck) return [];

  return deck.cards.filter((card) => cardIds.includes(card.id));
}

/**
 * Get preview cards for a deck.
 */
export function getPreviewCards(deckId: string): PrebuiltCard[] {
  const deck = getPrebuiltDeck(deckId);
  if (!deck) return [];

  return getPrebuiltCards(deckId, deck.previewCardIds);
}
