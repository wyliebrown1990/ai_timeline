/**
 * Subject Badge Component
 * Sprint Subj-5 - UI & Discovery
 *
 * Reusable badge for displaying subject classifications
 */

import { cn } from '../../lib/utils';
import type { SubjectBase } from '../../types/subject';
import { getSubjectColor } from '../../types/subject';

interface SubjectBadgeProps {
  subject: SubjectBase;
  size?: 'sm' | 'md' | 'lg';
  showPath?: boolean;
  onClick?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export function SubjectBadge({
  subject,
  size = 'md',
  showPath = false,
  onClick,
  className,
}: SubjectBadgeProps) {
  const color = getSubjectColor(subject);
  const isClickable = !!onClick;

  const Component = isClickable ? 'button' : 'span';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full font-medium border transition-colors',
        sizeClasses[size],
        isClickable && 'hover:opacity-80 cursor-pointer',
        className
      )}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        borderColor: `${color}40`,
      }}
    >
      {subject.icon && <span className="mr-1">{subject.icon}</span>}
      {showPath && subject.level > 0 && (
        <span className="opacity-60 mr-1 font-normal">
          {subject.path.split(' > ').slice(0, -1).join(' > ')} ›
        </span>
      )}
      {subject.name}
    </Component>
  );
}

/**
 * Grouped subject badges with overflow indicator
 */
interface SubjectBadgeGroupProps {
  subjects: SubjectBase[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  onBadgeClick?: (subject: SubjectBase) => void;
  className?: string;
}

export function SubjectBadgeGroup({
  subjects,
  maxVisible = 2,
  size = 'sm',
  onBadgeClick,
  className,
}: SubjectBadgeGroupProps) {
  const visible = subjects.slice(0, maxVisible);
  const overflow = subjects.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {visible.map((subject) => (
        <SubjectBadge
          key={subject.id}
          subject={subject}
          size={size}
          onClick={onBadgeClick ? () => onBadgeClick(subject) : undefined}
        />
      ))}
      {overflow > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          +{overflow} more
        </span>
      )}
    </div>
  );
}
