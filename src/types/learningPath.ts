import { z } from 'zod';

/**
 * Learning Path Types
 *
 * Learning paths are curated sequences of milestones that guide users through
 * specific topics or narratives in AI history (e.g., "The ChatGPT Story",
 * "AI Fundamentals", "AI for Business").
 */

/**
 * Difficulty levels for learning paths
 */
export const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type Difficulty = z.infer<typeof DifficultySchema>;

/**
 * Main LearningPath schema
 * Defines a curated path through AI history milestones
 */
export const LearningPathSchema = z.object({
  // Unique identifier (e.g., "chatgpt-story", "ai-fundamentals")
  id: z.string().min(1),

  // Display title (e.g., "The ChatGPT Story")
  title: z.string().min(1).max(100),

  // Brief description of what the path covers
  description: z.string().min(10).max(500),

  // Who this path is designed for (e.g., "Business professionals new to AI")
  targetAudience: z.string().min(1),

  // Ordered array of milestone IDs that make up this path
  milestoneIds: z.array(z.string()).min(3),

  // Estimated time to complete the path in minutes
  estimatedMinutes: z.number().min(5).max(120),

  // Difficulty level for the content
  difficulty: DifficultySchema,

  // IDs of paths to recommend after completing this one
  suggestedNextPathIds: z.array(z.string()).default([]),

  // Key learnings users will gain (3-5 points)
  keyTakeaways: z.array(z.string()).min(3).max(5),

  // Concepts covered in this path (for filtering/search)
  conceptsCovered: z.array(z.string()),

  // Optional icon (emoji or icon name) for UI display
  icon: z.string().optional(),
});

export type LearningPath = z.infer<typeof LearningPathSchema>;

/**
 * Schema for an array of learning paths (for bulk validation)
 */
export const LearningPathArraySchema = z.array(LearningPathSchema);

/**
 * Helper to validate a single learning path
 */
export function validateLearningPath(data: unknown): LearningPath {
  return LearningPathSchema.parse(data);
}

/**
 * Helper to safely validate a learning path (returns result object)
 */
export function safeParseLearningPath(data: unknown) {
  return LearningPathSchema.safeParse(data);
}
