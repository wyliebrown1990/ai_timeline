/**
 * EventPage Component
 * Sprint SEO-4 Task 4 - Milestone Event Pages
 *
 * Deep-dive event pages for AI milestones with:
 * - Full narrative and context
 * - Contributors/key figures involved
 * - Related milestones (before/after)
 * - Linked glossary terms
 * - Event schema for SEO
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SEO } from '../components/SEO';
import {
  ArrowLeft,
  Calendar,
  Building2,
  User,
  Tag,
  ExternalLink,
  Clock,
  TrendingUp,
  BookOpen,
  History,
  Lightbulb,
  AlertCircle,
  ChevronRight,
  Star,
} from 'lucide-react';
import {
  eventsApi,
  type EventPageData,
  type EventContributor,
  type EventRelatedMilestone,
  type EventGlossaryTerm,
} from '../services/api';
import { RelatedBySubject } from '../components/RelatedBySubject';
import { FromTheBlog } from '../components/Blog/FromTheBlog';

/**
 * Loading skeleton
 */
function EventSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-6 w-full max-w-xl bg-gray-200 dark:bg-gray-700 rounded mb-8" />
      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="space-y-6">
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Not found state
 */
function EventNotFound({ id }: { id: string }) {
  return (
    <div className="text-center py-16">
      <Calendar className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Event Not Found
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        We couldn't find an event with ID "{id}".
      </p>
      <Link
        to="/timeline"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Browse Timeline
      </Link>
    </div>
  );
}

/**
 * Section card component
 */
function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <Icon className="h-5 w-5 text-gray-400" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/**
 * Significance badge
 */
function SignificanceBadge({ significance }: { significance: number }) {
  const labels = ['Minor', 'Notable', 'Major', 'Landmark', 'Historic'];
  const colors = [
    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  ];

  const index = Math.min(Math.max(significance - 1, 0), 4);

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${colors[index]}`}>
      <Star className="h-3 w-3" />
      {labels[index]}
    </span>
  );
}

/**
 * Category badge
 */
function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    MODEL_RELEASE: 'Model Release',
    PRODUCT_LAUNCH: 'Product Launch',
    RESEARCH_BREAKTHROUGH: 'Research Breakthrough',
    POLICY_REGULATION: 'Policy & Regulation',
    COMPANY_NEWS: 'Company News',
    INDUSTRY_TREND: 'Industry Trend',
    FUNDING: 'Funding',
    ACQUISITION: 'Acquisition',
    PARTNERSHIP: 'Partnership',
  };

  return (
    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
      {labels[category] || category.replace(/_/g, ' ')}
    </span>
  );
}

/**
 * Contributors section
 */
function ContributorsSection({ contributors }: { contributors: EventContributor[] }) {
  if (contributors.length === 0) return null;

  return (
    <SectionCard icon={User} title="Key People Involved">
      <div className="space-y-4">
        {contributors.map((person) => (
          <Link
            key={person.id}
            to={`/people/${person.slug}`}
            className="flex items-start gap-4 p-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            {person.imageUrl ? (
              <img
                src={person.imageUrl}
                alt={person.canonicalName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <User className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white">
                {person.canonicalName}
              </div>
              {person.contributionType && (
                <div className="text-sm text-blue-600 dark:text-blue-400 capitalize">
                  {person.contributionType.replace(/_/g, ' ')}
                </div>
              )}
              <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {person.shortBio}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

/**
 * Related milestones section
 */
function RelatedMilestonesSection({ milestones }: { milestones: EventRelatedMilestone[] }) {
  if (milestones.length === 0) return null;

  const beforeMilestones = milestones.filter((m) => m.relation === 'before');
  const afterMilestones = milestones.filter((m) => m.relation === 'after');
  const relatedMilestones = milestones.filter((m) => m.relation === 'related');

  return (
    <SectionCard icon={History} title="Related Events">
      <div className="space-y-6">
        {beforeMilestones.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              What Came Before
            </h3>
            <div className="space-y-2">
              {beforeMilestones.map((m) => (
                <Link
                  key={m.id}
                  to={`/events/${m.id}`}
                  className="block p-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white line-clamp-1">
                        {m.title}
                      </div>
                      {m.tldr && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                          {m.tldr}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(m.date).getFullYear()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {afterMilestones.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              What Came After
            </h3>
            <div className="space-y-2">
              {afterMilestones.map((m) => (
                <Link
                  key={m.id}
                  to={`/events/${m.id}`}
                  className="block p-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white line-clamp-1">
                        {m.title}
                      </div>
                      {m.tldr && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                          {m.tldr}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(m.date).getFullYear()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {relatedMilestones.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Related Events
            </h3>
            <div className="space-y-2">
              {relatedMilestones.map((m) => (
                <Link
                  key={m.id}
                  to={`/events/${m.id}`}
                  className="block p-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white line-clamp-1">
                        {m.title}
                      </div>
                      {m.tldr && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                          {m.tldr}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(m.date).getFullYear()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

/**
 * Linked terms section
 */
function LinkedTermsSection({ terms }: { terms: EventGlossaryTerm[] }) {
  if (terms.length === 0) return null;

  return (
    <SectionCard icon={Tag} title="Related Concepts">
      <div className="flex flex-wrap gap-2">
        {terms.map((term) => (
          <Link
            key={term.id}
            to={term.slug ? `/explained/${term.slug}` : `/glossary?term=${term.id}`}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
            title={term.shortDefinition}
          >
            {term.term}
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

/**
 * Generate JSON-LD for milestone page.
 *
 * Uses schema.org `Article` rather than `Event`. Historical AI milestones
 * (paper publications, model launches, product announcements, policy moves)
 * do not satisfy schema.org/Event semantics — Event requires `location`,
 * `endDate`, `offers`, etc. for a scheduled real-world happening, and Google
 * Search Console flags every milestone page that omits them. Article fits
 * announcements and is eligible for Google's article rich results.
 */
function generateEventJsonLd(data: EventPageData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.tldr || data.description,
    url: data.canonicalUrl,
    datePublished: data.createdAt || data.date,
    dateModified: data.updatedAt || data.createdAt || data.date,
    author: data.contributors.length > 0
      ? data.contributors.map((c) => ({
          '@type': 'Person',
          name: c.canonicalName,
          url: `https://letaiexplainai.com/people/${c.slug}`,
        }))
      : {
          '@type': 'Organization',
          name: 'Let AI Explain AI',
          url: 'https://letaiexplainai.com',
        },
    publisher: {
      '@type': 'Organization',
      name: 'Let AI Explain AI',
      url: 'https://letaiexplainai.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://letaiexplainai.com/og-image.png',
      },
    },
    image: data.imageUrl || 'https://letaiexplainai.com/og-image.png',
    ...(data.organization && {
      about: {
        '@type': 'Organization',
        name: data.organization.name,
        url: `https://letaiexplainai.com/organizations/${data.organization.slug}`,
      },
    }),
    isPartOf: {
      '@type': 'WebSite',
      name: 'Let AI Explain AI',
      url: 'https://letaiexplainai.com',
    },
  };
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * EventPage - Main component
 */
export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<EventPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) {
        setError('No event specified');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const pageData = await eventsApi.getById(id);
        setData(pageData);
      } catch (err) {
        console.error('[EventPage] Error fetching data:', err);
        setError('Failed to load event');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <EventSkeleton />
      </div>
    );
  }

  // Error/not found state
  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <EventNotFound id={id || ''} />
      </div>
    );
  }

  const title = data.title;
  const description = data.tldr || data.description.substring(0, 160);

  // Generate JSON-LD
  const eventJsonLd = generateEventJsonLd(data);

  return (
    <>
      <SEO
        title={title}
        description={description}
        canonical={data.canonicalUrl}
        jsonLd={eventJsonLd}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400">
            Home
          </Link>
          <span>/</span>
          <Link
            to="/timeline"
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            Timeline
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white line-clamp-1">{data.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <CategoryBadge category={data.category} />
            <SignificanceBadge significance={data.significance} />
            {data.era && (
              <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 rounded-full text-xs font-medium">
                {data.era}
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {data.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(data.date)}</span>
            </div>
            {data.organization && (
              <Link
                to={`/organizations/${data.organization.slug}`}
                className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Building2 className="h-4 w-4" />
                <span>{data.organization.name}</span>
              </Link>
            )}
            {data.sourceUrl && (
              <a
                href={data.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Source</span>
              </a>
            )}
          </div>
        </div>

        {/* TL;DR Card */}
        {data.tldr && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                TL;DR
              </span>
            </div>
            <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed">
              {data.tldr}
            </p>
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <SectionCard icon={BookOpen} title="What Happened">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {data.description}
              </p>
            </SectionCard>

            {/* Simple Explanation */}
            {data.simpleExplanation && (
              <SectionCard icon={Lightbulb} title="In Simple Terms">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {data.simpleExplanation}
                </p>
              </SectionCard>
            )}

            {/* Historical Context */}
            {data.historicalContext && (
              <SectionCard icon={History} title="Historical Context">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {data.historicalContext}
                </p>
              </SectionCard>
            )}

            {/* Business Impact */}
            {data.businessImpact && (
              <SectionCard icon={TrendingUp} title="Business Impact">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {data.businessImpact}
                </p>
              </SectionCard>
            )}

            {/* Why It Matters Today */}
            {data.whyItMattersToday && (
              <SectionCard icon={Lightbulb} title="Why It Matters Today">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {data.whyItMattersToday}
                </p>
              </SectionCard>
            )}

            {/* Technical Depth */}
            {data.technicalDepth && (
              <SectionCard icon={BookOpen} title="Technical Details">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {data.technicalDepth}
                </p>
              </SectionCard>
            )}

            {/* Common Misconceptions */}
            {data.commonMisconceptions && (
              <SectionCard icon={AlertCircle} title="Common Misconceptions">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {data.commonMisconceptions}
                </p>
              </SectionCard>
            )}
          </div>

          {/* Right column - sidebar */}
          <div className="space-y-6">
            {/* Stats card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                At a Glance
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Date</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {formatDate(data.date)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Significance</span>
                  <SignificanceBadge significance={data.significance} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Category</span>
                  <CategoryBadge category={data.category} />
                </div>
                {data.organization && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Organization</span>
                    <Link
                      to={`/organizations/${data.organization.slug}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {data.organization.name}
                    </Link>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Contributors</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {data.stats.contributorCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Related Concepts</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {data.stats.linkedTermCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {data.tags.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contributors */}
            <ContributorsSection contributors={data.contributors} />

            {/* Linked Terms */}
            <LinkedTermsSection terms={data.linkedTerms} />

            {/* Related Milestones */}
            <RelatedMilestonesSection milestones={data.relatedMilestones} />

            {/* Related by Subject (Sprint Subj-5) */}
            <RelatedBySubject
              contentType="milestone"
              contentId={data.id}
              limit={5}
              excludeTypes={['milestone']}
            />

            {/* Blog posts referencing this milestone (Sprint Blog-4) */}
            <FromTheBlog
              entityType="milestone"
              entityId={data.id}
              className="mt-2"
            />

            {/* View on Timeline link */}
            <Link
              to={`/timeline?highlight=${data.id}`}
              className="block text-center py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
            >
              View on Timeline
            </Link>
          </div>
        </div>

        {/* Last Updated Metadata (Sprint SEO-5: E-E-A-T signals) */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          {data.updatedAt && (
            <p>
              Last updated: {new Date(data.updatedAt).toLocaleDateString()}
            </p>
          )}
          <p className={data.updatedAt ? "mt-1" : ""}>
            Content verified by{' '}
            <Link to="/about" className="text-blue-600 dark:text-blue-400 hover:underline">
              Let AI Explain AI editorial team
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
