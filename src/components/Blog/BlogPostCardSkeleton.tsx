/**
 * BlogPostCardSkeleton — matches the three BlogPostCard variants so the
 * loading → loaded transition doesn't jump layout. Mirrors the
 * MilestoneCardSkeleton pattern (animate-pulse blocks over the real shell).
 */

import { cn } from '../../lib/utils';

type Variant = 'default' | 'featured' | 'compact';

interface Props {
  variant?: Variant;
  className?: string;
}

export function BlogPostCardSkeleton({ variant = 'default', className }: Props) {
  const shimmer = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

  if (variant === 'compact') {
    return (
      <div
        aria-hidden="true"
        className={cn(
          'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-warm',
          className
        )}
      >
        <div className={`h-5 w-3/4 ${shimmer}`} />
        <div className="mt-3 space-y-2">
          <div className={`h-3.5 w-full ${shimmer}`} />
          <div className={`h-3.5 w-5/6 ${shimmer}`} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className={`h-6 w-6 rounded-full ${shimmer}`} />
          <div className={`h-3 w-24 ${shimmer}`} />
        </div>
      </div>
    );
  }

  if (variant === 'featured') {
    return (
      <div
        aria-hidden="true"
        className={cn(
          'overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-warm md:flex',
          className
        )}
      >
        <div className={`aspect-[16/9] md:w-1/2 ${shimmer} rounded-none`} />
        <div className="p-5 md:p-8 md:w-1/2 md:flex md:flex-col md:justify-center space-y-4">
          <div className={`h-3 w-20 ${shimmer}`} />
          <div className={`h-8 w-4/5 ${shimmer}`} />
          <div className="space-y-2">
            <div className={`h-4 w-full ${shimmer}`} />
            <div className={`h-4 w-5/6 ${shimmer}`} />
            <div className={`h-4 w-3/4 ${shimmer}`} />
          </div>
          <div className={`h-4 w-48 ${shimmer}`} />
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-warm',
        className
      )}
    >
      <div className={`aspect-[16/9] ${shimmer} rounded-none`} />
      <div className="p-5 space-y-3">
        <div className={`h-6 w-4/5 ${shimmer}`} />
        <div className="space-y-2">
          <div className={`h-3.5 w-full ${shimmer}`} />
          <div className={`h-3.5 w-5/6 ${shimmer}`} />
        </div>
        <div className={`h-3 w-1/2 ${shimmer}`} />
      </div>
    </div>
  );
}

export default BlogPostCardSkeleton;
