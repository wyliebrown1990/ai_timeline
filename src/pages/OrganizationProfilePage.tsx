/**
 * OrganizationProfilePage Component
 * Sprint KPC-2 - Key People & Companies
 *
 * Dedicated profile page for AI organizations (companies, universities, labs).
 * Features:
 * - Organization overview and mission
 * - Key people grid
 * - Related milestones and news
 * - Products/research areas
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SEO, generateOrganizationJsonLd, generateOrganizationFAQs, generateFAQJsonLd } from '../components/SEO';
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Globe,
  Linkedin,
  MapPin,
  Newspaper,
  Clock,
  Users,
  Package,
  BookOpen,
} from 'lucide-react';
import { organizationsApi, type OrganizationWithRelations, type OrganizationKeyConcept } from '../services/api';
import { CommentThread } from '../components/Comments';

/**
 * Organization type badge colors
 */
const TYPE_COLORS: Record<string, string> = {
  company: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  research_lab: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  university: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  nonprofit: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  government: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const TYPE_LABELS: Record<string, string> = {
  company: 'Company',
  research_lab: 'Research Lab',
  university: 'University',
  nonprofit: 'Nonprofit',
  government: 'Government',
};

/**
 * Format date for display
 */
function formatDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '';
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Loading skeleton for profile page
 */
function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start gap-6 mb-8">
        <div className="w-24 h-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
      {/* Content skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Section component
 */
function ProfileSection({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="text-gray-700 dark:text-gray-300 leading-relaxed">{children}</div>
    </section>
  );
}

/**
 * External links row
 */
function ExternalLinksRow({
  websiteUrl,
  wikipediaUrl,
  linkedInUrl,
}: {
  websiteUrl?: string | null;
  wikipediaUrl?: string | null;
  linkedInUrl?: string | null;
}) {
  const links = [
    { url: websiteUrl, icon: Globe, label: 'Website' },
    { url: wikipediaUrl, icon: BookOpen, label: 'Wikipedia' },
    { url: linkedInUrl, icon: Linkedin, label: 'LinkedIn' },
  ].filter((l) => l.url);

  if (links.length === 0) return null;

  return (
    <div className="flex gap-2 mt-3">
      {links.map(({ url, icon: Icon, label }) => (
        <a
          key={label}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title={label}
        >
          <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </a>
      ))}
    </div>
  );
}

/**
 * Person card for key people grid
 */
function PersonCard({
  person,
}: {
  person: {
    id: string;
    canonicalName: string;
    slug: string;
    role: string;
    currentRole?: string | null;
    imageUrl?: string | null;
  };
}) {
  return (
    <Link
      to={`/people/${person.slug}`}
      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      {person.imageUrl ? (
        <img
          src={person.imageUrl}
          alt={person.canonicalName}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
          {person.canonicalName.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">
          {person.canonicalName}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {person.currentRole || person.role}
        </p>
      </div>
    </Link>
  );
}

/**
 * Main OrganizationProfilePage component
 */
export default function OrganizationProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [org, setOrg] = useState<OrganizationWithRelations | null>(null);
  const [keyConcepts, setKeyConcepts] = useState<OrganizationKeyConcept[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrg() {
      if (!slug) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await organizationsApi.getBySlug(slug);
        setOrg(data);

        // Fetch key concepts (Sprint SEO-3)
        try {
          const keyConceptsResponse = await organizationsApi.getKeyConcepts(slug);
          setKeyConcepts(keyConceptsResponse.data || []);
        } catch (kcErr) {
          console.warn('Failed to fetch key concepts:', kcErr);
          setKeyConcepts([]);
        }
      } catch (err) {
        console.error('Failed to fetch organization:', err);
        setError('Organization not found');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrg();
  }, [slug]);


  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          to="/timeline"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Timeline
        </Link>
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Organization Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The organization you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const typeColor = TYPE_COLORS[org.type] || TYPE_COLORS.company;
  const typeLabel = TYPE_LABELS[org.type] || 'Organization';

  // Generate Organization JSON-LD structured data
  const orgJsonLd = generateOrganizationJsonLd({
    name: org.name,
    description: org.shortDescription,
    url: `https://letaiexplainai.com/organizations/${org.slug}`,
    logo: org.logoUrl || undefined,
    foundingDate: org.foundedYear ? `${org.foundedYear}` : undefined,
    location: org.headquarters || undefined,
    sameAs: [
      org.websiteUrl,
      org.wikipediaUrl,
      org.linkedInUrl,
    ].filter(Boolean) as string[],
    // Sprint SEO-5: E-E-A-T freshness signal
    dateModified: org.updatedAt ? new Date(org.updatedAt).toISOString() : undefined,
  });

  // Generate FAQ JSON-LD for Answer Engine Optimization
  const faqItems = generateOrganizationFAQs({
    name: org.name,
    shortDescription: org.shortDescription,
    mission: org.mission,
    foundedYear: org.foundedYear,
    headquarters: org.headquarters,
    products: org.products,
  });
  const faqJsonLd = generateFAQJsonLd(faqItems);

  // Combine schemas (filter out null FAQ if no valid items)
  const jsonLdSchemas = [orgJsonLd, faqJsonLd].filter(Boolean) as Record<string, unknown>[];

  return (
    <>
      <SEO
        title={org.name}
        description={org.shortDescription}
        canonical={`https://letaiexplainai.com/organizations/${org.slug}`}
        type="profile"
        image={org.logoUrl || undefined}
        jsonLd={jsonLdSchemas}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <header className="flex items-start gap-6 mb-8">
        {/* Logo */}
        {org.logoUrl ? (
          <img
            src={org.logoUrl}
            alt={org.name}
            className="w-24 h-24 rounded-lg object-contain bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2"
          />
        ) : (
          <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-3xl font-bold">
            {org.name.charAt(0)}
          </div>
        )}

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{org.name}</h1>

          <div className="flex items-center gap-3 flex-wrap mb-2">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${typeColor}`}>
              {typeLabel}
            </span>

            {org.foundedYear && (
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                Founded {org.foundedYear}
              </span>
            )}

            {org.headquarters && (
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                {org.headquarters}
              </span>
            )}
          </div>

          <ExternalLinksRow
            websiteUrl={org.websiteUrl}
            wikipediaUrl={org.wikipediaUrl}
            linkedInUrl={org.linkedInUrl}
          />
        </div>
      </header>

      {/* Current Focus - highlighted section */}
      {org.currentFocus && (
        <section className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Current Focus
            </h2>
          </div>
          <p className="text-gray-700 dark:text-gray-300">{org.currentFocus}</p>
          {org.currentFocusUpdatedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Last updated: {formatDate(org.currentFocusUpdatedAt)}
            </p>
          )}
        </section>
      )}

      {/* About */}
      <ProfileSection title="About">
        <p>{org.shortDescription}</p>
      </ProfileSection>

      {/* Mission */}
      {org.mission && (
        <ProfileSection title="Mission">
          <p className="whitespace-pre-wrap">{org.mission}</p>
        </ProfileSection>
      )}

      {/* History */}
      {org.history && (
        <ProfileSection title="History">
          <p className="whitespace-pre-wrap">{org.history}</p>
        </ProfileSection>
      )}

      {/* Products & Research */}
      {org.products && org.products.length > 0 && (
        <ProfileSection title="Key Products & Research" icon={<Package className="w-5 h-5 text-gray-500" />}>
          <div className="flex flex-wrap gap-2">
            {org.products.map((product) => (
              <span
                key={product}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg font-medium"
              >
                {product}
              </span>
            ))}
          </div>
        </ProfileSection>
      )}

      {/* Focus Areas */}
      {org.focusAreas && org.focusAreas.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Focus Areas
          </h2>
          <div className="flex flex-wrap gap-2">
            {org.focusAreas.map((area) => (
              <span
                key={area}
                className="px-3 py-1 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
              >
                {area}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Key Concepts - Sprint SEO-3 */}
      {keyConcepts.length > 0 && (
        <ProfileSection title="Key Concepts" icon={<BookOpen className="w-5 h-5 text-gray-500" />}>
          <div className="space-y-3">
            {keyConcepts.map(({ id, glossaryTerm, contributionNote }) => (
              <Link
                key={id}
                to={glossaryTerm.slug ? `/glossary/${glossaryTerm.slug}` : `/glossary?term=${encodeURIComponent(glossaryTerm.term)}`}
                className="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {glossaryTerm.term}
                  </span>
                  {contributionNote && (
                    <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                      {contributionNote}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {glossaryTerm.shortDefinition}
                </p>
              </Link>
            ))}
          </div>
        </ProfileSection>
      )}

      {/* Two-column layout for People and Milestones */}
      <div className="grid md:grid-cols-2 gap-8 mt-8">
        {/* Key People */}
        <ProfileSection title="Key People" icon={<Users className="w-5 h-5 text-gray-500" />}>
          {!org.people || org.people.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 italic">
              No key people recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {org.people.slice(0, 6).map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
              {org.people.length > 6 && (
                <Link
                  to={`/people?org=${org.id}`}
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mt-2"
                >
                  View all {org.people.length} people
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </ProfileSection>

        {/* Related Milestones */}
        <ProfileSection
          title="Milestones"
          icon={<Calendar className="w-5 h-5 text-gray-500" />}
        >
          {!org.milestones || org.milestones.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 italic">
              No linked milestones yet.
            </p>
          ) : (
            <div className="space-y-3">
              {org.milestones.slice(0, 10).map((m) => (
                <Link
                  key={m.id}
                  to={`/timeline?highlight=${m.id}`}
                  className="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <p className="font-medium text-gray-900 dark:text-white">{m.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{formatDate(m.date)}</p>
                </Link>
              ))}
              {org.milestones.length > 10 && (
                <Link
                  to={`/timeline?org=${org.id}`}
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View all {org.milestones.length} milestones
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </ProfileSection>
      </div>

      {/* Recent News */}
      {org.newsEvents && org.newsEvents.length > 0 && (
        <ProfileSection
          title="Recent News"
          icon={<Newspaper className="w-5 h-5 text-gray-500" />}
        >
          <div className="space-y-3">
            {org.newsEvents.slice(0, 5).map((ne) => (
              <Link
                key={ne.id}
                to={`/news?event=${ne.id}`}
                className="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <p className="font-medium text-gray-900 dark:text-white">{ne.title}</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>{formatDate(ne.date)}</span>
                  <span>•</span>
                  <span className="capitalize">{ne.mentionType}</span>
                </div>
              </Link>
            ))}
            {org.newsEvents.length > 5 && (
              <Link
                to={`/news?org=${org.id}`}
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all {org.newsEvents.length} news mentions
                <ExternalLink className="w-4 h-4" />
              </Link>
            )}
          </div>
        </ProfileSection>
      )}

      {/* Last Updated Metadata (Sprint SEO-5: E-E-A-T signals) */}
      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <p>
          Profile created: {new Date(org.createdAt).toLocaleDateString()}
          {org.updatedAt !== org.createdAt && (
            <> · Last updated: {new Date(org.updatedAt).toLocaleDateString()}</>
          )}
        </p>
        <p className="mt-1">
          Content verified by{' '}
          <Link to="/about" className="text-blue-600 dark:text-blue-400 hover:underline">
            Let AI Explain AI editorial team
          </Link>
        </p>
      </div>

      {/* Comment Thread (Sprint LEarn-4) */}
      <div className="mt-12">
        <CommentThread targetType="organization" targetId={org.id} />
      </div>
    </div>
    </>
  );
}
