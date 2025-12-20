import { prisma } from '../db';
import type { Checkpoint, LearningPath } from '@prisma/client';

export interface CheckpointDto {
  id: string;
  title: string;
  pathId: string;
  afterMilestoneId: string;
  questions: unknown[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

function formatCheckpoint(checkpoint: Checkpoint & { path?: LearningPath }): CheckpointDto {
  return {
    id: checkpoint.id,
    title: checkpoint.title,
    pathId: checkpoint.path?.slug || checkpoint.pathId,
    afterMilestoneId: checkpoint.afterMilestoneId,
    questions: JSON.parse(checkpoint.questions || '[]'),
    sortOrder: checkpoint.sortOrder,
    createdAt: checkpoint.createdAt,
    updatedAt: checkpoint.updatedAt,
  };
}

/**
 * Get checkpoints for a learning path by slug
 */
export async function getForPath(pathSlug: string): Promise<CheckpointDto[]> {
  const path = await prisma.learningPath.findUnique({
    where: { slug: pathSlug },
  });

  if (!path) {
    return [];
  }

  const checkpoints = await prisma.checkpoint.findMany({
    where: { pathId: path.id },
    orderBy: { sortOrder: 'asc' },
    include: { path: true },
  });

  return checkpoints.map(formatCheckpoint);
}

/**
 * Get a single checkpoint by ID
 */
export async function getById(id: string): Promise<CheckpointDto | null> {
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id },
    include: { path: true },
  });

  if (!checkpoint) {
    return null;
  }

  return formatCheckpoint(checkpoint);
}

export interface CreateCheckpointInput {
  title: string;
  pathSlug: string;
  afterMilestoneId: string;
  questions?: unknown[];
  sortOrder?: number;
}

/**
 * Create a new checkpoint
 */
export async function create(data: CreateCheckpointInput): Promise<CheckpointDto | null> {
  const path = await prisma.learningPath.findUnique({
    where: { slug: data.pathSlug },
  });

  if (!path) {
    return null;
  }

  const checkpoint = await prisma.checkpoint.create({
    data: {
      title: data.title,
      pathId: path.id,
      afterMilestoneId: data.afterMilestoneId,
      questions: JSON.stringify(data.questions || []),
      sortOrder: data.sortOrder ?? 0,
    },
    include: { path: true },
  });

  return formatCheckpoint(checkpoint);
}

export interface UpdateCheckpointInput {
  title?: string;
  afterMilestoneId?: string;
  questions?: unknown[];
  sortOrder?: number;
}

/**
 * Update an existing checkpoint
 */
export async function update(id: string, data: UpdateCheckpointInput): Promise<CheckpointDto | null> {
  const existing = await prisma.checkpoint.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.afterMilestoneId !== undefined) updateData.afterMilestoneId = data.afterMilestoneId;
  if (data.questions !== undefined) updateData.questions = JSON.stringify(data.questions);
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  const checkpoint = await prisma.checkpoint.update({
    where: { id },
    data: updateData,
    include: { path: true },
  });

  return formatCheckpoint(checkpoint);
}

/**
 * Delete a checkpoint
 */
export async function remove(id: string): Promise<boolean> {
  try {
    await prisma.checkpoint.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export interface BulkCheckpointInput {
  title: string;
  pathSlug: string;
  afterMilestoneId: string;
  questions: unknown[];
  sortOrder?: number;
}

/**
 * Bulk create checkpoints (for seeding)
 */
export async function bulkCreate(checkpoints: BulkCheckpointInput[]): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < checkpoints.length; i++) {
    const cp = checkpoints[i];

    const path = await prisma.learningPath.findUnique({
      where: { slug: cp.pathSlug },
    });

    if (!path) {
      console.log(`Skipping checkpoint "${cp.title}" - path "${cp.pathSlug}" not found`);
      skipped++;
      continue;
    }

    // Check for existing checkpoint
    const existing = await prisma.checkpoint.findFirst({
      where: {
        pathId: path.id,
        afterMilestoneId: cp.afterMilestoneId,
      },
    });

    if (existing) {
      console.log(`Skipping checkpoint "${cp.title}" - already exists`);
      skipped++;
      continue;
    }

    await prisma.checkpoint.create({
      data: {
        title: cp.title,
        pathId: path.id,
        afterMilestoneId: cp.afterMilestoneId,
        questions: JSON.stringify(cp.questions),
        sortOrder: cp.sortOrder ?? i,
      },
    });

    created++;
  }

  return { created, skipped };
}
