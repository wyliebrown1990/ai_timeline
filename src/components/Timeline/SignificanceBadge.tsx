import { SignificanceLevel } from '../../types/milestone';
import { significanceLabels } from '../../utils/timelineUtils';

/**
 * Visual styling for each significance level
 */
const significanceClasses: Record<SignificanceLevel, string> = {
  [SignificanceLevel.MINOR]: 'bg-gray-200 text-gray-600',
  [SignificanceLevel.MODERATE]: 'bg-yellow-200 text-yellow-700',
  [SignificanceLevel.MAJOR]: 'bg-orange-200 text-orange-700',
  [SignificanceLevel.GROUNDBREAKING]: 'bg-red-200 text-red-700 ring-2 ring-red-300',
};

/**
 * Dot indicator classes for compact display
 */
const significanceDotClasses: Record<SignificanceLevel, string> = {
  [SignificanceLevel.MINOR]: 'bg-gray-400',
  [SignificanceLevel.MODERATE]: 'bg-yellow-500',
  [SignificanceLevel.MAJOR]: 'bg-orange-500',
  [SignificanceLevel.GROUNDBREAKING]: 'bg-red-500 ring-2 ring-red-300 animate-pulse',
};

interface SignificanceBadgeProps {
  /** The significance level to display */
  significance: SignificanceLevel;
  /** Display variant: 'badge' shows full badge, 'dot' shows compact indicator */
  variant?: 'badge' | 'dot';
  /** Whether to show the label text (badge variant only) */
  showLabel?: boolean;
  /** Size of the badge or dot */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * A badge or dot component displaying a milestone's significance level
 */
export function SignificanceBadge({
  significance,
  variant = 'badge',
  showLabel = true,
  size = 'md',
  className = '',
}: SignificanceBadgeProps) {
  const label = significanceLabels[significance];

  if (variant === 'dot') {
    const dotSizes = {
      sm: 'h-2 w-2',
      md: 'h-3 w-3',
      lg: 'h-4 w-4',
    };

    return (
      <span
        data-significance={significance}
        className={`
          inline-block rounded-full
          ${significanceDotClasses[significance]}
          ${dotSizes[size]}
          ${className}
        `.trim()}
        title={`Significance: ${label}`}
        aria-label={`Significance: ${label}`}
      />
    );
  }

  // Badge variant
  const badgeSizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      data-significance={significance}
      className={`
        inline-flex items-center rounded-full font-medium
        ${significanceClasses[significance]}
        ${badgeSizes[size]}
        ${className}
      `.trim()}
    >
      {showLabel && label}
    </span>
  );
}

interface SignificanceIndicatorProps {
  /** The significance level */
  significance: SignificanceLevel;
  /** Maximum significance to show (for scale display) */
  maxLevel?: SignificanceLevel;
  /** Size of each dot */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * A scale indicator showing significance as filled dots
 */
export function SignificanceIndicator({
  significance,
  maxLevel = SignificanceLevel.GROUNDBREAKING,
  size = 'sm',
  className = '',
}: SignificanceIndicatorProps) {
  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-3 w-3',
  };

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      title={`Significance: ${significanceLabels[significance]}`}
      aria-label={`Significance: ${significanceLabels[significance]}`}
    >
      {Array.from({ length: maxLevel }, (_, i) => {
        const level = (i + 1) as SignificanceLevel;
        const isFilled = level <= significance;

        return (
          <span
            key={level}
            className={`
              rounded-full
              ${dotSizes[size]}
              ${isFilled ? significanceDotClasses[level] : 'bg-gray-200'}
            `.trim()}
          />
        );
      })}
    </div>
  );
}

export default SignificanceBadge;
