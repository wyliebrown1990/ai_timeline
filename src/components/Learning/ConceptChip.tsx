/**
 * ConceptChip Component (Sprint LEarn-2)
 *
 * Pill-shaped chip showing a concept name with hover definition,
 * click to expand, and "Add to flashcards" option.
 */

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Plus, Check, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConceptProgress } from '../../hooks/useConceptProgress';
import type { LinkedConcept } from '../../services/api';

/**
 * Difficulty level colors
 */
const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'bg-green-100 text-green-800 border-green-200',
  2: 'bg-lime-100 text-lime-800 border-lime-200',
  3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  4: 'bg-orange-100 text-orange-800 border-orange-200',
  5: 'bg-red-100 text-red-800 border-red-200',
};

/**
 * Category colors for chips
 */
const CATEGORY_COLORS: Record<string, string> = {
  core_concept: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  technical_term: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  business_term: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  model_architecture: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  company_product: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
};

interface ConceptChipProps {
  concept: LinkedConcept;
  isKeyTopic?: boolean;
  onAddToFlashcards?: (concept: LinkedConcept) => void;
  showSeenIndicator?: boolean;
  /** Whether this concept is already saved to flashcards */
  isSavedToFlashcards?: boolean;
  /** Whether the add to flashcards action is in progress */
  isAddingToFlashcards?: boolean;
}

export function ConceptChip({
  concept,
  isKeyTopic = false,
  onAddToFlashcards,
  showSeenIndicator = true,
  isSavedToFlashcards = false,
  isAddingToFlashcards = false,
}: ConceptChipProps) {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const chipRef = useRef<HTMLButtonElement>(null);
  const { hasSeenConcept, markConceptSeen } = useConceptProgress();

  const isSeen = hasSeenConcept(concept.id);
  const categoryColor = CATEGORY_COLORS[concept.category] || CATEGORY_COLORS.core_concept;
  const difficultyColor = DIFFICULTY_COLORS[concept.difficulty] || DIFFICULTY_COLORS[1];

  const handleMouseEnter = () => {
    if (chipRef.current) {
      const rect = chipRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleClick = () => {
    setShowExpanded(true);
    setShowTooltip(false);
  };

  const handleLearnMore = () => {
    // Mark as seen and navigate to glossary (Sprint SEO-7: use slug URL)
    markConceptSeen(concept.id);
    navigate(concept.slug ? `/glossary/${concept.slug}` : `/glossary?term=${concept.id}`);
  };

  const handleAddToFlashcards = () => {
    if (onAddToFlashcards) {
      onAddToFlashcards(concept);
    }
  };

  return (
    <>
      {/* Chip */}
      <button
        ref={chipRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-full border transition-colors ${categoryColor} ${
          isKeyTopic ? 'ring-2 ring-offset-1 ring-purple-400' : ''
        }`}
      >
        {showSeenIndicator && isSeen && (
          <Check className="h-3 w-3 text-green-600" />
        )}
        {isKeyTopic && <Sparkles className="h-3 w-3" />}
        <span>{concept.term}</span>
      </button>

      {/* Hover Tooltip (Portal) */}
      {showTooltip &&
        createPortal(
          <div
            className="fixed z-50 max-w-xs px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg transform -translate-x-1/2"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
            }}
          >
            <p className="font-medium mb-1">{concept.term}</p>
            <p className="text-gray-300 text-xs">{concept.shortDefinition}</p>
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <div className="border-8 border-transparent border-b-gray-900" />
            </div>
          </div>,
          document.body
        )}

      {/* Expanded Card (Portal) */}
      {showExpanded &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowExpanded(false)}
            />

            {/* Card */}
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {concept.term}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColor}`}>
                        Level {concept.difficulty}
                      </span>
                      {isKeyTopic && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Key Topic
                        </span>
                      )}
                      {isSeen && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Seen
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                <p className="text-gray-700 dark:text-gray-300">{concept.shortDefinition}</p>

                {concept.mentionContext && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Mentioned in article:
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      "...{concept.mentionContext}..."
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-3">
                <button
                  onClick={handleLearnMore}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  Learn More
                </button>
                {onAddToFlashcards && (
                  isSavedToFlashcards ? (
                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <Check className="h-4 w-4" />
                      In Your Flashcards
                    </div>
                  ) : (
                    <button
                      onClick={handleAddToFlashcards}
                      disabled={isAddingToFlashcards}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-wait transition-colors"
                    >
                      {isAddingToFlashcards ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Add to Flashcards
                        </>
                      )}
                    </button>
                  )
                )}
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowExpanded(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default ConceptChip;
