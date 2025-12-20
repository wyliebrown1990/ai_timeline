import { prisma } from '../db';
import type { LearningPath, Checkpoint } from '@prisma/client';

export interface LearningPathDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  targetAudience: string;
  milestoneIds: string[];
  estimatedMinutes: number;
  difficulty: string;
  suggestedNextPathIds: string[];
  keyTakeaways: string[];
  conceptsCovered: string[];
  icon: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningPathWithCheckpoints extends LearningPathDto {
  checkpoints: CheckpointDto[];
}

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

function formatPath(path: LearningPath): LearningPathDto {
  return {
    id: path.slug, // Use slug as public ID for backwards compatibility
    slug: path.slug,
    title: path.title,
    description: path.description,
    targetAudience: path.targetAudience,
    milestoneIds: JSON.parse(path.milestoneIds || '[]'),
    estimatedMinutes: path.estimatedMinutes,
    difficulty: path.difficulty,
    suggestedNextPathIds: JSON.parse(path.suggestedNextPathIds || '[]'),
    keyTakeaways: JSON.parse(path.keyTakeaways || '[]'),
    conceptsCovered: JSON.parse(path.conceptsCovered || '[]'),
    icon: path.icon,
    sortOrder: path.sortOrder,
    isPublished: path.isPublished,
    createdAt: path.createdAt,
    updatedAt: path.updatedAt,
  };
}

function formatCheckpoint(checkpoint: Checkpoint, pathSlug: string): CheckpointDto {
  return {
    id: checkpoint.id,
    title: checkpoint.title,
    pathId: pathSlug, // Use slug for frontend compatibility
    afterMilestoneId: checkpoint.afterMilestoneId,
    questions: JSON.parse(checkpoint.questions || '[]'),
    sortOrder: checkpoint.sortOrder,
    createdAt: checkpoint.createdAt,
    updatedAt: checkpoint.updatedAt,
  };
}

/**
 * Get all published learning paths
 */
export async function getAll(options?: {
  difficulty?: string;
  includeUnpublished?: boolean;
}): Promise<LearningPathDto[]> {
  const where: Record<string, unknown> = {};

  if (!options?.includeUnpublished) {
    where.isPublished = true;
  }

  if (options?.difficulty) {
    where.difficulty = options.difficulty;
  }

  const paths = await prisma.learningPath.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  });

  return paths.map(formatPath);
}

/**
 * Get a learning path by slug with its checkpoints
 */
export async function getBySlug(slug: string): Promise<LearningPathWithCheckpoints | null> {
  const path = await prisma.learningPath.findUnique({
    where: { slug },
    include: {
      checkpoints: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!path) {
    return null;
  }

  return {
    ...formatPath(path),
    checkpoints: path.checkpoints.map((cp) => formatCheckpoint(cp, path.slug)),
  };
}

/**
 * Get paths by difficulty level
 */
export async function getByDifficulty(difficulty: string): Promise<LearningPathDto[]> {
  const paths = await prisma.learningPath.findMany({
    where: {
      difficulty,
      isPublished: true,
    },
    orderBy: { sortOrder: 'asc' },
  });

  return paths.map(formatPath);
}

export interface CreateLearningPathInput {
  slug: string;
  title: string;
  description: string;
  targetAudience: string;
  milestoneIds?: string[];
  estimatedMinutes: number;
  difficulty: string;
  suggestedNextPathIds?: string[];
  keyTakeaways?: string[];
  conceptsCovered?: string[];
  icon?: string;
  sortOrder?: number;
}

/**
 * Create a new learning path
 */
export async function create(data: CreateLearningPathInput): Promise<LearningPathDto> {
  const path = await prisma.learningPath.create({
    data: {
      slug: data.slug,
      title: data.title,
      description: data.description,
      targetAudience: data.targetAudience,
      milestoneIds: JSON.stringify(data.milestoneIds || []),
      estimatedMinutes: data.estimatedMinutes,
      difficulty: data.difficulty,
      suggestedNextPathIds: JSON.stringify(data.suggestedNextPathIds || []),
      keyTakeaways: JSON.stringify(data.keyTakeaways || []),
      conceptsCovered: JSON.stringify(data.conceptsCovered || []),
      icon: data.icon || null,
      sortOrder: data.sortOrder ?? 0,
    },
  });

  return formatPath(path);
}

export interface UpdateLearningPathInput {
  title?: string;
  description?: string;
  targetAudience?: string;
  milestoneIds?: string[];
  estimatedMinutes?: number;
  difficulty?: string;
  suggestedNextPathIds?: string[];
  keyTakeaways?: string[];
  conceptsCovered?: string[];
  icon?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
}

/**
 * Update an existing learning path
 */
export async function update(slug: string, data: UpdateLearningPathInput): Promise<LearningPathDto | null> {
  const existing = await prisma.learningPath.findUnique({ where: { slug } });
  if (!existing) {
    return null;
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.targetAudience !== undefined) updateData.targetAudience = data.targetAudience;
  if (data.milestoneIds !== undefined) updateData.milestoneIds = JSON.stringify(data.milestoneIds);
  if (data.estimatedMinutes !== undefined) updateData.estimatedMinutes = data.estimatedMinutes;
  if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
  if (data.suggestedNextPathIds !== undefined) updateData.suggestedNextPathIds = JSON.stringify(data.suggestedNextPathIds);
  if (data.keyTakeaways !== undefined) updateData.keyTakeaways = JSON.stringify(data.keyTakeaways);
  if (data.conceptsCovered !== undefined) updateData.conceptsCovered = JSON.stringify(data.conceptsCovered);
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

  const path = await prisma.learningPath.update({
    where: { slug },
    data: updateData,
  });

  return formatPath(path);
}

/**
 * Delete a learning path
 */
export async function remove(slug: string): Promise<boolean> {
  try {
    await prisma.learningPath.delete({ where: { slug } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Bulk create learning paths (for seeding)
 */
export async function bulkCreate(paths: CreateLearningPathInput[]): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const pathData of paths) {
    const existing = await prisma.learningPath.findUnique({
      where: { slug: pathData.slug },
    });

    const data = {
      slug: pathData.slug,
      title: pathData.title,
      description: pathData.description,
      targetAudience: pathData.targetAudience,
      milestoneIds: JSON.stringify(pathData.milestoneIds || []),
      estimatedMinutes: pathData.estimatedMinutes,
      difficulty: pathData.difficulty,
      suggestedNextPathIds: JSON.stringify(pathData.suggestedNextPathIds || []),
      keyTakeaways: JSON.stringify(pathData.keyTakeaways || []),
      conceptsCovered: JSON.stringify(pathData.conceptsCovered || []),
      icon: pathData.icon || null,
      sortOrder: pathData.sortOrder ?? 0,
    };

    if (existing) {
      await prisma.learningPath.update({
        where: { slug: pathData.slug },
        data,
      });
      updated++;
    } else {
      await prisma.learningPath.create({ data });
      created++;
    }
  }

  return { created, updated };
}
