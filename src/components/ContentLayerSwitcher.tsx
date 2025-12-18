/**
 * Content Layer Switcher Component (Sprint 19)
 *
 * A dropdown component that allows users to switch between content layers.
 * Integrates with ContentLayerContext for global state management.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, BookOpen, Briefcase, Code2, Layers, RotateCcw } from 'lucide-react';
import {
  useContentLayerContext,
  CONTENT_LAYER_OPTIONS,
  CONTENT_LAYERS,
  type ContentLayer,
} from '../contexts/ContentLayerContext';

// =============================================================================
// Icon Mapping
// =============================================================================

/**
 * Map icon names to Lucide components
 */
const ICON_MAP = {
  BookOpen,
  Briefcase,
  Code2,
  Layers,
} as const;

// =============================================================================
// Props
// =============================================================================

interface ContentLayerSwitcherProps {
  /** Optional className for styling */
  className?: string;
  /** Show the reset button when customized */
  showReset?: boolean;
  /** Compact mode - shows only icon and current layer */
  compact?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Content Layer Switcher
 *
 * A dropdown that allows users to select their preferred content layer.
 * Shows the current selection with an icon, and expands to show all options.
 *
 * @example
 * ```tsx
 * // Standard usage
 * <ContentLayerSwitcher />
 *
 * // Compact mode for tight spaces
 * <ContentLayerSwitcher compact />
 *
 * // With reset button
 * <ContentLayerSwitcher showReset />
 * ```
 */
export function ContentLayerSwitcher({
  className = '',
  showReset = true,
  compact = false,
}: ContentLayerSwitcherProps) {
  const { contentLayer, setContentLayer, resetToDefault, isCustomized, suggestedLayer } =
    useContentLayerContext();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Get current layer config
  const currentConfig = CONTENT_LAYER_OPTIONS[contentLayer];
  const CurrentIcon = ICON_MAP[currentConfig.icon as keyof typeof ICON_MAP] || Layers;

  // Handle layer selection
  const handleSelect = (layer: ContentLayer) => {
    setContentLayer(layer);
    setIsOpen(false);
  };

  // Handle reset
  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetToDefault();
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block ${className}`}
      data-testid="content-layer-switcher"
    >
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border
          bg-white dark:bg-gray-800
          border-gray-200 dark:border-gray-700
          hover:bg-gray-50 dark:hover:bg-gray-700
          text-gray-700 dark:text-gray-300
          transition-colors duration-150
          ${compact ? 'text-sm' : 'text-sm'}
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Content layer: ${currentConfig.label}`}
        data-testid="content-layer-trigger"
      >
        <CurrentIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        {!compact && (
          <>
            <span className="font-medium">{currentConfig.label}</span>
            {isCustomized && showReset && (
              <span className="text-xs text-orange-500 dark:text-orange-400">(custom)</span>
            )}
          </>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute z-50 mt-1 w-64 rounded-lg shadow-lg
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            py-1 overflow-hidden
            animate-fade-in
          `}
          role="listbox"
          aria-label="Select content layer"
          data-testid="content-layer-dropdown"
        >
          {/* Layer Options */}
          {CONTENT_LAYERS.map((layer) => {
            const config = CONTENT_LAYER_OPTIONS[layer];
            const Icon = ICON_MAP[config.icon as keyof typeof ICON_MAP] || Layers;
            const isSelected = layer === contentLayer;
            const isSuggested = layer === suggestedLayer;

            return (
              <button
                key={layer}
                onClick={() => handleSelect(layer)}
                className={`
                  w-full flex items-start gap-3 px-4 py-3 text-left
                  transition-colors duration-150
                  ${
                    isSelected
                      ? 'bg-orange-50 dark:bg-orange-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
                role="option"
                aria-selected={isSelected}
                data-testid={`content-layer-option-${layer}`}
              >
                <Icon
                  className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    isSelected
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        isSelected
                          ? 'text-orange-700 dark:text-orange-300'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {config.label}
                    </span>
                    {isSuggested && !isSelected && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        Suggested
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {config.description}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Reset Option (when customized) */}
          {isCustomized && showReset && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              <button
                onClick={handleReset}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                data-testid="content-layer-reset"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset to suggested ({CONTENT_LAYER_OPTIONS[suggestedLayer].label})</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ContentLayerSwitcher;
