/**
 * Comments API Service
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 */

import type {
  Comment,
  CommentsResponse,
  CreateCommentInput,
  UpdateCommentInput,
  VoteResponse,
  CommentCountResponse,
  CommentTargetType,
  CommentSortMode,
  CommentReportReason,
} from '../types/comment';

const API_BASE = import.meta.env.VITE_DYNAMIC_API_URL || '/api';

// Token storage key (must match userAuth.ts)
const ACCESS_TOKEN_KEY = 'ai-timeline-user-token';

/**
 * Get auth headers for authenticated requests
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Get comments for a target (milestone, person, etc.)
 */
export async function getComments(
  targetType: CommentTargetType,
  targetId: string,
  options?: {
    sort?: CommentSortMode;
    limit?: number;
    offset?: number;
  }
): Promise<CommentsResponse> {
  const params = new URLSearchParams();
  if (options?.sort) params.set('sort', options.sort);
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());

  const url = `${API_BASE}/comments/${targetType}/${targetId}${params.toString() ? `?${params}` : ''}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch comments');
  }

  return response.json();
}

/**
 * Get comment count for a target
 */
export async function getCommentCount(
  targetType: CommentTargetType,
  targetId: string
): Promise<number> {
  const response = await fetch(
    `${API_BASE}/comments/count/${targetType}/${targetId}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch comment count');
  }

  const data: CommentCountResponse = await response.json();
  return data.count;
}

/**
 * Get a user's comment history
 */
export async function getUserComments(
  username: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<CommentsResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());

  const url = `${API_BASE}/comments/user/${username}${params.toString() ? `?${params}` : ''}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch user comments');
  }

  return response.json();
}

/**
 * Create a new comment
 */
export async function createComment(input: CreateCommentInput): Promise<Comment> {
  const response = await fetch(`${API_BASE}/comments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create comment');
  }

  return response.json();
}

/**
 * Update a comment (author only)
 */
export async function updateComment(
  commentId: string,
  input: UpdateCommentInput
): Promise<Comment> {
  const response = await fetch(`${API_BASE}/comments/${commentId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update comment');
  }

  return response.json();
}

/**
 * Delete a comment (author only)
 */
export async function deleteComment(commentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/comments/${commentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to delete comment');
  }
}

/**
 * Vote on a comment
 * @param value 1 for upvote, -1 for downvote, 0 to remove vote
 */
export async function voteOnComment(
  commentId: string,
  value: 1 | -1 | 0
): Promise<VoteResponse> {
  const response = await fetch(`${API_BASE}/comments/${commentId}/vote`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ value }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to vote on comment');
  }

  return response.json();
}

/**
 * Report a comment
 */
export async function reportComment(
  commentId: string,
  reason: CommentReportReason,
  details?: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/comments/${commentId}/report`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ reason, details }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to report comment');
  }
}

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Reported comment with additional report info
 */
export interface ReportedComment extends Comment {
  reports: CommentReport[];
}

export interface CommentReport {
  id: string;
  reason: CommentReportReason;
  details: string | null;
  reporterId: string;
  reporter: {
    username: string;
  };
  createdAt: string;
}

export interface ReportedCommentsResponse {
  comments: ReportedComment[];
  total: number;
}

/**
 * Get reported comments for admin moderation
 */
export async function getReportedComments(
  options?: {
    limit?: number;
    offset?: number;
    minReports?: number;
  }
): Promise<ReportedCommentsResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  if (options?.minReports) params.set('minReports', options.minReports.toString());

  const url = `${API_BASE}/admin/comments/reported${params.toString() ? `?${params}` : ''}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch reported comments');
  }

  return response.json();
}

/**
 * Hide a comment (admin only)
 */
export async function hideComment(commentId: string): Promise<Comment> {
  const response = await fetch(`${API_BASE}/admin/comments/${commentId}/hide`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to hide comment');
  }

  return response.json();
}

/**
 * Unhide a comment (admin only)
 */
export async function unhideComment(commentId: string): Promise<Comment> {
  const response = await fetch(`${API_BASE}/admin/comments/${commentId}/unhide`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to unhide comment');
  }

  return response.json();
}

/**
 * Force delete a comment (admin only)
 */
export async function adminDeleteComment(commentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/comments/${commentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to delete comment');
  }
}

/**
 * Dismiss reports for a comment (admin only)
 */
export async function dismissReports(commentId: string): Promise<Comment> {
  const response = await fetch(`${API_BASE}/admin/comments/${commentId}/dismiss-reports`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to dismiss reports');
  }

  return response.json();
}
