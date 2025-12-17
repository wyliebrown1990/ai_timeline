import { z } from 'zod';

/**
 * Checkpoint Types
 *
 * Checkpoints are interactive knowledge checks placed within learning paths.
 * They support multiple question types: multiple choice, ordering, matching,
 * and open-ended "explain back" questions.
 */

// =============================================================================
// Question Types
// =============================================================================

/**
 * Multiple choice question - select one correct answer from four options
 */
export const MultipleChoiceQuestionSchema = z.object({
  type: z.literal('multiple_choice'),
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string()).length(4), // Exactly 4 options
  correctIndex: z.number().min(0).max(3), // Index of correct answer (0-3)
  explanation: z.string().min(1), // Why this answer is correct
});

export type MultipleChoiceQuestion = z.infer<typeof MultipleChoiceQuestionSchema>;

/**
 * Item in an ordering question
 */
export const OrderingItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  date: z.string().optional(), // Optional date hint for chronological ordering
});

export type OrderingItem = z.infer<typeof OrderingItemSchema>;

/**
 * Ordering question - arrange items in correct sequence (e.g., chronological order)
 */
export const OrderingQuestionSchema = z.object({
  type: z.literal('ordering'),
  id: z.string().min(1),
  prompt: z.string().min(1),
  items: z.array(OrderingItemSchema).min(3).max(6), // 3-6 items to order
  correctOrder: z.array(z.string()).min(3).max(6), // Array of item IDs in correct order
});

export type OrderingQuestion = z.infer<typeof OrderingQuestionSchema>;

/**
 * Pair in a matching question
 */
export const MatchingPairSchema = z.object({
  id: z.string().min(1),
  left: z.string().min(1),  // Term/concept
  right: z.string().min(1), // Definition/match
});

export type MatchingPair = z.infer<typeof MatchingPairSchema>;

/**
 * Matching question - connect items from two columns
 */
export const MatchingQuestionSchema = z.object({
  type: z.literal('matching'),
  id: z.string().min(1),
  prompt: z.string().min(1),
  pairs: z.array(MatchingPairSchema).min(3).max(6), // 3-6 pairs to match
});

export type MatchingQuestion = z.infer<typeof MatchingQuestionSchema>;

/**
 * Explain back question - open-ended explanation evaluated by AI
 */
export const ExplainBackQuestionSchema = z.object({
  type: z.literal('explain_back'),
  id: z.string().min(1),
  concept: z.string().min(1),      // The concept being explained
  prompt: z.string().min(1),        // The question/prompt for the user
  rubric: z.string().min(1),        // Evaluation rubric sent to AI for scoring
});

export type ExplainBackQuestion = z.infer<typeof ExplainBackQuestionSchema>;

/**
 * Discriminated union of all question types
 * Use this for arrays that can contain any question type
 */
export const QuestionSchema = z.discriminatedUnion('type', [
  MultipleChoiceQuestionSchema,
  OrderingQuestionSchema,
  MatchingQuestionSchema,
  ExplainBackQuestionSchema,
]);

export type Question = z.infer<typeof QuestionSchema>;

// =============================================================================
// Checkpoint Schema
// =============================================================================

/**
 * Checkpoint schema
 * A checkpoint is placed after a milestone in a learning path and contains 1-5 questions
 */
export const CheckpointSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  pathId: z.string().min(1),            // ID of the learning path this belongs to
  afterMilestoneId: z.string().min(1),  // Milestone ID this checkpoint follows
  questions: z.array(QuestionSchema).min(1).max(5), // 1-5 questions per checkpoint
});

export type Checkpoint = z.infer<typeof CheckpointSchema>;

/**
 * Schema for an array of checkpoints
 */
export const CheckpointArraySchema = z.array(CheckpointSchema);

// =============================================================================
// Flashcard Schema
// =============================================================================

/**
 * Flashcard schema
 * Simple term/definition cards for spaced repetition learning
 */
export const FlashcardSchema = z.object({
  id: z.string().min(1),
  term: z.string().min(1),
  definition: z.string().min(1),
  category: z.string().min(1),
  relatedMilestoneIds: z.array(z.string()).default([]),
});

export type Flashcard = z.infer<typeof FlashcardSchema>;

/**
 * Schema for an array of flashcards
 */
export const FlashcardArraySchema = z.array(FlashcardSchema);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validate a single question (any type)
 */
export function validateQuestion(data: unknown): Question {
  return QuestionSchema.parse(data);
}

/**
 * Safely validate a question
 */
export function safeParseQuestion(data: unknown) {
  return QuestionSchema.safeParse(data);
}

/**
 * Validate a single checkpoint
 */
export function validateCheckpoint(data: unknown): Checkpoint {
  return CheckpointSchema.parse(data);
}

/**
 * Safely validate a checkpoint
 */
export function safeParseCheckpoint(data: unknown) {
  return CheckpointSchema.safeParse(data);
}

/**
 * Validate a single flashcard
 */
export function validateFlashcard(data: unknown): Flashcard {
  return FlashcardSchema.parse(data);
}

/**
 * Safely validate a flashcard
 */
export function safeParseFlashcard(data: unknown) {
  return FlashcardSchema.safeParse(data);
}

/**
 * Type guard to check if a question is multiple choice
 */
export function isMultipleChoice(q: Question): q is MultipleChoiceQuestion {
  return q.type === 'multiple_choice';
}

/**
 * Type guard to check if a question is ordering
 */
export function isOrdering(q: Question): q is OrderingQuestion {
  return q.type === 'ordering';
}

/**
 * Type guard to check if a question is matching
 */
export function isMatching(q: Question): q is MatchingQuestion {
  return q.type === 'matching';
}

/**
 * Type guard to check if a question is explain back
 */
export function isExplainBack(q: Question): q is ExplainBackQuestion {
  return q.type === 'explain_back';
}

/**
 * All question types as a readonly array
 */
export const QUESTION_TYPES = [
  'multiple_choice',
  'ordering',
  'matching',
  'explain_back',
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];
