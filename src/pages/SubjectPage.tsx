/**
 * SubjectPage - Subject Detail Page
 * Sprint Subj-5 - UI & Discovery
 *
 * Shows subject details with tabbed content view
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronRightIcon,
  ClockIcon,
  BookOpenIcon,
  NewspaperIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { subjectsApi, type Subject, type SubjectStats, type SubjectContent } from '../services/api';
import { DEFAULT_DOMAIN_COLORS } from '../types/subject';

/**
 * Get color for a subject
 */
function getSubjectColor(subject: Subject): string {
  if (subject.color) return subject.color;
  const domainSlug = subject.domainSlug || subject.slug.split('-')[0];
  return DEFAULT_DOMAIN_COLORS[domainSlug as keyof typeof DEFAULT_DOMAIN_COLORS] || '#6B7280';
}

type TabId = 'timeline' | 'concepts' | 'news' | 'people' | 'orgs';

type NumericStatsKey = 'milestones' | 'glossaryTerms' | 'currentEvents' | 'persons' | 'organizations';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  countKey: NumericStatsKey;
}

const TABS: TabConfig[] = [
  { id: 'timeline', label: 'Timeline', icon: ClockIcon, countKey: 'milestones' },
  { id: 'concepts', label: 'Concepts', icon: BookOpenIcon, countKey: 'glossaryTerms' },
  { id: 'news', label: 'News', icon: NewspaperIcon, countKey: 'currentEvents' },
  { id: 'people', label: 'People', icon: UserGroupIcon, countKey: 'persons' },
  { id: 'orgs', label: 'Organizations', icon: BuildingOfficeIcon, countKey: 'organizations' },
];

/**
 * Breadcrumbs component
 */
function SubjectBreadcrumbs({ ancestors, current }: { ancestors: Subject[]; current: Subject }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
      <Link to="/subjects" className="hover:text-orange-600 dark:hover:text-orange-400">
        Subjects
      </Link>
      {ancestors.map((ancestor) => (
        <span key={ancestor.id} className="flex items-center gap-2">
          <ChevronRightIcon className="w-4 h-4" />
          <Link
            to={`/subjects/${ancestor.slug}`}
            className="hover:text-orange-600 dark:hover:text-orange-400"
          >
            {ancestor.name}
          </Link>
        </span>
      ))}
      <span className="flex items-center gap-2">
        <ChevronRightIcon className="w-4 h-4" />
        <span className="text-gray-900 dark:text-gray-100 font-medium">{current.name}</span>
      </span>
    </nav>
  );
}

/**
 * Content list component for each tab
 */
function ContentList({
  content,
  type,
  color,
}: {
  content: SubjectContent;
  type: TabId;
  color: string;
}) {
  const items = (() => {
    switch (type) {
      case 'timeline':
        return content.milestones ?? [];
      case 'concepts':
        return content.glossaryTerms ?? [];
      case 'news':
        return content.currentEvents ?? [];
      case 'people':
        return content.persons ?? [];
      case 'orgs':
        return content.organizations ?? [];
    }
  })();

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No content in this category yet.</p>
      </div>
    );
  }

  const getLink = (item: { id: string; slug?: string }) => {
    switch (type) {
      case 'timeline':
        return `/timeline?milestone=${item.id}`;
      case 'concepts':
        return `/glossary?term=${item.id}`;
      case 'news':
        return `/news/${item.id}`;
      case 'people':
        return `/people/${item.slug || item.id}`;
      case 'orgs':
        return `/organizations/${item.slug || item.id}`;
    }
  };

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.id}
          to={getLink(item)}
          className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <h4 className="font-medium text-gray-900 dark:text-white">
            {'title' in item ? item.title : 'term' in item ? item.term : 'name' in item ? item.name : item.id}
          </h4>
          {'shortDefinition' in item && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {item.shortDefinition}
            </p>
          )}
          {'description' in item && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
          {'date' in item && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2" style={{ color }}>
              {new Date(item.date).toLocaleDateString()}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}

/**
 * Child subjects list
 */
function ChildSubjects({ children, color }: { children: Subject[]; color: string }) {
  if (children.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Subtopics
      </h3>
      <div className="flex flex-wrap gap-2">
        {children.map((child) => (
          <Link
            key={child.id}
            to={`/subjects/${child.slug}`}
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: `${color}15`,
              color: color,
            }}
          >
            {child.icon && <span className="mr-1">{child.icon}</span>}
            {child.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * SubjectPage component
 */
export default function SubjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [ancestors, setAncestors] = useState<Subject[]>([]);
  const [stats, setStats] = useState<SubjectStats | null>(null);
  const [content, setContent] = useState<SubjectContent | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('timeline');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchSubject = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [subjectData, ancestorsData, statsData, contentData] = await Promise.all([
          subjectsApi.getBySlug(slug),
          subjectsApi.getAncestors(slug),
          subjectsApi.getStats(slug),
          subjectsApi.getContent(slug, { hydrated: true, includeChildren: true }),
        ]);

        setSubject(subjectData);
        setAncestors(ancestorsData);
        setStats(statsData);
        setContent(contentData);
      } catch (err) {
        console.error('Failed to load subject:', err);
        setError('Failed to load subject. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubject();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="container-main py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mt-8" />
          <div className="space-y-3 mt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="container-main py-8">
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">{error || 'Subject not found'}</p>
          <Link
            to="/subjects"
            className="mt-4 inline-block px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Back to Subjects
          </Link>
        </div>
      </div>
    );
  }

  const color = getSubjectColor(subject);

  return (
    <div className="container-main py-8">
      {/* Breadcrumbs */}
      <SubjectBreadcrumbs ancestors={ancestors} current={subject} />

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          {subject.icon || '📚'}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {subject.name}
          </h1>
          {subject.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">
              {subject.description}
            </p>
          )}
        </div>
      </div>

      {/* Learning Path CTA */}
      {stats && stats.total > 5 && (
        <div
          className="rounded-xl p-6 mb-8"
          style={{ backgroundColor: `${color}10`, borderLeft: `4px solid ${color}` }}
        >
          <div className="flex items-center gap-3">
            <AcademicCapIcon className="w-8 h-8" style={{ color }} />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Start a Learning Path
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Explore {stats.total} pieces of content organized for progressive learning.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Child subjects */}
      {subject.children && subject.children.length > 0 && (
        <ChildSubjects children={subject.children} color={color} />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-6 -mb-px" aria-label="Content tabs">
          {TABS.map((tab) => {
            const count = stats?.[tab.countKey] ?? 0;
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 px-1 font-medium text-sm transition-colors relative ${
                  isActive
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {count > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isActive ? `${color}20` : 'rgb(229 231 235)',
                      color: isActive ? color : 'rgb(107 114 128)',
                    }}
                  >
                    {count}
                  </span>
                )}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: color }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {content && <ContentList content={content} type={activeTab} color={color} />}
    </div>
  );
}
