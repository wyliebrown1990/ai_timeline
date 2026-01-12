/**
 * Comment Types
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 */

import { z } from 'zod';

// Target types that can have comments
export const CommentTargetTypeSchema = z.enum([
  'milestone',
  'news_event',
  'glossary_term',
  'person',
  'organization',
]);

export type CommentTargetType = z.infer<typeof CommentTargetTypeSchema>;

// Sort modes for comments
export const CommentSortModeSchema = z.enum(['best', 'new', 'controversial']);
export type CommentSortMode = z.infer<typeof CommentSortModeSchema>;

// Report reasons
export const CommentReportReasonSchema = z.enum([
  'spam',
  'harassment',
  'misinformation',
  'off_topic',
  'other',
]);
export type CommentReportReason = z.infer<typeof CommentReportReasonSchema>;

// Comment author (minimal user info)
export const CommentAuthorSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export type CommentAuthor = z.infer<typeof CommentAuthorSchema>;

// Comment schema
export const CommentSchema: z.ZodType<Comment> = z.object({
  id: z.string(),
  authorId: z.string(),
  author: CommentAuthorSchema,
  body: z.string(),
  bodyHtml: z.string().nullable(),
  parentId: z.string().nullable(),
  depth: z.number(),
  targetType: CommentTargetTypeSchema,
  targetId: z.string(),
  upvotes: z.number(),
  downvotes: z.number(),
  score: z.number(),
  hotScore: z.number(),
  controversyScore: z.number(),
  isDeleted: z.boolean(),
  isHidden: z.boolean(),
  reportCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  editedAt: z.string().nullable(),
  userVote: z.number().nullable().optional(),
  replies: z.lazy(() => z.array(CommentSchema)).optional(),
});

export interface Comment {
  id: string;
  authorId: string;
  author: CommentAuthor;
  body: string;
  bodyHtml: string | null;
  parentId: string | null;
  depth: number;
  targetType: CommentTargetType;
  targetId: string;
  upvotes: number;
  downvotes: number;
  score: number;
  hotScore: number;
  controversyScore: number;
  isDeleted: boolean;
  isHidden: boolean;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  userVote?: number | null;
  replies?: Comment[];
}

// Input types
export interface CreateCommentInput {
  targetType: CommentTargetType;
  targetId: string;
  parentId?: string;
  body: string;
}

export interface UpdateCommentInput {
  body: string;
}

export interface VoteInput {
  value: 1 | -1 | 0;
}

export interface ReportCommentInput {
  reason: CommentReportReason;
  details?: string;
}

// Response types
export interface CommentsResponse {
  comments: Comment[];
  total: number;
}

export interface VoteResponse {
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: number | null;
}

export interface CommentCountResponse {
  count: number;
}
