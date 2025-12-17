/**
 * LoadingSkeleton - Animated placeholder for loading states
 */

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function LoadingSkeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}: LoadingSkeletonProps) {
  const baseClasses =
    'animate-pulse bg-gray-200 dark:bg-gray-700';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]} h-4`}
            style={{
              width: i === lines - 1 ? '60%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

/**
 * Card skeleton for milestone cards
 */
export function MilestoneCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <LoadingSkeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <LoadingSkeleton className="mb-2 h-5 w-3/4" />
          <LoadingSkeleton className="mb-2 h-4 w-1/4" />
          <LoadingSkeleton lines={2} />
        </div>
      </div>
    </div>
  );
}

/**
 * Timeline loading skeleton
 */
export function TimelineSkeleton() {
  return (
    <div className="space-y-4 p-4" role="status" aria-label="Loading timeline">
      {Array.from({ length: 5 }).map((_, i) => (
        <MilestoneCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
