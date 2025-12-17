import { Keyboard, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['←', '→'], description: 'Scroll timeline left/right' },
  { keys: ['↑', '↓'], description: 'Navigate between milestones' },
  { keys: ['Enter'], description: 'Open selected milestone detail' },
  { keys: ['Escape'], description: 'Close detail view / dialog' },
  { keys: ['+', '-'], description: 'Zoom in/out' },
  { keys: ['Home'], description: 'Jump to earliest milestone' },
  { keys: ['End'], description: 'Jump to latest milestone' },
  { keys: ['?'], description: 'Show this help dialog' },
];

interface KeyboardShortcutsHelpProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
}

/**
 * Modal dialog showing available keyboard shortcuts
 */
export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-help-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Dialog */}
      <div
        data-testid="keyboard-help-dialog"
        className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-gray-600" />
            <h2 id="keyboard-help-title" className="text-lg font-semibold text-gray-900">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-6">
          <dl className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex}>
                      {keyIndex > 0 && (
                        <span className="text-gray-400 mx-1">/</span>
                      )}
                      <kbd className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </dt>
                <dd className="text-sm text-gray-600">{shortcut.description}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsHelp;
