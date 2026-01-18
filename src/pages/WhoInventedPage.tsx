/**
 * WhoInventedPage Component
 * Sprint SEO-4 Task 5 - "Who Invented X?" Pages
 *
 * Pages that tell the story of who invented/created AI concepts with:
 * - Quick answer for featured snippets
 * - Inventors and pioneers section
 * - Timeline of development
 * - Related organizations
 * - Related concepts
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SEO } from '../components/SEO';
import {
  ArrowLeft,
  User,
  Building2,
  Calendar,
  Tag,
  Lightbulb,
  ChevronRight,
  Award,
  Users,
  Clock,
} from 'lucide-react';
import {
  whoInventedApi,
  type WhoInventedPageData,
  type WhoInventedPerson,
  type WhoInventedMilestone,
  type WhoInventedOrganization,
  type WhoInventedRelatedTerm,
} from '../services/api';

/**
 * Loading skeleton
 */
function WhoInventedSkeleton() {
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
function WhoInventedNotFound({ slug }: { slug: string }) {
  return (
    <div className="text-center py-16">
      <Lightbulb className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Concept Not Found
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        We couldn't find information about who invented "{slug}".
      </p>
      <Link
        to="/glossary"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Browse Glossary
      </Link>
    </div>
  );
}

/**
 * Quick answer card (for featured snippets)
 */
function QuickAnswerCard({ answer }: { answer: string }) {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
      <div className="flex items-center gap-2 mb-3">
        <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
          Quick Answer
        </span>
      </div>
      <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed">
        {answer}
      </p>
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
 * Person card component
 */
function PersonCard({ person, label }: { person: WhoInventedPerson; label?: string }) {
  return (
    <Link
      to={`/people/${person.slug}`}
      className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      {person.imageUrl ? (
        <img
          src={person.imageUrl}
          alt={person.canonicalName}
          className="w-16 h-16 rounded-full object-cover"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
          <User className="h-8 w-8 text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-gray-900 dark:text-white">
            {person.canonicalName}
          </span>
          {label && (
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-full text-xs font-medium">
              {label}
            </span>
          )}
        </div>
        {person.contributionNote && (
          <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
            {person.contributionNote}
          </div>
        )}
        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {person.shortBio}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
    </Link>
  );
}

/**
 * Timeline section
 */
function TimelineSection({ milestones }: { milestones: WhoInventedMilestone[] }) {
  if (milestones.length === 0) return null;

  return (
    <SectionCard icon={Clock} title="Timeline of Development">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-6">
          {milestones.map((milestone, index) => (
            <Link
              key={milestone.id}
              to={`/events/${milestone.id}`}
              className="relative flex gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-2 p-2 rounded-lg transition-colors"
            >
              {/* Timeline dot */}
              <div className="relative z-10 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500 dark:border-blue-400 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {index + 1}
                </span>
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {milestone.title}
                    </div>
                    {milestone.tldr && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                        {milestone.tldr}
                      </div>
                    )}
                    {milestone.organization && (
                      <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        {milestone.organization}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(milestone.date).getFullYear()}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

/**
 * Organizations section
 */
function OrganizationsSection({ organizations }: { organizations: WhoInventedOrganization[] }) {
  if (organizations.length === 0) return null;

  return (
    <SectionCard icon={Building2} title="Organizations Involved">
      <div className="space-y-4">
        {organizations.map((org) => (
          <Link
            key={org.id}
            to={`/organizations/${org.slug}`}
            className="flex items-start gap-4 p-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            {org.logoUrl ? (
              <img
                src={org.logoUrl}
                alt={org.name}
                className="w-12 h-12 rounded-lg object-contain bg-white"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white">
                {org.name}
              </div>
              {org.contributionNote && (
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  {org.contributionNote}
                </div>
              )}
              <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {org.shortDescription}
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
 * Related terms section
 */
function RelatedTermsSection({ terms }: { terms: WhoInventedRelatedTerm[] }) {
  if (terms.length === 0) return null;

  return (
    <SectionCard icon={Tag} title="Related Concepts">
      <div className="flex flex-wrap gap-2">
        {terms.map((term) => (
          <Link
            key={term.id}
            to={term.slug ? `/who-invented/${term.slug}` : `/glossary?term=${term.id}`}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
            title={term.shortDefinition}
          >
            Who invented {term.term}?
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

/**
 * Generate JSON-LD for who-invented page
 * Sprint SEO-5: Includes author/publisher for E-E-A-T signals
 */
function generateWhoInventedJsonLd(data: WhoInventedPageData) {
  const allPeople = [...data.inventors, ...data.pioneers, ...data.contributors];

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Who Invented ${data.term}?`,
    description: data.quickAnswer || data.shortDefinition,
    url: data.canonicalUrl,
    // Sprint SEO-5: E-E-A-T freshness signals
    datePublished: data.createdAt || data.updatedAt || new Date().toISOString(),
    dateModified: data.updatedAt || new Date().toISOString(),
    // Sprint SEO-5: E-E-A-T author/publisher signals
    author: {
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
    about: {
      '@type': 'Thing',
      name: data.term,
      description: data.shortDefinition,
    },
    ...(allPeople.length > 0 && {
      mentions: allPeople.slice(0, 5).map((p) => ({
        '@type': 'Person',
        name: p.canonicalName,
        url: `https://letaiexplainai.com/people/${p.slug}`,
      })),
    }),
  };
}

/**
 * Category badge
 */
function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    model_architecture: 'Model Architecture',
    technical_term: 'Technical Term',
    core_concept: 'Core Concept',
    business_term: 'Business Term',
  };

  return (
    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
      {labels[category] || category}
    </span>
  );
}

/**
 * WhoInventedPage - Main component
 */
export default function WhoInventedPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<WhoInventedPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!slug) {
        setError('No term specified');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const pageData = await whoInventedApi.getBySlug(slug);
        setData(pageData);
      } catch (err) {
        console.error('[WhoInventedPage] Error fetching data:', err);
        setError('Failed to load page');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [slug]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <WhoInventedSkeleton />
      </div>
    );
  }

  // Error/not found state
  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <WhoInventedNotFound slug={slug || ''} />
      </div>
    );
  }

  const title = `Who Invented ${data.term}?`;
  const description = data.quickAnswer || data.shortDefinition;

  // Generate JSON-LD
  const jsonLd = generateWhoInventedJsonLd(data);

  const hasInventors = data.inventors.length > 0;
  const hasPioneers = data.pioneers.length > 0;
  const hasContributors = data.contributors.length > 0;

  return (
    <>
      <SEO
        title={title}
        description={description}
        canonical={data.canonicalUrl}
        jsonLd={jsonLd}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400">
            Home
          </Link>
          <span>/</span>
          <Link
            to="/glossary"
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            Glossary
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{data.term}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Award className="h-8 w-8 text-amber-500" />
            <CategoryBadge category={data.category} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Who Invented{' '}
            <span className="text-amber-600 dark:text-amber-400">{data.term}</span>?
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {data.shortDefinition}
          </p>
        </div>

        {/* Quick Answer */}
        {data.quickAnswer && (
          <div className="mb-8">
            <QuickAnswerCard answer={data.quickAnswer} />
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Inventors */}
            {hasInventors && (
              <SectionCard icon={Award} title="Inventors & Creators">
                <div className="space-y-4">
                  {data.inventors.map((person) => (
                    <PersonCard key={person.id} person={person} label="Inventor" />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Pioneers */}
            {hasPioneers && (
              <SectionCard icon={Lightbulb} title="Pioneers">
                <div className="space-y-4">
                  {data.pioneers.map((person) => (
                    <PersonCard key={person.id} person={person} label="Pioneer" />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Contributors */}
            {hasContributors && (
              <SectionCard icon={Users} title="Key Contributors">
                <div className="space-y-4">
                  {data.contributors.map((person) => (
                    <PersonCard key={person.id} person={person} />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* No people found message */}
            {!hasInventors && !hasPioneers && !hasContributors && (
              <SectionCard icon={User} title="Contributors">
                <p className="text-gray-600 dark:text-gray-400">
                  The development of {data.term} involved contributions from multiple researchers
                  and organizations. We're working on documenting the key figures involved.
                </p>
              </SectionCard>
            )}

            {/* Timeline */}
            <TimelineSection milestones={data.milestones} />

            {/* Full Definition */}
            <SectionCard icon={Calendar} title={`About ${data.term}`}>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {data.fullDefinition}
              </p>
            </SectionCard>
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
                  <span className="text-gray-600 dark:text-gray-400">Inventors</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {data.stats.inventorCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Pioneers</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {data.stats.pioneerCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Contributors</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {data.stats.contributorCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Organizations</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {data.stats.organizationCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Timeline Events</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {data.stats.milestoneCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Organizations */}
            <OrganizationsSection organizations={data.organizations} />

            {/* Related Terms */}
            <RelatedTermsSection terms={data.relatedTerms} />

            {/* Links */}
            <div className="space-y-3">
              <Link
                to={data.slug ? `/explained/${data.slug}` : `/glossary?term=${data.id}`}
                className="block text-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Learn More About {data.term}
              </Link>
              <Link
                to={data.slug ? `/glossary/${data.slug}` : `/glossary?term=${data.id}`}
                className="block text-center py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
              >
                View in Glossary
              </Link>
            </div>
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
