interface MilestoneCardSkeletonProps {
  /** Display variant to match MilestoneCard variants */
  variant?: 'default' | 'compact' | 'featured';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton loading placeholder for MilestoneCard
 * Mimics the structure of the actual card for smooth transitions
 */
export function MilestoneCardSkeleton({
  variant = 'default',
  className = '',
}: MilestoneCardSkeletonProps) {
  const shimmerClass = 'animate-pulse bg-gray-200 rounded';

  // Compact skeleton
  if (variant === 'compact') {
    return (
      <div
        data-testid="milestone-skeleton"
        className={`relative rounded-lg border border-gray-200 bg-white p-3 ${className}`}
      >
        {/* Category indicator placeholder */}
        <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg bg-gray-200" />

        <div className="pl-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className={`h-3 w-12 ${shimmerClass}`} />
            <div className="flex gap-0.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-1.5 w-1.5 rounded-full ${shimmerClass}`} />
              ))}
            </div>
          </div>
          <div className={`h-4 w-3/4 ${shimmerClass}`} />
        </div>
      </div>
    );
  }

  // Featured skeleton
  if (variant === 'featured') {
    return (
      <div
        data-testid="milestone-skeleton"
        className={`overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-lg ${className}`}
      >
        {/* Header bar placeholder */}
        <div className={`h-2 ${shimmerClass}`} />

        <div className="p-5 space-y-4">
          {/* Date and badges row */}
          <div className="flex items-center gap-3">
            <div className={`h-5 w-24 ${shimmerClass}`} />
            <div className={`h-6 w-20 rounded-full ${shimmerClass}`} />
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-2 w-2 rounded-full ${shimmerClass}`} />
              ))}
            </div>
          </div>

          {/* Title */}
          <div className={`h-7 w-4/5 ${shimmerClass}`} />

          {/* Description lines */}
          <div className="space-y-2">
            <div className={`h-4 w-full ${shimmerClass}`} />
            <div className={`h-4 w-full ${shimmerClass}`} />
            <div className={`h-4 w-2/3 ${shimmerClass}`} />
          </div>

          {/* Metadata */}
          <div className="flex gap-4">
            <div className={`h-4 w-28 ${shimmerClass}`} />
            <div className={`h-4 w-32 ${shimmerClass}`} />
          </div>

          {/* Tags */}
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-5 w-16 rounded-full ${shimmerClass}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default skeleton
  return (
    <div
      data-testid="milestone-skeleton"
      className={`relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 ${className}`}
    >
      {/* Category color indicator placeholder */}
      <div className="absolute left-0 top-0 h-full w-1 bg-gray-200" />

      <div className="pl-2 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-4 w-12 ${shimmerClass}`} />
            <div className={`h-5 w-5 rounded-full ${shimmerClass}`} />
          </div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-1.5 w-1.5 rounded-full ${shimmerClass}`} />
            ))}
          </div>
        </div>

        {/* Title */}
        <div className={`h-5 w-3/4 ${shimmerClass}`} />

        {/* Description */}
        <div className="space-y-1.5">
          <div className={`h-4 w-full ${shimmerClass}`} />
          <div className={`h-4 w-5/6 ${shimmerClass}`} />
        </div>

        {/* Contributors */}
        <div className={`h-3 w-2/3 ${shimmerClass}`} />

        {/* Tags */}
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-5 w-14 ${shimmerClass}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface TimelineSkeletonProps {
  /** Number of skeleton cards to display */
  count?: number;
  /** Variant for individual cards */
  variant?: 'default' | 'compact' | 'featured';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Multiple skeleton cards for timeline loading state
 */
export function TimelineSkeleton({
  count = 5,
  variant = 'default',
  className = '',
}: TimelineSkeletonProps) {
  return (
    <div data-testid="timeline-skeleton" className={`space-y-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <MilestoneCardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
}

export default MilestoneCardSkeleton;
