import { Lock } from 'lucide-react';

interface Props {
  // 'admin' chips match the IngestedArticlesPage chip-strip family (rounded + flat colors).
  // 'feed' chips match the FeedCardHeader personalization-chip family (rounded-full + opacity tint).
  variant?: 'admin' | 'feed';
  // Icon-only (text hidden) for narrow viewports / dense rows like FeedCard mobile.
  // Screen readers still get "Paywalled" via aria-label.
  compact?: boolean;
  // Admin surfaces only — surfaces the heuristic reason in the title tooltip.
  // Public surfaces should leave this off; the reason is internal vocabulary.
  paywallReason?: string | null;
  showReasonInTooltip?: boolean;
  className?: string;
}

const ADMIN_CLASS =
  'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ' +
  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200';

const FEED_CLASS =
  'inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ' +
  'bg-amber-500/10 text-amber-600 dark:text-amber-400';

export function PaywallBadge({
  variant = 'admin',
  compact = false,
  paywallReason,
  showReasonInTooltip = false,
  className = '',
}: Props) {
  const baseClass = variant === 'feed' ? FEED_CLASS : ADMIN_CLASS;
  const title = showReasonInTooltip && paywallReason
    ? `Paywalled — reason: ${paywallReason}`
    : 'Paywalled';

  return (
    <span
      className={`${baseClass} ${className}`.trim()}
      title={title}
      aria-label={compact ? 'Paywalled' : undefined}
    >
      <Lock className="w-3 h-3" aria-hidden="true" />
      <span className={compact ? 'sr-only sm:not-sr-only' : ''}>Paywalled</span>
    </span>
  );
}
