import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Callback when user confirms */
  onConfirm: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Whether this is a destructive action (styles confirm button red) */
  destructive?: boolean;
  /** Label for confirm button */
  confirmLabel?: string;
  /** Label for cancel button */
  cancelLabel?: string;
  /** Whether confirm action is loading */
  isLoading?: boolean;
}

/**
 * Confirmation dialog component for destructive or important actions
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  destructive = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Handle escape key and focus management
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    cancelButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Dialog */}
      <div
        data-testid="confirm-dialog"
        className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6">
          {destructive && (
            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3
              id="confirm-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              {title}
            </h3>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="flex-shrink-0 text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            data-testid="confirm-cancel"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            data-testid="confirm-delete"
            disabled={isLoading}
            className={`
              px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                destructive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }
            `}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
