/**
 * DataManagement Component
 *
 * Provides data export and clear functionality for flashcard data.
 * Features:
 * - Export all data as JSON file
 * - Clear all data with double confirmation
 * - Data summary before destructive actions
 */

import { useState, useCallback, useMemo } from 'react';
import { Download, Trash2, AlertTriangle, X, CheckCircle } from 'lucide-react';
import {
  downloadFlashcardData,
  clearAllFlashcardData,
  getDataSummary,
} from '../../lib/flashcardStats';

// =============================================================================
// Types
// =============================================================================

export interface DataManagementProps {
  /** Callback after data is cleared (to refresh app state) */
  onDataCleared?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

type ConfirmationStep = 'none' | 'first' | 'second';

// =============================================================================
// DataManagement Component
// =============================================================================

/**
 * Data management panel with export and clear functionality.
 *
 * @example
 * ```tsx
 * import { DataManagement } from './DataManagement';
 *
 * <DataManagement onDataCleared={() => window.location.reload()} />
 * ```
 */
export function DataManagement({
  onDataCleared,
  className = '',
}: DataManagementProps) {
  const [confirmationStep, setConfirmationStep] = useState<ConfirmationStep>('none');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Get data summary for confirmation dialog
  const dataSummary = useMemo(() => getDataSummary(), []);

  // Handle export
  const handleExport = useCallback(() => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      downloadFlashcardData();
      setExportSuccess(true);
      // Reset success state after 3 seconds
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Handle first confirmation step
  const handleClearClick = useCallback(() => {
    setConfirmationStep('first');
  }, []);

  // Handle second confirmation step
  const handleFirstConfirm = useCallback(() => {
    setConfirmationStep('second');
  }, []);

  // Handle final clear
  const handleFinalClear = useCallback(() => {
    try {
      clearAllFlashcardData();
      setConfirmationStep('none');
      onDataCleared?.();
    } catch (error) {
      console.error('Clear failed:', error);
    }
  }, [onDataCleared]);

  // Cancel confirmation
  const handleCancel = useCallback(() => {
    setConfirmationStep('none');
    setDeleteConfirmText('');
  }, []);

  // Format date for display
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className={className} data-testid="data-management">
      {/* Data Summary */}
      <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50" data-testid="data-summary">
        <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Your Data
        </h4>
        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>{dataSummary.totalCards} flashcard{dataSummary.totalCards !== 1 ? 's' : ''}</li>
          <li>{dataSummary.totalPacks} pack{dataSummary.totalPacks !== 1 ? 's' : ''}</li>
          <li>{dataSummary.totalReviews.toLocaleString()} total review{dataSummary.totalReviews !== 1 ? 's' : ''}</li>
          <li>Best streak: {dataSummary.streakDays} day{dataSummary.streakDays !== 1 ? 's' : ''}</li>
          {dataSummary.oldestCardDate && (
            <li>First card: {formatDate(dataSummary.oldestCardDate)}</li>
          )}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting || dataSummary.totalCards === 0}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          data-testid="export-button"
        >
          {exportSuccess ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Exported!</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>{isExporting ? 'Exporting...' : 'Export Data'}</span>
            </>
          )}
        </button>

        {/* Clear Data Button */}
        <button
          onClick={handleClearClick}
          disabled={dataSummary.totalCards === 0 && dataSummary.totalReviews === 0}
          className="flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
          data-testid="clear-button"
        >
          <Trash2 className="h-4 w-4" />
          <span>Clear All Data</span>
        </button>
      </div>

      {/* First Confirmation Dialog */}
      {confirmationStep === 'first' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-testid="confirmation-dialog-first"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Clear All Data?
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  This will permanently delete all your flashcard data:
                </p>
              </div>
            </div>

            <ul className="mb-4 ml-11 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• {dataSummary.totalCards} flashcard{dataSummary.totalCards !== 1 ? 's' : ''}</li>
              <li>• {dataSummary.totalPacks} custom pack{dataSummary.totalPacks !== 1 ? 's' : ''}</li>
              <li>• {dataSummary.totalReviews.toLocaleString()} review record{dataSummary.totalReviews !== 1 ? 's' : ''}</li>
              <li>• Your {dataSummary.streakDays}-day streak record</li>
            </ul>

            <p className="mb-4 ml-11 text-sm font-medium text-red-600 dark:text-red-400">
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                data-testid="cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleFirstConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                data-testid="confirm-first-button"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Second Confirmation Dialog */}
      {confirmationStep === 'second' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-testid="confirmation-dialog-second"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Final Confirmation
                </h3>
              </div>
              <button
                onClick={handleCancel}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Are you absolutely sure? Type <span className="font-mono font-medium text-red-600 dark:text-red-400">DELETE</span> below to confirm.
            </p>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Type DELETE to confirm"
                value={deleteConfirmText}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                data-testid="delete-confirmation-input"
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalClear}
                disabled={deleteConfirmText !== 'DELETE'}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="confirm-final-button"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataManagement;
