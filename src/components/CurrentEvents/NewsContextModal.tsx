import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Clock,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Calendar,
  Sparkles,
  MessageCircle,
  Loader2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import type { CurrentEvent } from '../../types/currentEvent';
import type { MilestoneResponse } from '../../types/milestone';
import { milestonesApi } from '../../services/api';
import { chatApi } from '../../services/chatApi';
import { generateContextPath, saveContextPath } from '../../utils/contextPathUtils';
import { apiKeyService } from '../../services/apiKeyService';

/**
 * Props for NewsContextModal component
 */
interface NewsContextModalProps {
  /** The current event to display context for */
  event: CurrentEvent;
  /** Callback to close the modal */
  onClose: () => void;
}

/**
 * Estimate reading time per milestone in minutes
 * Based on average milestone content length
 */
const MINUTES_PER_MILESTONE = 3;

/**
 * NewsContextModal Component
 *
 * Displays a modal with historical context for a current AI news event.
 * Shows:
 * - Event headline and summary
 * - Prerequisite milestones with their descriptions
 * - Connection explanation (why this matters)
 * - CTA to start a context path
 */
export function NewsContextModal({ event, onClose }: NewsContextModalProps) {
  const navigate = useNavigate();

  // Check if user has AI access (own key OR free tier)
  const hasAIAccess = apiKeyService.hasAIAccess();

  // State for milestone data
  const [milestones, setMilestones] = useState<MilestoneResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for AI-assisted context explanation
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch milestone data for prerequisites
  useEffect(() => {
    async function fetchMilestones() {
      setIsLoading(true);
      try {
        // Fetch all milestones and filter to prerequisites
        const response = await milestonesApi.getAll({ limit: 1000 });
        const prerequisiteSet = new Set(event.prerequisiteMilestoneIds);
        const filteredMilestones = response.data.filter((m) =>
          prerequisiteSet.has(m.id)
        );
        // Sort milestones chronologically by date
        filteredMilestones.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setMilestones(filteredMilestones);
      } catch (error) {
        console.error('Failed to fetch milestones for context:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMilestones();
  }, [event.prerequisiteMilestoneIds]);

  // Calculate estimated reading time
  const estimatedMinutes = milestones.length * MINUTES_PER_MILESTONE;

  // Format publish date
  const formattedDate = new Date(event.publishedDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Handle starting the context path
  const handleStartContextPath = useCallback(() => {
    // Generate and save context path
    const milestoneIds = milestones.map((m) => m.id);
    const contextPath = generateContextPath(event, milestoneIds);
    saveContextPath(contextPath);

    // Navigate to timeline with the first milestone highlighted
    const firstMilestoneId = milestoneIds[0];
    if (firstMilestoneId) {
      navigate(`/timeline?milestone=${firstMilestoneId}&context=${event.id}`);
    } else {
      navigate('/timeline');
    }
    onClose();
  }, [event, milestones, navigate, onClose]);

  // Handle viewing on timeline without context path
  const handleViewOnTimeline = useCallback(() => {
    // Navigate to the first milestone on the timeline
    const firstMilestone = milestones[0];
    if (firstMilestone) {
      navigate('/timeline?highlight=' + firstMilestone.id);
    } else {
      navigate('/timeline');
    }
    onClose();
  }, [milestones, navigate, onClose]);

  /**
   * Ask AI to explain why this news matters
   * Uses milestone context for a grounded, historically-informed response
   * Requires API access - redirects to settings if not configured
   */
  const handleAskAiWhyThisNews = useCallback(async () => {
    if (isAiLoading || milestones.length === 0) return;

    // Check for API access - redirect to settings if not available
    if (!apiKeyService.hasAIAccess()) {
      window.location.href = '/settings';
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    // Build context from milestones for grounded response
    const milestoneContext = milestones
      .map((m) => `- ${m.title} (${new Date(m.date).getFullYear()}): ${m.description}`)
      .join('\n');

    // Construct a detailed prompt for the AI
    const prompt = `I'm reading about this AI news: "${event.headline}"

Summary: ${event.summary}

Help me understand why this news matters by explaining:
1. What historical developments led to this moment
2. Why this is significant for the AI field
3. What it might mean for the future

Here are the relevant historical milestones I should understand:
${milestoneContext}

Please give me a clear, accessible explanation that connects the history to this current news.`;

    try {
      const response = await chatApi.sendMessage({
        message: prompt,
        explainMode: 'plain_english',
      });
      setAiExplanation(response.response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get AI explanation';
      setAiError(errorMessage);
    } finally {
      setIsAiLoading(false);
    }
  }, [event.headline, event.summary, isAiLoading, milestones]);

  // Handle clicking outside modal to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      data-testid="news-context-modal"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header section */}
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium mb-3">
            <Sparkles className="w-4 h-4" />
            Understanding the News
          </div>
          <h2
            id="modal-title"
            className="text-xl font-bold text-gray-900 dark:text-white pr-8 leading-snug"
          >
            {event.headline}
          </h2>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
            {event.sourcePublisher && (
              <span className="flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" />
                {event.sourcePublisher}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Summary section */}
        <div className="p-6 pb-4">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {event.summary}
          </p>
        </div>

        {/* Milestones section */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              The Context You Need
            </h3>
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              ~{estimatedMinutes} min
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700"
                >
                  {/* Step number */}
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  {/* Milestone info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {milestone.title}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({new Date(milestone.date).getFullYear()})
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connection explanation section */}
        <div className="px-6 pb-4">
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
              Why This Matters
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-200 leading-relaxed">
              {event.connectionExplanation}
            </p>
          </div>
        </div>

        {/* AI-Assisted Context Section */}
        <div className="px-6 pb-4">
          {!aiExplanation && !isAiLoading && !aiError && (
            <button
              onClick={handleAskAiWhyThisNews}
              disabled={isLoading || milestones.length === 0}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-400 dark:hover:border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="ask-ai-button"
            >
              {hasAIAccess ? (
                <MessageCircle className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
              <span className="font-medium">
                Ask AI: Why is this news?
                {!hasAIAccess && <span className="text-xs ml-1">(Configure in Settings)</span>}
              </span>
            </button>
          )}

          {isAiLoading && (
            <div
              className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
              data-testid="ai-loading"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-spin" />
                <span className="text-sm text-purple-700 dark:text-purple-300">
                  Analyzing historical connections...
                </span>
              </div>
            </div>
          )}

          {aiError && (
            <div
              className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              data-testid="ai-error"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 dark:text-red-300">{aiError}</p>
                  <button
                    onClick={handleAskAiWhyThisNews}
                    className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {aiExplanation && (
            <div
              className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
              data-testid="ai-explanation"
            >
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                  AI Explanation
                </h3>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm text-purple-900 dark:text-purple-100 leading-relaxed whitespace-pre-wrap">
                  {aiExplanation}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-6 pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleStartContextPath}
            disabled={isLoading || milestones.length === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Start Context Path
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleViewOnTimeline}
            disabled={isLoading || milestones.length === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            View on Timeline
          </button>
        </div>

        {/* Source link */}
        {event.sourceUrl && (
          <div className="px-6 pb-6 pt-0">
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Read the original article
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default NewsContextModal;
