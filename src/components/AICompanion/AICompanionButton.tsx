/**
 * AICompanionButton Component
 * Floating action button that opens the AI chat panel
 */

import { MessageCircle, X } from 'lucide-react';

interface AICompanionButtonProps {
  isOpen: boolean;
  onClick: () => void;
  hasUnreadResponse?: boolean;
}

/**
 * Floating button to toggle the AI companion chat panel
 * Shows a notification dot when there's an unread response
 */
export function AICompanionButton({
  isOpen,
  onClick,
  hasUnreadResponse = false,
}: AICompanionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6 z-[60]
        w-14 h-14 rounded-full
        flex items-center justify-center
        shadow-lg transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500
        ${
          isOpen
            ? 'bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500'
            : 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-600'
        }
      `}
      aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      aria-expanded={isOpen}
    >
      {/* Icon with animation */}
      <span className="relative">
        {isOpen ? (
          <X className="w-6 h-6 text-white" aria-hidden="true" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" aria-hidden="true" />
        )}

        {/* Unread notification dot */}
        {hasUnreadResponse && !isOpen && (
          <span
            className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"
            aria-label="New response available"
          />
        )}
      </span>
    </button>
  );
}
