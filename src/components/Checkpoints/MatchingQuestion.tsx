/**
 * Matching Question Component
 *
 * Displays a matching question where users connect items from two columns.
 * Uses a click-to-match interface that's mobile-friendly.
 */

import { useState, useCallback, useMemo } from 'react';
import { CheckCircle2, XCircle, Link2, Link2Off } from 'lucide-react';
import type { MatchingQuestion as MQuestion, MatchingPair } from '../../types/checkpoint';

interface MatchingQuestionProps {
  /** The question data */
  question: MQuestion;
  /** Callback when user submits their matches */
  onAnswer: (matches: Record<string, string>, isCorrect: boolean) => void;
  /** Previous answer if already answered */
  previousAnswer?: { matches: Record<string, string>; isCorrect: boolean };
  /** Optional additional className */
  className?: string;
}

/**
 * Shuffle an array deterministically for display
 */
function shuffleArray<T>(array: T[], seed = 42): T[] {
  const shuffled = [...array];
  // Simple seeded shuffle
  let currentSeed = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const j = Math.floor((currentSeed / 233280) * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }
  return shuffled;
}

/**
 * Matching Question Component
 *
 * Features:
 * - Click-to-match interface: select left item, then click matching right item
 * - Visual feedback for connected pairs
 * - Shows correct matches after submission
 * - Mobile-friendly touch targets
 */
export function MatchingQuestion({
  question,
  onAnswer,
  previousAnswer,
  className = '',
}: MatchingQuestionProps) {
  // Shuffle the right side for display (consistent shuffle based on question id)
  const shuffledRightItems = useMemo(() => {
    const seed = question.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return shuffleArray(
      question.pairs.map((p) => ({ id: p.id, right: p.right })),
      seed
    );
  }, [question.id, question.pairs]);

  // User's matches: left id -> right id
  const [matches, setMatches] = useState<Record<string, string>>(
    previousAnswer?.matches ?? {}
  );
  // Currently selected left item
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  // Submission state
  const [isSubmitted, setIsSubmitted] = useState(previousAnswer !== undefined);
  const [isCorrect, setIsCorrect] = useState(previousAnswer?.isCorrect ?? false);

  // Get which left id is matched to a right id
  const getMatchedLeft = useCallback(
    (rightId: string): string | undefined => {
      return Object.entries(matches).find(([, v]) => v === rightId)?.[0];
    },
    [matches]
  );

  // Check if a match is correct
  const isMatchCorrect = useCallback(
    (leftId: string): boolean => {
      const matchedRight = matches[leftId];
      return matchedRight === leftId; // In our data, left id === right id for correct pairs
    },
    [matches]
  );

  // Handle left item click
  const handleLeftClick = useCallback(
    (leftId: string) => {
      if (isSubmitted) return;

      if (selectedLeft === leftId) {
        // Deselect if already selected
        setSelectedLeft(null);
      } else {
        setSelectedLeft(leftId);
      }
    },
    [isSubmitted, selectedLeft]
  );

  // Handle right item click
  const handleRightClick = useCallback(
    (rightId: string) => {
      if (isSubmitted || !selectedLeft) return;

      // Remove any existing match for this right item
      const newMatches = { ...matches };
      for (const [key, value] of Object.entries(newMatches)) {
        if (value === rightId) {
          delete newMatches[key];
        }
      }

      // Create new match
      newMatches[selectedLeft] = rightId;
      setMatches(newMatches);
      setSelectedLeft(null);
    },
    [isSubmitted, selectedLeft, matches]
  );

  // Handle removing a match
  const handleRemoveMatch = useCallback(
    (leftId: string) => {
      if (isSubmitted) return;
      const newMatches = { ...matches };
      delete newMatches[leftId];
      setMatches(newMatches);
    },
    [isSubmitted, matches]
  );

  // Handle submission
  const handleSubmit = useCallback(() => {
    if (isSubmitted) return;

    // Check if all matches are correct
    const allCorrect = question.pairs.every((pair) => matches[pair.id] === pair.id);

    setIsCorrect(allCorrect);
    setIsSubmitted(true);
    onAnswer(matches, allCorrect);
  }, [isSubmitted, question.pairs, matches, onAnswer]);

  // Count correct matches
  const correctCount = question.pairs.filter((pair) => matches[pair.id] === pair.id).length;
  const allMatched = Object.keys(matches).length === question.pairs.length;

  // Get left item styling
  const getLeftItemStyle = (pair: MatchingPair): string => {
    const baseStyle = `
      p-3 rounded-lg border-2 text-left transition-all duration-200 cursor-pointer
      flex items-center justify-between gap-2
    `;

    if (isSubmitted) {
      if (isMatchCorrect(pair.id)) {
        return `${baseStyle} border-green-500 bg-green-50 dark:bg-green-900/20`;
      }
      return `${baseStyle} border-red-500 bg-red-50 dark:bg-red-900/20`;
    }

    const isMatched = matches[pair.id] !== undefined;
    const isSelected = selectedLeft === pair.id;

    if (isSelected) {
      return `${baseStyle} border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300 dark:ring-blue-700`;
    }
    if (isMatched) {
      return `${baseStyle} border-purple-400 bg-purple-50 dark:bg-purple-900/20`;
    }
    return `${baseStyle} border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600`;
  };

  // Get right item styling
  const getRightItemStyle = (rightId: string): string => {
    const baseStyle = `
      p-3 rounded-lg border-2 text-left transition-all duration-200
      flex items-center gap-2
    `;

    const matchedLeftId = getMatchedLeft(rightId);

    if (isSubmitted) {
      // After submission, highlight correct matches
      const pair = question.pairs.find((p) => p.id === rightId);
      if (pair && matches[pair.id] === rightId) {
        return `${baseStyle} border-green-500 bg-green-50 dark:bg-green-900/20`;
      }
      if (matchedLeftId) {
        return `${baseStyle} border-red-500 bg-red-50 dark:bg-red-900/20`;
      }
      return `${baseStyle} border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60`;
    }

    const isMatched = matchedLeftId !== undefined;

    if (isMatched) {
      return `${baseStyle} border-purple-400 bg-purple-50 dark:bg-purple-900/20 cursor-default`;
    }
    if (selectedLeft) {
      return `${baseStyle} border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer`;
    }
    return `${baseStyle} border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-default opacity-70`;
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="matching-question">
      {/* Question header */}
      <div className="flex items-start gap-3">
        <Link2 className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {question.prompt}
          </h3>
          {!isSubmitted && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Click an item on the left, then click its match on the right
            </p>
          )}
        </div>
      </div>

      {/* Matching columns */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left column (concepts) */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Terms
          </div>
          {question.pairs.map((pair) => (
            <button
              key={pair.id}
              onClick={() => handleLeftClick(pair.id)}
              disabled={isSubmitted}
              className={getLeftItemStyle(pair)}
              data-testid={`left-${pair.id}`}
            >
              <span className="font-medium text-gray-900 dark:text-white text-sm">
                {pair.left}
              </span>
              {matches[pair.id] && !isSubmitted && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveMatch(pair.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      handleRemoveMatch(pair.id);
                    }
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer"
                  aria-label="Remove match"
                  data-testid={`remove-match-${pair.id}`}
                >
                  <Link2Off className="w-4 h-4 text-gray-400" />
                </span>
              )}
              {isSubmitted && (
                isMatchCorrect(pair.id) ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                )
              )}
            </button>
          ))}
        </div>

        {/* Right column (definitions/matches) */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Definitions
          </div>
          {shuffledRightItems.map((item) => {
            const matchedLeftId = getMatchedLeft(item.id);
            const canClick = selectedLeft && !matchedLeftId && !isSubmitted;

            return (
              <button
                key={item.id}
                onClick={() => canClick && handleRightClick(item.id)}
                disabled={isSubmitted || !selectedLeft || !!matchedLeftId}
                className={getRightItemStyle(item.id)}
                data-testid={`right-${item.id}`}
              >
                {matchedLeftId && (
                  <div className="w-4 h-4 rounded-full bg-purple-400 flex-shrink-0" />
                )}
                <span className="text-gray-700 dark:text-gray-300 text-sm">
                  {item.right}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit button */}
      {!isSubmitted && (
        <button
          onClick={handleSubmit}
          disabled={!allMatched}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
            ${!allMatched
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
            }
          `}
          data-testid="submit-button"
        >
          {allMatched ? 'Check Matches' : `Match all items (${Object.keys(matches).length}/${question.pairs.length})`}
        </button>
      )}

      {/* Feedback section */}
      {isSubmitted && (
        <div
          className={`
            p-4 rounded-lg border-l-4
            ${isCorrect
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
            }
          `}
          data-testid="feedback-section"
        >
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-semibold text-green-800 dark:text-green-200">
                  All matches correct!
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-amber-800 dark:text-amber-200">
                  {correctCount} of {question.pairs.length} matches correct
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchingQuestion;
