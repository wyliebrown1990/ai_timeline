/**
 * PackPicker Component
 *
 * A popover component for selecting which packs to add a flashcard to.
 * Supports multi-pack selection, inline pack creation, and color coding.
 * Closes on outside click or Escape key.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Check, Plus } from 'lucide-react';
import { useFlashcardContext } from '../../contexts/FlashcardContext';
import { PACK_COLORS, type FlashcardPack, type PackColor } from '../../types/flashcard';

// =============================================================================
// Types
// =============================================================================

export interface PackPickerProps {
  /** IDs of packs the card is currently in */
  selectedPackIds: string[];
  /** Callback when pack selection changes */
  onPackToggle: (packId: string, isSelected: boolean) => void;
  /** Callback when popover should close */
  onClose: () => void;
  /** Optional callback when a new pack is created */
  onPackCreated?: (pack: FlashcardPack) => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Popover for selecting packs to add a flashcard to.
 *
 * @example
 * ```tsx
 * <PackPicker
 *   selectedPackIds={card.packIds}
 *   onPackToggle={(packId, selected) => {
 *     if (selected) moveCardToPack(card.id, packId);
 *     else removeCardFromPack(card.id, packId);
 *   }}
 *   onClose={() => setShowPicker(false)}
 * />
 * ```
 */
export function PackPicker({
  selectedPackIds,
  onPackToggle,
  onClose,
  onPackCreated,
  className = '',
}: PackPickerProps) {
  const { packs, createPack } = useFlashcardContext();
  const [isCreating, setIsCreating] = useState(false);
  const [newPackName, setNewPackName] = useState('');
  const [selectedColor, setSelectedColor] = useState<PackColor>(PACK_COLORS[0]);
  const [nameError, setNameError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input when entering create mode
  useEffect(() => {
    if (isCreating && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isCreating]);

  // Handle outside click to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle Escape key to close popover
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isCreating) {
          // Cancel create mode first
          setIsCreating(false);
          setNewPackName('');
          setNameError('');
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isCreating]);

  // Handle checkbox toggle for a pack
  const handlePackToggle = useCallback(
    (packId: string) => {
      const isCurrentlySelected = selectedPackIds.includes(packId);
      onPackToggle(packId, !isCurrentlySelected);
    },
    [selectedPackIds, onPackToggle]
  );

  // Enter create mode
  const handleStartCreate = useCallback(() => {
    setIsCreating(true);
    setNewPackName('');
    setSelectedColor(PACK_COLORS[0]);
    setNameError('');
  }, []);

  // Cancel create mode
  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    setNewPackName('');
    setNameError('');
  }, []);

  // Create new pack
  const handleCreatePack = useCallback(() => {
    const trimmedName = newPackName.trim();

    // Validate name
    if (!trimmedName) {
      setNameError('Pack name is required');
      return;
    }

    if (trimmedName.length > 50) {
      setNameError('Pack name must be 50 characters or less');
      return;
    }

    // Check for duplicate names
    const nameExists = packs.some(
      (pack) => pack.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameExists) {
      setNameError('A pack with this name already exists');
      return;
    }

    // Create the pack
    const newPack = createPack(trimmedName, undefined, selectedColor);

    // Reset form and exit create mode
    setIsCreating(false);
    setNewPackName('');
    setNameError('');

    // Notify parent if callback provided
    onPackCreated?.(newPack);

    // Auto-select the newly created pack
    onPackToggle(newPack.id, true);
  }, [newPackName, selectedColor, packs, createPack, onPackCreated, onPackToggle]);

  // Handle Enter key in name input
  const handleNameKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleCreatePack();
      }
    },
    [handleCreatePack]
  );

  return (
    <div
      ref={containerRef}
      className={`
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-xl shadow-xl
        w-72 max-h-96 overflow-hidden
        animate-in fade-in-0 zoom-in-95 duration-200
        ${className}
      `}
      role="dialog"
      aria-label="Select packs"
      data-testid="pack-picker"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Add to Pack
        </h3>
      </div>

      {/* Pack List */}
      <div className="max-h-48 overflow-y-auto">
        {packs.map((pack) => {
          const isSelected = selectedPackIds.includes(pack.id);

          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => handlePackToggle(pack.id)}
              className={`
                w-full px-4 py-2.5
                flex items-center gap-3
                text-left
                transition-colors duration-150
                hover:bg-gray-50 dark:hover:bg-gray-700/50
                focus:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-gray-700/50
                ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}
              `}
              aria-pressed={isSelected}
              data-testid={`pack-option-${pack.id}`}
            >
              {/* Checkbox */}
              <div
                className={`
                  w-5 h-5 rounded
                  border-2 flex items-center justify-center
                  transition-all duration-150
                  ${
                    isSelected
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }
                `}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </div>

              {/* Pack name */}
              <span
                className={`
                  flex-1 text-sm truncate
                  ${
                    isSelected
                      ? 'text-gray-900 dark:text-gray-100 font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {pack.name}
              </span>

              {/* Default badge */}
              {pack.isDefault && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  (default)
                </span>
              )}

              {/* Color dot */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: pack.color }}
                aria-label={`Color: ${pack.color}`}
              />
            </button>
          );
        })}

        {/* Empty state */}
        {packs.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No packs yet. Create one below!
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Create New Pack Section */}
      {!isCreating ? (
        // "Create New Pack" button
        <button
          type="button"
          onClick={handleStartCreate}
          className="
            w-full px-4 py-3
            flex items-center gap-2
            text-left text-sm
            text-blue-600 dark:text-blue-400
            hover:bg-gray-50 dark:hover:bg-gray-700/50
            transition-colors duration-150
            focus:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-gray-700/50
          "
          data-testid="create-pack-button"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Pack</span>
        </button>
      ) : (
        // Inline pack creation form
        <div className="p-4 space-y-3" data-testid="create-pack-form">
          {/* Name input */}
          <div>
            <label
              htmlFor="new-pack-name"
              className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
            >
              Pack name
            </label>
            <input
              ref={nameInputRef}
              id="new-pack-name"
              type="text"
              value={newPackName}
              onChange={(e) => {
                setNewPackName(e.target.value);
                setNameError('');
              }}
              onKeyDown={handleNameKeyDown}
              placeholder="e.g., Deep Learning Era"
              maxLength={50}
              className={`
                w-full px-3 py-2
                text-sm
                border rounded-lg
                bg-white dark:bg-gray-900
                text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-blue-500
                transition-colors duration-150
                ${
                  nameError
                    ? 'border-red-400 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }
              `}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'pack-name-error' : undefined}
              data-testid="new-pack-name-input"
            />
            {nameError && (
              <p
                id="pack-name-error"
                className="mt-1 text-xs text-red-500 dark:text-red-400"
                role="alert"
              >
                {nameError}
              </p>
            )}
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Pack color">
              {PACK_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`
                    w-7 h-7 rounded-full
                    transition-all duration-150
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                    ${
                      selectedColor === color
                        ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-gray-800'
                        : 'hover:scale-110'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                  aria-pressed={selectedColor === color}
                  data-testid={`color-option-${color}`}
                />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancelCreate}
              className="
                flex-1 px-3 py-2
                text-sm font-medium
                text-gray-700 dark:text-gray-300
                bg-gray-100 dark:bg-gray-700
                hover:bg-gray-200 dark:hover:bg-gray-600
                rounded-lg
                transition-colors duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400
              "
              data-testid="cancel-create-button"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreatePack}
              className="
                flex-1 px-3 py-2
                text-sm font-medium
                text-white
                bg-blue-600 hover:bg-blue-700
                rounded-lg
                transition-colors duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                flex items-center justify-center gap-1
              "
              data-testid="confirm-create-button"
            >
              Create
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PackPicker;
