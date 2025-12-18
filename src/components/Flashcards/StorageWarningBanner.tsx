/**
 * StorageWarningBanner Component
 *
 * Displays storage-related warnings and errors to users in a friendly,
 * non-intrusive way. Handles quota exceeded, corrupted data, and
 * localStorage unavailability messages.
 */

import { AlertTriangle, Info, X, AlertCircle } from 'lucide-react';
import { type StorageWarning } from '../../hooks/useStorageError';

// =============================================================================
// Types
// =============================================================================

export interface StorageWarningBannerProps {
  warnings: StorageWarning[];
  onDismiss: (id: string) => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function StorageWarningBanner({
  warnings,
  onDismiss,
  className = '',
}: StorageWarningBannerProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`} role="alert" aria-live="polite">
      {warnings.map((warning) => (
        <WarningItem key={warning.id} warning={warning} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// =============================================================================
// Warning Item
// =============================================================================

interface WarningItemProps {
  warning: StorageWarning;
  onDismiss: (id: string) => void;
}

function WarningItem({ warning, onDismiss }: WarningItemProps) {
  const config = getWarningConfig(warning.type);

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg border
        ${config.bgColor} ${config.borderColor} ${config.textColor}
      `}
      role={warning.type === 'error' ? 'alert' : 'status'}
    >
      <config.Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />

      <div className="flex-1 min-w-0">
        <p className="text-sm">{warning.message}</p>

        {warning.action && (
          <button
            onClick={warning.action.onClick}
            className={`
              mt-2 text-sm font-medium underline-offset-2 hover:underline
              ${config.actionColor}
            `}
          >
            {warning.action.label}
          </button>
        )}
      </div>

      {warning.dismissible && (
        <button
          onClick={() => onDismiss(warning.id)}
          className={`
            p-1 rounded hover:bg-black/10 dark:hover:bg-white/10
            transition-colors flex-shrink-0
          `}
          aria-label="Dismiss warning"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Config
// =============================================================================

function getWarningConfig(type: StorageWarning['type']) {
  switch (type) {
    case 'error':
      return {
        Icon: AlertCircle,
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-800 dark:text-red-200',
        iconColor: 'text-red-500 dark:text-red-400',
        actionColor: 'text-red-700 dark:text-red-300',
      };
    case 'warning':
      return {
        Icon: AlertTriangle,
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800',
        textColor: 'text-amber-800 dark:text-amber-200',
        iconColor: 'text-amber-500 dark:text-amber-400',
        actionColor: 'text-amber-700 dark:text-amber-300',
      };
    case 'info':
    default:
      return {
        Icon: Info,
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        textColor: 'text-blue-800 dark:text-blue-200',
        iconColor: 'text-blue-500 dark:text-blue-400',
        actionColor: 'text-blue-700 dark:text-blue-300',
      };
  }
}

export default StorageWarningBanner;
