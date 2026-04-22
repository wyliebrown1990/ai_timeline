/**
 * BlogBreadcrumbs — visible navigation trail that must mirror the
 * BreadcrumbList JSON-LD emitted in Blog-5. Schema without visible
 * breadcrumbs is a Google guidelines violation, so the labels and order
 * here drive both.
 */

import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string; // last crumb is typically current page — omit `to` there
}

interface Props {
  items: Crumb[];
  className?: string;
}

export function BlogBreadcrumbs({ items, className = '' }: Props) {
  return (
    <nav aria-label="Breadcrumb" className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li>
                {item.to && !isLast ? (
                  <Link
                    to={item.to}
                    className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={isLast ? 'page' : undefined} className="text-gray-900 dark:text-gray-200 font-medium">
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="text-gray-400 dark:text-gray-600">
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export default BlogBreadcrumbs;
