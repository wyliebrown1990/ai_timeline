/**
 * CommentForm Component
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 * Sprint Spam-1 - Rate Limiting & Honeypot Protection
 *
 * Form for creating new comments or replies
 */

import { useState, useRef } from 'react';
import { Send, X, Clock } from 'lucide-react';
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
  const [rateLimitRetry, setRateLimitRetry] = useState<number | null>(null);

  // Honeypot field ref - bots will fill this, humans won't see it
  const honeypotRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim() || !isAuthenticated || rateLimitRetry) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Include honeypot field value (should be empty for humans)
      const honeypotValue = honeypotRef.current?.value || '';

      const comment = await createComment({
        targetType,
        targetId,
        parentId,
        body: body.trim(),
        website: honeypotValue, // Honeypot field
      });

      setBody('');
      onCommentCreated(comment);
    } catch (err) {
      // Check for rate limit error
      if (err instanceof Error && err.message.includes('rate limit')) {
        // Extract retry time from error message if available
        const match = err.message.match(/(\d+)\s*seconds?/i);
        const retrySeconds = match && match[1] ? parseInt(match[1]) : 30;
        setRateLimitRetry(retrySeconds);
        setError(`Please wait ${retrySeconds} seconds before posting again`);

        // Start countdown
        const interval = setInterval(() => {
          setRateLimitRetry((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(interval);
              setError(null);
              return null;
            }
            setError(`Please wait ${prev - 1} seconds before posting again`);
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to post comment');
      }
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
      {/* Honeypot field - hidden from humans, bots will fill it */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          opacity: 0,
          height: 0,
          width: 0,
          pointerEvents: 'none',
        }}
      />

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
            <p className={cn(
              'text-sm mt-1 flex items-center gap-1',
              rateLimitRetry ? 'text-amber-500' : 'text-red-500'
            )}>
              {rateLimitRetry && <Clock className="w-3 h-3" />}
              {error}
            </p>
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
              disabled={isSubmitting || !body.trim() || !!rateLimitRetry}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded',
                'bg-blue-600 text-white',
                'hover:bg-blue-700',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-1.5'
              )}
            >
              {rateLimitRetry ? (
                <>
                  <Clock className="w-4 h-4" />
                  Wait {rateLimitRetry}s
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Posting...' : parentId ? 'Reply' : 'Comment'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
