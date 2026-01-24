import { Link } from 'react-router-dom';

interface CompanyQuickFiltersProps {
  /** Currently active company filter */
  activeCompany?: string;
}

const COMPANIES = [
  { slug: 'openai', name: 'OpenAI', color: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' },
  { slug: 'anthropic', name: 'Anthropic', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400' },
  { slug: 'google', name: 'Google', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400' },
  { slug: 'meta', name: 'Meta', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { slug: 'microsoft', name: 'Microsoft', color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400' },
];

/**
 * CompanyQuickFilters - Quick filter buttons for major AI companies
 * Sprint TD-5: UX & Search Intent Matching
 */
export function CompanyQuickFilters({
  activeCompany,
}: CompanyQuickFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        By Company:
      </span>
      {COMPANIES.map((company) => {
        const isActive = activeCompany === company.slug;

        // Use Link for navigation to dedicated pages
        return (
          <Link
            key={company.slug}
            to={`/timeline/${company.slug}`}
            className={`
              inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all
              ${isActive
                ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500'
                : ''
              }
              ${company.color}
            `}
            aria-pressed={isActive}
          >
            {company.name}
          </Link>
        );
      })}
    </div>
  );
}

export default CompanyQuickFilters;
