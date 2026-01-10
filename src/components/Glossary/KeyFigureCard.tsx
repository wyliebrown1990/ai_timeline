/**
 * KeyFigureCard Component
 * Sprint 47 - Key Figures Frontend
 *
 * Displays a key figure in a card format with photo, name, role, and organization
 */

import type { KeyFigure, KeyFigureRole } from '../../types/keyFigure';
import { ROLE_LABELS, ROLE_COLORS } from '../../types/keyFigure';

interface KeyFigureCardProps {
  figure: KeyFigure;
  onClick: () => void;
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
 * Get role-specific background color for avatar placeholder
 */
const ROLE_AVATAR_COLORS: Record<KeyFigureRole, string> = {
  researcher: 'bg-blue-500',
  executive: 'bg-purple-500',
  founder: 'bg-green-500',
  policy_maker: 'bg-amber-500',
  engineer: 'bg-cyan-500',
  other: 'bg-gray-500',
};

export function KeyFigureCard({ figure, onClick }: KeyFigureCardProps) {
  const initials = getInitials(figure.canonicalName);
  const avatarBg = ROLE_AVATAR_COLORS[figure.role];

  return (
    <button
      onClick={onClick}
      className="group text-left w-full p-4 rounded-lg border border-gray-200 dark:border-gray-700
                 hover:border-orange-300 dark:hover:border-orange-600
                 hover:bg-orange-50 dark:hover:bg-orange-900/20
                 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                 dark:focus:ring-offset-gray-900"
      data-testid={`key-figure-card-${figure.id}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar / Image */}
        <div className="shrink-0">
          {figure.imageUrl ? (
            <img
              src={figure.imageUrl}
              alt={figure.canonicalName}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-14 h-14 rounded-full ${avatarBg} flex items-center justify-center`}
            >
              <span className="text-lg font-semibold text-white">{initials}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name and Role */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100
                           group-hover:text-orange-600 dark:group-hover:text-orange-400
                           transition-colors truncate">
              {figure.canonicalName}
            </h3>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[figure.role]}`}
            >
              {ROLE_LABELS[figure.role]}
            </span>
          </div>

          {/* Organization */}
          {figure.primaryOrg && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {figure.primaryOrg}
            </p>
          )}

          {/* Notable For (truncated) */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
            {figure.notableFor}
          </p>
        </div>
      </div>
    </button>
  );
}
