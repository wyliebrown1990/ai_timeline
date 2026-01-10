/**
 * ContributorHoverCard Component
 * Sprint 47 - Key Figures Frontend
 *
 * Hover preview card for key figures shown via Portal
 * Uses fixed positioning for proper z-index handling (project pattern)
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Building2, ChevronRight } from 'lucide-react';
import type { KeyFigure, KeyFigureRole } from '../../types/keyFigure';
import { ROLE_LABELS, ROLE_COLORS } from '../../types/keyFigure';

interface ContributorHoverCardProps {
  figure: KeyFigure;
  position: { x: number; y: number };
  onViewProfile: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * Generate initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Get role-specific background color for avatar
 */
const ROLE_AVATAR_COLORS: Record<KeyFigureRole, string> = {
  researcher: 'bg-blue-500',
  executive: 'bg-purple-500',
  founder: 'bg-green-500',
  policy_maker: 'bg-amber-500',
  engineer: 'bg-cyan-500',
  other: 'bg-gray-500',
};

export function ContributorHoverCard({
  figure,
  position,
  onViewProfile,
  onMouseEnter,
  onMouseLeave,
}: ContributorHoverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const initials = getInitials(figure.canonicalName);
  const avatarBg = ROLE_AVATAR_COLORS[figure.role];

  // Adjust position to keep card in viewport
  useEffect(() => {
    if (cardRef.current) {
      const card = cardRef.current;
      const rect = card.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust horizontal position if card would overflow
      if (rect.right > viewportWidth - 16) {
        card.style.left = `${viewportWidth - rect.width - 16}px`;
      }
      if (rect.left < 16) {
        card.style.left = '16px';
      }

      // Adjust vertical position if card would overflow bottom
      if (rect.bottom > viewportHeight - 16) {
        // Show above the trigger instead
        card.style.top = `${position.y - rect.height - 16}px`;
      }
    }
  }, [position]);

  const hoverCard = (
    <div
      ref={cardRef}
      className="fixed z-[100] w-72 bg-white dark:bg-gray-900 rounded-lg shadow-xl
                 border border-gray-200 dark:border-gray-700
                 animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: position.x - 144, // Center card on x position (half of 288px width)
        top: position.y,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Card content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="shrink-0">
            {figure.imageUrl ? (
              <img
                src={figure.imageUrl}
                alt={figure.canonicalName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-full ${avatarBg} flex items-center justify-center`}
              >
                <span className="text-sm font-semibold text-white">{initials}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {figure.canonicalName}
            </h4>
            <span
              className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[figure.role]}`}
            >
              {ROLE_LABELS[figure.role]}
            </span>
            {figure.primaryOrg && (
              <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                <Building2 className="w-3 h-3" />
                {figure.primaryOrg}
              </p>
            )}
          </div>
        </div>

        {/* Short bio */}
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {figure.shortBio}
        </p>

        {/* View profile link */}
        <button
          onClick={onViewProfile}
          className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-2
                     text-sm font-medium text-orange-600 dark:text-orange-400
                     bg-orange-50 dark:bg-orange-900/20 rounded-lg
                     hover:bg-orange-100 dark:hover:bg-orange-900/30
                     transition-colors"
        >
          View Profile
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return createPortal(hoverCard, document.body);
}
