import { BarChart3, ChevronDown, Compass, FileText, FlaskConical, History, Layers3, Wrench } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  {
    href: '/admin/seo-insights',
    label: 'Insights',
    icon: BarChart3,
  },
  {
    href: '/admin/seo-insights/clusters',
    label: 'Clusters',
    icon: Layers3,
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
  {
    href: '/admin/seo-insights/experiments',
    label: 'Experiments',
    icon: FlaskConical,
  },
  {
    href: '/admin/seo-insights/packaging',
    label: 'Packaging',
    icon: Wrench,
  },
  {
    href: '/admin/seo-insights/portfolio',
    label: 'Portfolio',
    icon: Compass,
  },
];

interface SeoInsightsSectionNavProps {
  activeCount?: number | null;
}

function formatCount(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value).toLocaleString();
}

export function SeoInsightsSectionNav({ activeCount }: SeoInsightsSectionNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeHref = NAV_ITEMS.find((item) => (
    item.href === '/admin/seo-insights'
      ? location.pathname === item.href
      : location.pathname.startsWith(item.href)
  ))?.href ?? '/admin/seo-insights';
  const activeCountLabel = formatCount(activeCount);

  return (
    <div className="space-y-3" data-testid="seo-insights-section-nav">
      <div className="md:hidden">
        <label htmlFor="seo-insights-section-select" className="sr-only">SEO insights section</label>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <select
            id="seo-insights-section-select"
            aria-label="SEO insights section"
            value={activeHref}
            onChange={(event) => navigate(event.target.value)}
            className="w-full appearance-none bg-transparent px-4 py-3 pr-11 text-sm font-medium text-slate-900 outline-none transition-colors focus:bg-sky-50"
            data-testid="seo-insights-section-select"
          >
            {NAV_ITEMS.map((item) => (
              <option key={item.href} value={item.href}>
                {item.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>

      <nav
        aria-label="SEO insights sections"
        className="hidden flex-nowrap items-center gap-1.5 overflow-x-auto rounded-full border border-slate-200 bg-white/90 p-1.5 shadow-sm backdrop-blur md:inline-flex xl:gap-2"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === activeHref;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/admin/seo-insights'}
              className={({ isActive }) =>
                [
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors xl:gap-2 xl:px-4 xl:text-sm',
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')
              }
            >
              <Icon className="hidden h-4 w-4 xl:block" />
              {item.label}
              {isActive && activeCountLabel ? (
                <span
                  className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold tracking-normal text-current"
                  data-testid="seo-insights-nav-active-count"
                >
                  {activeCountLabel}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export default SeoInsightsSectionNav;
