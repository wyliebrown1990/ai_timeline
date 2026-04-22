/**
 * NotFoundPage — site-wide 404 fallback.
 *
 * Rendered by the catch-all `<Route path="*" />` in App.tsx. Before this page
 * existed, unknown URLs fell through React Router entirely and produced a
 * blank dark screen with no chrome — caught during Sprint Blog-1 live QA on
 * /blog (the UI page lands in Blog-2). This page now wins the fallback so
 * every unmatched URL shows proper navigation + a useful message.
 *
 * Emits `<meta name="robots" content="noindex, nofollow">` so Google does
 * not index 404s.
 */

import { Link, useLocation } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { SEO } from '../components/SEO';

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <>
      <SEO title="Page not found" noIndex />
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <Compass className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Page not found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          We couldn't find anything at{' '}
          <code className="text-sm px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
            {location.pathname}
          </code>
          .
        </p>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          It may have moved, or it might not be built yet. Try one of these instead:
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Link
            to="/timeline"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Open the Timeline
          </Link>
          <Link
            to="/learn"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Browse Learning Paths
          </Link>
          <Link
            to="/glossary"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Glossary
          </Link>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </>
  );
}
