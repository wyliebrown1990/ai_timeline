/**
 * Multiple Choice Question Component
 *
 * Displays a multiple choice question with 4 options and provides feedback
 * after the user submits their answer.
 */

import { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import type { MultipleChoiceQuestion as MCQuestion } from '../../types/checkpoint';

interface MultipleChoiceQuestionProps {
  /** The question data */
  question: MCQuestion;
  /** Callback when user submits an answer */
  onAnswer: (selectedIndex: number, isCorrect: boolean) => void;
  /** Whether this question has already been answered */
  previousAnswer?: { selectedIndex: number; isCorrect: boolean };
  /** Optional additional className */
  className?: string;
}

/**
 * Multiple Choice Question Component
 *
 * Features:
 * - 4 answer options with one correct
 * - Visual feedback for correct/incorrect answers
 * - Explanation shown after submission
 * - Disabled state after answering
 */
export function MultipleChoiceQuestion({
  question,
  onAnswer,
  previousAnswer,
  className = '',
}: MultipleChoiceQuestionProps) {
  // Track selected option before submission
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    previousAnswer?.selectedIndex ?? null
  );
  // Track if answer has been submitted
  const [isSubmitted, setIsSubmitted] = useState(previousAnswer !== undefined);
  // Track if the answer was correct
  const [isCorrect, setIsCorrect] = useState(previousAnswer?.isCorrect ?? false);

  // Handle option selection
  const handleSelect = useCallback((index: number) => {
    if (isSubmitted) return;
    setSelectedIndex(index);
  }, [isSubmitted]);

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (selectedIndex === null || isSubmitted) return;

    const correct = selectedIndex === question.correctIndex;
    setIsCorrect(correct);
    setIsSubmitted(true);
    onAnswer(selectedIndex, correct);
  }, [selectedIndex, isSubmitted, question.correctIndex, onAnswer]);

  // Get option styling based on state
  const getOptionStyle = (index: number): string => {
    const baseStyle = `
      w-full p-4 rounded-lg border-2 text-left transition-all duration-200
      flex items-start gap-3
    `;

    // After submission, show correct/incorrect styling
    if (isSubmitted) {
      if (index === question.correctIndex) {
        // Correct answer - always show green
        return `${baseStyle} border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200`;
      }
      if (index === selectedIndex && !isCorrect) {
        // User's incorrect selection - show red
        return `${baseStyle} border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200`;
      }
      // Other options after submission
      return `${baseStyle} border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 opacity-60`;
    }

    // Before submission
    if (index === selectedIndex) {
      // Selected option
      return `${baseStyle} border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 ring-2 ring-blue-200 dark:ring-blue-800`;
    }

    // Unselected option
    return `${baseStyle} border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer`;
  };

  // Get the option indicator (letter or icon)
  const getOptionIndicator = (index: number) => {
    const letter = String.fromCharCode(65 + index); // A, B, C, D

    if (isSubmitted) {
      if (index === question.correctIndex) {
        return (
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        );
      }
      if (index === selectedIndex && !isCorrect) {
        return (
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        );
      }
    }

    return (
      <span
        className={`
          w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0
          ${isSubmitted
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            : index === selectedIndex
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }
        `}
      >
        {letter}
      </span>
    );
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="multiple-choice-question">
      {/* Question header */}
      <div className="flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {question.question}
        </h3>
      </div>

      {/* Answer options */}
      <div className="space-y-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={isSubmitted}
            className={getOptionStyle(index)}
            data-testid={`option-${index}`}
            aria-pressed={selectedIndex === index}
          >
            {getOptionIndicator(index)}
            <span className="flex-1">{option}</span>
          </button>
        ))}
      </div>

      {/* Submit button (only shown before submission) */}
      {!isSubmitted && (
        <button
          onClick={handleSubmit}
          disabled={selectedIndex === null}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
            ${selectedIndex === null
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
            }
          `}
          data-testid="submit-button"
        >
          Check Answer
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
          <div className="flex items-center gap-2 mb-2">
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-semibold text-green-800 dark:text-green-200">
                  Correct!
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-amber-800 dark:text-amber-200">
                  Not quite
                </span>
              </>
            )}
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

export default MultipleChoiceQuestion;
