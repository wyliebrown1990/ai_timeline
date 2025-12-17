/**
 * Explain Back Question Component
 *
 * Displays an open-ended question where users explain a concept in their own words.
 * Provides AI-powered feedback on their explanation.
 */

import { useState, useCallback } from 'react';
import { MessageSquare, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import type { ExplainBackQuestion as EBQuestion } from '../../types/checkpoint';

interface ExplainBackQuestionProps {
  /** The question data */
  question: EBQuestion;
  /** Callback when user submits their explanation */
  onAnswer: (explanation: string, feedback: string) => void;
  /** Previous answer if already answered */
  previousAnswer?: { explanation: string; feedback: string };
  /** Optional function to call the AI API for feedback */
  getAIFeedback?: (concept: string, explanation: string, rubric: string) => Promise<string>;
  /** Optional additional className */
  className?: string;
}

/**
 * Default AI feedback function (mock implementation)
 * In production, this would call the Claude API
 */
async function defaultGetAIFeedback(
  concept: string,
  explanation: string,
  _rubric: string
): Promise<string> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Simple mock feedback based on explanation length and content
  const wordCount = explanation.trim().split(/\s+/).length;

  if (wordCount < 10) {
    return `Your explanation of ${concept} is a good start! Try expanding on your answer with a bit more detail. Consider mentioning a specific example or use case to make it more concrete.`;
  }

  if (wordCount < 30) {
    return `Nice explanation of ${concept}! You've captured some key points. To strengthen your answer, you might also mention why this matters or how it compares to earlier approaches.`;
  }

  return `Great job explaining ${concept}! Your explanation covers the core concepts well and would be clear to someone new to AI. You've demonstrated solid understanding of the topic.`;
}

/**
 * Explain Back Question Component
 *
 * Features:
 * - Text area for user's explanation
 * - AI-powered feedback after submission
 * - Loading state while waiting for AI
 * - Encouraging, constructive feedback
 */
export function ExplainBackQuestion({
  question,
  onAnswer,
  previousAnswer,
  getAIFeedback = defaultGetAIFeedback,
  className = '',
}: ExplainBackQuestionProps) {
  // User's explanation text
  const [explanation, setExplanation] = useState(previousAnswer?.explanation ?? '');
  // AI feedback
  const [feedback, setFeedback] = useState(previousAnswer?.feedback ?? '');
  // Loading state while waiting for AI
  const [isLoading, setIsLoading] = useState(false);
  // Submission state
  const [isSubmitted, setIsSubmitted] = useState(previousAnswer !== undefined);
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Handle explanation change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (isSubmitted) return;
      setExplanation(e.target.value);
      setError(null);
    },
    [isSubmitted]
  );

  // Handle submission
  const handleSubmit = useCallback(async () => {
    if (isSubmitted || isLoading) return;

    const trimmedExplanation = explanation.trim();
    if (trimmedExplanation.length < 10) {
      setError('Please write at least a few sentences to explain the concept.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const aiFeedback = await getAIFeedback(
        question.concept,
        trimmedExplanation,
        question.rubric
      );
      setFeedback(aiFeedback);
      setIsSubmitted(true);
      onAnswer(trimmedExplanation, aiFeedback);
    } catch (err) {
      setError('Unable to get feedback. Please try again.');
      console.error('AI feedback error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSubmitted, isLoading, explanation, getAIFeedback, question, onAnswer]);

  // Character count
  const charCount = explanation.length;
  const wordCount = explanation.trim() ? explanation.trim().split(/\s+/).length : 0;

  return (
    <div className={`space-y-4 ${className}`} data-testid="explain-back-question">
      {/* Question header */}
      <div className="flex items-start gap-3">
        <MessageSquare className="w-5 h-5 text-purple-500 dark:text-purple-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {question.prompt}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Explain <span className="font-medium text-purple-600 dark:text-purple-400">{question.concept}</span> in your own words
          </p>
        </div>
      </div>

      {/* Text area for explanation */}
      <div className="relative">
        <textarea
          value={explanation}
          onChange={handleChange}
          disabled={isSubmitted || isLoading}
          placeholder="Type your explanation here..."
          className={`
            w-full p-4 rounded-lg border-2 resize-none transition-all duration-200
            min-h-[120px] text-gray-900 dark:text-white placeholder:text-gray-400
            ${isSubmitted
              ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              : error
              ? 'border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-purple-500 focus:ring-purple-200 dark:focus:ring-purple-800'
            }
            focus:outline-none focus:ring-2
          `}
          rows={5}
          data-testid="explanation-textarea"
        />

        {/* Character/word count */}
        {!isSubmitted && (
          <div className="absolute bottom-3 right-3 text-xs text-gray-400">
            {wordCount} words • {charCount} characters
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" data-testid="error-message">
          {error}
        </p>
      )}

      {/* Submit button */}
      {!isSubmitted && (
        <button
          onClick={handleSubmit}
          disabled={isLoading || explanation.trim().length < 10}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
            flex items-center justify-center gap-2
            ${isLoading || explanation.trim().length < 10
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg'
            }
          `}
          data-testid="submit-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Getting AI feedback...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Get AI Feedback
            </>
          )}
        </button>
      )}

      {/* AI Feedback section */}
      {isSubmitted && feedback && (
        <div
          className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500"
          data-testid="feedback-section"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="font-semibold text-purple-800 dark:text-purple-200">
              AI Feedback
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {feedback}
          </p>
        </div>
      )}

      {/* Optional hint for minimum length */}
      {!isSubmitted && explanation.trim().length > 0 && explanation.trim().length < 50 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Tip: A good explanation is usually 2-3 sentences or more
        </p>
      )}
    </div>
  );
}

export default ExplainBackQuestion;
