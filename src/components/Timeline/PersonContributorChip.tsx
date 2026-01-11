/**
 * PersonContributorChip Component
 * Sprint KPC-3 - Cross-Linking Infrastructure
 *
 * Chip showing a linked Person contributor with click to navigate to profile
 */

import { Link } from 'react-router-dom';
import type { MilestoneContributor } from '../../services/api';

interface PersonContributorChipProps {
  /** The person contributor data */
  person: MilestoneContributor;
}

/**
 * Get role-specific chip colors
 */
const ROLE_CHIP_COLORS: Record<string, string> = {
  researcher: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  executive: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  founder: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  policy_maker: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  engineer: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  academic: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  investor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const DEFAULT_CHIP_COLOR = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

/**
 * Get contribution type badge styling
 */
const CONTRIBUTION_TYPE_BADGES: Record<string, string> = {
  lead: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  co_author: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  advisor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  founder: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  mentioned: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function PersonContributorChip({ person }: PersonContributorChipProps) {
  const chipColors = ROLE_CHIP_COLORS[person.role] || DEFAULT_CHIP_COLOR;
  const contributionBadge = person.contributionType
    ? CONTRIBUTION_TYPE_BADGES[person.contributionType] || CONTRIBUTION_TYPE_BADGES.mentioned
    : null;

  return (
    <Link
      to={`/people/${person.slug}`}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium
                 transition-colors cursor-pointer hover:opacity-80 ${chipColors}`}
      data-testid={`person-contributor-chip-${person.id}`}
    >
      {/* Avatar */}
      {person.imageUrl ? (
        <img
          src={person.imageUrl}
          alt={person.canonicalName}
          className="w-5 h-5 rounded-full object-cover"
        />
      ) : (
        <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
          {person.canonicalName.charAt(0)}
        </div>
      )}

      {/* Name */}
      <span>{person.canonicalName}</span>

      {/* Contribution type badge (if not 'mentioned') */}
      {contributionBadge && person.contributionType !== 'mentioned' && (
        <span className={`text-xs px-1.5 py-0.5 rounded ${contributionBadge}`}>
          {person.contributionType?.replace('_', ' ')}
        </span>
      )}
    </Link>
  );
}

export default PersonContributorChip;
