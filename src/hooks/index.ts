/**
 * Central export point for all custom React hooks
 *
 * Sprint 39: Cleaned up deprecated static content hooks.
 * All content now served from database APIs.
 */
export { useMilestones, useMilestone, useMilestoneMutation } from './useMilestones';

// API Key hook (Sprint 16)
export { useApiKey } from './useApiKey';
export type { ApiKeyState, ApiKeyActions, UseApiKeyReturn } from './useApiKey';

// Path progress hook
export { usePathProgress } from './usePathProgress';
export type { PathProgress, UsePathProgressReturn } from './usePathProgress';

// Checkpoint progress hook (Sprint 13)
export { useCheckpointProgress } from './useCheckpointProgress';
export type {
  QuestionAnswer,
  CheckpointProgress,
  UseCheckpointProgressReturn,
} from './useCheckpointProgress';

// User profile hook (Sprint 14)
export { useUserProfile, getRoleDefaultExplanationLevel } from './useUserProfile';
export type { StoredUserData, UseUserProfileReturn } from './useUserProfile';

// Flashcard store hook (Sprint 22)
export { useFlashcardStore } from './useFlashcardStore';
export type { UseFlashcardStoreReturn } from './useFlashcardStore';

// Glossary API hooks (Sprint 36 - database API)
export {
  useGlossary,
  useGlossaryTerm,
  useGlossaryTerms,
  useGlossaryByCategory,
  useGlossarySearch,
} from './useGlossaryApi';

// Flashcard API hooks (Sprint 36 - database API)
export {
  useFlashcards,
  useFlashcard,
  useFlashcardsByCategory,
  usePrebuiltDecks,
  usePrebuiltDeck,
  usePrebuiltDecksByDifficulty,
} from './useFlashcardsApi';

// Learning Paths, Checkpoints, Current Events API hooks (Sprint 37 - database API)
export {
  useLearningPaths,
  useLearningPath,
  useLearningPathsByDifficulty,
  useCheckpointsForPath,
  useCurrentEvents,
  useFeaturedEvents,
  useEventsForMilestone,
} from './useLearningPathsApi';

// Re-export types from database APIs
export type {
  LearningPath,
  LearningPathWithCheckpoints,
  LearningPathDifficulty,
  Checkpoint,
  CurrentEvent,
} from './useLearningPathsApi';
