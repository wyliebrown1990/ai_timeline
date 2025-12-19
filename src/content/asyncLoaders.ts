/**
 * Async Content Loaders
 *
 * These loaders use dynamic imports to lazy-load JSON content on demand.
 * Content is cached after first load to prevent duplicate fetches.
 *
 * Usage:
 *   const learningPaths = await loadLearningPaths();
 *   const layeredContent = await loadLayeredContent();
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

// =============================================================================
// Cache
// =============================================================================

const contentCache = new Map<string, unknown>();

async function loadWithCache<T>(
  key: string,
  loader: () => Promise<T>
): Promise<T> {
  if (contentCache.has(key)) {
    return contentCache.get(key) as T;
  }
  const data = await loader();
  contentCache.set(key, data);
  return data;
}

// =============================================================================
// Learning Paths Loader
// =============================================================================

export async function loadLearningPaths(): Promise<LearningPath[]> {
  return loadWithCache('learningPaths', async () => {
    const [
      aiForEverydayLifePath,
      aiForLeadersPath,
      appliedAIPath,
      codingWithAIPath,
      chatgptStoryPath,
      aiFundamentalsPath,
      aiImageGenerationPath,
      aiForBusinessPath,
      aiGovernancePath,
      popCulturePath,
    ] = await Promise.all([
      import('./learning-paths/ai-for-everyday-life.json'),
      import('./learning-paths/ai-for-leaders.json'),
      import('./learning-paths/applied-ai.json'),
      import('./learning-paths/coding-with-ai.json'),
      import('./learning-paths/chatgpt-story.json'),
      import('./learning-paths/ai-fundamentals.json'),
      import('./learning-paths/ai-image-generation.json'),
      import('./learning-paths/ai-for-business.json'),
      import('./learning-paths/ai-governance.json'),
      import('./learning-paths/pop-culture.json'),
    ]);

    const pathsRaw = [
      aiForEverydayLifePath.default,
      aiForLeadersPath.default,
      appliedAIPath.default,
      codingWithAIPath.default,
      chatgptStoryPath.default,
      aiFundamentalsPath.default,
      aiImageGenerationPath.default,
      aiForBusinessPath.default,
      aiGovernancePath.default,
      popCulturePath.default,
    ];

    return LearningPathArraySchema.parse(pathsRaw);
  });
}

// =============================================================================
// Glossary Loader
// =============================================================================

export async function loadGlossaryTerms(): Promise<GlossaryEntry[]> {
  return loadWithCache('glossaryTerms', async () => {
    const data = await import('./glossary/terms.json');
    return GlossaryEntryArraySchema.parse(data.default);
  });
}

// =============================================================================
// Checkpoints Loader
// =============================================================================

export async function loadCheckpoints(): Promise<Checkpoint[]> {
  return loadWithCache('checkpoints', async () => {
    const data = await import('./checkpoints/questions.json');
    return CheckpointArraySchema.parse(data.default);
  });
}

// =============================================================================
// Flashcards Loader
// =============================================================================

export async function loadFlashcards(): Promise<Flashcard[]> {
  return loadWithCache('flashcards', async () => {
    const data = await import('./checkpoints/flashcards.json');
    return FlashcardArraySchema.parse(data.default);
  });
}

// =============================================================================
// Current Events Loader
// =============================================================================

export async function loadCurrentEvents(): Promise<CurrentEvent[]> {
  return loadWithCache('currentEvents', async () => {
    const data = await import('./current-events/events.json');
    return CurrentEventArraySchema.parse(data.default);
  });
}

// =============================================================================
// Layered Content Loader
// =============================================================================

export async function loadLayeredContent(): Promise<
  Record<string, MilestoneLayeredContent>
> {
  return loadWithCache('layeredContent', async () => {
    const data = await import('./milestones/layered-content.json');
    const rawContent = data.default as Record<string, unknown>;
    const contentMap: Record<string, MilestoneLayeredContent> = {};

    // Filter out metadata keys (starting with _) and validate entries
    for (const [key, value] of Object.entries(rawContent)) {
      if (!key.startsWith('_') && typeof value === 'object' && value !== null) {
        contentMap[key] = value as MilestoneLayeredContent;
      }
    }

    if (Object.keys(contentMap).length > 0) {
      LayeredContentMapSchema.parse(contentMap);
    }

    return contentMap;
  });
}

// =============================================================================
// Preload Utilities
// =============================================================================

/**
 * Preload content in the background (for prefetching on hover, etc.)
 */
export function preloadLearningPaths(): void {
  loadLearningPaths().catch(console.error);
}

export function preloadLayeredContent(): void {
  loadLayeredContent().catch(console.error);
}

export function preloadFlashcards(): void {
  loadFlashcards().catch(console.error);
}

/**
 * Check if content is already cached
 */
export function isContentCached(key: string): boolean {
  return contentCache.has(key);
}

/**
 * Clear content cache (useful for testing or forced refresh)
 */
export function clearContentCache(): void {
  contentCache.clear();
}
