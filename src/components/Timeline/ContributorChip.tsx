/**
 * ContributorChip Component
 * Sprint 47 - Key Figures Frontend
 *
 * Small chip showing a contributor name with hover preview and click to open modal
 */

import { useState, useRef } from 'react';
import type { KeyFigure, KeyFigureRole } from '../../types/keyFigure';
import { ContributorHoverCard } from './ContributorHoverCard';

interface ContributorChipProps {
  /** The key figure data */
  figure: KeyFigure;
  /** Called when chip is clicked to open detail modal */
  onViewProfile: () => void;
}

/**
 * Get role-specific text color for chip
 */
const ROLE_CHIP_COLORS: Record<KeyFigureRole, string> = {
  researcher: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  executive: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  founder: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  policy_maker: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  engineer: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export function ContributorChip({ figure, onViewProfile }: ContributorChipProps) {
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [hoverCardPosition, setHoverCardPosition] = useState({ x: 0, y: 0 });
  const chipRef = useRef<HTMLButtonElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chipColors = ROLE_CHIP_COLORS[figure.role];

  const clearAllTimeouts = () => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    // Cancel any pending hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    // Delay showing hover card to prevent flicker
    showTimeoutRef.current = setTimeout(() => {
      if (chipRef.current) {
        const rect = chipRef.current.getBoundingClientRect();
        setHoverCardPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8,
        });
        setShowHoverCard(true);
      }
    }, 200);
  };

  const handleMouseLeave = () => {
    // Cancel any pending show
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    // Delay hiding to allow mouse to reach hover card
    hideTimeoutRef.current = setTimeout(() => {
      setShowHoverCard(false);
    }, 150);
  };

  const handleHoverCardMouseEnter = () => {
    // Cancel pending hide when mouse enters hover card
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleHoverCardMouseLeave = () => {
    // Hide immediately when leaving hover card
    setShowHoverCard(false);
  };

  const handleClick = () => {
    clearAllTimeouts();
    setShowHoverCard(false);
    onViewProfile();
  };

  return (
    <>
      <button
        ref={chipRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
                   transition-colors cursor-pointer hover:opacity-80 ${chipColors}`}
        data-testid={`contributor-chip-${figure.id}`}
      >
        {figure.canonicalName}
      </button>

      {showHoverCard && (
        <ContributorHoverCard
          figure={figure}
          position={hoverCardPosition}
          onViewProfile={handleClick}
          onMouseEnter={handleHoverCardMouseEnter}
          onMouseLeave={handleHoverCardMouseLeave}
        />
      )}
    </>
  );
}

/**
 * Simple chip for unlinked contributors (just a name string)
 */
interface UnlinkedContributorChipProps {
  name: string;
}

export function UnlinkedContributorChip({ name }: UnlinkedContributorChipProps) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30
                 px-3 py-1 text-sm text-blue-700 dark:text-blue-300"
    >
      {name}
    </span>
  );
}
