/**
 * Central export point for all custom React hooks
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

// Content hooks (Sprint 8.5)
export {
  // Learning Paths
  useLearningPaths,
  useLearningPath,
  useLearningPathsByDifficulty,
  // Glossary
  useGlossary,
  useGlossaryTerm,
  useGlossaryByCategory,
  useGlossarySearch,
  // Checkpoints
  useCheckpoints,
  useCheckpointsForPath,
  useCheckpoint,
  // Flashcards
  useFlashcards,
  useFlashcardsByCategory,
  useFlashcardsForMilestone,
  useFlashcardCategories,
  // Current Events
  useCurrentEvents,
  useFeaturedCurrentEvents,
  useCurrentEvent,
  useCurrentEventsForMilestone,
  // Layered Content
  useLayeredContent,
  useMilestonesWithLayeredContent,
  useHasLayeredContent,
} from './useContent';
