/**
 * Central export point for all custom React hooks
 */
export { useMilestones, useMilestone, useMilestoneMutation } from './useMilestones';

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
