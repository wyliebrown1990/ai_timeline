import { BarChart3, FileText, History } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  {
    href: '/admin/seo-insights',
    label: 'Insights',
    icon: BarChart3,
  },
  {
    href: '/admin/seo-insights/actions',
    label: 'Actions',
    icon: History,
  },
  {
    href: '/admin/seo-insights/proposals',
    label: 'Proposals',
    icon: FileText,
  },
];

export function SeoInsightsSectionNav() {
  return (
    <nav
      aria-label="SEO insights sections"
      className="inline-flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/90 p-1.5 shadow-sm backdrop-blur"
      data-testid="seo-insights-section-nav"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/admin/seo-insights'}
            className={({ isActive }) =>
              [
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default SeoInsightsSectionNav;
