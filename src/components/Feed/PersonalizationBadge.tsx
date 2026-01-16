/**
 * PersonalizationBadge Component (Sprint Feed-6)
 *
 * Displays "For You" or "You're Learning This" badges on feed items
 * based on user's engagement history and learning activity.
 */

import { memo } from 'react';
import { Sparkles, BookOpen } from 'lucide-react';

interface PersonalizationBadgeProps {
  type: 'for_you' | 'learning';
  className?: string;
}

function PersonalizationBadgeComponent({ type, className = '' }: PersonalizationBadgeProps) {
  if (type === 'learning') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium ${className}`}
      >
        <BookOpen className="w-3 h-3" />
        <span>You're learning this</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium ${className}`}
    >
      <Sparkles className="w-3 h-3" />
      <span>For You</span>
    </div>
  );
}

export const PersonalizationBadge = memo(PersonalizationBadgeComponent);

export default PersonalizationBadge;
