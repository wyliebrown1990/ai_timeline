/**
 * NewsQuizPage - Weekly AI News Quiz
 *
 * Test your understanding of this week's AI news with
 * auto-generated questions linked to glossary concepts.
 *
 * Sprint LEarn-2 - Learn from News
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Brain,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Trophy,
  Lightbulb,
  ExternalLink,
  RefreshCw,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { QuizShareCard } from '../components/Quiz/QuizShareCard';
import { QuizHistoryList } from '../components/Quiz/QuizHistoryList';
import { SEO } from '../components/SEO';
import { useSession } from '../contexts/SessionContext';
import {
  newsQuizApi,
  type NewsQuiz,
  type QuizAnswer,
  type QuizResult,
  type QuizHistoryRow,
} from '../services/api';

/**
 * Format a date string to a readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Get question type badge color
 */
function getQuestionTypeBadge(type: string): { bg: string; text: string; label: string } {
  switch (type) {
    case 'fact_recall':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Fact Recall' };
    case 'concept_application':
      return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'Concept' };
    case 'timeline':
      return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Timeline' };
    case 'impact':
      return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Impact' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-300', label: 'Question' };
  }
}

/**
 * Get score message based on percentage
 */
function getScoreMessage(percentage: number): string {
  if (percentage === 100) return 'Perfect score! You really know your AI news!';
  if (percentage >= 80) return 'Great job! You\'re well-informed on AI developments.';
  if (percentage >= 60) return 'Good effort! Keep following the news.';
  if (percentage >= 40) return 'Room for improvement. Check out the explanations below.';
  return 'Keep learning! Review the news articles linked below.';
}

/**
 * Quiz state type
 */
type QuizState = 'loading' | 'no-quiz' | 'ready' | 'in-progress' | 'submitting' | 'complete';

export function NewsQuizPage() {
  const { sessionId, isReady: sessionReady } = useSession();
  const { id: routeQuizId } = useParams<{ id?: string }>();
  const isHistorical = Boolean(routeQuizId);

  // Quiz state — weekStart/weekEnd are nullable when no quiz exists yet.
  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [quiz, setQuiz] = useState<NewsQuiz | null>(null);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [weekEnd, setWeekEnd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Answer state
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Results state
  const [results, setResults] = useState<QuizResult[] | null>(null);
  const [score, setScore] = useState<{ score: number; total: number; percentage: number } | null>(null);

  // History state — parent owns this fetch; QuizHistoryList consumes the rows.
  const [historyRows, setHistoryRows] = useState<QuizHistoryRow[]>([]);

  /**
   * Load either the current quiz or a specific historical quiz by ID.
   */
  const loadQuiz = useCallback(async () => {
    setQuizState('loading');
    setError(null);
    setAnswers(new Map());
    setCurrentQuestionIndex(0);
    setResults(null);
    setScore(null);

    try {
      if (routeQuizId) {
        const response = await newsQuizApi.getById(routeQuizId);
        setQuiz(response.data);
        setWeekStart(response.data.weekStart ?? null);
        setWeekEnd(response.data.weekEnd ?? null);
        setQuizState('ready');
      } else {
        const response = await newsQuizApi.getCurrent();
        setWeekStart(response.weekStart);
        setWeekEnd(response.weekEnd);
        if (response.data) {
          setQuiz(response.data);
          setQuizState('ready');
        } else {
          setQuiz(null);
          setQuizState('no-quiz');
        }
      }
    } catch (err) {
      console.error('[NewsQuizPage] Failed to load quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
      setQuizState('no-quiz');
    }
  }, [routeQuizId]);

  // Load quiz on mount and whenever the route param changes.
  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  // Load history once the session is ready. Skip on the historical /:id route —
  // we hide the list there to avoid confusion with the current selection.
  useEffect(() => {
    if (isHistorical) return;
    if (!sessionReady) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await newsQuizApi.getHistory({
          sessionId: sessionId ?? undefined,
          limit: 12,
        });
        if (!cancelled) setHistoryRows(response.data);
      } catch (err) {
        console.error('[NewsQuizPage] Failed to load quiz history:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isHistorical, sessionReady, sessionId]);

  /**
   * Start the quiz
   */
  const handleStartQuiz = () => {
    setQuizState('in-progress');
    setCurrentQuestionIndex(0);
  };

  /**
   * Select an answer for the current question
   */
  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionIndex, optionIndex);
      return next;
    });
  };

  /**
   * Navigate to next question
   */
  const handleNextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  /**
   * Navigate to previous question
   */
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  /**
   * Submit the quiz
   */
  const handleSubmitQuiz = async () => {
    if (!quiz || !sessionId) return;

    setQuizState('submitting');

    try {
      const answerArray: QuizAnswer[] = Array.from(answers.entries()).map(([questionIndex, selectedAnswer]) => ({
        questionIndex,
        selectedAnswer,
      }));

      const response = await newsQuizApi.submit(quiz.id, sessionId, answerArray);

      if (response.success) {
        setResults(response.data.results);
        setScore({
          score: response.data.score,
          total: response.data.totalQuestions,
          percentage: response.data.percentage,
        });
        setQuizState('complete');
      } else {
        throw new Error('Quiz submission failed');
      }
    } catch (err) {
      console.error('[NewsQuizPage] Failed to submit quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit quiz');
      setQuizState('in-progress');
    }
  };

  /**
   * Retake the quiz
   */
  const handleRetakeQuiz = () => {
    setAnswers(new Map());
    setCurrentQuestionIndex(0);
    setResults(null);
    setScore(null);
    setQuizState('ready');
  };

  // SEO block — historical quizzes are noindexed (thin AI-generated content,
  // multiplied weekly, low evergreen value). Parent /news/quiz is the discovery surface.
  const seoEl = isHistorical ? (
    <SEO
      title={
        weekStart && weekEnd
          ? `AI News Quiz — ${formatDate(weekStart)} – ${formatDate(weekEnd)}`
          : 'AI News Quiz'
      }
      description={
        weekStart && weekEnd
          ? `Test your knowledge of AI news from ${formatDate(weekStart)} – ${formatDate(weekEnd)}. ${quiz?.questionCount ?? 5} questions covering this week's announcements, models, and concepts.`
          : 'Test your knowledge of recent AI news with this archived quiz.'
      }
      canonical={`https://letaiexplainai.com/news/quiz/${routeQuizId}`}
      type="website"
      noIndex
    />
  ) : (
    <SEO
      title="Weekly AI News Quiz"
      description="Take this week's AI news quiz. 5 questions on the latest AI models, research, and industry announcements — updated every Friday."
      canonical="https://letaiexplainai.com/news/quiz"
      type="website"
    />
  );

  // Header back-link — history view goes back to the weekly quiz, current view to /news.
  // Uses white/80 styling that works across both the indigo and the score-color gradients.
  const backLink = isHistorical ? (
    <Link
      to="/news/quiz"
      className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Weekly Quiz
    </Link>
  ) : (
    <Link
      to="/news"
      className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to News
    </Link>
  );

  // Show loading state
  if (quizState === 'loading' || !sessionReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {seoEl}
        <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white">
          <div className="container-main py-12 sm:py-16">
            {backLink}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <Brain className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold">Weekly AI News Quiz</h1>
                <p className="text-indigo-100 mt-1">Test your knowledge of recent AI developments</p>
              </div>
            </div>
          </div>
        </div>
        <div className="container-main py-16 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  // No quiz available
  if (quizState === 'no-quiz') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {seoEl}
        <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white">
          <div className="container-main py-12 sm:py-16">
            {backLink}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <Brain className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold">Weekly AI News Quiz</h1>
                <p className="text-indigo-100 mt-1">Test your knowledge of recent AI developments</p>
              </div>
            </div>
          </div>
        </div>
        <div className="container-main py-16">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Clock className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No Quiz Available Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {weekStart && weekEnd
                ? `The quiz for AI news from ${formatDate(weekStart)} – ${formatDate(weekEnd)} hasn't been generated yet.`
                : 'Check back soon for this week\'s AI news quiz!'}
            </p>
            {error && (
              <p className="text-red-500 text-sm mb-4">{error}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button
                onClick={loadQuiz}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Check Again
              </button>
              <Link
                to="/news"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Browse News
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz ready - show start screen
  if (quizState === 'ready' && quiz) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {seoEl}
        <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white">
          <div className="container-main py-12 sm:py-16">
            {backLink}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <Brain className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold">Weekly AI News Quiz</h1>
                <p className="text-indigo-100 mt-1">Test your knowledge of recent AI developments</p>
              </div>
            </div>
          </div>
        </div>
        <div className="container-main py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              {/* Quiz info header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 mb-4">
                  <Calendar className="w-5 h-5" />
                  <span>
                    {weekStart && weekEnd
                      ? `AI news from ${formatDate(weekStart)} – ${formatDate(weekEnd)}`
                      : 'Latest AI news'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  This Week in AI
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Test your understanding of the latest AI news with {quiz.questionCount} questions
                  covering announcements, concepts, and industry developments.
                </p>
              </div>

              {/* Quiz details */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {quiz.questionCount}
                      </div>
                      <div className="text-sm text-gray-500">Questions</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ~{Math.ceil(quiz.questionCount * 0.5)}
                      </div>
                      <div className="text-sm text-gray-500">Minutes</div>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-indigo-800 dark:text-indigo-200">
                      <strong>Tip:</strong> After completing the quiz, you'll see explanations
                      for each question with links to learn more about related concepts.
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartQuiz}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  Start Quiz
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            {!isHistorical && (
              <QuizHistoryList currentQuizId={quiz.id} rows={historyRows} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress
  if ((quizState === 'in-progress' || quizState === 'submitting') && quiz) {
    const currentQuestion = quiz.questions[currentQuestionIndex];
    if (!currentQuestion) return null; // Safety check
    const selectedAnswer = answers.get(currentQuestionIndex);
    const allAnswered = quiz.questions.every((_, i) => answers.has(i));
    const typeBadge = getQuestionTypeBadge(currentQuestion.questionType);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((answers.size) / quiz.questions.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="container-main py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuizState('ready')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {answers.size} answered
            </div>
          </div>
        </div>

        {/* Question content */}
        <div className="container-main py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              {/* Question header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeBadge.bg} ${typeBadge.text}`}>
                    {typeBadge.label}
                  </span>
                  {currentQuestion.relatedConceptName && (
                    <Link
                      to={`/glossary?term=${currentQuestion.relatedConceptId}`}
                      className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {currentQuestion.relatedConceptName}
                    </Link>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentQuestion.question}
                </h2>
              </div>

              {/* Options */}
              <div className="p-6 space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectAnswer(currentQuestionIndex, index)}
                    disabled={quizState === 'submitting'}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                      selectedAnswer === index
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${quizState === 'submitting' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedAnswer === index
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {String.fromCharCode(65 + index)}
                        </span>
                      </div>
                      <span className={`${selectedAnswer === index ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        {option}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <button
                  onClick={handlePrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="flex gap-1">
                  {quiz.questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === currentQuestionIndex
                          ? 'bg-indigo-600 w-6'
                          : answers.has(index)
                          ? 'bg-indigo-300 dark:bg-indigo-700'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>

                {currentQuestionIndex < quiz.questions.length - 1 ? (
                  <button
                    onClick={handleNextQuestion}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={!allAnswered || quizState === 'submitting'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {quizState === 'submitting' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Quiz'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Answer progress indicator */}
            {!allAnswered && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                Answer all {quiz.questions.length} questions to submit
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quiz complete - show results
  if (quizState === 'complete' && quiz && results && score) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {seoEl}
        {/* Score header */}
        <div className={`${
          score.percentage >= 80
            ? 'bg-gradient-to-br from-green-500 via-green-600 to-emerald-600'
            : score.percentage >= 60
            ? 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600'
            : 'bg-gradient-to-br from-red-500 via-red-600 to-rose-600'
        } text-white`}>
          <div className="container-main py-12 sm:py-16">
            {backLink}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-white/20 flex items-center justify-center">
                <Trophy className="w-12 h-12" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-4xl sm:text-5xl font-bold mb-2">
                  {score.score}/{score.total}
                </h1>
                <p className="text-xl opacity-90">
                  {score.percentage}% - {getScoreMessage(score.percentage)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results content */}
        <div className="container-main py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-center items-center">
              {weekStart && weekEnd && (
                <QuizShareCard
                  quiz={quiz}
                  results={results}
                  score={score}
                  weekStart={weekStart}
                  weekEnd={weekEnd}
                  answers={answers}
                />
              )}
              <button
                onClick={handleRetakeQuiz}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retake Quiz
              </button>
              <Link
                to="/news"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Browse News
              </Link>
            </div>

            {/* Question results */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Review Your Answers
              </h2>

              {quiz.questions.map((question, index) => {
                const result = results[index];
                if (!result) return null; // Safety check
                const userAnswer = answers.get(index);
                const typeBadge = getQuestionTypeBadge(question.questionType);
                const isCorrect = result.correct;

                return (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
                  >
                    {/* Question header */}
                    <div className={`p-4 border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <span className={`text-sm font-medium ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeBadge.bg} ${typeBadge.text}`}>
                              {typeBadge.label}
                            </span>
                          </div>
                          <p className="text-gray-900 dark:text-white font-medium mb-1">
                            {question.question}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            From: {question.newsHeadline}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Answer details */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                      {/* User answer */}
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">
                          Your answer:
                        </span>
                        <span className={`text-sm ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {userAnswer !== undefined ? question.options[userAnswer] : 'Not answered'}
                        </span>
                      </div>

                      {/* Correct answer (if wrong) */}
                      {!isCorrect && (
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">
                            Correct:
                          </span>
                          <span className="text-sm text-green-600 dark:text-green-400">
                            {question.options[result.correctAnswer]}
                          </span>
                        </div>
                      )}

                      {/* Explanation */}
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">
                          Explanation:
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {result.explanation}
                        </span>
                      </div>

                      {/* Related concept link */}
                      {question.relatedConceptName && (
                        <div className="flex items-center gap-2 pt-2">
                          <Link
                            to={`/glossary?term=${question.relatedConceptId}`}
                            className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Learn about {question.relatedConceptName}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!isHistorical && (
              <QuizHistoryList currentQuizId={quiz.id} rows={historyRows} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}

export default NewsQuizPage;
