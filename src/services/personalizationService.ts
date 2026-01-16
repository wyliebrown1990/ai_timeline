/**
 * Personalization Service (Sprint Feed-6)
 *
 * Provides personalization scoring for feed items based on
 * user's engagement history, saved items, and learning activity.
 */

const STORAGE_KEY = 'ai_timeline_personalization';

interface PersonalizationData {
  interactedConcepts: Record<string, number>; // concept -> interaction count
  savedTopics: string[]; // topics from saved items
  upvotedTopics: string[]; // topics from upvoted items
  lastUpdated: string;
}

/**
 * Get personalization data from localStorage
 */
function getPersonalizationData(): PersonalizationData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as PersonalizationData;
    }
  } catch (error) {
    console.warn('Failed to parse personalization data:', error);
  }

  return {
    interactedConcepts: {},
    savedTopics: [],
    upvotedTopics: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Save personalization data to localStorage
 */
function savePersonalizationData(data: PersonalizationData): void {
  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save personalization data:', error);
  }
}

/**
 * Extract topics from text (simple keyword extraction)
 */
function extractTopics(text: string): string[] {
  const commonAITopics = [
    'gpt', 'llm', 'transformer', 'neural', 'machine learning', 'deep learning',
    'ai safety', 'alignment', 'openai', 'anthropic', 'google', 'meta',
    'chatgpt', 'claude', 'gemini', 'llama', 'mistral', 'nvidia',
    'robotics', 'autonomous', 'computer vision', 'nlp', 'agi',
    'regulation', 'ethics', 'bias', 'copyright', 'training data',
    'multimodal', 'agent', 'reasoning', 'benchmark', 'fine-tuning',
  ];

  const lowerText = text.toLowerCase();
  return commonAITopics.filter((topic) => lowerText.includes(topic));
}

export interface PersonalizationScore {
  score: number; // 0-1
  reason: 'for_you' | 'learning' | 'trending' | null;
  matchedTopics: string[];
}

/**
 * Personalization Service singleton
 */
export const personalizationService = {
  /**
   * Record concept interaction
   */
  recordConceptInteraction(conceptName: string): void {
    const data = getPersonalizationData();
    const normalized = conceptName.toLowerCase();
    data.interactedConcepts[normalized] = (data.interactedConcepts[normalized] ?? 0) + 1;
    savePersonalizationData(data);
  },

  /**
   * Record save action with topics
   */
  recordSave(headline: string, summary: string): void {
    const data = getPersonalizationData();
    const topics = extractTopics(`${headline} ${summary}`);

    // Add unique topics
    topics.forEach((topic) => {
      if (!data.savedTopics.includes(topic)) {
        data.savedTopics.push(topic);
        // Keep last 50 topics
        if (data.savedTopics.length > 50) {
          data.savedTopics.shift();
        }
      }
    });

    savePersonalizationData(data);
  },

  /**
   * Record upvote action with topics
   */
  recordUpvote(headline: string, summary: string): void {
    const data = getPersonalizationData();
    const topics = extractTopics(`${headline} ${summary}`);

    // Add unique topics
    topics.forEach((topic) => {
      if (!data.upvotedTopics.includes(topic)) {
        data.upvotedTopics.push(topic);
        // Keep last 50 topics
        if (data.upvotedTopics.length > 50) {
          data.upvotedTopics.shift();
        }
      }
    });

    savePersonalizationData(data);
  },

  /**
   * Get personalization score for a feed item
   */
  getScore(headline: string, summary: string, concepts: string[] = []): PersonalizationScore {
    const data = getPersonalizationData();
    const itemTopics = extractTopics(`${headline} ${summary}`);
    const matchedTopics: string[] = [];
    let score = 0;

    // Check saved topics (high weight)
    itemTopics.forEach((topic) => {
      if (data.savedTopics.includes(topic)) {
        score += 0.3;
        if (!matchedTopics.includes(topic)) {
          matchedTopics.push(topic);
        }
      }
    });

    // Check upvoted topics (medium weight)
    itemTopics.forEach((topic) => {
      if (data.upvotedTopics.includes(topic)) {
        score += 0.2;
        if (!matchedTopics.includes(topic)) {
          matchedTopics.push(topic);
        }
      }
    });

    // Check interacted concepts (high weight for learning connection)
    concepts.forEach((concept) => {
      const normalized = concept.toLowerCase();
      if (data.interactedConcepts[normalized]) {
        score += 0.25 * Math.min(data.interactedConcepts[normalized], 3) / 3;
        if (!matchedTopics.includes(concept)) {
          matchedTopics.push(concept);
        }
      }
    });

    // Normalize score to 0-1
    score = Math.min(score, 1);

    // Determine reason
    let reason: 'for_you' | 'learning' | null = null;
    if (score >= 0.3) {
      // Check if it's primarily learning-related
      const hasLearningConnection = concepts.some(
        (c) => data.interactedConcepts[c.toLowerCase()]
      );
      reason = hasLearningConnection ? 'learning' : 'for_you';
    }

    return { score, reason, matchedTopics };
  },

  /**
   * Check if item should show "For You" badge
   */
  isForYou(headline: string, summary: string, concepts: string[] = []): boolean {
    const { score, reason } = this.getScore(headline, summary, concepts);
    return score >= 0.3 && reason === 'for_you';
  },

  /**
   * Check if item has learning connection
   */
  hasLearningConnection(concepts: string[]): boolean {
    const data = getPersonalizationData();
    return concepts.some((c) => data.interactedConcepts[c.toLowerCase()]);
  },

  /**
   * Get user's top interests
   */
  getTopInterests(limit: number = 5): string[] {
    const data = getPersonalizationData();

    // Combine all topics with weights
    const topicCounts: Record<string, number> = {};

    data.savedTopics.forEach((t) => {
      topicCounts[t] = (topicCounts[t] ?? 0) + 2;
    });

    data.upvotedTopics.forEach((t) => {
      topicCounts[t] = (topicCounts[t] ?? 0) + 1;
    });

    Object.entries(data.interactedConcepts).forEach(([concept, count]) => {
      topicCounts[concept] = (topicCounts[concept] ?? 0) + count;
    });

    // Sort by count and return top N
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([topic]) => topic);
  },

  /**
   * Reset personalization data (for testing)
   */
  reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to reset personalization data:', error);
    }
  },
};

export default personalizationService;
