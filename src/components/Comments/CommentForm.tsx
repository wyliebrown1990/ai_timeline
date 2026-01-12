/**
 * CommentForm Component
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 *
 * Form for creating new comments or replies
 */

import { useState } from 'react';
import { Send, X } from 'lucide-react';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { createComment } from '../../services/commentsApi';
import type { Comment, CommentTargetType } from '../../types/comment';
import { cn } from '../../lib/utils';

interface CommentFormProps {
  targetType: CommentTargetType;
  targetId: string;
  parentId?: string;
  onCommentCreated: (comment: Comment) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function CommentForm({
  targetType,
  targetId,
  parentId,
  onCommentCreated,
  onCancel,
  placeholder = 'Write a comment...',
  autoFocus = false,
  className,
}: CommentFormProps) {
  const { isAuthenticated, user } = useUserAuth();
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim() || !isAuthenticated) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const comment = await createComment({
        targetType,
        targetId,
        parentId,
        body: body.trim(),
      });

      setBody('');
      onCommentCreated(comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        className={cn(
          'p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center',
          className
        )}
      >
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          <a
            href="/login"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign in
          </a>{' '}
          to join the discussion
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-2', className)}>
      <div className="flex items-start gap-3">
        {/* User avatar */}
        <div className="flex-shrink-0">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName || user.username}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {(user?.displayName ?? user?.username ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Text area */}
        <div className="flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            disabled={isSubmitting}
            className={cn(
              'w-full px-3 py-2 border rounded-lg resize-none',
              'bg-white dark:bg-gray-800',
              'border-gray-300 dark:border-gray-600',
              'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'text-gray-900 dark:text-gray-100',
              'disabled:opacity-50',
              parentId ? 'min-h-[80px]' : 'min-h-[100px]'
            )}
            rows={parentId ? 2 : 3}
          />

          {error && (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 mt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className={cn(
                  'px-3 py-1.5 text-sm rounded',
                  'text-gray-600 dark:text-gray-400',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'disabled:opacity-50'
                )}
              >
                <X className="w-4 h-4 inline mr-1" />
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !body.trim()}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded',
                'bg-blue-600 text-white',
                'hover:bg-blue-700',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-1.5'
              )}
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Posting...' : parentId ? 'Reply' : 'Comment'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
