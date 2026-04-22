/**
 * PeoplePage — `/people`.
 *
 * Hub listing every published Person entity. Matches the SubjectsPage + feed
 * pattern: simple responsive card grid, debounced search, role filter,
 * skeletons on load.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { SEO } from '../components/SEO';
import { personsApi } from '../services/api';
import type { Person, PersonRole } from '../types/person';
import { EmptyState, ErrorState } from '../components/ui';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

const ROLE_LABELS: Record<PersonRole, string> = {
  researcher: 'Researcher',
  executive: 'Executive',
  founder: 'Founder',
  policy_maker: 'Policy maker',
  engineer: 'Engineer',
  other: 'Other',
};

const ROLE_BADGE_STYLES: Record<PersonRole, string> = {
  researcher: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  executive: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  founder: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  policy_maker: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  engineer: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function PeoplePage() {
  const [persons, setPersons] = useState<Person[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<PersonRole | 'all'>('all');

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await personsApi.getAll({ limit: 100, sort: 'name' });
      setPersons(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load people');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!persons) return [];
    const qLower = debouncedQ.toLowerCase();
    return persons.filter((p) => {
      if (roleFilter !== 'all' && p.role !== roleFilter) return false;
      if (!qLower) return true;
      const hay = `${p.canonicalName} ${p.shortBio} ${(p.aliases ?? []).join(' ')}`.toLowerCase();
      return hay.includes(qLower);
    });
  }, [persons, debouncedQ, roleFilter]);

  return (
    <>
      <SEO
        title="People"
        description="Researchers, executives, founders, and engineers shaping the history of artificial intelligence."
        canonical="https://letaiexplainai.com/people"
      />
      <div className="container-main mx-auto max-w-7xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">People</h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
            Researchers, executives, founders, and engineers shaping the history of artificial
            intelligence.
          </p>
        </header>

        <div className="mb-8 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', ...Object.keys(ROLE_LABELS)] as Array<PersonRole | 'all'>).map((role) => {
              const active = roleFilter === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={
                    active
                      ? 'rounded-full px-3 py-1 text-xs font-medium bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      : 'rounded-full px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                >
                  {role === 'all' ? 'All' : ROLE_LABELS[role as PersonRole]}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState title="Couldn't load people" message={error} onRetry={() => void load()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No people match"
            description={
              persons && persons.length === 0
                ? 'No people have been added yet.'
                : 'Try a different search term or clear the role filter.'
            }
            cta={
              debouncedQ || roleFilter !== 'all'
                ? {
                    label: 'Clear filters',
                    onClick: () => {
                      setQ('');
                      setRoleFilter('all');
                    },
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to={`/people/${p.slug}`}
                className="group block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-warm hover:shadow-warm-md transition-all motion-safe:hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-sm font-semibold text-orange-700 dark:text-orange-300"
                    >
                      {p.canonicalName
                        .split(/\s+/)
                        .map((w) => w[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400">
                        {p.canonicalName}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE_STYLES[p.role as PersonRole] ?? ROLE_BADGE_STYLES.other}`}
                      >
                        {ROLE_LABELS[p.role as PersonRole] ?? p.role}
                      </span>
                    </div>
                    {p.currentRole && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {p.currentRole}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                  {p.shortBio}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
