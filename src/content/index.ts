/**
 * Content Loader Utilities
 *
 * This module provides access to static JSON content for the AI Timeline.
 * Content is loaded at build time and validated against Zod schemas.
 *
 * Usage:
 *   import { getLearningPaths, getGlossaryTerm } from '@/content';
 */

import type {
  LearningPath,
  GlossaryEntry,
  Checkpoint,
  Flashcard,
  CurrentEvent,
  MilestoneLayeredContent,
} from '../types';

import {
  LearningPathArraySchema,
  GlossaryEntryArraySchema,
  CheckpointArraySchema,
  FlashcardArraySchema,
  CurrentEventArraySchema,
  LayeredContentMapSchema,
} from '../types';

// Import JSON content
// Note: In a real build, these would be imported directly. For now, we'll
// use dynamic requires or fetch patterns depending on the bundler.
import chatgptStoryPath from './learning-paths/chatgpt-story.json';
import aiFundamentalsPath from './learning-paths/ai-fundamentals.json';
import aiImageGenerationPath from './learning-paths/ai-image-generation.json';
import aiForBusinessPath from './learning-paths/ai-for-business.json';
import aiGovernancePath from './learning-paths/ai-governance.json';
import aiForEverydayLifePath from './learning-paths/ai-for-everyday-life.json';
import aiForLeadersPath from './learning-paths/ai-for-leaders.json';
import popCulturePath from './learning-paths/pop-culture.json';
import appliedAIPath from './learning-paths/applied-ai.json';
import glossaryTermsData from './glossary/terms.json';
import checkpointQuestionsData from './checkpoints/questions.json';
import flashcardsData from './checkpoints/flashcards.json';
import currentEventsData from './current-events/events.json';
import layeredContentData from './milestones/layered-content.json';

// =============================================================================
// Learning Paths
// =============================================================================

// Validate and store learning paths
const learningPathsRaw = [
  aiForEverydayLifePath, // Sprint 17: Featured first for 65+ audience
  aiForLeadersPath, // Sprint 18: For executives and managers
  appliedAIPath, // Applied AI: How businesses actually use LLMs
  chatgptStoryPath,
  aiFundamentalsPath,
  aiImageGenerationPath,
  aiForBusinessPath,
  aiGovernancePath,
  popCulturePath, // Sprint 21: AI Pop Culture path
];
let learningPaths: LearningPath[] = [];

try {
  learningPaths = LearningPathArraySchema.parse(learningPathsRaw);
} catch (error) {
  console.error('Failed to validate learning paths:', error);
  // In development, throw to alert developers
  // In production, use empty array to prevent crashes
  if (import.meta.env?.DEV) {
    throw error;
  }
}

/**
 * Get all learning paths
 */
export function getLearningPaths(): LearningPath[] {
  return learningPaths;
}

/**
 * Get a learning path by ID
 */
export function getLearningPath(id: string): LearningPath | undefined {
  return learningPaths.find((path) => path.id === id);
}

/**
 * Get learning paths by difficulty
 */
export function getLearningPathsByDifficulty(
  difficulty: LearningPath['difficulty']
): LearningPath[] {
  return learningPaths.filter((path) => path.difficulty === difficulty);
}

// =============================================================================
// Glossary
// =============================================================================

let glossaryTerms: GlossaryEntry[] = [];

try {
  glossaryTerms = GlossaryEntryArraySchema.parse(glossaryTermsData);
} catch (error) {
  console.error('Failed to validate glossary terms:', error);
  if (import.meta.env?.DEV) {
    throw error;
  }
}

/**
 * Get all glossary terms
 */
export function getGlossaryTerms(): GlossaryEntry[] {
  return glossaryTerms;
}

/**
 * Get a glossary term by ID
 */
export function getGlossaryTerm(id: string): GlossaryEntry | undefined {
  return glossaryTerms.find((term) => term.id === id);
}

/**
 * Get glossary terms by category
 */
export function getGlossaryTermsByCategory(
  category: GlossaryEntry['category']
): GlossaryEntry[] {
  return glossaryTerms.filter((term) => term.category === category);
}

/**
 * Search glossary terms by query (searches term and definitions)
 */
export function searchGlossaryTerms(query: string): GlossaryEntry[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];

  return glossaryTerms.filter(
    (term) =>
      term.term.toLowerCase().includes(lowerQuery) ||
      term.shortDefinition.toLowerCase().includes(lowerQuery) ||
      term.fullDefinition.toLowerCase().includes(lowerQuery)
  );
}

// =============================================================================
// Checkpoints
// =============================================================================

let checkpoints: Checkpoint[] = [];

try {
  checkpoints = CheckpointArraySchema.parse(checkpointQuestionsData);
} catch (error) {
  console.error('Failed to validate checkpoints:', error);
  if (import.meta.env?.DEV) {
    throw error;
  }
}

/**
 * Get all checkpoints
 */
export function getCheckpoints(): Checkpoint[] {
  return checkpoints;
}

/**
 * Get checkpoints for a specific learning path
 */
export function getCheckpointsForPath(pathId: string): Checkpoint[] {
  return checkpoints.filter((cp) => cp.pathId === pathId);
}

/**
 * Get a checkpoint by ID
 */
export function getCheckpoint(id: string): Checkpoint | undefined {
  return checkpoints.find((cp) => cp.id === id);
}

// =============================================================================
// Flashcards
// =============================================================================

let flashcards: Flashcard[] = [];

try {
  flashcards = FlashcardArraySchema.parse(flashcardsData);
} catch (error) {
  console.error('Failed to validate flashcards:', error);
  if (import.meta.env?.DEV) {
    throw error;
  }
}

/**
 * Get all flashcards
 */
export function getFlashcards(): Flashcard[] {
  return flashcards;
}

/**
 * Get flashcards by category
 */
export function getFlashcardsByCategory(category: string): Flashcard[] {
  return flashcards.filter((card) => card.category === category);
}

/**
 * Get flashcards related to a milestone
 */
export function getFlashcardsForMilestone(milestoneId: string): Flashcard[] {
  return flashcards.filter((card) =>
    card.relatedMilestoneIds.includes(milestoneId)
  );
}

/**
 * Get all unique flashcard categories
 */
export function getFlashcardCategories(): string[] {
  const categories = new Set(flashcards.map((card) => card.category));
  return Array.from(categories).sort();
}

// =============================================================================
// Current Events
// =============================================================================

let currentEvents: CurrentEvent[] = [];

try {
  currentEvents = CurrentEventArraySchema.parse(currentEventsData);
} catch (error) {
  console.error('Failed to validate current events:', error);
  if (import.meta.env?.DEV) {
    throw error;
  }
}

/**
 * Get all current events (including expired)
 */
export function getAllCurrentEvents(): CurrentEvent[] {
  return currentEvents;
}

/**
 * Get active (non-expired) current events
 */
export function getCurrentEvents(): CurrentEvent[] {
  const now = new Date();
  return currentEvents.filter((event) => {
    if (!event.expiresAt) return true;
    return new Date(event.expiresAt) > now;
  });
}

/**
 * Get featured current events (active only)
 */
export function getFeaturedCurrentEvents(): CurrentEvent[] {
  return getCurrentEvents().filter((event) => event.featured);
}

/**
 * Get a current event by ID
 */
export function getCurrentEvent(id: string): CurrentEvent | undefined {
  return currentEvents.find((event) => event.id === id);
}

/**
 * Get current events related to a milestone
 */
export function getCurrentEventsForMilestone(milestoneId: string): CurrentEvent[] {
  return getCurrentEvents().filter((event) =>
    event.prerequisiteMilestoneIds.includes(milestoneId)
  );
}

// =============================================================================
// Layered Content
// =============================================================================

// The layered content JSON may have metadata fields (starting with _) we filter out
const rawLayeredContent = layeredContentData as unknown as Record<string, unknown>;
const layeredContentMap: Record<string, MilestoneLayeredContent> = {};

try {
  // Filter out metadata keys (starting with _) and validate entries
  for (const [key, value] of Object.entries(rawLayeredContent)) {
    if (!key.startsWith('_') && typeof value === 'object' && value !== null) {
      layeredContentMap[key] = value as MilestoneLayeredContent;
    }
  }
  // Validate the map if it has entries
  if (Object.keys(layeredContentMap).length > 0) {
    LayeredContentMapSchema.parse(layeredContentMap);
  }
} catch (error) {
  console.error('Failed to validate layered content:', error);
  if (import.meta.env?.DEV) {
    throw error;
  }
}

/**
 * Get layered content for a specific milestone
 */
export function getLayeredContent(
  milestoneId: string
): MilestoneLayeredContent | undefined {
  return layeredContentMap[milestoneId];
}

/**
 * Get all milestone IDs that have layered content
 */
export function getMilestonesWithLayeredContent(): string[] {
  return Object.keys(layeredContentMap);
}

/**
 * Check if a milestone has layered content
 */
export function hasLayeredContent(milestoneId: string): boolean {
  return milestoneId in layeredContentMap;
}

// =============================================================================
// Validation Utility
// =============================================================================

/**
 * Validate all content at startup
 * Useful for CI/CD pipelines and development
 */
export function validateAllContent(): {
  valid: boolean;
  errors: { type: string; error: string }[];
} {
  const errors: { type: string; error: string }[] = [];

  try {
    LearningPathArraySchema.parse(learningPathsRaw);
  } catch (e) {
    errors.push({ type: 'learningPaths', error: String(e) });
  }

  try {
    GlossaryEntryArraySchema.parse(glossaryTermsData);
  } catch (e) {
    errors.push({ type: 'glossary', error: String(e) });
  }

  try {
    CheckpointArraySchema.parse(checkpointQuestionsData);
  } catch (e) {
    errors.push({ type: 'checkpoints', error: String(e) });
  }

  try {
    FlashcardArraySchema.parse(flashcardsData);
  } catch (e) {
    errors.push({ type: 'flashcards', error: String(e) });
  }

  try {
    CurrentEventArraySchema.parse(currentEventsData);
  } catch (e) {
    errors.push({ type: 'currentEvents', error: String(e) });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
