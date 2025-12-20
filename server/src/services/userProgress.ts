/**
 * User Progress Service
 *
 * Handles database operations for user learning path and checkpoint progress.
 * Tracks user's journey through learning paths and checkpoint completions.
 *
 * Sprint 38 - User Data Migration
 */

import { prisma } from '../db';

// =============================================================================
// Types
// =============================================================================

/**
 * Path progress response
 */
export interface PathProgressResponse {
  id: string;
  pathSlug: string;
  completedMilestoneIds: string[];
  currentMilestoneId: string | null;
  startedAt: Date;
  completedAt: Date | null;
  percentComplete: number;
}

/**
 * Checkpoint progress response
 */
export interface CheckpointProgressResponse {
  id: string;
  checkpointId: string;
  completed: boolean;
  score: number | null;
  attempts: number;
  lastAttemptAt: Date | null;
  answers: Array<{
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
  }>;
}

/**
 * Answer record for checkpoint submission
 */
export interface AnswerRecord {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

// =============================================================================
// Path Progress Operations
// =============================================================================

/**
 * Get all path progress for a session
 */
export async function getAllPathProgress(
  sessionId: string
): Promise<PathProgressResponse[]> {
  const progress = await prisma.userPathProgress.findMany({
    where: { sessionId },
    orderBy: { startedAt: 'desc' },
  });

  return progress.map((p) => ({
    id: p.id,
    pathSlug: p.pathSlug,
    completedMilestoneIds: JSON.parse(p.completedMilestoneIds) as string[],
    currentMilestoneId: p.currentMilestoneId,
    startedAt: p.startedAt,
    completedAt: p.completedAt,
    percentComplete: calculatePercentComplete(
      JSON.parse(p.completedMilestoneIds) as string[]
    ),
  }));
}

/**
 * Get progress for a specific path
 */
export async function getPathProgress(
  sessionId: string,
  pathSlug: string
): Promise<PathProgressResponse | null> {
  const progress = await prisma.userPathProgress.findUnique({
    where: {
      sessionId_pathSlug: { sessionId, pathSlug },
    },
  });

  if (!progress) return null;

  const completedIds = JSON.parse(progress.completedMilestoneIds) as string[];

  return {
    id: progress.id,
    pathSlug: progress.pathSlug,
    completedMilestoneIds: completedIds,
    currentMilestoneId: progress.currentMilestoneId,
    startedAt: progress.startedAt,
    completedAt: progress.completedAt,
    percentComplete: calculatePercentComplete(completedIds),
  };
}

/**
 * Start or update path progress
 */
export async function updatePathProgress(
  sessionId: string,
  pathSlug: string,
  data: {
    completedMilestoneIds?: string[];
    currentMilestoneId?: string | null;
    completed?: boolean;
  }
): Promise<PathProgressResponse> {
  // Get existing progress or create new
  const existing = await prisma.userPathProgress.findUnique({
    where: {
      sessionId_pathSlug: { sessionId, pathSlug },
    },
  });

  let completedIds: string[] = [];
  if (existing) {
    completedIds = JSON.parse(existing.completedMilestoneIds) as string[];
  }

  // Merge new completed milestones with existing
  if (data.completedMilestoneIds) {
    completedIds = [...new Set([...completedIds, ...data.completedMilestoneIds])];
  }

  const updateData: {
    completedMilestoneIds: string;
    currentMilestoneId?: string | null;
    completedAt?: Date | null;
  } = {
    completedMilestoneIds: JSON.stringify(completedIds),
  };

  if (data.currentMilestoneId !== undefined) {
    updateData.currentMilestoneId = data.currentMilestoneId;
  }

  if (data.completed) {
    updateData.completedAt = new Date();
  }

  const progress = await prisma.userPathProgress.upsert({
    where: {
      sessionId_pathSlug: { sessionId, pathSlug },
    },
    create: {
      sessionId,
      pathSlug,
      completedMilestoneIds: JSON.stringify(completedIds),
      currentMilestoneId: data.currentMilestoneId ?? null,
      completedAt: data.completed ? new Date() : null,
    },
    update: updateData,
  });

  return {
    id: progress.id,
    pathSlug: progress.pathSlug,
    completedMilestoneIds: JSON.parse(progress.completedMilestoneIds) as string[],
    currentMilestoneId: progress.currentMilestoneId,
    startedAt: progress.startedAt,
    completedAt: progress.completedAt,
    percentComplete: calculatePercentComplete(completedIds),
  };
}

/**
 * Mark a milestone as completed in a path
 */
export async function completeMilestone(
  sessionId: string,
  pathSlug: string,
  milestoneId: string
): Promise<PathProgressResponse> {
  return updatePathProgress(sessionId, pathSlug, {
    completedMilestoneIds: [milestoneId],
  });
}

/**
 * Reset path progress
 */
export async function resetPathProgress(
  sessionId: string,
  pathSlug: string
): Promise<boolean> {
  const result = await prisma.userPathProgress.deleteMany({
    where: { sessionId, pathSlug },
  });
  return result.count > 0;
}

// =============================================================================
// Checkpoint Progress Operations
// =============================================================================

/**
 * Get all checkpoint progress for a session
 */
export async function getAllCheckpointProgress(
  sessionId: string
): Promise<CheckpointProgressResponse[]> {
  const progress = await prisma.userCheckpointProgress.findMany({
    where: { sessionId },
    orderBy: { lastAttemptAt: 'desc' },
  });

  return progress.map((p) => ({
    id: p.id,
    checkpointId: p.checkpointId,
    completed: p.completed,
    score: p.score,
    attempts: p.attempts,
    lastAttemptAt: p.lastAttemptAt,
    answers: JSON.parse(p.answers) as AnswerRecord[],
  }));
}

/**
 * Get progress for a specific checkpoint
 */
export async function getCheckpointProgress(
  sessionId: string,
  checkpointId: string
): Promise<CheckpointProgressResponse | null> {
  const progress = await prisma.userCheckpointProgress.findUnique({
    where: {
      sessionId_checkpointId: { sessionId, checkpointId },
    },
  });

  if (!progress) return null;

  return {
    id: progress.id,
    checkpointId: progress.checkpointId,
    completed: progress.completed,
    score: progress.score,
    attempts: progress.attempts,
    lastAttemptAt: progress.lastAttemptAt,
    answers: JSON.parse(progress.answers) as AnswerRecord[],
  };
}

/**
 * Submit checkpoint answers and calculate score
 */
export async function submitCheckpoint(
  sessionId: string,
  checkpointId: string,
  answers: AnswerRecord[]
): Promise<CheckpointProgressResponse> {
  // Calculate score
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const score = Math.round((correctCount / answers.length) * 100);
  const completed = score >= 70; // Pass threshold is 70%

  // Get existing progress for attempt count
  const existing = await prisma.userCheckpointProgress.findUnique({
    where: {
      sessionId_checkpointId: { sessionId, checkpointId },
    },
  });

  const attempts = (existing?.attempts ?? 0) + 1;

  const progress = await prisma.userCheckpointProgress.upsert({
    where: {
      sessionId_checkpointId: { sessionId, checkpointId },
    },
    create: {
      sessionId,
      checkpointId,
      completed,
      score,
      attempts: 1,
      lastAttemptAt: new Date(),
      answers: JSON.stringify(answers),
    },
    update: {
      completed: existing?.completed || completed, // Don't un-complete if already passed
      score: Math.max(existing?.score ?? 0, score), // Keep best score
      attempts,
      lastAttemptAt: new Date(),
      answers: JSON.stringify(answers),
    },
  });

  return {
    id: progress.id,
    checkpointId: progress.checkpointId,
    completed: progress.completed,
    score: progress.score,
    attempts: progress.attempts,
    lastAttemptAt: progress.lastAttemptAt,
    answers: JSON.parse(progress.answers) as AnswerRecord[],
  };
}

/**
 * Reset checkpoint progress
 */
export async function resetCheckpointProgress(
  sessionId: string,
  checkpointId: string
): Promise<boolean> {
  const result = await prisma.userCheckpointProgress.deleteMany({
    where: { sessionId, checkpointId },
  });
  return result.count > 0;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate percent complete based on completed milestones.
 * This is a simplified calculation - in production, we'd need
 * the total milestone count from the path definition.
 */
function calculatePercentComplete(completedMilestoneIds: string[]): number {
  // For now, return the count of completed milestones
  // The frontend can calculate actual percentage using path definition
  return completedMilestoneIds.length;
}

/**
 * Check if session exists
 */
export async function sessionExists(sessionId: string): Promise<boolean> {
  const session = await prisma.userSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  return session !== null;
}
