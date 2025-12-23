import { Building2, Calendar, ExternalLink, Users } from 'lucide-react';
import { useState, useCallback, useRef } from 'react';
import type { MilestoneResponse } from '../../types/milestone';
import { SignificanceLevel } from '../../types/milestone';
import type { KeyFigure, ContributionType } from '../../types/keyFigure';
import {
  categoryBgClasses,
  formatTimelineDate,
  significanceScale,
} from '../../utils/timelineUtils';
import { CategoryBadge } from './CategoryBadge';
import { SignificanceIndicator } from './SignificanceBadge';
import { ContributorChip } from './ContributorChip';
import { AddToFlashcardButton, PackPicker } from '../Flashcards';
import { useFlashcardContext } from '../../contexts/FlashcardContext';

/** Linked key figure with contribution type */
interface LinkedKeyFigure {
  keyFigure: KeyFigure;
  contributionType?: ContributionType;
}

interface MilestoneCardProps {
  /** The milestone data to display */
  milestone: MilestoneResponse;
  /** Whether the card is in expanded state */
  isExpanded?: boolean;
  /** Callback when card is selected */
  onSelect?: (id: string) => void;
  /** Display variant */
  variant?: 'default' | 'compact' | 'featured';
  /** Additional CSS classes */
  className?: string;
  /** Linked key figures for this milestone (Sprint 47) */
  keyFigures?: LinkedKeyFigure[];
  /** Callback when a key figure chip is clicked (Sprint 47) */
  onViewFigure?: (figure: KeyFigure) => void;
}

/**
 * A card component displaying an AI milestone with category colors,
 * significance indicators, and interactive hover effects
 */
export function MilestoneCard({
  milestone,
  isExpanded = false,
  onSelect,
  variant = 'default',
  className = '',
  keyFigures = [],
  onViewFigure,
}: MilestoneCardProps) {
  const date = new Date(milestone.date);
  const scale = significanceScale[milestone.significance as SignificanceLevel] || 1;
  const categoryColor = categoryBgClasses[milestone.category] || 'bg-gray-500';

  // Scale-based styling for significance
  const isGroundbreaking = milestone.significance === SignificanceLevel.GROUNDBREAKING;
  const isMajor = milestone.significance >= SignificanceLevel.MAJOR;

  // Flashcard state and context (Sprint 22)
  const {
    getCardBySource,
    moveCardToPack,
    removeCardFromPack,
  } = useFlashcardContext();
  const [showPackPicker, setShowPackPicker] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get the flashcard for this milestone if it exists
  const flashcard = getCardBySource('milestone', milestone.id);
  const selectedPackIds = flashcard?.packIds ?? [];

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

  // Handle Shift+click to open PackPicker (only if card already saved)
  const handleFlashcardClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey && flashcard) {
        e.preventDefault();
        e.stopPropagation();
        setShowPackPicker(true);
      }
    },
    [flashcard]
  );

  // Handle long-press start (for mobile) to open PackPicker
  const handleTouchStart = useCallback(() => {
    if (!flashcard) return;
    longPressTimerRef.current = setTimeout(() => {
      setShowPackPicker(true);
    }, 500);
  }, [flashcard]);

  // Handle long-press end
  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleClick = () => {
    if (onSelect) {
      onSelect(milestone.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Flashcard button overlay component (reused across variants)
  const FlashcardOverlay = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => (
    <div
      className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      onClick={handleFlashcardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <AddToFlashcardButton
        sourceType="milestone"
        sourceId={milestone.id}
        variant="icon"
        size={size}
      />
      {/* PackPicker popover */}
      {showPackPicker && flashcard && (
        <div className="absolute top-full right-0 mt-2">
          <PackPicker
            selectedPackIds={selectedPackIds}
            onPackToggle={handlePackToggle}
            onClose={() => setShowPackPicker(false)}
          />
        </div>
      )}
    </div>
  );

  // Compact variant for dense timelines
  if (variant === 'compact') {
    return (
      <article
        data-testid="milestone-card"
        data-testid-full={`milestone-card-${milestone.id}`}
        data-category={milestone.category}
        data-significance={milestone.significance}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={onSelect ? 0 : undefined}
        role={onSelect ? 'button' : undefined}
        className={`
          group relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3
          shadow-sm transition-all duration-200
          hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          ${onSelect ? 'cursor-pointer' : ''}
          ${className}
        `.trim()}
      >
        {/* Flashcard button overlay (Sprint 22) */}
        <FlashcardOverlay size="sm" />

        {/* Category color indicator */}
        <div className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${categoryColor}`} />

        <div className="pl-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {formatTimelineDate(date, 'year')}
            </span>
            <SignificanceIndicator significance={milestone.significance as SignificanceLevel} />
          </div>
          <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
            {milestone.title}
          </h3>
        </div>
      </article>
    );
  }

  // Featured variant for groundbreaking milestones
  if (variant === 'featured' || isGroundbreaking) {
    return (
      <article
        data-testid="milestone-card"
        data-category={milestone.category}
        data-significance={milestone.significance}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={onSelect ? 0 : undefined}
        role={onSelect ? 'button' : undefined}
        className={`
          group relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white
          shadow-lg transition-all duration-300
          hover:border-gray-300 hover:shadow-xl hover:-translate-y-1
          ${onSelect ? 'cursor-pointer' : ''}
          ${isGroundbreaking ? 'ring-2 ring-amber-400/50' : ''}
          ${className}
        `.trim()}
        style={{
          transform: isExpanded ? 'scale(1.02)' : `scale(${scale})`,
        }}
      >
        {/* Flashcard button overlay (Sprint 22) */}
        <FlashcardOverlay size="md" />

        {/* Gradient header bar */}
        <div className={`h-2 ${categoryColor}`} />

        <div className="p-5">
          {/* Header with date and badges */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <time dateTime={milestone.date}>{formatTimelineDate(date, 'full')}</time>
            </div>
            <CategoryBadge category={milestone.category} size="sm" />
            <SignificanceIndicator
              significance={milestone.significance as SignificanceLevel}
              size="md"
            />
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
            {milestone.title}
          </h3>

          {/* Description */}
          <p className={`mt-2 text-gray-600 ${isExpanded ? '' : 'line-clamp-3'}`}>
            {milestone.description}
          </p>

          {/* Metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {milestone.organization && (
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{milestone.organization}</span>
              </div>
            )}
            {/* Key figures (Sprint 47) or legacy contributors */}
            {keyFigures.length > 0 ? (
              <div
                className="flex items-center gap-2 flex-wrap"
                onClick={(e) => e.stopPropagation()}
              >
                <Users className="h-4 w-4 shrink-0" />
                {keyFigures.slice(0, 3).map((lf) => (
                  <ContributorChip
                    key={lf.keyFigure.id}
                    figure={lf.keyFigure}
                    onViewProfile={() => onViewFigure?.(lf.keyFigure)}
                  />
                ))}
                {keyFigures.length > 3 && (
                  <span className="text-xs text-gray-400">
                    +{keyFigures.length - 3} more
                  </span>
                )}
              </div>
            ) : milestone.contributors.length > 0 ? (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>
                  {milestone.contributors.slice(0, 2).join(', ')}
                  {milestone.contributors.length > 2 &&
                    ` +${milestone.contributors.length - 2}`}
                </span>
              </div>
            ) : null}
            {milestone.sourceUrl && (
              <a
                href={milestone.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Source</span>
              </a>
            )}
          </div>

          {/* Tags */}
          {milestone.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {milestone.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
              {milestone.tags.length > 5 && (
                <span className="text-xs text-gray-400">+{milestone.tags.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </article>
    );
  }

  // Default variant
  return (
    <article
      data-testid="milestone-card"
      data-category={milestone.category}
      data-significance={milestone.significance}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onSelect ? 0 : undefined}
      role={onSelect ? 'button' : undefined}
      className={`
        group relative overflow-hidden rounded-lg border border-gray-200 bg-white
        shadow-sm transition-all duration-200
        hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5
        ${onSelect ? 'cursor-pointer' : ''}
        ${isMajor ? 'border-l-4' : ''}
        ${className}
      `.trim()}
      style={{
        borderLeftColor: isMajor ? undefined : 'transparent',
      }}
    >
      {/* Flashcard button overlay (Sprint 22) */}
      <FlashcardOverlay size="sm" />

      {/* Category color indicator */}
      <div
        className={`absolute left-0 top-0 h-full w-1 ${categoryColor} ${isMajor ? 'hidden' : ''}`}
      />

      {/* Major milestone gets thicker border */}
      {isMajor && <div className={`absolute left-0 top-0 h-full w-1 ${categoryColor}`} />}

      <div className="p-4 pl-3">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <time
              dateTime={milestone.date}
              className="text-sm font-medium text-gray-500"
            >
              {formatTimelineDate(date, 'year')}
            </time>
            <CategoryBadge category={milestone.category} size="sm" showLabel={false} />
          </div>
          <SignificanceIndicator
            significance={milestone.significance as SignificanceLevel}
            size="sm"
          />
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {milestone.title}
        </h3>

        {/* Description */}
        <p className="mt-1.5 text-sm text-gray-600 line-clamp-2">{milestone.description}</p>

        {/* Key figures (Sprint 47) or legacy contributors */}
        {keyFigures.length > 0 ? (
          <div
            className="mt-2 flex flex-wrap items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-medium text-gray-500">Key people:</span>
            {keyFigures.slice(0, 3).map((lf) => (
              <ContributorChip
                key={lf.keyFigure.id}
                figure={lf.keyFigure}
                onViewProfile={() => onViewFigure?.(lf.keyFigure)}
              />
            ))}
            {keyFigures.length > 3 && (
              <span className="text-xs text-gray-400">+{keyFigures.length - 3}</span>
            )}
          </div>
        ) : milestone.contributors.length > 0 ? (
          <p className="mt-2 text-xs text-gray-500">
            <span className="font-medium">Key people:</span>{' '}
            {milestone.contributors.slice(0, 3).join(', ')}
            {milestone.contributors.length > 3 && '...'}
          </p>
        ) : null}

        {/* Tags */}
        {milestone.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {milestone.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
              >
                {tag}
              </span>
            ))}
            {milestone.tags.length > 3 && (
              <span className="text-xs text-gray-400">+{milestone.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default MilestoneCard;
