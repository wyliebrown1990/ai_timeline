/**
 * TimelineSlugPage - Route wrapper for /timeline/:slug
 * Sprint TD-2 - Dedicated SEO Landing Pages
 *
 * This component acts as a router between:
 * - EraPage: for decade-based slugs (1950s, 1960s, etc.)
 * - FilteredTimelinePage: for company/category slugs (openai, anthropic, etc.)
 */

import { useParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { getEraBySlug } from '../config/eras';
import { PageLoader } from '../components/PageLoader';

// Lazy load the actual page components
const EraPage = lazy(() => import('./EraPage'));
const FilteredTimelinePage = lazy(() => import('./FilteredTimelinePage'));

/**
 * TimelineSlugPage - determines which page component to render based on slug type
 */
export default function TimelineSlugPage() {
  const { slug } = useParams<{ slug: string }>();

  // Check if this is an era slug (decade-based like 1950s, 1960s)
  const eraConfig = slug ? getEraBySlug(slug) : undefined;

  return (
    <Suspense fallback={<PageLoader />}>
      {eraConfig ? (
        // Render EraPage for decade slugs
        <EraPage />
      ) : (
        // Render FilteredTimelinePage for filter slugs (or 404 if neither)
        <FilteredTimelinePage />
      )}
    </Suspense>
  );
}
