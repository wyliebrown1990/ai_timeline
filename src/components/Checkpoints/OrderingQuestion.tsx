/**
 * Ordering Question Component
 *
 * Displays an ordering question where users arrange items in the correct
 * sequence (e.g., chronological order). Uses a tap-to-reorder interface
 * that's mobile-friendly.
 */

import { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, ArrowUp, ArrowDown, ListOrdered } from 'lucide-react';
import type { OrderingQuestion as OQuestion, OrderingItem } from '../../types/checkpoint';

interface OrderingQuestionProps {
  /** The question data */
  question: OQuestion;
  /** Callback when user submits their ordering */
  onAnswer: (orderedIds: string[], isCorrect: boolean) => void;
  /** Previous answer if already answered */
  previousAnswer?: { orderedIds: string[]; isCorrect: boolean };
  /** Optional additional className */
  className?: string;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Using non-null assertions since i and j are guaranteed valid indices
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }
  return shuffled;
}

/**
 * Ordering Question Component
 *
 * Features:
 * - Tap-to-reorder interface with move up/down buttons
 * - Visual feedback for correct/incorrect positions
 * - Shows correct dates after submission
 * - Mobile-friendly touch targets
 */
export function OrderingQuestion({
  question,
  onAnswer,
  previousAnswer,
  className = '',
}: OrderingQuestionProps) {
  // Initialize with shuffled items or previous answer order
  const [orderedItems, setOrderedItems] = useState<OrderingItem[]>(() => {
    if (previousAnswer) {
      // Restore previous order
      return previousAnswer.orderedIds.map(
        (id) => question.items.find((item) => item.id === id)!
      );
    }
    // Shuffle for fresh start (try to avoid starting in correct order)
    let shuffled = shuffleArray(question.items);
    const correctOrder = question.correctOrder.join(',');
    // Try up to 5 times to get a different order (avoid infinite loop)
    let attempts = 0;
    while (shuffled.map((i) => i.id).join(',') === correctOrder && attempts < 5) {
      shuffled = shuffleArray(question.items);
      attempts++;
    }
    return shuffled;
  });

  const [isSubmitted, setIsSubmitted] = useState(previousAnswer !== undefined);
  const [isCorrect, setIsCorrect] = useState(previousAnswer?.isCorrect ?? false);

  // Move an item up in the list
  const moveUp = useCallback((index: number) => {
    if (isSubmitted || index === 0) return;
    setOrderedItems((items) => {
      const newItems = [...items];
      // Non-null assertions safe: index > 0 checked above, index in bounds
      const temp = newItems[index - 1]!;
      newItems[index - 1] = newItems[index]!;
      newItems[index] = temp;
      return newItems;
    });
  }, [isSubmitted]);

  // Move an item down in the list
  const moveDown = useCallback((index: number) => {
    if (isSubmitted || index === orderedItems.length - 1) return;
    setOrderedItems((items) => {
      const newItems = [...items];
      // Non-null assertions safe: index < length - 1 checked above
      const temp = newItems[index]!;
      newItems[index] = newItems[index + 1]!;
      newItems[index + 1] = temp;
      return newItems;
    });
  }, [isSubmitted, orderedItems.length]);

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (isSubmitted) return;

    const userOrder = orderedItems.map((item) => item.id);
    const correct = userOrder.join(',') === question.correctOrder.join(',');

    setIsCorrect(correct);
    setIsSubmitted(true);
    onAnswer(userOrder, correct);
  }, [isSubmitted, orderedItems, question.correctOrder, onAnswer]);

  // Get the correct position for an item (1-indexed for display)
  const getCorrectPosition = (itemId: string): number => {
    return question.correctOrder.indexOf(itemId) + 1;
  };

  // Check if an item is in the correct position
  const isInCorrectPosition = (item: OrderingItem, index: number): boolean => {
    return question.correctOrder[index] === item.id;
  };

  // Get item styling based on state
  const getItemStyle = (item: OrderingItem, index: number): string => {
    const baseStyle = `
      flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200
    `;

    if (isSubmitted) {
      if (isInCorrectPosition(item, index)) {
        return `${baseStyle} border-green-500 bg-green-50 dark:bg-green-900/20`;
      }
      return `${baseStyle} border-red-500 bg-red-50 dark:bg-red-900/20`;
    }

    return `${baseStyle} border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`;
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="ordering-question">
      {/* Question header */}
      <div className="flex items-start gap-3">
        <ListOrdered className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {question.prompt}
        </h3>
      </div>

      {/* Ordering items */}
      <div className="space-y-2">
        {orderedItems.map((item, index) => (
          <div
            key={item.id}
            className={getItemStyle(item, index)}
            data-testid={`ordering-item-${item.id}`}
          >
            {/* Position number */}
            <span
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${isSubmitted
                  ? isInCorrectPosition(item, index)
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }
              `}
            >
              {index + 1}
            </span>

            {/* Item label and optional date */}
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-900 dark:text-white">
                {item.label}
              </span>
              {isSubmitted && item.date && (
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  ({item.date})
                </span>
              )}
            </div>

            {/* Move buttons (only show before submission) */}
            {!isSubmitted && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className={`
                    p-1.5 rounded transition-colors
                    ${index === 0
                      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400'
                    }
                  `}
                  aria-label={`Move ${item.label} up`}
                  data-testid={`move-up-${item.id}`}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === orderedItems.length - 1}
                  className={`
                    p-1.5 rounded transition-colors
                    ${index === orderedItems.length - 1
                      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400'
                    }
                  `}
                  aria-label={`Move ${item.label} down`}
                  data-testid={`move-down-${item.id}`}
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Correct/incorrect indicator after submission */}
            {isSubmitted && (
              <div className="flex-shrink-0">
                {isInCorrectPosition(item, index) ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">→ {getCorrectPosition(item.id)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit button (only shown before submission) */}
      {!isSubmitted && (
        <button
          onClick={handleSubmit}
          className="w-full py-3 px-4 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          data-testid="submit-button"
        >
          Check Order
        </button>
      )}

      {/* Feedback section (only shown after submission) */}
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
                  Perfect order!
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-amber-800 dark:text-amber-200">
                  Not quite right - check the correct positions above
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderingQuestion;
