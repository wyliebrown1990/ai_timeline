import { Building2, Calendar, Milestone, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TimelineStatsProps {
  /** Total number of milestones */
  milestoneCount: number;
  /** Number of organizations */
  organizationCount?: number;
  /** Number of key figures */
  figureCount?: number;
  /** Year range string (e.g., "1950-2026") */
  yearRange?: string;
  /** Whether stats are still loading */
  isLoading?: boolean;
}

/**
 * TimelineStats - Quick stats bar showing timeline coverage
 * Sprint TD-5: Above-the-fold content for SEO and user engagement
 */
export function TimelineStats({
  milestoneCount,
  organizationCount = 50,
  figureCount = 100,
  yearRange = '1943-2026',
  isLoading = false,
}: TimelineStatsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 py-3 px-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-800 border-b border-orange-100 dark:border-gray-700">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      icon: Milestone,
      value: `${milestoneCount}+`,
      label: 'Milestones',
      href: '/timeline',
    },
    {
      icon: Building2,
      value: `${organizationCount}+`,
      label: 'Organizations',
      href: '/timeline?view=orgs',
    },
    {
      icon: Users,
      value: `${figureCount}+`,
      label: 'Key Figures',
      href: '/people/alan-turing',
    },
    {
      icon: Calendar,
      value: yearRange,
      label: 'Coverage',
      href: '/timeline/complete-history',
    },
  ];

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-800 border-b border-orange-100 dark:border-gray-700">
      <div className="container-main">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 py-3">
          {stats.map((stat, index) => (
            <Link
              key={index}
              to={stat.href}
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors group"
            >
              <stat.icon className="h-4 w-4 text-orange-500 dark:text-orange-400 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">{stat.value}</span>
              <span className="text-gray-500 dark:text-gray-400">{stat.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TimelineStats;
