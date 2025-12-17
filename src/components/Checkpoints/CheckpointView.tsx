/**
 * Checkpoint View Component
 *
 * Renders a complete checkpoint with all its questions, handling
 * different question types and tracking progress.
 */

import { useState, useCallback, useMemo } from 'react';
import { CheckCircle2, ChevronRight, Award, SkipForward } from 'lucide-react';
import type {
  Checkpoint,
  Question,
  MultipleChoiceQuestion as MCQuestion,
  OrderingQuestion as OQuestion,
  MatchingQuestion as MQuestion,
  ExplainBackQuestion as EBQuestion,
} from '../../types/checkpoint';
import {
  isMultipleChoice,
  isOrdering,
  isMatching,
  isExplainBack,
} from '../../types/checkpoint';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import { OrderingQuestion } from './OrderingQuestion';
import { MatchingQuestion } from './MatchingQuestion';
import { ExplainBackQuestion } from './ExplainBackQuestion';

/**
 * Result of answering a single question
 */
interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
}

interface CheckpointViewProps {
  /** The checkpoint to display */
  checkpoint: Checkpoint;
  /** Callback when checkpoint is completed */
  onComplete: (results: QuestionResult[], score: number) => void;
  /** Callback to skip the checkpoint (optional) */
  onSkip?: () => void;
  /** Whether skipping is allowed */
  allowSkip?: boolean;
  /** Optional AI feedback function for explain back questions */
  getAIFeedback?: (concept: string, explanation: string, rubric: string) => Promise<string>;
  /** Optional additional className */
  className?: string;
}

/**
 * Checkpoint View Component
 *
 * Features:
 * - Renders any question type
 * - Progress through questions one at a time
 * - Score calculation at the end
 * - Optional skip functionality
 */
export function CheckpointView({
  checkpoint,
  onComplete,
  onSkip,
  allowSkip = true,
  getAIFeedback,
  className = '',
}: CheckpointViewProps) {
  // Current question index
  const [currentIndex, setCurrentIndex] = useState(0);
  // Results for each question
  const [results, setResults] = useState<QuestionResult[]>([]);
  // Whether checkpoint is complete
  const [isComplete, setIsComplete] = useState(false);

  // Current question
  const currentQuestion = checkpoint.questions[currentIndex];

  // Calculate score
  const score = useMemo(() => {
    if (results.length === 0) return 0;
    const correctCount = results.filter((r) => r.isCorrect).length;
    return Math.round((correctCount / checkpoint.questions.length) * 100);
  }, [results, checkpoint.questions.length]);

  // Handle answer for any question type
  const handleAnswer = useCallback(
    (questionId: string, isCorrect: boolean) => {
      const newResults = [...results, { questionId, isCorrect }];
      setResults(newResults);
      // Don't immediately complete - let user see feedback first
    },
    [results]
  );

  // Handle finishing the checkpoint (called after user sees last question feedback)
  // This shows the results screen - user then clicks Continue to proceed
  const handleFinish = useCallback(() => {
    setIsComplete(true);
  }, []);

  // Handle continuing after seeing results
  const handleContinueAfterResults = useCallback(() => {
    const finalScore = Math.round(
      (results.filter((r) => r.isCorrect).length / checkpoint.questions.length) * 100
    );
    onComplete(results, finalScore);
  }, [results, checkpoint.questions.length, onComplete]);

  // Move to next question
  const handleNext = useCallback(() => {
    if (currentIndex < checkpoint.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, checkpoint.questions.length]);

  // Check if current question is answered
  const isCurrentAnswered = results.some(
    (r) => currentQuestion && r.questionId === currentQuestion.id
  );

  // Render the appropriate question component
  // IMPORTANT: Each component needs a unique key to reset state when question changes
  const renderQuestion = (question: Question) => {
    if (isMultipleChoice(question)) {
      return (
        <MultipleChoiceQuestion
          key={question.id}
          question={question as MCQuestion}
          onAnswer={(_selectedIndex, isCorrect) => handleAnswer(question.id, isCorrect)}
        />
      );
    }

    if (isOrdering(question)) {
      return (
        <OrderingQuestion
          key={question.id}
          question={question as OQuestion}
          onAnswer={(_orderedIds, isCorrect) => handleAnswer(question.id, isCorrect)}
        />
      );
    }

    if (isMatching(question)) {
      return (
        <MatchingQuestion
          key={question.id}
          question={question as MQuestion}
          onAnswer={(_matches, isCorrect) => handleAnswer(question.id, isCorrect)}
        />
      );
    }

    if (isExplainBack(question)) {
      return (
        <ExplainBackQuestion
          key={question.id}
          question={question as EBQuestion}
          onAnswer={() => handleAnswer(question.id, true)} // Explain back is always "correct"
          getAIFeedback={getAIFeedback}
        />
      );
    }

    return <div key="unknown">Unknown question type</div>;
  };

  // Completion view
  if (isComplete) {
    const correctCount = results.filter((r) => r.isCorrect).length;
    const totalQuestions = checkpoint.questions.length;

    return (
      <div className={`text-center space-y-6 ${className}`} data-testid="checkpoint-complete">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <Award className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Checkpoint Complete!
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You got{' '}
            <span className="font-bold text-green-600 dark:text-green-400">
              {correctCount} of {totalQuestions}
            </span>{' '}
            questions correct
          </p>
        </div>
        <div className="text-4xl font-bold text-gray-900 dark:text-white">
          {score}%
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-xs mx-auto">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              score >= 80
                ? 'bg-green-500'
                : score >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {score >= 80
            ? 'Excellent work! You have a strong understanding.'
            : score >= 50
            ? 'Good effort! Review the explanations to strengthen your knowledge.'
            : 'Consider reviewing the material before continuing.'}
        </p>
        <button
          onClick={handleContinueAfterResults}
          className="w-full max-w-xs mx-auto py-3 px-4 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          data-testid="continue-after-results-button"
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} data-testid="checkpoint-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {checkpoint.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Question {currentIndex + 1} of {checkpoint.questions.length}
            </p>
          </div>
        </div>

        {allowSkip && onSkip && (
          <button
            onClick={onSkip}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            data-testid="skip-button"
          >
            <SkipForward className="w-4 h-4" />
            Skip Checkpoint
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{
            width: `${((currentIndex + (isCurrentAnswered ? 1 : 0)) / checkpoint.questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Current question */}
      {currentQuestion && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          {renderQuestion(currentQuestion)}
        </div>
      )}

      {/* Continue button (shown after answering, before last question) */}
      {isCurrentAnswered && currentIndex < checkpoint.questions.length - 1 && (
        <button
          onClick={handleNext}
          className="w-full py-3 px-4 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          data-testid="continue-button"
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* See Results button (shown after answering last question) */}
      {isCurrentAnswered && currentIndex >= checkpoint.questions.length - 1 && (
        <button
          onClick={handleFinish}
          className="w-full py-3 px-4 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          data-testid="finish-button"
        >
          See Results
          <Award className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export default CheckpointView;
