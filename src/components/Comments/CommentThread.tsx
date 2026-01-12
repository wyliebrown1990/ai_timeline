/**
 * CommentThread Component
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 *
 * Main container for comments on any content type
 */

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { Comment } from './Comment';
import { CommentForm } from './CommentForm';
import { SortSelector } from './SortSelector';
import { getComments } from '../../services/commentsApi';
import type { Comment as CommentType, CommentTargetType, CommentSortMode } from '../../types/comment';
import { cn } from '../../lib/utils';

interface CommentThreadProps {
  targetType: CommentTargetType;
  targetId: string;
  className?: string;
}

export function CommentThread({ targetType, targetId, className }: CommentThreadProps) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<CommentSortMode>('best');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const LIMIT = 25;

  const fetchComments = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;

    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    setError(null);

    try {
      const result = await getComments(targetType, targetId, {
        sort: sortBy,
        limit: LIMIT,
        offset: currentOffset,
      });

      if (reset) {
        setComments(result.comments);
      } else {
        setComments((prev) => [...prev, ...result.comments]);
      }

      setTotal(result.total);
      setOffset(currentOffset + result.comments.length);
      setHasMore(currentOffset + result.comments.length < result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [targetType, targetId, sortBy, offset]);

  // Fetch comments on mount and when sort changes
  useEffect(() => {
    setOffset(0);
    fetchComments(true);
  }, [targetType, targetId, sortBy]);

  // Handle new comment created
  const handleCommentCreated = (comment: CommentType) => {
    setComments((prev) => [comment, ...prev]);
    setTotal((prev) => prev + 1);
  };

  // Handle comment updated
  const handleCommentUpdate = (updatedComment: CommentType) => {
    const updateInTree = (comments: CommentType[]): CommentType[] => {
      return comments.map((c) => {
        if (c.id === updatedComment.id) {
          return { ...c, ...updatedComment };
        }
        if (c.replies) {
          return { ...c, replies: updateInTree(c.replies) };
        }
        return c;
      });
    };

    setComments((prev) => updateInTree(prev));
  };

  // Handle comment deleted
  const handleCommentDelete = (commentId: string) => {
    const markDeleted = (comments: CommentType[]): CommentType[] => {
      return comments.map((c) => {
        if (c.id === commentId) {
          return { ...c, isDeleted: true, body: '[deleted]' };
        }
        if (c.replies) {
          return { ...c, replies: markDeleted(c.replies) };
        }
        return c;
      });
    };

    setComments((prev) => markDeleted(prev));
  };

  // Handle reply created
  const handleReplyCreated = (parentId: string, reply: CommentType) => {
    const addReply = (comments: CommentType[]): CommentType[] => {
      return comments.map((c) => {
        if (c.id === parentId) {
          return {
            ...c,
            replies: [...(c.replies || []), reply],
          };
        }
        if (c.replies) {
          return { ...c, replies: addReply(c.replies) };
        }
        return c;
      });
    };

    setComments((prev) => addReply(prev));
    setTotal((prev) => prev + 1);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments
          {total > 0 && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({total})
            </span>
          )}
        </h3>

        {comments.length > 0 && (
          <SortSelector value={sortBy} onChange={setSortBy} />
        )}
      </div>

      {/* Comment form */}
      <CommentForm
        targetType={targetType}
        targetId={targetId}
        onCommentCreated={handleCommentCreated}
        placeholder="Share your thoughts..."
      />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && comments.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No comments yet. Be the first to share your thoughts!</p>
        </div>
      )}

      {/* Comments list */}
      {!isLoading && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              targetType={targetType}
              targetId={targetId}
              onCommentUpdate={handleCommentUpdate}
              onCommentDelete={handleCommentDelete}
              onReplyCreated={handleReplyCreated}
            />
          ))}
        </div>
      )}

      {/* Load more button */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => fetchComments(false)}
            disabled={isLoadingMore}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'text-blue-600 dark:text-blue-400',
              'hover:bg-blue-50 dark:hover:bg-blue-900/20',
              'disabled:opacity-50'
            )}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                Loading...
              </>
            ) : (
              `Load more comments (${total - comments.length} remaining)`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
