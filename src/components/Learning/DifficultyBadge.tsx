import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../../types/glossary';

interface DifficultyBadgeProps {
  difficulty: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

/**
 * Badge component displaying term difficulty level
 * Uses color coding from green (beginner) to red (expert)
 */
export function DifficultyBadge({
  difficulty,
  size = 'md',
  showLabel = true,
}: DifficultyBadgeProps) {
  const label = DIFFICULTY_LABELS[difficulty] || 'Unknown';
  const colorClass = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS[1];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colorClass} ${sizeClasses[size]}`}
      title={`Difficulty: ${label}`}
    >
      {showLabel ? label : `Level ${difficulty}`}
    </span>
  );
}

export default DifficultyBadge;
