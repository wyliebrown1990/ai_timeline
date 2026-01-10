/**
 * KeyFigureModal Component
 * Sprint 47 - Key Figures Frontend
 *
 * Full detail modal for a key figure with bio, organizations, and related milestones
 * Uses Portal for proper z-index handling (project pattern)
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ExternalLink,
  Building2,
  Calendar,
  Linkedin,
  Twitter,
  BookOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { keyFiguresApi } from '../../services/api';
import type { KeyFigure, KeyFigureRole, ContributionType } from '../../types/keyFigure';
import { ROLE_LABELS, ROLE_COLORS, CONTRIBUTION_LABELS } from '../../types/keyFigure';

interface KeyFigureModalProps {
  figure: KeyFigure;
  onClose: () => void;
}

interface RelatedMilestone {
  id: string;
  title: string;
  date: string;
  category: string;
  contributionType?: ContributionType;
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

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function KeyFigureModal({ figure, onClose }: KeyFigureModalProps) {
  const [milestones, setMilestones] = useState<RelatedMilestone[]>([]);
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(true);

  const initials = getInitials(figure.canonicalName);
  const avatarBg = ROLE_AVATAR_COLORS[figure.role];

  // Fetch related milestones
  useEffect(() => {
    async function fetchMilestones() {
      try {
        setIsLoadingMilestones(true);
        const response = await keyFiguresApi.getMilestones(figure.id);
        // Map to RelatedMilestone type - API returns { milestone, contributionType }
        const mapped: RelatedMilestone[] = response.data.map((m) => ({
          id: m.milestone.id,
          title: m.milestone.title,
          date: m.milestone.date,
          category: m.milestone.category,
          contributionType: m.contributionType ?? undefined,
        }));
        setMilestones(mapped);
      } catch (err) {
        console.error('[KeyFigureModal] Failed to fetch milestones:', err);
      } finally {
        setIsLoadingMilestones(false);
      }
    }

    fetchMilestones();
  }, [figure.id]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      data-testid="key-figure-modal-backdrop"
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl
                   max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="figure-modal-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full
                     hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
          aria-label="Close modal"
          data-testid="key-figure-modal-close"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Header with avatar and basic info */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="shrink-0">
              {figure.imageUrl ? (
                <img
                  src={figure.imageUrl}
                  alt={figure.canonicalName}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div
                  className={`w-20 h-20 rounded-full ${avatarBg} flex items-center justify-center`}
                >
                  <span className="text-2xl font-semibold text-white">{initials}</span>
                </div>
              )}
            </div>

            {/* Name and role */}
            <div className="flex-1 min-w-0">
              <h2
                id="figure-modal-title"
                className="text-2xl font-bold text-gray-900 dark:text-gray-100"
              >
                {figure.canonicalName}
              </h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${ROLE_COLORS[figure.role]}`}
                >
                  {ROLE_LABELS[figure.role]}
                </span>
                {figure.primaryOrg && (
                  <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    <Building2 className="w-4 h-4" />
                    {figure.primaryOrg}
                  </span>
                )}
              </div>

              {/* Aliases */}
              {figure.aliases.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Also known as: {figure.aliases.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content sections */}
        <div className="p-6 space-y-6">
          {/* Short Bio */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              About
            </h3>
            <p className="text-gray-900 dark:text-gray-100">{figure.shortBio}</p>
          </section>

          {/* Full Bio (if available) */}
          {figure.fullBio && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Biography
              </h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {figure.fullBio}
              </p>
            </section>
          )}

          {/* Notable For */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Notable For
            </h3>
            <p className="text-gray-700 dark:text-gray-300">{figure.notableFor}</p>
          </section>

          {/* Organizations */}
          {figure.previousOrgs && figure.previousOrgs.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Previous Organizations
              </h3>
              <div className="flex flex-wrap gap-2">
                {figure.previousOrgs.map((org) => (
                  <span
                    key={org}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                               rounded-full text-sm"
                  >
                    {org}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Related Milestones */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Related Milestones ({isLoadingMilestones ? '...' : milestones.length})
            </h3>
            {isLoadingMilestones ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ))}
              </div>
            ) : milestones.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                No linked milestones yet.
              </p>
            ) : (
              <div className="space-y-2">
                {milestones.map((milestone) => (
                  <Link
                    key={milestone.id}
                    to={`/timeline?milestone=${milestone.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 rounded-lg
                               bg-gray-50 dark:bg-gray-800/50
                               hover:bg-orange-50 dark:hover:bg-orange-900/20
                               border border-gray-200 dark:border-gray-700
                               transition-colors group"
                  >
                    <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100
                                    group-hover:text-orange-600 dark:group-hover:text-orange-400
                                    truncate">
                        {milestone.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(milestone.date)}
                        {milestone.contributionType && (
                          <span className="ml-2">
                            • {CONTRIBUTION_LABELS[milestone.contributionType]}
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* External Links */}
          {(figure.wikipediaUrl || figure.linkedInUrl || figure.twitterHandle) && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                External Links
              </h3>
              <div className="flex flex-wrap gap-3">
                {figure.wikipediaUrl && (
                  <a
                    href={figure.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                               bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                               hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    Wikipedia
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {figure.linkedInUrl && (
                  <a
                    href={figure.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                               bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300
                               hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {figure.twitterHandle && (
                  <a
                    href={`https://twitter.com/${figure.twitterHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                               bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300
                               hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-colors text-sm"
                  >
                    <Twitter className="w-4 h-4" />
                    @{figure.twitterHandle}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
