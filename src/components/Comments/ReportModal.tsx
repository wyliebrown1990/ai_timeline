/**
 * Report Modal Component
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 *
 * Modal for reporting inappropriate comments
 */

import { useState } from 'react';
import { X, AlertTriangle, Flag } from 'lucide-react';
import { reportComment } from '../../services/commentsApi';
import type { CommentReportReason } from '../../types/comment';
import { cn } from '../../lib/utils';

interface ReportModalProps {
  commentId: string;
  onClose: () => void;
  onReported: () => void;
}

const REPORT_REASONS: { value: CommentReportReason; label: string; description: string }[] = [
  {
    value: 'spam',
    label: 'Spam',
    description: 'Unsolicited promotion or repetitive content',
  },
  {
    value: 'harassment',
    label: 'Harassment',
    description: 'Attacking or threatening another user',
  },
  {
    value: 'misinformation',
    label: 'Misinformation',
    description: 'False or misleading information',
  },
  {
    value: 'off_topic',
    label: 'Off-topic',
    description: 'Not relevant to the discussion',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other reason not listed above',
  },
];

export function ReportModal({ commentId, onClose, onReported }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<CommentReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await reportComment(commentId, selectedReason, details.trim() || undefined);
      setSuccess(true);
      setTimeout(() => {
        onReported();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Report Comment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Flag className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Report Submitted
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Thank you for helping keep our community safe.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Why are you reporting this comment?
              </p>

              {/* Reason selection */}
              <div className="space-y-2 mb-4">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.value}
                    onClick={() => setSelectedReason(reason.value)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      selectedReason === reason.value
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {reason.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {reason.description}
                    </div>
                  </button>
                ))}
              </div>

              {/* Additional details */}
              {selectedReason && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Additional details (optional)
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Provide any additional context..."
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg resize-none',
                      'bg-white dark:bg-gray-900',
                      'border-gray-300 dark:border-gray-600',
                      'focus:ring-2 focus:ring-red-500 focus:border-transparent',
                      'text-gray-900 dark:text-gray-100',
                      'placeholder:text-gray-400 dark:placeholder:text-gray-500'
                    )}
                    rows={3}
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-400 mt-1 text-right">
                    {details.length}/500
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedReason || isSubmitting}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                'bg-red-600 text-white hover:bg-red-700',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
