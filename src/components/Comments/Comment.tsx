/**
 * Comment Component
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 *
 * Individual comment with voting, replies, and actions
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Edit,
  Trash2,
  Flag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { VoteButtons } from './VoteButtons';
import { CommentForm } from './CommentForm';
import { ReportModal } from './ReportModal';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { updateComment, deleteComment } from '../../services/commentsApi';
import type { Comment as CommentType, CommentTargetType } from '../../types/comment';
import { cn } from '../../lib/utils';

interface CommentProps {
  comment: CommentType;
  targetType: CommentTargetType;
  targetId: string;
  onCommentUpdate: (comment: CommentType) => void;
  onCommentDelete: (commentId: string) => void;
  onReplyCreated: (parentId: string, reply: CommentType) => void;
  maxDepth?: number;
}

export function Comment({
  comment,
  targetType,
  targetId,
  onCommentUpdate,
  onCommentDelete,
  onReplyCreated,
  maxDepth = 5,
}: CommentProps) {
  const { isAuthenticated, user } = useUserAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isReported, setIsReported] = useState(false);

  const isAuthor = user?.id === comment.authorId;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isDeepNested = comment.depth >= maxDepth;

  const handleEdit = async () => {
    if (!editBody.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const updated = await updateComment(comment.id, { body: editBody.trim() });
      onCommentUpdate({ ...comment, ...updated });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update comment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setIsDeleting(true);
    try {
      await deleteComment(comment.id);
      onCommentDelete(comment.id);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReplyCreated = (reply: CommentType) => {
    setIsReplying(false);
    onReplyCreated(comment.id, reply);
  };

  const formattedDate = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
  });

  return (
    <div className={cn('group', comment.depth > 0 && 'mt-3')}>
      <div className="flex gap-2">
        {/* Vote buttons */}
        {!comment.isDeleted && (
          <VoteButtons
            commentId={comment.id}
            score={comment.score}
            userVote={comment.userVote}
            size="sm"
          />
        )}

        {/* Comment content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 text-sm">
            {!comment.isDeleted ? (
              <>
                {/* Author avatar */}
                {comment.author.avatarUrl ? (
                  <img
                    src={comment.author.avatarUrl}
                    alt={comment.author.displayName || comment.author.username}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                    {(comment.author.displayName ?? comment.author.username).charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Author name */}
                <a
                  href={`/u/${comment.author.username}`}
                  className="font-medium text-gray-900 dark:text-gray-100 hover:underline"
                >
                  {comment.author.displayName || comment.author.username}
                </a>

                {isAuthor && (
                  <span className="text-xs text-blue-500 font-medium">you</span>
                )}

                {/* Timestamp */}
                <span className="text-gray-500 dark:text-gray-400">
                  {formattedDate}
                </span>

                {comment.editedAt && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs">
                    (edited)
                  </span>
                )}

                {/* Collapse toggle for replies */}
                {hasReplies && (
                  <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="ml-auto text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                )}
              </>
            ) : (
              <span className="text-gray-400 dark:text-gray-500 italic">
                [deleted]
              </span>
            )}
          </div>

          {/* Body */}
          {!isCollapsed && (
            <>
              {isEditing ? (
                <div className="mt-2">
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg resize-none',
                      'bg-white dark:bg-gray-800',
                      'border-gray-300 dark:border-gray-600',
                      'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                      'text-gray-900 dark:text-gray-100'
                    )}
                    rows={3}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleEdit}
                      disabled={isSaving || !editBody.trim()}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditBody(comment.body);
                      }}
                      className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap">
                  {comment.body}
                </p>
              )}

              {/* Actions */}
              {!comment.isDeleted && !isEditing && (
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {/* Reply button */}
                  {!isDeepNested && isAuthenticated && (
                    <button
                      onClick={() => setIsReplying(!isReplying)}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Reply
                    </button>
                  )}

                  {/* Author actions */}
                  {isAuthor && (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-1 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  )}

                  {/* Report */}
                  {!isAuthor && isAuthenticated && !isReported && (
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <Flag className="w-4 h-4" />
                      Report
                    </button>
                  )}
                  {isReported && (
                    <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                      <Flag className="w-4 h-4" />
                      Reported
                    </span>
                  )}
                </div>
              )}

              {/* Reply form */}
              {isReplying && (
                <div className="mt-3">
                  <CommentForm
                    targetType={targetType}
                    targetId={targetId}
                    parentId={comment.id}
                    onCommentCreated={handleReplyCreated}
                    onCancel={() => setIsReplying(false)}
                    placeholder="Write a reply..."
                    autoFocus
                  />
                </div>
              )}

              {/* Nested replies */}
              {hasReplies && !isCollapsed && (
                <div
                  className={cn(
                    'ml-3 pl-3 border-l-2 border-gray-200 dark:border-gray-700',
                    'mt-2'
                  )}
                >
                  {comment.replies!.map((reply) => (
                    <Comment
                      key={reply.id}
                      comment={reply}
                      targetType={targetType}
                      targetId={targetId}
                      onCommentUpdate={onCommentUpdate}
                      onCommentDelete={onCommentDelete}
                      onReplyCreated={onReplyCreated}
                      maxDepth={maxDepth}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Collapsed indicator */}
          {isCollapsed && hasReplies && (
            <button
              onClick={() => setIsCollapsed(false)}
              className="mt-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Show {comment.replies!.length} repl{comment.replies!.length === 1 ? 'y' : 'ies'}
            </button>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          commentId={comment.id}
          onClose={() => setShowReportModal(false)}
          onReported={() => setIsReported(true)}
        />
      )}
    </div>
  );
}
