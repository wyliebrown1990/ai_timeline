import {
  Beaker,
  Box,
  Briefcase,
  Lightbulb,
  Scale,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { MilestoneCategory } from '../../types/milestone';
import { categoryBadgeClasses, categoryLabels } from '../../utils/timelineUtils';

/**
 * Icons for each milestone category
 */
export const categoryIcons: Record<MilestoneCategory, LucideIcon> = {
  [MilestoneCategory.RESEARCH]: Beaker,
  [MilestoneCategory.MODEL_RELEASE]: Box,
  [MilestoneCategory.BREAKTHROUGH]: Lightbulb,
  [MilestoneCategory.PRODUCT]: Sparkles,
  [MilestoneCategory.REGULATION]: Scale,
  [MilestoneCategory.INDUSTRY]: Briefcase,
};

/**
 * Standalone category icon component
 */
interface CategoryIconProps {
  category: MilestoneCategory;
  className?: string;
}

export function CategoryIcon({ category, className = 'h-4 w-4' }: CategoryIconProps) {
  const Icon = categoryIcons[category];
  return <Icon className={className} aria-hidden="true" />;
}

interface CategoryBadgeProps {
  /** The milestone category to display */
  category: MilestoneCategory;
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Whether to show the label text */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * A badge component displaying a milestone category with color and optional icon
 */
export function CategoryBadge({
  category,
  showIcon = true,
  showLabel = true,
  size = 'md',
  className = '',
}: CategoryBadgeProps) {
  const Icon = categoryIcons[category];
  const label = categoryLabels[category];
  const colorClasses = categoryBadgeClasses[category];

  // Size-specific classes
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <span
      data-category={category}
      className={`
        inline-flex items-center rounded-full border font-medium
        ${colorClasses}
        ${sizeClasses[size]}
        ${className}
      `.trim()}
    >
      {showIcon && <Icon className={iconSizes[size]} aria-hidden="true" />}
      {showLabel && <span>{label}</span>}
    </span>
  );
}

interface CategoryLegendProps {
  /** Categories to display (defaults to all) */
  categories?: MilestoneCategory[];
  /** Size of individual badges */
  size?: 'sm' | 'md' | 'lg';
  /** Orientation of the legend */
  orientation?: 'horizontal' | 'vertical';
  /** Additional CSS classes */
  className?: string;
}

/**
 * A legend component showing all category badges
 */
export function CategoryLegend({
  categories = Object.values(MilestoneCategory),
  size = 'sm',
  orientation = 'horizontal',
  className = '',
}: CategoryLegendProps) {
  return (
    <div
      data-testid="category-legend"
      className={`
        flex flex-wrap gap-2
        ${orientation === 'vertical' ? 'flex-col items-start' : 'items-center'}
        ${className}
      `.trim()}
    >
      {categories.map((category) => (
        <CategoryBadge key={category} category={category} size={size} />
      ))}
    </div>
  );
}

export default CategoryBadge;
