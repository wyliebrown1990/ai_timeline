/**
 * CreatePackModal Component
 *
 * Modal for creating new flashcard packs with:
 * - Name input with validation (1-50 chars, unique)
 * - Optional description textarea
 * - Color picker (8 preset colors)
 * - Create button disabled until valid name entered
 * - Success feedback and redirect/close options
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Check, Palette } from 'lucide-react';
import { useFlashcardContext } from '../../contexts/FlashcardContext';
import { PACK_COLORS } from '../../types/flashcard';

// =============================================================================
// Types
// =============================================================================

export interface CreatePackModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Optional callback with new pack ID on successful creation */
  onCreated?: (packId: string) => void;
}

// =============================================================================
// Color Labels for Accessibility
// =============================================================================

const COLOR_LABELS: Record<string, string> = {
  '#3B82F6': 'Blue',
  '#10B981': 'Green',
  '#F59E0B': 'Amber',
  '#EF4444': 'Red',
  '#8B5CF6': 'Purple',
  '#EC4899': 'Pink',
  '#06B6D4': 'Cyan',
  '#6B7280': 'Gray',
};

// =============================================================================
// Component
// =============================================================================

/**
 * Modal dialog for creating new flashcard packs.
 * Includes form validation and success feedback.
 */
export function CreatePackModal({ isOpen, onClose, onCreated }: CreatePackModalProps) {
  const { packs, createPack } = useFlashcardContext();
  const inputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(PACK_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdPackId, setCreatedPackId] = useState<string | null>(null);

  // Validation
  const trimmedName = name.trim();
  const nameLength = trimmedName.length;
  const isNameTooShort = nameLength < 1;
  const isNameTooLong = nameLength > 50;
  const isDuplicate = packs.some(
    (p) => p.name.toLowerCase() === trimmedName.toLowerCase() && !p.isDefault
  );
  const isValid = !isNameTooShort && !isNameTooLong && !isDuplicate;

  // Get validation error message
  const getErrorMessage = (): string | null => {
    if (isNameTooShort && name.length > 0) return 'Name is required';
    if (isNameTooLong) return 'Name must be 50 characters or less';
    if (isDuplicate) return 'A pack with this name already exists';
    return null;
  };

  const errorMessage = getErrorMessage();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setSelectedColor(PACK_COLORS[0]);
      setIsCreating(false);
      setShowSuccess(false);
      setCreatedPackId(null);
    }
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showSuccess) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showSuccess, onClose]);

  // Handle form submission (async)
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid || isCreating) return;

      setIsCreating(true);

      try {
        // Create the pack
        const newPack = await createPack(trimmedName, description.trim() || undefined, selectedColor);

        // Show success feedback
        setCreatedPackId(newPack.id);
        setShowSuccess(true);

        // Notify parent of creation
        onCreated?.(newPack.id);
      } catch (error) {
        console.error('[CreatePackModal] Failed to create pack:', error);
      } finally {
        setIsCreating(false);
      }
    },
    [isValid, isCreating, createPack, trimmedName, description, selectedColor, onCreated]
  );

  // Handle clicking outside modal to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !showSuccess) {
        onClose();
      }
    },
    [onClose, showSuccess]
  );

  if (!isOpen) return null;

  // Success screen
  if (showSuccess) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={handleBackdropClick}
        data-testid="create-pack-modal"
      >
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Pack Created!
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              "{trimmedName}" has been created successfully.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {createdPackId && (
              <a
                href={`/study/packs/${createdPackId}`}
                className="flex w-full items-center justify-center rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                data-testid="view-pack-button"
              >
                View Pack
              </a>
            )}
            <button
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              data-testid="close-success-button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Creation form
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      data-testid="create-pack-modal"
    >
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Pack</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Close modal"
            data-testid="close-modal-button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            {/* Name Input */}
            <div>
              <label
                htmlFor="pack-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Pack Name <span className="text-red-500">*</span>
              </label>
              <input
                ref={inputRef}
                id="pack-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Transformer Era, Weak Spots"
                maxLength={55}
                className={`mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 dark:bg-gray-900 ${
                  errorMessage
                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:text-red-400'
                    : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500 dark:border-gray-600 dark:text-white'
                }`}
                aria-invalid={!!errorMessage}
                aria-describedby={errorMessage ? 'name-error' : undefined}
                data-testid="pack-name-input"
              />
              <div className="mt-1.5 flex items-center justify-between">
                {errorMessage ? (
                  <p id="name-error" className="text-xs text-red-600 dark:text-red-400">
                    {errorMessage}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {nameLength}/50
                </span>
              </div>
            </div>

            {/* Description Input */}
            <div>
              <label
                htmlFor="pack-description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Description <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                id="pack-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this pack for?"
                rows={2}
                maxLength={200}
                className="mt-1.5 block w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                data-testid="pack-description-input"
              />
              <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
                {description.length}/200
              </p>
            </div>

            {/* Color Picker */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Palette className="h-4 w-4" />
                Color
              </label>
              <div
                className="mt-2 flex flex-wrap gap-2"
                role="radiogroup"
                aria-label="Pack color"
              >
                {PACK_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                      selectedColor === color
                        ? 'ring-2 ring-gray-400 ring-offset-2 dark:ring-gray-500 dark:ring-offset-gray-800'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                    role="radio"
                    aria-checked={selectedColor === color}
                    aria-label={COLOR_LABELS[color] || color}
                    data-testid={`color-${COLOR_LABELS[color]?.toLowerCase() || 'unknown'}`}
                  >
                    {selectedColor === color && (
                      <Check className="h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              data-testid="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isCreating}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="create-button"
            >
              {isCreating ? 'Creating...' : 'Create Pack'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreatePackModal;
