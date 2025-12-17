/**
 * Checkpoint Progress Hook
 *
 * Manages user progress through knowledge checkpoints using localStorage.
 * Tracks answers, scores, and completion status for each checkpoint.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Storage key for checkpoint progress data
 */
const STORAGE_KEY = 'ai-timeline-checkpoint-progress';

/**
 * User's answer for a single question
 */
export interface QuestionAnswer {
  questionId: string;
  // For multiple choice: selectedIndex; For ordering: array of IDs; For matching: pairs
  answer: number | string[] | Record<string, string>;
  isCorrect: boolean;
  answeredAt: string;
}

/**
 * Progress data for a single checkpoint
 */
export interface CheckpointProgress {
  checkpointId: string;
  pathId: string;
  answers: QuestionAnswer[];
  startedAt: string;
  completedAt?: string;
  score: number; // Percentage (0-100)
}

/**
 * All stored checkpoint progress data
 */
interface StoredCheckpointProgress {
  checkpoints: Record<string, CheckpointProgress>;
}

/**
 * Default empty storage state
 */
const DEFAULT_STORAGE: StoredCheckpointProgress = {
  checkpoints: {},
};

/**
 * Load progress from localStorage
 */
function loadProgress(): StoredCheckpointProgress {
  if (typeof window === 'undefined') return DEFAULT_STORAGE;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as StoredCheckpointProgress;
    }
  } catch (error) {
    console.error('Failed to load checkpoint progress:', error);
  }

  return DEFAULT_STORAGE;
}

/**
 * Save progress to localStorage
 */
function saveProgress(progress: StoredCheckpointProgress): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save checkpoint progress:', error);
  }
}

/**
 * Hook return type
 */
export interface UseCheckpointProgressReturn {
  /** Get progress for a specific checkpoint */
  getCheckpointProgress: (checkpointId: string) => CheckpointProgress | undefined;

  /** Get all checkpoint progress for a path */
  getProgressForPath: (pathId: string) => CheckpointProgress[];

  /** Record an answer for a question in a checkpoint */
  recordAnswer: (
    checkpointId: string,
    pathId: string,
    questionId: string,
    answer: QuestionAnswer['answer'],
    isCorrect: boolean
  ) => void;

  /** Mark a checkpoint as completed and calculate final score */
  completeCheckpoint: (checkpointId: string, totalQuestions: number) => void;

  /** Check if a specific question has been answered */
  isQuestionAnswered: (checkpointId: string, questionId: string) => boolean;

  /** Get the answer for a specific question */
  getQuestionAnswer: (checkpointId: string, questionId: string) => QuestionAnswer | undefined;

  /** Check if a checkpoint has been completed */
  isCheckpointCompleted: (checkpointId: string) => boolean;

  /** Get the score for a checkpoint */
  getCheckpointScore: (checkpointId: string) => number;

  /** Get overall checkpoint stats for a path */
  getPathCheckpointStats: (pathId: string) => {
    totalCheckpoints: number;
    completedCheckpoints: number;
    averageScore: number;
  };

  /** Reset progress for a specific checkpoint */
  resetCheckpointProgress: (checkpointId: string) => void;

  /** Reset all checkpoint progress */
  resetAllProgress: () => void;
}

/**
 * Hook for managing checkpoint progress
 *
 * @example
 * ```tsx
 * const {
 *   recordAnswer,
 *   isCheckpointCompleted,
 *   getCheckpointScore,
 * } = useCheckpointProgress();
 *
 * // When user answers a question
 * recordAnswer('cp-1', 'chatgpt-story', 'q-1', 2, true);
 *
 * // Check score
 * const score = getCheckpointScore('cp-1');
 * ```
 */
export function useCheckpointProgress(): UseCheckpointProgressReturn {
  const [progress, setProgress] = useState<StoredCheckpointProgress>(DEFAULT_STORAGE);

  // Load progress from localStorage on mount
  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  // Save to localStorage whenever progress changes
  const updateProgress = useCallback((newProgress: StoredCheckpointProgress) => {
    setProgress(newProgress);
    saveProgress(newProgress);
  }, []);

  // Get progress for a specific checkpoint
  const getCheckpointProgress = useCallback(
    (checkpointId: string): CheckpointProgress | undefined => {
      return progress.checkpoints[checkpointId];
    },
    [progress]
  );

  // Get all checkpoint progress for a path
  const getProgressForPath = useCallback(
    (pathId: string): CheckpointProgress[] => {
      return Object.values(progress.checkpoints).filter((cp) => cp.pathId === pathId);
    },
    [progress]
  );

  // Record an answer for a question
  const recordAnswer = useCallback(
    (
      checkpointId: string,
      pathId: string,
      questionId: string,
      answer: QuestionAnswer['answer'],
      isCorrect: boolean
    ) => {
      const existingProgress = progress.checkpoints[checkpointId];
      const newAnswer: QuestionAnswer = {
        questionId,
        answer,
        isCorrect,
        answeredAt: new Date().toISOString(),
      };

      if (!existingProgress) {
        // Create new checkpoint progress
        const newCheckpointProgress: CheckpointProgress = {
          checkpointId,
          pathId,
          answers: [newAnswer],
          startedAt: new Date().toISOString(),
          score: 0,
        };

        updateProgress({
          ...progress,
          checkpoints: {
            ...progress.checkpoints,
            [checkpointId]: newCheckpointProgress,
          },
        });
        return;
      }

      // Update existing progress - replace answer if already answered
      const existingAnswerIndex = existingProgress.answers.findIndex(
        (a) => a.questionId === questionId
      );

      let updatedAnswers: QuestionAnswer[];
      if (existingAnswerIndex >= 0) {
        updatedAnswers = [...existingProgress.answers];
        updatedAnswers[existingAnswerIndex] = newAnswer;
      } else {
        updatedAnswers = [...existingProgress.answers, newAnswer];
      }

      updateProgress({
        ...progress,
        checkpoints: {
          ...progress.checkpoints,
          [checkpointId]: {
            ...existingProgress,
            answers: updatedAnswers,
          },
        },
      });
    },
    [progress, updateProgress]
  );

  // Complete checkpoint and calculate score
  const completeCheckpoint = useCallback(
    (checkpointId: string, totalQuestions: number) => {
      const checkpointProgress = progress.checkpoints[checkpointId];
      if (!checkpointProgress) return;

      const correctAnswers = checkpointProgress.answers.filter((a) => a.isCorrect).length;
      const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      updateProgress({
        ...progress,
        checkpoints: {
          ...progress.checkpoints,
          [checkpointId]: {
            ...checkpointProgress,
            completedAt: new Date().toISOString(),
            score,
          },
        },
      });
    },
    [progress, updateProgress]
  );

  // Check if a question has been answered
  const isQuestionAnswered = useCallback(
    (checkpointId: string, questionId: string): boolean => {
      const checkpointProgress = progress.checkpoints[checkpointId];
      return checkpointProgress?.answers.some((a) => a.questionId === questionId) ?? false;
    },
    [progress]
  );

  // Get the answer for a specific question
  const getQuestionAnswer = useCallback(
    (checkpointId: string, questionId: string): QuestionAnswer | undefined => {
      const checkpointProgress = progress.checkpoints[checkpointId];
      return checkpointProgress?.answers.find((a) => a.questionId === questionId);
    },
    [progress]
  );

  // Check if checkpoint is completed
  const isCheckpointCompleted = useCallback(
    (checkpointId: string): boolean => {
      const checkpointProgress = progress.checkpoints[checkpointId];
      return checkpointProgress?.completedAt !== undefined;
    },
    [progress]
  );

  // Get checkpoint score
  const getCheckpointScore = useCallback(
    (checkpointId: string): number => {
      const checkpointProgress = progress.checkpoints[checkpointId];
      return checkpointProgress?.score ?? 0;
    },
    [progress]
  );

  // Get overall checkpoint stats for a path
  const getPathCheckpointStats = useCallback(
    (pathId: string) => {
      const pathCheckpoints = Object.values(progress.checkpoints).filter(
        (cp) => cp.pathId === pathId
      );

      const completedCheckpoints = pathCheckpoints.filter((cp) => cp.completedAt);
      const totalScore = completedCheckpoints.reduce((sum, cp) => sum + cp.score, 0);

      return {
        totalCheckpoints: pathCheckpoints.length,
        completedCheckpoints: completedCheckpoints.length,
        averageScore:
          completedCheckpoints.length > 0
            ? Math.round(totalScore / completedCheckpoints.length)
            : 0,
      };
    },
    [progress]
  );

  // Reset checkpoint progress
  const resetCheckpointProgress = useCallback(
    (checkpointId: string) => {
      const { [checkpointId]: _, ...remainingCheckpoints } = progress.checkpoints;
      updateProgress({
        ...progress,
        checkpoints: remainingCheckpoints,
      });
    },
    [progress, updateProgress]
  );

  // Reset all progress
  const resetAllProgress = useCallback(() => {
    updateProgress(DEFAULT_STORAGE);
  }, [updateProgress]);

  return useMemo(
    () => ({
      getCheckpointProgress,
      getProgressForPath,
      recordAnswer,
      completeCheckpoint,
      isQuestionAnswered,
      getQuestionAnswer,
      isCheckpointCompleted,
      getCheckpointScore,
      getPathCheckpointStats,
      resetCheckpointProgress,
      resetAllProgress,
    }),
    [
      getCheckpointProgress,
      getProgressForPath,
      recordAnswer,
      completeCheckpoint,
      isQuestionAnswered,
      getQuestionAnswer,
      isCheckpointCompleted,
      getCheckpointScore,
      getPathCheckpointStats,
      resetCheckpointProgress,
      resetAllProgress,
    ]
  );
}

export default useCheckpointProgress;
