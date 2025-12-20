import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { useFlashcardContext } from '../../contexts/FlashcardContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import type { MilestoneWithLayeredContent, SignificanceLevel } from '../../types/milestone';
import type { AudienceType } from '../../types/userProfile';
import { formatTimelineDate } from '../../utils/timelineUtils';
import { CategoryBadge } from './CategoryBadge';
import { LayeredExplanationTabs, type ExplanationTab } from './LayeredExplanationTabs';
import { SignificanceBadge } from './SignificanceBadge';
import { AddToFlashcardButton, PackPicker } from '../Flashcards';

interface MilestoneDetailProps {
  /** The milestone to display (includes layered content from API) */
  milestone: MilestoneWithLayeredContent;
  /** Callback when panel is closed */
  onClose: () => void;
  /** Callback to navigate to next milestone */
  onNext?: () => void;
  /** Callback to navigate to previous milestone */
  onPrevious?: () => void;
  /** Whether there is a next milestone */
  hasNext?: boolean;
  /** Whether there is a previous milestone */
  hasPrevious?: boolean;
  /** When true, renders without modal wrapper (for embedding in other containers) */
  embedded?: boolean;
}

/**
 * Map audience type to default explanation tab (Sprint 19)
 * - 'everyday' users see plain English explanations
 * - 'leader' users see executive briefings
 * - 'technical' users see technical depth
 * - 'general' users see simple explanations
 */
function getDefaultTabForAudience(audienceType: AudienceType | undefined): ExplanationTab {
  switch (audienceType) {
    case 'everyday':
      return 'plain-english';
    case 'leader':
      return 'executive';
    case 'technical':
      return 'technical';
    case 'general':
    default:
      return 'simple';
  }
}

/**
 * Slide-in panel component displaying full milestone details
 * Includes keyboard navigation and escape-to-close
 *
 * Sprint 19: Now defaults to audience-appropriate content layer
 */
export function MilestoneDetail({
  milestone,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  embedded = false,
}: MilestoneDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const flashcardButtonRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const date = new Date(milestone.date);
  const { explainMilestone } = useChatContext();

  // Flashcard context for pack management (Sprint 22)
  const {
    getCardBySource,
    packs,
    moveCardToPack,
    removeCardFromPack,
  } = useFlashcardContext();

  // State for PackPicker popover (Sprint 22)
  const [showPackPicker, setShowPackPicker] = useState(false);

  // Get the card for this milestone if it exists
  const flashcard = getCardBySource('milestone', milestone.id);
  const selectedPackIds = flashcard?.packIds ?? [];

  // Get pack names for tooltip display
  const packNames = useMemo(() => {
    if (!flashcard || flashcard.packIds.length === 0) return [];
    return flashcard.packIds
      .map((packId) => packs.find((p) => p.id === packId)?.name)
      .filter(Boolean) as string[];
  }, [flashcard, packs]);

  // Handle pack toggle in PackPicker
  const handlePackToggle = useCallback(
    (packId: string, isSelected: boolean) => {
      if (!flashcard) return;
      if (isSelected) {
        moveCardToPack(flashcard.id, packId);
      } else {
        removeCardFromPack(flashcard.id, packId);
      }
    },
    [flashcard, moveCardToPack, removeCardFromPack]
  );

  // Handle right-click to open PackPicker
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (flashcard) {
        setShowPackPicker(true);
      }
    },
    [flashcard]
  );

  // Handle long-press start (for mobile)
  const handleTouchStart = useCallback(() => {
    if (!flashcard) return;
    longPressTimerRef.current = setTimeout(() => {
      setShowPackPicker(true);
    }, 500); // 500ms long press
  }, [flashcard]);

  // Handle long-press end
  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Get user profile for audience-based content layer (Sprint 19)
  const { profile } = useUserProfile();

  // Compute default tab based on user's audience type (Sprint 19)
  const defaultTab = useMemo(
    () => getDefaultTabForAudience(profile?.audienceType),
    [profile?.audienceType]
  );

  // Layered content is now included in the milestone response from the API (Sprint 35)
  const layeredContent = milestone.layeredContent;

  // Handle "Explain this" button click
  const handleExplainClick = () => {
    explainMilestone({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      date: milestone.date,
      category: milestone.category,
      tags: milestone.tags,
    });
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrevious && onPrevious) {
            e.preventDefault();
            onPrevious();
          }
          break;
        case 'ArrowRight':
          if (hasNext && onNext) {
            e.preventDefault();
            onNext();
          }
          break;
      }
    },
    [onClose, onNext, onPrevious, hasNext, hasPrevious]
  );

  // Set up keyboard listener and focus management
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    // Only prevent body scroll when not embedded (modal mode)
    if (!embedded) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (!embedded) {
        document.body.style.overflow = '';
      }
    };
  }, [handleKeyDown, embedded]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Panel content that's shared between modal and embedded modes
  const panelContent = (
    <div
      ref={panelRef}
      data-testid="milestone-detail"
      className={
        embedded
          ? 'bg-white dark:bg-gray-900 overflow-y-auto'
          : 'relative w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto'
      }
    >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
          <div className="flex items-center gap-2">
            {/* Navigation buttons */}
            {hasPrevious && onPrevious && (
              <button
                onClick={onPrevious}
                className="rounded-full p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                aria-label="Previous milestone"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {hasNext && onNext && (
              <button
                onClick={onNext}
                className="rounded-full p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                aria-label="Next milestone"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Action buttons - flashcard and close */}
          <div className="flex items-center gap-1">
            {/* Flashcard button with PackPicker (Sprint 22) */}
            <div
              ref={flashcardButtonRef}
              className="relative"
              onContextMenu={handleContextMenu}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <AddToFlashcardButton
                sourceType="milestone"
                sourceId={milestone.id}
                variant="icon"
                size="md"
              />

              {/* Pack indicator - shows which packs the milestone is in */}
              {packNames.length > 0 && (
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center"
                  title={`In packs: ${packNames.join(', ')}`}
                >
                  {packNames.length}
                </div>
              )}

              {/* PackPicker popover */}
              {showPackPicker && flashcard && (
                <div className="absolute top-full right-0 mt-2 z-50">
                  <PackPicker
                    selectedPackIds={selectedPackIds}
                    onPackToggle={handlePackToggle}
                    onClose={() => setShowPackPicker(false)}
                  />
                </div>
              )}
            </div>

            <button
              ref={closeButtonRef}
              onClick={onClose}
              data-testid="detail-close-btn"
              className="rounded-full p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              aria-label="Close detail view"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Date and badges */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div
              data-testid="detail-date"
              className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400"
            >
              <Calendar className="h-4 w-4" />
              <time dateTime={milestone.date} className="font-medium">
                {formatTimelineDate(date, 'full')}
              </time>
            </div>
            <div data-testid="detail-category">
              <CategoryBadge category={milestone.category} size="md" />
            </div>
            <SignificanceBadge
              significance={milestone.significance as SignificanceLevel}
              variant="badge"
              size="md"
            />
          </div>

          {/* Title */}
          <h2
            id="milestone-detail-title"
            data-testid="detail-title"
            className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
          >
            {milestone.title}
          </h2>

          {/* Era badge if available */}
          {milestone.era && (
            <div className="mb-4">
              <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                Era: {milestone.era}
              </span>
            </div>
          )}

          {/* Layered Explanations or Basic Description */}
          {/* Sprint 19: Pass audience-based default tab to LayeredExplanationTabs */}
          {/* Sprint 35: Layered content now comes from API response directly */}
          <div data-testid="detail-description" className="mb-4">
            {layeredContent ? (
              <LayeredExplanationTabs content={layeredContent} initialTab={defaultTab} />
            ) : (
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {milestone.description}
                </p>
              </div>
            )}
          </div>

          {/* Explain this with AI button */}
          <button
            onClick={handleExplainClick}
            data-testid="explain-button"
            className="
              flex items-center gap-2 mb-6 px-4 py-2
              bg-blue-50 dark:bg-blue-900/30
              hover:bg-blue-100 dark:hover:bg-blue-900/50
              text-blue-700 dark:text-blue-300
              rounded-lg transition-colors
              text-sm font-medium
            "
          >
            <Sparkles className="w-4 h-4" />
            Explain this with AI
          </button>

          {/* Organization */}
          {milestone.organization && (
            <div className="flex items-center gap-2 mb-4 text-gray-600 dark:text-gray-400">
              <Building2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <span className="font-medium">{milestone.organization}</span>
            </div>
          )}

          {/* Contributors */}
          {milestone.contributors.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2 text-gray-600 dark:text-gray-400">
                <Users className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                <span className="font-medium">Key Contributors</span>
              </div>
              <div className="flex flex-wrap gap-2 pl-7">
                {milestone.contributors.map((contributor) => (
                  <span
                    key={contributor}
                    className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-sm text-blue-700 dark:text-blue-300"
                  >
                    {contributor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {milestone.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2 text-gray-600 dark:text-gray-400">
                <Tag className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                <span className="font-medium">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2 pl-7">
                {milestone.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm text-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {milestone.sources && milestone.sources.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Sources</h3>
              <div className="space-y-2">
                {milestone.sources.map((source, index) => (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                        {source.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{source.kind}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* External source link */}
          {milestone.sourceUrl && !milestone.sources?.length && (
            <div className="mb-6">
              <a
                href={milestone.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                <span>View Source</span>
              </a>
            </div>
          )}

          {/* Image if available */}
          {milestone.imageUrl && (
            <div className="mb-6">
              <img
                src={milestone.imageUrl}
                alt={milestone.title}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
              />
            </div>
          )}

          {/* Metadata footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6 text-xs text-gray-500 dark:text-gray-400">
            <p>
              Added: {new Date(milestone.createdAt).toLocaleDateString()}
              {milestone.updatedAt !== milestone.createdAt && (
                <> · Updated: {new Date(milestone.updatedAt).toLocaleDateString()}</>
              )}
            </p>
          </div>
        </div>
      </div>
  );

  // When embedded, return just the panel content without modal wrapper
  if (embedded) {
    return panelContent;
  }

  // Modal mode: wrap in fixed overlay with backdrop
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-detail-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        aria-hidden="true"
      />
      {panelContent}
    </div>
  );
}

export default MilestoneDetail;
