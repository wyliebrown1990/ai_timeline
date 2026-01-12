/**
 * Comment Moderation Page
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 *
 * Admin page for reviewing and moderating reported comments.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flag,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Clock,
  MessageSquare,
  Users,
  Building2,
  BookOpen,
  Newspaper,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getReportedComments,
  hideComment,
  unhideComment,
  adminDeleteComment,
  dismissReports,
  type ReportedComment,
} from '../../services/commentsApi';
import type { CommentTargetType, CommentReportReason } from '../../types/comment';
import { cn } from '../../lib/utils';

// Report reason labels
const REPORT_REASON_LABELS: Record<CommentReportReason, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  misinformation: 'Misinformation',
  off_topic: 'Off-topic',
  other: 'Other',
};

// Target type icons and labels
function getTargetIcon(targetType: CommentTargetType) {
  switch (targetType) {
    case 'milestone':
      return <Clock className="w-4 h-4" />;
    case 'person':
      return <Users className="w-4 h-4" />;
    case 'organization':
      return <Building2 className="w-4 h-4" />;
    case 'glossary_term':
      return <BookOpen className="w-4 h-4" />;
    case 'news_event':
      return <Newspaper className="w-4 h-4" />;
    default:
      return <MessageSquare className="w-4 h-4" />;
  }
}

function getTargetLabel(targetType: CommentTargetType): string {
  switch (targetType) {
    case 'milestone':
      return 'Milestone';
    case 'person':
      return 'Person';
    case 'organization':
      return 'Organization';
    case 'glossary_term':
      return 'Glossary';
    case 'news_event':
      return 'News';
    default:
      return 'Content';
  }
}

function getTargetLink(targetType: CommentTargetType, targetId: string): string {
  switch (targetType) {
    case 'milestone':
      return `/timeline?milestone=${targetId}`;
    case 'person':
      return `/people/${targetId}`;
    case 'organization':
      return `/organizations/${targetId}`;
    case 'glossary_term':
      return `/glossary?term=${targetId}`;
    case 'news_event':
      return `/news?event=${targetId}`;
    default:
      return '/';
  }
}

export function CommentModerationPage() {
  const [comments, setComments] = useState<ReportedComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadReportedComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getReportedComments({ limit: 50 });
      setComments(response.comments);
    } catch (error) {
      console.error('Failed to load reported comments:', error);
      toast.error('Failed to load reported comments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReportedComments();
  }, [loadReportedComments]);

  const handleHide = async (commentId: string) => {
    setProcessingId(commentId);
    try {
      await hideComment(commentId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, isHidden: true } : c))
      );
      toast.success('Comment hidden');
    } catch (error) {
      console.error('Failed to hide comment:', error);
      toast.error('Failed to hide comment');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnhide = async (commentId: string) => {
    setProcessingId(commentId);
    try {
      await unhideComment(commentId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, isHidden: false } : c))
      );
      toast.success('Comment unhidden');
    } catch (error) {
      console.error('Failed to unhide comment:', error);
      toast.error('Failed to unhide comment');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to permanently delete this comment?')) {
      return;
    }

    setProcessingId(commentId);
    try {
      await adminDeleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismiss = async (commentId: string) => {
    setProcessingId(commentId);
    try {
      await dismissReports(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success('Reports dismissed');
    } catch (error) {
      console.error('Failed to dismiss reports:', error);
      toast.error('Failed to dismiss reports');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Flag className="w-6 h-6 text-red-500" />
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Comment Moderation
          </h1>
        </div>
        <button
          onClick={loadReportedComments}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
            'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
            'hover:bg-zinc-200 dark:hover:bg-zinc-700',
            'disabled:opacity-50'
          )}
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm mb-1">
            <Flag className="w-4 h-4" />
            Reported Comments
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {comments.length}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm mb-1">
            <EyeOff className="w-4 h-4" />
            Hidden
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {comments.filter((c) => c.isHidden).length}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm mb-1">
            <AlertTriangle className="w-4 h-4" />
            High Priority (3+ reports)
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {comments.filter((c) => c.reportCount >= 3).length}
          </div>
        </div>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
            All Clear
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            No reported comments to review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                'bg-white dark:bg-zinc-800 rounded-xl border shadow-sm overflow-hidden',
                comment.isHidden
                  ? 'border-yellow-300 dark:border-yellow-600'
                  : comment.reportCount >= 3
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-zinc-200 dark:border-zinc-700'
              )}
            >
              {/* Comment header */}
              <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Author info */}
                    <div className="flex items-center gap-2">
                      {comment.author.avatarUrl ? (
                        <img
                          src={comment.author.avatarUrl}
                          alt={comment.author.username}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                          {comment.author.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <Link
                        to={`/u/${comment.author.username}`}
                        className="font-medium text-zinc-900 dark:text-white hover:underline"
                      >
                        {comment.author.displayName || comment.author.username}
                      </Link>
                    </div>

                    {/* Target link */}
                    <Link
                      to={getTargetLink(comment.targetType, comment.targetId)}
                      className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-[#E07A5F]"
                    >
                      {getTargetIcon(comment.targetType)}
                      <span>{getTargetLabel(comment.targetType)}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    {/* Status badges */}
                    {comment.isHidden && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                        Hidden
                      </span>
                    )}
                  </div>

                  {/* Report count */}
                  <div
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium',
                      comment.reportCount >= 3
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    )}
                  >
                    <Flag className="w-3 h-3" />
                    {comment.reportCount} report{comment.reportCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Comment body */}
              <div className="p-4">
                <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                  {comment.body}
                </p>

                {/* Voting stats */}
                <div className="flex items-center gap-4 mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4" />
                    {comment.upvotes}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsDown className="w-4 h-4" />
                    {comment.downvotes}
                  </span>
                  <span
                    className={cn(
                      'font-medium',
                      comment.score > 0
                        ? 'text-green-600 dark:text-green-400'
                        : comment.score < 0
                          ? 'text-red-600 dark:text-red-400'
                          : ''
                    )}
                  >
                    Score: {comment.score > 0 ? '+' : ''}
                    {comment.score}
                  </span>
                  <span>
                    {new Date(comment.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Reports section (expandable) */}
              {comment.reports && comment.reports.length > 0 && (
                <div className="border-t border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === comment.id ? null : comment.id)
                    }
                    className="w-full px-4 py-2 text-left text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/30"
                  >
                    {expandedId === comment.id ? 'Hide' : 'Show'} report details
                  </button>

                  {expandedId === comment.id && (
                    <div className="px-4 pb-4 space-y-2">
                      {comment.reports.map((report) => (
                        <div
                          key={report.id}
                          className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg text-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              {REPORT_REASON_LABELS[report.reason as CommentReportReason]}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {new Date(report.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {report.details && (
                            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                              {report.details}
                            </p>
                          )}
                          <p className="text-xs text-zinc-400 mt-1">
                            Reported by: {report.reporter.username}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
                {comment.isHidden ? (
                  <button
                    onClick={() => handleUnhide(comment.id)}
                    disabled={processingId === comment.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                      'hover:bg-green-200 dark:hover:bg-green-900/50',
                      'disabled:opacity-50'
                    )}
                  >
                    {processingId === comment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    Unhide
                  </button>
                ) : (
                  <button
                    onClick={() => handleHide(comment.id)}
                    disabled={processingId === comment.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                      'hover:bg-yellow-200 dark:hover:bg-yellow-900/50',
                      'disabled:opacity-50'
                    )}
                  >
                    {processingId === comment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                    Hide
                  </button>
                )}

                <button
                  onClick={() => handleDelete(comment.id)}
                  disabled={processingId === comment.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                    'hover:bg-red-200 dark:hover:bg-red-900/50',
                    'disabled:opacity-50'
                  )}
                >
                  {processingId === comment.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>

                <button
                  onClick={() => handleDismiss(comment.id)}
                  disabled={processingId === comment.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300',
                    'hover:bg-zinc-200 dark:hover:bg-zinc-600',
                    'disabled:opacity-50',
                    'ml-auto'
                  )}
                >
                  {processingId === comment.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Dismiss Reports
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CommentModerationPage;
